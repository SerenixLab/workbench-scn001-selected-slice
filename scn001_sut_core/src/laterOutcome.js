import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";
import {
  resolveUniqueCreatingTransition,
  validateRetainedInputFact
} from "./retainedStateClosure.js";

export const COMPARATIVE_OUTCOME = Object.freeze({
  observation: "user_spoke_longer",
  context: "spontaneous_production",
  comparison: Object.freeze({
    metric: "speaking_duration",
    relation: "longer_than",
    baselineSessionId: "spontaneous-correction-current",
    currentSessionId: "spontaneous-outcome-later"
  })
});

export const PACING_FEEDBACK = Object.freeze({
  observation: "This pacing feels easier.",
  context: "spontaneous_production"
});

export const CO_INTERVENTION_CONTEXT = Object.freeze({
  description: "no_zoey_available_co_intervention_event_supplied",
  coInterventionVisibility: "none_supplied_to_zoey",
  completeness: "non_exhaustive_for_private_or_unobserved_causes"
});

export const EXPLANATION_REQUEST = Object.freeze({
  content: "Why are you correcting differently now?",
  context: "spontaneous_production"
});

export const USER_FACING_EXPLANATION =
  "I’m delaying minor corrections until you finish during spontaneous practice because "
  + "you asked not to be interrupted here, and I’m testing that as a low-consequence, "
  + "reversible trial informed by the earlier drill. In a focused drill where you ask for "
  + "immediate correction, I won’t apply that delay. This session was followed by longer "
  + "speaking and you said the pacing felt easier, but that is an observation in this "
  + "context—not proof of cause, a fixed preference, or long-term learning.";

const TRANSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "transitionKind", "interactionRef",
  "inputReferences", "resultReferences", "createdOrder", "result"
]);

const OUTCOME_KEYS = Object.freeze([
  "reference", "family", "origin", "outcomeType", "activeTrialRef",
  "applicabilityAssessmentRef", "dispositionRef", "realizationFactRef",
  "realizationTransitionRef", "materialContextRefs", "outcomeFactRefs",
  "uncertaintyRef", "classification", "comparativeObservation",
  "reportedFeedback", "coInterventionStatus", "causalScope",
  "longTermEfficacy", "globalPreference", "fixedLearningStyle",
  "fatigueStatus", "currentStatus", "statusOrigin", "interactionRef",
  "createdOrder", "effectiveOrder", "createdByTransitionRef"
]);

const UNCERTAINTY_KEYS = Object.freeze([
  "reference", "family", "origin", "uncertaintyType", "causalStatus",
  "alternativeCauses", "coInterventionVisibility", "unsupportedClaims",
  "statusOrigin", "interactionRef", "createdOrder", "effectiveOrder",
  "createdByTransitionRef"
]);

const EXPLANATION_KEYS = Object.freeze([
  "reference", "family", "origin", "explanationType", "requestCommunicationRef",
  "requestAssertionRef", "supportRef", "userFacingText", "scopeStatement",
  "epistemicStatement", "causalStatement", "generalizationStatement",
  "hiddenChainOfThought", "statusOrigin", "interactionRef", "createdOrder",
  "effectiveOrder", "createdByTransitionRef"
]);

const LIMIT_KEYS = Object.freeze([
  "reference", "family", "origin", "limitType", "statement", "statusOrigin",
  "interactionRef", "createdOrder", "effectiveOrder", "createdByTransitionRef"
]);

const SUPPORT_KEYS = Object.freeze([
  "reference", "family", "origin", "supportType", "requestCommunicationRef",
  "requestAssertionRef", "explanationRef", "temporalAssessmentRefs",
  "comparisonRef", "activeProductionTrialRef", "focusedInstructionRef",
  "focusedOutcomeRef", "directCorrectionStateRef", "directDispositionRef",
  "delayedCandidateRef", "delayedActivationAssessmentRef",
  "activeDelayedTrialRef", "laterApplicabilityRef", "laterDispositionRef",
  "realizationFactRef", "realizationTransitionRef", "outcomeRef",
  "uncertaintyRef", "limitationRefs", "supportCompleteness",
  "hiddenChainOfThought", "statusOrigin", "interactionRef", "createdOrder",
  "effectiveOrder", "createdByTransitionRef"
]);

const TEMPORAL_ASSESSMENT_KEYS = Object.freeze([
  "reference", "family", "origin", "assessedObservationRef", "chronologyRef",
  "useTarget", "dimension", "observationScenarioDay", "currentScenarioDay",
  "ageDays", "eligibility", "temporalUncertainty", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const ATTRIBUTION_KEYS = Object.freeze([
  "reference", "family", "origin", "sourceCommunicationRef", "sourceActorRef",
  "context", "occurrenceOrder", "epistemicStatus", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const LIMITS = Object.freeze([
  Object.freeze(["scope", "applies_only_to_tested_spontaneous_production; focused_drill_opt_in_is_excluded"]),
  Object.freeze(["epistemic_uncertainty", "observed_response_does_not_establish_a_stable_user_preference"]),
  Object.freeze(["causal", "intervention_conditioned_association_is_not_causal_proof"]),
  Object.freeze(["unsupported_generalization", "no_long_term_learning_fixed_style_global_preference_or_fatigue_conclusion"])
]);

export function deriveLaterOutcomeParticipants({
  records, relations, sourceFactBindings, interaction, interactionFacts,
  validateLaterDisposition, resolveLaterRealization
}) {
  const outcomeFacts = interactionFacts.filter((fact) => fact?.role === "outcome_fact");
  const contextFacts = interactionFacts.filter(
    (fact) => fact?.role === "material_context_change"
  );
  const hasLaterSignal = outcomeFacts.some((fact) => (
    isDeepStrictEqual(outcomeMeaning(fact), COMPARATIVE_OUTCOME)
    || isDeepStrictEqual(outcomeMeaning(fact), PACING_FEEDBACK)
  )) || contextFacts.some((fact) => (
    isDeepStrictEqual(contextMeaning(fact), CO_INTERVENTION_CONTEXT)
  ));
  if (!hasLaterSignal) return undefined;
  if (outcomeFacts.length !== 2 || contextFacts.length !== 1
    || interactionFacts.length !== 3) {
    throw new SutStateIntegrityError("Later outcome requires its exact three-fact bundle.");
  }
  const comparative = outcomeFacts.find((fact) => (
    isDeepStrictEqual(outcomeMeaning(fact), COMPARATIVE_OUTCOME)
  ));
  const feedback = outcomeFacts.find((fact) => (
    isDeepStrictEqual(outcomeMeaning(fact), PACING_FEEDBACK)
  ));
  const coIntervention = contextFacts[0];
  if (!comparative || !feedback || comparative.reference === feedback.reference
    || !isDeepStrictEqual(contextMeaning(coIntervention), CO_INTERVENTION_CONTEXT)) {
    throw new SutStateIntegrityError("Later outcome facts are not the canonical raw observations.");
  }
  validateInput(
    records, relations, sourceFactBindings, comparative, interaction,
    "outcome_fact", "fixture-scorer"
  );
  validateInput(
    records, relations, sourceFactBindings, feedback, interaction,
    "outcome_fact", "synthetic-user-a"
  );
  validateInput(
    records, relations, sourceFactBindings, coIntervention, interaction,
    "material_context_change", "fixture-driver"
  );
  const dispositions = [...records.values()].filter(
    (record) => record.family === "later_behavior_disposition"
  );
  if (dispositions.length !== 1) {
    throw new SutStateIntegrityError("Later outcome requires one exact later disposition.");
  }
  const disposition = validateLaterDisposition(dispositions[0]);
  const realization = resolveLaterRealization(disposition.reference);
  if (!realization) {
    throw new SutStateIntegrityError("Later outcome requires matched realized behavior.");
  }
  const assessment = records.get(disposition.applicabilityAssessmentRef);
  const activeTrial = records.get(disposition.activeTrialRef);
  const context = records.get(disposition.contextRef);
  const existing = [...records.values()].filter(
    (record) => record.family === "later_outcome"
  );
  const existingUncertainties = [...records.values()].filter(
    (record) => record.family === "outcome_uncertainty"
  );
  if (existing.length > 1 || existingUncertainties.length > 1
    || existing.length !== existingUncertainties.length) {
    throw new SutStateIntegrityError("Later outcome state is ambiguous.");
  }
  const participants = {
    activeTrial, assessment, disposition, realization, context,
    comparative, feedback, coIntervention, interaction
  };
  if (existing.length === 1) {
    return {
      kind: "reuse",
      outcome: validateLaterOutcomeClosure({
        records, relations, sourceFactBindings, outcome: existing[0],
        validateLaterDisposition, resolveLaterRealization
      }),
      ...participants
    };
  }
  return { kind: "create", ...participants };
}

export function laterOutcomeInputReferences(participants) {
  return [
    participants.activeTrial.reference,
    participants.assessment.reference,
    participants.disposition.reference,
    participants.realization.fact.reference,
    participants.realization.transition.reference,
    participants.context.reference,
    participants.comparative.reference,
    participants.feedback.reference,
    participants.coIntervention.reference
  ];
}

export function laterOutcomeRelationPairs(participants, uncertainty) {
  return [
    [participants.activeTrial.reference, "active_delayed_correction_trial"],
    [participants.assessment.reference, "later_use_applicability"],
    [participants.disposition.reference, "later_behavior_disposition"],
    [participants.realization.fact.reference, "matched_later_behavior_realization"],
    [participants.realization.transition.reference, "realization_transition_evidence"],
    [participants.context.reference, "material_spontaneous_context"],
    [participants.comparative.reference, "comparative_speaking_observation"],
    [participants.feedback.reference, "current_pacing_feedback"],
    [participants.coIntervention.reference, "non_exhaustive_co_intervention_status"],
    [uncertainty.reference, "causal_uncertainty"]
  ];
}

export function validateLaterOutcomeClosure({
  records, relations, sourceFactBindings, outcome,
  validateLaterDisposition, resolveLaterRealization
}) {
  const transition = resolveUniqueCreatingTransition(records, outcome, "Later outcome");
  const disposition = validateLaterDisposition(records.get(outcome?.dispositionRef));
  const realization = resolveLaterRealization(
    disposition.reference, outcome?.realizationFactRef
  );
  const activeTrial = records.get(disposition.activeTrialRef);
  const assessment = records.get(disposition.applicabilityAssessmentRef);
  const context = records.get(disposition.contextRef);
  const comparative = records.get(outcome?.outcomeFactRefs?.[0]);
  const feedback = records.get(outcome?.outcomeFactRefs?.[1]);
  const coIntervention = records.get(outcome?.materialContextRefs?.coIntervention);
  const interaction = records.get(outcome?.interactionRef);
  const uncertainty = records.get(outcome?.uncertaintyRef);
  const participants = {
    activeTrial, assessment, disposition, realization, context,
    comparative, feedback, coIntervention, interaction
  };
  const expectedInputs = laterOutcomeInputReferences(participants);
  const expectedRelations = laterOutcomeRelationPairs(participants, uncertainty);
  const outward = relations.filter((relation) => relation.fromRef === outcome?.reference);
  const uncertaintyBases = relations.filter(
    (relation) => relation.fromRef === uncertainty?.reference
  );
  const competing = [...records.values()].filter(
    (record) => record.family === "later_outcome"
  );
  const competingUncertainties = [...records.values()].filter(
    (record) => record.family === "outcome_uncertainty"
  );
  if (!hasExactKeys(outcome, OUTCOME_KEYS)
    || outcome.family !== "later_outcome" || outcome.origin !== "sut"
    || outcome.outcomeType !== "intervention_conditioned_later_behavior"
    || outcome.activeTrialRef !== activeTrial.reference
    || outcome.applicabilityAssessmentRef !== assessment.reference
    || outcome.dispositionRef !== disposition.reference
    || outcome.realizationFactRef !== realization?.fact.reference
    || outcome.realizationTransitionRef !== realization?.transition.reference
    || !isDeepStrictEqual(outcome.materialContextRefs, {
      currentContext: context.reference, coIntervention: coIntervention.reference
    })
    || !isDeepStrictEqual(outcome.outcomeFactRefs, [
      comparative.reference, feedback.reference
    ])
    || !isDeepStrictEqual(outcome.comparativeObservation, COMPARATIVE_OUTCOME)
    || outcome.reportedFeedback !== PACING_FEEDBACK.observation
    || !isDeepStrictEqual(outcome.coInterventionStatus, {
      zoeyAvailable: "none_supplied",
      completeness: "non_exhaustive_for_private_or_unobserved_causes"
    })
    || outcome.classification !== "intervention_conditioned_observed_association"
    || outcome.causalScope !== "association_only_not_causal_proof"
    || outcome.longTermEfficacy !== "not_established"
    || outcome.globalPreference !== "not_established"
    || outcome.fixedLearningStyle !== "not_established"
    || outcome.fatigueStatus !== "not_established"
    || outcome.currentStatus !== "observed_bounded"
    || outcome.statusOrigin !== "sut_transition"
    || outcome.effectiveOrder !== outcome.createdOrder
    || competing.length !== 1 || competing[0].reference !== outcome.reference
    || competingUncertainties.length !== 1
    || competingUncertainties[0].reference !== uncertainty.reference
    || !validUncertainty(uncertainty, outcome, transition, coIntervention)
    || !hasExactRelations(uncertaintyBases, [
      [comparative.reference, "comparative_observation"],
      [feedback.reference, "reported_feedback"],
      [coIntervention.reference, "non_exhaustive_co_intervention_context"]
    ], "basis", uncertainty.createdOrder, transition.createdOrder)
    || transition.reference !== outcome.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "record_intervention_conditioned_later_outcome"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "intervention_conditioned_later_outcome_recorded"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
    || !isDeepStrictEqual(
      transition.resultReferences, [uncertainty.reference, outcome.reference]
    )
    || !hasExactRelations(
      outward, expectedRelations, "outcome", outcome.createdOrder, transition.createdOrder
    )
    || records.get(realization.transition.reference)?.createdOrder >= comparative.createdOrder
    || comparative.createdOrder >= feedback.createdOrder
    || feedback.createdOrder >= coIntervention.createdOrder
    || coIntervention.createdOrder >= interaction.createdOrder
    || records.get(interaction.createdByTransitionRef)?.createdOrder
      >= uncertainty.createdOrder
    || uncertainty.createdOrder >= outcome.createdOrder
    || outcome.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Later outcome closure is malformed.");
  }
  if (resolveUniqueCreatingTransition(
    records, uncertainty, "Outcome uncertainty"
  ).reference !== transition.reference) {
    throw new SutStateIntegrityError("Later outcome results do not share one exact creator.");
  }
  for (const [fact, role, actor] of [
    [comparative, "outcome_fact", "fixture-scorer"],
    [feedback, "outcome_fact", "synthetic-user-a"],
    [coIntervention, "material_context_change", "fixture-driver"]
  ]) {
    validateInput(
      records, relations, sourceFactBindings, fact, interaction, role, actor
    );
  }
  return { outcome, uncertainty, participants, transition };
}

export function deriveExplanationParticipants({
  records, relations, sourceFactBindings, interaction, interactionFacts,
  validateOutcome, validateActiveProductionTrial
}) {
  const communications = interactionFacts.filter((fact) => fact?.role === "communication");
  if (communications.length === 0) return undefined;
  const requests = communications.filter((fact) => (
    isDeepStrictEqual({
      content: fact.payload?.content, context: fact.payload?.context
    }, EXPLANATION_REQUEST)
  ));
  if (requests.length === 0) return undefined;
  if (requests.length !== 1 || interactionFacts.length !== 1) {
    throw new SutStateIntegrityError("Explanation requires one exact current request.");
  }
  const communication = requests[0];
  validateInput(
    records, relations, sourceFactBindings, communication, interaction,
    "communication", "synthetic-user-a"
  );
  const assertions = [...records.values()].filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication.reference
    && record.interactionRef === interaction.reference
  ));
  if (assertions.length !== 1) {
    throw new SutStateIntegrityError("Explanation request attribution is ambiguous.");
  }
  const assertion = assertions[0];
  validateExplanationAttribution(records, relations, assertion, communication, interaction);
  const outcomes = [...records.values()].filter(
    (record) => record.family === "later_outcome"
  );
  if (outcomes.length === 0) return undefined;
  if (outcomes.length !== 1) {
    throw new SutStateIntegrityError("Explanation requires one exact retained outcome.");
  }
  const outcomeClosure = validateOutcome(outcomes[0]);
  const outcome = outcomeClosure.outcome;
  const uncertainty = outcomeClosure.uncertainty;
  const activeDelayedTrial = records.get(outcome.activeTrialRef);
  const delayedCandidate = records.get(activeDelayedTrial.candidateRef);
  const delayedActivationAssessment = records.get(activeDelayedTrial.activationAssessmentRef);
  const activeProductionTrial = validateActiveProductionTrial(
    records.get(delayedCandidate.activeProductionTrialRef)
  );
  const productionCandidate = records.get(activeProductionTrial.candidateRef);
  const comparison = records.get(productionCandidate.supportComparisonRef);
  const temporalAssessments = [...records.values()].filter((record) => (
    record.family === "temporal_eligibility_assessment"
    && record.eligibility === "ineligible"
    && record.useTarget === "independent_current_skill_authority"
    && record.dimension === productionCandidate?.proposedScope?.dimension
  )).sort(byCreatedOrder);
  if (temporalAssessments.length === 0) {
    throw new SutStateIntegrityError("Explanation temporal history basis is incomplete.");
  }
  if (comparison?.family !== "dimension_comparison") {
    throw new SutStateIntegrityError("Explanation calibration comparison basis is incomplete.");
  }
  for (const assessment of temporalAssessments) {
    validateTemporalAssessmentClosure({
      records, relations, sourceFactBindings, assessment
    });
  }
  const participants = {
    communication, assertion, outcomeClosure, activeDelayedTrial,
    delayedCandidate, delayedActivationAssessment, activeProductionTrial,
    focusedInstruction: records.get(delayedCandidate.focusedInstructionRef),
    focusedOutcome: records.get(delayedCandidate.focusedOutcomeRef),
    directCorrectionState: records.get(delayedCandidate.directCorrectionStateRef),
    directDisposition: records.get(delayedCandidate.directDispositionRef),
    laterApplicability: records.get(outcome.applicabilityAssessmentRef),
    laterDisposition: records.get(outcome.dispositionRef),
    realizationFact: records.get(outcome.realizationFactRef),
    realizationTransition: records.get(outcome.realizationTransitionRef),
    outcome, uncertainty, temporalAssessments, comparison, interaction
  };
  const existing = [...records.values()].filter(
    (record) => record.family === "explanation_support"
  );
  const existingExplanations = [...records.values()].filter(
    (record) => record.family === "user_facing_explanation"
  );
  const existingLimits = [...records.values()].filter(
    (record) => record.family === "explanation_limit"
  );
  if (existing.length > 1 || existingExplanations.length > 1
    || existingLimits.length > LIMITS.length
    || (existing.length === 0 && (
      existingExplanations.length !== 0 || existingLimits.length !== 0
    ))) {
    throw new SutStateIntegrityError("Explanation support is ambiguous.");
  }
  if (existing.length === 1) {
    return {
      kind: "reuse",
      support: validateExplanationClosure({
        records, relations, sourceFactBindings, support: existing[0],
        validateOutcome, validateActiveProductionTrial
      }),
      ...participants
    };
  }
  return { kind: "create", ...participants };
}

export function createExplanationArtifacts(participants, allocateOrder, createReference) {
  const limitationRefs = Object.fromEntries(
    LIMITS.map(([type]) => [type, createReference("state")])
  );
  const explanationRef = createReference("state");
  const supportRef = createReference("state");
  const limitations = LIMITS.map(([limitType, statement]) => ({
    reference: limitationRefs[limitType], family: "explanation_limit", origin: "sut",
    limitType, statement, statusOrigin: "sut_transition",
    interactionRef: participants.interaction.reference,
    createdOrder: allocateOrder()
  }));
  for (const limit of limitations) limit.effectiveOrder = limit.createdOrder;
  const explanation = {
    reference: explanationRef, family: "user_facing_explanation", origin: "sut",
    explanationType: "bounded_retained_state_explanation",
    requestCommunicationRef: participants.communication.reference,
    requestAssertionRef: participants.assertion.reference,
    supportRef, userFacingText: USER_FACING_EXPLANATION,
    scopeStatement: limitations[0].statement,
    epistemicStatement: limitations[1].statement,
    causalStatement: limitations[2].statement,
    generalizationStatement: limitations[3].statement,
    hiddenChainOfThought: "not_required_not_retained",
    statusOrigin: "sut_transition", interactionRef: participants.interaction.reference,
    createdOrder: allocateOrder()
  };
  explanation.effectiveOrder = explanation.createdOrder;
  const support = {
    reference: supportRef, family: "explanation_support", origin: "sut",
    supportType: "retained_behavior_change_lineage",
    requestCommunicationRef: participants.communication.reference,
    requestAssertionRef: participants.assertion.reference,
    explanationRef,
    temporalAssessmentRefs: participants.temporalAssessments.map((item) => item.reference),
    comparisonRef: participants.comparison.reference,
    activeProductionTrialRef: participants.activeProductionTrial.reference,
    focusedInstructionRef: participants.focusedInstruction.reference,
    focusedOutcomeRef: participants.focusedOutcome.reference,
    directCorrectionStateRef: participants.directCorrectionState.reference,
    directDispositionRef: participants.directDisposition.reference,
    delayedCandidateRef: participants.delayedCandidate.reference,
    delayedActivationAssessmentRef: participants.delayedActivationAssessment.reference,
    activeDelayedTrialRef: participants.activeDelayedTrial.reference,
    laterApplicabilityRef: participants.laterApplicability.reference,
    laterDispositionRef: participants.laterDisposition.reference,
    realizationFactRef: participants.realizationFact.reference,
    realizationTransitionRef: participants.realizationTransition.reference,
    outcomeRef: participants.outcome.reference,
    uncertaintyRef: participants.uncertainty.reference,
    limitationRefs,
    supportCompleteness: "complete_selected_behavior_change_lineage",
    hiddenChainOfThought: "not_required_not_retained",
    statusOrigin: "sut_transition", interactionRef: participants.interaction.reference,
    createdOrder: allocateOrder()
  };
  support.effectiveOrder = support.createdOrder;
  return { limitations, explanation, support };
}

export function explanationInputReferences(participants) {
  return [
    participants.communication.reference,
    participants.assertion.reference,
    ...participants.temporalAssessments.map((item) => item.reference),
    participants.comparison.reference,
    participants.activeProductionTrial.reference,
    participants.focusedInstruction.reference,
    participants.focusedOutcome.reference,
    participants.directCorrectionState.reference,
    participants.directDisposition.reference,
    participants.delayedCandidate.reference,
    participants.delayedActivationAssessment.reference,
    participants.activeDelayedTrial.reference,
    participants.laterApplicability.reference,
    participants.laterDisposition.reference,
    participants.realizationFact.reference,
    participants.realizationTransition.reference,
    participants.outcome.reference,
    participants.uncertainty.reference
  ];
}

export function explanationRelationPairs(participants, artifacts) {
  return [
    [artifacts.explanation.reference, "user_facing_claim"],
    [participants.communication.reference, "current_explanation_request"],
    [participants.assertion.reference, "attributed_explanation_request"],
    ...participants.temporalAssessments.map((item) => [
      item.reference, "stale_history_assessment"
    ]),
    [participants.comparison.reference, "current_calibration_comparison"],
    [participants.activeProductionTrial.reference, "active_production_trial"],
    [participants.focusedInstruction.reference, "focused_drill_instruction"],
    [participants.focusedOutcome.reference, "focused_drill_outcome"],
    [participants.directCorrectionState.reference, "scoped_direct_correction"],
    [participants.directDisposition.reference, "direct_correction_disposition"],
    [participants.delayedCandidate.reference, "delayed_correction_candidate"],
    [participants.delayedActivationAssessment.reference, "delayed_activation_basis"],
    [participants.activeDelayedTrial.reference, "active_delayed_correction_trial"],
    [participants.laterApplicability.reference, "later_use_applicability"],
    [participants.laterDisposition.reference, "later_behavior_disposition"],
    [participants.realizationFact.reference, "matched_later_realization"],
    [participants.realizationTransition.reference, "realization_transition"],
    [participants.outcome.reference, "intervention_conditioned_outcome"],
    [participants.uncertainty.reference, "outcome_uncertainty"],
    ...artifacts.limitations.map((limit) => [
      limit.reference, `${limit.limitType}_limit`
    ])
  ];
}

export function validateExplanationClosure({
  records, relations, sourceFactBindings, support,
  validateOutcome, validateActiveProductionTrial
}) {
  const transition = resolveUniqueCreatingTransition(records, support, "Explanation support");
  const interaction = records.get(support?.interactionRef);
  const communication = records.get(support?.requestCommunicationRef);
  const assertion = records.get(support?.requestAssertionRef);
  const outcomeClosure = validateOutcome(records.get(support?.outcomeRef));
  const activeDelayedTrial = records.get(support?.activeDelayedTrialRef);
  const delayedCandidate = records.get(support?.delayedCandidateRef);
  const activeProductionTrial = validateActiveProductionTrial(
    records.get(support?.activeProductionTrialRef)
  );
  const participants = {
    communication, assertion, outcomeClosure,
    temporalAssessments: (support?.temporalAssessmentRefs ?? []).map(
      (reference) => records.get(reference)
    ),
    comparison: records.get(support?.comparisonRef),
    activeProductionTrial,
    focusedInstruction: records.get(support?.focusedInstructionRef),
    focusedOutcome: records.get(support?.focusedOutcomeRef),
    directCorrectionState: records.get(support?.directCorrectionStateRef),
    directDisposition: records.get(support?.directDispositionRef),
    delayedCandidate,
    delayedActivationAssessment: records.get(support?.delayedActivationAssessmentRef),
    activeDelayedTrial,
    laterApplicability: records.get(support?.laterApplicabilityRef),
    laterDisposition: records.get(support?.laterDispositionRef),
    realizationFact: records.get(support?.realizationFactRef),
    realizationTransition: records.get(support?.realizationTransitionRef),
    outcome: outcomeClosure.outcome,
    uncertainty: outcomeClosure.uncertainty,
    interaction
  };
  const explanation = records.get(support?.explanationRef);
  const limitations = LIMITS.map(([type]) => records.get(support?.limitationRefs?.[type]));
  const productionCandidate = records.get(activeProductionTrial?.candidateRef);
  const expectedTemporalAssessments = [...records.values()].filter((record) => (
    record.family === "temporal_eligibility_assessment"
    && record.eligibility === "ineligible"
    && record.useTarget === "independent_current_skill_authority"
    && record.dimension === productionCandidate?.proposedScope?.dimension
  )).sort(byCreatedOrder);
  const artifacts = { explanation, limitations, support };
  const allSupports = [...records.values()].filter(
    (record) => record.family === "explanation_support"
  );
  const allExplanations = [...records.values()].filter(
    (record) => record.family === "user_facing_explanation"
  );
  const allLimits = [...records.values()].filter(
    (record) => record.family === "explanation_limit"
  );
  const expectedInputs = explanationInputReferences(participants);
  const expectedRelations = explanationRelationPairs(participants, artifacts);
  const outward = relations.filter((relation) => relation.fromRef === support?.reference);
  const resultReferences = [
    ...limitations.map((limit) => limit?.reference), explanation?.reference, support?.reference
  ];
  if (!hasExactKeys(support, SUPPORT_KEYS)
    || support.family !== "explanation_support" || support.origin !== "sut"
    || allSupports.length !== 1 || allSupports[0].reference !== support.reference
    || allExplanations.length !== 1
    || allExplanations[0].reference !== explanation?.reference
    || allLimits.length !== LIMITS.length
    || support.supportType !== "retained_behavior_change_lineage"
    || support.supportCompleteness !== "complete_selected_behavior_change_lineage"
    || support.hiddenChainOfThought !== "not_required_not_retained"
    || support.effectiveOrder !== support.createdOrder
    || !isDeepStrictEqual(support.temporalAssessmentRefs, participants.temporalAssessments.map(
      (item) => item.reference
    ))
    || !isDeepStrictEqual(
      support.temporalAssessmentRefs,
      expectedTemporalAssessments.map((item) => item.reference)
    )
    || participants.temporalAssessments.length === 0
    || participants.temporalAssessments.some((item) => (
      item?.family !== "temporal_eligibility_assessment"
      || item.eligibility !== "ineligible"
      || item.useTarget !== "independent_current_skill_authority"
      || item.dimension !== productionCandidate?.proposedScope?.dimension
    ))
    || participants.comparison?.family !== "dimension_comparison"
    || support.comparisonRef !== productionCandidate?.supportComparisonRef
    || delayedCandidate?.activeProductionTrialRef !== activeProductionTrial.reference
    || support.focusedInstructionRef !== delayedCandidate.focusedInstructionRef
    || support.focusedOutcomeRef !== delayedCandidate.focusedOutcomeRef
    || support.directCorrectionStateRef !== delayedCandidate.directCorrectionStateRef
    || support.directDispositionRef !== delayedCandidate.directDispositionRef
    || support.delayedActivationAssessmentRef !== activeDelayedTrial?.activationAssessmentRef
    || activeDelayedTrial?.candidateRef !== delayedCandidate.reference
    || support.laterApplicabilityRef !== outcomeClosure.outcome.applicabilityAssessmentRef
    || support.laterDispositionRef !== outcomeClosure.outcome.dispositionRef
    || support.realizationFactRef !== outcomeClosure.outcome.realizationFactRef
    || support.realizationTransitionRef !== outcomeClosure.outcome.realizationTransitionRef
    || support.outcomeRef !== outcomeClosure.outcome.reference
    || support.uncertaintyRef !== outcomeClosure.uncertainty.reference
    || !hasExactKeys(support.limitationRefs, LIMITS.map(([type]) => type))
    || !validExplanation(explanation, support, communication, assertion)
    || limitations.some((limit, index) => !validLimit(
      limit, LIMITS[index], support.interactionRef, transition
    ))
    || transition.reference !== support.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_grounded_later_behavior_explanation"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "grounded_later_behavior_explanation_derived"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
    || !isDeepStrictEqual(transition.resultReferences, resultReferences)
    || !hasExactRelations(
      outward, expectedRelations, "explanation_support",
      support.createdOrder, transition.createdOrder
    )
    || records.get(outcomeClosure.transition.reference)?.createdOrder
      >= communication.createdOrder
    || communication.createdOrder >= interaction.createdOrder
    || records.get(interaction.createdByTransitionRef)?.createdOrder
      >= limitations[0].createdOrder
    || limitations.some((limit, index) => (
      index > 0 && limitations[index - 1].createdOrder >= limit.createdOrder
    ))
    || limitations.at(-1).createdOrder >= explanation.createdOrder
    || explanation.createdOrder >= support.createdOrder
    || support.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Explanation support closure is malformed.");
  }
  for (const record of [...limitations, explanation]) {
    if (resolveUniqueCreatingTransition(records, record, "Explanation result").reference
      !== transition.reference) {
      throw new SutStateIntegrityError("Explanation results do not share one exact creator.");
    }
  }
  for (const assessment of participants.temporalAssessments) {
    validateTemporalAssessmentClosure({
      records, relations, sourceFactBindings, assessment
    });
  }
  validateInput(
    records, relations, sourceFactBindings, communication, interaction,
    "communication", "synthetic-user-a"
  );
  validateExplanationAttribution(records, relations, assertion, communication, interaction);
  return { support, explanation, limitations, participants, transition };
}

function validUncertainty(uncertainty, outcome, transition, coIntervention) {
  return hasExactKeys(uncertainty, UNCERTAINTY_KEYS)
    && uncertainty.family === "outcome_uncertainty" && uncertainty.origin === "sut"
    && uncertainty.uncertaintyType === "causal_and_co_intervention_limit"
    && uncertainty.causalStatus === "association_only"
    && uncertainty.alternativeCauses === "private_or_unobserved_not_excluded"
    && uncertainty.coInterventionVisibility === "non_exhaustive"
    && isDeepStrictEqual(uncertainty.unsupportedClaims, [
      "causal_theory", "long_term_learning_efficacy", "fatigue_status",
      "global_voice_preference", "fixed_learning_style"
    ])
    && uncertainty.statusOrigin === "sut_transition"
    && uncertainty.interactionRef === outcome.interactionRef
    && uncertainty.effectiveOrder === uncertainty.createdOrder
    && uncertainty.createdByTransitionRef === transition.reference
    && coIntervention.payload.completeness
      === "non_exhaustive_for_private_or_unobserved_causes";
}

function validExplanation(explanation, support, communication, assertion) {
  return hasExactKeys(explanation, EXPLANATION_KEYS)
    && explanation.family === "user_facing_explanation" && explanation.origin === "sut"
    && explanation.explanationType === "bounded_retained_state_explanation"
    && explanation.requestCommunicationRef === communication.reference
    && explanation.requestAssertionRef === assertion.reference
    && explanation.supportRef === support.reference
    && explanation.userFacingText === USER_FACING_EXPLANATION
    && explanation.scopeStatement === LIMITS[0][1]
    && explanation.epistemicStatement === LIMITS[1][1]
    && explanation.causalStatement === LIMITS[2][1]
    && explanation.generalizationStatement === LIMITS[3][1]
    && explanation.hiddenChainOfThought === "not_required_not_retained"
    && explanation.statusOrigin === "sut_transition"
    && explanation.interactionRef === support.interactionRef
    && explanation.effectiveOrder === explanation.createdOrder
    && explanation.createdByTransitionRef === support.createdByTransitionRef;
}

function validLimit(limit, expected, interactionRef, transition) {
  return hasExactKeys(limit, LIMIT_KEYS)
    && limit.family === "explanation_limit" && limit.origin === "sut"
    && limit.limitType === expected[0] && limit.statement === expected[1]
    && limit.statusOrigin === "sut_transition" && limit.interactionRef === interactionRef
    && limit.effectiveOrder === limit.createdOrder
    && limit.createdByTransitionRef === transition.reference;
}

function validateTemporalAssessmentClosure({
  records, relations, sourceFactBindings, assessment
}) {
  const transition = resolveUniqueCreatingTransition(
    records, assessment, "Temporal assessment"
  );
  const observation = records.get(assessment?.assessedObservationRef);
  const chronology = records.get(assessment?.chronologyRef);
  const interaction = records.get(assessment?.interactionRef);
  const resultAssessments = (transition?.resultReferences ?? []).map(
    (reference) => records.get(reference)
  );
  const expectedInputRefs = [
    ...new Set(resultAssessments.map((item) => item?.assessedObservationRef)),
    chronology?.reference
  ];
  const bases = relations.filter((relation) => (
    relation.fromRef === assessment?.reference
  ));
  const ageDays = chronology?.payload?.scenarioDay
    - observation?.payload?.occurrenceScenarioDay;
  if (!hasExactKeys(assessment, TEMPORAL_ASSESSMENT_KEYS)
    || assessment.family !== "temporal_eligibility_assessment"
    || assessment.origin !== "sut"
    || assessment.useTarget !== "independent_current_skill_authority"
    || assessment.dimension !== observation?.payload?.dimension
    || assessment.observationScenarioDay !== observation?.payload?.occurrenceScenarioDay
    || assessment.currentScenarioDay !== chronology?.payload?.scenarioDay
    || assessment.ageDays !== ageDays
    || assessment.eligibility !== (ageDays > 90 ? "ineligible" : "eligible")
    || assessment.temporalUncertainty !== "none"
    || assessment.statusOrigin !== "sut_transition"
    || transition.reference !== assessment.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "assess_temporal_eligibility"
    || transition.interactionRef !== interaction?.reference
    || transition.result !== "accepted"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputRefs)
    || resultAssessments.length === 0
    || new Set(transition.resultReferences).size !== transition.resultReferences.length
    || transition.resultReferences.filter(
      (reference) => reference === assessment.reference
    ).length !== 1
    || resultAssessments.some((item) => (
      item?.family !== "temporal_eligibility_assessment"
      || item.createdByTransitionRef !== transition.reference
      || item.chronologyRef !== chronology.reference
      || item.interactionRef !== interaction.reference
    ))
    || bases.length !== 2
    || !bases.some((relation) => (
      relation.relationKind === "basis"
      && relation.toRef === observation.reference
      && relation.targetRole === "assessed_evidence"
    ))
    || !bases.some((relation) => (
      relation.relationKind === "basis"
      && relation.toRef === chronology.reference
      && relation.targetRole === "current_chronology"
    ))
    || bases.some((relation) => (
      relation.semanticUseTarget !== assessment.useTarget
      || !exactMetadata(relation, assessment.createdOrder, transition.createdOrder)
    ))
    || observation?.createdOrder >= interaction?.createdOrder
    || chronology?.createdOrder >= interaction?.createdOrder
    || interaction?.createdOrder >= assessment.createdOrder
    || assessment.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Temporal explanation basis is malformed.");
  }
  validateInput(
    records, relations, sourceFactBindings, observation, interaction,
    "task_observation", "fixture-scorer"
  );
  validateInput(
    records, relations, sourceFactBindings, chronology, interaction,
    "chronology_fact", "fixture-driver"
  );
}

function validateExplanationAttribution(
  records, relations, assertion, communication, interaction
) {
  const transition = resolveUniqueCreatingTransition(
    records, assertion, "Explanation attribution"
  );
  const ingestion = resolveUniqueCreatingTransition(
    records, interaction, "Explanation attribution ingestion"
  );
  const sources = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "source"
  ));
  const bases = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "basis"
  ));
  const competing = [...records.values()].filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication?.reference
    && record.statusOrigin === "sut_transition"
  ));
  const actor = records.get(assertion?.sourceActorRef);
  if (!hasExactKeys(assertion, ATTRIBUTION_KEYS)
    || assertion.family !== "attributed_assertion" || assertion.origin !== "sut"
    || assertion.sourceCommunicationRef !== communication.reference
    || assertion.sourceActorRef !== communication.sourceActorRef
    || assertion.context !== communication.payload.context
    || assertion.occurrenceOrder !== communication.payload.occurrenceOrder
    || assertion.epistemicStatus !== "attributed_user_assertion"
    || assertion.statusOrigin !== "sut_transition"
    || assertion.interactionRef !== interaction.reference
    || competing.length !== 1 || competing[0].reference !== assertion.reference
    || transition.reference !== assertion.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "attribute_current_communications"
    || transition.interactionRef !== interaction.reference
    || !isDeepStrictEqual(transition.inputReferences, [communication.reference])
    || !isDeepStrictEqual(transition.resultReferences, [assertion.reference])
    || transition.result !== "accepted"
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || sources.length !== 1 || sources[0].toRef !== actor.reference
    || sources[0].targetRole !== "semantic_source"
    || bases.length !== 1 || bases[0].toRef !== communication.reference
    || bases[0].targetRole !== "attributed_communication"
    || sources.some((relation) => !exactMetadata(
      relation, assertion.createdOrder, transition.createdOrder
    ))
    || bases.some((relation) => !exactMetadata(
      relation, assertion.createdOrder, transition.createdOrder
    ))
    || communication.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= assertion.createdOrder
    || assertion.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Explanation request attribution is malformed.");
  }
}

function validateInput(
  records, relations, sourceFactBindings, fact, interaction, role, expectedSourceActor
) {
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact, interaction,
    origin: "fixture", role, expectedSourceActor
  });
}

function outcomeMeaning(fact) {
  const payload = fact?.payload ?? {};
  return {
    observation: payload.observation,
    context: payload.context,
    ...(payload.comparison ? { comparison: payload.comparison } : {})
  };
}

function contextMeaning(fact) {
  const payload = fact?.payload ?? {};
  return {
    description: payload.description,
    coInterventionVisibility: payload.coInterventionVisibility,
    completeness: payload.completeness
  };
}

function hasExactRelations(
  actual, pairs, relationKind, effectiveOrder, createdOrder
) {
  return actual.length === pairs.length && pairs.every(([toRef, targetRole]) => (
    actual.filter((relation) => relation.relationKind === relationKind
      && relation.toRef === toRef && relation.targetRole === targetRole
      && exactMetadata(relation, effectiveOrder, createdOrder)).length === 1
  ));
}

function exactMetadata(relation, effectiveOrder, createdOrder) {
  return relation.assertedByRole === "sut"
    && relation.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder;
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function byCreatedOrder(left, right) {
  return left.createdOrder - right.createdOrder;
}
