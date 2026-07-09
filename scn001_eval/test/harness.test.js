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
      context: "spontaneous_production"
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
    context: "spontaneous_production"
  });
  assert.doesNotMatch(JSON.stringify(deliveredFact), /expectedTransition|claimClass|fixtureRecordId/);
});

test("fixture projection rejects pre-promoted SUT semantic conclusions", () => {
  assert.throws(
    () => projectFixtureRecord(communicationFixtureRecord({
      data: {
        content: "Let me finish first.",
        context: "spontaneous_production",
        correctionControlState: "active"
      }
    })),
    /must contain exactly/
  );
});

test("evaluation cannot import a private SUT module through the package boundary", async () => {
  await assert.rejects(
    import("@zoey/scn001-sut-core/src/runState.js"),
    (error) => error.code === "ERR_PACKAGE_PATH_NOT_EXPORTED"
  );
});
