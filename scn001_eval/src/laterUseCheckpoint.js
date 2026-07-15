import { findExactActiveDelayedCorrectionTrial } from "./delayedActiveCheckpoint.js";
import { validateBoundFact } from "./directCorrectionCheckpoint.js";

const BEHAVIOR = "delay_minor_correction_until_turn_completion";

const TRANSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "transitionKind", "interactionRef",
  "inputReferences", "resultReferences", "createdOrder", "result"
]);

const ASSESSMENT_KEYS = Object.freeze([
  "reference", "family", "origin", "assessmentType", "pathType", "useTarget",
  "activeTrialRef", "contextRef", "stateReferenceFactRef",
  "correctionCommunicationRef", "attributedAssertionRef", "controlBasisRefs",
  "applicabilityResult", "reason", "activeScope", "currentScope",
  "selectedBehavior", "behaviorInfluence", "statusOrigin", "interactionRef",
  "createdOrder", "createdByTransitionRef"
]);

const DISPOSITION_KEYS = Object.freeze([
  "reference", "family", "origin", "dispositionType", "activeTrialRef",
  "applicabilityAssessmentRef", "contextRef", "materialIntent",
  "requestedBehavior", "behaviorEffect", "useScope", "globalPolicy",
  "durableAdaptation", "statusOrigin", "interactionRef", "createdOrder",
  "effectiveOrder", "createdByTransitionRef"
]);

const ATTRIBUTION_KEYS = Object.freeze([
  "reference", "family", "origin", "sourceCommunicationRef", "sourceActorRef",
  "context", "occurrenceOrder", "epistemicStatus", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

export function findExactLaterUse(snapshot, sourceBindingEvidence, pathType) {
  const active = findExactActiveDelayedCorrectionTrial(snapshot, sourceBindingEvidence);
  if (!active) return undefined;
  const records = indexRecords(snapshot);
  const assessments = snapshot.records.filter((record) => (
    record.family === "later_use_applicability" && record.pathType === pathType
  ));
  if (assessments.length === 0) return undefined;
  if (assessments.length !== 1) throw checkpointError("Later-use assessment is ambiguous.");
  const assessment = assessments[0];
  if (snapshot.records.filter((record) => (
    record.family === "later_use_applicability"
  )).length !== 1) throw checkpointError("Later-use assessment family is ambiguous.");
  const context = records.get(assessment.contextRef);
  const stateRef = records.get(assessment.stateReferenceFactRef);
  const communication = records.get(assessment.correctionCommunicationRef);
  const assertion = records.get(assessment.attributedAssertionRef);
  const controls = [
    records.get(assessment.controlBasisRefs?.userGoverned),
    records.get(assessment.controlBasisRefs?.consequence)
  ];
  const transition = uniqueCreator(snapshot, assessment);
  const canonical = pathType === "canonical_spontaneous_later_use";
  const expectedScope = canonical ? {
    activity: "japanese_practice", taskMode: "spontaneous_production",
    surfaceLabel: "voice_simulated", consequence: "low", scenarioDay: 145,
    sessionId: "spontaneous-outcome-later"
  } : {
    activity: "focused_accuracy_drill", taskMode: "focused_production_drill",
    surfaceLabel: "voice_simulated", consequence: "low", scenarioDay: 145,
    sessionId: "focused-opt-in-later"
  };
  const expectedInputs = [
    active.trial.reference, context?.reference, stateRef?.reference,
    ...(canonical ? [] : [communication?.reference, assertion?.reference]),
    ...controls.map((control) => control?.reference)
  ];
  const expectedRoles = [
    [active.trial.reference, "retained_active_delayed_trial"],
    [context?.reference, "declared_later_use_context"],
    [stateRef?.reference, "same_run_trial_projection"],
    ...(canonical ? [] : [
      [communication?.reference, "explicit_drill_immediate_correction"],
      [assertion?.reference, "attributed_drill_immediate_correction"]
    ]),
    [assessment.controlBasisRefs?.userGoverned, "user_governed_control"],
    [assessment.controlBasisRefs?.consequence, "consequence_control"]
  ];
  const outward = snapshot.relations.filter((relation) => relation.fromRef === assessment.reference);
  const competing = snapshot.records.filter((record) => (
    record.family === "later_use_applicability"
    && record.activeTrialRef === active.trial.reference
    && record.interactionRef === assessment.interactionRef
  ));
  if (!hasExactKeys(assessment, ASSESSMENT_KEYS)
    || assessment.family !== "later_use_applicability" || assessment.origin !== "sut"
    || assessment.assessmentType !== "active_delayed_trial_current_applicability"
    || assessment.pathType !== pathType
    || assessment.useTarget !== "current_later_correction_timing"
    || assessment.activeTrialRef !== active.trial.reference
    || assessment.contextRef !== context?.reference
    || assessment.stateReferenceFactRef !== stateRef?.reference
    || assessment.correctionCommunicationRef !== (canonical ? null : communication?.reference)
    || assessment.attributedAssertionRef !== (canonical ? null : assertion?.reference)
    || !hasExactKeys(assessment.controlBasisRefs, ["userGoverned", "consequence"])
    || stateRef?.payload?.stateRef !== active.trial.reference
    || JSON.stringify(assessment.activeScope) !== JSON.stringify(active.trial.activeScope)
    || JSON.stringify(assessment.currentScope) !== JSON.stringify(expectedScope)
    || assessment.applicabilityResult !== (canonical ? "applicable" : "not_applicable")
    || assessment.reason !== (canonical
      ? "active_scope_matches_later_spontaneous_production"
      : "focused_drill_explicit_immediate_correction_excluded")
    || assessment.selectedBehavior !== (canonical ? BEHAVIOR : null)
    || assessment.behaviorInfluence !== (canonical
      ? "permits_bounded_disposition" : "prohibits_delayed_correction_here")
    || assessment.statusOrigin !== "sut_transition"
    || competing.length !== 1 || competing[0].reference !== assessment.reference
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "assess_active_delayed_trial_applicability"
    || transition.interactionRef !== assessment.interactionRef
    || transition.result !== "later_use_applicability_assessed"
    || JSON.stringify(transition.inputReferences) !== JSON.stringify(expectedInputs)
    || JSON.stringify(transition.resultReferences) !== JSON.stringify([assessment.reference])
    || !exactRelations(outward, expectedRoles, "applicability", assessment, transition)
    || records.get(active.trial.createdByTransitionRef)?.createdOrder >= assessment.createdOrder
    || assessment.createdOrder >= transition.createdOrder) {
    throw checkpointError("Later-use applicability closure is malformed.");
  }
  const expectedFacts = [context, stateRef, ...controls, ...(canonical ? [] : [communication])];
  const expectedFactClosures = canonical ? [
    [context, "context_label", "fixture-driver"],
    [stateRef, "state_reference", "fixture-driver"],
    [controls[0], "fixture_control_fact", "fixture-driver"],
    [controls[1], "fixture_control_fact", "fixture-driver"]
  ] : [
    [context, "context_label", "fixture-driver"],
    [stateRef, "state_reference", "fixture-driver"],
    [controls[0], "fixture_control_fact", "fixture-driver"],
    [controls[1], "fixture_control_fact", "fixture-driver"],
    [communication, "communication", "synthetic-user-a"]
  ];
  for (const fact of expectedFacts) {
    validateBoundFact(snapshot, sourceBindingEvidence, fact, "fixture");
  }
  for (const [fact, role, sourceActor] of expectedFactClosures) {
    validateInputFactEnvelope(snapshot, fact, role, sourceActor);
  }
  validateCurrentInteractionClosure(snapshot, assessment.interactionRef, canonical ? [
    context.reference, stateRef.reference,
    controls[0].reference, controls[1].reference
  ] : [
    context.reference, communication.reference, stateRef.reference,
    controls[0].reference, controls[1].reference
  ]);
  if (!canonical) {
    if (communication?.payload?.content
        !== "For this drill, correct me immediately so I can fix each attempt."
      ) throw checkpointError("Drill opt-in communication is malformed.");
    validateExactAttribution(snapshot, records, assertion, communication, assessment.interactionRef);
    if (snapshot.records.some((record) => (
      record.family === "later_behavior_disposition"
    ))) throw checkpointError("Inapplicable delayed trial created a disposition.");
    return { active, assessment, disposition: undefined };
  }
  const dispositions = snapshot.records.filter((record) => (
    record.family === "later_behavior_disposition"
    && record.applicabilityAssessmentRef === assessment.reference
  ));
  if (dispositions.length !== 1) throw checkpointError("Later disposition is missing or ambiguous.");
  const disposition = dispositions[0];
  if (snapshot.records.filter((record) => (
    record.family === "later_behavior_disposition"
  )).length !== 1) throw checkpointError("Later disposition family is ambiguous.");
  const dispositionTransition = uniqueCreator(snapshot, disposition);
  const dispositionRelations = snapshot.relations.filter(
    (relation) => relation.fromRef === disposition.reference
  );
  if (!hasExactKeys(disposition, DISPOSITION_KEYS)
    || disposition.family !== "later_behavior_disposition" || disposition.origin !== "sut"
    || disposition.dispositionType !== "active_delayed_trial_later_use"
    || disposition.activeTrialRef !== active.trial.reference
    || disposition.applicabilityAssessmentRef !== assessment.reference
    || disposition.contextRef !== context.reference
    || disposition.requestedBehavior !== BEHAVIOR
    || disposition.materialIntent !== BEHAVIOR
    || disposition.behaviorEffect !== "apply_only_in_exact_later_spontaneous_context"
    || disposition.globalPolicy !== "not_established"
    || disposition.durableAdaptation !== "unsupported_in_selected_slice"
    || disposition.statusOrigin !== "sut_transition"
    || disposition.interactionRef !== assessment.interactionRef
    || disposition.effectiveOrder !== disposition.createdOrder
    || JSON.stringify(disposition.useScope) !== JSON.stringify(expectedScope)
    || !hasExactKeys(dispositionTransition, TRANSITION_KEYS)
    || dispositionTransition.family !== "sut_transition_evidence"
    || dispositionTransition.origin !== "sut"
    || dispositionTransition.transitionKind !== "derive_later_delayed_correction_disposition"
    || dispositionTransition.interactionRef !== disposition.interactionRef
    || dispositionTransition.result !== "later_delayed_correction_disposition_derived"
    || JSON.stringify(dispositionTransition.inputReferences) !== JSON.stringify([
      active.trial.reference, assessment.reference, context.reference
    ])
    || JSON.stringify(dispositionTransition.resultReferences)
      !== JSON.stringify([disposition.reference])
    || !exactRelations(dispositionRelations, [
      [active.trial.reference, "applicable_active_trial"],
      [assessment.reference, "later_use_applicability"],
      [context.reference, "later_spontaneous_context"]
    ], "basis", disposition, dispositionTransition)
    || assessment.createdOrder >= disposition.createdOrder
    || disposition.createdOrder >= dispositionTransition.createdOrder) {
    throw checkpointError("Later disposition closure is malformed.");
  }
  return { active, assessment, disposition };
}

export function findExactLaterRealization(snapshot, sourceBindingEvidence) {
  const later = findExactLaterUse(
    snapshot, sourceBindingEvidence, "canonical_spontaneous_later_use"
  );
  if (!later) return undefined;
  const facts = snapshot.records.filter((record) => (
    record.role === "simulator_behavior_realization"
    && record.payload?.requestedRef === later.disposition.reference
  ));
  const records = indexRecords(snapshot);
  const transitions = snapshot.records.filter((record) => (
    record.transitionKind === "record_later_delayed_correction_realization"
    && (record.inputReferences?.includes(later.disposition.reference)
      || record.inputReferences?.some((reference) => (
        records.get(reference)?.payload?.requestedRef === later.disposition.reference
      )))
  ));
  const relations = snapshot.relations.filter((relation) => (
    relation.relationKind === "realization"
    && (relation.toRef === later.disposition.reference
      || records.get(relation.fromRef)?.payload?.requestedRef === later.disposition.reference)
  ));
  if (transitions.length === 0 && relations.length === 0) return undefined;
  if (facts.length !== 1) throw checkpointError("Later realization is ambiguous.");
  const fact = facts[0];
  const interaction = records.get(fact.firstInteractionRef);
  if (transitions.length !== 1 || relations.length !== 1
    || !hasExactKeys(transitions[0], TRANSITION_KEYS)
    || transitions[0].family !== "sut_transition_evidence"
    || transitions[0].origin !== "sut"
    || transitions[0].transitionKind !== "record_later_delayed_correction_realization"
    || transitions[0].interactionRef !== fact.firstInteractionRef
    || transitions[0].result !== "later_delayed_correction_realization_recorded"
    || JSON.stringify(transitions[0].resultReferences) !== JSON.stringify([])
    || interaction?.inputReferences?.length !== 1
    || interaction.inputReferences[0] !== fact.reference
    || fact.family !== "input_fact" || fact.origin !== "simulator"
    || fact.role !== "simulator_behavior_realization"
    || fact.payload?.sourceActor !== "simulated-dependency"
    || fact.payload.requestedBehavior !== BEHAVIOR
    || fact.payload.realizedBehavior !== BEHAVIOR || fact.payload.fidelity !== "match"
    || fact.payload.mismatchOrigin !== null
    || JSON.stringify(transitions[0].inputReferences) !== JSON.stringify([
      later.disposition.reference, fact.reference, fact.firstInteractionRef
    ])
    || relations[0].fromRef !== fact.reference
    || relations[0].toRef !== later.disposition.reference
    || relations[0].targetRole !== "later_behavior_disposition"
    || !exactRelationMetadata(
      relations[0], transitions[0].createdOrder, transitions[0].createdOrder, "sut"
    )
    || records.get(later.disposition.createdByTransitionRef)?.createdOrder >= fact.createdOrder
    || fact.createdOrder >= interaction.createdOrder
    || records.get(interaction.createdByTransitionRef)?.createdOrder
      >= transitions[0].createdOrder) {
    throw checkpointError("Later realization closure is malformed.");
  }
  validateBoundFact(snapshot, sourceBindingEvidence, fact, "simulator");
  validateInputFactEnvelope(
    snapshot, fact, "simulator_behavior_realization", "simulated-dependency", "simulator"
  );
  return { ...later, fact, realizationTransition: transitions[0] };
}

function validateCurrentInteractionClosure(snapshot, interactionRef, expectedInputRefs) {
  const records = indexRecords(snapshot);
  const interaction = records.get(interactionRef);
  const ingestion = uniqueCreator(snapshot, interaction);
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === ingestion?.reference && relation.relationKind === "basis"
  ));
  if (!hasExactKeys(interaction, [
    "reference", "family", "origin", "inputReferences", "createdOrder",
    "createdByTransitionRef"
  ]) || JSON.stringify(interaction.inputReferences) !== JSON.stringify(expectedInputRefs)
    || !hasExactKeys(ingestion, TRANSITION_KEYS)
    || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || JSON.stringify(ingestion.inputReferences) !== JSON.stringify(expectedInputRefs)
    || JSON.stringify(ingestion.resultReferences) !== JSON.stringify([interaction.reference])
    || ingestion.result !== "accepted"
    || bases.length !== expectedInputRefs.length
    || expectedInputRefs.some((reference) => !bases.some((basis) => (
      basis.toRef === reference && basis.targetRole === "ingested_input"
    )))
    || bases.some((basis) => !exactRelationMetadata(
      basis, ingestion.createdOrder, ingestion.createdOrder, "sut"
    ))) {
    throw checkpointError("Later-use current-ingestion closure is malformed.");
  }
}

function validateExactAttribution(snapshot, records, assertion, communication, interactionRef) {
  const interaction = records.get(interactionRef);
  const transition = uniqueCreator(snapshot, assertion);
  const ingestion = uniqueCreator(snapshot, interaction);
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
    || assertion.sourceCommunicationRef !== communication.reference
    || assertion.sourceActorRef !== communication.sourceActorRef
    || assertion.context !== communication.payload.context
    || assertion.occurrenceOrder !== communication.payload.occurrenceOrder
    || assertion.epistemicStatus !== "attributed_user_assertion"
    || assertion.statusOrigin !== "sut_transition"
    || assertion.interactionRef !== interaction.reference
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
    throw checkpointError("Drill opt-in attribution exact closure is malformed.");
  }
}

function validateInputFactEnvelope(snapshot, fact, role, sourceActor, origin = "fixture") {
  const records = indexRecords(snapshot);
  const interaction = records.get(fact?.firstInteractionRef);
  const ingestion = uniqueCreator(snapshot, interaction);
  const actor = records.get(fact?.sourceActorRef);
  const bases = snapshot.relations.filter((relation) => (
    relation.fromRef === ingestion?.reference && relation.relationKind === "basis"
  ));
  if (!hasExactKeys(fact, [
    "reference", "family", "origin", "role", "sourceFactRef", "payload",
    "firstInteractionRef", "createdOrder", "sourceActorRef"
  ]) || fact.family !== "input_fact" || fact.origin !== origin || fact.role !== role
    || fact.payload?.sourceActor !== sourceActor
    || !hasExactKeys(actor, [
      "reference", "family", "origin", "sourceActor", "createdOrder"
    ])
    || !hasExactKeys(interaction, [
      "reference", "family", "origin", "inputReferences", "createdOrder",
      "createdByTransitionRef"
    ])
    || !hasExactKeys(ingestion, TRANSITION_KEYS)
    || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || JSON.stringify(ingestion.inputReferences) !== JSON.stringify(interaction.inputReferences)
    || JSON.stringify(ingestion.resultReferences) !== JSON.stringify([interaction.reference])
    || ingestion.result !== "accepted"
    || bases.length !== interaction.inputReferences.length
    || interaction.inputReferences.some((reference) => !bases.some((basis) => (
      basis.toRef === reference && basis.targetRole === "ingested_input"
    )))
    || bases.some((basis) => !exactRelationMetadata(
      basis, ingestion.createdOrder, ingestion.createdOrder, "sut"
    ))) {
    throw checkpointError("Later-use input-fact envelope is malformed.");
  }
}

function exactRelations(relations, pairs, kind, record, transition) {
  return relations.length === pairs.length && pairs.every(([ref, role]) => relations.some(
    (relation) => relation.relationKind === kind && relation.toRef === ref
      && relation.targetRole === role && relation.assertedByRole === "sut"
      && relation.effectiveOrder === record.createdOrder
      && relation.createdOrder === transition.createdOrder
  ));
}

function indexRecords(snapshot) {
  const records = new Map();
  for (const record of snapshot.records) {
    if (records.has(record.reference)) throw checkpointError("Record identity is ambiguous.");
    records.set(record.reference, record);
  }
  return records;
}

function uniqueCreator(snapshot, record) {
  const claimants = snapshot.records.filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
    || candidate.resultReferences?.includes(record?.reference)
  ));
  if (claimants.length !== 1 || claimants[0].reference !== record.createdByTransitionRef) {
    throw checkpointError("Creator identity is ambiguous.");
  }
  return claimants[0];
}

function exactRelationMetadata(relation, effectiveOrder, createdOrder, assertedByRole) {
  return relation?.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === assertedByRole;
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
