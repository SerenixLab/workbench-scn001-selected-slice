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

test("inspection is passive and does not change state, relations, or transition order", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const result = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [communicationInput()]
  });
  const before = boundary.captureInspectionSnapshot(runRef);

  boundary.inspectRecord(runRef, result.acceptedInputRefs[0]);
  boundary.enumerateLocalRelations(runRef, result.transitionRef);
  boundary.processCurrentInteraction(runRef);
  boundary.emitAvailableOutputs(runRef);

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

test("state-reference handles reject evaluation-bearing identifiers before semantic ingestion", () => {
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
