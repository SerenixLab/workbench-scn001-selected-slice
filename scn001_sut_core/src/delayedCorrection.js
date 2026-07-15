import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";
import {
  resolveUniqueCreatingTransition,
  validateRetainedInputFact
} from "./retainedStateClosure.js";

export const DELAYED_CORRECTION_INTENT =
  "delay_minor_correction_until_turn_completion";

export const DELAYED_CORRECTION_SCOPE = Object.freeze({
  activity: "japanese_practice",
  taskMode: "spontaneous_production",
  surfaceLabel: "voice_simulated",
  correctionClass: "minor_correction",
  timing: "turn_completion",
  consequence: "low",
  excludedTaskModes: Object.freeze(["focused_production_drill"]),
  explicitImmediateCorrection: "excluded"
});

export const DELAYED_ACTIVATION_REQUIREMENTS = Object.freeze([
  "scope",
  "basis_lineage",
  "current_stale_basis",
  "user_governed_constraints",
  "reversibility",
  "consequence",
  "current_applicability",
  "retention_basis",
  "non_adaptation_boundary"
]);

export const DELAYED_ACTIVATION_BASIS_TYPE =
  "same_candidate_scoped_correction_evidence";

const DELAYED_ACTIVATION_ASSESSMENT_KEYS = Object.freeze([
  "reference", "family", "origin", "activationType", "activationBasisType",
  "candidateRef", "activeScope", "overallStatus", "checkResults",
  "materialBasisRefs", "directCorrectionStateRef", "directDispositionRef",
  "directRealizationFactRef", "directRealizationTransitionRef",
  "currentContextRef", "chronologyRef", "trialPolicyRef", "controlBasisRefs",
  "interactionRef", "statusOrigin", "createdOrder", "createdByTransitionRef"
]);

const ACTIVE_DELAYED_TRIAL_KEYS = Object.freeze([
  "reference", "family", "origin", "trialType", "trialOrigin", "candidateRef",
  "activationAssessmentRef", "activationBasisType", "activeScope",
  "retainedStateRefs", "currentStatus", "lifecycleVersion", "correctionPath",
  "userPreference", "globalPolicy", "durableAdaptation", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const TRANSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "transitionKind", "interactionRef",
  "inputReferences", "resultReferences", "createdOrder", "result"
]);

const CANDIDATE_KEYS = Object.freeze([
  "reference", "family", "origin", "candidateType", "materialIntent",
  "sourceClass", "purpose", "proposedScope", "outcomeRelevance",
  "reversibilityPath", "lifecycleStatus", "activationStatus",
  "activationRequirements", "behaviorInfluence", "userPreference",
  "globalPolicy", "durableAdaptation", "directCorrectionStateRef",
  "directDispositionRef", "directRealizationFactRef",
  "directRealizationTransitionRef", "activeProductionTrialRef",
  "focusedInstructionRef", "focusedDispositionRef",
  "focusedRealizationFactRef", "focusedRealizationTransitionRef",
  "focusedOutcomeRef", "currentContextRef", "trialPolicyRef",
  "controlBasisRefs", "interactionRef", "statusOrigin", "createdOrder",
  "effectiveOrder", "createdByTransitionRef"
]);

const TRIAL_POLICY = Object.freeze({
  control: "trial_policy",
  value: "bounded_reversible_trial_no_durable_adaptation"
});

export function deriveDelayedCorrectionCandidateParticipants({
  records,
  relations,
  sourceFactBindings,
  interaction,
  interactionFacts,
  validateActiveTrial,
  validateFocusedOutcome,
  resolveDirectRealization
}) {
  const directFacts = interactionFacts.filter((fact) => (
    fact?.role === "simulator_behavior_realization"
    && records.get(fact.payload?.requestedRef)?.family
      === "direct_current_session_correction_disposition"
  ));
  if (directFacts.length === 0) return undefined;
  if (directFacts.length !== 1 || interactionFacts.length !== 1) {
    throw new SutStateIntegrityError(
      "Delayed-correction candidate formation requires one exact direct realization fact."
    );
  }
  const fact = directFacts[0];
  const direct = resolveDirectRealization(fact.payload.requestedRef, fact.reference);
  if (!direct || fact.payload.fidelity !== "match"
    || fact.payload.realizedBehavior !== fact.payload.requestedBehavior) {
    return undefined;
  }

  const activeTrials = [...records.values()].filter((record) => record.family === "active_trial");
  const focusedOutcomes = [...records.values()].filter(
    (record) => record.family === "focused_drill_outcome"
  );
  if (activeTrials.length === 0 || focusedOutcomes.length === 0) return undefined;
  if (activeTrials.length !== 1 || focusedOutcomes.length !== 1) {
    throw new SutStateIntegrityError(
      "Delayed-correction candidate formation cannot select among retained trial evidence."
    );
  }
  const activeTrial = validateActiveTrial(activeTrials[0]);
  const focusedOutcome = validateFocusedOutcome(focusedOutcomes[0]);
  if (focusedOutcome.activeTrialRef !== activeTrial.reference) {
    throw new SutStateIntegrityError(
      "Delayed-correction candidate formation requires one exact focused-trial lineage."
    );
  }

  const trialPolicies = [...records.values()].filter((record) => (
    record.family === "input_fact" && record.role === "fixture_control_fact"
    && record.payload?.control === TRIAL_POLICY.control
  ));
  if (trialPolicies.length !== 1
    || !isDeepStrictEqual(controlMeaning(trialPolicies[0]), TRIAL_POLICY)) {
    throw new SutStateIntegrityError(
      "Delayed-correction candidate formation requires one exact bounded-trial policy."
    );
  }
  const trialPolicy = trialPolicies[0];
  validateInput(records, relations, sourceFactBindings, trialPolicy);

  const correctionState = records.get(direct.disposition.correctionControlRef);
  const currentContext = records.get(correctionState.contextRef);
  const focusedInstruction = records.get(focusedOutcome.instructionRef);
  const focusedDisposition = records.get(focusedOutcome.behaviorDispositionRef);
  const focusedRealizationFact = records.get(focusedOutcome.realizationFactRef);
  const focusedRealizationTransition = records.get(focusedOutcome.realizationTransitionRef);
  const controls = correctionState.controlBasisRefs;
  const existing = [...records.values()].filter(
    (record) => record.family === "delayed_correction_candidate"
  );
  if (existing.length > 1) {
    throw new SutStateIntegrityError(
      "Delayed-correction candidate formation cannot select among candidates."
    );
  }

  const participants = {
    correctionState,
    directDisposition: direct.disposition,
    directRealizationFact: direct.fact,
    directRealizationTransition: direct.transition,
    activeTrial,
    focusedInstruction,
    focusedDisposition,
    focusedRealizationFact,
    focusedRealizationTransition,
    focusedOutcome,
    currentContext,
    trialPolicy,
    controlBasisRefs: structuredClone(controls),
    interaction
  };
  if (existing.length === 1) {
    return {
      kind: "reuse",
      candidate: validateDelayedCorrectionCandidateClosure({
        records,
        relations,
        sourceFactBindings,
        candidate: existing[0],
        validateActiveTrial,
        validateFocusedOutcome,
        resolveDirectRealization
      }),
      ...participants
    };
  }
  return { kind: "create", ...participants };
}

export function validateDelayedCorrectionCandidateClosure({
  records,
  relations,
  sourceFactBindings,
  candidate,
  validateActiveTrial,
  validateFocusedOutcome,
  resolveDirectRealization
}) {
  const transition = resolveUniqueCreatingTransition(
    records, candidate, "Delayed-correction candidate"
  );
  const direct = resolveDirectRealization(
    candidate?.directDispositionRef, candidate?.directRealizationFactRef
  );
  const correctionState = records.get(candidate?.directCorrectionStateRef);
  const activeTrial = validateActiveTrial(records.get(candidate?.activeProductionTrialRef));
  const focusedOutcome = validateFocusedOutcome(records.get(candidate?.focusedOutcomeRef));
  const focusedInstruction = records.get(candidate?.focusedInstructionRef);
  const focusedDisposition = records.get(candidate?.focusedDispositionRef);
  const focusedRealizationFact = records.get(candidate?.focusedRealizationFactRef);
  const focusedRealizationTransition = records.get(
    candidate?.focusedRealizationTransitionRef
  );
  const currentContext = records.get(candidate?.currentContextRef);
  const trialPolicy = records.get(candidate?.trialPolicyRef);
  const interaction = records.get(candidate?.interactionRef);
  const controlRefs = candidate?.controlBasisRefs ?? {};
  const participants = {
    correctionState,
    directDisposition: direct?.disposition,
    directRealizationFact: direct?.fact,
    directRealizationTransition: direct?.transition,
    activeTrial,
    focusedInstruction,
    focusedDisposition,
    focusedRealizationFact,
    focusedRealizationTransition,
    focusedOutcome,
    currentContext,
    trialPolicy,
    controlBasisRefs: controlRefs
  };
  const expectedInputs = candidateInputReferences(participants);
  const expectedRelations = candidateRelationPairs(participants);
  const candidateRelations = relations.filter((relation) => (
    relation.fromRef === candidate?.reference
  ));
  const competing = [...records.values()].filter(
    (record) => record.family === "delayed_correction_candidate"
  );
  if (!hasExactKeys(candidate, CANDIDATE_KEYS)
    || candidate.family !== "delayed_correction_candidate"
    || candidate.origin !== "sut"
    || candidate.candidateType !== "zoey_derived_delayed_correction_trial"
    || candidate.materialIntent !== DELAYED_CORRECTION_INTENT
    || candidate.sourceClass !== "zoey_derived_from_scoped_behavior_evidence"
    || candidate.purpose !== "provisional_evaluative_future_behavior_trial"
    || !isDeepStrictEqual(candidate.proposedScope, DELAYED_CORRECTION_SCOPE)
    || candidate.outcomeRelevance !== "later_spontaneous_speaking_and_pacing_observation"
    || candidate.reversibilityPath !== "restore_immediate_or_context_specific_correction"
    || candidate.lifecycleStatus !== "formed_non_active"
    || candidate.activationStatus !== "not_assessed"
    || !isDeepStrictEqual(candidate.activationRequirements, DELAYED_ACTIVATION_REQUIREMENTS)
    || candidate.behaviorInfluence !== "prohibited_until_activation"
    || candidate.userPreference !== "not_established"
    || candidate.globalPolicy !== "not_established"
    || candidate.durableAdaptation !== "unsupported_in_selected_slice"
    || competing.length !== 1 || competing[0].reference !== candidate.reference
    || correctionState?.family !== "scoped_current_correction_control"
    || direct?.disposition?.correctionControlRef !== correctionState.reference
    || direct?.fact?.reference !== candidate.directRealizationFactRef
    || direct?.transition?.reference !== candidate.directRealizationTransitionRef
    || focusedOutcome.activeTrialRef !== activeTrial.reference
    || focusedOutcome.instructionRef !== focusedInstruction?.reference
    || focusedOutcome.behaviorDispositionRef !== focusedDisposition?.reference
    || focusedOutcome.realizationFactRef !== focusedRealizationFact?.reference
    || focusedOutcome.realizationTransitionRef !== focusedRealizationTransition?.reference
    || correctionState.contextRef !== currentContext?.reference
    || direct.fact.firstInteractionRef !== interaction?.reference
    || direct.transition.interactionRef !== interaction.reference
    || !isDeepStrictEqual(controlMeaning(trialPolicy), TRIAL_POLICY)
    || !isDeepStrictEqual(controlRefs, correctionState.controlBasisRefs)
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.reference !== candidate.createdByTransitionRef
    || transition.transitionKind !== "form_delayed_correction_trial_candidate"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "delayed_correction_candidate_formed_non_active"
    || !isDeepStrictEqual(
      transition.inputReferences,
      expectedInputs
    )
    || !isDeepStrictEqual(transition.resultReferences, [candidate.reference])
    || !hasExactRelations(candidateRelations, expectedRelations)
    || candidateRelations.some((relation) => !exactRelationMetadata(
      relation, candidate.createdOrder, transition.createdOrder
    ))
    || direct.transition.createdOrder >= candidate.createdOrder
    || focusedRealizationTransition.createdOrder >= candidate.createdOrder
    || focusedOutcome.createdOrder >= candidate.createdOrder
    || candidate.createdOrder >= transition.createdOrder
    || candidate.effectiveOrder !== candidate.createdOrder
    || candidate.statusOrigin !== "sut_transition") {
    throw new SutStateIntegrityError("Delayed-correction candidate closure is malformed.");
  }
  validateInput(records, relations, sourceFactBindings, trialPolicy);
  return candidate;
}

export function candidateInputReferences(participants) {
  return [
    participants.correctionState.reference,
    participants.directDisposition.reference,
    participants.directRealizationFact.reference,
    participants.directRealizationTransition.reference,
    participants.activeTrial.reference,
    participants.focusedInstruction.reference,
    participants.focusedDisposition.reference,
    participants.focusedRealizationFact.reference,
    participants.focusedRealizationTransition.reference,
    participants.focusedOutcome.reference,
    participants.currentContext.reference,
    participants.trialPolicy.reference,
    participants.controlBasisRefs.userGoverned,
    participants.controlBasisRefs.consequence,
    participants.controlBasisRefs.reversibility
  ];
}

export function candidateRelationPairs(participants) {
  return [
    [participants.directDisposition.reference,
      "direct_correction_disposition", "transition_ancestry"],
    [participants.correctionState.reference, "current_correction_evidence", "basis"],
    [participants.directDisposition.reference, "direct_correction_disposition_basis", "basis"],
    [participants.directRealizationFact.reference, "realized_current_correction", "basis"],
    [participants.directRealizationTransition.reference,
      "current_correction_realization_transition", "basis"],
    [participants.activeTrial.reference, "retained_production_trial", "basis"],
    [participants.focusedInstruction.reference, "prior_focused_drill_instruction", "basis"],
    [participants.focusedDisposition.reference, "prior_focused_drill_disposition", "basis"],
    [participants.focusedRealizationFact.reference, "prior_focused_realization", "basis"],
    [participants.focusedRealizationTransition.reference,
      "prior_focused_realization_transition", "basis"],
    [participants.focusedOutcome.reference, "prior_focused_outcome", "basis"],
    [participants.currentContext.reference, "spontaneous_production_context", "basis"],
    [participants.trialPolicy.reference, "bounded_trial_policy", "basis"],
    [participants.controlBasisRefs.userGoverned, "user_governed_control", "basis"],
    [participants.controlBasisRefs.consequence, "consequence_control", "basis"],
    [participants.controlBasisRefs.reversibility, "reversibility_control", "basis"],
    [participants.correctionState.reference, "current_correction_support", "support"],
    [participants.directRealizationFact.reference,
      "realized_current_correction_support", "support"],
    [participants.focusedInstruction.reference,
      "prior_focused_drill_instruction_support", "support"],
    [participants.focusedDisposition.reference,
      "prior_focused_drill_disposition_support", "support"],
    [participants.focusedRealizationFact.reference,
      "prior_focused_realization_support", "support"],
    [participants.focusedOutcome.reference, "prior_focused_outcome_support", "support"]
  ];
}

export function resolveDelayedActivationParticipants({
  records,
  relations,
  sourceFactBindings,
  candidate,
  validateActiveTrial,
  validateFocusedOutcome,
  resolveDirectRealization
}) {
  const validatedCandidate = validateDelayedCorrectionCandidateClosure({
    records,
    relations,
    sourceFactBindings,
    candidate,
    validateActiveTrial,
    validateFocusedOutcome,
    resolveDirectRealization
  });
  const correctionState = records.get(validatedCandidate.directCorrectionStateRef);
  const directDisposition = records.get(validatedCandidate.directDispositionRef);
  const directRealizationFact = records.get(validatedCandidate.directRealizationFactRef);
  const directRealizationTransition = records.get(
    validatedCandidate.directRealizationTransitionRef
  );
  const currentContext = records.get(validatedCandidate.currentContextRef);
  const chronology = records.get(correctionState?.chronologyRef);
  const trialPolicy = records.get(validatedCandidate.trialPolicyRef);
  const activeProductionTrial = validateActiveTrial(
    records.get(validatedCandidate.activeProductionTrialRef)
  );
  const productionActivationAssessment = records.get(
    activeProductionTrial.activationAssessmentRef
  );
  const retentionFacts = [...records.values()].filter((record) => (
    record.family === "input_fact"
    && record.role === "fixture_control_fact"
    && record.payload?.control === "evaluation_retention_basis"
  ));
  if (retentionFacts.length !== 1) {
    throw new SutStateIntegrityError(
      "Delayed activation requires one exact retained evaluation basis."
    );
  }
  const retention = retentionFacts[0];
  validateInput(records, relations, sourceFactBindings, retention);
  if (retention.payload.value !== "named_formal_run"
    || !productionActivationAssessment?.materialBasisRefs?.includes(retention.reference)) {
    throw new SutStateIntegrityError(
      "Delayed activation requires the exact production-trial retention basis."
    );
  }
  const controls = {
    userGoverned: records.get(validatedCandidate.controlBasisRefs.userGoverned),
    consequence: records.get(validatedCandidate.controlBasisRefs.consequence),
    reversibility: records.get(validatedCandidate.controlBasisRefs.reversibility),
    retention
  };
  if (Object.values(controls).some((control) => !control)) {
    throw new SutStateIntegrityError("Delayed activation control basis is incomplete.");
  }
  return {
    candidate: validatedCandidate,
    correctionState,
    directDisposition,
    directRealizationFact,
    directRealizationTransition,
    currentContext,
    chronology,
    trialPolicy,
    activeProductionTrial,
    controls
  };
}

export function deriveDelayedActivationCheckResults(participants) {
  const pass = (reason) => ({ status: "passed", reason });
  const fail = (reason) => ({ status: "failed", reason });
  const {
    candidate, correctionState, directDisposition, directRealizationFact,
    directRealizationTransition, currentContext, chronology, trialPolicy,
    activeProductionTrial, controls
  } = participants;
  const scopeMatches = isDeepStrictEqual(candidate.proposedScope, DELAYED_CORRECTION_SCOPE)
    && currentContext?.payload?.activity === candidate.proposedScope.activity
    && currentContext?.payload?.taskMode === candidate.proposedScope.taskMode
    && currentContext?.payload?.surfaceLabel === candidate.proposedScope.surfaceLabel;
  const lineageMatches = correctionState?.reference === candidate.directCorrectionStateRef
    && directDisposition?.reference === candidate.directDispositionRef
    && directDisposition?.correctionControlRef === correctionState?.reference
    && directRealizationFact?.reference === candidate.directRealizationFactRef
    && directRealizationTransition?.reference === candidate.directRealizationTransitionRef;
  const currentBasis = chronology?.payload?.scenarioDay === currentContext?.payload?.scenarioDay
    && chronology?.payload?.sessionId === currentContext?.payload?.sessionId
    && correctionState?.interactionRef === currentContext?.firstInteractionRef;
  return {
    scope: scopeMatches
      ? pass("exact_bounded_delayed_correction_scope")
      : fail("delayed_correction_scope_mismatch"),
    basis_lineage: lineageMatches
      ? pass("exact_candidate_and_realized_correction_lineage")
      : fail("incomplete_delayed_activation_lineage"),
    current_stale_basis: currentBasis
      ? pass("current_same_session_correction_basis")
      : fail("delayed_activation_basis_not_current"),
    user_governed_constraints:
      controls.userGoverned?.payload?.value === "exhaustive_selected_slice_scope"
        ? pass("exhaustive_selected_slice_constraints")
        : fail("unsupported_user_governed_constraints"),
    reversibility: controls.reversibility?.payload?.value === "reversible"
      && candidate.reversibilityPath === "restore_immediate_or_context_specific_correction"
      ? pass("reversible_separate_delayed_trial_state")
      : fail("delayed_trial_reversibility_not_supported"),
    consequence: controls.consequence?.payload?.value === "low"
      && currentContext?.payload?.consequence === "low"
      ? pass("low_consequence_spontaneous_practice")
      : fail("delayed_trial_consequence_not_low"),
    current_applicability:
      correctionState?.currentApplicability === "applicable_to_exact_current_session"
      && correctionState?.futureApplicability === "not_established"
      ? pass("current_exact_session_supports_bounded_trial")
      : fail("correction_not_current_for_delayed_activation"),
    retention_basis: controls.retention?.payload?.value === "named_formal_run"
      && activeProductionTrial?.currentStatus === "active"
      ? pass("named_formal_run_retains_exact_trial_lineage")
      : fail("delayed_activation_retention_basis_missing"),
    non_adaptation_boundary:
      trialPolicy?.payload?.value === "bounded_reversible_trial_no_durable_adaptation"
      && candidate.lifecycleStatus === "formed_non_active"
      && candidate.activationStatus === "not_assessed"
      && candidate.behaviorInfluence === "prohibited_until_activation"
      && candidate.userPreference === "not_established"
      && candidate.globalPolicy === "not_established"
      && candidate.durableAdaptation === "unsupported_in_selected_slice"
      ? pass("activation_is_separate_bounded_trial_not_adaptation")
      : fail("non_adaptation_boundary_not_preserved")
  };
}

export function deriveDelayedActivationOverallStatus(checkResults) {
  return Object.values(checkResults).every((result) => result.status === "passed")
    ? "sufficient" : "insufficient";
}

export function delayedActivationMaterialBasisRefs(participants) {
  return [
    participants.candidate.reference,
    participants.correctionState.reference,
    participants.directDisposition.reference,
    participants.directRealizationFact.reference,
    participants.directRealizationTransition.reference,
    participants.currentContext.reference,
    participants.chronology.reference,
    participants.trialPolicy.reference,
    participants.activeProductionTrial.reference,
    participants.controls.userGoverned.reference,
    participants.controls.consequence.reference,
    participants.controls.reversibility.reference,
    participants.controls.retention.reference
  ];
}

export function delayedActivationRelationPairs(participants) {
  return [
    [participants.candidate.reference, "same_delayed_candidate"],
    [participants.correctionState.reference, "scoped_current_correction"],
    [participants.directDisposition.reference, "direct_correction_disposition"],
    [participants.directRealizationFact.reference, "realized_direct_correction"],
    [participants.directRealizationTransition.reference, "direct_realization_transition"],
    [participants.currentContext.reference, "current_spontaneous_context"],
    [participants.chronology.reference, "current_correction_chronology"],
    [participants.trialPolicy.reference, "bounded_trial_policy"],
    [participants.activeProductionTrial.reference, "retained_production_trial"],
    [participants.controls.userGoverned.reference, "user_governed_control"],
    [participants.controls.consequence.reference, "consequence_control"],
    [participants.controls.reversibility.reference, "reversibility_control"],
    [participants.controls.retention.reference, "retention_basis"]
  ];
}

export function validateDelayedActivationAssessmentClosure({
  records,
  relations,
  sourceFactBindings,
  assessment,
  validateActiveTrial,
  validateFocusedOutcome,
  resolveDirectRealization
}) {
  const transition = resolveUniqueCreatingTransition(
    records, assessment, "Delayed-correction activation assessment"
  );
  const candidate = records.get(assessment?.candidateRef);
  const participants = resolveDelayedActivationParticipants({
    records,
    relations,
    sourceFactBindings,
    candidate,
    validateActiveTrial,
    validateFocusedOutcome,
    resolveDirectRealization
  });
  const expectedChecks = deriveDelayedActivationCheckResults(participants);
  const expectedInputs = delayedActivationMaterialBasisRefs(participants);
  const expectedPairs = delayedActivationRelationPairs(participants);
  const basisRelations = relations.filter(
    (relation) => relation.fromRef === assessment?.reference
  );
  const competing = [...records.values()].filter((record) => (
    record.family === "delayed_correction_activation_assessment"
    && record.candidateRef === candidate?.reference
  ));
  const controlBasisRefs = {
    userGoverned: participants.controls.userGoverned.reference,
    consequence: participants.controls.consequence.reference,
    reversibility: participants.controls.reversibility.reference,
    retention: participants.controls.retention.reference
  };
  if (!hasExactKeys(assessment, DELAYED_ACTIVATION_ASSESSMENT_KEYS)
    || assessment.family !== "delayed_correction_activation_assessment"
    || assessment.origin !== "sut"
    || assessment.activationType !== "delayed_correction_candidate_activation"
    || assessment.activationBasisType !== DELAYED_ACTIVATION_BASIS_TYPE
    || competing.length !== 1 || competing[0].reference !== assessment.reference
    || !isDeepStrictEqual(assessment.activeScope, candidate.proposedScope)
    || assessment.overallStatus !== deriveDelayedActivationOverallStatus(expectedChecks)
    || !isDeepStrictEqual(assessment.checkResults, expectedChecks)
    || !isDeepStrictEqual(assessment.materialBasisRefs, expectedInputs)
    || assessment.directCorrectionStateRef !== participants.correctionState.reference
    || assessment.directDispositionRef !== participants.directDisposition.reference
    || assessment.directRealizationFactRef !== participants.directRealizationFact.reference
    || assessment.directRealizationTransitionRef
      !== participants.directRealizationTransition.reference
    || assessment.currentContextRef !== participants.currentContext.reference
    || assessment.chronologyRef !== participants.chronology.reference
    || assessment.trialPolicyRef !== participants.trialPolicy.reference
    || !isDeepStrictEqual(assessment.controlBasisRefs, controlBasisRefs)
    || assessment.interactionRef !== candidate.interactionRef
    || assessment.statusOrigin !== "sut_transition"
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.reference !== assessment.createdByTransitionRef
    || transition.transitionKind !== "assess_delayed_correction_trial_activation"
    || transition.interactionRef !== candidate.interactionRef
    || transition.result !== "delayed_correction_activation_assessed"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
    || new Set(transition.inputReferences).size !== expectedInputs.length
    || !isDeepStrictEqual(transition.resultReferences, [assessment.reference])
    || !hasExactRelations(basisRelations, expectedPairs.map(
      ([reference, role]) => [reference, role, "basis"]
    ))
    || basisRelations.some((relation) => !exactRelationMetadata(
      relation, assessment.createdOrder, transition.createdOrder
    ))
    || candidate.createdByTransitionRef === transition.reference
    || records.get(candidate.createdByTransitionRef)?.createdOrder >= assessment.createdOrder
    || expectedInputs.some((reference) => (
      reference !== candidate.reference
      && records.get(reference)?.createdOrder >= assessment.createdOrder
    ))
    || assessment.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError(
      "Delayed-correction activation assessment closure is malformed."
    );
  }
  return assessment;
}

export function validateActiveDelayedCorrectionTrialClosure({
  records,
  relations,
  sourceFactBindings,
  trial,
  validateActiveTrial,
  validateFocusedOutcome,
  resolveDirectRealization
}) {
  const transition = resolveUniqueCreatingTransition(
    records, trial, "Active delayed-correction trial"
  );
  const assessment = validateDelayedActivationAssessmentClosure({
    records,
    relations,
    sourceFactBindings,
    assessment: records.get(trial?.activationAssessmentRef),
    validateActiveTrial,
    validateFocusedOutcome,
    resolveDirectRealization
  });
  const candidate = validateDelayedCorrectionCandidateClosure({
    records,
    relations,
    sourceFactBindings,
    candidate: records.get(trial?.candidateRef),
    validateActiveTrial,
    validateFocusedOutcome,
    resolveDirectRealization
  });
  const ancestry = relations.filter(
    (relation) => relation.fromRef === trial?.reference
  );
  const competing = [...records.values()].filter((record) => (
    record.family === "active_delayed_correction_trial"
    && record.candidateRef === candidate.reference
  ));
  const retainedStateRefs = {
    candidate: candidate.reference,
    correctionState: assessment.directCorrectionStateRef,
    directDisposition: assessment.directDispositionRef
  };
  if (!hasExactKeys(trial, ACTIVE_DELAYED_TRIAL_KEYS)
    || trial.family !== "active_delayed_correction_trial" || trial.origin !== "sut"
    || trial.trialType !== "delayed_minor_correction_until_turn_completion"
    || trial.trialOrigin !== "zoey_derived_scoped_behavior_trial"
    || trial.candidateRef !== assessment.candidateRef
    || trial.activationBasisType !== DELAYED_ACTIVATION_BASIS_TYPE
    || !isDeepStrictEqual(trial.activeScope, candidate.proposedScope)
    || !isDeepStrictEqual(trial.retainedStateRefs, retainedStateRefs)
    || trial.currentStatus !== "active" || trial.lifecycleVersion !== 1
    || trial.correctionPath !== "restore_immediate_or_context_specific_correction"
    || trial.userPreference !== "not_established"
    || trial.globalPolicy !== "not_established"
    || trial.durableAdaptation !== "unsupported_in_selected_slice"
    || trial.statusOrigin !== "sut_transition"
    || trial.interactionRef !== assessment.interactionRef
    || competing.length !== 1 || competing[0].reference !== trial.reference
    || assessment.overallStatus !== "sufficient"
    || Object.values(assessment.checkResults).some((result) => result.status !== "passed")
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.reference !== trial.createdByTransitionRef
    || transition.transitionKind !== "activate_delayed_correction_trial"
    || transition.interactionRef !== trial.interactionRef
    || transition.result !== "delayed_correction_trial_activated"
    || !isDeepStrictEqual(
      transition.inputReferences, [candidate.reference, assessment.reference]
    )
    || !isDeepStrictEqual(transition.resultReferences, [trial.reference])
    || ancestry.length !== 2
    || !ancestry.some((relation) => relation.toRef === candidate.reference
      && relation.targetRole === "trial_candidate")
    || !ancestry.some((relation) => relation.toRef === assessment.reference
      && relation.targetRole === "activation_assessment")
    || ancestry.some((relation) => !exactRelationMetadata(
      relation, trial.createdOrder, transition.createdOrder
    ))
    || records.get(assessment.createdByTransitionRef)?.createdOrder >= trial.createdOrder
    || trial.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Active delayed-correction trial closure is malformed.");
  }
  return trial;
}

function validateInput(records, relations, sourceFactBindings, fact) {
  const interaction = records.get(fact?.firstInteractionRef);
  validateRetainedInputFact({
    records,
    relations,
    sourceFactBindings,
    fact,
    interaction,
    role: "fixture_control_fact",
    origin: "fixture",
    expectedSourceActor: "fixture-driver"
  });
}

function controlMeaning(fact) {
  return { control: fact?.payload?.control, value: fact?.payload?.value };
}

function hasExactRelations(relations, participantPairs) {
  return relations.length === participantPairs.length
    && participantPairs.every(([reference, role, kind]) => relations.some((relation) => (
      relation.toRef === reference
      && relation.targetRole === role
      && relation.relationKind === kind
    )));
}

function exactRelationMetadata(relation, effectiveOrder, createdOrder) {
  return relation.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === "sut"
    && relation.fromRef !== relation.toRef;
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}
