import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";
import {
  resolveUniqueCreatingTransition,
  validateRetainedInputFact
} from "./retainedStateClosure.js";

export const TURN_COMPLETION_CORRECTION_BEHAVIOR = "turn_completion_correction";

export const DIRECT_CORRECTION_SCOPE = Object.freeze({
  activity: "japanese_practice",
  taskMode: "spontaneous_production",
  surfaceLabel: "voice_simulated",
  consequence: "low",
  realVoiceStack: "absent",
  scenarioDay: 138,
  sessionId: "spontaneous-correction-current"
});

const CONTROL_STATE_KEYS = Object.freeze([
  "reference", "family", "origin", "controlType", "authority",
  "interpretedTarget", "requestedBehavior", "correctionTiming", "activity",
  "taskMode", "surfaceLabel", "sessionScope", "currentApplicability",
  "futureApplicability", "globalPreference", "sourceCommunicationRef",
  "attributedAssertionRef", "sourceActorRef", "contextRef", "interruptionEventRef",
  "chronologyRef", "controlBasisRefs", "interactionRef", "ingestionTransitionRef",
  "statusOrigin", "createdOrder", "effectiveOrder", "createdByTransitionRef"
]);

const DISPOSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "dispositionType", "correctionControlRef",
  "contextRef", "requestedBehavior", "behaviorEffect", "sessionScope",
  "futureApplicability", "globalPolicy", "durableAdaptation", "statusOrigin",
  "interactionRef", "createdOrder", "effectiveOrder", "createdByTransitionRef"
]);

const CONTROL_REQUIREMENTS = Object.freeze({
  user_governed_constraints: "exhaustive_selected_slice_scope",
  consequence: "low",
  reversibility: "reversible"
});

export function deriveDirectCorrectionParticipants({
  records, relations, sourceFactBindings, interaction, interactionFacts
}) {
  const directMaterial = interactionFacts.filter((fact) => (
    fact?.role === "fixture_evidence"
    || fact?.role === "chronology_fact" && isDirectChronology(fact.payload)
    || fact?.role === "context_label" && isExactDirectContext(fact.payload)
    || fact?.role === "communication" && isDirectCorrectionTarget(fact.payload)
  ));
  if (directMaterial.length === 0) return undefined;

  const contexts = interactionFacts.filter((fact) => (
    fact?.role === "context_label" && isExactDirectContext(fact.payload)
  ));
  const interruptions = interactionFacts.filter((fact) => (
    fact?.role === "fixture_evidence" && isExactInterruptionEvent(fact.payload)
  ));
  const chronologies = interactionFacts.filter((fact) => (
    fact?.role === "chronology_fact" && isDirectChronology(fact.payload)
  ));
  const targetCommunications = interactionFacts.filter((fact) => (
    fact?.role === "communication" && isDirectCorrectionTarget(fact.payload)
  ));
  const requests = targetCommunications.filter((fact) => isExactDirectRequest(fact.payload));
  const controls = interactionFacts.filter((fact) => fact?.role === "fixture_control_fact");
  if (contexts.length !== 1 || interruptions.length !== 1 || chronologies.length !== 1
    || targetCommunications.length !== 1 || requests.length !== 1
    || !hasExactRequiredControls(controls) || interactionFacts.length !== 7) {
    return undefined;
  }

  const context = contexts[0];
  const interruption = interruptions[0];
  const chronology = chronologies[0];
  const communication = requests[0];
  if ([context, interruption, chronology, communication].some((fact) => (
    fact.firstInteractionRef !== interaction.reference
  ))) {
    throw new SutStateIntegrityError(
      "Direct correction requires exact first-ingested current-session evidence."
    );
  }
  validateInput(records, relations, sourceFactBindings, context, interaction,
    "context_label", "fixture-driver");
  validateInput(records, relations, sourceFactBindings, interruption, interaction,
    "fixture_evidence", "fixture-driver");
  validateInput(records, relations, sourceFactBindings, chronology, interaction,
    "chronology_fact", "fixture-driver");
  validateInput(records, relations, sourceFactBindings, communication, interaction,
    "communication", "synthetic-user-a");
  for (const control of controls) {
    validateInput(records, relations, sourceFactBindings, control, interaction,
      "fixture_control_fact", "fixture-driver");
    if (control.firstInteractionRef === interaction.reference) {
      throw new SutStateIntegrityError(
        "Direct correction requires redelivery of the exact retained selected-slice controls."
      );
    }
  }

  const assertions = [...records.values()].filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication.reference
    && record.statusOrigin === "sut_transition"
  ));
  if (assertions.length !== 1) {
    throw new SutStateIntegrityError(
      "Direct correction requires one exact current SUT attribution."
    );
  }
  const assertion = validateCurrentAttribution(
    records, relations, assertions[0], communication, interaction
  );
  const existingStates = [...records.values()].filter((record) => (
    record.family === "scoped_current_correction_control"
  ));
  const exactExisting = existingStates.filter((record) => (
    record.sourceCommunicationRef === communication.reference
    && record.contextRef === context.reference
    && record.interruptionEventRef === interruption.reference
    && record.chronologyRef === chronology.reference
  ));
  if (existingStates.length > 1 || (existingStates.length === 1 && exactExisting.length !== 1)) {
    throw new SutStateIntegrityError(
      "Direct correction cannot select among competing current correction states."
    );
  }
  if (exactExisting.length === 1) {
    const correctionState = validateDirectCorrectionStateClosure({
      records, relations, sourceFactBindings, correctionState: exactExisting[0]
    });
    const dispositions = [...records.values()].filter((record) => (
      record.family === "direct_current_session_correction_disposition"
      && record.correctionControlRef === correctionState.reference
    ));
    if (dispositions.length !== 1) {
      throw new SutStateIntegrityError(
        "Direct correction replay requires one exact behavior disposition."
      );
    }
    return {
      kind: "reuse",
      correctionState,
      disposition: validateDirectCorrectionDispositionClosure({
        records, relations, sourceFactBindings, disposition: dispositions[0]
      })
    };
  }

  const ingestion = records.get(interaction.createdByTransitionRef);
  const controlBasisRefs = controlsByType(controls);
  return {
    kind: "create", context, interruption, chronology, communication, assertion,
    sourceActorRef: communication.sourceActorRef, controlBasisRefs, interaction, ingestion,
    sessionScope: directScopeFrom(context.payload)
  };
}

export function validateDirectCorrectionStateClosure({
  records, relations, sourceFactBindings, correctionState
}) {
  const transition = resolveUniqueCreatingTransition(
    records, correctionState, "Scoped current correction/control state"
  );
  const interaction = records.get(correctionState?.interactionRef);
  const ingestion = records.get(correctionState?.ingestionTransitionRef);
  const context = records.get(correctionState?.contextRef);
  const interruption = records.get(correctionState?.interruptionEventRef);
  const chronology = records.get(correctionState?.chronologyRef);
  const communication = records.get(correctionState?.sourceCommunicationRef);
  const assertion = records.get(correctionState?.attributedAssertionRef);
  const actor = records.get(correctionState?.sourceActorRef);
  const controls = Object.values(correctionState?.controlBasisRefs ?? {})
    .map((reference) => records.get(reference));
  const expectedInputs = [
    context?.reference, interruption?.reference, communication?.reference,
    assertion?.reference, chronology?.reference, ...controls.map((control) => control?.reference),
    interaction?.reference, ingestion?.reference
  ];
  const expectedBasis = [
    [context?.reference, "current_spontaneous_context"],
    [interruption?.reference, "supplied_interruption_event"],
    [communication?.reference, "explicit_current_user_correction"],
    [assertion?.reference, "attributed_current_user_correction"],
    [chronology?.reference, "current_correction_chronology"],
    [correctionState?.controlBasisRefs?.userGoverned, "user_governed_control"],
    [correctionState?.controlBasisRefs?.consequence, "consequence_control"],
    [correctionState?.controlBasisRefs?.reversibility, "reversibility_control"],
    [interaction?.reference, "current_correction_interaction"],
    [ingestion?.reference, "current_correction_ingestion"]
  ];
  const bases = relations.filter((relation) => (
    relation.fromRef === correctionState?.reference && relation.relationKind === "basis"
  ));
  const sources = relations.filter((relation) => (
    relation.fromRef === correctionState?.reference && relation.relationKind === "source"
  ));
  if (!hasExactKeys(correctionState, CONTROL_STATE_KEYS)
    || correctionState.family !== "scoped_current_correction_control"
    || correctionState.origin !== "sut"
    || correctionState.controlType !== "correction_timing_during_current_spontaneous_session"
    || correctionState.authority !== "explicit_current_user_correction"
    || correctionState.interpretedTarget !== "correction_timing_during_current_spontaneous_production_session"
    || correctionState.requestedBehavior !== "do_not_interrupt_mid_sentence_allow_turn_completion_before_correction"
    || correctionState.correctionTiming !== TURN_COMPLETION_CORRECTION_BEHAVIOR
    || correctionState.activity !== DIRECT_CORRECTION_SCOPE.activity
    || correctionState.taskMode !== DIRECT_CORRECTION_SCOPE.taskMode
    || correctionState.surfaceLabel !== DIRECT_CORRECTION_SCOPE.surfaceLabel
    || !isDeepStrictEqual(correctionState.sessionScope, directScopeFrom(context?.payload))
    || correctionState.currentApplicability !== "applicable_to_exact_current_session"
    || correctionState.futureApplicability !== "not_established"
    || correctionState.globalPreference !== "not_established"
    || correctionState.statusOrigin !== "sut_transition"
    || correctionState.effectiveOrder !== correctionState.createdOrder
    || correctionState.sourceActorRef !== communication?.sourceActorRef
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || !isExactDirectContext(context?.payload)
    || !isExactInterruptionEvent(interruption?.payload)
    || !isDirectChronology(chronology?.payload)
    || !isExactDirectRequest(communication?.payload)
    || context.firstInteractionRef !== interaction.reference
    || interruption.firstInteractionRef !== interaction.reference
    || chronology.firstInteractionRef !== interaction.reference
    || communication.firstInteractionRef !== interaction.reference
    || !hasExactRequiredControls(controls)
    || !isDeepStrictEqual(correctionState.controlBasisRefs, controlsByType(controls))
    || validateCurrentAttribution(records, relations, assertion, communication, interaction)
      !== assertion
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || !sameReferenceSet(interaction.inputReferences, [
      context.reference, interruption.reference, communication.reference,
      chronology.reference, ...controls.map((control) => control.reference)
    ])
    || interaction.inputReferences.length !== 7
    || ingestion?.reference !== interaction.createdByTransitionRef
    || ingestion?.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_scoped_current_correction_control"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "scoped_current_correction_control_derived"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
    || !isDeepStrictEqual(transition.resultReferences, [correctionState.reference])
    || !hasExactRoleReferencePairs(bases, expectedBasis)
    || bases.some((relation) => !exactRelationMetadata(
      relation, correctionState.createdOrder, transition.createdOrder, "sut"
    ))
    || sources.length !== 1 || sources[0].toRef !== actor.reference
    || sources[0].targetRole !== "semantic_source"
    || !exactRelationMetadata(
      sources[0], correctionState.createdOrder, transition.createdOrder, "sut"
    )
    || ingestion.createdOrder >= correctionState.createdOrder
    || correctionState.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Scoped current correction/control closure is malformed.");
  }
  validateInput(records, relations, sourceFactBindings, context, interaction,
    "context_label", "fixture-driver");
  validateInput(records, relations, sourceFactBindings, interruption, interaction,
    "fixture_evidence", "fixture-driver");
  validateInput(records, relations, sourceFactBindings, chronology, interaction,
    "chronology_fact", "fixture-driver");
  validateInput(records, relations, sourceFactBindings, communication, interaction,
    "communication", "synthetic-user-a");
  for (const control of controls) validateInput(
    records, relations, sourceFactBindings, control, interaction,
    "fixture_control_fact", "fixture-driver"
  );
  return correctionState;
}

export function validateDirectCorrectionDispositionClosure({
  records, relations, sourceFactBindings, disposition
}) {
  const transition = resolveUniqueCreatingTransition(
    records, disposition, "Direct current-session correction disposition"
  );
  const correctionState = validateDirectCorrectionStateClosure({
    records, relations, sourceFactBindings,
    correctionState: records.get(disposition?.correctionControlRef)
  });
  const context = records.get(disposition?.contextRef);
  const bases = relations.filter((relation) => (
    relation.fromRef === disposition?.reference && relation.relationKind === "basis"
  ));
  const competing = [...records.values()].filter((record) => (
    record.family === "direct_current_session_correction_disposition"
    && record.correctionControlRef === correctionState.reference
  ));
  if (!hasExactKeys(disposition, DISPOSITION_KEYS)
    || disposition.family !== "direct_current_session_correction_disposition"
    || disposition.origin !== "sut"
    || disposition.dispositionType !== "respect_explicit_current_correction"
    || disposition.requestedBehavior !== TURN_COMPLETION_CORRECTION_BEHAVIOR
    || disposition.behaviorEffect !== "immediate_current_session_change"
    || disposition.futureApplicability !== "not_established"
    || disposition.globalPolicy !== "not_established"
    || disposition.durableAdaptation !== "not_established"
    || disposition.statusOrigin !== "sut_transition"
    || disposition.effectiveOrder !== disposition.createdOrder
    || disposition.contextRef !== correctionState.contextRef
    || disposition.interactionRef !== correctionState.interactionRef
    || !isDeepStrictEqual(disposition.sessionScope, correctionState.sessionScope)
    || competing.length !== 1 || competing[0].reference !== disposition.reference
    || !isExactDirectContext(context?.payload)
    || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_direct_current_session_correction_disposition"
    || transition.interactionRef !== disposition.interactionRef
    || transition.result !== "direct_current_session_correction_disposition_derived"
    || !isDeepStrictEqual(transition.inputReferences, [
      correctionState.reference, context.reference
    ])
    || !isDeepStrictEqual(transition.resultReferences, [disposition.reference])
    || !hasExactRoleReferencePairs(bases, [
      [correctionState.reference, "scoped_current_correction_control"],
      [context.reference, "current_spontaneous_context"]
    ])
    || bases.some((relation) => !exactRelationMetadata(
      relation, disposition.createdOrder, transition.createdOrder, "sut"
    ))
    || correctionState.createdOrder >= disposition.createdOrder
    || disposition.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError(
      "Direct current-session correction disposition closure is malformed."
    );
  }
  return disposition;
}

export function resolveDirectCorrectionRealizationClosure({
  records, relations, sourceFactBindings, dispositionRef, expectedFactRef
}) {
  const disposition = validateDirectCorrectionDispositionClosure({
    records, relations, sourceFactBindings, disposition: records.get(dispositionRef)
  });
  const realizationRelations = relations.filter((relation) => (
    relation.relationKind === "realization"
    && (relation.toRef === disposition.reference
      || records.get(relation.fromRef)?.payload?.requestedRef === disposition.reference)
  ));
  const transitions = [...records.values()].filter((record) => (
    record.transitionKind === "record_direct_current_session_correction_realization"
    && (record.inputReferences?.includes(disposition.reference)
      || record.inputReferences?.some((reference) => (
        records.get(reference)?.payload?.requestedRef === disposition.reference
      )))
  ));
  if (realizationRelations.length === 0 && transitions.length === 0) return undefined;
  if (realizationRelations.length !== 1 || transitions.length !== 1) {
    throw new SutStateIntegrityError("Direct correction realization is malformed or ambiguous.");
  }
  const relation = realizationRelations[0];
  const transition = transitions[0];
  const fact = records.get(relation.fromRef);
  const interaction = records.get(transition.interactionRef);
  const ingestion = records.get(interaction?.createdByTransitionRef);
  const bases = relations.filter((candidate) => (
    candidate.fromRef === transition.reference && candidate.relationKind === "basis"
  ));
  if (fact?.family !== "input_fact" || fact.origin !== "simulator"
    || fact.role !== "simulator_behavior_realization"
    || fact.payload?.requestedRef !== disposition.reference
    || fact.payload.requestedBehavior !== TURN_COMPLETION_CORRECTION_BEHAVIOR
    || !validDirectRealization(fact.payload)
    || (expectedFactRef && fact.reference !== expectedFactRef)
    || interaction?.reference !== fact.firstInteractionRef
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || !isDeepStrictEqual(interaction.inputReferences, [fact.reference])
    || ingestion?.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.result !== "direct_current_session_correction_realization_recorded"
    || !isDeepStrictEqual(transition.inputReferences, [fact.reference, disposition.reference])
    || transition.resultReferences?.length !== 0
    || !hasExactRoleReferencePairs(bases, [
      [fact.reference, "simulator_behavior_realization_fact"],
      [disposition.reference, "requested_direct_correction_disposition"]
    ])
    || bases.some((basis) => !exactRelationMetadata(
      basis, transition.createdOrder, transition.createdOrder, "sut"
    ))
    || relation.toRef !== disposition.reference
    || relation.targetRole !== "direct_current_session_correction_disposition"
    || relation.assertedByRole !== "sut" || relation.fromRef === relation.toRef
    || relation.effectiveOrder !== transition.createdOrder
    || relation.createdOrder !== transition.createdOrder
    || records.get(disposition.createdByTransitionRef)?.createdOrder >= fact.createdOrder
    || fact.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Direct correction realization closure is malformed.");
  }
  validateInput(records, relations, sourceFactBindings, fact, interaction,
    "simulator_behavior_realization", "simulated-dependency", "simulator");
  return { disposition, fact, transition, relation };
}

export function isExactDirectContext(payload) {
  return payload?.activity === DIRECT_CORRECTION_SCOPE.activity
    && payload.taskMode === DIRECT_CORRECTION_SCOPE.taskMode
    && payload.surfaceLabel === DIRECT_CORRECTION_SCOPE.surfaceLabel
    && payload.consequence === DIRECT_CORRECTION_SCOPE.consequence
    && payload.realVoiceStack === DIRECT_CORRECTION_SCOPE.realVoiceStack
    && payload.scenarioDay === DIRECT_CORRECTION_SCOPE.scenarioDay
    && payload.sessionId === DIRECT_CORRECTION_SCOPE.sessionId;
}

export function isMatchedDirectRealization(payload) {
  return payload?.requestedBehavior === TURN_COMPLETION_CORRECTION_BEHAVIOR
    && payload.realizedBehavior === TURN_COMPLETION_CORRECTION_BEHAVIOR
    && payload.fidelity === "match" && payload.mismatchOrigin === null;
}

function validateCurrentAttribution(records, relations, assertion, communication, interaction) {
  const transition = resolveUniqueCreatingTransition(records, assertion, "Current correction attribution");
  const sources = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "source"
  ));
  const bases = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "basis"
  ));
  if (assertion?.family !== "attributed_assertion" || assertion.origin !== "sut"
    || assertion.sourceCommunicationRef !== communication.reference
    || assertion.sourceActorRef !== communication.sourceActorRef
    || assertion.context !== communication.payload.context
    || assertion.occurrenceOrder !== communication.payload.occurrenceOrder
    || assertion.epistemicStatus !== "attributed_user_assertion"
    || assertion.statusOrigin !== "sut_transition"
    || assertion.interactionRef !== interaction.reference
    || transition?.transitionKind !== "attribute_current_communications"
    || transition.interactionRef !== interaction.reference
    || !transition.inputReferences?.includes(communication.reference)
    || !transition.resultReferences?.includes(assertion.reference)
    || sources.length !== 1 || sources[0].toRef !== assertion.sourceActorRef
    || sources[0].targetRole !== "semantic_source"
    || !exactRelationMetadata(sources[0], assertion.createdOrder, transition.createdOrder, "sut")
    || bases.length !== 1 || bases[0].toRef !== communication.reference
    || bases[0].targetRole !== "attributed_communication"
    || !exactRelationMetadata(bases[0], assertion.createdOrder, transition.createdOrder, "sut")
    || communication.createdOrder >= assertion.createdOrder
    || assertion.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Current correction attribution closure is malformed.");
  }
  return assertion;
}

function validateInput(records, relations, sourceFactBindings, fact, interaction,
  role, sourceActor, origin = "fixture") {
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact, origin, role, interaction,
    expectedSourceActor: sourceActor
  });
}

function hasExactRequiredControls(controls) {
  if (controls.length !== 3) return false;
  const byType = new Map(controls.map((control) => [control?.payload?.control, control]));
  return byType.size === 3 && Object.entries(CONTROL_REQUIREMENTS).every(([type, value]) => (
    byType.get(type)?.payload?.value === value
  ));
}

function controlsByType(controls) {
  const byType = new Map(controls.map((control) => [control.payload.control, control.reference]));
  return {
    userGoverned: byType.get("user_governed_constraints"),
    consequence: byType.get("consequence"),
    reversibility: byType.get("reversibility")
  };
}

function isDirectCorrectionTarget(payload) {
  return payload?.semanticStatusOrigin === "unclassified"
    && payload.context === "spontaneous_production"
    && /(?:stop|interrupt).*(?:mid-sentence|finish)|(?:finish).*(?:first|before)/i
      .test(payload.content ?? "");
}

function isExactDirectRequest(payload) {
  return payload?.semanticStatusOrigin === "unclassified"
    && payload.context === "spontaneous_production"
    && normalize(payload.content)
      === "don't stop me mid-sentence like that here. let me finish first.";
}

function isExactInterruptionEvent(payload) {
  return payload?.event === "over_aggressive_mid_sentence_interruption"
    && payload.context === "current_spontaneous_production_session";
}

function isDirectChronology(payload) {
  return payload?.scenarioDay === 138
    && payload.sessionId === "spontaneous-correction-current"
    && payload.sessionOrder === 4
    && payload.focusedDrillScenarioDay === 135
    && payload.oldDrillPreferenceScenarioDay === 15;
}

function validDirectRealization(payload) {
  return isMatchedDirectRealization(payload)
    || (payload?.requestedBehavior === TURN_COMPLETION_CORRECTION_BEHAVIOR
      && payload.fidelity === "mismatch"
      && payload.realizedBehavior !== TURN_COMPLETION_CORRECTION_BEHAVIOR
      && typeof payload.mismatchOrigin === "string" && payload.mismatchOrigin.length > 0);
}

function directScopeFrom(payload) {
  return {
    activity: payload.activity,
    taskMode: payload.taskMode,
    surfaceLabel: payload.surfaceLabel,
    realVoiceStack: payload.realVoiceStack,
    scenarioDay: payload.scenarioDay,
    sessionId: payload.sessionId
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

function exactRelationMetadata(relation, effectiveOrder, createdOrder, assertedByRole) {
  return relation?.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === assertedByRole;
}

function sameReferenceSet(left, right) {
  return isDeepStrictEqual([...left].sort(), [...right].sort());
}

function normalize(value) {
  return typeof value === "string"
    ? value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
    : "";
}
