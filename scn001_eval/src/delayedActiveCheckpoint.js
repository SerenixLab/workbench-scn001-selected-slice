import { findExactDelayedCorrectionCandidate } from "./delayedCandidateCheckpoint.js";
import { validateBoundFact } from "./directCorrectionCheckpoint.js";

const ACTIVATION_CHECKS = Object.freeze([
  "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
  "reversibility", "consequence", "current_applicability", "retention_basis",
  "non_adaptation_boundary"
]);

const ASSESSMENT_KEYS = Object.freeze([
  "reference", "family", "origin", "activationType", "activationBasisType",
  "candidateRef", "activeScope", "overallStatus", "checkResults",
  "materialBasisRefs", "directCorrectionStateRef", "directDispositionRef",
  "directRealizationFactRef", "directRealizationTransitionRef",
  "currentContextRef", "chronologyRef", "trialPolicyRef", "controlBasisRefs",
  "interactionRef", "statusOrigin", "createdOrder", "createdByTransitionRef"
]);

const TRIAL_KEYS = Object.freeze([
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

const ACTIVATION_BASIS_TYPE = "same_candidate_scoped_correction_evidence";

export function findExactActiveDelayedCorrectionTrial(snapshot, sourceBindingEvidence) {
  const candidateClosure = findExactDelayedCorrectionCandidate(
    snapshot, sourceBindingEvidence
  );
  if (!candidateClosure) return undefined;
  const assessments = snapshot.records.filter(
    (record) => record.family === "delayed_correction_activation_assessment"
  );
  const trials = snapshot.records.filter(
    (record) => record.family === "active_delayed_correction_trial"
  );
  if (assessments.length === 0 && trials.length === 0) return undefined;
  if (assessments.length !== 1 || trials.length !== 1) {
    throw checkpointError("CP-DELAY-ACTIVE activation identity is ambiguous.");
  }

  const records = indexRecords(snapshot);
  const assessment = assessments[0];
  const trial = trials[0];
  const candidate = candidateClosure.candidate;
  const direct = candidateClosure.direct;
  const context = records.get(assessment.currentContextRef);
  const chronology = records.get(assessment.chronologyRef);
  const trialPolicy = records.get(assessment.trialPolicyRef);
  const activeProductionTrial = candidateClosure.activeTrial;
  const productionActivationAssessment = records.get(
    activeProductionTrial.activationAssessmentRef
  );
  const controls = {
    userGoverned: records.get(assessment.controlBasisRefs?.userGoverned),
    consequence: records.get(assessment.controlBasisRefs?.consequence),
    reversibility: records.get(assessment.controlBasisRefs?.reversibility),
    retention: records.get(assessment.controlBasisRefs?.retention)
  };
  const assessmentTransition = uniqueCreator(snapshot, assessment);
  const trialTransition = uniqueCreator(snapshot, trial);
  const expectedChecks = deriveCheckResults({
    candidate,
    direct,
    context,
    chronology,
    trialPolicy,
    activeProductionTrial,
    controls
  });
  const expectedInputs = [
    candidate.reference,
    direct.state.reference,
    direct.disposition.reference,
    direct.fact.reference,
    direct.realizationTransition.reference,
    context?.reference,
    chronology?.reference,
    trialPolicy?.reference,
    activeProductionTrial.reference,
    controls.userGoverned?.reference,
    controls.consequence?.reference,
    controls.reversibility?.reference,
    controls.retention?.reference
  ];
  const expectedRoles = [
    [candidate.reference, "same_delayed_candidate"],
    [direct.state.reference, "scoped_current_correction"],
    [direct.disposition.reference, "direct_correction_disposition"],
    [direct.fact.reference, "realized_direct_correction"],
    [direct.realizationTransition.reference, "direct_realization_transition"],
    [context?.reference, "current_spontaneous_context"],
    [chronology?.reference, "current_correction_chronology"],
    [trialPolicy?.reference, "bounded_trial_policy"],
    [activeProductionTrial.reference, "retained_production_trial"],
    [controls.userGoverned?.reference, "user_governed_control"],
    [controls.consequence?.reference, "consequence_control"],
    [controls.reversibility?.reference, "reversibility_control"],
    [controls.retention?.reference, "retention_basis"]
  ];
  const assessmentRelations = snapshot.relations.filter(
    (relation) => relation.fromRef === assessment.reference
  );
  const trialAncestry = snapshot.relations.filter(
    (relation) => relation.fromRef === trial.reference
  );
  const retainedStateRefs = {
    candidate: candidate.reference,
    correctionState: direct.state.reference,
    directDisposition: direct.disposition.reference
  };
  if (!hasExactKeys(assessment, ASSESSMENT_KEYS)
    || assessment.origin !== "sut"
    || assessment.activationType !== "delayed_correction_candidate_activation"
    || assessment.activationBasisType !== ACTIVATION_BASIS_TYPE
    || assessment.candidateRef !== candidate.reference
    || JSON.stringify(assessment.activeScope) !== JSON.stringify(candidate.proposedScope)
    || assessment.overallStatus !== "sufficient"
    || !hasExactKeys(assessment.checkResults, ACTIVATION_CHECKS)
    || JSON.stringify(assessment.checkResults) !== JSON.stringify(expectedChecks)
    || JSON.stringify(assessment.materialBasisRefs) !== JSON.stringify(expectedInputs)
    || assessment.directCorrectionStateRef !== direct.state.reference
    || assessment.directDispositionRef !== direct.disposition.reference
    || assessment.directRealizationFactRef !== direct.fact.reference
    || assessment.directRealizationTransitionRef
      !== direct.realizationTransition.reference
    || assessment.currentContextRef !== context?.reference
    || assessment.chronologyRef !== direct.state.chronologyRef
    || assessment.trialPolicyRef !== candidate.trialPolicyRef
    || JSON.stringify(assessment.controlBasisRefs) !== JSON.stringify({
      userGoverned: candidate.controlBasisRefs.userGoverned,
      consequence: candidate.controlBasisRefs.consequence,
      reversibility: candidate.controlBasisRefs.reversibility,
      retention: controls.retention?.reference
    })
    || assessment.interactionRef !== candidate.interactionRef
    || assessment.statusOrigin !== "sut_transition"
    || !hasExactKeys(assessmentTransition, TRANSITION_KEYS)
    || assessmentTransition.family !== "sut_transition_evidence"
    || assessmentTransition.origin !== "sut"
    || assessmentTransition.transitionKind
      !== "assess_delayed_correction_trial_activation"
    || assessmentTransition.interactionRef !== candidate.interactionRef
    || assessmentTransition.result !== "delayed_correction_activation_assessed"
    || JSON.stringify(assessmentTransition.inputReferences)
      !== JSON.stringify(expectedInputs)
    || new Set(assessmentTransition.inputReferences).size !== expectedInputs.length
    || JSON.stringify(assessmentTransition.resultReferences)
      !== JSON.stringify([assessment.reference])
    || !hasExactRoleReferences(assessmentRelations, expectedRoles, "basis")
    || assessmentRelations.some((relation) => !exactRelationMetadata(
      relation, assessment.createdOrder, assessmentTransition.createdOrder
    ))
    || records.get(candidate.createdByTransitionRef)?.createdOrder >= assessment.createdOrder
    || expectedInputs.some((reference) => reference !== candidate.reference
      && records.get(reference)?.createdOrder >= assessment.createdOrder)
    || assessment.createdOrder >= assessmentTransition.createdOrder) {
    throw checkpointError("CP-DELAY-ACTIVE assessment closure is malformed.");
  }

  if (!hasExactKeys(trial, TRIAL_KEYS)
    || trial.origin !== "sut"
    || trial.trialType !== "delayed_minor_correction_until_turn_completion"
    || trial.trialOrigin !== "zoey_derived_scoped_behavior_trial"
    || trial.candidateRef !== candidate.reference
    || trial.activationAssessmentRef !== assessment.reference
    || trial.activationBasisType !== ACTIVATION_BASIS_TYPE
    || JSON.stringify(trial.activeScope) !== JSON.stringify(candidate.proposedScope)
    || JSON.stringify(trial.retainedStateRefs) !== JSON.stringify(retainedStateRefs)
    || trial.currentStatus !== "active" || trial.lifecycleVersion !== 1
    || trial.correctionPath !== "restore_immediate_or_context_specific_correction"
    || trial.userPreference !== "not_established"
    || trial.globalPolicy !== "not_established"
    || trial.durableAdaptation !== "unsupported_in_selected_slice"
    || trial.statusOrigin !== "sut_transition"
    || trial.interactionRef !== assessment.interactionRef
    || !hasExactKeys(trialTransition, TRANSITION_KEYS)
    || trialTransition.family !== "sut_transition_evidence"
    || trialTransition.origin !== "sut"
    || trialTransition.transitionKind !== "activate_delayed_correction_trial"
    || trialTransition.interactionRef !== trial.interactionRef
    || trialTransition.result !== "delayed_correction_trial_activated"
    || JSON.stringify(trialTransition.inputReferences)
      !== JSON.stringify([candidate.reference, assessment.reference])
    || JSON.stringify(trialTransition.resultReferences) !== JSON.stringify([trial.reference])
    || !hasExactRoleReferences(trialAncestry, [
      [candidate.reference, "trial_candidate"],
      [assessment.reference, "activation_assessment"]
    ], "transition_ancestry")
    || trialAncestry.some((relation) => !exactRelationMetadata(
      relation, trial.createdOrder, trialTransition.createdOrder
    ))
    || assessmentTransition.createdOrder >= trial.createdOrder
    || trial.createdOrder >= trialTransition.createdOrder) {
    throw checkpointError("CP-DELAY-ACTIVE trial closure is malformed.");
  }
  validateBoundFact(snapshot, sourceBindingEvidence, controls.retention, "fixture");
  if (!productionActivationAssessment?.materialBasisRefs?.includes(
    controls.retention.reference
  )) {
    throw checkpointError("CP-DELAY-ACTIVE retention lineage is malformed.");
  }
  return { candidate, assessment, trial, direct, activeProductionTrial };
}

function deriveCheckResults({
  candidate, direct, context, chronology, trialPolicy, activeProductionTrial, controls
}) {
  const pass = (reason) => ({ status: "passed", reason });
  const fail = (reason) => ({ status: "failed", reason });
  const scopeMatches = JSON.stringify(candidate.proposedScope) === JSON.stringify({
    activity: "japanese_practice",
    taskMode: "spontaneous_production",
    surfaceLabel: "voice_simulated",
    correctionClass: "minor_correction",
    timing: "turn_completion",
    consequence: "low",
    excludedTaskModes: ["focused_production_drill"],
    explicitImmediateCorrection: "excluded"
  }) && context?.payload?.activity === candidate.proposedScope.activity
    && context?.payload?.taskMode === candidate.proposedScope.taskMode
    && context?.payload?.surfaceLabel === candidate.proposedScope.surfaceLabel;
  const lineageMatches = direct.disposition.correctionControlRef === direct.state.reference
    && candidate.directCorrectionStateRef === direct.state.reference
    && candidate.directDispositionRef === direct.disposition.reference
    && candidate.directRealizationFactRef === direct.fact.reference
    && candidate.directRealizationTransitionRef === direct.realizationTransition.reference;
  const currentBasis = chronology?.payload?.scenarioDay === context?.payload?.scenarioDay
    && chronology?.payload?.sessionId === context?.payload?.sessionId
    && direct.state.interactionRef === context?.firstInteractionRef;
  return {
    scope: scopeMatches ? pass("exact_bounded_delayed_correction_scope")
      : fail("delayed_correction_scope_mismatch"),
    basis_lineage: lineageMatches
      ? pass("exact_candidate_and_realized_correction_lineage")
      : fail("incomplete_delayed_activation_lineage"),
    current_stale_basis: currentBasis ? pass("current_same_session_correction_basis")
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
      && context?.payload?.consequence === "low"
      ? pass("low_consequence_spontaneous_practice")
      : fail("delayed_trial_consequence_not_low"),
    current_applicability:
      direct.state.currentApplicability === "applicable_to_exact_current_session"
      && direct.state.futureApplicability === "not_established"
      ? pass("current_exact_session_supports_bounded_trial")
      : fail("correction_not_current_for_delayed_activation"),
    retention_basis: controls.retention?.payload?.value === "named_formal_run"
      && activeProductionTrial.currentStatus === "active"
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

function indexRecords(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.relations)) {
    throw checkpointError("CP-DELAY-ACTIVE snapshot is malformed.");
  }
  const records = new Map();
  for (const record of snapshot.records) {
    if (records.has(record.reference)) {
      throw checkpointError("CP-DELAY-ACTIVE record identity is ambiguous.");
    }
    records.set(record.reference, record);
  }
  return records;
}

function uniqueCreator(snapshot, record) {
  const claimants = snapshot.records.filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
    || candidate.resultReferences?.includes(record?.reference)
  ));
  if (claimants.length !== 1
    || claimants[0].reference !== record?.createdByTransitionRef
    || claimants[0].resultReferences.filter(
      (reference) => reference === record.reference
    ).length !== 1) {
    throw checkpointError("CP-DELAY-ACTIVE creator identity is ambiguous.");
  }
  return claimants[0];
}

function hasExactRoleReferences(relations, pairs, relationKind) {
  return relations.length === pairs.length && pairs.every(([reference, role]) => (
    relations.some((relation) => relation.relationKind === relationKind
      && relation.toRef === reference && relation.targetRole === role)
  ));
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

function checkpointError(message) {
  const error = new Error(message);
  error.name = "EvaluationCheckpointError";
  return error;
}
