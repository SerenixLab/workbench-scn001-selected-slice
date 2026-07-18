import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";
import {
  resolveUniqueCreatingTransition,
  validateRetainedInputFact
} from "./retainedStateClosure.js";

export const IMMEDIATE_CORRECTION_BEHAVIOR = "immediate_correction";

export const FOCUSED_DRILL_SCOPE = Object.freeze({
  activity: "japanese_practice",
  taskMode: "focused_production_drill",
  surfaceLabel: "text_simulated",
  consequence: "low"
});

export const FOCUSED_DRILL_ITEM_REFS = Object.freeze([
  "DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"
]);

const INSTRUCTION_KEYS = Object.freeze([
  "reference", "family", "origin", "instructionType", "activeTrialRef",
  "sourceCommunicationRef", "attributedAssertionRef", "sourceActorRef", "contextRef",
  "drillScope", "requestedBehavior", "authority", "applicability", "globalPreference",
  "statusOrigin", "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const DISPOSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "dispositionType", "activeTrialRef", "instructionRef",
  "contextRef", "drillScope", "requestedBehavior", "behaviorStatus", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const OUTCOME_KEYS = Object.freeze([
  "reference", "family", "origin", "outcomeType", "activeTrialRef", "instructionRef",
  "behaviorDispositionRef", "realizationFactRef", "realizationTransitionRef",
  "observationRef", "feedbackRef", "outcomeIngestionTransitionRef", "observedPerformance",
  "feedbackClassification", "interventionConditioning", "coInterventionStatus",
  "causalScope", "longTermEfficacy", "globalPreference",
  "spontaneousProductionApplicability", "futureApplicability", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const TRANSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "transitionKind", "interactionRef",
  "inputReferences", "resultReferences", "createdOrder", "result"
]);

export function deriveFocusedDrillDecisionParticipants({
  records, relations, sourceFactBindings, interaction, interactionFacts, activeTrial,
  validateActiveTrial
}) {
  validateFocusedActiveTrial(records, activeTrial?.reference, validateActiveTrial);
  const contexts = interactionFacts.filter((fact) => fact?.role === "context_label");
  const requests = interactionFacts.filter((fact) => (
    fact?.role === "communication" && isImmediateCorrectionRequest(fact.payload)
  ));
  if (contexts.length !== 1 || !isExactFocusedDrillContext(contexts[0]?.payload)
    || requests.length !== 1) {
    return undefined;
  }
  const context = contexts[0];
  const communication = requests[0];
  if (activeTrial.interactionRef === interaction.reference
    || records.get(activeTrial.createdByTransitionRef)?.createdOrder >= context.createdOrder) {
    return undefined;
  }
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: context, origin: "fixture",
    role: "context_label", interaction, expectedSourceActor: "fixture-driver"
  });
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: communication, origin: "fixture",
    role: "communication", interaction, expectedSourceActor: "synthetic-user-a"
  });
  const assertions = [...records.values()].filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication.reference
    && record.statusOrigin === "sut_transition"
  ));
  if (assertions.length !== 1) {
    throw new SutStateIntegrityError(
      "Focused-drill instruction requires one exact current SUT attribution."
    );
  }
  const assertionInteraction = records.get(assertions[0].interactionRef);
  const assertion = validateFocusedDrillAttribution(
    records, relations, assertions[0], communication, assertionInteraction
  );
  const matchingInstructions = [...records.values()].filter((record) => (
    record.family === "focused_drill_instruction"
    && record.activeTrialRef === activeTrial.reference
    && record.sourceCommunicationRef === communication.reference
    && record.contextRef === context.reference
  ));
  if (matchingInstructions.length > 1) {
    throw new SutStateIntegrityError(
      "Multiple focused-drill instructions claim one exact current request."
    );
  }
  if (matchingInstructions.length === 1) {
    const instruction = validateFocusedDrillInstructionClosure({
      records, relations, sourceFactBindings, instruction: matchingInstructions[0],
      validateActiveTrial
    });
    const dispositions = [...records.values()].filter((record) => (
      record.family === "focused_drill_behavior_disposition"
      && record.instructionRef === instruction.reference
    ));
    if (dispositions.length !== 1) {
      throw new SutStateIntegrityError(
        "Focused-drill instruction replay requires one exact behavior disposition."
      );
    }
    return {
      kind: "reuse",
      instruction,
      disposition: validateFocusedDrillDispositionClosure({
        records, relations, sourceFactBindings, disposition: dispositions[0],
        validateActiveTrial
      })
    };
  }
  if (assertion.interactionRef !== interaction.reference) {
    throw new SutStateIntegrityError(
      "Focused-drill instruction cannot be reconstructed from a prior attribution."
    );
  }
  return {
    kind: "create",
    activeTrial,
    context,
    communication,
    assertion,
    sourceActorRef: communication.sourceActorRef,
    drillScope: focusedDrillScopeFrom(context.payload)
  };
}

export function validateFocusedDrillInstructionClosure({
  records, relations, sourceFactBindings, instruction, validateActiveTrial
}) {
  const transition = resolveUniqueCreatingTransition(
    records, instruction, "Focused-drill instruction"
  );
  const activeTrial = validateFocusedActiveTrial(
    records, instruction?.activeTrialRef, validateActiveTrial
  );
  const context = records.get(instruction?.contextRef);
  const communication = records.get(instruction?.sourceCommunicationRef);
  const assertion = records.get(instruction?.attributedAssertionRef);
  const interaction = records.get(instruction?.interactionRef);
  const actor = records.get(instruction?.sourceActorRef);
  const attributionTransition = records.get(assertion?.createdByTransitionRef);
  const sourceRelations = relations.filter((relation) => (
    relation.fromRef === instruction?.reference && relation.relationKind === "source"
  ));
  const basisRelations = relations.filter((relation) => (
    relation.fromRef === instruction?.reference && relation.relationKind === "basis"
  ));
  const expectedBasis = [
    [activeTrial?.reference, "active_production_trial"],
    [context?.reference, "current_focused_drill_context"],
    [communication?.reference, "explicit_request_communication"],
    [assertion?.reference, "attributed_current_request"]
  ];
  const competing = [...records.values()].filter((record) => (
    record.family === "focused_drill_instruction"
    && record.activeTrialRef === instruction?.activeTrialRef
    && record.sourceCommunicationRef === instruction?.sourceCommunicationRef
    && record.contextRef === instruction?.contextRef
  ));
  if (!hasExactKeys(instruction, INSTRUCTION_KEYS)
    || instruction.family !== "focused_drill_instruction" || instruction.origin !== "sut"
    || instruction.instructionType !== "explicit_current_focused_drill_correction"
    || instruction.requestedBehavior !== IMMEDIATE_CORRECTION_BEHAVIOR
    || instruction.authority !== "explicit_expected_user_request"
    || instruction.applicability !== "exact_current_focused_drill_only"
    || instruction.globalPreference !== "not_established"
    || instruction.statusOrigin !== "sut_transition"
    || !isDeepStrictEqual(instruction.drillScope, FOCUSED_DRILL_SCOPE)
    || competing.length !== 1 || competing[0].reference !== instruction.reference
    || activeTrial?.family !== "active_trial" || activeTrial.origin !== "sut"
    || activeTrial.trialType !== "production_focused_practice"
    || activeTrial.currentStatus !== "active"
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || context?.firstInteractionRef !== interaction.reference
    || communication?.firstInteractionRef !== interaction.reference
    || instruction.sourceActorRef !== communication?.sourceActorRef
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || !isExactFocusedDrillContext(context?.payload)
    || !isImmediateCorrectionRequest(communication?.payload)
    || !isDeepStrictEqual(instruction.drillScope, focusedDrillScopeFrom(context.payload))
    || validateFocusedDrillAttribution(
      records, relations, assertion, communication, interaction
    ).reference !== assertion.reference
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_focused_drill_instruction"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "focused_drill_instruction_derived"
    || !isDeepStrictEqual(transition.inputReferences, expectedBasis.map(([ref]) => ref))
    || !isDeepStrictEqual(transition.resultReferences, [instruction.reference])
    || sourceRelations.length !== 1 || sourceRelations[0].toRef !== actor.reference
    || sourceRelations[0].targetRole !== "semantic_source"
    || sourceRelations[0].assertedByRole !== "sut"
    || sourceRelations[0].effectiveOrder !== instruction.createdOrder
    || sourceRelations[0].createdOrder !== transition.createdOrder
    || !hasExactRoleReferencePairs(basisRelations, expectedBasis)
    || basisRelations.some((relation) => relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== instruction.createdOrder
      || relation.createdOrder !== transition.createdOrder)
    || records.get(activeTrial.createdByTransitionRef)?.createdOrder >= context.createdOrder
    || attributionTransition?.createdOrder >= instruction.createdOrder
    || instruction.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Focused-drill instruction closure is malformed.");
  }
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: context, origin: "fixture",
    role: "context_label", interaction, expectedSourceActor: "fixture-driver"
  });
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: communication, origin: "fixture",
    role: "communication", interaction, expectedSourceActor: "synthetic-user-a"
  });
  return instruction;
}

export function validateFocusedDrillDispositionClosure({
  records, relations, sourceFactBindings, disposition, validateActiveTrial
}) {
  const transition = resolveUniqueCreatingTransition(
    records, disposition, "Focused-drill behavior disposition"
  );
  const instruction = validateFocusedDrillInstructionClosure({
    records, relations, sourceFactBindings,
    instruction: records.get(disposition?.instructionRef), validateActiveTrial
  });
  const activeTrial = records.get(disposition?.activeTrialRef);
  const context = records.get(disposition?.contextRef);
  const basisRelations = relations.filter((relation) => (
    relation.fromRef === disposition?.reference && relation.relationKind === "basis"
  ));
  const expectedBasis = [
    [activeTrial?.reference, "active_production_trial"],
    [context?.reference, "current_focused_drill_context"],
    [instruction?.reference, "explicit_focused_drill_instruction"]
  ];
  const competing = [...records.values()].filter((record) => (
    record.family === "focused_drill_behavior_disposition"
    && record.instructionRef === disposition?.instructionRef
  ));
  if (!hasExactKeys(disposition, DISPOSITION_KEYS)
    || disposition.family !== "focused_drill_behavior_disposition"
    || disposition.origin !== "sut"
    || disposition.dispositionType !== "current_focused_drill_correction_behavior"
    || disposition.activeTrialRef !== instruction.activeTrialRef
    || disposition.contextRef !== instruction.contextRef
    || disposition.requestedBehavior !== IMMEDIATE_CORRECTION_BEHAVIOR
    || disposition.behaviorStatus !== "requested_for_exact_current_drill"
    || disposition.statusOrigin !== "sut_transition"
    || disposition.interactionRef !== instruction.interactionRef
    || !isDeepStrictEqual(disposition.drillScope, instruction.drillScope)
    || competing.length !== 1 || competing[0].reference !== disposition.reference
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_focused_drill_behavior_disposition"
    || transition.interactionRef !== disposition.interactionRef
    || transition.result !== "focused_drill_behavior_disposition_derived"
    || !isDeepStrictEqual(transition.inputReferences, expectedBasis.map(([ref]) => ref))
    || !isDeepStrictEqual(transition.resultReferences, [disposition.reference])
    || !hasExactRoleReferencePairs(basisRelations, expectedBasis)
    || basisRelations.some((relation) => relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== disposition.createdOrder
      || relation.createdOrder !== transition.createdOrder)
    || records.get(instruction.createdByTransitionRef)?.createdOrder >= disposition.createdOrder
    || disposition.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Focused-drill behavior disposition closure is malformed.");
  }
  return disposition;
}

export function resolveFocusedDrillRealizationClosure({
  records, relations, sourceFactBindings, dispositionRef, expectedFactRef,
  validateActiveTrial
}) {
  const disposition = validateFocusedDrillDispositionClosure({
    records, relations, sourceFactBindings, disposition: records.get(dispositionRef),
    validateActiveTrial
  });
  const realizationRelations = relations.filter((relation) => (
    relation.relationKind === "realization" && relation.toRef === disposition.reference
  ));
  const transitions = [...records.values()].filter((record) => (
    record.transitionKind === "record_focused_drill_realization"
    && record.inputReferences?.includes(disposition.reference)
  ));
  if (realizationRelations.length === 0 && transitions.length === 0) return undefined;
  if (realizationRelations.length !== 1 || transitions.length !== 1) {
    throw new SutStateIntegrityError(
      "Focused-drill realization evidence is malformed or ambiguous."
    );
  }
  const relation = realizationRelations[0];
  const transition = transitions[0];
  const fact = records.get(relation.fromRef);
  const interaction = records.get(transition.interactionRef);
  const firstInteraction = records.get(fact?.firstInteractionRef);
  const ingestion = validateExactInputIngestionClosure({
    records,
    relations,
    interaction: firstInteraction,
    expectedInputRefs: [fact?.reference],
    label: "Focused-drill realization"
  });
  const bases = relations.filter((candidate) => (
    candidate.fromRef === transition.reference && candidate.relationKind === "basis"
  ));
  const expectedBasis = [
    [fact?.reference, "simulator_behavior_realization_fact"],
    [disposition.reference, "requested_focused_drill_disposition"]
  ];
  if (fact?.family !== "input_fact" || fact.origin !== "simulator"
    || fact.role !== "simulator_behavior_realization"
    || fact.payload?.requestedRef !== disposition.reference
    || fact.payload.requestedBehavior !== disposition.requestedBehavior
    || !validRealizationResult(fact.payload)
    || (expectedFactRef && fact.reference !== expectedFactRef)
    || interaction?.reference !== firstInteraction?.reference
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || !isDeepStrictEqual(interaction.inputReferences, [fact.reference])
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.result !== "focused_drill_realization_recorded"
    || !isDeepStrictEqual(transition.inputReferences, [fact.reference, disposition.reference])
    || transition.resultReferences?.length !== 0
    || !hasExactRoleReferencePairs(bases, expectedBasis)
    || bases.some((basis) => basis.assertedByRole !== "sut"
      || basis.effectiveOrder !== transition.createdOrder
      || basis.createdOrder !== transition.createdOrder)
    || relation.targetRole !== "focused_drill_behavior_disposition"
    || relation.assertedByRole !== "sut" || relation.fromRef === relation.toRef
    || relation.effectiveOrder !== transition.createdOrder
    || relation.createdOrder !== transition.createdOrder
    || records.get(disposition.createdByTransitionRef)?.createdOrder >= fact.createdOrder
    || fact.createdOrder >= firstInteraction.createdOrder
    || firstInteraction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Focused-drill realization closure is malformed.");
  }
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact, origin: "simulator",
    role: "simulator_behavior_realization", interaction,
    expectedSourceActor: "simulated-dependency"
  });
  return { disposition, fact, transition, relation };
}

export function deriveFocusedDrillOutcomeParticipants({
  records, relations, sourceFactBindings, interaction, interactionFacts,
  realizationClosures, validateActiveTrial
}) {
  const observations = interactionFacts.filter((fact) => (
    fact?.role === "task_observation" && isExactFocusedDrillObservation(fact.payload)
  ));
  const feedbackFacts = interactionFacts.filter((fact) => (
    fact?.role === "outcome_fact" && isExactFocusedDrillFeedback(fact.payload)
  ));
  if (observations.length === 0 && feedbackFacts.length === 0) return undefined;
  if (observations.length !== 1 || feedbackFacts.length !== 1
    || interaction.inputReferences.length !== 2) {
    return undefined;
  }
  const observation = observations[0];
  const feedback = feedbackFacts[0];
  const existing = [...records.values()].filter((record) => (
    record.family === "focused_drill_outcome"
    && record.observationRef === observation.reference
    && record.feedbackRef === feedback.reference
  ));
  if (existing.length > 1) {
    throw new SutStateIntegrityError(
      "Multiple short-term focused-drill outcomes claim one exact observation and feedback."
    );
  }
  if (existing.length === 1) {
    return {
      kind: "reuse",
      outcome: validateFocusedDrillOutcomeClosure({
        records, relations, sourceFactBindings, outcome: existing[0], validateActiveTrial
      })
    };
  }
  const available = realizationClosures.filter((closure) => {
    const matchingOutcomes = [...records.values()].filter((record) => (
      record.family === "focused_drill_outcome"
      && record.behaviorDispositionRef === closure.disposition.reference
    ));
    return matchingOutcomes.length === 0;
  });
  if (available.length !== 1) {
    if (available.length > 1) {
      throw new SutStateIntegrityError(
        "Focused-drill outcome cannot select among competing matched realizations."
      );
    }
    return undefined;
  }
  const realization = available[0];
  if (!isMatchedImmediateRealization(realization.fact.payload)) return undefined;
  const disposition = realization.disposition;
  const instruction = validateFocusedDrillInstructionClosure({
    records, relations, sourceFactBindings,
    instruction: records.get(disposition.instructionRef), validateActiveTrial
  });
  const activeTrial = records.get(disposition.activeTrialRef);
  if (observation.payload.dimension !== activeTrial?.activeScope?.dimension) return undefined;
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: observation, origin: "fixture",
    role: "task_observation", interaction, expectedSourceActor: "fixture-scorer"
  });
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: feedback, origin: "fixture",
    role: "outcome_fact", interaction, expectedSourceActor: "synthetic-user-a"
  });
  const ingestion = records.get(interaction.createdByTransitionRef);
  if (realization.transition.createdOrder >= observation.createdOrder
    || interaction.createdOrder >= ingestion?.createdOrder) {
    throw new SutStateIntegrityError(
      "Focused-drill outcome requires realization before exact outcome ingestion."
    );
  }
  return {
    kind: "create",
    activeTrial,
    instruction,
    disposition,
    realization,
    observation,
    feedback,
    interaction,
    ingestion
  };
}

export function validateFocusedDrillOutcomeClosure({
  records, relations, sourceFactBindings, outcome, validateActiveTrial
}) {
  const transition = resolveUniqueCreatingTransition(
    records, outcome, "Focused-drill short-term outcome"
  );
  const activeTrial = records.get(outcome?.activeTrialRef);
  const disposition = validateFocusedDrillDispositionClosure({
    records, relations, sourceFactBindings,
    disposition: records.get(outcome?.behaviorDispositionRef), validateActiveTrial
  });
  const instruction = validateFocusedDrillInstructionClosure({
    records, relations, sourceFactBindings,
    instruction: records.get(outcome?.instructionRef), validateActiveTrial
  });
  const realization = resolveFocusedDrillRealizationClosure({
    records, relations, sourceFactBindings,
    dispositionRef: disposition.reference,
    expectedFactRef: outcome?.realizationFactRef,
    validateActiveTrial
  });
  const observation = records.get(outcome?.observationRef);
  const feedback = records.get(outcome?.feedbackRef);
  const interaction = records.get(outcome?.interactionRef);
  const ingestion = validateExactInputIngestionClosure({
    records,
    relations,
    interaction,
    expectedInputRefs: [observation?.reference, feedback?.reference],
    label: "Focused-drill outcome"
  });
  const outcomeRelations = relations.filter((relation) => (
    relation.fromRef === outcome?.reference && relation.relationKind === "outcome"
  ));
  const expectedParticipants = [
    [activeTrial?.reference, "active_production_trial"],
    [instruction.reference, "explicit_focused_drill_instruction"],
    [disposition.reference, "focused_drill_behavior_disposition"],
    [realization?.fact.reference, "matched_simulator_realization"],
    [realization?.transition.reference, "realization_transition_evidence"],
    [observation?.reference, "focused_drill_observation"],
    [feedback?.reference, "current_user_feedback"],
    [interaction?.reference, "outcome_interaction"],
    [ingestion?.reference, "outcome_ingestion"]
  ];
  const expectedInputs = expectedParticipants.map(([reference]) => reference);
  const competing = [...records.values()].filter((record) => (
    record.family === "focused_drill_outcome"
    && record.behaviorDispositionRef === outcome?.behaviorDispositionRef
  ));
  if (!hasExactKeys(outcome, OUTCOME_KEYS)
    || outcome.family !== "focused_drill_outcome" || outcome.origin !== "sut"
    || outcome.outcomeType !== "short_term_intervention_conditioned_focused_drill"
    || outcome.activeTrialRef !== disposition.activeTrialRef
    || outcome.instructionRef !== disposition.instructionRef
    || outcome.realizationTransitionRef !== realization?.transition.reference
    || !isMatchedImmediateRealization(realization?.fact.payload)
    || !isExactFocusedDrillObservation(observation?.payload)
    || observation.payload.dimension !== activeTrial?.activeScope?.dimension
    || !isExactFocusedDrillFeedback(feedback?.payload)
    || outcome.feedbackClassification !== "positive_current_drill_feedback"
    || outcome.interventionConditioning
      !== "immediate_correction_followed_by_supplied_drill_observation_and_feedback"
    || outcome.coInterventionStatus !== "none_supplied"
    || outcome.causalScope !== "association_only_for_exact_intervention_conditioned_drill"
    || outcome.longTermEfficacy !== "not_established"
    || outcome.globalPreference !== "not_established"
    || outcome.spontaneousProductionApplicability !== "not_established"
    || outcome.futureApplicability !== "not_established"
    || outcome.statusOrigin !== "sut_transition"
    || !isDeepStrictEqual(outcome.observedPerformance, { correctCount: 5, totalCount: 6 })
    || competing.length !== 1 || competing[0].reference !== outcome.reference
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || !isDeepStrictEqual(interaction.inputReferences, [observation.reference, feedback.reference])
    || outcome.outcomeIngestionTransitionRef !== interaction.createdByTransitionRef
    || outcome.outcomeIngestionTransitionRef !== ingestion.reference
    || ingestion?.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "record_short_term_focused_drill_outcome"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "short_term_focused_drill_outcome_recorded"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
    || !isDeepStrictEqual(transition.resultReferences, [outcome.reference])
    || !hasExactRoleReferencePairs(outcomeRelations, expectedParticipants)
    || outcomeRelations.some((relation) => relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== outcome.createdOrder
      || relation.createdOrder !== transition.createdOrder)
    || realization.transition.createdOrder >= observation.createdOrder
    || observation.createdOrder >= interaction.createdOrder
    || feedback.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= outcome.createdOrder
    || outcome.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Focused-drill short-term outcome closure is malformed.");
  }
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: observation, origin: "fixture",
    role: "task_observation", interaction, expectedSourceActor: "fixture-scorer"
  });
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact: feedback, origin: "fixture",
    role: "outcome_fact", interaction, expectedSourceActor: "synthetic-user-a"
  });
  return outcome;
}

export function isExactFocusedDrillContext(payload) {
  return payload?.activity === FOCUSED_DRILL_SCOPE.activity
    && payload.taskMode === FOCUSED_DRILL_SCOPE.taskMode
    && payload.surfaceLabel === FOCUSED_DRILL_SCOPE.surfaceLabel
    && payload.consequence === FOCUSED_DRILL_SCOPE.consequence;
}

export function isMatchedImmediateRealization(payload) {
  return payload?.requestedBehavior === IMMEDIATE_CORRECTION_BEHAVIOR
    && payload.realizedBehavior === IMMEDIATE_CORRECTION_BEHAVIOR
    && payload.fidelity === "match" && payload.mismatchOrigin === null;
}

function validateFocusedDrillAttribution(records, relations, assertion, communication, interaction) {
  const transition = resolveUniqueCreatingTransition(
    records, assertion, "Focused-drill request attribution"
  );
  const ingestion = resolveUniqueCreatingTransition(
    records, interaction, "Focused-drill request attribution ingestion"
  );
  const actor = records.get(assertion?.sourceActorRef);
  const sourceRelations = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "source"
  ));
  const basisRelations = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "basis"
  ));
  const competingAssertions = [...records.values()].filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication?.reference
    && record.statusOrigin === "sut_transition"
  ));
  if (!hasExactKeys(assertion, [
    "reference", "family", "origin", "sourceCommunicationRef", "sourceActorRef",
    "context", "occurrenceOrder", "epistemicStatus", "statusOrigin", "interactionRef",
    "createdOrder", "createdByTransitionRef"
  ]) || assertion.family !== "attributed_assertion" || assertion.origin !== "sut"
    || assertion.sourceCommunicationRef !== communication.reference
    || assertion.sourceActorRef !== communication.sourceActorRef
    || assertion.context !== communication.payload.context
    || assertion.occurrenceOrder !== communication.payload.occurrenceOrder
    || assertion.epistemicStatus !== "attributed_user_assertion"
    || assertion.statusOrigin !== "sut_transition"
    || assertion.interactionRef !== interaction.reference
    || competingAssertions.length !== 1
    || competingAssertions[0].reference !== assertion.reference
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "attribute_current_communications"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "accepted"
    || !isDeepStrictEqual(transition.inputReferences, [communication.reference])
    || !isDeepStrictEqual(transition.resultReferences, [assertion.reference])
    || sourceRelations.length !== 1 || sourceRelations[0].toRef !== actor.reference
    || sourceRelations[0].targetRole !== "semantic_source"
    || sourceRelations[0].assertedByRole !== "sut"
    || sourceRelations[0].effectiveOrder !== assertion.createdOrder
    || sourceRelations[0].createdOrder !== transition.createdOrder
    || basisRelations.length !== 1 || basisRelations[0].toRef !== communication.reference
    || basisRelations[0].targetRole !== "attributed_communication"
    || basisRelations[0].assertedByRole !== "sut"
    || basisRelations[0].effectiveOrder !== assertion.createdOrder
    || basisRelations[0].createdOrder !== transition.createdOrder
    || communication.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= assertion.createdOrder
    || assertion.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Focused-drill request attribution closure is malformed.");
  }
  return assertion;
}

function isImmediateCorrectionRequest(payload) {
  return payload?.semanticStatusOrigin === "unclassified"
    && normalize(payload.content) === "please correct me right away during this drill."
    && payload.context === "focused_production_drill";
}

function isExactFocusedDrillObservation(payload) {
  return payload?.taskMode === "focused_production_drill"
    && isDeepStrictEqual(payload.itemRefs, FOCUSED_DRILL_ITEM_REFS)
    && isDeepStrictEqual(payload.performance, {
      kind: "aggregate", correctCount: 5, totalCount: 6
    });
}

function isExactFocusedDrillFeedback(payload) {
  return payload?.observation === "That helped for this drill."
    && payload.context === "focused_production_drill";
}

function validRealizationResult(payload) {
  return payload?.requestedBehavior === IMMEDIATE_CORRECTION_BEHAVIOR
    && ((payload.fidelity === "match"
      && payload.realizedBehavior === IMMEDIATE_CORRECTION_BEHAVIOR
      && payload.mismatchOrigin === null)
      || (payload.fidelity === "mismatch"
        && payload.realizedBehavior !== IMMEDIATE_CORRECTION_BEHAVIOR
        && typeof payload.mismatchOrigin === "string"
        && payload.mismatchOrigin.length > 0));
}

function validateFocusedActiveTrial(records, activeTrialRef, validateActiveTrial) {
  if (typeof validateActiveTrial !== "function") {
    throw new SutStateIntegrityError(
      "Focused-drill validation requires the RunState active-trial authority."
    );
  }
  const activeTrial = records.get(activeTrialRef);
  const validated = validateActiveTrial(activeTrial);
  if (validated?.reference !== activeTrialRef) {
    throw new SutStateIntegrityError(
      "Focused-drill state requires its exact active production-trial foundation."
    );
  }
  return validated;
}

function validateExactInputIngestionClosure({
  records, relations, interaction, expectedInputRefs, label
}) {
  const ingestion = resolveUniqueCreatingTransition(records, interaction, `${label} ingestion`);
  const bases = relations.filter((relation) => (
    relation.fromRef === ingestion?.reference && relation.relationKind === "basis"
  ));
  if (!hasExactKeys(interaction, [
    "reference", "family", "origin", "inputReferences", "createdOrder",
    "createdByTransitionRef"
  ]) || interaction.family !== "interaction_segment" || interaction.origin !== "sut"
    || interaction.createdByTransitionRef !== ingestion?.reference
    || !isDeepStrictEqual(interaction.inputReferences, expectedInputRefs)
    || new Set(interaction.inputReferences).size !== interaction.inputReferences.length
    || !hasExactKeys(ingestion, TRANSITION_KEYS)
    || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || !isDeepStrictEqual(ingestion.inputReferences, expectedInputRefs)
    || new Set(ingestion.inputReferences).size !== ingestion.inputReferences.length
    || !isDeepStrictEqual(ingestion.resultReferences, [interaction.reference])
    || ingestion.result !== "accepted"
    || bases.length !== expectedInputRefs.length
    || !hasExactRoleReferencePairs(
      bases, expectedInputRefs.map((reference) => [reference, "ingested_input"])
    )
    || bases.some((relation) => relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== ingestion.createdOrder
      || relation.createdOrder !== ingestion.createdOrder)) {
    throw new SutStateIntegrityError(`${label} ingestion closure is malformed.`);
  }
  return ingestion;
}

function focusedDrillScopeFrom(payload) {
  return {
    activity: payload.activity,
    taskMode: payload.taskMode,
    surfaceLabel: payload.surfaceLabel,
    consequence: payload.consequence
  };
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function hasExactRoleReferencePairs(relations, expectedPairs) {
  if (relations.length !== expectedPairs.length) return false;
  const actual = relations.map((relation) => `${relation.targetRole}:${relation.toRef}`).sort();
  const expected = expectedPairs.map(([reference, role]) => `${role}:${reference}`).sort();
  return isDeepStrictEqual(actual, expected);
}

function normalize(value) {
  return typeof value === "string"
    ? value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
    : "";
}
