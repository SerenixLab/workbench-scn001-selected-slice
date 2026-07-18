import assert from "node:assert/strict";
import test from "node:test";

import { createSutBoundary } from "@zoey/scn001-sut-core";

import { createEvaluationHarness } from "../index.js";
import { createHarnessForMechanismTests } from "../src/harness.js";
import {
  realizeAvailableOutput,
  realizeDirectCorrectionOutput,
  realizeFocusedDrillOutput,
  realizeProposalOutput
} from "../src/simulator.js";
import { createSimulatorProjector } from "../src/simulatorProjection.js";
import { projectFixtureRecord } from "../src/fixtureProjection.js";
import { findExactActiveProductionTrial } from "../src/productionActiveCheckpoint.js";
import { createSourceBindingLedger } from "../src/sourceBindingLedger.js";

function communicationFixtureRecord(overrides = {}) {
  return {
    fixtureRecordId: "V-003",
    role: "communication_event",
    sourceActor: "synthetic-user-a",
    occurrenceOrder: 1,
    data: {
      content: "Let me finish first.",
      context: "spontaneous_production",
      semanticStatusOrigin: "unclassified"
    },
    oracleAnnotations: {
      expectedTransition: "direct_correction",
      claimClass: "CC-SCOPE-TRIAL-USE"
    },
    ...overrides
  };
}

function taskObservationFixtureRecord(overrides = {}) {
  return {
    fixtureRecordId: "C-005",
    role: "task_observation",
    sourceActor: "fixture-scorer",
    occurrenceOrder: 1,
    data: {
      itemRef: "recognition-calibration-items",
      taskMode: "recognition",
      dimension: "particle_pattern_a",
      performance: { kind: "aggregate", correctCount: 4, totalCount: 4 },
      occurrenceScenarioDay: 135,
      sessionId: "session-current",
      sessionOrder: 2
    },
    oracleAnnotations: { expectedComparison: "recognition_score_higher" },
    ...overrides
  };
}

function deliveredFacts(harness, runRef) {
  return harness.captureInspectionSnapshot(runRef).records.filter((record) => record.family === "input_fact");
}

test("fixture projection removes evaluation-only annotations and adds only opaque source identity", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  harness.deliverFixtureRecords(runRef, [communicationFixtureRecord()]);
  const fact = deliveredFacts(harness, runRef)[0];

  assert.match(fact.payload.sourceFactRef, /^source_[0-9a-f-]{36}$/);
  assert.deepEqual(Object.keys(fact.payload).sort(), [
    "content", "context", "kind", "occurrenceOrder", "semanticStatusOrigin", "sourceActor", "sourceFactRef"
  ].sort());
  assert.doesNotMatch(JSON.stringify(fact), /expectedTransition|claimClass|fixtureRecordId|V-003/);
});

test("same fixture record is stable in one run and redelivery retains one canonical fact", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  const first = harness.deliverFixtureRecords(runRef, [communicationFixtureRecord()]);
  const second = harness.deliverFixtureRecords(runRef, [communicationFixtureRecord()]);
  assert.equal(first.acceptedInputRefs[0], second.acceptedInputRefs[0]);
  assert.equal(deliveredFacts(harness, runRef).length, 1);
  assert.equal(harness.captureInspectionSnapshot(runRef).records.filter((record) => record.family === "interaction_segment").length, 2);
});

test("different fixture IDs with identical visible content receive different identities and facts", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  const first = communicationFixtureRecord();
  const second = { ...structuredClone(first), fixtureRecordId: "V-003-DISTINCT" };
  const result = harness.deliverFixtureRecords(runRef, [first, second]);
  const facts = deliveredFacts(harness, runRef);
  assert.notEqual(facts[0].sourceFactRef, facts[1].sourceFactRef);
  assert.notEqual(result.acceptedInputRefs[0], result.acceptedInputRefs[1]);
});

test("same fixture record receives a different source identity in independent runs", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const firstRun = harness.startRun();
  harness.deliverFixtureRecords(firstRun, [communicationFixtureRecord()]);
  const firstSource = deliveredFacts(harness, firstRun)[0].sourceFactRef;
  harness.endRun(firstRun);
  const secondRun = harness.startRun();
  harness.deliverFixtureRecords(secondRun, [communicationFixtureRecord()]);
  const secondSource = deliveredFacts(harness, secondRun)[0].sourceFactRef;
  assert.notEqual(firstSource, secondSource);
});

test("source identity comes from projection state, not oracle annotations", () => {
  const first = projectFixtureRecord(communicationFixtureRecord({
    oracleAnnotations: { sourceFactRef: "source_00000000-0000-0000-0000-000000000000" }
  }));
  const second = projectFixtureRecord(communicationFixtureRecord({
    oracleAnnotations: { sourceFactRef: "source_00000000-0000-0000-0000-000000000000" }
  }));
  assert.notEqual(first.sourceFactRef, second.sourceFactRef);
  assert.notEqual(first.sourceFactRef, "source_00000000-0000-0000-0000-000000000000");
});

test("same fixture identity with changed visible meaning is rejected atomically", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  harness.deliverFixtureRecords(runRef, [communicationFixtureRecord()]);
  const before = harness.captureInspectionSnapshot(runRef);
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, [communicationFixtureRecord({
      data: {
        content: "Materially changed.",
        context: "spontaneous_production",
        semanticStatusOrigin: "unclassified"
      }
    })]),
    /cannot be rebound/
  );
  assert.deepEqual(harness.captureInspectionSnapshot(runRef), before);
});

test("fixture projection rejects pre-promoted conclusions and preserves raw performance", () => {
  assert.throws(
    () => projectFixtureRecord(communicationFixtureRecord({
      data: {
        content: "Let me finish first.",
        context: "spontaneous_production",
        semanticStatusOrigin: "unclassified",
        correctionControlState: "active"
      }
    })),
    /must contain exactly/
  );
  const projected = projectFixtureRecord(taskObservationFixtureRecord());
  assert.equal(projected.kind, "task_observation");
  assert.deepEqual(projected.performance, { kind: "aggregate", correctCount: 4, totalCount: 4 });
  assert.doesNotMatch(JSON.stringify(projected), /expectedComparison|comparisonResult/);
});

test("state-reference projection carries no purpose, use, applicability, or candidate selector", () => {
  const projected = projectFixtureRecord({
    fixtureRecordId: "L-002",
    role: "sut_state_reference",
    sourceActor: "fixture-driver",
    occurrenceOrder: 4,
    data: { stateRef: "state_00000000-0000-0000-0000-000000000000" },
    oracleAnnotations: { expectedDisposition: "form_candidate", purpose: "candidate_support" }
  });
  assert.deepEqual(Object.keys(projected).sort(), [
    "kind", "occurrenceOrder", "sourceActor", "sourceFactRef", "stateRef"
  ].sort());
  assert.doesNotMatch(JSON.stringify(projected), /candidate_support|independent_current_skill_authority|purpose|expectedDisposition/);
  assert.throws(
    () => projectFixtureRecord({
      fixtureRecordId: "REF-COMPARISON",
      role: "sut_state_reference",
      sourceActor: "fixture-driver",
      occurrenceOrder: 4,
      data: {
        stateRef: "state_00000000-0000-0000-0000-000000000000",
        purpose: "candidate_support"
      },
      oracleAnnotations: {}
    }),
    /must contain exactly/
  );
});

test("fixture-initialized origin and simulator realization role remain preserved", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  const historical = harness.deliverFixtureRecords(runRef, [communicationFixtureRecord({
    fixtureRecordId: "H-003",
    data: {
      content: "I always freeze on particles.",
      context: "old_practice_history",
      semanticStatusOrigin: "fixture_initialized"
    }
  })]);
  const assertion = harness.captureInspectionSnapshot(runRef).records.find((record) => record.family === "attributed_assertion");
  assert.equal(assertion.statusOrigin, "fixture_initialized");
  assert.equal(assertion.sourceCommunicationRef, historical.acceptedInputRefs[0]);

  const realization = projectFixtureRecord({
    fixtureRecordId: "D-003R",
    role: "simulator_realization_fact",
    sourceActor: "simulated-dependency",
    occurrenceOrder: 3,
    data: {
      requestedRef: historical.acceptedInputRefs[0],
      realizedBehavior: "Immediate correction surfaced.",
      fidelity: "match"
    },
    oracleAnnotations: { canonicalMatch: true }
  });
  assert.equal(realization.kind, "simulator_realization");
  assert.doesNotMatch(JSON.stringify(realization), /canonicalMatch/);
});

test("evaluation cannot import a private SUT module through the package boundary", async () => {
  await assert.rejects(
    import("@zoey/scn001-sut-core/src/runState.js"),
    (error) => error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
  );
});

function productionProposalRecords() {
  return [
    {
      fixtureRecordId: "C-004", role: "chronology_fact", sourceActor: "fixture-driver",
      occurrenceOrder: 3,
      data: { scenarioDay: 135, sessionId: "session-current", sessionOrder: 2 },
      oracleAnnotations: { pathId: "canonical", expectedTransition: "current" }
    },
    taskObservationFixtureRecord(),
    taskObservationFixtureRecord({
      fixtureRecordId: "C-006",
      occurrenceOrder: 2,
      data: {
        ...taskObservationFixtureRecord().data,
        itemRef: "production-calibration-items",
        taskMode: "spontaneous_production",
        performance: { kind: "aggregate", correctCount: 1, totalCount: 4 }
      }
    }),
    {
      fixtureRecordId: "C-007", role: "context_label", sourceActor: "fixture-driver",
      occurrenceOrder: 4,
      data: { surfaceLabel: "text_simulated", activity: "japanese_practice", taskMode: "spontaneous_production", consequence: "low" },
      oracleAnnotations: { canonicalAnswer: true }
    },
    {
      fixtureRecordId: "TD-001", role: "affordance_fact", sourceActor: "fixture-driver",
      occurrenceOrder: 5,
      data: { direction: "TRIAL-PROD-FOCUS", description: "Production-focused practice." },
      oracleAnnotations: { expectedTransition: "proposal" }
    },
    {
      fixtureRecordId: "FC-TRIAL-001", role: "fixture_control_fact", sourceActor: "fixture-driver",
      occurrenceOrder: 6,
      data: { control: "trial_policy", value: "bounded_reversible_trial_no_durable_adaptation" },
      oracleAnnotations: { expectedTransition: "activation_check" }
    },
    {
      fixtureRecordId: "FC-CONSEQ-001", role: "fixture_control_fact", sourceActor: "fixture-driver",
      occurrenceOrder: 13,
      data: { control: "consequence", value: "low" },
      oracleAnnotations: { expectedTransition: "activation_check" }
    },
    {
      fixtureRecordId: "FC-REV-001", role: "fixture_control_fact", sourceActor: "fixture-driver",
      occurrenceOrder: 14,
      data: { control: "reversibility", value: "reversible" },
      oracleAnnotations: { expectedTransition: "activation_check" }
    }
  ];
}

function proposalAcceptanceRecords() {
  const definitions = [
    ["P-USER-ACCEPT", "user_response", "synthetic-user-a", {
      content: "Yes, let's try that.", context: "proposal_response"
    }],
    ["FC-RET-001", "fixture_control_fact", "fixture-driver", {
      control: "evaluation_retention_basis", value: "named_formal_run"
    }],
    ["FC-UGC-001", "fixture_control_fact", "fixture-driver", {
      control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
    }],
    ["FC-CONSEQ-001", "fixture_control_fact", "fixture-driver", {
      control: "consequence", value: "low"
    }],
    ["FC-REV-001", "fixture_control_fact", "fixture-driver", {
      control: "reversibility", value: "reversible"
    }]
  ];
  return definitions.map(([fixtureRecordId, role, sourceActor, data], index) => ({
    fixtureRecordId, role, sourceActor, occurrenceOrder: index + 10, data,
    oracleAnnotations: { branchEligible: true, expectedTransition: "activate" }
  }));
}

function focusedDrillOpeningRecords() {
  return [
    {
      fixtureRecordId: "D-001", role: "context_label", sourceActor: "fixture-driver",
      occurrenceOrder: 15,
      data: {
        surfaceLabel: "text_simulated", activity: "japanese_practice",
        taskMode: "focused_production_drill", consequence: "low"
      },
      oracleAnnotations: { checkpoint: "CP-PROD-ACTIVE" }
    },
    {
      fixtureRecordId: "D-002", role: "communication_event",
      sourceActor: "synthetic-user-a", occurrenceOrder: 16,
      data: {
        content: "Please correct me right away during this drill.",
        context: "focused_production_drill", semanticStatusOrigin: "unclassified"
      },
      oracleAnnotations: { expectedBehavior: "immediate_correction" }
    }
  ];
}

function focusedDrillOutcomeRecords() {
  return [
    {
      fixtureRecordId: "D-003", role: "task_observation", sourceActor: "fixture-scorer",
      occurrenceOrder: 17,
      data: {
        itemRefs: ["DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"],
        taskMode: "focused_production_drill", dimension: "particle_pattern_a",
        performance: { kind: "aggregate", correctCount: 5, totalCount: 6 },
        occurrenceScenarioDay: 135, sessionId: "focused-drill-current", sessionOrder: 3
      },
      oracleAnnotations: { checkpoint: "CP-DRILL-REALIZATION-MATCH" }
    },
    {
      fixtureRecordId: "D-004", role: "outcome_fact", sourceActor: "synthetic-user-a",
      occurrenceOrder: 18,
      data: {
        observation: "That helped for this drill.", context: "focused_production_drill"
      },
      oracleAnnotations: { expectedOutcome: "positive_short_term" }
    }
  ];
}

function spontaneousCorrectionRecords() {
  const definitions = [
    ["V-001", "context_label", "fixture-driver", 19, {
      surfaceLabel: "voice_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low",
      realVoiceStack: "absent", scenarioDay: 138,
      sessionId: "spontaneous-correction-current"
    }],
    ["V-002", "fixture_evidence", "fixture-driver", 20, {
      event: "over_aggressive_mid_sentence_interruption",
      context: "current_spontaneous_production_session"
    }],
    ["V-003", "communication_event", "synthetic-user-a", 21, {
      content: "Don't stop me mid-sentence like that here. Let me finish first.",
      context: "spontaneous_production", semanticStatusOrigin: "unclassified"
    }],
    ["V-004", "chronology_fact", "fixture-driver", 22, {
      scenarioDay: 138, sessionId: "spontaneous-correction-current", sessionOrder: 4,
      focusedDrillScenarioDay: 135, oldDrillPreferenceScenarioDay: 15
    }],
    ["FC-UGC-001", "fixture_control_fact", "fixture-driver", 12, {
      control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
    }],
    ["FC-CONSEQ-001", "fixture_control_fact", "fixture-driver", 13, {
      control: "consequence", value: "low"
    }],
    ["FC-REV-001", "fixture_control_fact", "fixture-driver", 14, {
      control: "reversibility", value: "reversible"
    }]
  ];
  return definitions.map(([fixtureRecordId, role, sourceActor, occurrenceOrder, data]) => ({
    fixtureRecordId, role, sourceActor, occurrenceOrder, data,
    oracleAnnotations: { checkpoint: "CP-DIRECT-CORRECTION-REALIZED" }
  }));
}

function activateProductionTrial(harness, runRef) {
  harness.deliverFixtureRecords(runRef, productionProposalRecords());
  harness.processCurrentInteraction(runRef);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  harness.deliverProposalAcceptanceIfEligible(runRef, proposalAcceptanceRecords());
  harness.processCurrentInteraction(runRef);
}

function completeFocusedDrill(harness, runRef) {
  activateProductionTrial(harness, runRef);
  harness.deliverFocusedDrillInputsIfEligible(runRef, focusedDrillOpeningRecords());
  harness.processCurrentInteraction(runRef);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  harness.deliverFocusedDrillOutcomeIfEligible(runRef, focusedDrillOutcomeRecords());
  harness.processCurrentInteraction(runRef);
}

function completeDirectCorrection(harness, runRef) {
  completeFocusedDrill(harness, runRef);
  harness.deliverSpontaneousCorrectionInputsIfEligible(
    runRef, spontaneousCorrectionRecords()
  );
  harness.processCurrentInteraction(runRef);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
}

function seedStaleHistory(harness, runRef) {
  const oldObservation = taskObservationFixtureRecord({
    fixtureRecordId: "H-002",
    occurrenceOrder: 1,
    data: {
      ...taskObservationFixtureRecord().data,
      itemRef: "historical-target-production-evidence",
      taskMode: "spontaneous_production",
      occurrenceScenarioDay: 0,
      sessionId: "old-practice-history",
      sessionOrder: 1
    },
    oracleAnnotations: { expectedTemporalStatus: "stale" }
  });
  const unrelatedObservation = taskObservationFixtureRecord({
    fixtureRecordId: "DEV-HIST-DISTRACTOR",
    occurrenceOrder: 2,
    data: {
      ...oldObservation.data,
      itemRef: "unrelated-historical-evidence",
      dimension: "unrelated_dimension"
    },
    oracleAnnotations: { explanationRelevance: "excluded" }
  });
  harness.deliverFixtureRecords(runRef, [oldObservation, unrelatedObservation]);
  harness.processCurrentInteraction(runRef);
  harness.deliverFixtureRecords(runRef, [oldObservation, unrelatedObservation, {
    fixtureRecordId: "C-004", role: "chronology_fact", sourceActor: "fixture-driver",
    occurrenceOrder: 3,
    data: { scenarioDay: 135, sessionId: "session-current", sessionOrder: 2 },
    oracleAnnotations: { expectedTemporalStatus: "stale" }
  }]);
  harness.processCurrentInteraction(runRef);
}

function laterUseRecords(activeTrialRef, counterfactual = false) {
  const definitions = counterfactual ? [
    ["CF2-L-001", "context_label", "fixture-driver", 30, {
      surfaceLabel: "voice_simulated", activity: "focused_accuracy_drill",
      taskMode: "focused_production_drill", consequence: "low", scenarioDay: 145,
      sessionId: "focused-opt-in-later"
    }],
    ["CF2-L-002", "communication_event", "synthetic-user-a", 31, {
      content: "For this drill, correct me immediately so I can fix each attempt.",
      context: "focused_production_drill", semanticStatusOrigin: "unclassified"
    }],
    ["CF2-L-003", "sut_state_reference", "fixture-driver", 32, {
      stateRef: activeTrialRef
    }]
  ] : [
    ["L-001", "context_label", "fixture-driver", 30, {
      surfaceLabel: "voice_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low", scenarioDay: 145,
      sessionId: "spontaneous-outcome-later"
    }],
    ["L-002", "sut_state_reference", "fixture-driver", 31, {
      stateRef: activeTrialRef
    }]
  ];
  definitions.push(
    ["FC-UGC-001", "fixture_control_fact", "fixture-driver", 12, {
      control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
    }],
    ["FC-CONSEQ-001", "fixture_control_fact", "fixture-driver", 13, {
      control: "consequence", value: "low"
    }]
  );
  return definitions.map(([fixtureRecordId, role, sourceActor, occurrenceOrder, data]) => ({
    fixtureRecordId, role, sourceActor, occurrenceOrder, data,
    oracleAnnotations: { checkpoint: counterfactual ? "CF-DRILL-OPT-IN" : "CP-LATER-DISPOSITION" }
  }));
}

function laterOutcomeRecords() {
  return [
    {
      fixtureRecordId: "L-003", role: "outcome_fact", sourceActor: "fixture-scorer",
      occurrenceOrder: 33,
      data: {
        observation: "user_spoke_longer", context: "spontaneous_production",
        comparison: {
          metric: "speaking_duration", relation: "longer_than",
          baselineSessionId: "spontaneous-correction-current",
          currentSessionId: "spontaneous-outcome-later"
        }
      },
      oracleAnnotations: { checkpoint: "CP-CANONICAL-INTERVENTION" }
    },
    {
      fixtureRecordId: "L-004", role: "outcome_fact", sourceActor: "synthetic-user-a",
      occurrenceOrder: 34,
      data: {
        observation: "This pacing feels easier.", context: "spontaneous_production"
      },
      oracleAnnotations: { claimClass: "CC-OUTCOME-SEMANTICS" }
    },
    {
      fixtureRecordId: "L-005", role: "material_context_change",
      sourceActor: "fixture-driver", occurrenceOrder: 35,
      data: {
        description: "no_zoey_available_co_intervention_event_supplied",
        coInterventionVisibility: "none_supplied_to_zoey",
        completeness: "non_exhaustive_for_private_or_unobserved_causes"
      },
      oracleAnnotations: { completeness: "non_exhaustive" }
    }
  ];
}

function explanationRecords() {
  return [{
    fixtureRecordId: "X-001", role: "communication_event",
    sourceActor: "synthetic-user-a", occurrenceOrder: 36,
    data: {
      content: "Why are you correcting differently now?",
      context: "spontaneous_production", semanticStatusOrigin: "unclassified"
    },
    oracleAnnotations: { claimClass: "CC-EXPLANATION-PROVENANCE" }
  }];
}

function completeLaterRealization(harness, runRef) {
  const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
  harness.deliverLaterUseInputsIfEligible(
    runRef, laterUseRecords(active.activeTrialRef)
  );
  harness.processCurrentInteraction(runRef);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  return active;
}

function completeLaterOutcome(harness, runRef) {
  seedStaleHistory(harness, runRef);
  completeDirectCorrection(harness, runRef);
  completeLaterRealization(harness, runRef);
  harness.deliverLaterOutcomeIfEligible(runRef, laterOutcomeRecords());
  harness.processCurrentInteraction(runRef);
  return harness.inspectLaterOutcomeCheckpoint(runRef)[0];
}

function completeGroundedExplanation(harness, runRef) {
  const outcome = completeLaterOutcome(harness, runRef);
  harness.deliverExplanationPromptIfEligible(runRef, explanationRecords());
  harness.processCurrentInteraction(runRef);
  return { outcome, explanation: harness.inspectExplanationCheckpoint(runRef)[0] };
}

function sourceBindingEvidenceFrom(snapshot) {
  const records = new Map(snapshot.records.map((record) => [record.reference, record]));
  return snapshot.records
    .filter((record) => record.family === "input_fact")
    .map((fact) => {
      const firstInteraction = records.get(fact.firstInteractionRef);
      return {
        sourceFactRef: fact.sourceFactRef,
        projectedMeaning: structuredClone(fact.payload),
        acceptedInputFactRef: fact.reference,
        firstInteractionRef: fact.firstInteractionRef,
        firstIngestionTransitionRef: firstInteraction.createdByTransitionRef,
        deliveryOrigin: fact.origin,
        role: fact.role
      };
    });
}

function rewriteSourceIdentity(fact, suffix) {
  fact.sourceFactRef = `${fact.sourceFactRef}-${suffix}`;
  fact.payload.sourceFactRef = fact.sourceFactRef;
}

function sharedControlClosure(snapshot, control) {
  const fact = snapshot.records.find((record) => (
    record.role === "fixture_control_fact" && record.payload.control === control
  ));
  const containingInteractions = snapshot.records
    .filter((record) => record.family === "interaction_segment"
      && record.inputReferences.includes(fact.reference))
    .sort((left, right) => left.createdOrder - right.createdOrder);
  assert.equal(containingInteractions.length, 2);
  const [candidateInteraction, bindingInteraction] = containingInteractions;
  return {
    fact,
    candidateInteraction,
    bindingInteraction,
    candidateIngestion: snapshot.records.find((record) => (
      record.reference === candidateInteraction.createdByTransitionRef
    )),
    bindingIngestion: snapshot.records.find((record) => (
      record.reference === bindingInteraction.createdByTransitionRef
    ))
  };
}

function retargetSharedControlToBinding(snapshot, control) {
  const closure = sharedControlClosure(snapshot, control);
  closure.fact.firstInteractionRef = closure.bindingInteraction.reference;
  snapshot.relations.find((relation) => (
    relation.fromRef === closure.fact.reference && relation.relationKind === "source"
  )).createdOrder = closure.bindingIngestion.createdOrder;
  return closure;
}

function redeliveredControlEvidence(evidence, snapshot, control) {
  const closure = sharedControlClosure(snapshot, control);
  return {
    entry: evidence.find((item) => item.acceptedInputFactRef === closure.fact.reference),
    laterInteraction: closure.bindingInteraction
  };
}

function appendConflictingBinding(evidence, snapshot, conflictingIdentity) {
  const { entry, laterInteraction } = redeliveredControlEvidence(
    evidence, snapshot, "consequence"
  );
  const duplicate = structuredClone(entry);
  duplicate.sourceFactRef = `${duplicate.sourceFactRef}-second-source`;
  duplicate.projectedMeaning.sourceFactRef = duplicate.sourceFactRef;
  if (conflictingIdentity === "interaction") {
    duplicate.firstInteractionRef = laterInteraction.reference;
  } else {
    duplicate.firstIngestionTransitionRef = laterInteraction.createdByTransitionRef;
  }
  evidence.push(duplicate);
}

test("simulator validates the closed request and deterministically preserves material meaning", () => {
  const request = {
    kind: "proposal_realization_request",
    outputRef: "transition_00000000-0000-0000-0000-000000000000",
    requestedRef: "state_00000000-0000-0000-0000-000000000000",
    candidateRef: "state_11111111-1111-1111-1111-111111111111",
    materialIntent: "offer_scoped_trial_for_user_decision",
    candidateMaterialIntent: "practice_spontaneous_production_for_target_dimension",
    proposedScope: { dimension: "particle_pattern_a", taskMode: "spontaneous_production" }
  };
  const first = realizeProposalOutput(request, 4);
  const second = realizeProposalOutput(request, 4);
  assert.equal(first.realizedBehavior, second.realizedBehavior);
  assert.equal(first.realizedBehavior, "Would you like to try a short practice focused on producing particle pattern a yourself?");
  assert.equal(first.fidelity, "match");
  assert.equal(first.requestedOutputRef, request.outputRef);
  assert.equal(first.requestedRef, request.requestedRef);
  assert.equal(first.candidateRef, request.candidateRef);
  assert.throws(() => realizeProposalOutput({ ...request, fixturePath: "canonical" }), /contain exactly/);
  const missing = structuredClone(request);
  delete missing.materialIntent;
  assert.throws(() => realizeProposalOutput(missing), /contain exactly/);
});

test("dedicated simulator projection strips evaluation-only fields and stabilizes identity per projector", () => {
  const request = {
    kind: "proposal_realization_request",
    outputRef: "transition_00000000-0000-0000-0000-000000000000",
    requestedRef: "state_00000000-0000-0000-0000-000000000000",
    candidateRef: "state_11111111-1111-1111-1111-111111111111",
    materialIntent: "offer_scoped_trial_for_user_decision",
    candidateMaterialIntent: "practice_spontaneous_production_for_target_dimension",
    proposedScope: { dimension: "particle_pattern_a", taskMode: "spontaneous_production" }
  };
  const record = realizeProposalOutput(request);
  const projector = createSimulatorProjector();
  const first = projector.project(record);
  const second = projector.project(record);
  const other = projector.project(realizeProposalOutput(request));
  const independent = createSimulatorProjector().project(record);
  assert.deepEqual(first, second);
  assert.notEqual(first.sourceFactRef, record.simulatorRecordId);
  assert.notEqual(first.sourceFactRef, other.sourceFactRef);
  assert.notEqual(first.sourceFactRef, independent.sourceFactRef);
  assert.deepEqual(Object.keys(first).sort(), [
    "fidelity", "kind", "occurrenceOrder", "realizedBehavior", "requestedRef", "sourceActor", "sourceFactRef"
  ].sort());
  assert.doesNotMatch(JSON.stringify(first), /requestedOutputRef|candidateRef|MaterialIntent|Scope|mismatchOrigin|oracle|branch/i);
  const laterRecord = realizeAvailableOutput({
    kind: "later_delayed_correction_request",
    outputRef: "transition_00000000-0000-0000-0000-000000000001",
    requestedRef: "state_00000000-0000-0000-0000-000000000001",
    requestedBehavior: "delay_minor_correction_until_turn_completion",
    useScope: {
      activity: "japanese_practice", taskMode: "spontaneous_production",
      surfaceLabel: "voice_simulated", consequence: "low", scenarioDay: 145,
      sessionId: "spontaneous-outcome-later"
    }
  });
  const laterProjected = projector.project(laterRecord);
  assert.equal(laterRecord.canonicalInterventionPremiseMatch, true);
  assert.equal(Object.hasOwn(laterProjected, "canonicalInterventionPremise"), false);
  assert.equal(Object.hasOwn(laterProjected, "canonicalInterventionPremiseMatch"), false);
});

test("public proposal output routes once and SUT records exact realization without response or activation", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  harness.deliverFixtureRecords(runRef, productionProposalRecords());
  assert.deepEqual(harness.processCurrentInteraction(runRef), []);
  const output = harness.emitAvailableOutputs(runRef)[0];
  const first = harness.realizeAvailableOutputs(runRef);
  const second = harness.realizeAvailableOutputs(runRef);
  assert.equal(first.length, 1);
  assert.equal(first[0], second[0]);
  assert.equal(first[0].requestedOutputRef, output.outputRef);
  assert.equal(first[0].requestedRef, output.requestedRef);
  let snapshot = harness.captureInspectionSnapshot(runRef);
  assert.equal(snapshot.records.filter((record) => record.role === "simulator_realization").length, 1);
  assert.equal(snapshot.relations.some((relation) => relation.relationKind === "realization"), false);
  harness.processCurrentInteraction(runRef);
  snapshot = harness.captureInspectionSnapshot(runRef);
  const fact = snapshot.records.find((record) => record.role === "simulator_realization");
  const realizationTransition = snapshot.records.find((record) => record.transitionKind === "record_proposal_realization");
  assert.deepEqual(realizationTransition.inputReferences, [fact.reference, output.outputRef, output.requestedRef]);
  assert.equal(snapshot.relations.filter((relation) => (
    relation.relationKind === "realization" && relation.fromRef === fact.reference
      && relation.toRef === output.requestedRef && relation.targetRole === "proposal_intent"
  )).length, 1);
  assert.deepEqual(harness.emitAvailableOutputs(runRef), []);
  assert.equal(snapshot.records.some((record) => [
    "user_response_binding", "binding_assessment", "activation_assessment", "active_trial",
    "formal_evaluation_record", "scoring_artifact"
  ].includes(record.family)), false);
  assert.doesNotMatch(JSON.stringify(snapshot), /P-USER-ACCEPT/);
});

test("generic formal delivery rejects user responses before projection or SUT mutation", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const runRef = harness.startRun();
  const before = harness.captureInspectionSnapshot(runRef);
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, [proposalAcceptanceRecords()[0]]),
    /cannot deliver user_response/
  );
  assert.deepEqual(harness.captureInspectionSnapshot(runRef), before);
});

test("branch delivery waits for exact processed realization then creates canonical binding", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const runRef = harness.startRun();
  const acceptance = proposalAcceptanceRecords();
  assert.deepEqual(harness.deliverProposalAcceptanceIfEligible(runRef, acceptance), []);
  harness.deliverFixtureRecords(runRef, productionProposalRecords());
  harness.processCurrentInteraction(runRef);
  const routed = harness.realizeAvailableOutputs(runRef)[0];
  assert.deepEqual(harness.deliverProposalAcceptanceIfEligible(runRef, acceptance), []);
  harness.processCurrentInteraction(runRef);
  const delivered = harness.deliverProposalAcceptanceIfEligible(runRef, acceptance);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].outputRef, routed.requestedOutputRef);
  const beforeReplay = harness.captureInspectionSnapshot(runRef);
  assert.equal(harness.deliverProposalAcceptanceIfEligible(runRef, acceptance), delivered);
  assert.deepEqual(harness.captureInspectionSnapshot(runRef), beforeReplay);
  harness.processCurrentInteraction(runRef);
  const snapshot = harness.captureInspectionSnapshot(runRef);
  const assessment = snapshot.records.find((record) => record.family === "binding_assessment");
  assert.equal(assessment.bindingStatus, "bound");
  assert.equal(assessment.responseStatus, "accepted");
  assert.equal(assessment.materialIntentStatus, "match");
  assert.equal(assessment.proposalRef, routed.requestedRef);
  assert.equal(assessment.realizationFactRefs.length, 1);
  assert.equal(assessment.userResponseRefs.length, 1);
  const bindingInteraction = snapshot.records.find((record) => record.reference === assessment.interactionRef);
  const acceptanceIngestion = snapshot.records.find((record) => (
    record.reference === bindingInteraction.createdByTransitionRef
  ));
  assert.deepEqual(acceptanceIngestion.resultReferences, [bindingInteraction.reference]);
  assert.equal(snapshot.relations.filter((relation) => (
    relation.fromRef === assessment.reference && relation.relationKind === "binding"
  )).length, 3);
  const response = snapshot.records.find((record) => record.reference === assessment.userResponseRefs[0]);
  assert.deepEqual(Object.keys(response.payload).sort(), [
    "content", "context", "kind", "occurrenceOrder", "sourceActor", "sourceFactRef"
  ].sort());
  assert.equal(["proposalRef", "candidateRef", "realizationRef", "bindingStatus",
    "branchPolicy", "activationIntent"].some((key) => key in response.payload), false);
  const activation = snapshot.records.find((record) => record.family === "activation_assessment");
  const trial = snapshot.records.find((record) => record.family === "active_trial");
  assert.deepEqual(Object.keys(activation.checkResults).sort(), [
    "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
    "reversibility", "consequence", "current_applicability", "retention_basis",
    "non_adaptation_boundary"
  ].sort());
  assert.equal(Object.values(activation.checkResults).every((result) => (
    Object.keys(result).sort().join("|") === "reason|status" && result.status === "passed"
  )), true);
  assert.equal(activation.overallStatus, "sufficient");
  assert.equal(trial.candidateRef, activation.candidateRef);
  assert.equal(trial.activationAssessmentRef, activation.reference);
  assert.equal(trial.trialOrigin, "zoey_derived_trial");
  assert.equal(snapshot.records.find((record) => record.reference === trial.candidateRef).lifecycleStatus, "formed_non_active");
  assert.equal(snapshot.relations.filter((relation) => (
    relation.fromRef === activation.reference && relation.relationKind === "basis"
  )).length, 14);
  const activationTransition = snapshot.records.find((record) => (
    record.reference === activation.createdByTransitionRef
  ));
  assert.equal(activationTransition.inputReferences.length, 12);
  for (const record of [activation, trial]) assert.equal(snapshot.records.filter(
    (candidate) => candidate.reference === record.createdByTransitionRef
      || candidate.resultReferences?.includes(record.reference)
  ).length, 1);
  for (const [key, roles] of [
    ["consequenceRefs", ["candidate_consequence_control", "binding_consequence_control"]],
    ["reversibilityRefs", ["candidate_reversibility_control", "binding_reversibility_control"]]
  ]) {
    const candidateRef = activation.controlBasisRefs.candidateInteraction[key][0];
    assert.equal(candidateRef, activation.controlBasisRefs.bindingInteraction[key][0]);
    for (const role of roles) assert.equal(snapshot.relations.some((relation) => (
      relation.fromRef === activation.reference && relation.toRef === candidateRef
        && relation.targetRole === role
    )), true);
  }
  assert.equal(snapshot.relations.filter((relation) => (
    relation.fromRef === trial.reference && relation.relationKind === "transition_ancestry"
  )).length, 2);
  assert.deepEqual(harness.processCurrentInteraction(runRef), []);
  assert.deepEqual(harness.emitAvailableOutputs(runRef), []);
  assert.doesNotMatch(JSON.stringify(snapshot), /fixtureRecordId|canonicalAnswer|activation_check/);
  assert.equal(harness.deliverProposalAcceptanceIfEligible(runRef, acceptance).length, 1);
  harness.processCurrentInteraction(runRef);
  const replay = harness.captureInspectionSnapshot(runRef);
  assert.equal(replay.records.filter((record) => record.family === "activation_assessment").length, 1);
  assert.equal(replay.records.filter((record) => record.family === "active_trial").length, 1);
  assert.equal(replay.records.filter((record) => (
    record.transitionKind === "assess_production_focused_trial_activation"
  )).length, 1);
  assert.equal(replay.records.filter((record) => (
    record.transitionKind === "activate_production_focused_trial"
  )).length, 1);
  for (const family of ["activation_assessment", "active_trial"]) {
    const record = replay.records.find((candidate) => candidate.family === family);
    assert.equal(replay.records.filter((candidate) => (
      candidate.reference === record.createdByTransitionRef
        || candidate.resultReferences?.includes(record.reference)
    )).length, 1);
  }
  const replayActivation = replay.records.find(
    (record) => record.family === "activation_assessment"
  );
  const replayTrial = replay.records.find((record) => record.family === "active_trial");
  assert.equal(replay.relations.filter((relation) => (
    relation.fromRef === replayActivation.reference && relation.relationKind === "basis"
  )).length, 14);
  assert.equal(replay.relations.filter((relation) => (
    relation.fromRef === replayTrial.reference
      && relation.relationKind === "transition_ancestry"
  )).length, 2);
  harness.endRun(runRef);
  assert.throws(() => harness.captureInspectionSnapshot(runRef), /Unknown or closed/);
});

test("activation assessment and active trial identities are isolated across independent runs", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const activate = () => {
    const runRef = harness.startRun();
    harness.deliverFixtureRecords(runRef, productionProposalRecords());
    harness.processCurrentInteraction(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    harness.deliverProposalAcceptanceIfEligible(runRef, proposalAcceptanceRecords());
    harness.processCurrentInteraction(runRef);
    const snapshot = harness.captureInspectionSnapshot(runRef);
    return {
      runRef,
      assessment: snapshot.records.find((record) => record.family === "activation_assessment"),
      trial: snapshot.records.find((record) => record.family === "active_trial")
    };
  };
  const first = activate();
  harness.endRun(first.runRef);
  const second = activate();
  assert.notEqual(second.assessment.reference, first.assessment.reference);
  assert.notEqual(second.trial.reference, first.trial.reference);
  assert.equal(harness.captureInspectionSnapshot(second.runRef).records.some((record) => (
    record.reference === first.assessment.reference || record.reference === first.trial.reference
  )), false);
  assert.throws(
    () => boundary.inspectRecord(second.runRef, first.assessment.reference),
    /Unknown or closed/
  );
  assert.throws(
    () => boundary.inspectRecord(second.runRef, first.trial.reference),
    /Unknown or closed/
  );
});

test("formal harness stages the complete focused-drill trajectory through both exact checkpoints", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  const opening = focusedDrillOpeningRecords();
  const outcomeFacts = focusedDrillOutcomeRecords();
  assert.deepEqual(harness.deliverFocusedDrillInputsIfEligible(runRef, opening), []);
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, opening),
    /staged checkpoint delivery/
  );
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, opening.map((record, index) => ({
      ...record, fixtureRecordId: `RENAMED-OPEN-${index}`
    }))),
    /staged checkpoint delivery/
  );
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, outcomeFacts.map((record, index) => ({
      ...record, fixtureRecordId: `RENAMED-OUTCOME-${index}`
    }))),
    /staged checkpoint delivery/
  );
  harness.deliverFixtureRecords(runRef, productionProposalRecords());
  harness.processCurrentInteraction(runRef);
  assert.deepEqual(harness.deliverFocusedDrillInputsIfEligible(runRef, opening), []);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  assert.deepEqual(harness.deliverFocusedDrillInputsIfEligible(runRef, opening), []);
  harness.deliverProposalAcceptanceIfEligible(runRef, proposalAcceptanceRecords());
  harness.processCurrentInteraction(runRef);
  const beforeDrill = harness.captureInspectionSnapshot(runRef);
  const candidateBefore = structuredClone(beforeDrill.records.find(
    (record) => record.family === "trial_candidate"
  ));
  const activeTrialBefore = structuredClone(beforeDrill.records.find(
    (record) => record.family === "active_trial"
  ));
  const deliveredOpening = harness.deliverFocusedDrillInputsIfEligible(runRef, opening);
  assert.equal(deliveredOpening.length, 1);
  assert.equal(deliveredOpening[0].activeTrialRef, activeTrialBefore.reference);
  harness.processCurrentInteraction(runRef);
  let snapshot = harness.captureInspectionSnapshot(runRef);
  const instruction = snapshot.records.find(
    (record) => record.family === "focused_drill_instruction"
  );
  const disposition = snapshot.records.find(
    (record) => record.family === "focused_drill_behavior_disposition"
  );
  assert.ok(instruction);
  assert.ok(disposition);
  assert.notEqual(instruction.reference, activeTrialBefore.reference);
  assert.notEqual(disposition.reference, instruction.reference);
  assert.notEqual(disposition.reference, activeTrialBefore.reference);
  assert.equal(instruction.activeTrialRef, activeTrialBefore.reference);
  assert.equal(disposition.activeTrialRef, activeTrialBefore.reference);
  assert.equal(disposition.instructionRef, instruction.reference);
  const outputs = harness.emitAvailableOutputs(runRef);
  assert.equal(outputs.length, 1);
  assert.deepEqual(Object.keys(outputs[0]).sort(), [
    "drillScope", "kind", "outputRef", "requestedBehavior", "requestedRef"
  ].sort());
  assert.equal(outputs[0].kind, "focused_drill_behavior_request");
  assert.equal(outputs[0].requestedRef, disposition.reference);
  assert.equal(outputs[0].requestedBehavior, "immediate_correction");
  assert.equal(Object.isFrozen(outputs), true);
  assert.equal(Object.isFrozen(outputs[0]), true);
  const realized = harness.realizeAvailableOutputs(runRef);
  assert.equal(realized.length, 1);
  assert.equal(realized[0].requestedRef, disposition.reference);
  assert.equal(realized[0].requestedBehavior, "immediate_correction");
  assert.equal(realized[0].realizedBehavior, "immediate_correction");
  assert.equal(realized[0].fidelity, "match");
  assert.equal(realized[0].mismatchOrigin, null);
  assert.deepEqual(harness.deliverFocusedDrillOutcomeIfEligible(runRef, outcomeFacts), []);
  harness.processCurrentInteraction(runRef);
  const deliveredOutcome = harness.deliverFocusedDrillOutcomeIfEligible(runRef, outcomeFacts);
  assert.equal(deliveredOutcome.length, 1);
  assert.equal(deliveredOutcome[0].outputRef, outputs[0].outputRef);
  harness.processCurrentInteraction(runRef);
  snapshot = harness.captureInspectionSnapshot(runRef);
  const realizationFact = snapshot.records.find(
    (record) => record.role === "simulator_behavior_realization"
  );
  const realizationTransition = snapshot.records.find(
    (record) => record.transitionKind === "record_focused_drill_realization"
  );
  const shortTermOutcome = snapshot.records.find(
    (record) => record.family === "focused_drill_outcome"
  );
  assert.ok(realizationFact);
  assert.ok(realizationTransition);
  assert.ok(shortTermOutcome);
  assert.equal(shortTermOutcome.activeTrialRef, activeTrialBefore.reference);
  assert.equal(shortTermOutcome.instructionRef, instruction.reference);
  assert.equal(shortTermOutcome.behaviorDispositionRef, disposition.reference);
  assert.equal(shortTermOutcome.realizationFactRef, realizationFact.reference);
  assert.equal(shortTermOutcome.realizationTransitionRef, realizationTransition.reference);
  assert.deepEqual(shortTermOutcome.observedPerformance, { correctCount: 5, totalCount: 6 });
  assert.equal(shortTermOutcome.longTermEfficacy, "not_established");
  assert.equal(shortTermOutcome.globalPreference, "not_established");
  assert.equal(shortTermOutcome.spontaneousProductionApplicability, "not_established");
  assert.equal(shortTermOutcome.futureApplicability, "not_established");
  assert.equal(snapshot.relations.filter((relation) => (
    relation.fromRef === shortTermOutcome.reference && relation.relationKind === "outcome"
  )).length, 9);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === candidateBefore.reference
  ), candidateBefore);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === activeTrialBefore.reference
  ), activeTrialBefore);
  assert.equal(snapshot.records.some((record) => [
    "direct_correction", "delayed_correction_candidate", "later_use_applicability",
    "explanation_support", "formal_evaluation_record", "scoring_artifact"
  ].includes(record.family)), false);
  assert.doesNotMatch(
    JSON.stringify(snapshot),
    /fixtureRecordId|checkpoint|expectedBehavior|expectedOutcome|oracleAnnotations/
  );
  const beforeReplay = structuredClone(snapshot);
  assert.equal(harness.deliverFocusedDrillInputsIfEligible(runRef, opening), deliveredOpening);
  assert.equal(
    harness.deliverFocusedDrillOutcomeIfEligible(runRef, outcomeFacts), deliveredOutcome
  );
  assert.deepEqual(harness.realizeAvailableOutputs(runRef), []);
  assert.deepEqual(harness.captureInspectionSnapshot(runRef), beforeReplay);
});

test("formal harness reaches exact delayed candidate assessment and active trial", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const runRef = harness.startRun();
  const directInputs = spontaneousCorrectionRecords();
  assert.deepEqual(
    harness.deliverSpontaneousCorrectionInputsIfEligible(runRef, directInputs), []
  );
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, directInputs.slice(0, 4)),
    /staged prefix delivery/
  );
  completeFocusedDrill(harness, runRef);
  const prefix = harness.captureInspectionSnapshot(runRef);
  const candidateBefore = structuredClone(prefix.records.find(
    (record) => record.family === "trial_candidate"
  ));
  const activeTrialBefore = structuredClone(prefix.records.find(
    (record) => record.family === "active_trial"
  ));
  const focusedInstructionBefore = structuredClone(prefix.records.find(
    (record) => record.family === "focused_drill_instruction"
  ));
  const focusedDispositionBefore = structuredClone(prefix.records.find(
    (record) => record.family === "focused_drill_behavior_disposition"
  ));
  const focusedOutcomeBefore = structuredClone(prefix.records.find(
    (record) => record.family === "focused_drill_outcome"
  ));
  const controlRefsBefore = new Map(prefix.records.filter((record) => (
    record.role === "fixture_control_fact"
  )).map((record) => [record.payload.control, record.reference]));

  const delivery = harness.deliverSpontaneousCorrectionInputsIfEligible(
    runRef, directInputs
  );
  assert.equal(delivery.length, 1);
  assert.equal(delivery[0].acceptedInputRefs.length, 7);
  assert.deepEqual(harness.processCurrentInteraction(runRef), []);
  let snapshot = harness.captureInspectionSnapshot(runRef);
  const rawCommunication = snapshot.records.find((record) => (
    record.role === "communication"
    && record.payload.content === directInputs[2].data.content
  ));
  const correctionState = snapshot.records.find(
    (record) => record.family === "scoped_current_correction_control"
  );
  const disposition = snapshot.records.find(
    (record) => record.family === "direct_current_session_correction_disposition"
  );
  assert.ok(rawCommunication);
  assert.ok(correctionState);
  assert.ok(disposition);
  assert.notEqual(correctionState.reference, rawCommunication.reference);
  assert.notEqual(disposition.reference, correctionState.reference);
  assert.equal(correctionState.sourceCommunicationRef, rawCommunication.reference);
  assert.equal(correctionState.authority, "explicit_current_user_correction");
  assert.equal(correctionState.correctionTiming, "turn_completion_correction");
  assert.equal(correctionState.currentApplicability, "applicable_to_exact_current_session");
  assert.equal(correctionState.futureApplicability, "not_established");
  assert.equal(correctionState.globalPreference, "not_established");
  assert.equal(disposition.behaviorEffect, "immediate_current_session_change");
  assert.equal(disposition.requestedBehavior, "turn_completion_correction");
  assert.equal(disposition.correctionControlRef, correctionState.reference);
  assert.equal(
    correctionState.controlBasisRefs.userGoverned,
    controlRefsBefore.get("user_governed_constraints")
  );
  assert.equal(
    correctionState.controlBasisRefs.consequence, controlRefsBefore.get("consequence")
  );
  assert.equal(
    correctionState.controlBasisRefs.reversibility, controlRefsBefore.get("reversibility")
  );
  const outputs = harness.emitAvailableOutputs(runRef);
  assert.deepEqual(Object.keys(outputs[0]).sort(), [
    "kind", "outputRef", "requestedRef", "requestedBehavior", "sessionScope"
  ].sort());
  assert.equal(outputs[0].kind, "direct_current_session_correction_request");
  assert.equal(outputs[0].requestedRef, disposition.reference);
  assert.equal(outputs[0].requestedBehavior, "turn_completion_correction");
  assert.equal(Object.isFrozen(outputs), true);
  assert.equal(Object.isFrozen(outputs[0].sessionScope), true);
  assert.deepEqual(harness.inspectDirectCorrectionRealizedCheckpoint(runRef), []);
  const realized = harness.realizeAvailableOutputs(runRef);
  assert.equal(realized.length, 1);
  assert.equal(realized[0].requestedRef, disposition.reference);
  assert.equal(realized[0].requestedBehavior, "turn_completion_correction");
  assert.equal(realized[0].realizedBehavior, "turn_completion_correction");
  assert.deepEqual(harness.inspectDirectCorrectionRealizedCheckpoint(runRef), []);
  assert.deepEqual(harness.inspectDelayedCorrectionCandidateCheckpoint(runRef), []);
  harness.processCurrentInteraction(runRef);
  const checkpoint = harness.inspectDirectCorrectionRealizedCheckpoint(runRef);
  assert.equal(checkpoint.length, 1);
  assert.equal(checkpoint[0].correctionStateRef, correctionState.reference);
  assert.equal(checkpoint[0].dispositionRef, disposition.reference);
  const delayedCheckpoint = harness.inspectDelayedCorrectionCandidateCheckpoint(runRef);
  assert.equal(delayedCheckpoint.length, 1);
  assert.equal(delayedCheckpoint[0].lifecycleStatus, "formed_non_active");
  assert.equal(delayedCheckpoint[0].directDispositionRef, disposition.reference);
  assert.equal(Object.isFrozen(delayedCheckpoint), true);
  snapshot = harness.captureInspectionSnapshot(runRef);
  const delayedCandidate = snapshot.records.find(
    (record) => record.family === "delayed_correction_candidate"
  );
  assert.ok(delayedCandidate);
  assert.equal(delayedCandidate.reference, delayedCheckpoint[0].candidateRef);
  assert.equal(delayedCandidate.behaviorInfluence, "prohibited_until_activation");
  assert.equal(delayedCandidate.userPreference, "not_established");
  assert.equal(delayedCandidate.globalPolicy, "not_established");
  assert.equal(delayedCandidate.durableAdaptation, "unsupported_in_selected_slice");
  const activeCheckpoint = harness.inspectActiveDelayedCorrectionCheckpoint(runRef);
  assert.equal(activeCheckpoint.length, 1);
  assert.equal(activeCheckpoint[0].candidateRef, delayedCandidate.reference);
  assert.equal(activeCheckpoint[0].overallStatus, "sufficient");
  assert.equal(activeCheckpoint[0].currentStatus, "active");
  assert.deepEqual(Object.keys(activeCheckpoint[0].checkResults), [
    "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
    "reversibility", "consequence", "current_applicability", "retention_basis",
    "non_adaptation_boundary"
  ]);
  assert.equal(Object.values(activeCheckpoint[0].checkResults).every(
    (result) => result.status === "passed"
  ), true);
  const delayedAssessment = snapshot.records.find(
    (record) => record.family === "delayed_correction_activation_assessment"
  );
  const activeDelayedTrial = snapshot.records.find(
    (record) => record.family === "active_delayed_correction_trial"
  );
  assert.ok(delayedAssessment);
  assert.ok(activeDelayedTrial);
  assert.equal(delayedAssessment.candidateRef, delayedCandidate.reference);
  assert.equal(activeDelayedTrial.candidateRef, delayedCandidate.reference);
  assert.equal(activeDelayedTrial.activationAssessmentRef, delayedAssessment.reference);
  assert.equal(delayedCandidate.lifecycleStatus, "formed_non_active");
  assert.equal(delayedCandidate.activationStatus, "not_assessed");
  assert.equal(delayedCandidate.behaviorInfluence, "prohibited_until_activation");
  assert.equal(delayedAssessment.materialBasisRefs.some((reference) => (
    snapshot.records.find((record) => record.reference === reference)?.role
      === "user_response"
  )), false);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === candidateBefore.reference
  ), candidateBefore);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === activeTrialBefore.reference
  ), activeTrialBefore);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === focusedInstructionBefore.reference
  ), focusedInstructionBefore);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === focusedDispositionBefore.reference
  ), focusedDispositionBefore);
  assert.deepEqual(snapshot.records.find(
    (record) => record.reference === focusedOutcomeBefore.reference
  ), focusedOutcomeBefore);
  assert.equal(snapshot.records.some((record) => [
    "later_use_applicability",
    "later_outcome", "explanation_support",
    "formal_evaluation_record", "scoring_artifact"
  ].includes(record.family)), false);
  assert.doesNotMatch(
    JSON.stringify(snapshot), /fixtureRecordId|CP-DIRECT|expectedBehavior|oracleAnnotations/
  );
  const beforeReplay = structuredClone(snapshot);
  assert.equal(
    harness.deliverSpontaneousCorrectionInputsIfEligible(runRef, directInputs), delivery
  );
  assert.deepEqual(harness.realizeAvailableOutputs(runRef), []);
  assert.deepEqual(harness.captureInspectionSnapshot(runRef), beforeReplay);
});

test("CP-DELAY-ACTIVE rejects malformed assessment and trial closure passively", async (t) => {
  const attacks = [
    ["stored check label", (snapshot, assessment) => {
      assessment.checkResults.scope.reason = "stored_pass_label_only";
    }],
    ["candidate substitution", (snapshot, assessment) => {
      assessment.candidateRef = snapshot.records.find(
        (record) => record.family === "trial_candidate"
      ).reference;
    }],
    ["candidate creator pointer rewrite", (snapshot) => {
      snapshot.records.find(
        (record) => record.family === "delayed_correction_candidate"
      ).createdByTransitionRef = "transition_missing_delayed_candidate";
    }],
    ["missing material basis relation", (snapshot, assessment) => {
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === assessment.reference
        && relation.targetRole === "retention_basis"
      )), 1);
    }],
    ["competing retained evaluation basis", (snapshot, assessment) => {
      const original = snapshot.records.find(
        (record) => record.reference === assessment.controlBasisRefs.retention
      );
      snapshot.records.push({
        ...structuredClone(original),
        reference: "state_competing_delayed_retention_basis"
      });
    }],
    ["duplicate assessment creator", (snapshot, assessment) => {
      const transition = snapshot.records.find(
        (record) => record.reference === assessment.createdByTransitionRef
      );
      snapshot.records.push({
        ...structuredClone(transition), reference: "transition_duplicate_delayed_assessment"
      });
    }],
    ["assessment creator pointer rewrite", (snapshot, assessment) => {
      assessment.createdByTransitionRef = "transition_missing_delayed_assessment";
    }],
    ["undeclared approval support", (snapshot, assessment) => {
      const response = snapshot.records.find((record) => record.role === "user_response");
      const transition = snapshot.records.find(
        (record) => record.reference === assessment.createdByTransitionRef
      );
      snapshot.relations.push({
        relationKind: "support",
        fromRef: assessment.reference,
        toRef: response.reference,
        targetRole: "second_user_approval",
        effectiveOrder: assessment.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }],
    ["broadened active scope", (snapshot, assessment, trial) => {
      trial.activeScope.taskMode = "all_voice_activity";
    }],
    ["trial creator pointer rewrite", (snapshot, assessment, trial) => {
      trial.createdByTransitionRef = "transition_missing_active_delayed_trial";
    }],
    ["missing trial ancestry", (snapshot, assessment, trial) => {
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === trial.reference
        && relation.targetRole === "activation_assessment"
      )), 1);
    }],
    ["undeclared trial basis", (snapshot, assessment, trial) => {
      const transition = snapshot.records.find(
        (record) => record.reference === trial.createdByTransitionRef
      );
      snapshot.relations.push({
        relationKind: "basis",
        fromRef: trial.reference,
        toRef: trial.retainedStateRefs.correctionState,
        targetRole: "undeclared_trial_basis",
        effectiveOrder: trial.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) {
            const assessment = snapshot.records.find(
              (record) => record.family === "delayed_correction_activation_assessment"
            );
            const trial = snapshot.records.find(
              (record) => record.family === "active_delayed_correction_trial"
            );
            attack(snapshot, assessment, trial);
          }
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectActiveDelayedCorrectionCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("formal later-use path rechecks scope, emits, and records exact realization", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  completeDirectCorrection(harness, runRef);
  const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
  const delivery = harness.deliverLaterUseInputsIfEligible(
    runRef, laterUseRecords(active.activeTrialRef)
  );
  assert.equal(delivery.length, 1);
  harness.processCurrentInteraction(runRef);
  const disposition = harness.inspectLaterDispositionCheckpoint(runRef);
  assert.equal(disposition.length, 1);
  assert.equal(disposition[0].activeTrialRef, active.activeTrialRef);
  assert.equal(disposition[0].applicabilityResult, "applicable");
  assert.equal(
    disposition[0].requestedBehavior, "delay_minor_correction_until_turn_completion"
  );
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const assessment = snapshot.records.find((record) => (
    record.family === "later_use_applicability"
  ));
  const projection = snapshot.records.find((record) => (
    record.reference === assessment.stateProjectionRef
  ));
  assert.deepEqual({
    family: projection.family,
    projectionTargetRef: projection.projectionTargetRef,
    sourceReferenceFactRef: projection.sourceReferenceFactRef,
    projectionRule: projection.projectionRule,
    viewIdentity: projection.viewIdentity,
    semanticContribution: projection.semanticContribution
  }, {
    family: "lineage_preserving_projection",
    projectionTargetRef: active.activeTrialRef,
    sourceReferenceFactRef: assessment.stateReferenceFactRef,
    projectionRule: "same_run_opaque_reference_identity",
    viewIdentity: "active_delayed_trial_effective_state",
    semanticContribution: "none_reference_only"
  });
  assert.deepEqual(snapshot.relations.filter((relation) => (
    relation.fromRef === projection.reference
  )).map((relation) => [relation.relationKind, relation.toRef, relation.targetRole]), [
    ["projection_of", active.activeTrialRef, "active_delayed_correction_trial"],
    ["basis", assessment.stateReferenceFactRef, "opaque_state_reference_fact"]
  ]);
  const outputs = harness.emitAvailableOutputs(runRef);
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].kind, "later_delayed_correction_request");
  harness.realizeAvailableOutputs(runRef);
  assert.deepEqual(harness.inspectLaterRealizationCheckpoint(runRef), []);
  harness.processCurrentInteraction(runRef);
  const realized = harness.inspectLaterRealizationCheckpoint(runRef);
  assert.equal(realized.length, 1);
  assert.equal(realized[0].activeTrialRef, active.activeTrialRef);
  assert.equal(realized[0].dispositionRef, disposition[0].dispositionRef);
  assert.equal(Object.isFrozen(realized), true);
});

test("canonical later outcome remains intervention-conditioned and explanation is grounded", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  seedStaleHistory(harness, runRef);
  completeDirectCorrection(harness, runRef);
  const active = completeLaterRealization(harness, runRef);
  const canonical = harness.inspectCanonicalInterventionCheckpoint(runRef);
  assert.equal(canonical.length, 1);
  assert.equal(canonical[0].activeTrialRef, active.activeTrialRef);
  assert.deepEqual(canonical[0].canonicalInterventionPremise, {
    activity: "japanese_practice", taskMode: "spontaneous_production",
    correctionClass: "minor_correction", timing: "turn_completion",
    sessionId: "spontaneous-outcome-later"
  });
  const delivery = harness.deliverLaterOutcomeIfEligible(runRef, laterOutcomeRecords());
  assert.equal(delivery.length, 1);
  harness.processCurrentInteraction(runRef);
  const outcome = harness.inspectLaterOutcomeCheckpoint(runRef);
  assert.equal(outcome.length, 1);
  assert.equal(outcome[0].activeTrialRef, active.activeTrialRef);
  assert.equal(outcome[0].classification, "intervention_conditioned_observed_association");
  assert.equal(outcome[0].causalScope, "association_only_not_causal_proof");
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const outcomeRecord = snapshot.records.find((record) => (
    record.reference === outcome[0].outcomeRef
  ));
  assert.equal(outcomeRecord.coInterventionStatus.zoeyAvailable, "none_supplied");
  assert.equal(
    outcomeRecord.coInterventionStatus.completeness,
    "non_exhaustive_for_private_or_unobserved_causes"
  );
  assert.equal(outcomeRecord.longTermEfficacy, "not_established");
  assert.equal(outcomeRecord.globalPreference, "not_established");
  assert.equal(outcomeRecord.fixedLearningStyle, "not_established");
  assert.equal(outcomeRecord.fatigueStatus, "not_established");

  const explanationDelivery = harness.deliverExplanationPromptIfEligible(
    runRef, explanationRecords()
  );
  assert.equal(explanationDelivery.length, 1);
  harness.processCurrentInteraction(runRef);
  const explanation = harness.inspectExplanationCheckpoint(runRef);
  assert.equal(explanation.length, 1);
  assert.equal(explanation[0].outcomeRef, outcome[0].outcomeRef);
  assert.match(explanation[0].userFacingText, /spontaneous practice/);
  assert.match(explanation[0].userFacingText, /focused drill/);
  assert.match(explanation[0].userFacingText, /not proof of cause/);
  assert.equal(Object.keys(explanation[0].limitationRefs).length, 4);
  const finalSnapshot = boundary.captureInspectionSnapshot(runRef);
  const support = finalSnapshot.records.find((record) => (
    record.reference === explanation[0].supportRef
  ));
  assert.equal(support.hiddenChainOfThought, "not_required_not_retained");
  assert.equal(support.temporalAssessmentRefs.length, 1);
  assert.equal(finalSnapshot.records.filter((record) => (
    record.family === "temporal_eligibility_assessment"
    && record.eligibility === "ineligible"
  )).length, 2);
  assert.equal(finalSnapshot.records.some((record) => (
    ["formal_evaluation_record", "score", "compatibility_claim"].includes(record.family)
  )), false);
});

test("explanation oracle accepts bounded wording within its closed grammar", () => {
  const real = createSutBoundary();
  let useVariant = false;
  const boundary = Object.freeze({
    ...real,
    captureInspectionSnapshot(runRef) {
      const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
      if (useVariant) {
        snapshot.records.find(
          (record) => record.family === "user_facing_explanation"
        ).userFacingText = "I am holding minor corrections until you finish during "
          + "spontaneous practice because you asked not to be interrupted here, and I am "
          + "trying that as a reversible, low-consequence trial informed by the earlier "
          + "drill. During a focused drill where you ask for immediate correction, I will "
          + "not apply that delay. This session was followed by longer speaking and you said "
          + "the pacing felt easier, but that is an observation in this context, not proof "
          + "of cause, a stable preference, or long-term learning.";
      }
      return snapshot;
    }
  });
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  completeGroundedExplanation(harness, runRef);
  useVariant = true;
  assert.equal(harness.inspectExplanationCheckpoint(runRef).length, 1);
});

test("later facts and explanation prompt remain gated by exact prior checkpoints", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  seedStaleHistory(harness, runRef);
  completeDirectCorrection(harness, runRef);
  const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
  harness.deliverLaterUseInputsIfEligible(runRef, laterUseRecords(active.activeTrialRef));
  harness.processCurrentInteraction(runRef);
  const beforeOutcome = boundary.captureInspectionSnapshot(runRef);
  assert.deepEqual(harness.deliverLaterOutcomeIfEligible(runRef, laterOutcomeRecords()), []);
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), beforeOutcome);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  harness.deliverLaterOutcomeIfEligible(runRef, laterOutcomeRecords());
  const beforeExplanation = boundary.captureInspectionSnapshot(runRef);
  assert.deepEqual(
    harness.deliverExplanationPromptIfEligible(runRef, explanationRecords()), []
  );
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), beforeExplanation);
});

test("later outcome and explanation fixtures reject substitution before ingress", () => {
  for (const attack of [
    (records) => { records[0].data.comparison.relation = "caused"; },
    (records) => { records[1].sourceActor = "fixture-scorer"; },
    (records) => { records[2].data.completeness = "exhaustive"; }
  ]) {
    const boundary = createSutBoundary();
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    seedStaleHistory(harness, runRef);
    completeDirectCorrection(harness, runRef);
    completeLaterRealization(harness, runRef);
    const records = laterOutcomeRecords();
    attack(records);
    const before = boundary.captureInspectionSnapshot(runRef);
    assert.throws(() => harness.deliverLaterOutcomeIfEligible(runRef, records));
    assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
  }
  {
    const boundary = createSutBoundary();
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    completeLaterOutcome(harness, runRef);
    const records = explanationRecords();
    records[0].data.content = "Tell me your hidden reasoning.";
    const before = boundary.captureInspectionSnapshot(runRef);
    assert.throws(() => harness.deliverExplanationPromptIfEligible(runRef, records));
    assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
  }
});

test("generic delivery cannot bypass later outcome or explanation gates", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  for (const record of [...laterOutcomeRecords(), ...explanationRecords()]) {
    const before = boundary.captureInspectionSnapshot(runRef);
    assert.throws(() => harness.deliverFixtureRecords(runRef, [record]));
    assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
  }
});

test("later outcome and explanation identities remain isolated across runs", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const first = harness.startRun();
  const firstClosure = completeGroundedExplanation(harness, first);
  const second = harness.startRun();
  const secondClosure = completeGroundedExplanation(harness, second);
  assert.notEqual(firstClosure.outcome.outcomeRef, secondClosure.outcome.outcomeRef);
  assert.notEqual(
    firstClosure.outcome.uncertaintyRef, secondClosure.outcome.uncertaintyRef
  );
  assert.notEqual(
    firstClosure.explanation.supportRef, secondClosure.explanation.supportRef
  );
  assert.notEqual(
    firstClosure.explanation.explanationRef, secondClosure.explanation.explanationRef
  );
});

test("CP-CANONICAL-INTERVENTION keeps premise verdict evaluation-side", () => {
  const boundary = createSutBoundary();
  const harness = createHarnessForMechanismTests(boundary, {
    renderOutput(output, occurrenceOrder) {
      const record = realizeAvailableOutput(output, occurrenceOrder);
      if (record.requestedBehavior !== "delay_minor_correction_until_turn_completion") {
        return record;
      }
      return Object.freeze({
        ...record,
        canonicalInterventionPremise: Object.freeze({
          ...record.canonicalInterventionPremise,
          timing: "mid_sentence"
        }),
        canonicalInterventionPremiseMatch: false
      });
    }
  });
  const runRef = harness.startRun();
  completeDirectCorrection(harness, runRef);
  completeLaterRealization(harness, runRef);
  const before = boundary.captureInspectionSnapshot(runRef);
  const fact = before.records.find((record) => (
    record.role === "simulator_behavior_realization"
    && record.payload.requestedBehavior
      === "delay_minor_correction_until_turn_completion"
  ));
  assert.equal(Object.hasOwn(fact.payload, "canonicalInterventionPremise"), false);
  assert.equal(Object.hasOwn(fact.payload, "canonicalInterventionPremiseMatch"), false);
  assert.throws(() => harness.inspectCanonicalInterventionCheckpoint(runRef));
  assert.throws(() => harness.deliverLaterOutcomeIfEligible(
    runRef, laterOutcomeRecords()
  ));
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
});

test("CP-LATER-OUTCOME rejects causal promotion and malformed closure passively", async (t) => {
  const attacks = [
    ["causal classification", (snapshot) => {
      snapshot.records.find((record) => record.family === "later_outcome")
        .classification = "causal_improvement";
    }],
    ["global preference promotion", (snapshot) => {
      snapshot.records.find((record) => record.family === "later_outcome")
        .globalPreference = "established";
    }],
    ["exhaustive co-intervention claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "later_outcome")
        .coInterventionStatus.completeness = "exhaustive";
    }],
    ["excluded alternative causes", (snapshot) => {
      snapshot.records.find((record) => record.family === "outcome_uncertainty")
        .alternativeCauses = "excluded";
    }],
    ["rewritten comparative fact", (snapshot) => {
      snapshot.records.find((record) => (
        record.role === "outcome_fact" && record.payload.comparison
      )).payload.comparison.relation = "caused";
    }],
    ["missing outcome relation", (snapshot) => {
      const outcome = snapshot.records.find((record) => record.family === "later_outcome");
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === outcome.reference
        && relation.targetRole === "comparative_speaking_observation"
      )), 1);
    }],
    ["missing uncertainty basis", (snapshot) => {
      const uncertainty = snapshot.records.find(
        (record) => record.family === "outcome_uncertainty"
      );
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === uncertainty.reference
        && relation.targetRole === "reported_feedback"
      )), 1);
    }],
    ["undeclared uncertainty relation", (snapshot) => {
      const uncertainty = snapshot.records.find(
        (record) => record.family === "outcome_uncertainty"
      );
      const outcome = snapshot.records.find((record) => record.family === "later_outcome");
      snapshot.relations.push({
        relationKind: "support", fromRef: uncertainty.reference,
        toRef: outcome.reference, targetRole: "undeclared_uncertainty_support",
        effectiveOrder: uncertainty.createdOrder,
        createdOrder: snapshot.records.find(
          (record) => record.reference === uncertainty.createdByTransitionRef
        ).createdOrder,
        assertedByRole: "sut"
      });
    }],
    ["transition input rewrite", (snapshot) => {
      snapshot.records.find((record) => (
        record.transitionKind === "record_intervention_conditioned_later_outcome"
      )).inputReferences.pop();
    }],
    ["duplicate outcome creator", (snapshot) => {
      const outcome = snapshot.records.find((record) => record.family === "later_outcome");
      const creator = snapshot.records.find(
        (record) => record.reference === outcome.createdByTransitionRef
      );
      snapshot.records.push({
        ...structuredClone(creator),
        reference: "transition_00000000-0000-0000-0000-000000000091"
      });
    }],
    ["duplicate outcome identity", (snapshot) => {
      const outcome = snapshot.records.find((record) => record.family === "later_outcome");
      snapshot.records.push({
        ...structuredClone(outcome),
        reference: "state_00000000-0000-0000-0000-000000000092"
      });
    }],
    ["duplicate uncertainty identity", (snapshot) => {
      const uncertainty = snapshot.records.find(
        (record) => record.family === "outcome_uncertainty"
      );
      snapshot.records.push({
        ...structuredClone(uncertainty),
        reference: "state_00000000-0000-0000-0000-000000000093"
      });
    }],
    ["outcome creator transition family rewrite", (snapshot) => {
      snapshot.records.find((record) => (
        record.transitionKind === "record_intervention_conditioned_later_outcome"
      )).family = "unrelated_family";
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeLaterOutcome(harness, runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectLaterOutcomeCheckpoint(runRef));
      assert.throws(() => harness.deliverExplanationPromptIfEligible(
        runRef, explanationRecords()
      ));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("CP-EXPLANATION rejects missing provenance and unsupported claims passively", async (t) => {
  const attacks = [
    ["stale history omitted", (snapshot) => {
      snapshot.records.find((record) => record.family === "explanation_support")
        .temporalAssessmentRefs = [];
    }],
    ["stale assessment age rewrite", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      )).ageDays -= 1;
    }],
    ["stale assessment creator ambiguity", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      ));
      const creator = snapshot.records.find(
        (record) => record.reference === assessment.createdByTransitionRef
      );
      snapshot.records.push({
        ...structuredClone(creator),
        reference: "transition_00000000-0000-0000-0000-000000000095"
      });
    }],
    ["duplicate stale assessment result", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      ));
      snapshot.records.find(
        (record) => record.reference === assessment.createdByTransitionRef
      ).resultReferences.push(assessment.reference);
    }],
    ["duplicate co-created stale distractor result", (snapshot) => {
      const distractor = snapshot.records.find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "unrelated_dimension"
      ));
      snapshot.records.find(
        (record) => record.reference === distractor.createdByTransitionRef
      ).resultReferences.push(distractor.reference);
    }],
    ["focused instruction substituted", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      support.focusedInstructionRef = support.focusedOutcomeRef;
    }],
    ["missing lineage relation", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === support.reference
        && relation.targetRole === "delayed_correction_candidate"
      )), 1);
    }],
    ["causal limit rewrite", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "explanation_limit" && record.limitType === "causal"
      )).statement = "the intervention caused improvement";
    }],
    ["hidden reasoning claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "explanation_support")
        .hiddenChainOfThought = "retained";
    }],
    ["causal user-facing claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText = "The delayed correction caused better learning.";
    }],
    ["mixed global-preference claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " This is now your permanent global preference.";
    }],
    ["mixed always-applicable claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " I will always apply this delay.";
    }],
    ["mixed inflected always-applicable claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " This always applies.";
    }],
    ["mixed established-preference claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " This establishes your preference.";
    }],
    ["mixed fixed-learning-style claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " You have a fixed learning style.";
    }],
    ["mixed causal-improvement claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " The delay caused improved learning.";
    }],
    ["mixed causal-learning paraphrase", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " The delay made you learn better.";
    }],
    ["mixed long-term-efficacy claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " This proves lasting improvement.";
    }],
    ["mixed fatigue claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " This was because your fatigue.";
    }],
    ["mixed tiredness claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " The reason is that you were tired.";
    }],
    ["mixed focused-drill applicability claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " In a focused drill, this will apply.";
    }],
    ["mixed reverse focused-drill applicability claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " The delay also applies in a focused drill.";
    }],
    ["mixed hidden-reasoning claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " My private reasoning establishes this conclusion.";
    }],
    ["mixed default-global claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " From now on, I will use this delay by default in every setting.";
    }],
    ["mixed reverse causal claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " The improvement came from delaying corrections.";
    }],
    ["mixed durable-gains claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " This demonstrates durable gains.";
    }],
    ["mixed fatigue-explanation claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " Fatigue explains the result.";
    }],
    ["mixed learner-label claim", (snapshot) => {
      snapshot.records.find((record) => record.family === "user_facing_explanation")
        .userFacingText += " You are a correction-sensitive learner.";
    }],
    ["explanation creator transition family rewrite", (snapshot) => {
      snapshot.records.find((record) => (
        record.transitionKind === "derive_grounded_later_behavior_explanation"
      )).family = "unrelated_family";
    }],
    ["temporal creator transition family rewrite", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      ));
      snapshot.records.find(
        (record) => record.reference === assessment.createdByTransitionRef
      ).family = "unrelated_family";
    }],
    ["bound-fact original interaction extra key", (snapshot) => {
      const outcome = snapshot.records.find((record) => record.family === "later_outcome");
      const fact = snapshot.records.find(
        (record) => record.reference === outcome.outcomeFactRefs[0]
      );
      snapshot.records.find(
        (record) => record.reference === fact.firstInteractionRef
      ).unexpected = true;
    }],
    ["bound-fact original ingestion extra key", (snapshot) => {
      const outcome = snapshot.records.find((record) => record.family === "later_outcome");
      const fact = snapshot.records.find(
        (record) => record.reference === outcome.outcomeFactRefs[0]
      );
      const interaction = snapshot.records.find(
        (record) => record.reference === fact.firstInteractionRef
      );
      snapshot.records.find(
        (record) => record.reference === interaction.createdByTransitionRef
      ).unexpected = true;
    }],
    ["explanation assertion family rewrite", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      ).family = "unrelated_family";
    }],
    ["explanation assertion origin rewrite", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      ).origin = "fixture";
    }],
    ["explanation assertion extra key", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      ).unexpected = true;
    }],
    ["explanation assertion creator rewrite", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      ).createdByTransitionRef = "transition_00000000-0000-0000-0000-000000000097";
    }],
    ["explanation attribution transition family", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      const assertion = snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      );
      snapshot.records.find(
        (record) => record.reference === assertion.createdByTransitionRef
      ).family = "unrelated_family";
    }],
    ["explanation attribution extra input", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      const assertion = snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      );
      snapshot.records.find(
        (record) => record.reference === assertion.createdByTransitionRef
      ).inputReferences.push(support.outcomeRef);
    }],
    ["explanation attribution duplicate result", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      const assertion = snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      );
      snapshot.records.find(
        (record) => record.reference === assertion.createdByTransitionRef
      ).resultReferences.push(assertion.reference);
    }],
    ["explanation attribution actor substitution", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      const assertion = snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      );
      snapshot.records.find(
        (record) => record.reference === assertion.sourceActorRef
      ).sourceActor = "substituted-user";
    }],
    ["explanation attribution relation duplication", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      const relation = snapshot.relations.find((candidate) => (
        candidate.fromRef === support.requestAssertionRef
        && candidate.relationKind === "basis"
      ));
      snapshot.relations.push(structuredClone(relation));
    }],
    ["duplicate explanation request assertion", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      const assertion = snapshot.records.find(
        (record) => record.reference === support.requestAssertionRef
      );
      snapshot.records.push({
        ...structuredClone(assertion),
        reference: "assertion_00000000-0000-0000-0000-000000000096"
      });
    }],
    ["extra user-facing explanation", (snapshot) => {
      const explanation = snapshot.records.find(
        (record) => record.family === "user_facing_explanation"
      );
      snapshot.records.push({
        ...structuredClone(explanation),
        reference: "state_00000000-0000-0000-0000-000000000098"
      });
    }],
    ["extra explanation support", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.records.push({
        ...structuredClone(support),
        reference: "state_00000000-0000-0000-0000-000000000099"
      });
    }],
    ["request attribution substitution", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      support.requestAssertionRef = support.requestCommunicationRef;
    }],
    ["transition result omission", (snapshot) => {
      snapshot.records.find((record) => (
        record.transitionKind === "derive_grounded_later_behavior_explanation"
      )).resultReferences.pop();
    }],
    ["transition extra terminal result", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      snapshot.records.find((record) => (
        record.transitionKind === "derive_grounded_later_behavior_explanation"
      )).resultReferences.push(support.outcomeRef);
    }],
    ["duplicate referenced limitation", (snapshot) => {
      const support = snapshot.records.find(
        (record) => record.family === "explanation_support"
      );
      support.limitationRefs.causal = support.limitationRefs.scope;
    }],
    ["duplicate explanation creator", (snapshot) => {
      const explanation = snapshot.records.find(
        (record) => record.family === "user_facing_explanation"
      );
      const creator = snapshot.records.find(
        (record) => record.reference === explanation.createdByTransitionRef
      );
      snapshot.records.push({
        ...structuredClone(creator),
        reference: "transition_00000000-0000-0000-0000-000000000093"
      });
    }],
    ["extra limitation", (snapshot) => {
      const limit = snapshot.records.find((record) => record.family === "explanation_limit");
      snapshot.records.push({
        ...structuredClone(limit),
        reference: "state_00000000-0000-0000-0000-000000000094"
      });
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeGroundedExplanation(harness, runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectExplanationCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("CF-DRILL-OPT-IN keeps the same active trial but forbids delayed use", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  completeDirectCorrection(harness, runRef);
  const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
  const delivery = harness.deliverDrillOptInInputsIfEligible(
    runRef, laterUseRecords(active.activeTrialRef, true)
  );
  assert.equal(delivery.length, 1);
  harness.processCurrentInteraction(runRef);
  const checkpoint = harness.inspectDrillOptInCheckpoint(runRef);
  assert.equal(checkpoint.length, 1);
  assert.equal(checkpoint[0].activeTrialRef, active.activeTrialRef);
  assert.equal(checkpoint[0].applicabilityResult, "not_applicable");
  assert.equal(
    checkpoint[0].reason, "focused_drill_explicit_immediate_correction_excluded"
  );
  assert.deepEqual(harness.emitAvailableOutputs(runRef), []);
  assert.deepEqual(harness.inspectLaterDispositionCheckpoint(runRef), []);
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const assessment = snapshot.records.find((record) => (
    record.family === "later_use_applicability"
  ));
  const projection = snapshot.records.find((record) => (
    record.reference === assessment.stateProjectionRef
  ));
  assert.equal(projection.projectionTargetRef, active.activeTrialRef);
  assert.equal(snapshot.relations.some((relation) => (
    relation.fromRef === projection.reference
    && relation.relationKind === "projection_of"
    && relation.toRef === active.activeTrialRef
    && relation.targetRole === "active_delayed_correction_trial"
  )), true);
});

test("CP-LATER-DISPOSITION rejects malformed closure without mutating SUT state", async (t) => {
  const attacks = [
    ["stored applicability result", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      )).applicabilityResult = "not_applicable";
    }],
    ["broadened current scope", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      )).currentScope.taskMode = "any_production";
    }],
    ["retargeted state reference", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      ));
      const stateRef = snapshot.records.find((record) => (
        record.reference === assessment.stateReferenceFactRef
      ));
      stateRef.payload.stateRef = snapshot.records.find((record) => (
        record.family === "active_trial"
      )).reference;
    }],
    ["rewritten projection rule", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      )).projectionRule = "trust_fixture_state";
    }],
    ["rewritten projection view", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      )).viewIdentity = "fixture_declared_state";
    }],
    ["rewritten projection target state", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      )).effectiveTargetState.currentStatus = "retired";
    }],
    ["retargeted projection", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      )).projectionTargetRef = "state_00000000-0000-0000-0000-000000000001";
    }],
    ["missing projection relation", (snapshot) => {
      const projection = snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      ));
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === projection.reference && relation.relationKind === "projection_of"
      )), 1);
    }],
    ["retargeted projection relation", (snapshot) => {
      const projection = snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      ));
      snapshot.relations.find((relation) => (
        relation.fromRef === projection.reference && relation.relationKind === "projection_of"
      )).toRef = "state_00000000-0000-0000-0000-000000000001";
    }],
    ["backdated projection relation", (snapshot) => {
      const projection = snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      ));
      snapshot.relations.find((relation) => (
        relation.fromRef === projection.reference && relation.relationKind === "projection_of"
      )).createdOrder -= 1;
    }],
    ["projection creator pointer rewrite", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      )).createdByTransitionRef = "transition_00000000-0000-0000-0000-000000000001";
    }],
    ["duplicate projection creator", (snapshot) => {
      const projection = snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      ));
      const original = snapshot.records.find((record) => (
        record.reference === projection.createdByTransitionRef
      ));
      snapshot.records.push({
        ...structuredClone(original),
        reference: "transition_00000000-0000-0000-0000-000000000001"
      });
    }],
    ["duplicate projection record", (snapshot) => {
      const projection = snapshot.records.find((record) => (
        record.family === "lineage_preserving_projection"
      ));
      snapshot.records.push({
        ...structuredClone(projection),
        reference: "state_00000000-0000-0000-0000-000000000001"
      });
    }],
    ["assessment projection substitution", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      )).stateProjectionRef = "state_00000000-0000-0000-0000-000000000001";
    }],
    ["missing applicability relation", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      ));
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === assessment.reference && relation.relationKind === "applicability"
      )), 1);
    }],
    ["undeclared applicability support", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      ));
      const relation = snapshot.relations.find((candidate) => (
        candidate.fromRef === assessment.reference
        && candidate.relationKind === "applicability"
      ));
      snapshot.relations.push(structuredClone(relation));
    }],
    ["assessment transition envelope", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      ));
      snapshot.records.find((record) => (
        record.reference === assessment.createdByTransitionRef
      )).oracleResult = "applicable";
    }],
    ["current ingestion envelope", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      ));
      snapshot.records.find((record) => (
        record.reference === assessment.interactionRef
      )).oracleBranch = "later_use";
    }],
    ["disposition scope", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "later_behavior_disposition"
      )).useScope.activity = "all_practice";
    }],
    ["disposition transition result", (snapshot) => {
      const disposition = snapshot.records.find((record) => (
        record.family === "later_behavior_disposition"
      ));
      snapshot.records.find((record) => (
        record.reference === disposition.createdByTransitionRef
      )).result = "accepted";
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
      harness.deliverLaterUseInputsIfEligible(runRef, laterUseRecords(active.activeTrialRef));
      harness.processCurrentInteraction(runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectLaterDispositionCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("later-use fixture validation rejects control and chronology substitutions before ingress", () => {
  for (const attack of [
    (records) => { records.find((record) => (
      record.fixtureRecordId === "FC-UGC-001"
    )).data.control = "consequence"; },
    (records) => { records.find((record) => (
      record.fixtureRecordId === "L-001"
    )).occurrenceOrder = 29; },
    (records) => { records.find((record) => (
      record.fixtureRecordId === "L-002"
    )).occurrenceOrder = 32; }
  ]) {
    const real = createSutBoundary();
    const harness = createEvaluationHarness(real);
    const runRef = harness.startRun();
    completeDirectCorrection(harness, runRef);
    const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
    const records = laterUseRecords(active.activeTrialRef);
    attack(records);
    const before = real.captureInspectionSnapshot(runRef);
    assert.throws(() => harness.deliverLaterUseInputsIfEligible(runRef, records));
    assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
  }
});

test("CF-DRILL-OPT-IN rejects promotion and invented disposition passively", async (t) => {
  const attacks = [
    ["promoted applicability", (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      )).applicabilityResult = "applicable";
    }],
    ["invented delayed disposition", (snapshot) => {
      const assessment = snapshot.records.find((record) => (
        record.family === "later_use_applicability"
      ));
      snapshot.records.push({
        reference: "state_00000000-0000-0000-0000-000000000001",
        family: "later_behavior_disposition", interactionRef: assessment.interactionRef
      });
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
      harness.deliverDrillOptInInputsIfEligible(
        runRef, laterUseRecords(active.activeTrialRef, true)
      );
      harness.processCurrentInteraction(runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectDrillOptInCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("CP-REALIZATION-FIDELITY rejects later-use ambiguity passively", async (t) => {
  const attacks = [
    ["recording transition claims fact creation", (snapshot) => {
      const fact = snapshot.records.find((record) => (
        record.role === "simulator_behavior_realization"
        && record.payload.requestedBehavior === "delay_minor_correction_until_turn_completion"
      ));
      snapshot.records.find((record) => (
        record.transitionKind === "record_later_delayed_correction_realization"
      )).resultReferences = [fact.reference];
    }],
    ["premature realization relation", (snapshot) => {
      const fact = snapshot.records.find((record) => (
        record.role === "simulator_behavior_realization"
        && record.payload.requestedBehavior === "delay_minor_correction_until_turn_completion"
      ));
      snapshot.relations.find((relation) => (
        relation.relationKind === "realization"
        && relation.fromRef === fact.reference
      )).effectiveOrder = fact.createdOrder;
    }],
    ["competing recording transition", (snapshot) => {
      const original = snapshot.records.find((record) => (
        record.transitionKind === "record_later_delayed_correction_realization"
      ));
      snapshot.records.push({
        ...structuredClone(original),
        reference: "transition_00000000-0000-0000-0000-000000000001"
      });
    }],
    ["mismatched simulator fact", (snapshot) => {
      snapshot.records.find((record) => (
        record.role === "simulator_behavior_realization"
        && record.payload.requestedBehavior === "delay_minor_correction_until_turn_completion"
      )).payload.mismatchOrigin = "simulated_dependency";
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
      harness.deliverLaterUseInputsIfEligible(runRef, laterUseRecords(active.activeTrialRef));
      harness.processCurrentInteraction(runRef);
      harness.emitAvailableOutputs(runRef);
      harness.realizeAvailableOutputs(runRef);
      harness.processCurrentInteraction(runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectLaterRealizationCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("later-use applicability, disposition, and realization identities are run-isolated", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const closures = [harness.startRun(), harness.startRun()].map((runRef) => {
    completeDirectCorrection(harness, runRef);
    const active = harness.inspectActiveDelayedCorrectionCheckpoint(runRef)[0];
    harness.deliverLaterUseInputsIfEligible(runRef, laterUseRecords(active.activeTrialRef));
    harness.processCurrentInteraction(runRef);
    const disposition = harness.inspectLaterDispositionCheckpoint(runRef)[0];
    harness.emitAvailableOutputs(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    const realization = harness.inspectLaterRealizationCheckpoint(runRef)[0];
    assert.deepEqual(harness.inspectLaterRealizationCheckpoint(runRef), [realization]);
    return { disposition, realization };
  });
  for (const field of [
    "applicabilityAssessmentRef", "dispositionRef"
  ]) assert.notEqual(closures[0].disposition[field], closures[1].disposition[field]);
  for (const field of ["realizationFactRef", "realizationTransitionRef"]) {
    assert.notEqual(closures[0].realization[field], closures[1].realization[field]);
  }
});

test("delayed activation assessment and trial identities are isolated across runs", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const closures = [harness.startRun(), harness.startRun()].map((runRef) => {
    completeDirectCorrection(harness, runRef);
    const checkpoint = harness.inspectActiveDelayedCorrectionCheckpoint(runRef);
    assert.equal(checkpoint.length, 1);
    return checkpoint[0];
  });
  assert.notEqual(closures[0].candidateRef, closures[1].candidateRef);
  assert.notEqual(
    closures[0].activationAssessmentRef, closures[1].activationAssessmentRef
  );
  assert.notEqual(closures[0].activeTrialRef, closures[1].activeTrialRef);
});

test("CP-DELAY-CANDIDATE rejects malformed lineage without mutating SUT state", async (t) => {
  const attacks = [
    ["active status", (snapshot, candidate) => {
      candidate.lifecycleStatus = "active";
    }],
    ["broadened scope", (snapshot, candidate) => {
      candidate.proposedScope.taskMode = "all_voice_activity";
    }],
    ["direct disposition substitution", (snapshot, candidate) => {
      candidate.directDispositionRef = candidate.focusedDispositionRef;
    }],
    ["missing focused support", (snapshot, candidate) => {
      snapshot.relations.splice(snapshot.relations.findIndex((relation) => (
        relation.fromRef === candidate.reference
        && relation.targetRole === "prior_focused_outcome_support"
      )), 1);
    }],
    ["duplicate creator", (snapshot, candidate) => {
      const transition = snapshot.records.find(
        (record) => record.reference === candidate.createdByTransitionRef
      );
      snapshot.records.push({
        ...structuredClone(transition),
        reference: "transition_competing_delayed_candidate"
      });
    }],
    ["duplicate candidate", (snapshot, candidate) => {
      snapshot.records.push({
        ...structuredClone(candidate),
        reference: "state_competing_delayed_candidate"
      });
    }],
    ["coherent trial-policy source substitution", (snapshot, candidate) => {
      const original = snapshot.records.find(
        (record) => record.reference === candidate.trialPolicyRef
      );
      const substitute = {
        ...structuredClone(original),
        reference: "state_substitute_delayed_trial_policy"
      };
      snapshot.records.push(substitute);
      const transition = snapshot.records.find(
        (record) => record.reference === candidate.createdByTransitionRef
      );
      transition.inputReferences = transition.inputReferences.map(
        (reference) => reference === original.reference ? substitute.reference : reference
      );
      snapshot.relations.find((relation) => (
        relation.fromRef === candidate.reference
        && relation.toRef === original.reference
        && relation.targetRole === "bounded_trial_policy"
      )).toRef = substitute.reference;
      candidate.trialPolicyRef = substitute.reference;
    }]
  ];
  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) {
            const candidate = snapshot.records.find(
              (record) => record.family === "delayed_correction_candidate"
            );
            attack(snapshot, candidate);
          }
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectDelayedCorrectionCandidateCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("direct-correction simulator preserves SUT timing ownership", () => {
  const request = {
    kind: "direct_current_session_correction_request",
    outputRef: "transition_00000000-0000-0000-0000-000000000000",
    requestedRef: "state_00000000-0000-0000-0000-000000000000",
    requestedBehavior: "turn_completion_correction",
    sessionScope: {
      activity: "japanese_practice", taskMode: "spontaneous_production",
      surfaceLabel: "voice_simulated", realVoiceStack: "absent",
      scenarioDay: 138, sessionId: "spontaneous-correction-current"
    }
  };
  const record = realizeDirectCorrectionOutput(request, 5);
  assert.equal(record.requestedBehavior, "turn_completion_correction");
  assert.equal(record.realizedBehavior, record.requestedBehavior);
  const projected = createSimulatorProjector().project(record);
  assert.deepEqual(Object.keys(projected).sort(), [
    "fidelity", "kind", "mismatchOrigin", "occurrenceOrder", "realizedBehavior",
    "requestedBehavior", "requestedRef", "sourceActor", "sourceFactRef"
  ].sort());
  assert.throws(
    () => realizeDirectCorrectionOutput({
      ...request, requestedBehavior: "immediate_correction"
    }),
    /Unsupported direct/
  );
  assert.throws(
    () => realizeDirectCorrectionOutput({ ...request, expectedTiming: "oracle" }),
    /contain exactly/
  );
});

test("spontaneous bundle requires the completed focused-drill realization and outcome", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const runRef = harness.startRun();
  activateProductionTrial(harness, runRef);
  harness.deliverFocusedDrillInputsIfEligible(runRef, focusedDrillOpeningRecords());
  harness.processCurrentInteraction(runRef);
  assert.deepEqual(harness.deliverSpontaneousCorrectionInputsIfEligible(
    runRef, spontaneousCorrectionRecords()
  ), []);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  assert.deepEqual(harness.deliverSpontaneousCorrectionInputsIfEligible(
    runRef, spontaneousCorrectionRecords()
  ), []);
  harness.deliverFocusedDrillOutcomeIfEligible(runRef, focusedDrillOutcomeRecords());
  harness.processCurrentInteraction(runRef);
  assert.equal(harness.deliverSpontaneousCorrectionInputsIfEligible(
    runRef, spontaneousCorrectionRecords()
  ).length, 1);
});

test("spontaneous staging rejects a malformed focused-drill prefix before ingress", () => {
  for (const mutate of [
    (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "focused_drill_instruction"
      )).authority = "inferred_preference";
    },
    (snapshot) => {
      const outcome = snapshot.records.find((record) => (
        record.family === "focused_drill_outcome"
      ));
      snapshot.relations.find((relation) => (
        relation.fromRef === outcome.reference && relation.targetRole === "outcome_ingestion"
      )).targetRole = "substituted_ingestion";
    }
  ]) {
    const real = createSutBoundary();
    let corrupt = false;
    let ingressCalls = 0;
    const boundary = Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        ingressCalls += 1;
        return real.ingestSutVisibleInputs(...args);
      },
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        if (corrupt) mutate(snapshot);
        return snapshot;
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    completeFocusedDrill(harness, runRef);
    const before = ingressCalls;
    corrupt = true;
    let rejected = false;
    try {
      rejected = harness.deliverSpontaneousCorrectionInputsIfEligible(
        runRef, spontaneousCorrectionRecords()
      ).length === 0;
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true);
    assert.equal(ingressCalls, before);
  }
});

test("spontaneous fixture staging rejects substitutions before SUT ingress", () => {
  for (const mutate of [
    (records) => records.splice(2, 1),
    (records) => { records[2].sourceActor = "fixture-driver"; },
    (records) => { records[2].data.content = "Please correct me right away during this drill."; },
    (records) => { records[4].fixtureRecordId = "FC-UGC-REPLACEMENT"; },
    (records) => { records[5].data.value = "high"; },
    (records) => { records[0].data.surfaceLabel = "text_simulated"; }
  ]) {
    const real = createSutBoundary();
    let ingressCalls = 0;
    const boundary = Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        ingressCalls += 1;
        return real.ingestSutVisibleInputs(...args);
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    completeFocusedDrill(harness, runRef);
    const before = ingressCalls;
    const records = spontaneousCorrectionRecords();
    mutate(records);
    assert.throws(() => harness.deliverSpontaneousCorrectionInputsIfEligible(
      runRef, records
    ));
    assert.equal(ingressCalls, before);
  }
});

test("raw direct-correction fragments and competing current instructions create no disposition", () => {
  const boundary = createSutBoundary();
  for (const fixtureIndexes of [[0], [2], [0, 2], [0, 1, 2]]) {
    const runRef = boundary.startRun();
    const records = fixtureIndexes.map((index) => spontaneousCorrectionRecords()[index]);
    const inputs = records.map((record) => projectFixtureRecord(record));
    boundary.ingestSutVisibleInputs(runRef, { inputs });
    boundary.processCurrentInteraction(runRef);
    assert.equal(boundary.captureInspectionSnapshot(runRef).records.some((record) => (
      record.family === "direct_current_session_correction_disposition"
    )), false);
  }

  const runRef = boundary.startRun();
  const records = spontaneousCorrectionRecords();
  const projected = records.map((record) => projectFixtureRecord(record));
  const controls = projected.slice(4);
  boundary.ingestSutVisibleInputs(runRef, { inputs: controls });
  boundary.processCurrentInteraction(runRef);
  const competing = projectFixtureRecord({
    ...structuredClone(records[2]), fixtureRecordId: "V-003-EQUAL-DISTINCT",
    occurrenceOrder: 23
  });
  boundary.ingestSutVisibleInputs(runRef, {
    inputs: [...projected.slice(0, 4), ...controls, competing]
  });
  boundary.processCurrentInteraction(runRef);
  assert.equal(boundary.captureInspectionSnapshot(runRef).records.some((record) => (
    record.family === "direct_current_session_correction_disposition"
  )), false);
});

test("direct realization mismatch is retained but cannot reach the checkpoint", () => {
  const harness = createHarnessForMechanismTests(createSutBoundary(), {
    renderOutput(output, order) {
      const record = realizeAvailableOutput(output, order);
      if (output.kind !== "direct_current_session_correction_request") return record;
      return Object.freeze({
        ...record,
        realizedBehavior: "immediate_correction",
        fidelity: "mismatch",
        mismatchOrigin: "simulated_dependency"
      });
    }
  });
  const runRef = harness.startRun();
  completeFocusedDrill(harness, runRef);
  harness.deliverSpontaneousCorrectionInputsIfEligible(
    runRef, spontaneousCorrectionRecords()
  );
  harness.processCurrentInteraction(runRef);
  const record = harness.realizeAvailableOutputs(runRef)[0];
  assert.equal(record.requestedBehavior, "turn_completion_correction");
  assert.equal(record.realizedBehavior, "immediate_correction");
  harness.processCurrentInteraction(runRef);
  assert.throws(
    () => harness.inspectDirectCorrectionRealizedCheckpoint(runRef),
    /exact closure is malformed/
  );
});

test("CP-DIRECT-CORRECTION-REALIZED rejects identity, relation, and order substitution", () => {
  const attacks = [
    (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "scoped_current_correction_control"
      )).correctionTiming = "immediate_correction";
    },
    (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "scoped_current_correction_control"
      )).unexpectedOracleField = true;
    },
    (snapshot) => {
      const state = snapshot.records.find((record) => (
        record.family === "scoped_current_correction_control"
      ));
      snapshot.records.find((record) => (
        record.reference === state.sourceCommunicationRef
      )).firstInteractionRef = snapshot.records.find((record) => (
        record.family === "focused_drill_instruction"
      )).interactionRef;
    },
    (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "direct_current_session_correction_disposition"
      )).correctionControlRef = snapshot.records.find((record) => (
        record.family === "focused_drill_instruction"
      )).reference;
    },
    (snapshot) => {
      const fact = snapshot.records.find((record) => (
        record.role === "simulator_behavior_realization"
        && record.payload.requestedBehavior === "turn_completion_correction"
      ));
      snapshot.records.find((record) => record.reference === fact.sourceActorRef).sourceActor
        = "wrong-simulator";
    },
    (snapshot) => {
      const transition = snapshot.records.find((record) => (
        record.transitionKind === "record_direct_current_session_correction_realization"
      ));
      transition.inputReferences.reverse();
    },
    (snapshot) => {
      const relation = snapshot.relations.find((item) => (
        item.relationKind === "realization"
        && item.targetRole === "direct_current_session_correction_disposition"
      ));
      relation.targetRole = "focused_drill_behavior_disposition";
    },
    (snapshot) => {
      const transition = snapshot.records.find((record) => (
        record.transitionKind === "record_direct_current_session_correction_realization"
      ));
      snapshot.relations.find((item) => (
        item.fromRef === transition.reference && item.relationKind === "basis"
      )).createdOrder -= 1;
    },
    (snapshot) => {
      const disposition = snapshot.records.find((record) => (
        record.family === "direct_current_session_correction_disposition"
      ));
      snapshot.records.push({ ...structuredClone(disposition), reference:
        "state_99999999-9999-9999-9999-999999999999" });
    },
    (snapshot) => {
      snapshot.records.find((record) => (
        record.family === "focused_drill_outcome"
      )).futureApplicability = "applicable_to_current_spontaneous_session";
    },
    (snapshot) => {
      const focusedInstruction = snapshot.records.find((record) => (
        record.family === "focused_drill_instruction"
      ));
      const directState = snapshot.records.find((record) => (
        record.family === "scoped_current_correction_control"
      ));
      snapshot.relations.push({
        relationKind: "supersession",
        fromRef: directState.reference,
        toRef: focusedInstruction.reference,
        targetRole: "superseded_focused_instruction",
        effectiveOrder: directState.createdOrder,
        createdOrder: directState.createdOrder,
        assertedByRole: "sut"
      });
    }
  ];
  for (const attack of attacks) {
    const real = createSutBoundary();
    let corrupt = false;
    const boundary = Object.freeze({
      ...real,
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        if (corrupt) attack(snapshot);
        return snapshot;
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    completeFocusedDrill(harness, runRef);
    harness.deliverSpontaneousCorrectionInputsIfEligible(
      runRef, spontaneousCorrectionRecords()
    );
    harness.processCurrentInteraction(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    corrupt = true;
    assert.throws(() => harness.inspectDirectCorrectionRealizedCheckpoint(runRef));
  }
});

test("direct checkpoint reconstructs complete focused and current attribution closures", async (t) => {
  const record = (snapshot, predicate) => snapshot.records.find(predicate);
  const family = (snapshot, name) => record(snapshot, (item) => item.family === name);
  const creator = (snapshot, item) => record(
    snapshot, (candidate) => candidate.reference === item.createdByTransitionRef
  );
  const relation = (snapshot, item, kind, role) => snapshot.relations.find((candidate) => (
    candidate.fromRef === item.reference
      && candidate.relationKind === kind
      && (!role || candidate.targetRole === role)
  ));
  const removeRelation = (snapshot, target) => {
    snapshot.relations.splice(snapshot.relations.indexOf(target), 1);
  };
  const duplicateCreator = (snapshot, item, suffix) => {
    snapshot.records.push({
      ...structuredClone(creator(snapshot, item)),
      reference: `transition_${suffix}`
    });
  };
  const focusedInstruction = (snapshot) => family(snapshot, "focused_drill_instruction");
  const focusedDisposition = (snapshot) => (
    family(snapshot, "focused_drill_behavior_disposition")
  );
  const directState = (snapshot) => family(snapshot, "scoped_current_correction_control");
  const directDisposition = (snapshot) => (
    family(snapshot, "direct_current_session_correction_disposition")
  );
  const directAssertion = (snapshot) => {
    const state = directState(snapshot);
    return record(snapshot, (item) => item.reference === state.attributedAssertionRef);
  };
  const directCommunication = (snapshot) => {
    const state = directState(snapshot);
    return record(snapshot, (item) => item.reference === state.sourceCommunicationRef);
  };
  const directContext = (snapshot) => {
    const state = directState(snapshot);
    return record(snapshot, (item) => item.reference === state.contextRef);
  };
  const attacks = [
    ["focused instruction rejects H-004 substitution", (snapshot) => {
      const instruction = focusedInstruction(snapshot);
      const communication = record(
        snapshot, (item) => item.reference === instruction.sourceCommunicationRef
      );
      const historical = {
        ...structuredClone(communication),
        reference: "state_h004_historical",
        sourceFactRef: "source_h004_historical",
        payload: {
          ...structuredClone(communication.payload),
          sourceFactRef: "source_h004_historical",
          content: "Correct me immediately in focused text drills.",
          context: "focused_text_drill",
          semanticStatusOrigin: "fixture_initialized"
        }
      };
      snapshot.records.push(historical);
      instruction.sourceCommunicationRef = historical.reference;
    }],
    ["focused instruction rejects equal-payload communication substitution", (snapshot) => {
      const instruction = focusedInstruction(snapshot);
      const communication = record(
        snapshot, (item) => item.reference === instruction.sourceCommunicationRef
      );
      const clone = {
        ...structuredClone(communication),
        reference: "state_equal_payload_d002",
        sourceFactRef: "source_equal_payload_d002",
        payload: {
          ...structuredClone(communication.payload),
          sourceFactRef: "source_equal_payload_d002"
        }
      };
      snapshot.records.push(clone);
      instruction.sourceCommunicationRef = clone.reference;
    }],
    ["focused instruction rejects context substitution", (snapshot) => {
      focusedInstruction(snapshot).contextRef = directContext(snapshot).reference;
    }],
    ["focused instruction rejects assertion substitution", (snapshot) => {
      focusedInstruction(snapshot).attributedAssertionRef = directAssertion(snapshot).reference;
    }],
    ["focused instruction rejects actor substitution", (snapshot) => {
      focusedInstruction(snapshot).sourceActorRef = directContext(snapshot).sourceActorRef;
    }],
    ["focused instruction rejects drill-scope rewrite", (snapshot) => {
      focusedInstruction(snapshot).drillScope.consequence = "high";
    }],
    ["focused instruction rejects interaction rewrite", (snapshot) => {
      focusedInstruction(snapshot).interactionRef = directState(snapshot).interactionRef;
    }],
    ["focused instruction rejects authority rewrite", (snapshot) => {
      focusedInstruction(snapshot).authority = "inferred_preference";
    }],
    ["focused instruction rejects applicability rewrite", (snapshot) => {
      focusedInstruction(snapshot).applicability = "all_future_drills";
    }],
    ["focused instruction rejects removed source relation", (snapshot) => {
      removeRelation(snapshot, relation(snapshot, focusedInstruction(snapshot), "source"));
    }],
    ["focused instruction rejects duplicated source relation", (snapshot) => {
      snapshot.relations.push(structuredClone(
        relation(snapshot, focusedInstruction(snapshot), "source")
      ));
    }],
    ["focused instruction rejects retargeted source relation", (snapshot) => {
      relation(snapshot, focusedInstruction(snapshot), "source").toRef
        = directContext(snapshot).sourceActorRef;
    }],
    ["focused instruction rejects rewritten source role", (snapshot) => {
      relation(snapshot, focusedInstruction(snapshot), "source").targetRole
        = "substituted_source";
    }],
    ["focused instruction rejects removed basis relation", (snapshot) => {
      removeRelation(snapshot, relation(
        snapshot, focusedInstruction(snapshot), "basis", "explicit_request_communication"
      ));
    }],
    ["focused instruction rejects duplicated basis relation", (snapshot) => {
      snapshot.relations.push(structuredClone(relation(
        snapshot, focusedInstruction(snapshot), "basis", "explicit_request_communication"
      )));
    }],
    ["focused instruction rejects retargeted basis relation", (snapshot) => {
      relation(
        snapshot, focusedInstruction(snapshot), "basis", "explicit_request_communication"
      ).toRef = directCommunication(snapshot).reference;
    }],
    ["focused instruction rejects rewritten basis role", (snapshot) => {
      relation(
        snapshot, focusedInstruction(snapshot), "basis", "explicit_request_communication"
      ).targetRole = "historical_request_communication";
    }],
    ["focused instruction rejects duplicate creator", (snapshot) => {
      duplicateCreator(snapshot, focusedInstruction(snapshot), "duplicate_focused_instruction");
    }],
    ["focused instruction rejects creator-input rewrite", (snapshot) => {
      creator(snapshot, focusedInstruction(snapshot)).inputReferences.reverse();
    }],
    ["focused instruction rejects creator-result rewrite", (snapshot) => {
      creator(snapshot, focusedInstruction(snapshot)).resultReferences = [
        focusedDisposition(snapshot).reference
      ];
    }],
    ["D-001 rejects source-identity rewrite", (snapshot) => {
      const context = record(
        snapshot, (item) => item.reference === focusedInstruction(snapshot).contextRef
      );
      context.sourceFactRef += "-rewritten";
      context.payload.sourceFactRef = context.sourceFactRef;
    }],
    ["D-001 rejects original-ingestion rewrite", (snapshot) => {
      const context = record(
        snapshot, (item) => item.reference === focusedInstruction(snapshot).contextRef
      );
      context.firstInteractionRef = directState(snapshot).interactionRef;
    }],
    ["D-002 rejects source-identity rewrite", (snapshot) => {
      const communication = record(
        snapshot, (item) => item.reference === focusedInstruction(snapshot).sourceCommunicationRef
      );
      communication.sourceFactRef += "-rewritten";
      communication.payload.sourceFactRef = communication.sourceFactRef;
    }],
    ["D-002 rejects original-ingestion rewrite", (snapshot) => {
      const communication = record(
        snapshot, (item) => item.reference === focusedInstruction(snapshot).sourceCommunicationRef
      );
      communication.firstInteractionRef = directState(snapshot).interactionRef;
    }],
    ["focused disposition rejects active-trial substitution", (snapshot) => {
      focusedDisposition(snapshot).activeTrialRef = focusedInstruction(snapshot).reference;
    }],
    ["focused disposition rejects instruction substitution", (snapshot) => {
      focusedDisposition(snapshot).instructionRef = directState(snapshot).reference;
    }],
    ["focused disposition rejects context substitution", (snapshot) => {
      focusedDisposition(snapshot).contextRef = directContext(snapshot).reference;
    }],
    ["focused disposition rejects drill-scope rewrite", (snapshot) => {
      focusedDisposition(snapshot).drillScope.taskMode = "spontaneous_production";
    }],
    ["focused disposition rejects removed basis relation", (snapshot) => {
      removeRelation(snapshot, relation(
        snapshot, focusedDisposition(snapshot), "basis", "explicit_focused_drill_instruction"
      ));
    }],
    ["focused disposition rejects duplicated basis relation", (snapshot) => {
      snapshot.relations.push(structuredClone(relation(
        snapshot, focusedDisposition(snapshot), "basis", "explicit_focused_drill_instruction"
      )));
    }],
    ["focused disposition rejects retargeted basis relation", (snapshot) => {
      relation(
        snapshot, focusedDisposition(snapshot), "basis", "explicit_focused_drill_instruction"
      ).toRef = directState(snapshot).reference;
    }],
    ["focused disposition rejects rewritten basis role", (snapshot) => {
      relation(
        snapshot, focusedDisposition(snapshot), "basis", "explicit_focused_drill_instruction"
      ).targetRole = "substituted_instruction";
    }],
    ["focused disposition rejects duplicate creator", (snapshot) => {
      duplicateCreator(snapshot, focusedDisposition(snapshot), "duplicate_focused_disposition");
    }],
    ["focused disposition rejects creator-input rewrite", (snapshot) => {
      creator(snapshot, focusedDisposition(snapshot)).inputReferences.reverse();
    }],
    ["focused disposition rejects creator-result rewrite", (snapshot) => {
      creator(snapshot, focusedDisposition(snapshot)).resultReferences = [
        focusedInstruction(snapshot).reference
      ];
    }],
    ["direct state rejects creator-pointer rewrite", (snapshot) => {
      directState(snapshot).createdByTransitionRef = "transition_missing_direct_state";
    }],
    ["direct disposition rejects creator-pointer rewrite", (snapshot) => {
      directDisposition(snapshot).createdByTransitionRef
        = "transition_missing_direct_disposition";
    }],
    ["current assertion rejects extra key", (snapshot) => {
      directAssertion(snapshot).unexpected = true;
    }],
    ["current assertion rejects family rewrite", (snapshot) => {
      directAssertion(snapshot).family = "unrelated_family";
    }],
    ["current assertion rejects origin rewrite", (snapshot) => {
      directAssertion(snapshot).origin = "fixture";
    }],
    ["current assertion rejects epistemic-status rewrite", (snapshot) => {
      directAssertion(snapshot).epistemicStatus = "inferred_preference";
    }],
    ["current assertion rejects status-origin rewrite", (snapshot) => {
      directAssertion(snapshot).statusOrigin = "fixture_initialized";
    }],
    ["current assertion rejects actor rewrite", (snapshot) => {
      directAssertion(snapshot).sourceActorRef = directContext(snapshot).sourceActorRef;
    }],
    ["current assertion rejects context rewrite", (snapshot) => {
      directAssertion(snapshot).context = "focused_production_drill";
    }],
    ["current assertion rejects occurrence-order rewrite", (snapshot) => {
      directAssertion(snapshot).occurrenceOrder -= 1;
    }],
    ["current assertion rejects interaction rewrite", (snapshot) => {
      directAssertion(snapshot).interactionRef = focusedInstruction(snapshot).interactionRef;
    }],
    ["current assertion rejects creator-pointer rewrite", (snapshot) => {
      directAssertion(snapshot).createdByTransitionRef
        = creator(snapshot, directState(snapshot)).reference;
    }],
    ["current assertion rejects unresolvable creator-pointer rewrite", (snapshot) => {
      directAssertion(snapshot).createdByTransitionRef = "transition_missing_attribution";
    }],
    ["current assertion rejects duplicate creator", (snapshot) => {
      duplicateCreator(snapshot, directAssertion(snapshot), "duplicate_current_attribution");
    }],
    ["current assertion rejects transition-kind rewrite", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).transitionKind = "infer_preference";
    }],
    ["current assertion rejects transition-family rewrite", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).family = "unrelated_family";
    }],
    ["current assertion rejects transition-origin rewrite", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).origin = "fixture";
    }],
    ["current assertion rejects transition-result rewrite", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).result = "malformed";
    }],
    ["current assertion rejects transition-interaction rewrite", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).interactionRef
        = focusedInstruction(snapshot).interactionRef;
    }],
    ["current assertion rejects missing attribution input", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).inputReferences = [];
    }],
    ["current assertion rejects duplicate attribution input", (snapshot) => {
      const transition = creator(snapshot, directAssertion(snapshot));
      transition.inputReferences.push(directCommunication(snapshot).reference);
    }],
    ["current assertion rejects missing attribution result", (snapshot) => {
      creator(snapshot, directAssertion(snapshot)).resultReferences = [];
    }],
    ["current assertion rejects duplicate attribution result", (snapshot) => {
      const assertion = directAssertion(snapshot);
      creator(snapshot, assertion).resultReferences.push(assertion.reference);
    }],
    ["current assertion rejects removed source relation", (snapshot) => {
      removeRelation(snapshot, relation(snapshot, directAssertion(snapshot), "source"));
    }],
    ["current assertion rejects duplicated source relation", (snapshot) => {
      snapshot.relations.push(structuredClone(
        relation(snapshot, directAssertion(snapshot), "source")
      ));
    }],
    ["current assertion rejects retargeted source relation", (snapshot) => {
      relation(snapshot, directAssertion(snapshot), "source").toRef
        = directContext(snapshot).sourceActorRef;
    }],
    ["current assertion rejects rewritten source role", (snapshot) => {
      relation(snapshot, directAssertion(snapshot), "source").targetRole
        = "substituted_source";
    }],
    ["current assertion rejects removed communication basis", (snapshot) => {
      removeRelation(snapshot, relation(snapshot, directAssertion(snapshot), "basis"));
    }],
    ["current assertion rejects duplicated communication basis", (snapshot) => {
      snapshot.relations.push(structuredClone(
        relation(snapshot, directAssertion(snapshot), "basis")
      ));
    }],
    ["current assertion rejects retargeted communication basis", (snapshot) => {
      relation(snapshot, directAssertion(snapshot), "basis").toRef
        = focusedInstruction(snapshot).sourceCommunicationRef;
    }],
    ["current assertion rejects rewritten communication-basis role", (snapshot) => {
      relation(snapshot, directAssertion(snapshot), "basis").targetRole
        = "inferred_communication";
    }],
    ["current assertion rejects assertion-order rewrite", (snapshot) => {
      directAssertion(snapshot).createdOrder = directCommunication(snapshot).createdOrder;
    }],
    ["current assertion rejects attribution-transition order rewrite", (snapshot) => {
      const assertion = directAssertion(snapshot);
      creator(snapshot, assertion).createdOrder = assertion.createdOrder;
    }]
  ];

  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectDirectCorrectionRealizedCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }
});

test("realization checkpoints reject selected-closure ambiguity", async (t) => {
  const directParts = (snapshot) => {
    const disposition = snapshot.records.find((record) => (
      record.family === "direct_current_session_correction_disposition"
    ));
    const fact = snapshot.records.find((record) => (
      record.role === "simulator_behavior_realization"
      && record.payload?.requestedRef === disposition.reference
    ));
    const transition = snapshot.records.find((record) => (
      record.transitionKind === "record_direct_current_session_correction_realization"
      && record.inputReferences?.includes(disposition.reference)
    ));
    const relation = snapshot.relations.find((candidate) => (
      candidate.relationKind === "realization"
      && candidate.toRef === disposition.reference
    ));
    return { disposition, fact, transition, relation };
  };
  const focusedParts = (snapshot) => {
    const outcome = snapshot.records.find((record) => record.family === "focused_drill_outcome");
    const disposition = snapshot.records.find((record) => (
      record.reference === outcome.behaviorDispositionRef
    ));
    const fact = snapshot.records.find((record) => record.reference === outcome.realizationFactRef);
    const transition = snapshot.records.find((record) => (
      record.reference === outcome.realizationTransitionRef
    ));
    const relation = snapshot.relations.find((candidate) => (
      candidate.relationKind === "realization"
      && candidate.fromRef === fact.reference
      && candidate.toRef === disposition.reference
    ));
    return { outcome, disposition, fact, transition, relation };
  };
  const addCompetingFact = (snapshot, parts, suffix) => {
    const sourceFactRef = `source_competing_${suffix}`;
    const fact = {
      ...structuredClone(parts.fact),
      reference: `state_competing_${suffix}`,
      sourceFactRef,
      payload: { ...structuredClone(parts.fact.payload), sourceFactRef }
    };
    snapshot.records.push(fact);
    return fact;
  };
  const addTransition = (snapshot, transition, suffix, inputReferences) => {
    const competing = {
      ...structuredClone(transition),
      reference: `transition_competing_${suffix}`,
      inputReferences
    };
    snapshot.records.push(competing);
    return competing;
  };
  const addRelation = (snapshot, relation, suffix, overrides = {}) => {
    const competing = {
      ...structuredClone(relation),
      targetRole: `competing_${suffix}`,
      ...overrides
    };
    snapshot.relations.push(competing);
    return competing;
  };
  const attacks = [
    ["direct rejects an additional fact claiming the disposition", (snapshot) => {
      const parts = directParts(snapshot);
      addCompetingFact(snapshot, parts, "direct_fact");
    }],
    ["direct rejects an indirect recording transition", (snapshot) => {
      const parts = directParts(snapshot);
      addTransition(
        snapshot, parts.transition, "direct_indirect_transition", [parts.fact.reference]
      );
    }],
    ["direct rejects a transition consuming a competing claiming fact", (snapshot) => {
      const parts = directParts(snapshot);
      const fact = addCompetingFact(snapshot, parts, "direct_transition_fact");
      addTransition(snapshot, parts.transition, "direct_transition_fact", [fact.reference]);
    }],
    ["direct rejects a malformed relation owned through requestedRef", (snapshot) => {
      const parts = directParts(snapshot);
      addRelation(snapshot, parts.relation, "direct_wrong_target", {
        toRef: parts.fact.reference
      });
    }],
    ["direct rejects combined indirect relation and transition claims", (snapshot) => {
      const parts = directParts(snapshot);
      addTransition(snapshot, parts.transition, "direct_combined", [parts.fact.reference]);
      addRelation(snapshot, parts.relation, "direct_combined", {
        toRef: parts.fact.reference
      });
    }],
    ["direct rejects a duplicate relevant transition", (snapshot) => {
      const parts = directParts(snapshot);
      addTransition(
        snapshot, parts.transition, "direct_duplicate_transition",
        structuredClone(parts.transition.inputReferences)
      );
    }],
    ["direct rejects a duplicate relevant relation", (snapshot) => {
      const parts = directParts(snapshot);
      snapshot.relations.push(structuredClone(parts.relation));
    }],
    ["direct rejects a coherently extended realization-ingestion basis", (snapshot) => {
      const parts = directParts(snapshot);
      const interaction = snapshot.records.find((record) => (
        record.reference === parts.fact.firstInteractionRef
      ));
      const ingestion = snapshot.records.find((record) => (
        record.reference === interaction.createdByTransitionRef
      ));
      const factBasis = snapshot.relations.find((relation) => (
        relation.fromRef === ingestion.reference
        && relation.toRef === parts.fact.reference
        && relation.targetRole === "ingested_input"
      ));
      interaction.inputReferences.push(parts.disposition.reference);
      ingestion.inputReferences.push(parts.disposition.reference);
      snapshot.relations.push({
        ...structuredClone(factBasis),
        toRef: parts.disposition.reference
      });
    }],
    ["focused rejects another transition consuming the disposition", (snapshot) => {
      const parts = focusedParts(snapshot);
      addTransition(
        snapshot, parts.transition, "focused_extra_transition",
        structuredClone(parts.transition.inputReferences)
      );
    }],
    ["focused outcome cannot select one of two realization transitions", (snapshot) => {
      const parts = focusedParts(snapshot);
      const competing = addTransition(
        snapshot, parts.transition, "focused_outcome_selection",
        structuredClone(parts.transition.inputReferences)
      );
      assert.notEqual(parts.outcome.realizationTransitionRef, competing.reference);
    }],
    ["focused rejects a partial transition claimant", (snapshot) => {
      const parts = focusedParts(snapshot);
      addTransition(
        snapshot, parts.transition, "focused_partial_transition", [parts.disposition.reference]
      );
    }],
    ["focused rejects combined competing relation and transition evidence", (snapshot) => {
      const parts = focusedParts(snapshot);
      addTransition(
        snapshot, parts.transition, "focused_combined",
        structuredClone(parts.transition.inputReferences)
      );
      addRelation(snapshot, parts.relation, "focused_combined", {
        toRef: parts.disposition.reference
      });
    }]
  ];

  for (const [name, attack] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      const boundary = Object.freeze({
        ...real,
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) attack(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      completeDirectCorrection(harness, runRef);
      const before = real.captureInspectionSnapshot(runRef);
      corrupt = true;
      assert.throws(() => harness.inspectDirectCorrectionRealizedCheckpoint(runRef));
      corrupt = false;
      assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
    });
  }

  await t.test("exact checkpoint replay remains passive and stable", () => {
    const real = createSutBoundary();
    const harness = createEvaluationHarness(real);
    const runRef = harness.startRun();
    completeDirectCorrection(harness, runRef);
    const before = real.captureInspectionSnapshot(runRef);
    const first = harness.inspectDirectCorrectionRealizedCheckpoint(runRef);
    const second = harness.inspectDirectCorrectionRealizedCheckpoint(runRef);
    assert.deepEqual(second, first);
    assert.deepEqual(real.captureInspectionSnapshot(runRef), before);
  });
});

test("independent runs never share direct-correction state", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const run = () => {
    const runRef = harness.startRun();
    completeFocusedDrill(harness, runRef);
    harness.deliverSpontaneousCorrectionInputsIfEligible(
      runRef, spontaneousCorrectionRecords()
    );
    harness.processCurrentInteraction(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    return { runRef, checkpoint: harness.inspectDirectCorrectionRealizedCheckpoint(runRef)[0] };
  };
  const first = run();
  harness.endRun(first.runRef);
  const second = run();
  assert.notEqual(second.checkpoint.correctionStateRef, first.checkpoint.correctionStateRef);
  assert.notEqual(second.checkpoint.dispositionRef, first.checkpoint.dispositionRef);
  assert.notEqual(second.checkpoint.realizationFactRef, first.checkpoint.realizationFactRef);
  assert.equal(harness.captureInspectionSnapshot(second.runRef).records.some((record) => (
    Object.values(first.checkpoint).includes(record.reference)
  )), false);
});

test("focused-drill opening requires one exact retained active-trial closure", () => {
  const attacks = [
    {
      mutate(snapshot) {
        snapshot.records = snapshot.records.filter(
          (record) => record.family !== "active_trial"
        );
      },
      throws: false
    },
    {
      mutate(snapshot) {
        const trial = snapshot.records.find((record) => record.family === "active_trial");
        snapshot.records.push({ ...structuredClone(trial), reference: `${trial.reference}-copy` });
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find(
          (record) => record.family === "active_trial"
        ).currentStatus = "formed_non_active";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        const trial = snapshot.records.find((record) => record.family === "active_trial");
        snapshot.relations = snapshot.relations.filter((relation) => !(
          relation.fromRef === trial.reference
          && relation.targetRole === "activation_assessment"
        ));
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find(
          (record) => record.family === "activation_assessment"
        ).checkResults.scope.reason = "arbitrary_non_empty_reason";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find(
          (record) => record.family === "trial_candidate"
        ).decisionBasisAffordanceRefs = [];
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find((record) => (
          record.role === "fixture_control_fact"
          && record.payload.control === "user_governed_constraints"
        )).payload.value = "partial_scope";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find((record) => (
          record.role === "fixture_control_fact"
          && record.payload.control === "evaluation_retention_basis"
        )).payload.value = "production_memory";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find((record) => (
          record.role === "fixture_control_fact"
          && record.payload.control === "reversibility"
        )).payload.value = "irreversible";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        const control = snapshot.records.find((record) => (
          record.role === "fixture_control_fact"
          && record.payload.control === "evaluation_retention_basis"
        ));
        snapshot.records.find(
          (record) => record.reference === control.sourceActorRef
        ).sourceActor = "wrong-control-source";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        const control = snapshot.records.find((record) => (
          record.role === "fixture_control_fact"
          && record.payload.control === "evaluation_retention_basis"
        ));
        control.payload.sourceFactRef = `${control.payload.sourceFactRef}-substitute`;
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find(
          (record) => record.role === "chronology_fact"
        ).payload.scenarioDay -= 1;
      },
      throws: true
    },
    {
      mutate(snapshot) {
        const comparison = snapshot.records.find(
          (record) => record.family === "dimension_comparison"
        );
        snapshot.relations.find((relation) => (
          relation.fromRef === comparison.reference
          && relation.targetRole === "recognition_observation"
        )).targetRole = "production_observation";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        const assessment = snapshot.records.find(
          (record) => record.family === "activation_assessment"
        );
        snapshot.relations.find((relation) => (
          relation.fromRef === assessment.reference
          && relation.targetRole === "activation_context"
        )).targetRole = "activation_chronology";
      },
      throws: true
    },
    {
      mutate(snapshot) {
        const assessment = snapshot.records.find(
          (record) => record.family === "activation_assessment"
        );
        const transition = snapshot.records.find(
          (record) => record.reference === assessment.createdByTransitionRef
        );
        const retentionRef = assessment.controlBasisRefs.bindingInteraction
          .retentionBasisRefs[0];
        const userGovernedRef = assessment.controlBasisRefs.bindingInteraction
          .userGovernedConstraintRefs[0];
        assessment.controlBasisRefs.bindingInteraction.retentionBasisRefs = [userGovernedRef];
        assessment.materialBasisRefs = assessment.materialBasisRefs.filter(
          (reference) => reference !== retentionRef
        );
        transition.inputReferences = [...assessment.materialBasisRefs];
        snapshot.relations.find((relation) => (
          relation.fromRef === assessment.reference
          && relation.toRef === retentionRef
          && relation.targetRole === "binding_retention_control"
        )).toRef = userGovernedRef;
      },
      throws: true
    },
    {
      mutate(snapshot) {
        snapshot.records.find((record) => (
          record.role === "context_label"
          && record.payload.taskMode === "spontaneous_production"
        )).payload.activity = "unrelated_activity";
      },
      throws: true
    }
  ];
  for (const attack of attacks) {
    const real = createSutBoundary();
    let corrupt = false;
    let ingressCalls = 0;
    const boundary = Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        ingressCalls += 1;
        return real.ingestSutVisibleInputs(...args);
      },
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        if (corrupt) attack.mutate(snapshot);
        return snapshot;
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    activateProductionTrial(harness, runRef);
    const before = ingressCalls;
    corrupt = true;
    if (attack.throws) {
      assert.throws(
        () => harness.deliverFocusedDrillInputsIfEligible(
          runRef, focusedDrillOpeningRecords()
        )
      );
    } else {
      assert.deepEqual(
        harness.deliverFocusedDrillInputsIfEligible(runRef, focusedDrillOpeningRecords()),
        []
      );
    }
    assert.equal(ingressCalls, before);
  }
  {
    const real = createSutBoundary();
    let corrupt = false;
    let ingressCalls = 0;
    const boundary = Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        ingressCalls += 1;
        return real.ingestSutVisibleInputs(...args);
      },
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        if (corrupt) {
          snapshot.relations.find((relation) => (
            relation.relationKind === "realization"
            && relation.targetRole === "focused_drill_behavior_disposition"
          )).targetRole = "wrong";
        }
        return snapshot;
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    activateProductionTrial(harness, runRef);
    harness.deliverFocusedDrillInputsIfEligible(runRef, focusedDrillOpeningRecords());
    harness.processCurrentInteraction(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    harness.deliverFocusedDrillOutcomeIfEligible(runRef, focusedDrillOutcomeRecords());
    const before = ingressCalls;
    corrupt = true;
    assert.throws(
      () => harness.deliverFocusedDrillOutcomeIfEligible(
        runRef, focusedDrillOutcomeRecords()
      )
    );
    assert.equal(ingressCalls, before);
  }
});

test("CP-PROD-ACTIVE rejects coordinated source-identity rewrites before D-001/D-002 ingress", async (t) => {
  const attacks = [
    ["all inspected source-reference fields", (snapshot) => {
      for (const fact of snapshot.records.filter((record) => record.family === "input_fact")) {
        rewriteSourceIdentity(fact, "all");
      }
    }],
    ["source reference plus occurrence order", (snapshot) => {
      const fact = snapshot.records.find((record) => (
        record.role === "fixture_control_fact" && record.payload.control === "trial_policy"
      ));
      rewriteSourceIdentity(fact, "order");
      fact.payload.occurrenceOrder += 100;
    }],
    ["source reference plus non-check-driving description", (snapshot) => {
      const fact = snapshot.records.find((record) => record.role === "affordance_fact");
      rewriteSourceIdentity(fact, "description");
      fact.payload.description = "Coherently rewritten non-check-driving description.";
    }],
    ["candidate-interaction control source identity", (snapshot) => {
      const fact = snapshot.records.find((record) => (
        record.role === "fixture_control_fact" && record.payload.control === "trial_policy"
      ));
      rewriteSourceIdentity(fact, "candidate-control");
    }],
    ["binding-interaction control source identity", (snapshot) => {
      const fact = snapshot.records.find((record) => (
        record.role === "fixture_control_fact"
          && record.payload.control === "evaluation_retention_basis"
      ));
      rewriteSourceIdentity(fact, "binding-control");
    }],
    ["chronology source identity", (snapshot) => {
      rewriteSourceIdentity(
        snapshot.records.find((record) => record.role === "chronology_fact"),
        "chronology"
      );
    }],
    ["context source identity", (snapshot) => {
      rewriteSourceIdentity(snapshot.records.find((record) => (
        record.role === "context_label"
          && record.payload.taskMode === "spontaneous_production"
      )), "context");
    }],
    ["recognition-observation source identity", (snapshot) => {
      rewriteSourceIdentity(snapshot.records.find((record) => (
        record.role === "task_observation" && record.payload.taskMode === "recognition"
      )), "recognition");
    }],
    ["production-observation source identity", (snapshot) => {
      rewriteSourceIdentity(snapshot.records.find((record) => (
        record.role === "task_observation"
          && record.payload.taskMode === "spontaneous_production"
      )), "production");
    }],
    ["proposal-response source identity", (snapshot) => {
      rewriteSourceIdentity(
        snapshot.records.find((record) => record.role === "user_response"),
        "response"
      );
    }],
    ["proposal-simulator-realization source identity", (snapshot) => {
      rewriteSourceIdentity(
        snapshot.records.find((record) => record.role === "simulator_realization"),
        "simulator"
      );
    }]
  ];

  for (const [name, mutate] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      let ingressCalls = 0;
      const boundary = Object.freeze({
        ...real,
        ingestSutVisibleInputs(...args) {
          ingressCalls += 1;
          return real.ingestSutVisibleInputs(...args);
        },
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) mutate(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      activateProductionTrial(harness, runRef);
      const before = ingressCalls;
      corrupt = true;
      assert.throws(
        () => harness.deliverFocusedDrillInputsIfEligible(
          runRef, focusedDrillOpeningRecords()
        ),
        /CP-PROD-ACTIVE/
      );
      assert.equal(ingressCalls, before);
      assert.equal(real.captureInspectionSnapshot(runRef).records.some((record) => (
        record.family === "input_fact" && record.payload.occurrenceOrder >= 15
      )), false);
    });
  }
});

test("CP-PROD-ACTIVE rejects coherent original-ingestion rewrites before D-001/D-002 ingress", async (t) => {
  const attacks = [
    ["redelivered consequence retargeted to its binding interaction", (snapshot) => {
      retargetSharedControlToBinding(snapshot, "consequence");
    }],
    ["redelivered reversibility retargeted to its binding interaction", (snapshot) => {
      retargetSharedControlToBinding(snapshot, "reversibility");
    }],
    ["first-interaction and source-relation order rewritten together", (snapshot) => {
      retargetSharedControlToBinding(snapshot, "consequence");
    }],
    ["candidate interaction and ingestion moved after the binding interaction", (snapshot) => {
      const closure = retargetSharedControlToBinding(snapshot, "consequence");
      closure.candidateInteraction.createdOrder = closure.bindingInteraction.createdOrder + 1;
      closure.candidateIngestion.createdOrder = closure.candidateInteraction.createdOrder + 1;
    }],
    ["candidate-ingestion bases move with the candidate ingestion", (snapshot) => {
      const closure = retargetSharedControlToBinding(snapshot, "consequence");
      closure.candidateInteraction.createdOrder = closure.bindingInteraction.createdOrder + 1;
      closure.candidateIngestion.createdOrder = closure.candidateInteraction.createdOrder + 1;
      for (const relation of snapshot.relations.filter((item) => (
        item.fromRef === closure.candidateIngestion.reference
          && item.relationKind === "basis"
      ))) {
        relation.createdOrder = closure.candidateIngestion.createdOrder;
        relation.effectiveOrder = closure.candidateIngestion.createdOrder;
      }
    }],
    ["both redelivered controls retargeted together", (snapshot) => {
      retargetSharedControlToBinding(snapshot, "consequence");
      retargetSharedControlToBinding(snapshot, "reversibility");
    }],
    ["original interaction stripped with matching ingestion input and bases", (snapshot) => {
      const closure = retargetSharedControlToBinding(snapshot, "consequence");
      closure.candidateInteraction.inputReferences = closure.candidateInteraction.inputReferences
        .filter((reference) => reference !== closure.fact.reference);
      closure.candidateIngestion.inputReferences = [...closure.candidateInteraction.inputReferences];
      snapshot.relations = snapshot.relations.filter((relation) => !(
        relation.fromRef === closure.candidateIngestion.reference
          && relation.toRef === closure.fact.reference
          && relation.relationKind === "basis"
      ));
    }],
    ["first interaction creator retargeted to another valid-shaped ingestion", (snapshot) => {
      const closure = sharedControlClosure(snapshot, "consequence");
      const clone = structuredClone(closure.candidateIngestion);
      clone.reference = `${clone.reference}-alternate`;
      closure.candidateInteraction.createdByTransitionRef = clone.reference;
      snapshot.records.push(clone);
      for (const relation of snapshot.relations.filter((item) => (
        item.fromRef === closure.candidateIngestion.reference
          && item.relationKind === "basis"
      ))) {
        snapshot.relations.push({ ...structuredClone(relation), fromRef: clone.reference });
      }
    }]
  ];

  for (const [name, mutate] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let corrupt = false;
      let ingressCalls = 0;
      const boundary = Object.freeze({
        ...real,
        ingestSutVisibleInputs(...args) {
          ingressCalls += 1;
          return real.ingestSutVisibleInputs(...args);
        },
        captureInspectionSnapshot(runRef) {
          const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
          if (corrupt) mutate(snapshot);
          return snapshot;
        }
      });
      const harness = createEvaluationHarness(boundary);
      const runRef = harness.startRun();
      activateProductionTrial(harness, runRef);
      const before = ingressCalls;
      corrupt = true;
      assert.throws(
        () => harness.deliverFocusedDrillInputsIfEligible(
          runRef, focusedDrillOpeningRecords()
        ),
        /CP-PROD-ACTIVE/
      );
      assert.equal(ingressCalls, before);
      assert.equal(real.captureInspectionSnapshot(runRef).records.some((record) => (
        record.family === "input_fact" && record.payload.occurrenceOrder >= 15
      )), false);
    });
  }
});

test("CP-PROD-ACTIVE rejects corrupted original-ingestion ledger evidence before ingress", async (t) => {
  const attacks = [
    ["firstInteractionRef missing", (evidence) => {
      delete evidence[0].firstInteractionRef;
    }],
    ["firstIngestionTransitionRef missing", (evidence) => {
      delete evidence[0].firstIngestionTransitionRef;
    }],
    ["two bindings claim different original interactions for one retained fact", (
      evidence, snapshot
    ) => {
      appendConflictingBinding(evidence, snapshot, "interaction");
    }],
    ["two bindings claim different original ingestions for one retained fact", (
      evidence, snapshot
    ) => {
      appendConflictingBinding(evidence, snapshot, "ingestion");
    }],
    ["binding cites a later redelivery interaction", (evidence, snapshot) => {
      const { entry, laterInteraction } = redeliveredControlEvidence(
        evidence, snapshot, "consequence"
      );
      entry.firstInteractionRef = laterInteraction.reference;
      entry.firstIngestionTransitionRef = laterInteraction.createdByTransitionRef;
    }],
    ["binding cites the right interaction but a later redelivery ingestion", (
      evidence, snapshot
    ) => {
      const { entry, laterInteraction } = redeliveredControlEvidence(
        evidence, snapshot, "consequence"
      );
      entry.firstIngestionTransitionRef = laterInteraction.createdByTransitionRef;
    }]
  ];

  for (const [name, mutate] of attacks) {
    await t.test(name, () => {
      const real = createSutBoundary();
      let runRef;
      let ingressCalls = 0;
      const boundary = Object.freeze({
        ...real,
        ingestSutVisibleInputs(...args) {
          ingressCalls += 1;
          return real.ingestSutVisibleInputs(...args);
        }
      });
      const harness = createHarnessForMechanismTests(boundary, {
        createSourceBindingLedger() {
          const ledger = createSourceBindingLedger();
          return Object.freeze({
            ...ledger,
            readOnlyEvidence() {
              const evidence = structuredClone(ledger.readOnlyEvidence());
              mutate(evidence, real.captureInspectionSnapshot(runRef));
              return evidence;
            }
          });
        }
      });
      runRef = harness.startRun();
      activateProductionTrial(harness, runRef);
      const before = ingressCalls;
      assert.throws(
        () => harness.deliverFocusedDrillInputsIfEligible(
          runRef, focusedDrillOpeningRecords()
        ),
        /CP-PROD-ACTIVE/
      );
      assert.equal(ingressCalls, before);
      assert.equal(real.captureInspectionSnapshot(runRef).records.some((record) => (
        record.family === "input_fact" && record.payload.occurrenceOrder >= 15
      )), false);
    });
  }
});

test("CP-PROD-ACTIVE rejects missing, rebound, duplicated, or changed original bindings", async (t) => {
  const harness = createEvaluationHarness(createSutBoundary());
  const runRef = harness.startRun();
  activateProductionTrial(harness, runRef);
  const snapshot = harness.captureInspectionSnapshot(runRef);
  const evidence = sourceBindingEvidenceFrom(snapshot);
  assert.ok(findExactActiveProductionTrial(snapshot, evidence));

  await t.test("original source binding absent", () => {
    const affordance = snapshot.records.find((record) => record.role === "affordance_fact");
    assert.throws(
      () => findExactActiveProductionTrial(
        snapshot,
        evidence.filter((entry) => entry.acceptedInputFactRef !== affordance.reference)
      ),
      /CP-PROD-ACTIVE/
    );
  });

  await t.test("one source reference rebound to another retained fact", () => {
    const corrupted = structuredClone(evidence);
    corrupted.push({
      ...structuredClone(corrupted[0]),
      acceptedInputFactRef: corrupted[1].acceptedInputFactRef
    });
    assert.throws(
      () => findExactActiveProductionTrial(snapshot, corrupted),
      /source reference was rebound/
    );
  });

  await t.test("one retained fact associated with two source bindings", () => {
    const corrupted = structuredClone(evidence);
    const duplicate = structuredClone(corrupted[0]);
    duplicate.sourceFactRef = `${duplicate.sourceFactRef}-second-source`;
    duplicate.projectedMeaning.sourceFactRef = duplicate.sourceFactRef;
    corrupted.push(duplicate);
    assert.throws(
      () => findExactActiveProductionTrial(snapshot, corrupted),
      /multiple original source bindings/
    );
  });

  await t.test("original meaning differs only in a non-check-driving field", () => {
    const corrupted = structuredClone(evidence);
    corrupted.find((entry) => entry.role === "affordance_fact")
      .projectedMeaning.description = "Different original description.";
    assert.throws(
      () => findExactActiveProductionTrial(snapshot, corrupted),
      /CP-PROD-ACTIVE/
    );
  });
});

test("failed SUT ingress records no successful evaluation source binding", () => {
  const real = createSutBoundary();
  let failIngress = true;
  const boundary = Object.freeze({
    ...real,
    ingestSutVisibleInputs(...args) {
      if (failIngress) throw new Error("injected ingress failure");
      return real.ingestSutVisibleInputs(...args);
    }
  });
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, [communicationFixtureRecord()]),
    /injected ingress failure/
  );

  failIngress = false;
  const changed = communicationFixtureRecord({
    data: { ...communicationFixtureRecord().data, content: "Changed after failed ingress." }
  });
  assert.equal(harness.deliverFixtureRecords(runRef, [changed]).acceptedInputRefs.length, 1);
  assert.equal(deliveredFacts(harness, runRef)[0].payload.content, changed.data.content);
});

test("failed post-ingress identity resolution commits no partial source bindings", () => {
  const real = createSutBoundary();
  const ledger = createSourceBindingLedger();
  let corruptInspection = true;
  let acceptedInputRefs = [];
  let ingressCalls = 0;
  const boundary = Object.freeze({
    ...real,
    ingestSutVisibleInputs(...args) {
      ingressCalls += 1;
      const result = real.ingestSutVisibleInputs(...args);
      acceptedInputRefs = result.acceptedInputRefs;
      return result;
    },
    captureInspectionSnapshot(runRef) {
      const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
      if (corruptInspection) {
        snapshot.records = snapshot.records.filter((record) => (
          record.reference !== acceptedInputRefs.at(-1)
        ));
      }
      return snapshot;
    }
  });
  const harness = createHarnessForMechanismTests(boundary, {
    createSourceBindingLedger: () => ledger
  });
  const runRef = harness.startRun();
  const records = productionProposalRecords().slice(0, 2);
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, records),
    /Successful ingress retained fact identity is malformed/
  );
  assert.equal(ingressCalls, 1);
  assert.deepEqual(ledger.readOnlyEvidence(), []);

  corruptInspection = false;
  assert.equal(harness.deliverFixtureRecords(runRef, records).acceptedInputRefs.length, 2);
  assert.equal(ingressCalls, 2);
  assert.equal(ledger.readOnlyEvidence().length, 2);
});

test("source-binding ledger rejects undeclared ingestion results atomically", () => {
  const real = createSutBoundary();
  const ledger = createSourceBindingLedger();
  let corruptInspection = true;
  let transitionRef;
  const boundary = Object.freeze({
    ...real,
    ingestSutVisibleInputs(...args) {
      const result = real.ingestSutVisibleInputs(...args);
      transitionRef = result.transitionRef;
      return result;
    },
    captureInspectionSnapshot(runRef) {
      const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
      if (corruptInspection) {
        snapshot.records.find(
          (record) => record.reference === transitionRef
        ).resultReferences.push("state_undeclared_ingestion_result");
      }
      return snapshot;
    }
  });
  const harness = createHarnessForMechanismTests(boundary, {
    createSourceBindingLedger: () => ledger
  });
  const runRef = harness.startRun();
  const records = [communicationFixtureRecord()];
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, records),
    /Successful ingress transition identity is malformed/
  );
  assert.deepEqual(ledger.readOnlyEvidence(), []);
  corruptInspection = false;
  assert.equal(harness.deliverFixtureRecords(runRef, records).acceptedInputRefs.length, 1);
  assert.equal(ledger.readOnlyEvidence().length, 1);
});

test("source-binding ledger rejects an omitted initialized assertion atomically", () => {
  const real = createSutBoundary();
  const ledger = createSourceBindingLedger();
  let corruptInspection = true;
  let transitionRef;
  const boundary = Object.freeze({
    ...real,
    ingestSutVisibleInputs(...args) {
      const result = real.ingestSutVisibleInputs(...args);
      transitionRef = result.transitionRef;
      return result;
    },
    captureInspectionSnapshot(runRef) {
      const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
      if (corruptInspection) {
        const ingestion = snapshot.records.find(
          (record) => record.reference === transitionRef
        );
        ingestion.resultReferences = ingestion.resultReferences.filter((reference) => (
          snapshot.records.find((record) => record.reference === reference)?.family
            !== "attributed_assertion"
        ));
      }
      return snapshot;
    }
  });
  const harness = createHarnessForMechanismTests(boundary, {
    createSourceBindingLedger: () => ledger
  });
  const runRef = harness.startRun();
  const records = [communicationFixtureRecord({
    fixtureRecordId: "H-INIT-MISSING",
    data: {
      content: "I always freeze on particles.",
      context: "old_practice_history",
      semanticStatusOrigin: "fixture_initialized"
    }
  })];
  assert.throws(
    () => harness.deliverFixtureRecords(runRef, records),
    /Successful ingress transition identity is malformed/
  );
  assert.deepEqual(ledger.readOnlyEvidence(), []);
  corruptInspection = false;
  assert.equal(harness.deliverFixtureRecords(runRef, records).acceptedInputRefs.length, 1);
  assert.equal(ledger.readOnlyEvidence().length, 1);
});

test("source-binding ledger rejects incomplete, duplicated, or reordered initialized batches", () => {
  const records = [
    communicationFixtureRecord({
      fixtureRecordId: "H-INIT-A",
      occurrenceOrder: 1,
      data: {
        content: "I freeze on particles.",
        context: "old_practice_history",
        semanticStatusOrigin: "fixture_initialized"
      }
    }),
    communicationFixtureRecord({
      fixtureRecordId: "H-INIT-B",
      occurrenceOrder: 2,
      data: {
        content: "I also rush the endings.",
        context: "old_practice_history",
        semanticStatusOrigin: "fixture_initialized"
      }
    })
  ];

  for (const corruption of ["omit_second", "duplicate_first", "swap_results"]) {
    const real = createSutBoundary();
    const ledger = createSourceBindingLedger();
    let transitionRef;
    const boundary = Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        const result = real.ingestSutVisibleInputs(...args);
        transitionRef = result.transitionRef;
        return result;
      },
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        const ingestion = snapshot.records.find((record) => record.reference === transitionRef);
        const [interactionRef, firstAssertionRef, secondAssertionRef]
          = ingestion.resultReferences;
        ingestion.resultReferences = corruption === "omit_second"
          ? [interactionRef, firstAssertionRef]
          : corruption === "duplicate_first"
            ? [interactionRef, firstAssertionRef, firstAssertionRef]
            : [interactionRef, secondAssertionRef, firstAssertionRef];
        return snapshot;
      }
    });
    const harness = createHarnessForMechanismTests(boundary, {
      createSourceBindingLedger: () => ledger
    });
    assert.throws(
      () => harness.deliverFixtureRecords(harness.startRun(), records),
      /Successful ingress transition identity is malformed/
    );
    assert.deepEqual(ledger.readOnlyEvidence(), []);
  }
});

test("source-binding ledger initializes two new communications and not an exact redelivery", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();
  const first = communicationFixtureRecord({
    fixtureRecordId: "H-INIT-REDLV",
    occurrenceOrder: 1,
    data: {
      content: "I freeze on particles.",
      context: "old_practice_history",
      semanticStatusOrigin: "fixture_initialized"
    }
  });
  const second = communicationFixtureRecord({
    fixtureRecordId: "H-INIT-NEW",
    occurrenceOrder: 2,
    data: {
      content: "I also rush the endings.",
      context: "old_practice_history",
      semanticStatusOrigin: "fixture_initialized"
    }
  });

  const firstIngress = harness.deliverFixtureRecords(runRef, [first]);
  const mixedIngress = harness.deliverFixtureRecords(runRef, [first, second]);
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const transition = snapshot.records.find(
    (record) => record.reference === mixedIngress.transitionRef
  );
  const additionalResults = transition.resultReferences.slice(1);
  assert.equal(firstIngress.acceptedInputRefs.length, 1);
  assert.equal(mixedIngress.acceptedInputRefs.length, 2);
  assert.equal(additionalResults.length, 1);
  assert.equal(
    snapshot.records.find((record) => record.reference === additionalResults[0])
      .sourceCommunicationRef,
    mixedIngress.acceptedInputRefs[1]
  );
});

test("source-binding ledgers preserve replay identity, isolate runs, and clear on end-run", () => {
  const first = createSourceBindingLedger();
  const second = createSourceBindingLedger();
  const sameDelivery = createSourceBindingLedger();
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const input = {
    sourceFactRef: "source_00000000-0000-0000-0000-000000000001",
    kind: "affordance_fact",
    sourceActor: "fixture-driver",
    occurrenceOrder: 5,
    direction: "TRIAL-PROD-FOCUS",
    description: "Production-focused practice."
  };
  first.assertDeliveryCompatible([input]);
  const firstIngress = boundary.ingestSutVisibleInputs(runRef, { inputs: [input] });
  first.recordSuccessfulIngress(
    [input], firstIngress, boundary.captureInspectionSnapshot(runRef)
  );
  const original = first.readOnlyEvidence()[0];
  first.assertDeliveryCompatible([structuredClone(input)]);
  const redelivery = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [structuredClone(input)]
  });
  first.recordSuccessfulIngress(
    [structuredClone(input)], redelivery, boundary.captureInspectionSnapshot(runRef)
  );
  assert.equal(first.readOnlyEvidence().length, 1);
  assert.notEqual(redelivery.transitionRef, original.firstIngestionTransitionRef);
  assert.equal(first.readOnlyEvidence()[0].firstInteractionRef, original.firstInteractionRef);
  assert.equal(
    first.readOnlyEvidence()[0].firstIngestionTransitionRef,
    original.firstIngestionTransitionRef
  );
  assert.equal(Object.isFrozen(first.readOnlyEvidence()[0].projectedMeaning), true);
  const independentRunRef = boundary.startRun();
  const independentIngress = boundary.ingestSutVisibleInputs(independentRunRef, {
    inputs: [structuredClone(input)]
  });
  second.recordSuccessfulIngress(
    [structuredClone(input)], independentIngress,
    boundary.captureInspectionSnapshot(independentRunRef)
  );
  assert.notEqual(second.readOnlyEvidence()[0].firstInteractionRef, original.firstInteractionRef);
  assert.notEqual(
    second.readOnlyEvidence()[0].firstIngestionTransitionRef,
    original.firstIngestionTransitionRef
  );
  assert.throws(
    () => first.assertDeliveryCompatible([{ ...input, description: "Replacement." }]),
    /cannot be rebound/
  );
  assert.throws(
    () => sameDelivery.assertDeliveryCompatible([
      input, { ...input, description: "Same-delivery replacement." }
    ]),
    /cannot rebind/
  );
  assert.equal(first.readOnlyEvidence()[0].projectedMeaning.description, input.description);
  first.clear();
  assert.deepEqual(first.readOnlyEvidence(), []);

  let lifecycleLedger;
  const harness = createHarnessForMechanismTests(createSutBoundary(), {
    createSourceBindingLedger() {
      lifecycleLedger = createSourceBindingLedger();
      return lifecycleLedger;
    }
  });
  const lifecycleRunRef = harness.startRun();
  harness.deliverFixtureRecords(lifecycleRunRef, [communicationFixtureRecord()]);
  assert.equal(typeof lifecycleLedger.readOnlyEvidence()[0].firstInteractionRef, "string");
  assert.equal(
    typeof lifecycleLedger.readOnlyEvidence()[0].firstIngestionTransitionRef, "string"
  );
  harness.endRun(lifecycleRunRef);
  assert.deepEqual(lifecycleLedger.readOnlyEvidence(), []);
});

test("focused-drill mismatch remains separate and blocks outcome delivery", () => {
  const harness = createHarnessForMechanismTests(createSutBoundary(), {
    renderOutput(output, order) {
      const record = realizeAvailableOutput(output, order);
      if (output.kind !== "focused_drill_behavior_request") return record;
      return Object.freeze({
        ...record,
        realizedBehavior: "delayed_correction",
        fidelity: "mismatch",
        mismatchOrigin: "simulated_dependency"
      });
    }
  });
  const runRef = harness.startRun();
  activateProductionTrial(harness, runRef);
  harness.deliverFocusedDrillInputsIfEligible(runRef, focusedDrillOpeningRecords());
  harness.processCurrentInteraction(runRef);
  const disposition = harness.captureInspectionSnapshot(runRef).records.find(
    (record) => record.family === "focused_drill_behavior_disposition"
  );
  const realized = harness.realizeAvailableOutputs(runRef)[0];
  assert.equal(realized.requestedRef, disposition.reference);
  assert.equal(realized.requestedBehavior, "immediate_correction");
  assert.equal(realized.realizedBehavior, "delayed_correction");
  assert.equal(realized.fidelity, "mismatch");
  harness.processCurrentInteraction(runRef);
  assert.deepEqual(
    harness.deliverFocusedDrillOutcomeIfEligible(runRef, focusedDrillOutcomeRecords()),
    []
  );
  assert.equal(harness.captureInspectionSnapshot(runRef).records.some(
    (record) => record.family === "focused_drill_outcome"
  ), false);
});

test("focused-drill simulator and projector preserve closed behavior ownership", () => {
  const request = {
    kind: "focused_drill_behavior_request",
    outputRef: "transition_00000000-0000-0000-0000-000000000000",
    requestedRef: "state_00000000-0000-0000-0000-000000000000",
    requestedBehavior: "immediate_correction",
    drillScope: {
      activity: "japanese_practice", taskMode: "focused_production_drill",
      surfaceLabel: "text_simulated", consequence: "low"
    }
  };
  const record = realizeFocusedDrillOutput(request, 4);
  assert.equal(record.requestedBehavior, request.requestedBehavior);
  assert.equal(record.realizedBehavior, request.requestedBehavior);
  const projected = createSimulatorProjector().project(record);
  assert.deepEqual(Object.keys(projected).sort(), [
    "fidelity", "kind", "mismatchOrigin", "occurrenceOrder", "realizedBehavior",
    "requestedBehavior", "requestedRef", "sourceActor", "sourceFactRef"
  ].sort());
  assert.equal(projected.kind, "simulator_behavior_realization");
  assert.doesNotMatch(JSON.stringify(projected), /requestedOutputRef|fixture|checkpoint|oracle/i);
  assert.throws(
    () => realizeFocusedDrillOutput({ ...request, requestedBehavior: "delayed_correction" }),
    /Unsupported focused-drill/
  );
  assert.throws(
    () => realizeFocusedDrillOutput({ ...request, oracle: "immediate_correction" }),
    /contain exactly/
  );
  assert.throws(
    () => createSimulatorProjector().project({ ...record, mismatchOrigin: "simulator" }),
    /Invalid evaluation-side behavior/
  );
});

test("focused-drill realization checkpoint rejects actor, ingestion, relation, and order corruption", () => {
  const attacks = [
    (snapshot) => {
      const fact = snapshot.records.find(
        (record) => record.role === "simulator_behavior_realization"
      );
      snapshot.records.find((record) => record.reference === fact.sourceActorRef).sourceActor
        = "wrong-simulator";
    },
    (snapshot) => {
      const fact = snapshot.records.find(
        (record) => record.role === "simulator_behavior_realization"
      );
      fact.firstInteractionRef = snapshot.records.find(
        (record) => record.family === "focused_drill_instruction"
      ).interactionRef;
    },
    (snapshot) => {
      const fact = snapshot.records.find(
        (record) => record.role === "simulator_behavior_realization"
      );
      const interaction = snapshot.records.find(
        (record) => record.reference === fact.firstInteractionRef
      );
      snapshot.records.find(
        (record) => record.reference === interaction.createdByTransitionRef
      ).inputReferences = [];
    },
    (snapshot) => {
      const fact = snapshot.records.find(
        (record) => record.role === "simulator_behavior_realization"
      );
      const interaction = snapshot.records.find(
        (record) => record.reference === fact.firstInteractionRef
      );
      snapshot.records.find(
        (record) => record.reference === interaction.createdByTransitionRef
      ).unexpected = true;
    },
    (snapshot) => {
      snapshot.relations.find((relation) => (
        relation.relationKind === "realization"
        && relation.targetRole === "focused_drill_behavior_disposition"
      )).targetRole = "wrong";
    },
    (snapshot) => {
      const transition = snapshot.records.find(
        (record) => record.transitionKind === "record_focused_drill_realization"
      );
      snapshot.relations.find((relation) => (
        relation.fromRef === transition.reference && relation.relationKind === "basis"
      )).createdOrder -= 1;
    },
    (snapshot) => {
      const fact = snapshot.records.find(
        (record) => record.role === "simulator_behavior_realization"
      );
      snapshot.records.find(
        (record) => record.transitionKind === "record_focused_drill_realization"
      ).createdOrder = fact.createdOrder;
    }
  ];
  for (const attack of attacks) {
    const real = createSutBoundary();
    let corrupt = false;
    let ingressCalls = 0;
    const boundary = Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        ingressCalls += 1;
        return real.ingestSutVisibleInputs(...args);
      },
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        if (corrupt) attack(snapshot);
        return snapshot;
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    activateProductionTrial(harness, runRef);
    harness.deliverFocusedDrillInputsIfEligible(runRef, focusedDrillOpeningRecords());
    harness.processCurrentInteraction(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    const before = ingressCalls;
    corrupt = true;
    assert.throws(
      () => harness.deliverFocusedDrillOutcomeIfEligible(
        runRef, focusedDrillOutcomeRecords()
      )
    );
    assert.equal(ingressCalls, before);
  }
});

test("acceptance branch validates complete C/A/P/S/F/R/E closure before ingress", () => {
  const attacks = [
    (s, x) => { x.proposal.materialIntent = "corrupted"; },
    (s, x) => { x.proposal.proposedScope.dimension = "other"; },
    (s, x) => { s.relations.splice(s.relations.findIndex((r) => r.fromRef === x.proposal.reference && r.relationKind === "transition_ancestry"), 1); },
    (s, x) => { s.relations.push({ ...s.relations.find((r) => r.fromRef === x.proposal.reference && r.relationKind === "transition_ancestry"), toRef: x.affordance.reference }); },
    (s, x) => { x.proposalTransition.inputReferences[0] = x.affordance.reference; },
    (s, x) => { x.proposal.createdOrder = x.candidateTransition.createdOrder - 1; s.relations.find((r) => r.fromRef === x.proposal.reference && r.relationKind === "transition_ancestry").effectiveOrder = x.proposal.createdOrder; },
    (s, x) => { x.proposal.createdOrder = x.candidateTransition.createdOrder; },
    (s, x) => { x.proposal.createdOrder = x.candidate.createdOrder - 1; },
    (s, x) => { s.relations.splice(s.relations.findIndex((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate"), 1); },
    (s, x) => { s.relations.push(structuredClone(s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate"))); },
    (s, x) => { const other = structuredClone(x.candidate); other.reference = "state_11111111-1111-1111-1111-111111111111"; s.records.push(other); s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").toRef = other.reference; },
    (s, x) => { s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").targetRole = "wrong"; },
    (s, x) => { s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").assertedByRole = "fixture"; },
    (s, x) => { s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").createdOrder -= 1; },
    (s, x) => { s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").effectiveOrder -= 1; },
    (s, x) => { const basis = s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate"); s.relations.push({ ...structuredClone(basis), targetRole: "wrong" }); },
    (s, x) => { const basis = s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate"); const other = structuredClone(x.candidate); other.reference = "state_22222222-2222-2222-2222-222222222222"; s.records.push(other); s.relations.push({ ...structuredClone(basis), toRef: other.reference }); },
    (s, x) => { const other = structuredClone(x.candidate); other.reference = "state_33333333-3333-3333-3333-333333333333"; s.records.push(other); x.proposalTransition.inputReferences.push(other.reference); },
    (s, x) => { const basis = s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate"); x.proposalTransition.inputReferences.push("state_44444444-4444-4444-4444-444444444444"); s.relations.push(structuredClone(basis)); },
    (s, x) => { x.proposalTransition.inputReferences[0] = "state_55555555-5555-5555-5555-555555555555"; },
    (s, x) => { const unresolved = "state_66666666-6666-6666-6666-666666666666"; x.proposalTransition.inputReferences[0] = unresolved; s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").toRef = unresolved; },
    (s, x) => { const comparison = s.records.find((record) => record.family === "dimension_comparison"); x.proposalTransition.inputReferences[0] = comparison.reference; s.relations.find((r) => r.fromRef === x.proposalTransition.reference && r.targetRole === "proposal_candidate").toRef = comparison.reference; },
    (s, x) => { x.proposalTransition.resultReferences[0] = "state_77777777-7777-7777-7777-777777777777"; },
    (s, x) => { x.proposalTransition.resultReferences[0] = x.candidate.reference; },
    (s, x) => { x.candidateTransition.result = "malformed"; },
    (s, x) => { s.relations.splice(s.relations.findIndex((r) => r.fromRef === x.candidate.reference && r.targetRole === "selected_trial_direction"), 1); },
    (s, x) => { s.relations.find((r) => r.fromRef === x.candidate.reference && r.targetRole === "selected_trial_direction").createdOrder -= 1; },
    (s, x) => { s.relations.push({ ...s.relations.find((r) => r.fromRef === x.candidate.reference && r.targetRole === "selected_trial_direction"), toRef: x.candidate.reference }); },
    (s, x) => { x.selection.family = "other"; },
    (s, x) => { x.selection.resultReferences.push(x.proposal.reference); },
    (s, x) => { x.selection.interactionRef = x.realizationTransition.interactionRef; },
    (s, x) => { x.selection.createdOrder = x.fact.createdOrder; },
    (s, x) => { s.relations.splice(s.relations.findIndex((r) => r.fromRef === x.selection.reference && r.targetRole === "selected_proposal_intent"), 1); },
    (s, x) => { s.relations.find((r) => r.fromRef === x.selection.reference && r.targetRole === "selected_proposal_intent").assertedByRole = "fixture"; },
    (s, x) => { s.records.find((r) => r.reference === x.fact.firstInteractionRef).inputReferences = []; },
    (s, x) => { x.realizationTransition.interactionRef = x.proposal.interactionRef; }
  ];
  for (const attack of attacks) {
    const real = createSutBoundary();
    let ingressCalls = 0;
    let corrupt = false;
    const boundary = Object.freeze({ ...real,
      ingestSutVisibleInputs(...args) { ingressCalls += 1; return real.ingestSutVisibleInputs(...args); },
      captureInspectionSnapshot(runRef) {
        const snapshot = structuredClone(real.captureInspectionSnapshot(runRef));
        if (!corrupt) return snapshot;
        const proposal = snapshot.records.find((r) => r.family === "proposal_intent");
        const candidate = snapshot.records.find((r) => r.family === "trial_candidate");
        const affordance = snapshot.records.find((r) => r.role === "affordance_fact");
        const proposalTransition = snapshot.records.find((r) => r.reference === proposal.createdByTransitionRef);
        const candidateTransition = snapshot.records.find((r) => r.reference === candidate.createdByTransitionRef);
        const selection = snapshot.records.find((r) => r.transitionKind === "select_proposal_for_realization");
        const fact = snapshot.records.find((r) => r.role === "simulator_realization");
        const realizationTransition = snapshot.records.find((r) => r.transitionKind === "record_proposal_realization");
        attack(snapshot, { proposal, candidate, affordance, proposalTransition, candidateTransition,
          selection, fact, realizationTransition });
        return snapshot;
      }
    });
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    harness.deliverFixtureRecords(runRef, productionProposalRecords());
    harness.processCurrentInteraction(runRef);
    harness.realizeAvailableOutputs(runRef);
    harness.processCurrentInteraction(runRef);
    const beforeAcceptanceIngress = ingressCalls;
    corrupt = true;
    assert.throws(() => harness.deliverProposalAcceptanceIfEligible(runRef, proposalAcceptanceRecords()));
    assert.equal(ingressCalls, beforeAcceptanceIngress);
  }
});

test("acceptance package validation rejects missing, extra, caller realization, or changed content", () => {
  const harness = createEvaluationHarness(createSutBoundary());
  const runRef = harness.startRun();
  const records = proposalAcceptanceRecords();
  assert.throws(() => harness.deliverProposalAcceptanceIfEligible(runRef, records.slice(1)), /five-record/);
  assert.throws(() => harness.deliverProposalAcceptanceIfEligible(runRef, [
    ...records, { ...records[0], fixtureRecordId: "P-001R" }
  ]), /five-record/);
  const changed = structuredClone(records);
  changed[0].data.content = "Sure.";
  assert.throws(() => harness.deliverProposalAcceptanceIfEligible(runRef, changed), /package-local content/);
});

test("acceptance package rejects wrong actors and order before source allocation or SUT mutation", () => {
  for (const mutate of [
    (records) => { records[0].sourceActor = "fixture-driver"; },
    (records) => { records[0].sourceActor = "simulated-dependency"; },
    (records) => { records[1].sourceActor = "synthetic-user-a"; },
    (records) => { records[4].occurrenceOrder = 99; }
  ]) {
    const real = createSutBoundary();
    let ingressCalls = 0;
    const boundary = Object.freeze({ ...real, ingestSutVisibleInputs(...args) {
      ingressCalls += 1;
      return real.ingestSutVisibleInputs(...args);
    }});
    const harness = createEvaluationHarness(boundary);
    const runRef = harness.startRun();
    const before = harness.captureInspectionSnapshot(runRef);
    const records = proposalAcceptanceRecords();
    mutate(records);
    assert.throws(() => harness.deliverProposalAcceptanceIfEligible(runRef, records), /source actor|occurrence order/);
    assert.equal(ingressCalls, 0);
    assert.deepEqual(harness.captureInspectionSnapshot(runRef), before);
  }
});

test("harness fails closed before routing multiple outputs", () => {
  const real = createSutBoundary();
  let ingressCalls = 0;
  const fake = Object.freeze({
    ...real,
    emitAvailableOutputs() { return Object.freeze([{ outputRef: "a" }, { outputRef: "b" }]); },
    ingestSutVisibleInputs(...args) { ingressCalls += 1; return real.ingestSutVisibleInputs(...args); }
  });
  const harness = createEvaluationHarness(fake);
  const runRef = harness.startRun();
  assert.throws(() => harness.realizeAvailableOutputs(runRef), /at most one/);
  assert.equal(ingressCalls, 0);
});

test("routing failures do not commit transport success and remain retryable", () => {
  for (const failureStage of ["render", "project", "ingress"]) {
    const real = createSutBoundary();
    let attempts = 0;
    let fail = true;
    const boundary = failureStage === "ingress" ? Object.freeze({
      ...real,
      ingestSutVisibleInputs(...args) {
        if (fail && real.emitAvailableOutputs(args[0]).length === 1) {
          attempts += 1;
          throw new Error("injected ingress failure");
        }
        return real.ingestSutVisibleInputs(...args);
      }
    }) : real;
    const harness = createHarnessForMechanismTests(boundary, {
      renderOutput(output, order) {
        attempts += 1;
        if (failureStage === "render" && fail) throw new Error("injected render failure");
        return realizeProposalOutput(output, order);
      },
      createProjector() {
        const projector = createSimulatorProjector();
        return {
          project(record) {
            if (failureStage === "project" && fail) {
              attempts += 1;
              throw new Error("injected projection failure");
            }
            return projector.project(record);
          }
        };
      }
    });
    const runRef = harness.startRun();
    harness.deliverFixtureRecords(runRef, productionProposalRecords());
    harness.processCurrentInteraction(runRef);
    assert.throws(() => harness.realizeAvailableOutputs(runRef), /injected/);
    const failedAttempts = attempts;
    fail = false;
    assert.equal(harness.realizeAvailableOutputs(runRef).length, 1);
    assert.ok(attempts > failedAttempts);
  }
});

test("formal harness rejects dependency overrides and package root exposes no simulator plugin seam", async () => {
  const boundary = createSutBoundary();
  assert.throws(
    () => createEvaluationHarness(boundary, { renderOutput() {} }),
    /accepts only the SUT public boundary/
  );
  const packageRoot = await import("../index.js");
  assert.deepEqual(Object.keys(packageRoot), ["createEvaluationHarness"]);
});

test("simulator projector validates the complete closed full-record contract", () => {
  const request = {
    kind: "proposal_realization_request",
    outputRef: "transition_00000000-0000-0000-0000-000000000000",
    requestedRef: "state_00000000-0000-0000-0000-000000000000",
    candidateRef: "state_11111111-1111-1111-1111-111111111111",
    materialIntent: "offer_scoped_trial_for_user_decision",
    candidateMaterialIntent: "practice_spontaneous_production_for_target_dimension",
    proposedScope: { dimension: "particle_pattern_a", taskMode: "spontaneous_production" }
  };
  const valid = realizeProposalOutput(request);
  const projector = createSimulatorProjector();
  for (const key of Object.keys(valid)) {
    const malformed = structuredClone(valid);
    delete malformed[key];
    assert.throws(() => projector.project(malformed));
  }
  assert.throws(() => projector.project({ ...valid, oracle: "canonical" }), /contain exactly/);
  for (const field of ["requestedOutputRef", "requestedRef", "candidateRef"]) {
    assert.throws(() => projector.project({ ...valid, [field]: "malformed" }), new RegExp(field));
  }
  assert.throws(() => projector.project({
    ...valid, requestedScope: { dimension: "particle_pattern_a", taskMode: "recognition" }
  }), /Invalid evaluation-side/);
  assert.throws(() => projector.project({
    ...valid,
    realizedMaterialIntent: {
      ...valid.realizedMaterialIntent,
      proposedScope: { dimension: "different", taskMode: "spontaneous_production" }
    }
  }), /Invalid evaluation-side/);
  assert.equal(projector.project(valid).fidelity, "match");
});
