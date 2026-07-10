import assert from "node:assert/strict";
import test from "node:test";

import { createSutBoundary } from "@zoey/scn001-sut-core";

import { createEvaluationHarness } from "../index.js";
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
