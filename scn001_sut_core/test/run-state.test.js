import assert from "node:assert/strict";
import test from "node:test";

import { createSutBoundary } from "../index.js";

function communicationInput(overrides = {}) {
  return {
    kind: "communication",
    sourceActor: "synthetic-user-a",
    occurrenceOrder: 1,
    content: "Please continue the practice session.",
    context: "japanese_practice",
    ...overrides
  };
}

function taskObservationInput(overrides = {}) {
  return {
    kind: "task_observation",
    sourceActor: "fixture-scorer",
    occurrenceOrder: 1,
    itemRef: "particle-item-1",
    taskMode: "spontaneous_production",
    dimension: "particle_pattern_a",
    correct: false,
    occurrenceScenarioDay: 0,
    sessionId: "session-current",
    sessionOrder: 2,
    ...overrides
  };
}

function chronologyInput(overrides = {}) {
  return {
    kind: "chronology_fact",
    sourceActor: "fixture-driver",
    occurrenceOrder: 2,
    scenarioDay: 0,
    sessionId: "session-current",
    sessionOrder: 2,
    ...overrides
  };
}

test("rejected payload has no semantic side effect", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const before = boundary.captureInspectionSnapshot(runRef);

  assert.throws(
    () => boundary.ingestSutVisibleInputs(runRef, {
      inputs: [communicationInput({ oracleRule: "INV-001" })]
    }),
    /must contain exactly/
  );

  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
});

test("closed ingress retains role-preserving fixture facts with contemporaneous source and basis relations", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const result = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [communicationInput()]
  });
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const fact = boundary.inspectRecord(runRef, result.acceptedInputRefs[0]);
  const relations = boundary.enumerateLocalRelations(runRef, result.acceptedInputRefs[0]);

  assert.equal(fact.family, "input_fact");
  assert.equal(fact.origin, "fixture");
  assert.equal(fact.role, "communication");
  assert.equal(snapshot.records.filter((record) => record.family === "sut_transition_evidence").length, 1);
  assert.equal(relations.filter((relation) => relation.relationKind === "source").length, 1);
  assert.equal(relations.filter((relation) => relation.relationKind === "basis").length, 1);
  assert.ok(fact.createdOrder < boundary.inspectRecord(runRef, result.transitionRef).createdOrder);
});

test("inspection is passive before a later processing transition", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const result = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [communicationInput()]
  });
  const before = boundary.captureInspectionSnapshot(runRef);

  boundary.inspectRecord(runRef, result.acceptedInputRefs[0]);
  boundary.enumerateLocalRelations(runRef, result.transitionRef);

  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
});

test("captured inspection cannot be re-ingested as behavior-driving input", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const capture = boundary.captureInspectionSnapshot(runRef);

  assert.throws(
    () => boundary.ingestSutVisibleInputs(runRef, { inputs: [capture] }),
    /must identify a supported SUT-visible input role/
  );
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), capture);
});

test("state-reference handles reject evaluation-bearing or unknown identifiers before semantic ingestion", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const before = boundary.captureInspectionSnapshot(runRef);

  assert.throws(
    () => boundary.ingestSutVisibleInputs(runRef, {
      inputs: [{
        kind: "state_reference",
        sourceActor: "fixture-driver",
        occurrenceOrder: 1,
        stateRef: "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN",
        purpose: "later use"
      }]
    }),
    /opaque SUT state reference/
  );

  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);

  assert.throws(
    () => boundary.ingestSutVisibleInputs(runRef, {
      inputs: [{
        kind: "state_reference",
        sourceActor: "fixture-driver",
        occurrenceOrder: 1,
        stateRef: "state_00000000-0000-0000-0000-000000000000",
        purpose: "later use"
      }]
    }),
    /does not resolve inside this run/
  );

  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
});

test("state-reference handles resolve only to state already owned by the same run", () => {
  const boundary = createSutBoundary();
  const firstRun = boundary.startRun();
  const firstResult = boundary.ingestSutVisibleInputs(firstRun, {
    inputs: [communicationInput()]
  });
  const secondRun = boundary.startRun();
  const secondBefore = boundary.captureInspectionSnapshot(secondRun);

  assert.throws(
    () => boundary.ingestSutVisibleInputs(secondRun, {
      inputs: [{
        kind: "state_reference",
        sourceActor: "fixture-driver",
        occurrenceOrder: 1,
        stateRef: firstResult.acceptedInputRefs[0],
        purpose: "later use"
      }]
    }),
    /does not resolve inside this run/
  );
  assert.deepEqual(boundary.captureInspectionSnapshot(secondRun), secondBefore);

  const accepted = boundary.ingestSutVisibleInputs(firstRun, {
    inputs: [{
      kind: "state_reference",
      sourceActor: "fixture-driver",
      occurrenceOrder: 2,
      stateRef: firstResult.acceptedInputRefs[0],
      purpose: "later use"
    }]
  });
  assert.equal(boundary.inspectRecord(firstRun, accepted.acceptedInputRefs[0]).role, "state_reference");
});

test("processing attributes current communications without creating current-skill facts", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const ingested = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      communicationInput({ content: "I have forgotten everything.", occurrenceOrder: 1 }),
      communicationInput({ content: "I passed a beginner milestone recently.", occurrenceOrder: 2 })
    ]
  });

  boundary.processCurrentInteraction(runRef);
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const assertions = snapshot.records.filter((record) => record.family === "attributed_assertion");

  assert.equal(assertions.length, 2);
  assert.ok(assertions.every((record) => record.epistemicStatus === "attributed_user_assertion"));
  assert.ok(assertions.every((record) => record.statusOrigin === "sut_transition"));
  assert.equal(snapshot.records.filter((record) => record.family === "current_skill_state").length, 0);
  for (const assertion of assertions) {
    const relations = boundary.enumerateLocalRelations(runRef, assertion.reference);
    assert.equal(relations.filter((relation) => relation.relationKind === "source").length, 1);
    assert.equal(relations.filter((relation) => relation.relationKind === "basis").length, 1);
  }
  assert.equal(ingested.acceptedInputRefs.length, 2);
});

test("processing preserves current practice as independently eligible for its supported skill dimension", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const ingested = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      taskObservationInput({ occurrenceScenarioDay: 0, sessionId: "session-old", sessionOrder: 1 }),
      chronologyInput()
    ]
  });

  boundary.processCurrentInteraction(runRef);
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const observation = boundary.inspectRecord(runRef, ingested.acceptedInputRefs[0]);

  assert.equal(snapshot.records.filter((record) => record.family === "temporal_eligibility_assessment").length, 0);
  assert.equal(observation.payload.occurrenceScenarioDay, 0);
});

test("processing applies the selected >90-day rule without blanket-staling recent history", () => {
  const oldBoundary = createSutBoundary();
  const oldRun = oldBoundary.startRun();
  const oldResult = oldBoundary.ingestSutVisibleInputs(oldRun, {
    inputs: [
      taskObservationInput({ occurrenceScenarioDay: 0, sessionId: "session-old", sessionOrder: 1 }),
      chronologyInput({ scenarioDay: 135 })
    ]
  });
  oldBoundary.processCurrentInteraction(oldRun);
  const oldAssessment = oldBoundary.captureInspectionSnapshot(oldRun).records.find((record) => (
    record.family === "temporal_eligibility_assessment"
  ));

  const recentBoundary = createSutBoundary();
  const recentRun = recentBoundary.startRun();
  const recentResult = recentBoundary.ingestSutVisibleInputs(recentRun, {
    inputs: [
      taskObservationInput({ occurrenceScenarioDay: 0, sessionId: "session-recent", sessionOrder: 1 }),
      chronologyInput({ scenarioDay: 30 })
    ]
  });
  recentBoundary.processCurrentInteraction(recentRun);
  const recentAssessment = recentBoundary.captureInspectionSnapshot(recentRun).records.find((record) => (
    record.family === "temporal_eligibility_assessment"
  ));

  assert.equal(oldAssessment.eligibility, "ineligible");
  assert.equal(oldAssessment.ageDays, 135);
  assert.equal(recentAssessment.eligibility, "eligible");
  assert.equal(recentAssessment.ageDays, 30);
  assert.equal(oldBoundary.inspectRecord(oldRun, oldResult.acceptedInputRefs[0]).payload.occurrenceScenarioDay, 0);
  assert.equal(recentBoundary.inspectRecord(recentRun, recentResult.acceptedInputRefs[0]).payload.occurrenceScenarioDay, 0);
  const oldRelations = oldBoundary.enumerateLocalRelations(oldRun, oldAssessment.reference);
  assert.ok(oldRelations.some((relation) => relation.targetRole === "assessed_evidence"));
  assert.ok(oldRelations.some((relation) => relation.targetRole === "current_chronology"));

  const beforeRepeatedProcessing = oldBoundary.captureInspectionSnapshot(oldRun);
  oldBoundary.processCurrentInteraction(oldRun);
  assert.deepEqual(oldBoundary.captureInspectionSnapshot(oldRun), beforeRepeatedProcessing);
});

test("inspection interleaving does not change attribution or temporal-assessment results", () => {
  const withoutInspection = createSutBoundary();
  const withoutRun = withoutInspection.startRun();
  withoutInspection.ingestSutVisibleInputs(withoutRun, {
    inputs: [communicationInput(), taskObservationInput({ occurrenceScenarioDay: 0 }), chronologyInput({ scenarioDay: 135 })]
  });
  withoutInspection.processCurrentInteraction(withoutRun);

  const withInspection = createSutBoundary();
  const withRun = withInspection.startRun();
  const ingested = withInspection.ingestSutVisibleInputs(withRun, {
    inputs: [communicationInput(), taskObservationInput({ occurrenceScenarioDay: 0 }), chronologyInput({ scenarioDay: 135 })]
  });
  withInspection.captureInspectionSnapshot(withRun);
  withInspection.inspectRecord(withRun, ingested.acceptedInputRefs[0]);
  withInspection.processCurrentInteraction(withRun);

  assert.deepEqual(
    semanticSummary(withoutInspection.captureInspectionSnapshot(withoutRun)),
    semanticSummary(withInspection.captureInspectionSnapshot(withRun))
  );
});

test("independent runs do not retain state or references after a run ends", () => {
  const boundary = createSutBoundary();
  const firstRun = boundary.startRun();
  const firstResult = boundary.ingestSutVisibleInputs(firstRun, {
    inputs: [communicationInput()]
  });

  boundary.endRun(firstRun);
  const secondRun = boundary.startRun();

  assert.throws(() => boundary.inspectRecord(secondRun, firstResult.acceptedInputRefs[0]), /Unknown or closed/);
  assert.deepEqual(boundary.captureInspectionSnapshot(secondRun).records, []);
  assert.throws(() => boundary.captureInspectionSnapshot(firstRun), /Unknown or closed/);
});

function semanticSummary(snapshot) {
  return snapshot.records
    .filter((record) => ["attributed_assertion", "temporal_eligibility_assessment"].includes(record.family))
    .map((record) => ({
      family: record.family,
      context: record.context,
      epistemicStatus: record.epistemicStatus,
      useTarget: record.useTarget,
      dimension: record.dimension,
      ageDays: record.ageDays,
      eligibility: record.eligibility
    }))
    .sort((left, right) => left.family.localeCompare(right.family));
}
