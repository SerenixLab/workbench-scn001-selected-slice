import { validateBoundFact } from "./directCorrectionCheckpoint.js";
import { findExactCanonicalIntervention } from "./laterUseCheckpoint.js";

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
const COMPARATIVE_OUTCOME = Object.freeze({
  observation: "user_spoke_longer",
  context: "spontaneous_production",
  comparison: Object.freeze({
    metric: "speaking_duration", relation: "longer_than",
    baselineSessionId: "spontaneous-correction-current",
    currentSessionId: "spontaneous-outcome-later"
  })
});
const LIMITS = Object.freeze([
  Object.freeze(["scope", "applies_only_to_tested_spontaneous_production; focused_drill_opt_in_is_excluded"]),
  Object.freeze(["epistemic_uncertainty", "observed_response_does_not_establish_a_stable_user_preference"]),
  Object.freeze(["causal", "intervention_conditioned_association_is_not_causal_proof"]),
  Object.freeze(["unsupported_generalization", "no_long_term_learning_fixed_style_global_preference_or_fatigue_conclusion"])
]);

export function findExactLaterOutcome(
  snapshot, sourceBindingEvidence, simulatorRoutingEvidence
) {
  const canonical = findExactCanonicalIntervention(
    snapshot, sourceBindingEvidence, simulatorRoutingEvidence
  );
  if (!canonical) return undefined;
  const records = indexRecords(snapshot);
  const outcomes = snapshot.records.filter((record) => record.family === "later_outcome");
  const uncertainties = snapshot.records.filter(
    (record) => record.family === "outcome_uncertainty"
  );
  if (outcomes.length === 0 && uncertainties.length === 0) return undefined;
  if (outcomes.length !== 1 || uncertainties.length !== 1) {
    throw checkpointError("Later outcome identity is ambiguous.");
  }
  const outcome = outcomes[0];
  const uncertainty = uncertainties[0];
  const transition = uniqueCreator(snapshot, outcome);
  if (uniqueCreator(snapshot, uncertainty).reference !== transition.reference) {
    throw checkpointError("Later outcome results do not share one exact creator.");
  }
  const comparative = records.get(outcome.outcomeFactRefs?.[0]);
  const feedback = records.get(outcome.outcomeFactRefs?.[1]);
  const context = records.get(outcome.materialContextRefs?.currentContext);
  const coIntervention = records.get(outcome.materialContextRefs?.coIntervention);
  const interaction = records.get(outcome.interactionRef);
  const expectedInputs = [
    canonical.active.trial.reference,
    canonical.assessment.reference,
    canonical.disposition.reference,
    canonical.fact.reference,
    canonical.realizationTransition.reference,
    context?.reference,
    comparative?.reference,
    feedback?.reference,
    coIntervention?.reference
  ];
  const expectedRelations = [
    [canonical.active.trial.reference, "active_delayed_correction_trial"],
    [canonical.assessment.reference, "later_use_applicability"],
    [canonical.disposition.reference, "later_behavior_disposition"],
    [canonical.fact.reference, "matched_later_behavior_realization"],
    [canonical.realizationTransition.reference, "realization_transition_evidence"],
    [context?.reference, "material_spontaneous_context"],
    [comparative?.reference, "comparative_speaking_observation"],
    [feedback?.reference, "current_pacing_feedback"],
    [coIntervention?.reference, "non_exhaustive_co_intervention_status"],
    [uncertainty.reference, "causal_uncertainty"]
  ];
  const outward = snapshot.relations.filter(
    (relation) => relation.fromRef === outcome.reference
  );
  const uncertaintyBases = snapshot.relations.filter(
    (relation) => relation.fromRef === uncertainty.reference
  );
  if (!hasExactKeys(outcome, OUTCOME_KEYS)
    || outcome.origin !== "sut"
    || outcome.outcomeType !== "intervention_conditioned_later_behavior"
    || outcome.activeTrialRef !== canonical.active.trial.reference
    || outcome.applicabilityAssessmentRef !== canonical.assessment.reference
    || outcome.dispositionRef !== canonical.disposition.reference
    || outcome.realizationFactRef !== canonical.fact.reference
    || outcome.realizationTransitionRef !== canonical.realizationTransition.reference
    || JSON.stringify(outcome.materialContextRefs) !== JSON.stringify({
      currentContext: canonical.assessment.contextRef,
      coIntervention: coIntervention?.reference
    })
    || JSON.stringify(outcome.outcomeFactRefs) !== JSON.stringify([
      comparative?.reference, feedback?.reference
    ])
    || JSON.stringify(outcome.comparativeObservation)
      !== JSON.stringify(COMPARATIVE_OUTCOME)
    || outcome.reportedFeedback !== "This pacing feels easier."
    || JSON.stringify(outcome.coInterventionStatus) !== JSON.stringify({
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
    || !validUncertainty(uncertainty, outcome, transition, coIntervention)
    || !hasExactRelations(
      uncertaintyBases, [
        [comparative?.reference, "comparative_observation"],
        [feedback?.reference, "reported_feedback"],
        [coIntervention?.reference, "non_exhaustive_co_intervention_context"]
      ], "basis", uncertainty, transition
    )
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.transitionKind !== "record_intervention_conditioned_later_outcome"
    || transition.origin !== "sut" || transition.interactionRef !== interaction?.reference
    || transition.result !== "intervention_conditioned_later_outcome_recorded"
    || JSON.stringify(transition.inputReferences) !== JSON.stringify(expectedInputs)
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([
      uncertainty.reference, outcome.reference
    ])
    || !hasExactRelations(outward, expectedRelations, "outcome", outcome, transition)
    || records.get(canonical.realizationTransition.reference)?.createdOrder
      >= comparative?.createdOrder
    || comparative?.createdOrder >= feedback?.createdOrder
    || feedback?.createdOrder >= coIntervention?.createdOrder
    || coIntervention?.createdOrder >= interaction?.createdOrder
    || uniqueCreator(snapshot, interaction).createdOrder >= uncertainty.createdOrder
    || uncertainty.createdOrder >= outcome.createdOrder
    || outcome.createdOrder >= transition.createdOrder) {
    throw checkpointError("Later outcome exact closure is malformed.");
  }
  validateOutcomeFact(
    snapshot, sourceBindingEvidence, comparative, "fixture-scorer", "outcome_fact"
  );
  validateOutcomeFact(
    snapshot, sourceBindingEvidence, feedback, "synthetic-user-a", "outcome_fact"
  );
  validateOutcomeFact(
    snapshot, sourceBindingEvidence, coIntervention,
    "fixture-driver", "material_context_change"
  );
  if (JSON.stringify({
    observation: comparative.payload.observation,
    context: comparative.payload.context,
    comparison: comparative.payload.comparison
  }) !== JSON.stringify(COMPARATIVE_OUTCOME)
    || feedback.payload.observation !== "This pacing feels easier."
    || feedback.payload.context !== "spontaneous_production"
    || coIntervention.payload.description
      !== "no_zoey_available_co_intervention_event_supplied"
    || coIntervention.payload.coInterventionVisibility !== "none_supplied_to_zoey"
    || coIntervention.payload.completeness
      !== "non_exhaustive_for_private_or_unobserved_causes") {
    throw checkpointError("Later outcome raw facts are malformed.");
  }
  return { canonical, outcome, uncertainty, transition, comparative, feedback, coIntervention };
}

export function findExactExplanation(
  snapshot, sourceBindingEvidence, simulatorRoutingEvidence
) {
  const later = findExactLaterOutcome(
    snapshot, sourceBindingEvidence, simulatorRoutingEvidence
  );
  if (!later) return undefined;
  const records = indexRecords(snapshot);
  const supports = snapshot.records.filter(
    (record) => record.family === "explanation_support"
  );
  const explanations = snapshot.records.filter(
    (record) => record.family === "user_facing_explanation"
  );
  const allLimits = snapshot.records.filter(
    (record) => record.family === "explanation_limit"
  );
  if (supports.length === 0 && explanations.length === 0 && allLimits.length === 0) {
    return undefined;
  }
  if (supports.length !== 1 || explanations.length !== 1 || allLimits.length !== 4) {
    throw checkpointError("Explanation identity is ambiguous.");
  }
  const support = supports[0];
  const explanation = explanations[0];
  const transition = uniqueCreator(snapshot, support);
  const limits = LIMITS.map(([type]) => records.get(support.limitationRefs?.[type]));
  for (const record of [...limits, explanation]) {
    if (uniqueCreator(snapshot, record).reference !== transition.reference) {
      throw checkpointError("Explanation results do not share one exact creator.");
    }
  }
  const communication = records.get(support.requestCommunicationRef);
  const assertion = records.get(support.requestAssertionRef);
  const interaction = records.get(support.interactionRef);
  const candidate = later.canonical.active.candidate;
  const activeProductionTrial = later.canonical.active.activeProductionTrial;
  const productionCandidate = records.get(activeProductionTrial.candidateRef);
  const temporalAssessments = snapshot.records.filter((record) => (
    record.family === "temporal_eligibility_assessment"
    && record.eligibility === "ineligible"
    && record.useTarget === "independent_current_skill_authority"
    && record.dimension === productionCandidate?.proposedScope?.dimension
  )).sort(byCreatedOrder);
  for (const assessment of temporalAssessments) {
    validateTemporalAssessment(
      snapshot, sourceBindingEvidence, assessment
    );
  }
  const expectedInputs = [
    communication?.reference, assertion?.reference,
    ...temporalAssessments.map((item) => item.reference),
    productionCandidate?.supportComparisonRef,
    activeProductionTrial.reference,
    candidate.focusedInstructionRef,
    candidate.focusedOutcomeRef,
    later.canonical.active.direct.state.reference,
    later.canonical.active.direct.disposition.reference,
    candidate.reference,
    later.canonical.active.assessment.reference,
    later.canonical.active.trial.reference,
    later.canonical.assessment.reference,
    later.canonical.disposition.reference,
    later.canonical.fact.reference,
    later.canonical.realizationTransition.reference,
    later.outcome.reference,
    later.uncertainty.reference
  ];
  const expectedRelations = [
    [explanation.reference, "user_facing_claim"],
    [communication?.reference, "current_explanation_request"],
    [assertion?.reference, "attributed_explanation_request"],
    ...temporalAssessments.map((item) => [item.reference, "stale_history_assessment"]),
    [productionCandidate?.supportComparisonRef, "current_calibration_comparison"],
    [activeProductionTrial.reference, "active_production_trial"],
    [candidate.focusedInstructionRef, "focused_drill_instruction"],
    [candidate.focusedOutcomeRef, "focused_drill_outcome"],
    [later.canonical.active.direct.state.reference, "scoped_direct_correction"],
    [later.canonical.active.direct.disposition.reference, "direct_correction_disposition"],
    [candidate.reference, "delayed_correction_candidate"],
    [later.canonical.active.assessment.reference, "delayed_activation_basis"],
    [later.canonical.active.trial.reference, "active_delayed_correction_trial"],
    [later.canonical.assessment.reference, "later_use_applicability"],
    [later.canonical.disposition.reference, "later_behavior_disposition"],
    [later.canonical.fact.reference, "matched_later_realization"],
    [later.canonical.realizationTransition.reference, "realization_transition"],
    [later.outcome.reference, "intervention_conditioned_outcome"],
    [later.uncertainty.reference, "outcome_uncertainty"],
    ...limits.map((limit) => [limit?.reference, `${limit?.limitType}_limit`])
  ];
  const outward = snapshot.relations.filter(
    (relation) => relation.fromRef === support.reference
  );
  if (!hasExactKeys(support, SUPPORT_KEYS)
    || support.origin !== "sut"
    || support.supportType !== "retained_behavior_change_lineage"
    || support.supportCompleteness !== "complete_selected_behavior_change_lineage"
    || support.hiddenChainOfThought !== "not_required_not_retained"
    || JSON.stringify(support.temporalAssessmentRefs)
      !== JSON.stringify(temporalAssessments.map((item) => item.reference))
    || temporalAssessments.length === 0
    || support.comparisonRef !== productionCandidate?.supportComparisonRef
    || support.activeProductionTrialRef !== activeProductionTrial.reference
    || support.focusedInstructionRef !== candidate.focusedInstructionRef
    || support.focusedOutcomeRef !== candidate.focusedOutcomeRef
    || support.directCorrectionStateRef !== later.canonical.active.direct.state.reference
    || support.directDispositionRef !== later.canonical.active.direct.disposition.reference
    || support.delayedCandidateRef !== candidate.reference
    || support.delayedActivationAssessmentRef !== later.canonical.active.assessment.reference
    || support.activeDelayedTrialRef !== later.canonical.active.trial.reference
    || support.laterApplicabilityRef !== later.canonical.assessment.reference
    || support.laterDispositionRef !== later.canonical.disposition.reference
    || support.realizationFactRef !== later.canonical.fact.reference
    || support.realizationTransitionRef !== later.canonical.realizationTransition.reference
    || support.outcomeRef !== later.outcome.reference
    || support.uncertaintyRef !== later.uncertainty.reference
    || support.explanationRef !== explanation.reference
    || support.effectiveOrder !== support.createdOrder
    || !validExplanation(explanation, support, communication, assertion)
    || limits.some((limit, index) => !validLimit(
      limit, LIMITS[index], support.interactionRef, transition
    ))
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.origin !== "sut"
    || transition.transitionKind !== "derive_grounded_later_behavior_explanation"
    || transition.interactionRef !== interaction?.reference
    || transition.result !== "grounded_later_behavior_explanation_derived"
    || JSON.stringify(transition.inputReferences) !== JSON.stringify(expectedInputs)
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([
      ...limits.map((limit) => limit.reference), explanation.reference, support.reference
    ])
    || !hasExactRelations(
      outward, expectedRelations, "explanation_support", support, transition
    )
    || later.transition.createdOrder >= communication?.createdOrder
    || communication?.createdOrder >= interaction?.createdOrder
    || uniqueCreator(snapshot, interaction).createdOrder >= limits[0]?.createdOrder
    || limits.some((limit, index) => (
      index > 0 && limits[index - 1].createdOrder >= limit.createdOrder
    ))
    || limits.at(-1)?.createdOrder >= explanation.createdOrder
    || explanation.createdOrder >= support.createdOrder
    || support.createdOrder >= transition.createdOrder) {
    throw checkpointError("Explanation exact closure is malformed.");
  }
  validateOutcomeFact(
    snapshot, sourceBindingEvidence, communication, "synthetic-user-a", "communication"
  );
  validateAttribution(snapshot, assertion, communication, interaction);
  return { later, support, explanation, limits, transition, communication, assertion };
}

function validUncertainty(uncertainty, outcome, transition, coIntervention) {
  return hasExactKeys(uncertainty, UNCERTAINTY_KEYS)
    && uncertainty.family === "outcome_uncertainty" && uncertainty.origin === "sut"
    && uncertainty.uncertaintyType === "causal_and_co_intervention_limit"
    && uncertainty.causalStatus === "association_only"
    && uncertainty.alternativeCauses === "private_or_unobserved_not_excluded"
    && uncertainty.coInterventionVisibility === "non_exhaustive"
    && JSON.stringify(uncertainty.unsupportedClaims) === JSON.stringify([
      "causal_theory", "long_term_learning_efficacy", "fatigue_status",
      "global_voice_preference", "fixed_learning_style"
    ])
    && uncertainty.statusOrigin === "sut_transition"
    && uncertainty.interactionRef === outcome.interactionRef
    && uncertainty.effectiveOrder === uncertainty.createdOrder
    && uncertainty.createdByTransitionRef === transition.reference
    && coIntervention?.payload?.completeness
      === "non_exhaustive_for_private_or_unobserved_causes";
}

function validExplanation(explanation, support, communication, assertion) {
  return hasExactKeys(explanation, EXPLANATION_KEYS)
    && explanation.family === "user_facing_explanation" && explanation.origin === "sut"
    && explanation.explanationType === "bounded_retained_state_explanation"
    && explanation.requestCommunicationRef === communication?.reference
    && explanation.requestAssertionRef === assertion?.reference
    && explanation.supportRef === support.reference
    && hasBoundedExplanationSemantics(explanation.userFacingText)
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
    && limit.limitType === expected[0]
    && limit.statement === expected[1] && limit.statusOrigin === "sut_transition"
    && limit.interactionRef === interactionRef
    && limit.effectiveOrder === limit.createdOrder
    && limit.createdByTransitionRef === transition.reference;
}

function hasBoundedExplanationSemantics(userFacingText) {
  if (typeof userFacingText !== "string" || userFacingText.length === 0) return false;
  const text = userFacingText.toLowerCase().replaceAll("’", "'");
  const requiredCommitments = [
    /(?:during|in|scoped to|applies? to)[^.!?]{0,100}spontaneous practice|spontaneous practice[^.!?]{0,100}(?:only|scope|applies?)/,
    /focused drill[^.!?]{0,140}(?:won't|will not|does not|is not|excluded|immediate correction)/,
    /(?:bounded|reversible|low-consequence)[^.!?]{0,100}trial|trial[^.!?]{0,100}(?:bounded|reversible|low-consequence)/,
    /not proof of cause|does not prove caus|not causal proof/,
    /\bnot\b[^.!?]{0,140}(?:fixed (?:user )?preference|fixed (?:learning )?style)/,
    /\bnot\b[^.!?]{0,180}long-term (?:learning|efficacy|improvement)/
  ];
  const forbiddenCommitments = [
    /\b(?:always|permanently)\s+(?:delay|apply|correct|use)\b/,
    /\bpermanent (?:global )?(?:policy|preference|behavior|rule)\b/,
    /\bglobal (?:correction )?(?:policy|preference|rule)\b/,
    /\b(?:is|becomes?|establishes?|proves?)\b[^.!?]{0,40}\b(?:global |fixed |established )?preference\b/,
    /\b(?:you have|your|establishes?|proves?) (?:a )?fixed learning style\b/,
    /\b(?:caused?|causes|proves?) (?:better|improved|improvement|learning)\b/,
    /\b(?:proves?|establishes?|guarantees?) (?:long-term|lasting) (?:learning|efficacy|improvement)\b/,
    /\b(?:because|shows?|proves?|establishes?) (?:you were|your )?fatigue\b/,
    /focused drill[^.!?]{0,120}(?:also|still|will|does) (?:apply|delay)/,
    /\b(?:chain[- ]of[- ]thought|hidden reasoning|private reasoning)\b/
  ];
  return requiredCommitments.every((pattern) => pattern.test(text))
    && forbiddenCommitments.every((pattern) => !pattern.test(text));
}

function validateTemporalAssessment(snapshot, evidence, assessment) {
  const records = indexRecords(snapshot);
  const transition = uniqueCreator(snapshot, assessment);
  const observation = records.get(assessment?.assessedObservationRef);
  const chronology = records.get(assessment?.chronologyRef);
  const interaction = records.get(assessment?.interactionRef);
  const resultAssessments = (transition.resultReferences ?? []).map(
    (reference) => records.get(reference)
  );
  const expectedInputRefs = [
    ...new Set(resultAssessments.map((item) => item?.assessedObservationRef)),
    chronology?.reference
  ];
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === assessment?.reference
  ));
  const ageDays = chronology?.payload?.scenarioDay
    - observation?.payload?.occurrenceScenarioDay;
  if (!hasExactKeys(assessment, TEMPORAL_ASSESSMENT_KEYS)
    || assessment.origin !== "sut"
    || assessment.useTarget !== "independent_current_skill_authority"
    || assessment.dimension !== observation?.payload?.dimension
    || assessment.observationScenarioDay !== observation?.payload?.occurrenceScenarioDay
    || assessment.currentScenarioDay !== chronology?.payload?.scenarioDay
    || assessment.ageDays !== ageDays
    || assessment.eligibility !== (ageDays > 90 ? "ineligible" : "eligible")
    || assessment.temporalUncertainty !== "none"
    || assessment.statusOrigin !== "sut_transition"
    || transition.transitionKind !== "assess_temporal_eligibility"
    || transition.origin !== "sut" || transition.interactionRef !== interaction?.reference
    || transition.result !== "accepted"
    || JSON.stringify(transition.inputReferences) !== JSON.stringify(expectedInputRefs)
    || resultAssessments.length === 0
    || new Set(transition.resultReferences).size !== transition.resultReferences.length
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
      || relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== assessment.createdOrder
      || relation.createdOrder !== transition.createdOrder
    ))
    || observation?.createdOrder >= interaction?.createdOrder
    || chronology?.createdOrder >= interaction?.createdOrder
    || interaction?.createdOrder >= assessment.createdOrder
    || assessment.createdOrder >= transition.createdOrder) {
    throw checkpointError("Temporal explanation basis is malformed.");
  }
  validateOutcomeFact(snapshot, evidence, observation, "fixture-scorer", "task_observation");
  validateOutcomeFact(snapshot, evidence, chronology, "fixture-driver", "chronology_fact");
}

function validateAttribution(snapshot, assertion, communication, interaction) {
  const records = indexRecords(snapshot);
  const transition = uniqueCreator(snapshot, assertion);
  const ingestion = uniqueCreator(snapshot, interaction);
  const actor = records.get(assertion?.sourceActorRef);
  const outward = snapshot.relations.filter(
    (relation) => relation.fromRef === assertion?.reference
  );
  const competing = snapshot.records.filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication?.reference
    && record.statusOrigin === "sut_transition"
  ));
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
    || hasExactKeys(transition, TRANSITION_KEYS) !== true
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "attribute_current_communications"
    || transition.interactionRef !== interaction.reference
    || JSON.stringify(transition.inputReferences) !== JSON.stringify([communication.reference])
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([assertion.reference])
    || transition.result !== "accepted"
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || !hasExactRelations(outward, [
      [actor.reference, "semantic_source", "source"],
      [communication.reference, "attributed_communication", "basis"]
    ], undefined, assertion, transition)
    || communication.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= assertion.createdOrder
    || assertion.createdOrder >= transition.createdOrder) {
    throw checkpointError("Explanation attribution is malformed.");
  }
}

function validateOutcomeFact(snapshot, evidence, fact, actorName, role) {
  validateBoundFact(snapshot, evidence, fact, "fixture");
  const records = indexRecords(snapshot);
  const actor = records.get(fact?.sourceActorRef);
  if (!hasExactKeys(fact, [
    "reference", "family", "origin", "role", "sourceFactRef", "payload",
    "firstInteractionRef", "createdOrder", "sourceActorRef"
  ]) || fact.family !== "input_fact" || fact.origin !== "fixture" || fact.role !== role
    || fact.payload?.sourceActor !== actorName
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== actorName) {
    throw checkpointError("Outcome input-fact envelope is malformed.");
  }
}

function uniqueCreator(snapshot, record) {
  const claimants = snapshot.records.filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
    || candidate.resultReferences?.includes(record?.reference)
  ));
  if (claimants.length !== 1 || claimants[0].reference !== record?.createdByTransitionRef
    || claimants[0].resultReferences?.filter(
      (reference) => reference === record?.reference
    ).length !== 1) {
    throw checkpointError("Creator identity is ambiguous.");
  }
  return claimants[0];
}

function hasExactRelations(relations, pairs, defaultKind, record, transition) {
  return relations.length === pairs.length && pairs.every((pair) => {
    const [reference, role, explicitKind] = pair;
    return relations.filter((relation) => (
      relation.relationKind === (explicitKind ?? defaultKind)
      && relation.toRef === reference && relation.targetRole === role
      && relation.assertedByRole === "sut"
      && relation.effectiveOrder === record.createdOrder
      && relation.createdOrder === transition.createdOrder
    )).length === 1;
  });
}

function indexRecords(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.relations)) {
    throw checkpointError("Outcome checkpoint snapshot is malformed.");
  }
  const records = new Map();
  for (const record of snapshot.records) {
    if (records.has(record.reference)) throw checkpointError("Record identity is ambiguous.");
    records.set(record.reference, record);
  }
  return records;
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function byCreatedOrder(left, right) {
  return left.createdOrder - right.createdOrder;
}

function checkpointError(message) {
  const error = new Error(message);
  error.name = "EvaluationCheckpointError";
  return error;
}
