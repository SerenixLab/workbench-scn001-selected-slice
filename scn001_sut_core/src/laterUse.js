import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";
import {
  resolveUniqueCreatingTransition,
  validateRetainedInputFact
} from "./retainedStateClosure.js";

export const LATER_DELAYED_BEHAVIOR = "delay_minor_correction_until_turn_completion";

export const LATER_SPONTANEOUS_SCOPE = Object.freeze({
  activity: "japanese_practice",
  taskMode: "spontaneous_production",
  surfaceLabel: "voice_simulated",
  consequence: "low",
  scenarioDay: 145,
  sessionId: "spontaneous-outcome-later"
});

export const DRILL_OPT_IN_SCOPE = Object.freeze({
  activity: "focused_accuracy_drill",
  taskMode: "focused_production_drill",
  surfaceLabel: "voice_simulated",
  consequence: "low",
  scenarioDay: 145,
  sessionId: "focused-opt-in-later"
});

const ASSESSMENT_KEYS = [
  "reference", "family", "origin", "assessmentType", "pathType", "useTarget",
  "activeTrialRef", "contextRef", "stateReferenceFactRef",
  "stateProjectionRef",
  "correctionCommunicationRef", "attributedAssertionRef", "controlBasisRefs",
  "applicabilityResult", "reason", "activeScope", "currentScope",
  "selectedBehavior", "behaviorInfluence", "statusOrigin", "interactionRef",
  "createdOrder", "createdByTransitionRef"
];

const DISPOSITION_KEYS = [
  "reference", "family", "origin", "dispositionType", "activeTrialRef",
  "applicabilityAssessmentRef", "contextRef", "materialIntent",
  "requestedBehavior", "behaviorEffect", "useScope", "globalPolicy",
  "durableAdaptation", "statusOrigin", "interactionRef", "createdOrder",
  "effectiveOrder", "createdByTransitionRef"
];

const REALIZATION_TRANSITION_KEYS = [
  "reference", "family", "origin", "transitionKind", "interactionRef",
  "inputReferences", "resultReferences", "createdOrder", "result"
];

const TRANSITION_KEYS = Object.freeze([...REALIZATION_TRANSITION_KEYS]);

const ATTRIBUTION_KEYS = Object.freeze([
  "reference", "family", "origin", "sourceCommunicationRef", "sourceActorRef",
  "context", "occurrenceOrder", "epistemicStatus", "statusOrigin",
  "interactionRef", "createdOrder", "createdByTransitionRef"
]);

const PROJECTION_KEYS = Object.freeze([
  "reference", "family", "origin", "projectionType", "projectionTargetRef",
  "sourceReferenceFactRef", "projectionRule", "viewIdentity",
  "semanticContribution", "effectiveTargetState", "statusOrigin",
  "interactionRef", "createdOrder", "effectiveOrder", "createdByTransitionRef"
]);

export function deriveLaterUseParticipants({
  records, relations, sourceFactBindings, interaction, interactionFacts,
  validateActiveDelayedTrial
}) {
  const contexts = interactionFacts.filter((fact) => fact.role === "context_label");
  const stateRefs = interactionFacts.filter((fact) => fact.role === "state_reference");
  const communications = interactionFacts.filter((fact) => fact.role === "communication");
  const controls = interactionFacts.filter((fact) => fact.role === "fixture_control_fact");
  if (contexts.length === 0 && stateRefs.length === 0) return undefined;
  if (contexts.length !== 1 || stateRefs.length !== 1) return undefined;
  const context = contexts[0];
  const stateReferenceFact = stateRefs[0];
  const canonical = isDeepStrictEqual(scopeFrom(context.payload), LATER_SPONTANEOUS_SCOPE);
  const counterfactual = isDeepStrictEqual(scopeFrom(context.payload), DRILL_OPT_IN_SCOPE);
  if (!canonical && !counterfactual) return undefined;
  if ((canonical && communications.length !== 0)
    || (counterfactual && communications.length !== 1)
    || controls.length !== 2 || interactionFacts.length !== (canonical ? 4 : 5)) {
    return undefined;
  }
  const activeTrial = validateActiveDelayedTrial(
    records.get(stateReferenceFact.payload?.stateRef)
  );
  const byType = new Map(controls.map((fact) => [fact.payload.control, fact]));
  if (byType.size !== 2
    || byType.get("user_governed_constraints")?.payload?.value
      !== "exhaustive_selected_slice_scope"
    || byType.get("consequence")?.payload?.value !== "low") return undefined;
  validateInput(
    records, relations, sourceFactBindings, context, interaction,
    "context_label", "fixture-driver"
  );
  validateInput(
    records, relations, sourceFactBindings, stateReferenceFact, interaction,
    "state_reference", "fixture-driver"
  );
  for (const control of controls) {
    validateInput(
      records, relations, sourceFactBindings, control, interaction,
      "fixture_control_fact", "fixture-driver"
    );
  }
  let communication;
  let assertion;
  if (counterfactual) {
    communication = communications[0];
    validateInput(
      records, relations, sourceFactBindings, communication, interaction,
      "communication", "synthetic-user-a"
    );
    if (communication.payload.content
        !== "For this drill, correct me immediately so I can fix each attempt."
      || communication.payload.context !== "focused_production_drill") return undefined;
    const assertions = [...records.values()].filter((record) => (
      record.family === "attributed_assertion"
      && record.sourceCommunicationRef === communication.reference
      && record.interactionRef === interaction.reference
      && record.statusOrigin === "sut_transition"
    ));
    if (assertions.length !== 1) {
      throw new SutStateIntegrityError("Drill opt-in requires one exact SUT attribution.");
    }
    assertion = assertions[0];
    validateDrillAttribution(records, relations, assertion, communication, interaction);
  }
  return {
    activeTrial, context, stateReferenceFact, communication, assertion,
    controls: {
      userGoverned: byType.get("user_governed_constraints"),
      consequence: byType.get("consequence")
    },
    pathType: canonical ? "canonical_spontaneous_later_use" : "drill_opt_in_counterfactual",
    applicabilityResult: canonical ? "applicable" : "not_applicable",
    reason: canonical
      ? "active_scope_matches_later_spontaneous_production"
      : "focused_drill_explicit_immediate_correction_excluded",
    interaction
  };
}

export function laterUseInputReferences(participants) {
  return [
    participants.activeTrial.reference,
    participants.context.reference,
    participants.stateReferenceFact.reference,
    participants.stateProjection.reference,
    ...(participants.communication ? [
      participants.communication.reference, participants.assertion.reference
    ] : []),
    participants.controls.userGoverned.reference,
    participants.controls.consequence.reference
  ];
}

export function laterUseRelationPairs(participants) {
  return [
    [participants.activeTrial.reference, "retained_active_delayed_trial"],
    [participants.context.reference, "declared_later_use_context"],
    [participants.stateReferenceFact.reference, "same_run_trial_projection"],
    [participants.stateProjection.reference, "validated_same_run_projection"],
    ...(participants.communication ? [
      [participants.communication.reference, "explicit_drill_immediate_correction"],
      [participants.assertion.reference, "attributed_drill_immediate_correction"]
    ] : []),
    [participants.controls.userGoverned.reference, "user_governed_control"],
    [participants.controls.consequence.reference, "consequence_control"]
  ];
}

export function effectiveDelayedTrialProjectionState(activeTrial) {
  return {
    targetRef: activeTrial.reference,
    lifecycleVersion: activeTrial.lifecycleVersion,
    currentStatus: activeTrial.currentStatus,
    activeScope: structuredClone(activeTrial.activeScope),
    correctionPath: activeTrial.correctionPath
  };
}

export function validateLaterStateProjectionClosure({
  records, relations, projection, activeTrial, stateReferenceFact, interaction
}) {
  const transition = resolveUniqueCreatingTransition(
    records, projection, "Later state projection"
  );
  const outward = relations.filter((relation) => (
    relation.fromRef === projection?.reference
  ));
  const projectionRelations = outward.filter((relation) => (
    relation.relationKind === "projection_of"
  ));
  const basisRelations = outward.filter((relation) => relation.relationKind === "basis");
  const competing = [...records.values()].filter((record) => (
    record.family === "lineage_preserving_projection"
    && record.sourceReferenceFactRef === stateReferenceFact.reference
    && record.interactionRef === interaction.reference
  ));
  if (!hasExactKeys(projection, PROJECTION_KEYS)
    || projection.family !== "lineage_preserving_projection" || projection.origin !== "sut"
    || projection.projectionType !== "active_delayed_trial_reference"
    || projection.projectionTargetRef !== activeTrial.reference
    || projection.sourceReferenceFactRef !== stateReferenceFact.reference
    || projection.projectionRule !== "same_run_opaque_reference_identity"
    || projection.viewIdentity !== "active_delayed_trial_effective_state"
    || projection.semanticContribution !== "none_reference_only"
    || !isDeepStrictEqual(
      projection.effectiveTargetState, effectiveDelayedTrialProjectionState(activeTrial)
    )
    || projection.statusOrigin !== "sut_transition"
    || projection.interactionRef !== interaction.reference
    || projection.effectiveOrder !== projection.createdOrder
    || competing.length !== 1 || competing[0].reference !== projection.reference
    || transition?.reference !== projection.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "validate_later_state_projection"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "later_state_projection_validated"
    || !isDeepStrictEqual(
      transition.inputReferences, [stateReferenceFact.reference, activeTrial.reference]
    )
    || !isDeepStrictEqual(transition.resultReferences, [projection.reference])
    || !hasExactRelations(projectionRelations, [
      [activeTrial.reference, "active_delayed_correction_trial"]
    ], "projection_of")
    || basisRelations.length !== 1
    || !basisRelations.some((relation) => relation.relationKind === "basis"
      && relation.toRef === stateReferenceFact.reference
      && relation.targetRole === "opaque_state_reference_fact")
    || outward.length !== 2
    || outward.some((relation) => !exactMetadata(
      relation, projection.createdOrder, transition.createdOrder
    ))
    || records.get(activeTrial.createdByTransitionRef)?.createdOrder
      >= stateReferenceFact.createdOrder
    || stateReferenceFact.createdOrder >= interaction.createdOrder
    || records.get(interaction.createdByTransitionRef)?.createdOrder >= projection.createdOrder
    || projection.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Later state projection closure is malformed.");
  }
  return projection;
}

export function validateLaterUseAssessmentClosure({
  records, relations, sourceFactBindings, assessment, validateActiveDelayedTrial
}) {
  const transition = resolveUniqueCreatingTransition(records, assessment, "Later-use assessment");
  const interaction = records.get(assessment?.interactionRef);
  const participants = deriveLaterUseParticipants({
    records, relations, sourceFactBindings, interaction,
    interactionFacts: interaction?.inputReferences?.map((ref) => records.get(ref)) ?? [],
    validateActiveDelayedTrial
  });
  if (!participants) {
    throw new SutStateIntegrityError("Later-use applicability participants are malformed.");
  }
  participants.stateProjection = validateLaterStateProjectionClosure({
    records, relations,
    projection: records.get(assessment?.stateProjectionRef),
    activeTrial: participants.activeTrial,
    stateReferenceFact: participants.stateReferenceFact,
    interaction
  });
  const expectedInputs = laterUseInputReferences(participants);
  const expectedPairs = laterUseRelationPairs(participants);
  const outward = relations.filter((relation) => relation.fromRef === assessment?.reference);
  const competing = [...records.values()].filter((record) => (
    record.family === "later_use_applicability"
    && record.activeTrialRef === participants.activeTrial.reference
    && record.interactionRef === interaction.reference
  ));
  const prohibitedDispositions = [...records.values()].filter((record) => (
    record.family === "later_behavior_disposition"
    && record.activeTrialRef === participants.activeTrial.reference
    && record.interactionRef === interaction.reference
  ));
  if (!hasExactKeys(assessment, ASSESSMENT_KEYS)
    || assessment.family !== "later_use_applicability" || assessment.origin !== "sut"
    || assessment.assessmentType !== "active_delayed_trial_current_applicability"
    || assessment.pathType !== participants.pathType
    || assessment.useTarget !== "current_later_correction_timing"
    || assessment.activeTrialRef !== participants.activeTrial.reference
    || assessment.contextRef !== participants.context.reference
    || assessment.stateReferenceFactRef !== participants.stateReferenceFact.reference
    || assessment.stateProjectionRef !== participants.stateProjection.reference
    || assessment.correctionCommunicationRef !== (participants.communication?.reference ?? null)
    || assessment.attributedAssertionRef !== (participants.assertion?.reference ?? null)
    || !isDeepStrictEqual(assessment.controlBasisRefs, {
      userGoverned: participants.controls.userGoverned.reference,
      consequence: participants.controls.consequence.reference
    })
    || assessment.applicabilityResult !== participants.applicabilityResult
    || assessment.reason !== participants.reason
    || !isDeepStrictEqual(assessment.activeScope, participants.activeTrial.activeScope)
    || !isDeepStrictEqual(assessment.currentScope, scopeFrom(participants.context.payload))
    || assessment.selectedBehavior !== (participants.applicabilityResult === "applicable"
      ? LATER_DELAYED_BEHAVIOR : null)
    || assessment.behaviorInfluence !== (participants.applicabilityResult === "applicable"
      ? "permits_bounded_disposition" : "prohibits_delayed_correction_here")
    || assessment.statusOrigin !== "sut_transition"
    || competing.length !== 1 || competing[0].reference !== assessment.reference
    || (participants.applicabilityResult === "not_applicable"
      && prohibitedDispositions.length !== 0)
    || transition?.reference !== assessment.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "assess_active_delayed_trial_applicability"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "later_use_applicability_assessed"
    || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
    || !isDeepStrictEqual(transition.resultReferences, [assessment.reference])
    || !hasExactRelations(outward, expectedPairs, "applicability")
    || outward.some((relation) => !exactMetadata(
      relation, assessment.createdOrder, transition.createdOrder
    ))
    || participants.activeTrial.createdByTransitionRef === transition.reference
    || records.get(participants.activeTrial.createdByTransitionRef)?.createdOrder
      >= assessment.createdOrder
    || assessment.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Later-use applicability closure is malformed.");
  }
  return assessment;
}

export function validateLaterDispositionClosure({
  records, relations, sourceFactBindings, disposition, validateActiveDelayedTrial
}) {
  const transition = resolveUniqueCreatingTransition(records, disposition, "Later disposition");
  const assessment = validateLaterUseAssessmentClosure({
    records, relations, sourceFactBindings,
    assessment: records.get(disposition?.applicabilityAssessmentRef),
    validateActiveDelayedTrial
  });
  const activeTrial = records.get(assessment.activeTrialRef);
  const context = records.get(assessment.contextRef);
  const outward = relations.filter((relation) => relation.fromRef === disposition?.reference);
  const competing = [...records.values()].filter((record) => (
    record.family === "later_behavior_disposition"
    && record.applicabilityAssessmentRef === assessment.reference
  ));
  if (!hasExactKeys(disposition, DISPOSITION_KEYS)
    || disposition.family !== "later_behavior_disposition" || disposition.origin !== "sut"
    || disposition.dispositionType !== "active_delayed_trial_later_use"
    || disposition.activeTrialRef !== activeTrial.reference
    || disposition.applicabilityAssessmentRef !== assessment.reference
    || disposition.contextRef !== context.reference
    || disposition.materialIntent !== LATER_DELAYED_BEHAVIOR
    || disposition.requestedBehavior !== LATER_DELAYED_BEHAVIOR
    || disposition.behaviorEffect !== "apply_only_in_exact_later_spontaneous_context"
    || !isDeepStrictEqual(disposition.useScope, LATER_SPONTANEOUS_SCOPE)
    || disposition.globalPolicy !== "not_established"
    || disposition.durableAdaptation !== "unsupported_in_selected_slice"
    || disposition.statusOrigin !== "sut_transition"
    || disposition.interactionRef !== assessment.interactionRef
    || competing.length !== 1 || competing[0].reference !== disposition.reference
    || disposition.effectiveOrder !== disposition.createdOrder
    || assessment.applicabilityResult !== "applicable"
    || transition?.reference !== disposition.createdByTransitionRef
    || !hasExactKeys(transition, TRANSITION_KEYS)
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.transitionKind !== "derive_later_delayed_correction_disposition"
    || transition.interactionRef !== disposition.interactionRef
    || transition.result !== "later_delayed_correction_disposition_derived"
    || !isDeepStrictEqual(
      transition.inputReferences, [activeTrial.reference, assessment.reference, context.reference]
    )
    || !isDeepStrictEqual(transition.resultReferences, [disposition.reference])
    || !hasExactRelations(outward, [
      [activeTrial.reference, "applicable_active_trial"],
      [assessment.reference, "later_use_applicability"],
      [context.reference, "later_spontaneous_context"]
    ], "basis")
    || outward.some((relation) => !exactMetadata(
      relation, disposition.createdOrder, transition.createdOrder
    ))
    || assessment.createdOrder >= disposition.createdOrder
    || disposition.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Later behavior disposition closure is malformed.");
  }
  return disposition;
}

export function resolveLaterRealizationClosure({
  records, relations, sourceFactBindings, dispositionRef, expectedFactRef,
  validateLaterDisposition
}) {
  const disposition = validateLaterDisposition(records.get(dispositionRef));
  const facts = [...records.values()].filter((record) => (
    record.family === "input_fact" && record.role === "simulator_behavior_realization"
    && record.payload?.requestedRef === disposition.reference
  ));
  const transitions = [...records.values()].filter((record) => (
    record.transitionKind === "record_later_delayed_correction_realization"
    && (record.inputReferences?.includes(disposition.reference)
      || record.inputReferences?.some((reference) => (
        records.get(reference)?.payload?.requestedRef === disposition.reference
      )))
  ));
  const realizationRelations = relations.filter((relation) => (
    relation.relationKind === "realization"
    && (relation.toRef === disposition.reference
      || records.get(relation.fromRef)?.payload?.requestedRef === disposition.reference)
  ));
  if (transitions.length === 0 && realizationRelations.length === 0) return undefined;
  if (facts.length !== 1 || expectedFactRef && facts[0].reference !== expectedFactRef) {
    throw new SutStateIntegrityError("Later realization identity is ambiguous.");
  }
  const fact = facts[0];
  if (transitions.length !== 1 || realizationRelations.length !== 1) {
    throw new SutStateIntegrityError("Later realization closure is incomplete or ambiguous.");
  }
  const transition = transitions[0];
  const interaction = records.get(fact.firstInteractionRef);
  validateInput(
    records, relations, sourceFactBindings, fact, interaction,
    "simulator_behavior_realization", "simulated-dependency"
  );
  if (!hasExactKeys(transition, REALIZATION_TRANSITION_KEYS)
    || transition.transitionKind !== "record_later_delayed_correction_realization"
    || transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
    || transition.interactionRef !== interaction.reference
    || transition.result !== "later_delayed_correction_realization_recorded"
    || !isDeepStrictEqual(
      transition.inputReferences, [disposition.reference, fact.reference, interaction.reference]
    )
    || !isDeepStrictEqual(transition.resultReferences, [])
    || interaction.inputReferences.length !== 1
    || interaction.inputReferences[0] !== fact.reference
    || fact.payload.requestedRef !== disposition.reference
    || fact.payload.requestedBehavior !== LATER_DELAYED_BEHAVIOR
    || fact.payload.realizedBehavior !== LATER_DELAYED_BEHAVIOR
    || fact.payload.fidelity !== "match"
    || fact.payload.mismatchOrigin !== null
    || realizationRelations[0].fromRef !== fact.reference
    || realizationRelations[0].toRef !== disposition.reference
    || realizationRelations[0].targetRole !== "later_behavior_disposition"
    || !exactMetadata(
      realizationRelations[0], transition.createdOrder, transition.createdOrder
    )
    || records.get(disposition.createdByTransitionRef)?.createdOrder >= fact.createdOrder
    || fact.createdOrder >= interaction.createdOrder
    || records.get(interaction.createdByTransitionRef)?.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Later realization closure is malformed.");
  }
  return { disposition, fact, transition };
}

function validateDrillAttribution(records, relations, assertion, communication, interaction) {
  const transition = resolveUniqueCreatingTransition(
    records, assertion, "Drill opt-in attribution"
  );
  const ingestion = resolveUniqueCreatingTransition(
    records, interaction, "Drill opt-in ingestion"
  );
  const actor = records.get(assertion?.sourceActorRef);
  const sources = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "source"
  ));
  const bases = relations.filter((relation) => (
    relation.fromRef === assertion?.reference && relation.relationKind === "basis"
  ));
  const competing = [...records.values()].filter((record) => (
    record.family === "attributed_assertion"
    && record.sourceCommunicationRef === communication.reference
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
    || transition.reference !== assertion.createdByTransitionRef
    || transition.interactionRef !== interaction.reference
    || !isDeepStrictEqual(transition.inputReferences, [communication.reference])
    || !isDeepStrictEqual(transition.resultReferences, [assertion.reference])
    || transition.result !== "accepted"
    || sources.length !== 1 || sources[0].toRef !== actor.reference
    || sources[0].targetRole !== "semantic_source"
    || !exactMetadata(sources[0], assertion.createdOrder, transition.createdOrder)
    || bases.length !== 1 || bases[0].toRef !== communication.reference
    || bases[0].targetRole !== "attributed_communication"
    || !exactMetadata(bases[0], assertion.createdOrder, transition.createdOrder)
    || communication.createdOrder >= interaction.createdOrder
    || interaction.createdOrder >= ingestion.createdOrder
    || ingestion.createdOrder >= assertion.createdOrder
    || assertion.createdOrder >= transition.createdOrder) {
    throw new SutStateIntegrityError("Drill opt-in attribution closure is malformed.");
  }
}

function validateInput(
  records, relations, sourceFactBindings, fact, interaction, role, sourceActor
) {
  validateRetainedInputFact({
    records, relations, sourceFactBindings, fact,
    interaction, role,
    origin: role === "simulator_behavior_realization" ? "simulator" : "fixture",
    expectedSourceActor: sourceActor
  });
  const actor = records.get(fact.sourceActorRef);
  if (!hasExactKeys(fact, [
    "reference", "family", "origin", "role", "sourceFactRef", "payload",
    "firstInteractionRef", "createdOrder", "sourceActorRef"
  ]) || !hasExactKeys(actor, [
    "reference", "family", "origin", "sourceActor", "createdOrder"
  ])) {
    throw new SutStateIntegrityError(`${role} input-fact envelope is malformed.`);
  }
  for (const [segment, label] of new Map([
    [records.get(fact.firstInteractionRef), "original"],
    [interaction, "current"]
  ])) {
    const ingestion = resolveUniqueCreatingTransition(
      records, segment, `${role} ${label} ingestion`
    );
    const bases = relations.filter((relation) => (
      relation.fromRef === ingestion.reference && relation.relationKind === "basis"
    ));
    if (!hasExactKeys(segment, [
      "reference", "family", "origin", "inputReferences", "createdOrder",
      "createdByTransitionRef"
    ]) || !hasExactKeys(ingestion, TRANSITION_KEYS)
    || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
      || ingestion.transitionKind !== "ingest_sut_visible_inputs"
      || ingestion.interactionRef !== segment.reference
      || !isDeepStrictEqual(ingestion.inputReferences, segment.inputReferences)
      || !isDeepStrictEqual(ingestion.resultReferences, [segment.reference])
      || ingestion.result !== "accepted"
      || bases.length !== segment.inputReferences.length
      || segment.inputReferences.some((reference) => !bases.some((basis) => (
        basis.toRef === reference && basis.targetRole === "ingested_input"
      )))
      || bases.some((basis) => !exactMetadata(
        basis, ingestion.createdOrder, ingestion.createdOrder
      ))) {
      throw new SutStateIntegrityError(`${role} ${label}-ingestion closure is malformed.`);
    }
  }
}

function scopeFrom(payload) {
  return {
    activity: payload?.activity, taskMode: payload?.taskMode,
    surfaceLabel: payload?.surfaceLabel, consequence: payload?.consequence,
    scenarioDay: payload?.scenarioDay, sessionId: payload?.sessionId
  };
}

function hasExactRelations(relations, pairs, kind) {
  return relations.length === pairs.length && pairs.every(([ref, role]) => (
    relations.some((relation) => relation.relationKind === kind
      && relation.toRef === ref && relation.targetRole === role)
  ));
}

function exactMetadata(relation, effectiveOrder, createdOrder) {
  return relation.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === "sut";
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}
