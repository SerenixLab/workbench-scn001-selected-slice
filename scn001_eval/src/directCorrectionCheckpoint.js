import { findExactActiveProductionTrial } from "./productionActiveCheckpoint.js";

const TURN_COMPLETION = "turn_completion_correction";

const TRANSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "transitionKind", "interactionRef",
  "inputReferences", "resultReferences", "createdOrder", "result"
]);

const ATTRIBUTION_KEYS = Object.freeze([
  "reference", "family", "origin", "sourceCommunicationRef", "sourceActorRef",
  "context", "occurrenceOrder", "epistemicStatus", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const FOCUSED_INSTRUCTION_KEYS = Object.freeze([
  "reference", "family", "origin", "instructionType", "activeTrialRef",
  "sourceCommunicationRef", "attributedAssertionRef", "sourceActorRef", "contextRef",
  "drillScope", "requestedBehavior", "authority", "applicability", "globalPreference",
  "statusOrigin", "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const FOCUSED_DISPOSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "dispositionType", "activeTrialRef", "instructionRef",
  "contextRef", "drillScope", "requestedBehavior", "behaviorStatus", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const FOCUSED_SCOPE = Object.freeze({
  activity: "japanese_practice",
  taskMode: "focused_production_drill",
  surfaceLabel: "text_simulated",
  consequence: "low"
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

const FOCUSED_OUTCOME_KEYS = Object.freeze([
  "reference", "family", "origin", "outcomeType", "activeTrialRef", "instructionRef",
  "behaviorDispositionRef", "realizationFactRef", "realizationTransitionRef",
  "observationRef", "feedbackRef", "outcomeIngestionTransitionRef", "observedPerformance",
  "feedbackClassification", "interventionConditioning", "coInterventionStatus",
  "causalScope", "longTermEfficacy", "globalPreference",
  "spontaneousProductionApplicability", "futureApplicability", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

export function findExactCompletedFocusedDrillPrefix(
  snapshot, sourceBindingEvidence, { allowDirectCorrectionState = false } = {}
) {
  const activeTrial = findExactActiveProductionTrial(snapshot, sourceBindingEvidence);
  if (!activeTrial) return undefined;
  const records = indexRecords(snapshot);
  const instructions = snapshot.records.filter((record) => (
    record.family === "focused_drill_instruction" && record.activeTrialRef === activeTrial.reference
  ));
  const dispositions = snapshot.records.filter((record) => (
    record.family === "focused_drill_behavior_disposition"
      && record.activeTrialRef === activeTrial.reference
  ));
  const outcomes = snapshot.records.filter((record) => (
    record.family === "focused_drill_outcome" && record.activeTrialRef === activeTrial.reference
  ));
  if (instructions.length === 0 && dispositions.length === 0 && outcomes.length === 0) {
    return undefined;
  }
  if (instructions.length !== 1 || dispositions.length !== 1 || outcomes.length !== 1) {
    return undefined;
  }
  const instruction = instructions[0];
  const disposition = dispositions[0];
  const outcome = outcomes[0];
  const realizationFact = records.get(outcome.realizationFactRef);
  const realizationTransition = records.get(outcome.realizationTransitionRef);
  const observation = records.get(outcome.observationRef);
  const feedback = records.get(outcome.feedbackRef);
  const outcomeInteraction = records.get(outcome.interactionRef);
  const outcomeIngestion = records.get(outcome.outcomeIngestionTransitionRef);
  const instructionClosure = validateFocusedInstructionClosure(
    snapshot, sourceBindingEvidence, records, activeTrial, instruction
  );
  const dispositionClosure = validateFocusedDispositionClosure(
    snapshot, records, activeTrial, instructionClosure, disposition
  );
  const instructionTransition = instructionClosure.transition;
  const dispositionTransition = dispositionClosure.transition;
  const outcomeTransition = uniqueCreator(snapshot, outcome, "focused outcome");
  const realizationFacts = snapshot.records.filter((record) => (
    record.family === "input_fact"
    && record.origin === "simulator"
    && record.role === "simulator_behavior_realization"
    && record.payload?.requestedRef === disposition.reference
  ));
  const realizationFactRefs = new Set(realizationFacts.map((record) => record.reference));
  const realizationRelations = snapshot.relations.filter((relation) => (
    relation.relationKind === "realization"
    && (realizationFactRefs.has(relation.fromRef)
      || relation.toRef === disposition.reference)
  ));
  const realizationTransitions = snapshot.records.filter((record) => (
    record.transitionKind === "record_focused_drill_realization"
    && record.inputReferences?.includes(disposition.reference)
  ));
  const outcomeRelations = snapshot.relations.filter((relation) => (
    relation.fromRef === outcome.reference && relation.relationKind === "outcome"
  ));
  const realizationInteraction = records.get(realizationFact?.firstInteractionRef);
  const realizationIngestion = uniqueCreator(
    snapshot, realizationInteraction, "focused realization ingestion"
  );
  const realizationBases = snapshot.relations.filter((relation) => (
    relation.fromRef === realizationTransition?.reference && relation.relationKind === "basis"
  ));
  const outcomeIngestionBases = snapshot.relations.filter((relation) => (
    relation.fromRef === outcomeIngestion?.reference && relation.relationKind === "basis"
  ));
  if (realizationFacts.length !== 1
    || realizationFacts[0].reference !== realizationFact?.reference
    || realizationTransitions.length !== 1
    || realizationTransitions[0].reference !== realizationTransition?.reference
    || realizationFact?.family !== "input_fact" || realizationFact.origin !== "simulator"
    || realizationFact.role !== "simulator_behavior_realization"
    || realizationFact.payload?.requestedRef !== disposition.reference
    || realizationFact.payload.requestedBehavior !== "immediate_correction"
    || realizationFact.payload.realizedBehavior !== "immediate_correction"
    || realizationFact.payload.fidelity !== "match"
    || realizationFact.payload.mismatchOrigin !== null
    || !hasExactKeys(realizationInteraction, [
      "reference", "family", "origin", "inputReferences", "createdOrder",
      "createdByTransitionRef"
    ])
    || realizationInteraction.family !== "interaction_segment"
    || realizationInteraction.origin !== "sut"
    || JSON.stringify(realizationInteraction.inputReferences)
      !== JSON.stringify([realizationFact.reference])
    || realizationFact.firstInteractionRef !== realizationInteraction.reference
    || !hasExactKeys(realizationIngestion, TRANSITION_KEYS)
    || realizationIngestion.family !== "sut_transition_evidence"
    || realizationIngestion.origin !== "sut"
    || realizationIngestion.transitionKind !== "ingest_sut_visible_inputs"
    || realizationIngestion.interactionRef !== realizationInteraction.reference
    || JSON.stringify(realizationIngestion.inputReferences)
      !== JSON.stringify([realizationFact.reference])
    || JSON.stringify(realizationIngestion.resultReferences)
      !== JSON.stringify([realizationInteraction.reference])
    || realizationIngestion.result !== "accepted"
    || !hasExactKeys(realizationTransition, TRANSITION_KEYS)
    || realizationTransition.family !== "sut_transition_evidence"
    || realizationTransition.origin !== "sut"
    || realizationTransition.transitionKind !== "record_focused_drill_realization"
    || realizationTransition.interactionRef !== realizationInteraction.reference
    || realizationTransition.result !== "focused_drill_realization_recorded"
    || JSON.stringify(realizationTransition.inputReferences) !== JSON.stringify([
      realizationFact.reference, disposition.reference
    ])
    || JSON.stringify(realizationTransition.resultReferences) !== JSON.stringify([])
    || realizationBases.length !== 2
    || !hasExactRoleReferencePairs(realizationBases, [
      [realizationFact.reference, "simulator_behavior_realization_fact"],
      [disposition.reference, "requested_focused_drill_disposition"]
    ])
    || realizationBases.some((relation) => !exactRelationMetadata(
      relation, realizationTransition.createdOrder, realizationTransition.createdOrder, "sut"
    ))
    || realizationRelations.length !== 1
    || realizationRelations[0].fromRef !== realizationFact.reference
    || realizationRelations[0].toRef !== disposition.reference
    || realizationRelations[0].targetRole !== "focused_drill_behavior_disposition"
    || !exactRelationMetadata(
      realizationRelations[0], realizationTransition.createdOrder,
      realizationTransition.createdOrder, "sut"
    )
    || !hasExactKeys(outcome, FOCUSED_OUTCOME_KEYS)
    || outcome.family !== "focused_drill_outcome" || outcome.origin !== "sut"
    || outcome.instructionRef !== instruction.reference
    || outcome.behaviorDispositionRef !== disposition.reference
    || outcome.realizationFactRef !== realizationFact.reference
    || outcome.outcomeType !== "short_term_intervention_conditioned_focused_drill"
    || JSON.stringify(outcome.observedPerformance) !== JSON.stringify({
      correctCount: 5, totalCount: 6
    })
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
    || observation?.role !== "task_observation" || observation.origin !== "fixture"
    || JSON.stringify(observation.payload?.itemRefs) !== JSON.stringify([
      "DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"
    ])
    || observation.payload.taskMode !== "focused_production_drill"
    || observation.payload.dimension !== activeTrial.activeScope?.dimension
    || JSON.stringify(observation.payload.performance) !== JSON.stringify({
      kind: "aggregate", correctCount: 5, totalCount: 6
    })
    || observation.payload.occurrenceScenarioDay !== 135
    || observation.payload.sessionId !== "focused-drill-current"
    || observation.payload.sessionOrder !== 3
    || feedback?.role !== "outcome_fact" || feedback.origin !== "fixture"
    || feedback.payload?.observation !== "That helped for this drill."
    || feedback.payload.context !== "focused_production_drill"
    || outcomeRelations.length !== 9
    || !hasRoleReference(outcomeRelations, activeTrial.reference, "active_production_trial")
    || !hasRoleReference(outcomeRelations, instruction.reference, "explicit_focused_drill_instruction")
    || !hasRoleReference(outcomeRelations, disposition.reference, "focused_drill_behavior_disposition")
    || !hasRoleReference(outcomeRelations, realizationFact.reference, "matched_simulator_realization")
    || !hasRoleReference(
      outcomeRelations, realizationTransition.reference, "realization_transition_evidence"
    )
    || !hasRoleReference(outcomeRelations, observation.reference, "focused_drill_observation")
    || !hasRoleReference(outcomeRelations, feedback.reference, "current_user_feedback")
    || !hasRoleReference(outcomeRelations, outcomeInteraction?.reference, "outcome_interaction")
    || !hasRoleReference(outcomeRelations, outcomeIngestion?.reference, "outcome_ingestion")
    || outcomeRelations.some((relation) => !exactRelationMetadata(
      relation, outcome.createdOrder, outcomeTransition.createdOrder, "sut"
    ))
    || outcomeInteraction?.createdByTransitionRef !== outcomeIngestion?.reference
    || !hasExactKeys(outcomeInteraction, [
      "reference", "family", "origin", "inputReferences", "createdOrder",
      "createdByTransitionRef"
    ])
    || outcomeInteraction.family !== "interaction_segment" || outcomeInteraction.origin !== "sut"
    || JSON.stringify(outcomeInteraction.inputReferences) !== JSON.stringify([
      observation.reference, feedback.reference
    ])
    || !hasExactKeys(outcomeIngestion, TRANSITION_KEYS)
    || outcomeIngestion.family !== "sut_transition_evidence" || outcomeIngestion.origin !== "sut"
    || outcomeIngestion.transitionKind !== "ingest_sut_visible_inputs"
    || outcomeIngestion.interactionRef !== outcomeInteraction.reference
    || JSON.stringify(outcomeIngestion.inputReferences) !== JSON.stringify([
      observation.reference, feedback.reference
    ])
    || JSON.stringify(outcomeIngestion.resultReferences) !== JSON.stringify([
      outcomeInteraction.reference
    ])
    || outcomeIngestion.result !== "accepted"
    || outcomeIngestionBases.length !== 2
    || !hasExactRoleReferencePairs(outcomeIngestionBases, [
      [observation.reference, "ingested_input"],
      [feedback.reference, "ingested_input"]
    ])
    || outcomeIngestionBases.some((relation) => !exactRelationMetadata(
      relation, outcomeIngestion.createdOrder, outcomeIngestion.createdOrder, "sut"
    ))
    || observation.firstInteractionRef !== outcomeInteraction.reference
    || feedback.firstInteractionRef !== outcomeInteraction.reference
    || !hasExactKeys(outcomeTransition, TRANSITION_KEYS)
    || outcomeTransition.family !== "sut_transition_evidence" || outcomeTransition.origin !== "sut"
    || outcomeTransition.transitionKind !== "record_short_term_focused_drill_outcome"
    || outcomeTransition.interactionRef !== outcomeInteraction.reference
    || outcomeTransition.result !== "short_term_focused_drill_outcome_recorded"
    || JSON.stringify(outcomeTransition.inputReferences) !== JSON.stringify([
      activeTrial.reference, instruction.reference, disposition.reference,
      realizationFact.reference, realizationTransition.reference,
      observation.reference, feedback.reference, outcomeInteraction.reference,
      outcomeIngestion.reference
    ])
    || JSON.stringify(outcomeTransition.resultReferences) !== JSON.stringify([
      outcome.reference
    ])
    || !(instructionTransition.createdOrder < disposition.createdOrder
      && dispositionTransition.createdOrder < realizationFact.createdOrder
      && realizationFact.createdOrder < realizationInteraction.createdOrder
      && realizationInteraction.createdOrder < realizationIngestion.createdOrder
      && realizationIngestion.createdOrder < realizationTransition.createdOrder
      && realizationTransition.createdOrder < observation.createdOrder
      && observation.createdOrder < outcomeInteraction.createdOrder
      && feedback.createdOrder < outcomeInteraction.createdOrder
      && outcomeInteraction.createdOrder < outcomeIngestion.createdOrder
      && outcomeIngestion.createdOrder < outcome.createdOrder
      && outcome.createdOrder < outcomeTransition.createdOrder)) {
    throw checkpointError("Focused-drill prefix closure is malformed.");
  }
  validateBoundFact(snapshot, sourceBindingEvidence, realizationFact, "simulator");
  validateBoundFact(snapshot, sourceBindingEvidence, observation, "fixture");
  validateBoundFact(snapshot, sourceBindingEvidence, feedback, "fixture");
  const forbiddenLaterFamilies = [
    "delayed_correction_candidate", "active_delayed_correction_trial",
    ...(allowDirectCorrectionState ? [] : [
      "scoped_current_correction_control", "direct_current_session_correction_disposition"
    ])
  ];
  if (snapshot.records.some((record) => forbiddenLaterFamilies.includes(record.family))) {
    throw checkpointError("Focused-drill prefix must precede direct or delayed correction state.");
  }
  return { activeTrial, instruction, disposition, realizationFact, outcome, observation, feedback };
}

export function findExactDirectCorrectionRealization(snapshot, sourceBindingEvidence) {
  const records = indexRecords(snapshot);
  const states = snapshot.records.filter((record) => (
    record.family === "scoped_current_correction_control"
  ));
  const dispositions = snapshot.records.filter((record) => (
    record.family === "direct_current_session_correction_disposition"
  ));
  if (states.length === 0 && dispositions.length === 0) return undefined;
  if (states.length !== 1 || dispositions.length !== 1) {
    throw checkpointError("CP-DIRECT-CORRECTION-REALIZED requires one exact state and disposition.");
  }
  const state = states[0];
  const disposition = dispositions[0];
  const stateTransition = uniqueCreator(snapshot, state, "direct correction state");
  const dispositionTransition = uniqueCreator(snapshot, disposition, "direct disposition");
  const context = records.get(state.contextRef);
  const interruption = records.get(state.interruptionEventRef);
  const communication = records.get(state.sourceCommunicationRef);
  const assertion = records.get(state.attributedAssertionRef);
  const chronology = records.get(state.chronologyRef);
  const actor = records.get(state.sourceActorRef);
  const interaction = records.get(state.interactionRef);
  const ingestion = records.get(state.ingestionTransitionRef);
  validateExactAttribution(
    snapshot, records, assertion, communication, interaction, "current correction"
  );
  const controlRefs = Object.values(state.controlBasisRefs ?? {});
  const controls = controlRefs.map((reference) => records.get(reference));
  const controlsByType = new Map(controls.map((control) => [
    control?.payload?.control, control?.reference
  ]));
  const realizationFacts = snapshot.records.filter((record) => (
    record.family === "input_fact"
    && record.origin === "simulator"
    && record.role === "simulator_behavior_realization"
    && record.payload?.requestedRef === disposition.reference
  ));
  const realizationRelations = snapshot.relations.filter((relation) => (
    relation.relationKind === "realization"
    && (relation.toRef === disposition.reference
      || records.get(relation.fromRef)?.payload?.requestedRef === disposition.reference)
  ));
  const realizationTransitions = snapshot.records.filter((record) => (
    record.transitionKind === "record_direct_current_session_correction_realization"
    && (record.inputReferences?.includes(disposition.reference)
      || record.inputReferences?.some((reference) => (
        records.get(reference)?.payload?.requestedRef === disposition.reference
      )))
  ));
  if (realizationRelations.length === 0 && realizationTransitions.length === 0) return undefined;
  if (realizationFacts.length !== 1
    || realizationRelations.length !== 1 || realizationTransitions.length !== 1) {
    throw checkpointError("Direct realization closure is ambiguous.");
  }
  const relation = realizationRelations[0];
  const fact = realizationFacts[0];
  const realizationTransition = realizationTransitions[0];
  const factInteraction = records.get(fact?.firstInteractionRef);
  const factIngestion = records.get(factInteraction?.createdByTransitionRef);
  const stateBases = snapshot.relations.filter((candidate) => (
    candidate.fromRef === state.reference && candidate.relationKind === "basis"
  ));
  const dispositionBases = snapshot.relations.filter((candidate) => (
    candidate.fromRef === disposition.reference && candidate.relationKind === "basis"
  ));
  const realizationBases = snapshot.relations.filter((candidate) => (
    candidate.fromRef === realizationTransition.reference && candidate.relationKind === "basis"
  ));
  const stateSources = snapshot.relations.filter((candidate) => (
    candidate.fromRef === state.reference && candidate.relationKind === "source"
  ));
  const expectedStatePairs = [
    [context?.reference, "current_spontaneous_context"],
    [interruption?.reference, "supplied_interruption_event"],
    [communication?.reference, "explicit_current_user_correction"],
    [assertion?.reference, "attributed_current_user_correction"],
    [chronology?.reference, "current_correction_chronology"],
    [state.controlBasisRefs?.userGoverned, "user_governed_control"],
    [state.controlBasisRefs?.consequence, "consequence_control"],
    [state.controlBasisRefs?.reversibility, "reversibility_control"],
    [interaction?.reference, "current_correction_interaction"],
    [ingestion?.reference, "current_correction_ingestion"]
  ];
  const expectedStateInputs = [
    context?.reference, interruption?.reference, communication?.reference,
    assertion?.reference, chronology?.reference, ...controlRefs,
    interaction?.reference, ingestion?.reference
  ];
  const expectedInteractionInputs = [
    context?.reference, interruption?.reference, communication?.reference,
    chronology?.reference, ...controlRefs
  ];
  if (!hasExactKeys(state, CONTROL_STATE_KEYS)
    || !hasExactKeys(disposition, DISPOSITION_KEYS)
    || state.family !== "scoped_current_correction_control" || state.origin !== "sut"
    || state.controlType !== "correction_timing_during_current_spontaneous_session"
    || state.authority !== "explicit_current_user_correction"
    || state.interpretedTarget
      !== "correction_timing_during_current_spontaneous_production_session"
    || state.requestedBehavior
      !== "do_not_interrupt_mid_sentence_allow_turn_completion_before_correction"
    || state.correctionTiming !== TURN_COMPLETION
    || state.activity !== "japanese_practice"
    || state.taskMode !== "spontaneous_production"
    || state.surfaceLabel !== "voice_simulated"
    || state.currentApplicability !== "applicable_to_exact_current_session"
    || state.futureApplicability !== "not_established"
    || state.globalPreference !== "not_established"
    || state.statusOrigin !== "sut_transition"
    || state.effectiveOrder !== state.createdOrder
    || Object.keys(state.controlBasisRefs ?? {}).sort().join("|")
      !== ["userGoverned", "consequence", "reversibility"].sort().join("|")
    || state.controlBasisRefs.userGoverned !== controlsByType.get("user_governed_constraints")
    || state.controlBasisRefs.consequence !== controlsByType.get("consequence")
    || state.controlBasisRefs.reversibility !== controlsByType.get("reversibility")
    || state.sourceActorRef !== communication?.sourceActorRef
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || communication?.payload?.content !== "Don't stop me mid-sentence like that here. Let me finish first."
    || communication.payload.context !== "spontaneous_production"
    || assertion?.sourceCommunicationRef !== communication.reference
    || context?.payload?.activity !== "japanese_practice"
    || context.payload.taskMode !== "spontaneous_production"
    || context.payload.surfaceLabel !== "voice_simulated"
    || context.payload.realVoiceStack !== "absent"
    || context.payload.scenarioDay !== 138
    || JSON.stringify(state.sessionScope) !== JSON.stringify({
      activity: "japanese_practice", taskMode: "spontaneous_production",
      surfaceLabel: "voice_simulated", realVoiceStack: "absent",
      scenarioDay: 138, sessionId: "spontaneous-correction-current"
    })
    || interruption?.payload?.event !== "over_aggressive_mid_sentence_interruption"
    || chronology?.payload?.scenarioDay !== 138
    || chronology.payload.focusedDrillScenarioDay !== 135
    || chronology.payload.oldDrillPreferenceScenarioDay !== 15
    || controls.length !== 3 || controls.some((control) => control?.role !== "fixture_control_fact")
    || controlsByType.size !== 3
    || records.get(state.controlBasisRefs.userGoverned)?.payload?.value
      !== "exhaustive_selected_slice_scope"
    || records.get(state.controlBasisRefs.consequence)?.payload?.value !== "low"
    || records.get(state.controlBasisRefs.reversibility)?.payload?.value !== "reversible"
    || context?.firstInteractionRef !== interaction?.reference
    || interruption?.firstInteractionRef !== interaction?.reference
    || communication?.firstInteractionRef !== interaction?.reference
    || chronology?.firstInteractionRef !== interaction?.reference
    || interaction?.createdByTransitionRef !== ingestion?.reference
    || !sameReferenceSet(interaction?.inputReferences, expectedInteractionInputs)
    || stateTransition.family !== "sut_transition_evidence"
    || stateTransition.origin !== "sut"
    || stateTransition.transitionKind !== "derive_scoped_current_correction_control"
    || stateTransition.interactionRef !== interaction.reference
    || stateTransition.result !== "scoped_current_correction_control_derived"
    || JSON.stringify(stateTransition.inputReferences) !== JSON.stringify(expectedStateInputs)
    || JSON.stringify(stateTransition.resultReferences) !== JSON.stringify([state.reference])
    || stateBases.length !== 10
    || !expectedStatePairs.every(([reference, role]) => (
      hasRoleReference(stateBases, reference, role)
    ))
    || stateBases.some((basis) => !exactRelationMetadata(
      basis, state.createdOrder, stateTransition.createdOrder, "sut"
    ))
    || stateSources.length !== 1 || stateSources[0].toRef !== actor.reference
    || stateSources[0].targetRole !== "semantic_source"
    || !exactRelationMetadata(
      stateSources[0], state.createdOrder, stateTransition.createdOrder, "sut"
    )
    || disposition.family !== "direct_current_session_correction_disposition"
    || disposition.origin !== "sut"
    || disposition.dispositionType !== "respect_explicit_current_correction"
    || disposition.correctionControlRef !== state.reference
    || disposition.contextRef !== state.contextRef
    || disposition.interactionRef !== state.interactionRef
    || JSON.stringify(disposition.sessionScope) !== JSON.stringify(state.sessionScope)
    || disposition.requestedBehavior !== TURN_COMPLETION
    || disposition.behaviorEffect !== "immediate_current_session_change"
    || disposition.futureApplicability !== "not_established"
    || disposition.globalPolicy !== "not_established"
    || disposition.durableAdaptation !== "not_established"
    || disposition.statusOrigin !== "sut_transition"
    || disposition.effectiveOrder !== disposition.createdOrder
    || dispositionTransition.family !== "sut_transition_evidence"
    || dispositionTransition.origin !== "sut"
    || dispositionTransition.transitionKind
      !== "derive_direct_current_session_correction_disposition"
    || dispositionTransition.interactionRef !== disposition.interactionRef
    || JSON.stringify(dispositionTransition.inputReferences) !== JSON.stringify([
      state.reference, context.reference
    ])
    || dispositionTransition.result
      !== "direct_current_session_correction_disposition_derived"
    || JSON.stringify(dispositionTransition.resultReferences)
      !== JSON.stringify([disposition.reference])
    || dispositionBases.length !== 2
    || !hasRoleReference(
      dispositionBases, state.reference, "scoped_current_correction_control"
    )
    || !hasRoleReference(
      dispositionBases, context.reference, "current_spontaneous_context"
    )
    || dispositionBases.some((basis) => !exactRelationMetadata(
      basis, disposition.createdOrder, dispositionTransition.createdOrder, "sut"
    ))
    || fact?.family !== "input_fact" || fact.origin !== "simulator"
    || fact.role !== "simulator_behavior_realization"
    || fact.payload?.requestedRef !== disposition.reference
    || fact.payload.requestedBehavior !== TURN_COMPLETION
    || fact.payload.realizedBehavior !== TURN_COMPLETION
    || fact.payload.fidelity !== "match" || fact.payload.mismatchOrigin !== null
    || realizationTransition.family !== "sut_transition_evidence"
    || realizationTransition.origin !== "sut"
    || realizationTransition.result !== "direct_current_session_correction_realization_recorded"
    || realizationTransition.interactionRef !== factInteraction?.reference
    || JSON.stringify(realizationTransition.inputReferences) !== JSON.stringify([
      fact.reference, disposition.reference
    ])
    || realizationTransition.resultReferences.length !== 0
    || realizationBases.length !== 2
    || !hasRoleReference(realizationBases, fact.reference, "simulator_behavior_realization_fact")
    || !hasRoleReference(
      realizationBases, disposition.reference, "requested_direct_correction_disposition"
    )
    || realizationBases.some((basis) => !exactRelationMetadata(
      basis, realizationTransition.createdOrder, realizationTransition.createdOrder, "sut"
    ))
    || relation.fromRef !== fact.reference || relation.toRef !== disposition.reference
    || relation.targetRole !== "direct_current_session_correction_disposition"
    || relation.assertedByRole !== "sut"
    || !exactRelationMetadata(
      relation, realizationTransition.createdOrder, realizationTransition.createdOrder, "sut"
    )
    || !(ingestion.createdOrder < state.createdOrder
      && state.createdOrder < stateTransition.createdOrder
      && stateTransition.createdOrder < disposition.createdOrder
      && disposition.createdOrder < dispositionTransition.createdOrder
      && dispositionTransition.createdOrder < fact.createdOrder
      && fact.createdOrder < factInteraction.createdOrder
      && factInteraction.createdOrder < factIngestion.createdOrder
      && factIngestion.createdOrder < realizationTransition.createdOrder)) {
    throw checkpointError("CP-DIRECT-CORRECTION-REALIZED exact closure is malformed.");
  }
  for (const item of [context, interruption, communication, chronology, ...controls]) {
    validateBoundFact(snapshot, sourceBindingEvidence, item, "fixture");
  }
  validateBoundFact(snapshot, sourceBindingEvidence, fact, "simulator");
  if (snapshot.records.some((record) => (
    ["delayed_correction_candidate", "active_delayed_correction_trial",
      "later_use_applicability", "later_outcome", "explanation_support"].includes(record.family)
  ))) {
    throw checkpointError("CP-DIRECT-CORRECTION-REALIZED excludes later semantic families.");
  }
  return { state, disposition, fact, realizationTransition };
}

function validateFocusedInstructionClosure(
  snapshot, sourceBindingEvidence, records, activeTrial, instruction
) {
  const transition = uniqueCreator(snapshot, instruction, "focused instruction");
  const context = records.get(instruction?.contextRef);
  const communication = records.get(instruction?.sourceCommunicationRef);
  const assertion = records.get(instruction?.attributedAssertionRef);
  const actor = records.get(instruction?.sourceActorRef);
  const interaction = records.get(instruction?.interactionRef);
  const ingestion = uniqueCreator(snapshot, interaction, "focused instruction ingestion");
  const attribution = validateExactAttribution(
    snapshot, records, assertion, communication, interaction, "focused instruction"
  );
  const sources = snapshot.relations.filter((relation) => (
    relation.fromRef === instruction?.reference && relation.relationKind === "source"
  ));
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === instruction?.reference && relation.relationKind === "basis"
  ));
  const ingestionBases = snapshot.relations.filter((relation) => (
    relation.fromRef === ingestion?.reference && relation.relationKind === "basis"
  ));
  const expectedBasis = [
    [activeTrial.reference, "active_production_trial"],
    [context?.reference, "current_focused_drill_context"],
    [communication?.reference, "explicit_request_communication"],
    [assertion?.reference, "attributed_current_request"]
  ];
  const competing = snapshot.records.filter((record) => (
    record.family === "focused_drill_instruction"
      && record.activeTrialRef === activeTrial.reference
  ));
  if (!hasExactKeys(instruction, FOCUSED_INSTRUCTION_KEYS)
    || instruction.family !== "focused_drill_instruction" || instruction.origin !== "sut"
    || instruction.instructionType !== "explicit_current_focused_drill_correction"
    || instruction.activeTrialRef !== activeTrial.reference
    || instruction.sourceCommunicationRef !== communication?.reference
    || instruction.attributedAssertionRef !== assertion?.reference
    || instruction.sourceActorRef !== communication?.sourceActorRef
    || instruction.contextRef !== context?.reference
    || JSON.stringify(instruction.drillScope) !== JSON.stringify(FOCUSED_SCOPE)
    || instruction.requestedBehavior !== "immediate_correction"
    || instruction.authority !== "explicit_expected_user_request"
    || instruction.applicability !== "exact_current_focused_drill_only"
    || instruction.globalPreference !== "not_established"
    || instruction.statusOrigin !== "sut_transition"
    || instruction.interactionRef !== interaction?.reference
    || competing.length !== 1 || competing[0].reference !== instruction.reference
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || context?.role !== "context_label" || context.origin !== "fixture"
    || context.payload?.activity !== FOCUSED_SCOPE.activity
    || context.payload.taskMode !== FOCUSED_SCOPE.taskMode
    || context.payload.surfaceLabel !== FOCUSED_SCOPE.surfaceLabel
    || context.payload.consequence !== FOCUSED_SCOPE.consequence
    || communication?.role !== "communication" || communication.origin !== "fixture"
    || communication.payload?.sourceActor !== "synthetic-user-a"
    || normalize(communication.payload.content)
      !== "please correct me right away during this drill."
    || communication.payload.context !== "focused_production_drill"
    || communication.payload.semanticStatusOrigin !== "unclassified"
    || !hasExactKeys(interaction, [
      "reference", "family", "origin", "inputReferences", "createdOrder",
      "createdByTransitionRef"
    ])
    || interaction.family !== "interaction_segment" || interaction.origin !== "sut"
    || JSON.stringify(interaction.inputReferences) !== JSON.stringify([
      context.reference, communication.reference
    ])
    || context.firstInteractionRef !== interaction.reference
    || communication.firstInteractionRef !== interaction.reference
    || !hasExactKeys(ingestion, TRANSITION_KEYS)
    || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || JSON.stringify(ingestion.inputReferences) !== JSON.stringify([
      context.reference, communication.reference
    ])
    || JSON.stringify(ingestion.resultReferences) !== JSON.stringify([interaction.reference])
    || ingestion.result !== "accepted"
    || ingestionBases.length !== 2
    || !hasExactRoleReferencePairs(ingestionBases, [
      [context.reference, "ingested_input"],
      [communication.reference, "ingested_input"]
    ])
    || ingestionBases.some((relation) => !exactRelationMetadata(
      relation, ingestion.createdOrder, ingestion.createdOrder, "sut"
    ))
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_focused_drill_instruction"
    || transition.interactionRef !== interaction.reference
    || JSON.stringify(transition.inputReferences) !== JSON.stringify(
      expectedBasis.map(([reference]) => reference)
    )
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([instruction.reference])
    || transition.result !== "focused_drill_instruction_derived"
    || sources.length !== 1 || sources[0].toRef !== actor.reference
    || sources[0].targetRole !== "semantic_source"
    || !exactRelationMetadata(sources[0], instruction.createdOrder, transition.createdOrder, "sut")
    || bases.length !== 4 || !hasExactRoleReferencePairs(bases, expectedBasis)
    || bases.some((relation) => !exactRelationMetadata(
      relation, instruction.createdOrder, transition.createdOrder, "sut"
    ))
    || records.get(activeTrial.createdByTransitionRef)?.createdOrder >= context.createdOrder
    || context.createdOrder >= interaction.createdOrder
    || communication.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= assertion.createdOrder
    || attribution.createdOrder >= instruction.createdOrder
    || instruction.createdOrder >= transition.createdOrder) {
    throw checkpointError("Focused instruction exact closure is malformed.");
  }
  validateBoundFact(snapshot, sourceBindingEvidence, context, "fixture");
  validateBoundFact(snapshot, sourceBindingEvidence, communication, "fixture");
  return { instruction, transition, context, communication, assertion, interaction, ingestion };
}

function validateFocusedDispositionClosure(
  snapshot, records, activeTrial, instructionClosure, disposition
) {
  const { instruction, context } = instructionClosure;
  const transition = uniqueCreator(snapshot, disposition, "focused disposition");
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === disposition?.reference && relation.relationKind === "basis"
  ));
  const expectedBasis = [
    [activeTrial.reference, "active_production_trial"],
    [context.reference, "current_focused_drill_context"],
    [instruction.reference, "explicit_focused_drill_instruction"]
  ];
  const competing = snapshot.records.filter((record) => (
    record.family === "focused_drill_behavior_disposition"
      && record.activeTrialRef === activeTrial.reference
  ));
  if (!hasExactKeys(disposition, FOCUSED_DISPOSITION_KEYS)
    || disposition.family !== "focused_drill_behavior_disposition"
    || disposition.origin !== "sut"
    || disposition.dispositionType !== "current_focused_drill_correction_behavior"
    || disposition.activeTrialRef !== activeTrial.reference
    || disposition.instructionRef !== instruction.reference
    || disposition.contextRef !== context.reference
    || JSON.stringify(disposition.drillScope) !== JSON.stringify(FOCUSED_SCOPE)
    || disposition.requestedBehavior !== "immediate_correction"
    || disposition.behaviorStatus !== "requested_for_exact_current_drill"
    || disposition.statusOrigin !== "sut_transition"
    || disposition.interactionRef !== instruction.interactionRef
    || competing.length !== 1 || competing[0].reference !== disposition.reference
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_focused_drill_behavior_disposition"
    || transition.interactionRef !== disposition.interactionRef
    || JSON.stringify(transition.inputReferences) !== JSON.stringify(
      expectedBasis.map(([reference]) => reference)
    )
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([disposition.reference])
    || transition.result !== "focused_drill_behavior_disposition_derived"
    || bases.length !== 3 || !hasExactRoleReferencePairs(bases, expectedBasis)
    || bases.some((relation) => !exactRelationMetadata(
      relation, disposition.createdOrder, transition.createdOrder, "sut"
    ))
    || instructionClosure.transition.createdOrder >= disposition.createdOrder
    || disposition.createdOrder >= transition.createdOrder) {
    throw checkpointError("Focused disposition exact closure is malformed.");
  }
  return { disposition, transition };
}

function validateExactAttribution(snapshot, records, assertion, communication, interaction, label) {
  const transition = uniqueCreator(snapshot, assertion, `${label} attribution`);
  const ingestion = uniqueCreator(snapshot, interaction, `${label} attribution ingestion`);
  const actor = records.get(assertion?.sourceActorRef);
  const sources = snapshot.relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "source"
  ));
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "basis"
  ));
  const competing = snapshot.records.filter((record) => (
    record.family === "attributed_assertion"
      && record.sourceCommunicationRef === communication?.reference
      && record.statusOrigin === "sut_transition"
  ));
  if (!hasExactKeys(assertion, ATTRIBUTION_KEYS)
    || assertion.family !== "attributed_assertion" || assertion.origin !== "sut"
    || assertion.sourceCommunicationRef !== communication?.reference
    || assertion.sourceActorRef !== communication?.sourceActorRef
    || assertion.context !== communication?.payload?.context
    || assertion.occurrenceOrder !== communication?.payload?.occurrenceOrder
    || assertion.epistemicStatus !== "attributed_user_assertion"
    || assertion.statusOrigin !== "sut_transition"
    || assertion.interactionRef !== interaction?.reference
    || competing.length !== 1 || competing[0].reference !== assertion.reference
    || actor?.family !== "semantic_source" || actor.origin !== "fixture"
    || actor.sourceActor !== "synthetic-user-a"
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "attribute_current_communications"
    || transition.interactionRef !== interaction.reference
    || JSON.stringify(transition.inputReferences) !== JSON.stringify([communication.reference])
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([assertion.reference])
    || transition.result !== "accepted"
    || sources.length !== 1 || sources[0].toRef !== actor.reference
    || sources[0].targetRole !== "semantic_source"
    || !exactRelationMetadata(sources[0], assertion.createdOrder, transition.createdOrder, "sut")
    || bases.length !== 1 || bases[0].toRef !== communication.reference
    || bases[0].targetRole !== "attributed_communication"
    || !exactRelationMetadata(bases[0], assertion.createdOrder, transition.createdOrder, "sut")
    || communication.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= assertion.createdOrder
    || assertion.createdOrder >= transition.createdOrder) {
    throw checkpointError(`${label} attribution exact closure is malformed.`);
  }
  return transition;
}

function validateBoundFact(snapshot, evidence, fact, origin) {
  const matches = evidence.filter((entry) => (
    entry.acceptedInputFactRef === fact?.reference
      || entry.sourceFactRef === fact?.sourceFactRef
  ));
  if (matches.length !== 1 || matches[0].acceptedInputFactRef !== fact.reference
    || matches[0].sourceFactRef !== fact.sourceFactRef
    || JSON.stringify(matches[0].projectedMeaning) !== JSON.stringify(fact.payload)
    || matches[0].firstInteractionRef !== fact.firstInteractionRef
    || matches[0].deliveryOrigin !== origin) {
    throw checkpointError("Checkpoint source-binding identity is malformed.");
  }
  const records = indexRecords(snapshot);
  const interaction = records.get(fact.firstInteractionRef);
  const ingestion = uniqueCreator(snapshot, interaction, `${fact.role} ingestion`);
  const actor = records.get(fact.sourceActorRef);
  const sources = snapshot.relations.filter((relation) => (
    relation.fromRef === fact.reference && relation.relationKind === "source"
  ));
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === ingestion.reference && relation.relationKind === "basis"
  ));
  if (matches[0].firstIngestionTransitionRef !== interaction?.createdByTransitionRef
    || matches[0].firstIngestionTransitionRef !== ingestion.reference
    || actor?.family !== "semantic_source" || actor.origin !== origin
    || actor.sourceActor !== fact.payload.sourceActor
    || sources.length !== 1 || sources[0].toRef !== actor.reference
    || sources[0].targetRole !== "semantic_source"
    || !exactRelationMetadata(sources[0], fact.createdOrder, ingestion.createdOrder, "sut")
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || !interaction.inputReferences.includes(fact.reference)
    || interaction.inputReferences.length !== new Set(interaction.inputReferences).size
    || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || JSON.stringify(ingestion.inputReferences) !== JSON.stringify(interaction.inputReferences)
    || JSON.stringify(ingestion.resultReferences) !== JSON.stringify([interaction.reference])
    || ingestion.result !== "accepted"
    || bases.length !== interaction.inputReferences.length
    || interaction.inputReferences.some((reference) => (
      !hasRoleReference(bases, reference, "ingested_input")
    ))
    || bases.some((basis) => !exactRelationMetadata(
      basis, ingestion.createdOrder, ingestion.createdOrder, "sut"
    ))
    || !(actor.createdOrder < fact.createdOrder
      && fact.createdOrder < interaction.createdOrder
      && interaction.createdOrder < ingestion.createdOrder)) {
    throw checkpointError("Checkpoint original-ingestion identity is malformed.");
  }
}

function indexRecords(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.relations)) {
    throw checkpointError("Checkpoint snapshot is malformed.");
  }
  const records = new Map();
  for (const record of snapshot.records) {
    if (records.has(record.reference)) throw checkpointError("Checkpoint record identity is ambiguous.");
    records.set(record.reference, record);
  }
  return records;
}

function uniqueCreator(snapshot, record, label) {
  const claimants = snapshot.records.filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
      || candidate.resultReferences?.includes(record?.reference)
  ));
  const claimant = claimants[0];
  if (claimants.length !== 1
    || record?.createdByTransitionRef !== claimant?.reference
    || claimant.resultReferences?.filter((reference) => (
      reference === record?.reference
    )).length !== 1) {
    throw checkpointError(`${label} creator identity is ambiguous.`);
  }
  return claimant;
}

function hasRoleReference(relations, reference, role) {
  return relations.filter((relation) => (
    relation.toRef === reference && relation.targetRole === role
  )).length === 1;
}

function hasExactRoleReferencePairs(relations, expected) {
  return relations.length === expected.length && expected.every(([reference, role]) => (
    hasRoleReference(relations, reference, role)
  ));
}

function hasExactKeys(value, keys) {
  return value && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function sameReferenceSet(actual, expected) {
  return Array.isArray(actual) && Array.isArray(expected)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && expected.every((reference) => actual.includes(reference));
}

function exactRelationMetadata(relation, effectiveOrder, createdOrder, assertedByRole) {
  return relation?.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === assertedByRole;
}

function normalize(value) {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function checkpointError(message) {
  return new Error(`Direct-correction checkpoint failure: ${message}`);
}
