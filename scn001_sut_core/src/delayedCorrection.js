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
