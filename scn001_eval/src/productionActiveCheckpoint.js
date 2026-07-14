import { isDeepStrictEqual } from "node:util";

const ACTIVATION_CHECK_NAMES = Object.freeze([
  "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
  "reversibility", "consequence", "current_applicability", "retention_basis",
  "non_adaptation_boundary"
]);

const CONTROL_KEYS = Object.freeze([
  "trialPolicyRefs", "userGovernedConstraintRefs", "consequenceRefs",
  "reversibilityRefs", "retentionBasisRefs"
]);

const CONTROL_TYPES = Object.freeze({
  trial_policy: "trialPolicyRefs",
  user_governed_constraints: "userGovernedConstraintRefs",
  consequence: "consequenceRefs",
  reversibility: "reversibilityRefs",
  evaluation_retention_basis: "retentionBasisRefs"
});

export function findExactActiveProductionTrial(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.relations)) {
    throw checkpointError("inspection snapshot is malformed");
  }
  const records = new Map();
  for (const record of snapshot.records) {
    if (!record?.reference || records.has(record.reference)) {
      throw checkpointError("record identity is missing or duplicated");
    }
    records.set(record.reference, record);
  }
  const closure = { records, relations: snapshot.relations };
  const trials = snapshot.records.filter((record) => record.family === "active_trial");
  if (trials.length === 0) return undefined;
  if (trials.length !== 1) throw checkpointError("active-trial identity is ambiguous");
  validateActiveTrial(closure, trials[0]);
  return trials[0];
}

function validateActiveTrial(closure, trial) {
  const { records, relations } = closure;
  const transition = uniqueCreatingTransition(closure, trial, "active trial");
  const candidate = exactRecord(records, trial?.candidateRef, "active-trial candidate");
  const assessment = exactRecord(
    records, trial?.activationAssessmentRef, "activation assessment"
  );
  const reconstructed = validateActivationAssessment(closure, assessment);
  const ancestry = relations.filter((relation) => (
    relation.fromRef === trial.reference && relation.relationKind === "transition_ancestry"
  ));
  const competing = [...records.values()].filter((record) => (
    record.family === "active_trial" && record.candidateRef === trial.candidateRef
  ));
  if (!hasExactKeys(trial, [
    "reference", "family", "origin", "trialType", "trialOrigin", "candidateRef",
    "activationAssessmentRef", "activationBasisType", "activeScope", "currentStatus",
    "lifecycleVersion", "correctionPath", "statusOrigin", "interactionRef", "createdOrder",
    "createdByTransitionRef"
  ]) || trial.origin !== "sut" || trial.trialType !== "production_focused_practice"
    || trial.trialOrigin !== "zoey_derived_trial" || trial.currentStatus !== "active"
    || trial.lifecycleVersion !== 1
    || trial.activationBasisType !== "bound_candidate_specific_proposal_acceptance"
    || trial.correctionPath !== "narrow_retire_supersede_or_clarify"
    || trial.statusOrigin !== "sut_transition"
    || candidate.reference !== reconstructed.candidate.reference
    || assessment.candidateRef !== candidate.reference
    || assessment.overallStatus !== "sufficient"
    || Object.values(reconstructed.checkResults).some((result) => result.status !== "passed")
    || !isDeepStrictEqual(trial.activeScope, candidate.proposedScope)
    || trial.interactionRef !== assessment.interactionRef
    || competing.length !== 1 || competing[0].reference !== trial.reference
    || !validTransition(transition, "activate_production_focused_trial", trial.interactionRef)
    || transition.result !== "trial_activated"
    || !isDeepStrictEqual(
      transition.inputReferences, [candidate.reference, assessment.reference]
    )
    || !isDeepStrictEqual(transition.resultReferences, [trial.reference])
    || ancestry.length !== 2
    || !hasRoleReference(ancestry, candidate.reference, "trial_candidate")
    || !hasRoleReference(ancestry, assessment.reference, "activation_assessment")
    || ancestry.some((relation) => !exactRelationMetadata(
      relation, trial.createdOrder, transition.createdOrder, "sut"
    ))
    || reconstructed.transition.createdOrder >= trial.createdOrder
    || trial.createdOrder >= transition.createdOrder) {
    throw checkpointError("active-trial closure is malformed");
  }
}

function validateActivationAssessment(closure, assessment) {
  const { records, relations } = closure;
  const transition = uniqueCreatingTransition(closure, assessment, "activation assessment");
  const binding = exactRecord(
    records, assessment?.bindingAssessmentRef, "proposal-response binding"
  );
  const bindingClosure = validateBinding(closure, binding);
  const proposal = bindingClosure.proposal;
  const candidate = validateCandidate(closure, proposal.candidateRef);
  const basis = validateCandidateBasis(closure, candidate);
  const interaction = exactRecord(records, assessment?.interactionRef, "activation interaction");
  if (interaction.reference !== binding.interactionRef) {
    throw checkpointError("activation interaction does not equal binding interaction");
  }
  validateInteractionIngestion(closure, interaction, "activation interaction");
  const controlBasisRefs = {
    candidateInteraction: resolveControlInventory(closure, basis.interaction),
    bindingInteraction: resolveControlInventory(closure, interaction)
  };
  const contextChangeRefs = interaction.inputReferences
    .map((reference) => records.get(reference))
    .filter((record) => record?.role === "material_context_change")
    .map((fact) => {
      validateRetainedFact(
        closure, fact, "fixture", "material_context_change", "fixture-driver", interaction
      );
      return fact.reference;
    });
  const participants = {
    candidateRef: candidate.reference,
    bindingAssessmentRef: binding.reference,
    comparisonRef: basis.comparison.reference,
    recognitionObservationRef: basis.recognition.reference,
    productionObservationRef: basis.production.reference,
    chronologyRef: basis.chronology.reference,
    contextRef: basis.context.reference,
    contextChangeRefs,
    controlBasisRefs
  };
  const materialBasisRefs = activationMaterialBasisRefs(participants);
  const checkResults = deriveActivationCheckResults(records, {
    candidate, proposal, binding, basis, controlBasisRefs, contextChangeRefs
  });
  const overallStatus = deriveActivationOverallStatus(checkResults);
  const assessmentRelations = relations.filter((relation) => (
    relation.fromRef === assessment.reference && relation.relationKind === "basis"
  ));
  const expectedRelations = activationParticipantRolePairs(participants);
  const competing = [...records.values()].filter((record) => (
    record.family === "activation_assessment"
      && record.candidateRef === assessment.candidateRef
      && record.bindingAssessmentRef === assessment.bindingAssessmentRef
  ));
  if (!hasExactKeys(assessment, [
    "reference", "family", "origin", "activationType", "activationBasisType",
    "candidateRef", "bindingAssessmentRef", "activeScope", "overallStatus",
    "comparisonRef", "recognitionObservationRef", "productionObservationRef",
    "chronologyRef", "contextRef", "controlBasisRefs", "checkResults",
    "materialBasisRefs", "statusOrigin", "interactionRef", "createdOrder",
    "createdByTransitionRef"
  ]) || assessment.family !== "activation_assessment" || assessment.origin !== "sut"
    || assessment.activationType !== "production_focused_candidate_activation"
    || assessment.activationBasisType !== "bound_candidate_specific_proposal_acceptance"
    || assessment.statusOrigin !== "sut_transition"
    || competing.length !== 1 || competing[0].reference !== assessment.reference
    || !hasExactKeys(assessment.checkResults, ACTIVATION_CHECK_NAMES)
    || !validTransition(
      transition, "assess_production_focused_trial_activation", interaction.reference
    )
    || transition.result !== "activation_assessed"
    || !isDeepStrictEqual(transition.inputReferences, materialBasisRefs)
    || new Set(transition.inputReferences).size !== transition.inputReferences.length
    || !isDeepStrictEqual(transition.resultReferences, [assessment.reference])
    || !isDeepStrictEqual(assessment.controlBasisRefs, controlBasisRefs)
    || !isDeepStrictEqual(assessment.materialBasisRefs, materialBasisRefs)
    || assessment.candidateRef !== candidate.reference
    || assessment.bindingAssessmentRef !== binding.reference
    || assessment.comparisonRef !== basis.comparison.reference
    || assessment.recognitionObservationRef !== basis.recognition.reference
    || assessment.productionObservationRef !== basis.production.reference
    || assessment.chronologyRef !== basis.chronology.reference
    || assessment.contextRef !== basis.context.reference
    || assessmentRelations.length !== expectedRelations.length
    || !sameRoleReferencePairs(assessmentRelations, expectedRelations)
    || assessmentRelations.some((relation) => !exactRelationMetadata(
      relation, assessment.createdOrder, transition.createdOrder, "sut"
    ))
    || !isDeepStrictEqual(assessment.checkResults, checkResults)
    || assessment.overallStatus !== overallStatus
    || !isDeepStrictEqual(assessment.activeScope, candidate.proposedScope)
    || bindingClosure.transition.createdOrder >= assessment.createdOrder
    || assessment.createdOrder >= transition.createdOrder
    || materialBasisRefs.some((reference) => (
      records.get(reference)?.createdOrder >= assessment.createdOrder
    ))) {
    throw checkpointError("activation assessment does not match independent recomputation");
  }
  return { candidate, binding, proposal, checkResults, transition };
}

function validateBinding(closure, binding) {
  const { records, relations } = closure;
  const transition = uniqueCreatingTransition(closure, binding, "binding assessment");
  const proposal = validateProposal(closure, binding?.proposalRef);
  const realizationRefs = binding?.realizationFactRefs ?? [];
  const responseRefs = binding?.userResponseRefs ?? [];
  if (realizationRefs.length !== 1 || responseRefs.length !== 1) {
    throw checkpointError("binding participants are not exact");
  }
  const realization = validateProposalRealization(closure, proposal, realizationRefs[0]);
  const response = exactRecord(records, responseRefs[0], "proposal response");
  const interaction = exactRecord(records, binding?.interactionRef, "binding interaction");
  const ingestion = validateInteractionIngestion(closure, interaction, "binding interaction");
  validateRetainedFact(
    closure, realization.fact, "simulator", "simulator_realization",
    "simulated-dependency", interaction
  );
  validateRetainedFact(
    closure, response, "fixture", "user_response", "synthetic-user-a", interaction
  );
  const transitionBasis = relations.filter((relation) => (
    relation.fromRef === transition.reference && relation.relationKind === "basis"
  ));
  const bindingRelations = relations.filter((relation) => (
    relation.fromRef === binding.reference && relation.relationKind === "binding"
  ));
  const expectedTransitionInputs = uniqueReferences([
    proposal.reference, realization.fact.reference, response.reference,
    realization.transition.reference
  ]);
  if (!hasExactKeys(binding, [
    "reference", "family", "origin", "bindingType", "proposalRef",
    "realizationFactRefs", "userResponseRefs", "bindingStatus", "responseStatus",
    "materialIntentStatus", "reason", "statusOrigin", "interactionRef", "createdOrder",
    "createdByTransitionRef"
  ]) || binding.family !== "binding_assessment" || binding.origin !== "sut"
    || binding.bindingType !== "candidate_bound_proposal_response"
    || binding.bindingStatus !== "bound" || binding.responseStatus !== "accepted"
    || binding.materialIntentStatus !== "match"
    || binding.reason !== "exact_candidate_bound_proposal_response"
    || binding.statusOrigin !== "sut_transition"
    || response.payload.content.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
      !== "yes, let's try that."
    || response.payload.context !== "proposal_response"
    || realization.fact.payload.fidelity !== "match"
    || realization.fact.payload.requestedRef !== proposal.reference
    || interaction.inputReferences.filter((ref) => ref === realization.fact.reference).length !== 1
    || interaction.inputReferences.filter((ref) => ref === response.reference).length !== 1
    || !validTransition(transition, "assess_proposal_response_binding", interaction.reference)
    || transition.result !== "binding_assessed"
    || !sameReferenceSet(transition.inputReferences, expectedTransitionInputs)
    || transition.inputReferences.length !== expectedTransitionInputs.length
    || !isDeepStrictEqual(transition.resultReferences, [binding.reference])
    || transitionBasis.length !== 2
    || !hasRoleReference(
      transitionBasis, response.reference, "user_response_fact"
    )
    || !hasRoleReference(
      transitionBasis, realization.transition.reference, "proposal_realization_evidence"
    )
    || transitionBasis.some((relation) => !exactRelationMetadata(
      relation, transition.createdOrder, transition.createdOrder, "sut"
    ))
    || bindingRelations.length !== 3
    || !hasRoleReference(
      bindingRelations, proposal.reference, "candidate_bound_proposal_intent"
    )
    || !hasRoleReference(
      bindingRelations, realization.fact.reference, "actual_surfaced_realization"
    )
    || !hasRoleReference(bindingRelations, response.reference, "actual_user_response")
    || bindingRelations.some((relation) => !exactRelationMetadata(
      relation, binding.createdOrder, transition.createdOrder, "sut"
    ))
    || ingestion.createdOrder >= binding.createdOrder
    || realization.transition.createdOrder >= binding.createdOrder
    || response.createdOrder >= binding.createdOrder
    || binding.createdOrder >= transition.createdOrder) {
    throw checkpointError("proposal-response binding closure is malformed");
  }
  return { proposal, realization, response, interaction, ingestion, transition };
}

function validateProposal(closure, proposalRef) {
  const { records, relations } = closure;
  const proposal = exactRecord(records, proposalRef, "candidate-bound proposal");
  const transition = uniqueCreatingTransition(closure, proposal, "candidate-bound proposal");
  const candidate = validateCandidate(closure, proposal?.candidateRef);
  const ancestry = relations.filter((relation) => (
    relation.fromRef === proposal.reference && relation.relationKind === "transition_ancestry"
  ));
  const copiedEvidence = relations.filter((relation) => (
    relation.fromRef === proposal.reference && ["basis", "support"].includes(relation.relationKind)
  ));
  const transitionBasis = relations.filter((relation) => (
    relation.fromRef === transition.reference && relation.relationKind === "basis"
  ));
  if (!hasExactKeys(proposal, [
    "reference", "family", "origin", "proposalType", "candidateRef", "materialIntent",
    "candidateMaterialIntent", "proposedScope", "responseExpectation", "statusOrigin",
    "interactionRef", "createdOrder", "createdByTransitionRef"
  ]) || proposal.family !== "proposal_intent" || proposal.origin !== "sut"
    || proposal.proposalType !== "candidate_bound_trial_offer"
    || proposal.materialIntent !== "offer_scoped_trial_for_user_decision"
    || proposal.candidateMaterialIntent !== candidate.materialIntent
    || !isDeepStrictEqual(proposal.proposedScope, candidate.proposedScope)
    || proposal.responseExpectation !== "candidate_bound_trial_decision"
    || proposal.statusOrigin !== "sut_transition"
    || proposal.interactionRef !== candidate.interactionRef
    || !validTransition(transition, "form_candidate_bound_proposal_intent", proposal.interactionRef)
    || transition.result !== "proposal_intent_formed"
    || !isDeepStrictEqual(transition.inputReferences, [candidate.reference])
    || !isDeepStrictEqual(transition.resultReferences, [proposal.reference])
    || transitionBasis.length !== 1
    || !hasRoleReference(transitionBasis, candidate.reference, "proposal_candidate")
    || !exactRelationMetadata(
      transitionBasis[0], transition.createdOrder, transition.createdOrder, "sut"
    )
    || ancestry.length !== 1
    || !hasRoleReference(ancestry, candidate.reference, "candidate")
    || !exactRelationMetadata(
      ancestry[0], proposal.createdOrder, transition.createdOrder, "sut"
    )
    || copiedEvidence.length !== 0
    || records.get(candidate.createdByTransitionRef).createdOrder >= proposal.createdOrder
    || proposal.createdOrder >= transition.createdOrder) {
    throw checkpointError("candidate-bound proposal closure is malformed");
  }
  return proposal;
}

function validateCandidate(closure, candidateRef) {
  const { records, relations } = closure;
  const candidate = exactRecord(records, candidateRef, "production candidate");
  const transition = uniqueCreatingTransition(closure, candidate, "production candidate");
  const interaction = exactRecord(records, candidate?.interactionRef, "candidate interaction");
  validateInteractionIngestion(closure, interaction, "candidate interaction");
  const affordances = interaction.inputReferences
    .map((reference) => records.get(reference))
    .filter((record) => record?.role === "affordance_fact");
  for (const affordance of affordances) {
    validateRetainedFact(
      closure, affordance, "fixture", "affordance_fact", "fixture-driver", interaction
    );
  }
  const direction = exactRecord(records, candidate?.trialDirectionRef, "trial direction");
  validateRetainedFact(
    closure, direction, "fixture", "affordance_fact", "fixture-driver", interaction
  );
  const comparison = validateComparison(closure, candidate?.supportComparisonRef, interaction);
  const candidateRelations = relations.filter((relation) => relation.fromRef === candidate.reference);
  const expectedRelations = [
    [direction.reference, "selected_trial_direction", "basis"],
    [comparison.comparison.reference, "comparison_input", "basis"],
    [comparison.comparison.reference, "dimension_comparison", "support"]
  ];
  if (!hasExactKeys(candidate, [
    "reference", "family", "origin", "candidateType", "materialIntent",
    "candidateSource", "purpose", "trialDirectionRef", "supportComparisonRef",
    "proposedScope", "reversibility", "correctionPath", "lifecycleStatus",
    "lifecycleVersion", "decisionBasisAffordanceRefs", "uncertainty", "statusOrigin",
    "interactionRef", "createdOrder", "createdByTransitionRef"
  ]) || candidate.family !== "trial_candidate" || candidate.origin !== "sut"
    || candidate.candidateType !== "production_focused_practice"
    || candidate.materialIntent !== "practice_spontaneous_production_for_target_dimension"
    || candidate.candidateSource !== "sut_transition"
    || candidate.purpose !== "provisional_evaluative_trial"
    || candidate.reversibility !== "retirable_before_activation"
    || candidate.correctionPath !== "separate_activation_required_before_behavior_effect"
    || candidate.lifecycleStatus !== "formed_non_active" || candidate.lifecycleVersion !== 1
    || candidate.uncertainty !== "bounded_to_supplied_calibration"
    || candidate.statusOrigin !== "sut_transition"
    || candidate.uncertainty !== comparison.comparison.uncertainty
    || !isDeepStrictEqual(candidate.proposedScope, {
      dimension: comparison.comparison.targetDimension, taskMode: "spontaneous_production"
    })
    || !isDeepStrictEqual(
      candidate.decisionBasisAffordanceRefs,
      affordances.map((affordance) => affordance.reference).sort()
    )
    || affordances.filter(
      (affordance) => affordance.payload.direction === "TRIAL-PROD-FOCUS"
    ).length !== 1
    || direction.payload.direction !== "TRIAL-PROD-FOCUS"
    || !affordances.some((affordance) => affordance.reference === direction.reference)
    || !validTransition(
      transition, "form_or_withhold_production_focused_candidate", interaction.reference
    )
    || !transition.inputReferences.includes(comparison.recognition.reference)
    || !transition.inputReferences.includes(comparison.production.reference)
    || !transition.inputReferences.includes(comparison.comparison.reference)
    || !transition.inputReferences.includes(direction.reference)
    || affordances.some((affordance) => (
      !transition.inputReferences.includes(affordance.reference)
    ))
    || !transition.resultReferences.includes(candidate.reference)
    || !["candidate_formed", "candidate_and_non_activation_recorded"].includes(transition.result)
    || candidateRelations.length !== expectedRelations.length
    || !expectedRelations.every(([reference, role, kind]) => (
      candidateRelations.filter((relation) => relation.toRef === reference
        && relation.targetRole === role && relation.relationKind === kind).length === 1
    ))
    || candidateRelations.some((relation) => !exactRelationMetadata(
      relation, candidate.createdOrder, transition.createdOrder, "sut"
    ))
    || comparison.comparison.createdOrder >= candidate.createdOrder
    || candidate.createdOrder >= transition.createdOrder) {
    throw checkpointError("production candidate closure is malformed");
  }
  return candidate;
}

function validateCandidateBasis(closure, candidate) {
  const interaction = exactRecord(
    closure.records, candidate.interactionRef, "candidate interaction"
  );
  const comparison = validateComparison(
    closure, candidate.supportComparisonRef, interaction
  );
  const chronologyFacts = interaction.inputReferences
    .map((reference) => closure.records.get(reference))
    .filter((fact) => fact?.role === "chronology_fact");
  const contexts = interaction.inputReferences
    .map((reference) => closure.records.get(reference))
    .filter((fact) => fact?.role === "context_label");
  if (chronologyFacts.length !== 1 || contexts.length !== 1) {
    throw checkpointError("candidate chronology or context is ambiguous");
  }
  validateRetainedFact(
    closure, chronologyFacts[0], "fixture", "chronology_fact", "fixture-driver", interaction
  );
  validateRetainedFact(
    closure, contexts[0], "fixture", "context_label", "fixture-driver", interaction
  );
  return {
    interaction,
    comparison: comparison.comparison,
    recognition: comparison.recognition,
    production: comparison.production,
    chronology: chronologyFacts[0],
    context: contexts[0]
  };
}

function validateComparison(closure, comparisonRef, interaction) {
  const { records, relations } = closure;
  const comparison = exactRecord(records, comparisonRef, "dimension comparison");
  const transition = uniqueCreatingTransition(closure, comparison, "dimension comparison");
  const recognitionRefs = comparison?.recognitionObservationRefs ?? [];
  const productionRefs = comparison?.productionObservationRefs ?? [];
  if (recognitionRefs.length !== 1 || productionRefs.length !== 1) {
    throw checkpointError("comparison observation cardinality is invalid");
  }
  const recognition = exactRecord(records, recognitionRefs[0], "recognition observation");
  const production = exactRecord(records, productionRefs[0], "production observation");
  validateRetainedFact(
    closure, recognition, "fixture", "task_observation", "fixture-scorer", interaction
  );
  validateRetainedFact(
    closure, production, "fixture", "task_observation", "fixture-scorer", interaction
  );
  const recognitionPerformance = summarizePerformance([recognition]);
  const productionPerformance = summarizePerformance([production]);
  const relationSet = relations.filter((relation) => (
    relation.fromRef === comparison.reference && relation.relationKind === "basis"
  ));
  if (!hasExactKeys(comparison, [
    "reference", "family", "origin", "targetDimension", "recognitionTaskMode",
    "productionTaskMode", "recognitionObservationRefs", "productionObservationRefs",
    "recognitionPerformance", "productionPerformance", "comparisonResult", "uncertainty",
    "statusOrigin", "interactionRef", "createdOrder", "createdByTransitionRef"
  ]) || comparison.family !== "dimension_comparison" || comparison.origin !== "sut"
    || comparison.recognitionTaskMode !== "recognition"
    || comparison.productionTaskMode !== "spontaneous_production"
    || comparison.uncertainty !== "bounded_to_supplied_calibration"
    || comparison.statusOrigin !== "sut_transition"
    || comparison.interactionRef !== interaction.reference
    || recognition.payload.taskMode !== "recognition"
    || production.payload.taskMode !== "spontaneous_production"
    || recognition.payload.dimension !== comparison.targetDimension
    || production.payload.dimension !== comparison.targetDimension
    || !isDeepStrictEqual(comparison.recognitionPerformance, recognitionPerformance)
    || !isDeepStrictEqual(comparison.productionPerformance, productionPerformance)
    || comparison.comparisonResult !== comparePerformance(
      recognitionPerformance, productionPerformance
    )
    || !validTransition(
      transition, "compare_recognition_and_spontaneous_production", interaction.reference
    )
    || transition.result !== "accepted"
    || !isDeepStrictEqual(
      transition.inputReferences, [recognition.reference, production.reference]
    )
    || !isDeepStrictEqual(transition.resultReferences, [comparison.reference])
    || relationSet.length !== 2
    || !validComparisonRelation(
      relationSet, recognition, comparison, "recognition_observation", "recognition", transition
    )
    || !validComparisonRelation(
      relationSet, production, comparison, "production_observation",
      "spontaneous_production", transition
    )
    || recognition.createdOrder >= comparison.createdOrder
    || production.createdOrder >= comparison.createdOrder
    || comparison.createdOrder >= transition.createdOrder) {
    throw checkpointError("dimension-comparison closure is malformed");
  }
  return { comparison, recognition, production, transition };
}

function validateProposalRealization(closure, proposal, expectedFactRef) {
  const { records, relations } = closure;
  const selections = [...records.values()].filter((record) => (
    record.transitionKind === "select_proposal_for_realization"
      && record.inputReferences?.includes(proposal.reference)
  ));
  if (selections.length !== 1) throw checkpointError("proposal selection is ambiguous");
  const selection = selections[0];
  const selectionBasis = relations.filter((relation) => (
    relation.fromRef === selection.reference && relation.relationKind === "basis"
  ));
  const realizationRelations = relations.filter((relation) => (
    relation.relationKind === "realization" && relation.toRef === proposal.reference
  ));
  const transitions = [...records.values()].filter((record) => (
    record.transitionKind === "record_proposal_realization"
      && record.inputReferences?.includes(proposal.reference)
  ));
  if (realizationRelations.length !== 1 || transitions.length !== 1) {
    throw checkpointError("proposal realization is ambiguous");
  }
  const relation = realizationRelations[0];
  const transition = transitions[0];
  const fact = exactRecord(records, relation.fromRef, "proposal simulator fact");
  const interaction = exactRecord(records, transition.interactionRef, "realization interaction");
  validateRetainedFact(
    closure, fact, "simulator", "simulator_realization", "simulated-dependency", interaction
  );
  const bases = relations.filter((candidate) => (
    candidate.fromRef === transition.reference && candidate.relationKind === "basis"
  ));
  if (selection.family !== "sut_transition_evidence" || selection.origin !== "sut"
    || selection.transitionKind !== "select_proposal_for_realization"
    || selection.result !== "proposal_selected_for_realization"
    || !isDeepStrictEqual(selection.inputReferences, [proposal.reference])
    || !isDeepStrictEqual(selection.resultReferences, [])
    || selection.interactionRef !== proposal.interactionRef
    || selectionBasis.length !== 1
    || !hasRoleReference(selectionBasis, proposal.reference, "selected_proposal_intent")
    || !exactRelationMetadata(
      selectionBasis[0], selection.createdOrder, selection.createdOrder, "sut"
    )
    || fact.reference !== expectedFactRef
    || fact.payload.requestedRef !== proposal.reference
    || !validTransition(transition, "record_proposal_realization", interaction.reference)
    || transition.result !== "proposal_realization_recorded"
    || !isDeepStrictEqual(transition.inputReferences, [
      fact.reference, selection.reference, proposal.reference
    ])
    || !isDeepStrictEqual(transition.resultReferences, [])
    || bases.length !== 2
    || !hasRoleReference(bases, fact.reference, "simulator_realization_fact")
    || !hasRoleReference(bases, selection.reference, "proposal_realization_selection")
    || bases.some((basis) => !exactRelationMetadata(
      basis, transition.createdOrder, transition.createdOrder, "sut"
    ))
    || relation.fromRef !== fact.reference || relation.toRef !== proposal.reference
    || relation.targetRole !== "proposal_intent" || relation.fromRef === relation.toRef
    || !exactRelationMetadata(
      relation, transition.createdOrder, transition.createdOrder, "sut"
    )
    || selection.createdOrder >= fact.createdOrder
    || fact.createdOrder >= transition.createdOrder) {
    throw checkpointError("proposal realization closure is malformed");
  }
  return { selection, fact, transition, relation };
}

function resolveControlInventory(closure, interaction) {
  const inventory = Object.fromEntries(CONTROL_KEYS.map((key) => [key, []]));
  for (const reference of interaction.inputReferences) {
    const fact = closure.records.get(reference);
    if (fact?.role !== "fixture_control_fact") continue;
    validateRetainedFact(
      closure, fact, "fixture", "fixture_control_fact", "fixture-driver", interaction
    );
    const key = CONTROL_TYPES[fact.payload.control];
    if (!key) throw checkpointError("activation control type is unknown");
    inventory[key].push(fact.reference);
  }
  return inventory;
}

function validateRetainedFact(
  closure, fact, origin, role, expectedActor, currentInteraction
) {
  const { records, relations } = closure;
  if (!hasExactKeys(fact, [
    "reference", "family", "origin", "role", "sourceFactRef", "payload",
    "firstInteractionRef", "createdOrder", "sourceActorRef"
  ]) || fact.family !== "input_fact" || fact.origin !== origin || fact.role !== role
    || fact.payload?.sourceActor !== expectedActor || !validInputPayload(fact.payload, role)) {
    throw checkpointError(`${role} fact contract is malformed`);
  }
  const actor = exactRecord(records, fact.sourceActorRef, `${role} actor`);
  const matchingActors = [...records.values()].filter((record) => (
    record.family === "semantic_source" && record.origin === origin
      && record.sourceActor === expectedActor
  ));
  const firstInteraction = exactRecord(
    records, fact.firstInteractionRef, `${role} first interaction`
  );
  const firstIngestion = validateInteractionIngestion(
    closure, firstInteraction, `${role} first interaction`
  );
  const currentIngestion = validateInteractionIngestion(
    closure, currentInteraction, `${role} current interaction`
  );
  const containing = [...records.values()]
    .filter((record) => record.family === "interaction_segment"
      && record.inputReferences?.includes(fact.reference))
    .sort((left, right) => left.createdOrder - right.createdOrder);
  const sources = relations.filter((relation) => (
    relation.fromRef === fact.reference && relation.relationKind === "source"
  ));
  if (!hasExactKeys(actor, ["reference", "family", "origin", "sourceActor", "createdOrder"])
    || actor.family !== "semantic_source" || actor.origin !== origin
    || actor.sourceActor !== expectedActor
    || fact.payload.sourceFactRef !== fact.sourceFactRef
    || matchingActors.length !== 1 || matchingActors[0].reference !== actor.reference
    || containing.length === 0 || containing[0].reference !== firstInteraction.reference
    || firstInteraction.inputReferences.filter((ref) => ref === fact.reference).length !== 1
    || currentInteraction.inputReferences.filter((ref) => ref === fact.reference).length !== 1
    || sources.length !== 1
    || !hasRoleReference(sources, actor.reference, "semantic_source")
    || !exactRelationMetadata(
      sources[0], fact.createdOrder, firstIngestion.createdOrder, "sut"
    )
    || actor.createdOrder >= fact.createdOrder
    || fact.createdOrder >= firstInteraction.createdOrder
    || firstInteraction.createdOrder >= firstIngestion.createdOrder
    || currentInteraction.createdOrder >= currentIngestion.createdOrder) {
    throw checkpointError(`${role} provenance closure is malformed`);
  }
  return fact;
}

function validateInteractionIngestion(closure, interaction, label) {
  const { records, relations } = closure;
  if (!hasExactKeys(interaction, [
    "reference", "family", "origin", "inputReferences", "createdOrder",
    "createdByTransitionRef"
  ]) || interaction.family !== "interaction_segment" || interaction.origin !== "sut"
    || new Set(interaction.inputReferences).size !== interaction.inputReferences.length) {
    throw checkpointError(`${label} identity is malformed`);
  }
  const ingestion = uniqueCreatingTransition(closure, interaction, `${label} ingestion`);
  const bases = relations.filter((relation) => (
    relation.fromRef === ingestion.reference && relation.relationKind === "basis"
  ));
  if (interaction.createdByTransitionRef !== ingestion.reference
    || !validTransition(ingestion, "ingest_sut_visible_inputs", interaction.reference)
    || ingestion.result !== "accepted"
    || !isDeepStrictEqual(ingestion.inputReferences, interaction.inputReferences)
    || !isDeepStrictEqual(ingestion.resultReferences, [interaction.reference])
    || bases.length !== interaction.inputReferences.length
    || !sameReferenceSet(
      bases.map((relation) => relation.toRef), interaction.inputReferences
    )
    || bases.some((relation) => relation.targetRole !== "ingested_input"
      || !exactRelationMetadata(
        relation, ingestion.createdOrder, ingestion.createdOrder, "sut"
      ))
    || interaction.createdOrder >= ingestion.createdOrder) {
    throw checkpointError(`${label} ingestion closure is malformed`);
  }
  return ingestion;
}

function deriveActivationCheckResults(records, {
  candidate, proposal, binding, basis, controlBasisRefs, contextChangeRefs
}) {
  const pass = (reason) => ({ status: "passed", reason });
  const fail = (reason) => ({ status: "failed", reason });
  const unresolved = (reason) => ({ status: "unresolved", reason });
  const classifyControl = (refs, supportedValue, reasons) => {
    const exactRefs = uniqueReferences(refs);
    if (exactRefs.length === 0) return fail(reasons.missing);
    if (exactRefs.length > 1) return unresolved(reasons.conflicting);
    return records.get(exactRefs[0]).payload.value === supportedValue
      ? pass(reasons.passed) : fail(reasons.unsupported);
  };
  const combinedControlRefs = (key) => [
    ...controlBasisRefs.candidateInteraction[key],
    ...controlBasisRefs.bindingInteraction[key]
  ];
  const classifyRedelivery = (key, supportedValue, reasons) => {
    const candidateRefs = uniqueReferences(controlBasisRefs.candidateInteraction[key]);
    const bindingRefs = uniqueReferences(controlBasisRefs.bindingInteraction[key]);
    if (candidateRefs.length === 0) return fail(reasons.missingCandidate);
    if (bindingRefs.length === 0) return fail(reasons.missingBinding);
    if (candidateRefs.length > 1 || bindingRefs.length > 1) {
      return unresolved(reasons.conflicting);
    }
    if (candidateRefs[0] !== bindingRefs[0]) return fail(reasons.identityMismatch);
    return records.get(candidateRefs[0]).payload.value === supportedValue
      ? pass(reasons.passed) : fail(reasons.unsupported);
  };
  const current = basis.recognition.payload.occurrenceScenarioDay
      === basis.chronology.payload.scenarioDay
    && basis.production.payload.occurrenceScenarioDay === basis.chronology.payload.scenarioDay
    && basis.recognition.firstInteractionRef === candidate.interactionRef
    && basis.production.firstInteractionRef === candidate.interactionRef;
  const contextCompatible = basis.context.payload.activity === "japanese_practice"
    && basis.context.payload.taskMode === "spontaneous_production";
  return {
    scope: isDeepStrictEqual(proposal.proposedScope, candidate.proposedScope)
      && candidate.proposedScope.taskMode === "spontaneous_production"
      ? pass("exact_bounded_candidate_scope") : fail("candidate_proposal_scope_mismatch"),
    basis_lineage: binding.proposalRef === proposal.reference
      ? pass("exact_candidate_proposal_binding_lineage")
      : fail("incomplete_activation_lineage"),
    current_stale_basis: current
      ? pass("current_calibration_support") : fail("support_not_current_under_chronology"),
    user_governed_constraints: classifyControl(
      combinedControlRefs("userGovernedConstraintRefs"), "exhaustive_selected_slice_scope",
      { missing: "user_governed_control_missing", conflicting: "conflicting_user_governed_controls",
        passed: "exhaustive_selected_slice_constraints",
        unsupported: "unsupported_user_governed_constraints" }
    ),
    reversibility: candidate.reversibility !== "retirable_before_activation"
      ? fail("candidate_reversibility_not_supported")
      : classifyRedelivery("reversibilityRefs", "reversible",
        { missingCandidate: "candidate_reversibility_control_missing",
          missingBinding: "canonical_reversibility_redelivery_missing",
          conflicting: "conflicting_reversibility_controls",
          identityMismatch: "canonical_reversibility_redelivery_identity_mismatch",
          passed: "reversible_separate_trial_state",
          unsupported: "reversibility_not_supported" }),
    consequence: basis.context.payload.consequence !== "low"
      ? fail("context_consequence_not_low")
      : classifyRedelivery("consequenceRefs", "low",
        { missingCandidate: "candidate_consequence_control_missing",
          missingBinding: "canonical_consequence_redelivery_missing",
          conflicting: "conflicting_consequence_controls",
          identityMismatch: "canonical_consequence_redelivery_identity_mismatch",
          passed: "low_consequence_synthetic_context", unsupported: "consequence_not_low" }),
    current_applicability: contextCompatible && contextChangeRefs.length === 0
      ? pass("current_japanese_production_context_compatible")
      : fail("current_context_not_applicable"),
    retention_basis: classifyControl(
      combinedControlRefs("retentionBasisRefs"), "named_formal_run",
      { missing: "retention_control_missing", conflicting: "conflicting_retention_controls",
        passed: "named_formal_run_disposable_retention",
        unsupported: "unsupported_retention_basis" }
    ),
    non_adaptation_boundary: candidate.purpose !== "provisional_evaluative_trial"
      ? fail("candidate_not_provisional")
      : classifyControl(
        combinedControlRefs("trialPolicyRefs"),
        "bounded_reversible_trial_no_durable_adaptation",
        { missing: "trial_policy_control_missing", conflicting: "conflicting_trial_policy_controls",
          passed: "bounded_zoey_trial_not_durable_adaptation",
          unsupported: "durable_adaptation_not_permitted" }
      )
  };
}

function activationMaterialBasisRefs(participants) {
  return uniqueReferences([
    participants.candidateRef,
    participants.bindingAssessmentRef,
    participants.comparisonRef,
    participants.recognitionObservationRef,
    participants.productionObservationRef,
    participants.chronologyRef,
    participants.contextRef,
    ...participants.contextChangeRefs,
    ...["candidateInteraction", "bindingInteraction"].flatMap((region) => (
      CONTROL_KEYS.flatMap((key) => participants.controlBasisRefs[region][key])
    ))
  ]);
}

function activationParticipantRolePairs(participants) {
  return [
    [participants.candidateRef, "activation_candidate"],
    [participants.bindingAssessmentRef, "proposal_response_binding"],
    [participants.comparisonRef, "candidate_support_comparison"],
    [participants.recognitionObservationRef, "current_recognition_evidence"],
    [participants.productionObservationRef, "current_production_evidence"],
    [participants.chronologyRef, "activation_chronology"],
    [participants.contextRef, "activation_context"],
    ...participants.contextChangeRefs.map((ref) => [ref, "binding_material_context_change"]),
    ...controlRolePairs(participants.controlBasisRefs.candidateInteraction, "candidate"),
    ...controlRolePairs(participants.controlBasisRefs.bindingInteraction, "binding")
  ];
}

function controlRolePairs(inventory, prefix) {
  return [
    ...inventory.trialPolicyRefs.map((ref) => [ref, `${prefix}_trial_policy_control`]),
    ...inventory.userGovernedConstraintRefs.map(
      (ref) => [ref, `${prefix}_user_governed_control`]
    ),
    ...inventory.consequenceRefs.map((ref) => [ref, `${prefix}_consequence_control`]),
    ...inventory.reversibilityRefs.map((ref) => [ref, `${prefix}_reversibility_control`]),
    ...inventory.retentionBasisRefs.map((ref) => [ref, `${prefix}_retention_control`])
  ];
}

function deriveActivationOverallStatus(results) {
  if (Object.values(results).some((result) => result.status === "failed")) {
    return "insufficient";
  }
  if (Object.values(results).some((result) => result.status === "unresolved")) {
    return "unresolved_conflict";
  }
  return "sufficient";
}

function validInputPayload(payload, role) {
  const keys = {
    task_observation: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "itemRef", "taskMode",
      "dimension", "performance", "occurrenceScenarioDay", "sessionId", "sessionOrder"
    ],
    chronology_fact: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "scenarioDay",
      "sessionId", "sessionOrder"
    ],
    context_label: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "surfaceLabel",
      "activity", "taskMode", "consequence"
    ],
    affordance_fact: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "direction", "description"
    ],
    fixture_control_fact: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "control", "value"
    ],
    simulator_realization: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "requestedRef",
      "realizedBehavior", "fidelity"
    ],
    user_response: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "content", "context"
    ],
    material_context_change: [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "description"
    ]
  }[role];
  return keys && hasExactKeys(payload, keys) && payload.kind === role;
}

function summarizePerformance(observations) {
  return observations.reduce((summary, observation) => {
    const performance = observation.payload.performance;
    if (performance.kind === "binary") {
      summary.correctCount += performance.correct ? 1 : 0;
      summary.totalCount += 1;
    } else {
      summary.correctCount += performance.correctCount;
      summary.totalCount += performance.totalCount;
    }
    return summary;
  }, { correctCount: 0, totalCount: 0 });
}

function comparePerformance(recognition, production) {
  const difference = recognition.correctCount * production.totalCount
    - production.correctCount * recognition.totalCount;
  if (difference > 0) return "recognition_score_higher";
  if (difference < 0) return "spontaneous_production_score_higher";
  return "no_observed_score_difference";
}

function validComparisonRelation(relations, fact, comparison, role, taskMode, transition) {
  const matches = relations.filter((relation) => (
    relation.toRef === fact.reference && relation.targetRole === role
  ));
  return matches.length === 1
    && matches[0].semanticDimension === comparison.targetDimension
    && matches[0].semanticTaskMode === taskMode
    && exactRelationMetadata(
      matches[0], comparison.createdOrder, transition.createdOrder, "sut"
    );
}

function validTransition(transition, transitionKind, interactionRef) {
  return hasExactKeys(transition, [
    "reference", "family", "origin", "transitionKind", "interactionRef",
    "inputReferences", "resultReferences", "createdOrder", "result"
  ]) && transition.family === "sut_transition_evidence" && transition.origin === "sut"
    && transition.transitionKind === transitionKind
    && transition.interactionRef === interactionRef
    && Array.isArray(transition.inputReferences) && Array.isArray(transition.resultReferences)
    && new Set(transition.inputReferences).size === transition.inputReferences.length
    && new Set(transition.resultReferences).size === transition.resultReferences.length;
}

function uniqueCreatingTransition(closure, record, label) {
  const claimants = [...closure.records.values()].filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
      || candidate.resultReferences?.includes(record?.reference)
  ));
  if (claimants.length !== 1) {
    throw checkpointError(`${label} creating transition is not unique`);
  }
  return claimants[0];
}

function exactRecord(records, reference, label) {
  const record = records.get(reference);
  if (!record) throw checkpointError(`${label} is missing`);
  return record;
}

function hasRoleReference(relations, reference, role) {
  return relations.filter((relation) => (
    relation.toRef === reference && relation.targetRole === role
  )).length === 1;
}

function exactRelationMetadata(relation, effectiveOrder, createdOrder, assertedByRole) {
  return relation?.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === assertedByRole;
}

function sameRoleReferencePairs(relations, expectedPairs) {
  const actual = relations.map((relation) => `${relation.targetRole}:${relation.toRef}`).sort();
  const expected = expectedPairs.map(([reference, role]) => `${role}:${reference}`).sort();
  return isDeepStrictEqual(actual, expected);
}

function sameReferenceSet(left, right) {
  return isDeepStrictEqual([...left].sort(), [...right].sort());
}

function uniqueReferences(references) {
  return [...new Set(references)];
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function checkpointError(message) {
  return new Error(`CP-PROD-ACTIVE ${message}.`);
}
