import { findExactActiveProductionTrial } from "./productionActiveCheckpoint.js";
import {
  findExactCompletedFocusedDrillPrefix,
  findExactDirectCorrectionRealization,
  validateBoundFact
} from "./directCorrectionCheckpoint.js";

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

const PROPOSED_SCOPE = Object.freeze({
  activity: "japanese_practice",
  taskMode: "spontaneous_production",
  surfaceLabel: "voice_simulated",
  correctionClass: "minor_correction",
  timing: "turn_completion",
  consequence: "low",
  excludedTaskModes: Object.freeze(["focused_production_drill"]),
  explicitImmediateCorrection: "excluded"
});

const ACTIVATION_REQUIREMENTS = Object.freeze([
  "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
  "reversibility", "consequence", "current_applicability", "retention_basis",
  "non_adaptation_boundary"
]);

export function findExactDelayedCorrectionCandidate(snapshot, sourceBindingEvidence) {
  const direct = findExactDirectCorrectionRealization(snapshot, sourceBindingEvidence);
  if (!direct) return undefined;
  const activeTrial = findExactActiveProductionTrial(snapshot, sourceBindingEvidence);
  const focused = findExactCompletedFocusedDrillPrefix(
    snapshot, sourceBindingEvidence, {
      allowDirectCorrectionState: true,
      allowDelayedCorrectionCandidate: true
    }
  );
  if (!activeTrial || !focused) return undefined;
  const candidates = snapshot.records.filter(
    (record) => record.family === "delayed_correction_candidate"
  );
  if (candidates.length === 0) return undefined;
  if (candidates.length !== 1) throw checkpointError("CP-DELAY-CANDIDATE is ambiguous.");

  const candidate = candidates[0];
  const records = indexRecords(snapshot);
  const transition = uniqueCreator(snapshot, candidate);
  const context = records.get(candidate.currentContextRef);
  const trialPolicy = records.get(candidate.trialPolicyRef);
  const interaction = records.get(candidate.interactionRef);
  const focusedRealizationTransition = records.get(focused.outcome.realizationTransitionRef);
  const expectedInputs = [
    direct.state.reference,
    direct.disposition.reference,
    direct.fact.reference,
    direct.realizationTransition.reference,
    activeTrial.reference,
    focused.instruction.reference,
    focused.disposition.reference,
    focused.realizationFact.reference,
    focusedRealizationTransition?.reference,
    focused.outcome.reference,
    context?.reference,
    trialPolicy?.reference,
    candidate.controlBasisRefs?.userGoverned,
    candidate.controlBasisRefs?.consequence,
    candidate.controlBasisRefs?.reversibility
  ];
  const expectedRelations = [
    [direct.disposition.reference, "direct_correction_disposition", "transition_ancestry"],
    [direct.state.reference, "current_correction_evidence", "basis"],
    [direct.disposition.reference, "direct_correction_disposition_basis", "basis"],
    [direct.fact.reference, "realized_current_correction", "basis"],
    [direct.realizationTransition.reference, "current_correction_realization_transition", "basis"],
    [activeTrial.reference, "retained_production_trial", "basis"],
    [focused.instruction.reference, "prior_focused_drill_instruction", "basis"],
    [focused.disposition.reference, "prior_focused_drill_disposition", "basis"],
    [focused.realizationFact.reference, "prior_focused_realization", "basis"],
    [focusedRealizationTransition?.reference, "prior_focused_realization_transition", "basis"],
    [focused.outcome.reference, "prior_focused_outcome", "basis"],
    [context?.reference, "spontaneous_production_context", "basis"],
    [trialPolicy?.reference, "bounded_trial_policy", "basis"],
    [candidate.controlBasisRefs?.userGoverned, "user_governed_control", "basis"],
    [candidate.controlBasisRefs?.consequence, "consequence_control", "basis"],
    [candidate.controlBasisRefs?.reversibility, "reversibility_control", "basis"],
    [direct.state.reference, "current_correction_support", "support"],
    [direct.fact.reference, "realized_current_correction_support", "support"],
    [focused.instruction.reference,
      "prior_focused_drill_instruction_support", "support"],
    [focused.disposition.reference,
      "prior_focused_drill_disposition_support", "support"],
    [focused.realizationFact.reference, "prior_focused_realization_support", "support"],
    [focused.outcome.reference, "prior_focused_outcome_support", "support"]
  ];
  const candidateRelations = snapshot.relations.filter(
    (relation) => relation.fromRef === candidate.reference
  );
  if (!hasExactKeys(candidate, CANDIDATE_KEYS)
    || candidate.origin !== "sut"
    || candidate.candidateType !== "zoey_derived_delayed_correction_trial"
    || candidate.materialIntent !== "delay_minor_correction_until_turn_completion"
    || candidate.sourceClass !== "zoey_derived_from_scoped_behavior_evidence"
    || candidate.purpose !== "provisional_evaluative_future_behavior_trial"
    || JSON.stringify(candidate.proposedScope) !== JSON.stringify(PROPOSED_SCOPE)
    || candidate.outcomeRelevance !== "later_spontaneous_speaking_and_pacing_observation"
    || candidate.reversibilityPath !== "restore_immediate_or_context_specific_correction"
    || candidate.lifecycleStatus !== "formed_non_active"
    || candidate.activationStatus !== "not_assessed"
    || JSON.stringify(candidate.activationRequirements)
      !== JSON.stringify(ACTIVATION_REQUIREMENTS)
    || candidate.behaviorInfluence !== "prohibited_until_activation"
    || candidate.userPreference !== "not_established"
    || candidate.globalPolicy !== "not_established"
    || candidate.durableAdaptation !== "unsupported_in_selected_slice"
    || candidate.directCorrectionStateRef !== direct.state.reference
    || candidate.directDispositionRef !== direct.disposition.reference
    || candidate.directRealizationFactRef !== direct.fact.reference
    || candidate.directRealizationTransitionRef !== direct.realizationTransition.reference
    || candidate.activeProductionTrialRef !== activeTrial.reference
    || candidate.focusedInstructionRef !== focused.instruction.reference
    || candidate.focusedDispositionRef !== focused.disposition.reference
    || candidate.focusedRealizationFactRef !== focused.realizationFact.reference
    || candidate.focusedRealizationTransitionRef !== focusedRealizationTransition?.reference
    || candidate.focusedOutcomeRef !== focused.outcome.reference
    || candidate.currentContextRef !== direct.state.contextRef
    || JSON.stringify(candidate.controlBasisRefs)
      !== JSON.stringify(direct.state.controlBasisRefs)
    || trialPolicy?.role !== "fixture_control_fact"
    || trialPolicy.payload?.control !== "trial_policy"
    || trialPolicy.payload.value !== "bounded_reversible_trial_no_durable_adaptation"
    || interaction?.reference !== direct.fact.firstInteractionRef
    || !hasExactKeys(transition, [
      "reference", "family", "origin", "transitionKind", "interactionRef",
      "inputReferences", "resultReferences", "createdOrder", "result"
    ])
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "form_delayed_correction_trial_candidate"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "delayed_correction_candidate_formed_non_active"
    || JSON.stringify(transition.inputReferences)
      !== JSON.stringify(expectedInputs)
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([candidate.reference])
    || !hasExactRelations(candidateRelations, expectedRelations)
    || candidateRelations.some((relation) => !exactRelationMetadata(
      relation, candidate.createdOrder, transition.createdOrder
    ))
    || direct.realizationTransition.createdOrder >= candidate.createdOrder
    || focusedRealizationTransition?.createdOrder >= candidate.createdOrder
    || focused.outcome.createdOrder >= candidate.createdOrder
    || candidate.createdOrder >= transition.createdOrder
    || candidate.effectiveOrder !== candidate.createdOrder
    || candidate.statusOrigin !== "sut_transition") {
    throw checkpointError("CP-DELAY-CANDIDATE exact closure is malformed.");
  }
  validateBoundFact(snapshot, sourceBindingEvidence, trialPolicy, "fixture");
  return { candidate, transition, direct, activeTrial, focused };
}

function indexRecords(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.relations)) {
    throw checkpointError("CP-DELAY-CANDIDATE snapshot is malformed.");
  }
  const records = new Map();
  for (const record of snapshot.records) {
    if (records.has(record.reference)) {
      throw checkpointError("CP-DELAY-CANDIDATE record identity is ambiguous.");
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
    throw checkpointError("CP-DELAY-CANDIDATE creator identity is ambiguous.");
  }
  return claimants[0];
}

function hasExactRelations(relations, pairs) {
  return relations.length === pairs.length && pairs.every(([reference, role, kind]) => (
    relations.some((relation) => relation.toRef === reference
      && relation.targetRole === role && relation.relationKind === kind)
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
  error.code = "SCN001_CHECKPOINT_INTEGRITY";
  return error;
}
