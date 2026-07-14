import assert from "node:assert/strict";
import test from "node:test";

import { createSutBoundary } from "@zoey/scn001-sut-core";

import { createEvaluationHarness } from "../index.js";
import { createHarnessForMechanismTests } from "../src/harness.js";
import {
  realizeAvailableOutput,
  realizeFocusedDrillOutput,
  realizeProposalOutput
} from "../src/simulator.js";
import { createSimulatorProjector } from "../src/simulatorProjection.js";
import { projectFixtureRecord } from "../src/fixtureProjection.js";

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

function activateProductionTrial(harness, runRef) {
  harness.deliverFixtureRecords(runRef, productionProposalRecords());
  harness.processCurrentInteraction(runRef);
  harness.realizeAvailableOutputs(runRef);
  harness.processCurrentInteraction(runRef);
  harness.deliverProposalAcceptanceIfEligible(runRef, proposalAcceptanceRecords());
  harness.processCurrentInteraction(runRef);
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
