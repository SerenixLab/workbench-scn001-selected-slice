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
    oracleAnnotations: {
      expectedComparison: "recognition_score_higher"
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
  assert.throws(
    () => projectFixtureRecord(taskObservationFixtureRecord({
      data: {
        ...taskObservationFixtureRecord().data,
        performance: {
          kind: "aggregate",
          correctCount: 4,
          totalCount: 4,
          expectedComparison: "recognition_score_higher"
        }
      }
    })),
    /must contain exactly/
  );
});

test("task-observation projection preserves aggregate performance without projecting a comparison", () => {
  const projected = projectFixtureRecord(taskObservationFixtureRecord());

  assert.equal(projected.kind, "task_observation");
  assert.equal(projected.taskMode, "recognition");
  assert.deepEqual(projected.performance, { kind: "aggregate", correctCount: 4, totalCount: 4 });
  assert.doesNotMatch(JSON.stringify(projected), /expectedComparison|comparisonResult/);

  assert.throws(
    () => projectFixtureRecord(taskObservationFixtureRecord({
      data: {
        ...taskObservationFixtureRecord().data,
        comparisonResult: "recognition_score_higher"
      }
    })),
    /must contain exactly/
  );
});

test("candidate-formation projection forwards only raw affordance and opaque SUT state reference", () => {
  const reference = "state_00000000-0000-0000-0000-000000000000";
  const affordance = projectFixtureRecord({
    fixtureRecordId: "TD-001-PROD",
    role: "affordance_fact",
    sourceActor: "fixture-driver",
    occurrenceOrder: 3,
    data: {
      direction: "TRIAL-PROD-FOCUS",
      description: "Production-focused practice for the target particle pattern."
    },
    oracleAnnotations: {
      expectedCandidate: "production_focused_practice"
    }
  });
  const stateReference = projectFixtureRecord({
    fixtureRecordId: "REF-COMPARISON",
    role: "sut_state_reference",
    sourceActor: "fixture-driver",
    occurrenceOrder: 4,
    data: {
      stateRef: reference,
      purpose: "candidate_support"
    },
    oracleAnnotations: {
      expectedDisposition: "form_candidate"
    }
  });

  assert.deepEqual(affordance, {
    kind: "affordance_fact",
    sourceActor: "fixture-driver",
    occurrenceOrder: 3,
    direction: "TRIAL-PROD-FOCUS",
    description: "Production-focused practice for the target particle pattern."
  });
  assert.deepEqual(stateReference, {
    kind: "state_reference",
    sourceActor: "fixture-driver",
    occurrenceOrder: 4,
    stateRef: reference,
    purpose: "candidate_support"
  });
  assert.doesNotMatch(
    JSON.stringify([affordance, stateReference]),
    /expectedCandidate|expectedDisposition|form_candidate/
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
