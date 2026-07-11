import assert from "node:assert/strict";
import test from "node:test";

import { createSutBoundary } from "@zoey/scn001-sut-core";

import { createEvaluationHarness } from "../index.js";
import { createHarnessForMechanismTests } from "../src/harness.js";
import { realizeProposalOutput } from "../src/simulator.js";
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
      fixtureRecordId: "A-001", role: "affordance_fact", sourceActor: "fixture-driver",
      occurrenceOrder: 3,
      data: { direction: "TRIAL-PROD-FOCUS", description: "Production-focused practice." },
      oracleAnnotations: { expectedTransition: "proposal" }
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
  assert.equal(snapshot.relations.filter((relation) => (
    relation.fromRef === assessment.reference && relation.relationKind === "binding"
  )).length, 3);
  const response = snapshot.records.find((record) => record.reference === assessment.userResponseRefs[0]);
  assert.deepEqual(Object.keys(response.payload).sort(), [
    "content", "context", "kind", "occurrenceOrder", "sourceActor", "sourceFactRef"
  ].sort());
  assert.equal(["proposalRef", "candidateRef", "realizationRef", "bindingStatus",
    "branchPolicy", "activationIntent"].some((key) => key in response.payload), false);
  assert.equal(snapshot.records.some((record) => [
    "activation_assessment", "activation_check_result", "active_trial"
  ].includes(record.family)), false);
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
    (records) => { records[0].sourceActor = "simulated_dependency"; },
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
