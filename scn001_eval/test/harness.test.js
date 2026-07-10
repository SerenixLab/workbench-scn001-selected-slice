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

test("fixture projection removes evaluation-only annotations before public SUT ingestion", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();

  harness.deliverFixtureRecords(runRef, [communicationFixtureRecord()]);
  const snapshot = harness.captureInspectionSnapshot(runRef);
  const deliveredFact = snapshot.records.find((record) => record.family === "input_fact");

  assert.deepEqual(deliveredFact.payload, {
    kind: "communication",
    sourceActor: "synthetic-user-a",
    occurrenceOrder: 1,
    content: "Let me finish first.",
    context: "spontaneous_production",
    semanticStatusOrigin: "unclassified"
  });
  assert.doesNotMatch(JSON.stringify(deliveredFact), /expectedTransition|claimClass|fixtureRecordId/);
});

test("fixture projection rejects pre-promoted SUT semantic conclusions", () => {
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
});

test("fixture projection preserves explicitly initialized historical semantic origin", () => {
  const boundary = createSutBoundary();
  const harness = createEvaluationHarness(boundary);
  const runRef = harness.startRun();

  const delivered = harness.deliverFixtureRecords(runRef, [communicationFixtureRecord({
    fixtureRecordId: "H-003",
    data: {
      content: "I always freeze on particles.",
      context: "old_practice_history",
      semanticStatusOrigin: "fixture_initialized"
    }
  })]);
  const snapshot = harness.captureInspectionSnapshot(runRef);
  const assertion = snapshot.records.find((record) => record.family === "attributed_assertion");

  assert.equal(assertion.origin, "fixture");
  assert.equal(assertion.statusOrigin, "fixture_initialized");
  assert.equal(assertion.sourceCommunicationRef, delivered.acceptedInputRefs[0]);
});

test("simulator projection preserves realization role and rejects answer-bearing fields", () => {
  const validRecord = {
    fixtureRecordId: "D-003R",
    role: "simulator_realization_fact",
    sourceActor: "simulated-dependency",
    occurrenceOrder: 3,
    data: {
      requestedRef: "state_00000000-0000-0000-0000-000000000000",
      realizedBehavior: "Immediate correction surfaced.",
      fidelity: "match"
    },
    oracleAnnotations: {
      canonicalMatch: true
    }
  };

  assert.equal(projectFixtureRecord(validRecord).kind, "simulator_realization");
  assert.throws(
    () => projectFixtureRecord({
      ...validRecord,
      data: {
        ...validRecord.data,
        canonicalMatch: true
      }
    }),
    /must contain exactly/
  );
});

test("evaluation cannot import a private SUT module through the package boundary", async () => {
  await assert.rejects(
    import("@zoey/scn001-sut-core/src/runState.js"),
    (error) => error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
  );
});
