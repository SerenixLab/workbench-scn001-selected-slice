import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";
import {
  isCanonicalProposalResponse,
  isValidInitializedIngestionResult,
  resolveUniqueCreatingTransition
} from "./retainedStateClosure.js";

export const PRODUCTION_FOCUSED_TRIAL_DIRECTION = "TRIAL-PROD-FOCUS";

export function validateBindingAssessmentClosure(records, relations, assessment) {
  if (assessment?.family !== "binding_assessment" || assessment.origin !== "sut"
    || assessment.bindingType !== "candidate_bound_proposal_response"
    || assessment.statusOrigin !== "sut_transition") {
    throw new SutStateIntegrityError("Binding assessment identity is malformed.");
  }
  const transition = resolveUniqueCreatingTransition(records, assessment, "Binding assessment");
  const responses = assessment.userResponseRefs.map((reference) => records.get(reference));
  if (responses.some((response) => response?.family !== "input_fact"
    || response.origin !== "fixture" || response.role !== "user_response")) {
    throw new SutStateIntegrityError("Binding assessment has an invalid response participant.");
  }
  const realizationClosures = assessment.realizationFactRefs.map((reference) => {
    const fact = records.get(reference);
    const proposalRef = fact?.payload?.requestedRef;
    const closure = proposalRef && resolveProposalRealizationClosure(
      records, relations, proposalRef, reference
    );
    if (!closure) {
      throw new SutStateIntegrityError(
        "Binding assessment has an invalid realization participant."
      );
    }
    return closure;
  });
  const expectedInputs = uniqueReferences([
    ...(assessment.proposalRef ? [assessment.proposalRef] : []),
    ...assessment.realizationFactRefs, ...assessment.userResponseRefs,
    ...realizationClosures.map((closure) => closure.transition.reference)
  ]);
  const basis = relations.filter((relation) => relation.fromRef === transition.reference
    && relation.relationKind === "basis");
  const bindings = relations.filter((relation) => relation.fromRef === assessment.reference
    && relation.relationKind === "binding");
  const expectedBindings = [
    ...(assessment.proposalRef
      ? [[assessment.proposalRef, "candidate_bound_proposal_intent"]] : []),
    ...assessment.realizationFactRefs.map((ref) => [ref, "actual_surfaced_realization"]),
    ...assessment.userResponseRefs.map((ref) => [ref, "actual_user_response"])
  ];
  const validRelations = expectedBindings.every(([toRef, role]) => bindings.filter((relation) =>
    relation.toRef === toRef && relation.targetRole === role
      && relation.assertedByRole === "sut"
      && relation.effectiveOrder === assessment.createdOrder
      && relation.createdOrder === transition.createdOrder).length === 1);
  const expectedBasis = [
    ...assessment.userResponseRefs.map((ref) => [ref, "user_response_fact"]),
    ...realizationClosures.map((closure) => [
      closure.transition.reference, "proposal_realization_evidence"
    ])
  ];
  const interaction = records.get(assessment.interactionRef);
  const ingestionTransition = records.get(interaction?.createdByTransitionRef);
  const ingestionBasis = relations.filter((relation) => (
    relation.fromRef === ingestionTransition?.reference && relation.relationKind === "basis"
  ));
  const ingestionInputRecords = (ingestionTransition?.inputReferences ?? [])
    .map((reference) => records.get(reference));
  const ingestionResultRefs = ingestionTransition?.resultReferences ?? [];
  const interactionResultCount = ingestionResultRefs.filter((reference) => (
    reference === interaction?.reference
  )).length;
  const validAdditionalIngestionResults = ingestionResultRefs
    .filter((reference) => reference !== interaction?.reference)
    .every((reference) => isValidInitializedIngestionResult(
      records, relations, reference, ingestionTransition, interaction
    ));
  const participantRefs = [...assessment.realizationFactRefs, ...assessment.userResponseRefs];
  const representedProposals = new Set(realizationClosures.map((item) => item.proposal.reference));
  const expectedResponseStatus = responses.length === 1
    && classifyProposalResponse(responses[0].payload.content)
    ? "accepted" : "ambiguous_or_non_accepting";
  const canonicalBound = assessment.bindingStatus === "bound"
    && assessment.responseStatus === "accepted"
    && assessment.materialIntentStatus === "match"
    && assessment.reason === "exact_candidate_bound_proposal_response"
    && responses.length === 1
    && isCanonicalProposalResponse(records, relations, responses[0])
    && realizationClosures.length === 1
    && assessment.proposalRef === realizationClosures[0].proposal.reference;
  const validUnbound = assessment.bindingStatus === "unbound"
    && assessment.responseStatus === expectedResponseStatus
    && ((realizationClosures.length === 0 && assessment.proposalRef === null
      && assessment.materialIntentStatus === "unknown"
      && assessment.reason === "no_current_surfaced_realization")
      || (realizationClosures.length === 1 && responses.length === 1
        && !isCanonicalProposalResponse(records, relations, responses[0])
        && assessment.proposalRef === realizationClosures[0].proposal.reference
        && assessment.materialIntentStatus === (realizationClosures[0].fact.payload.fidelity
          === "match" ? "match" : "mismatch")
        && assessment.reason === "response_not_attributable_to_expected_user"));
  const validAmbiguous = assessment.bindingStatus === "ambiguous"
    && assessment.reason === "multiple_current_binding_participants"
    && assessment.materialIntentStatus === "unknown"
    && assessment.responseStatus === expectedResponseStatus
    && assessment.proposalRef === (representedProposals.size === 1
      ? [...representedProposals][0] : null)
    && (responses.length !== 1 || realizationClosures.length > 1);
  const validBasis = expectedBasis.every(([toRef, role]) => basis.filter((relation) =>
    relation.toRef === toRef && relation.targetRole === role
      && relation.assertedByRole === "sut"
      && relation.effectiveOrder === transition.createdOrder
      && relation.createdOrder === transition.createdOrder).length === 1);
  if (transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.result !== "binding_assessed"
    || transition.interactionRef !== assessment.interactionRef
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || interaction.createdOrder >= assessment.createdOrder
    || ingestionTransition?.family !== "sut_transition_evidence"
    || ingestionTransition.origin !== "sut"
    || ingestionTransition.transitionKind !== "ingest_sut_visible_inputs"
    || ingestionTransition.interactionRef !== interaction.reference
    || ingestionTransition.result !== "accepted"
    || interactionResultCount !== 1
    || new Set(ingestionResultRefs).size !== ingestionResultRefs.length
    || !validAdditionalIngestionResults
    || ingestionTransition.createdOrder <= interaction.createdOrder
    || ingestionTransition.createdOrder >= assessment.createdOrder
    || ingestionTransition.inputReferences?.length !== interaction.inputReferences?.length
    || !sameReferenceSet(ingestionTransition.inputReferences, interaction.inputReferences)
    || new Set(ingestionTransition.inputReferences).size !== ingestionTransition.inputReferences.length
    || new Set(interaction.inputReferences).size !== interaction.inputReferences.length
    || ingestionInputRecords.some((record) => record?.family !== "input_fact")
    || ingestionBasis.length !== ingestionTransition.inputReferences.length
    || ingestionBasis.some((relation) => (
      relation.targetRole !== "ingested_input"
      || relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== ingestionTransition.createdOrder
      || relation.createdOrder !== ingestionTransition.createdOrder
    ))
    || new Set(ingestionBasis.map((relation) => relation.toRef)).size !== ingestionBasis.length
    || !sameReferenceSet(
      ingestionBasis.map((relation) => relation.toRef),
      ingestionTransition.inputReferences
    )
    || participantRefs.some((reference) => !interaction.inputReferences?.includes(reference))
    || !sameReferenceSet(transition.inputReferences, expectedInputs)
    || transition.inputReferences?.length !== expectedInputs.length
    || new Set(transition.inputReferences).size !== transition.inputReferences.length
    || transition.resultReferences?.length !== 1
    || transition.resultReferences[0] !== assessment.reference
    || assessment.createdByTransitionRef !== transition.reference
    || transition.createdOrder <= assessment.createdOrder
    || responses.some((response) => assessment.createdOrder <= response.createdOrder)
    || realizationClosures.some((closure) => (
      assessment.createdOrder <= closure.transition.createdOrder
    ))
    || responses.some((response) => transition.createdOrder <= response.createdOrder)
    || realizationClosures.some((closure) => (
      transition.createdOrder <= closure.transition.createdOrder
    ))
    || !(canonicalBound || validUnbound || validAmbiguous
      || (assessment.bindingStatus === "bound"
        && assessment.materialIntentStatus === "mismatch"
        && assessment.reason === "surfaced_realization_material_mismatch"
        && assessment.responseStatus === "accepted"
        && responses.length === 1
        && isCanonicalProposalResponse(records, relations, responses[0])
        && realizationClosures.length === 1
        && assessment.proposalRef === realizationClosures[0].proposal.reference
        && realizationClosures[0].fact.payload.fidelity === "mismatch"))
    || bindings.length !== expectedBindings.length || !validRelations
    || basis.length !== expectedBasis.length || !validBasis) {
    throw new SutStateIntegrityError(
      "Binding assessment does not form an exact B/T/P/F/U/R closure."
    );
  }
  return assessment;
}

export function validateCandidateBoundProposal(records, relations, proposalRef) {
  const proposal = records.get(proposalRef);
  const proposalTransition = records.get(proposal?.createdByTransitionRef);
  if (proposal?.family !== "proposal_intent"
    || proposalTransition?.family !== "sut_transition_evidence"
    || proposalTransition.origin !== "sut"
    || proposalTransition.transitionKind !== "form_candidate_bound_proposal_intent"
    || proposalTransition.result !== "proposal_intent_formed"
    || !Array.isArray(proposalTransition.inputReferences)
    || !Array.isArray(proposalTransition.resultReferences)
    || proposalTransition.inputReferences.length === 0
    || proposalTransition.inputReferences.length !== proposalTransition.resultReferences.length
    || new Set(proposalTransition.inputReferences).size !== proposalTransition.inputReferences.length
    || new Set(proposalTransition.resultReferences).size !== proposalTransition.resultReferences.length) {
    throw new SutStateIntegrityError("Candidate-bound proposal identity is unresolved.");
  }
  const candidateClosures = proposalTransition.inputReferences.map((reference) => (
    validateProductionCandidateClosure(records, relations, reference)
  ));
  const candidateByRef = new Map(candidateClosures.map((closure) => [
    closure.candidate.reference, closure
  ]));
  const proposals = proposalTransition.resultReferences.map((reference) => (
    validateProposalResultClosure(records, relations, reference, proposalTransition, candidateByRef)
  ));
  const proposalTransitionBasis = relations.filter((relation) => (
    relation.fromRef === proposalTransition?.reference
    && relation.relationKind === "basis"
  ));
  if (!proposals.some((result) => result.reference === proposal.reference)
    || new Set(proposals.map((result) => result.candidateRef)).size !== proposals.length
    || !sameReferenceSet(
      proposals.map((result) => result.candidateRef),
      proposalTransition.inputReferences
    )
    || proposalTransitionBasis.length !== proposalTransition.inputReferences.length
    || proposalTransitionBasis.some((relation) => (
      relation.targetRole !== "proposal_candidate"
      || relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== proposalTransition.createdOrder
      || relation.createdOrder !== proposalTransition.createdOrder
    ))
    || new Set(proposalTransitionBasis.map((relation) => relation.toRef)).size
      !== proposalTransitionBasis.length
    || !sameReferenceSet(
      proposalTransitionBasis.map((relation) => relation.toRef),
      proposalTransition.inputReferences
    )) {
    throw new SutStateIntegrityError(
      "Candidate-bound proposal intent has malformed material, creation, or ancestry closure."
    );
  }
  return proposal;
}

export function validateProductionCandidateClosure(records, relations, candidateRef) {
  const candidate = records.get(candidateRef);
  const transition = records.get(candidate?.createdByTransitionRef);
  const interaction = records.get(candidate?.interactionRef);
  const direction = records.get(candidate?.trialDirectionRef);
  const directionBasis = relations.filter((relation) => (
    relation.fromRef === candidate?.reference && relation.relationKind === "basis"
    && relation.targetRole === "selected_trial_direction"
  ));
  if (candidate?.family !== "trial_candidate" || candidate.origin !== "sut"
    || candidate.candidateType !== "production_focused_practice"
    || candidate.purpose !== "provisional_evaluative_trial"
    || candidate.materialIntent !== "practice_spontaneous_production_for_target_dimension"
    || candidate.lifecycleStatus !== "formed_non_active" || candidate.lifecycleVersion !== 1
    || candidate.proposedScope?.taskMode !== "spontaneous_production"
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "form_or_withhold_production_focused_candidate"
    || transition.interactionRef !== candidate.interactionRef
    || !transition.resultReferences?.includes(candidate.reference)
    || candidate.createdOrder >= transition.createdOrder
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || direction?.family !== "input_fact" || direction.origin !== "fixture"
    || direction.role !== "affordance_fact"
    || direction.payload?.direction !== PRODUCTION_FOCUSED_TRIAL_DIRECTION
    || directionBasis.length !== 1 || directionBasis[0].toRef !== direction.reference
    || directionBasis[0].assertedByRole !== "sut"
    || directionBasis[0].effectiveOrder !== candidate.createdOrder
    || directionBasis[0].createdOrder !== transition.createdOrder) {
    throw new SutStateIntegrityError("Proposal transition contains an invalid candidate participant.");
  }
  assertEligibleProductionCandidate(candidate, transition.reference);
  return { candidate, transition };
}

export function validateProposalResultClosure(
  records, relations, proposalRef, transition, candidateByRef
) {
  const proposal = records.get(proposalRef);
  const candidateClosure = candidateByRef.get(proposal?.candidateRef);
  const ancestry = relations.filter((relation) => (
    relation.fromRef === proposal?.reference && relation.relationKind === "transition_ancestry"
    && relation.targetRole === "candidate"
  ));
  const copiedEvidence = relations.filter((relation) => (
    relation.fromRef === proposal?.reference
    && ["basis", "support"].includes(relation.relationKind)
  ));
  if (proposal?.family !== "proposal_intent" || proposal.origin !== "sut"
    || !candidateClosure
    || proposal.createdByTransitionRef !== transition.reference
    || proposal.interactionRef !== transition.interactionRef
    || proposal.interactionRef !== candidateClosure.candidate.interactionRef
    || candidateClosure.transition.createdOrder >= proposal.createdOrder
    || proposal.createdOrder >= transition.createdOrder
    || ancestry.length !== 1 || ancestry[0].toRef !== candidateClosure.candidate.reference
    || ancestry[0].assertedByRole !== "sut"
    || ancestry[0].effectiveOrder !== proposal.createdOrder
    || ancestry[0].createdOrder !== transition.createdOrder
    || copiedEvidence.length !== 0) {
    throw new SutStateIntegrityError("Proposal transition contains an invalid proposal participant.");
  }
  assertProposalPreservesCandidate(proposal, candidateClosure.candidate);
  return proposal;
}

export function validateProposalSelection(
  records, relations, selection, expectedProposalRef
) {
  const proposalRef = selection.inputReferences?.[0];
  const proposal = validateCandidateBoundProposal(records, relations, proposalRef);
  const basis = relations.filter((relation) => (
    relation.fromRef === selection.reference
    && relation.relationKind === "basis"
    && relation.targetRole === "selected_proposal_intent"
    && relation.toRef === proposalRef
  ));
  if (selection.family !== "sut_transition_evidence"
    || selection.origin !== "sut"
    || selection.transitionKind !== "select_proposal_for_realization"
    || selection.result !== "proposal_selected_for_realization"
    || selection.inputReferences.length !== 1
    || selection.resultReferences.length !== 0
    || (expectedProposalRef && proposalRef !== expectedProposalRef)
    || selection.interactionRef !== proposal.interactionRef
    || selection.createdOrder <= proposal.createdOrder
    || basis.length !== 1
    || basis[0].assertedByRole !== "sut"
    || basis[0].effectiveOrder !== selection.createdOrder
    || basis[0].createdOrder !== selection.createdOrder) {
    throw new SutStateIntegrityError("Proposal realization selection evidence is malformed.");
  }
  return proposal;
}

export function resolveProposalRealizationClosure(
  records, relations, proposalRef, expectedFactRef
) {
  const proposal = validateCandidateBoundProposal(records, relations, proposalRef);
  const selections = [...records.values()].filter((record) => (
    record.transitionKind === "select_proposal_for_realization"
    && record.inputReferences?.includes(proposal.reference)
  ));
  if (selections.length !== 1) {
    throw new SutStateIntegrityError(
      "Proposal realization closure requires exactly one selection."
    );
  }
  const selection = selections[0];
  validateProposalSelection(records, relations, selection, proposal.reference);
  const realizationRelations = relations.filter((relation) => (
    relation.relationKind === "realization" && relation.toRef === proposal.reference
  ));
  const transitions = [...records.values()].filter((record) => (
    record.transitionKind === "record_proposal_realization"
    && record.inputReferences?.includes(proposal.reference)
  ));
  if (realizationRelations.length === 0 && transitions.length === 0) return undefined;
  if (realizationRelations.length !== 1 || transitions.length !== 1) {
    throw new SutStateIntegrityError("Proposal realization evidence is malformed or ambiguous.");
  }
  const relation = realizationRelations[0];
  const transition = transitions[0];
  const fact = records.get(relation.fromRef);
  const interaction = records.get(transition.interactionRef);
  const factBasis = relations.filter((candidate) => (
    candidate.fromRef === transition.reference
    && candidate.relationKind === "basis"
    && candidate.targetRole === "simulator_realization_fact"
  ));
  const selectionBasis = relations.filter((candidate) => (
    candidate.fromRef === transition.reference
    && candidate.relationKind === "basis"
    && candidate.targetRole === "proposal_realization_selection"
  ));
  if (fact?.family !== "input_fact"
    || fact.origin !== "simulator"
    || fact.role !== "simulator_realization"
    || fact.payload?.requestedRef !== proposal.reference
    || (expectedFactRef && fact.reference !== expectedFactRef)
    || fact.createdOrder <= selection.createdOrder
    || interaction?.family !== "interaction_segment"
    || !interaction.inputReferences?.includes(fact.reference)
    || transition.family !== "sut_transition_evidence"
    || transition.origin !== "sut"
    || transition.result !== "proposal_realization_recorded"
    || transition.inputReferences?.length !== 3
    || transition.inputReferences[0] !== fact.reference
    || transition.inputReferences[1] !== selection.reference
    || transition.inputReferences[2] !== proposal.reference
    || transition.resultReferences?.length !== 0
    || transition.createdOrder <= fact.createdOrder
    || transition.createdOrder <= selection.createdOrder
    || factBasis.length !== 1
    || factBasis[0].toRef !== fact.reference
    || factBasis[0].assertedByRole !== "sut"
    || factBasis[0].effectiveOrder !== transition.createdOrder
    || factBasis[0].createdOrder !== transition.createdOrder
    || selectionBasis.length !== 1
    || selectionBasis[0].toRef !== selection.reference
    || selectionBasis[0].assertedByRole !== "sut"
    || selectionBasis[0].effectiveOrder !== transition.createdOrder
    || selectionBasis[0].createdOrder !== transition.createdOrder
    || relation.targetRole !== "proposal_intent"
    || relation.assertedByRole !== "sut"
    || relation.fromRef === relation.toRef
    || relation.effectiveOrder !== transition.createdOrder
    || relation.createdOrder !== transition.createdOrder) {
    throw new SutStateIntegrityError(
      "Proposal realization evidence does not form an exact P/S/F/R/E closure."
    );
  }
  return { proposal, selection, fact, transition, relation };
}

export function assertEligibleProductionCandidate(candidate, candidateFormationTransitionRef) {
  if (candidate.origin !== "sut"
    || candidate.lifecycleStatus !== "formed_non_active"
    || candidate.lifecycleVersion !== 1
    || candidate.purpose !== "provisional_evaluative_trial"
    || candidate.materialIntent !== "practice_spontaneous_production_for_target_dimension"
    || !hasExactKeys(candidate.proposedScope, ["dimension", "taskMode"])
    || candidate.proposedScope?.taskMode !== "spontaneous_production"
    || typeof candidate.proposedScope?.dimension !== "string"
    || candidate.proposedScope.dimension.length === 0
    || candidate.createdByTransitionRef !== candidateFormationTransitionRef) {
    throw new SutStateIntegrityError(
      "Proposal-eligible production candidate violates the required formed non-active state contract."
    );
  }
}

function assertProposalPreservesCandidate(proposal, candidate) {
  if (proposal.origin !== "sut"
    || proposal.proposalType !== "candidate_bound_trial_offer"
    || proposal.candidateRef !== candidate.reference
    || proposal.materialIntent !== "offer_scoped_trial_for_user_decision"
    || !hasExactKeys(proposal.proposedScope, ["dimension", "taskMode"])
    || proposal.candidateMaterialIntent !== candidate.materialIntent
    || !isDeepStrictEqual(proposal.proposedScope, candidate.proposedScope)
    || proposal.responseExpectation !== "candidate_bound_trial_decision"
    || proposal.statusOrigin !== "sut_transition") {
    throw new SutStateIntegrityError(
      "Existing candidate-bound proposal intent conflicts with its exact candidate material state."
    );
  }
}

export function classifyProposalResponse(content) {
  return content.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
    === "yes, let's try that.";
}

function uniqueReferences(references) {
  return [...new Set(references)];
}

function sameReferenceSet(left, right) {
  return isDeepStrictEqual([...left].sort(), [...right].sort());
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}
