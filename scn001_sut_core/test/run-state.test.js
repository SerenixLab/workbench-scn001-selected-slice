import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createSutBoundary } from "../index.js";
import { RunState, createReference } from "../src/runState.js";

function sourceRef() {
  return `source_${randomUUID()}`;
}

function communicationInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(),
    kind: "communication",
    sourceActor: "synthetic-user-a",
    occurrenceOrder: 1,
    content: "Please continue the practice session.",
    context: "japanese_practice",
    semanticStatusOrigin: "unclassified",
    ...overrides
  };
}

function taskObservationInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(),
    kind: "task_observation",
    sourceActor: "fixture-scorer",
    occurrenceOrder: 1,
    itemRef: "particle-item-1",
    taskMode: "spontaneous_production",
    dimension: "particle_pattern_a",
    performance: { kind: "binary", correct: false },
    occurrenceScenarioDay: 0,
    sessionId: "session-current",
    sessionOrder: 2,
    ...overrides
  };
}

function chronologyInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(),
    kind: "chronology_fact",
    sourceActor: "fixture-driver",
    occurrenceOrder: 2,
    scenarioDay: 0,
    sessionId: "session-current",
    sessionOrder: 2,
    ...overrides
  };
}

function affordanceInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(),
    kind: "affordance_fact",
    sourceActor: "fixture-driver",
    occurrenceOrder: 3,
    direction: "TRIAL-PROD-FOCUS",
    description: "Production-focused practice for the target particle pattern.",
    ...overrides
  };
}

function stateReferenceInput(stateRef, overrides = {}) {
  return {
    sourceFactRef: sourceRef(),
    kind: "state_reference",
    sourceActor: "fixture-driver",
    occurrenceOrder: 4,
    stateRef,
    ...overrides
  };
}

function calibrationInputs(recognitionCorrect = 4, productionCorrect = 1, overrides = {}) {
  const dimension = overrides.dimension ?? "particle_pattern_a";
  return [
    taskObservationInput({
      sourceFactRef: overrides.recognitionSourceFactRef ?? sourceRef(),
      itemRef: "recognition-calibration-items",
      taskMode: "recognition",
      dimension,
      performance: { kind: "aggregate", correctCount: recognitionCorrect, totalCount: 4 },
      occurrenceOrder: 1
    }),
    taskObservationInput({
      sourceFactRef: overrides.productionSourceFactRef ?? sourceRef(),
      itemRef: "production-calibration-items",
      taskMode: "spontaneous_production",
      dimension,
      performance: { kind: "aggregate", correctCount: productionCorrect, totalCount: 4 },
      occurrenceOrder: 2
    })
  ];
}

function ingest(boundary, runRef, inputs) {
  return boundary.ingestSutVisibleInputs(runRef, { inputs });
}

function recordsOf(boundary, runRef, family) {
  return boundary.captureInspectionSnapshot(runRef).records.filter((record) => record.family === family);
}

function prepareComparison(boundary, runRef, recognitionCorrect = 4, productionCorrect = 1) {
  const inputs = calibrationInputs(recognitionCorrect, productionCorrect);
  const ingestion = ingest(boundary, runRef, inputs);
  boundary.processCurrentInteraction(runRef);
  return {
    inputs,
    ingestion,
    comparison: recordsOf(boundary, runRef, "dimension_comparison")[0]
  };
}

function replayTrialBasis(boundary, runRef, observations, affordances = [affordanceInput()]) {
  const ingestion = ingest(boundary, runRef, [...observations, ...affordances]);
  boundary.processCurrentInteraction(runRef);
  return ingestion;
}

test("rejected payload and changed source-identity content have no semantic side effect", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const communication = communicationInput();
  ingest(boundary, runRef, [communication]);
  const before = boundary.captureInspectionSnapshot(runRef);

  assert.throws(
    () => ingest(boundary, runRef, [{ ...communication, content: "Changed meaning." }]),
    /cannot be rebound/
  );
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
  assert.throws(
    () => ingest(boundary, runRef, [communicationInput({ oracleRule: "INV-001" })]),
    /must contain exactly/
  );
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
});

test("source identity is separate from canonical SUT state identity and rejects literal evaluation IDs", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const input = communicationInput();
  const result = ingest(boundary, runRef, [input]);
  const fact = boundary.inspectRecord(runRef, result.acceptedInputRefs[0]);

  assert.equal(fact.sourceFactRef, input.sourceFactRef);
  assert.notEqual(fact.reference, input.sourceFactRef);
  assert.match(fact.reference, /^state_/);
  for (const evaluationIdentity of [
    "C-005",
    "CF1-C-005",
    "SCN001-SSFO-V0.2.0",
    "SCN001-SSFO-V0.2.0-CANONICAL-THIN",
    "B-TRIAL-FORM",
    "DP-TRIAL-FORM",
    "CC-EVIDENCE-TRIAL-FORMATION"
  ]) {
    assert.throws(
      () => ingest(boundary, runRef, [communicationInput({ sourceFactRef: evaluationIdentity })]),
      /opaque run-local source-fact reference/
    );
  }
});

test("redelivery reuses one input fact while preserving new interaction and ingestion evidence", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const input = communicationInput();
  const first = ingest(boundary, runRef, [input]);
  boundary.processCurrentInteraction(runRef);
  const second = ingest(boundary, runRef, [structuredClone(input)]);
  boundary.processCurrentInteraction(runRef);

  assert.equal(first.acceptedInputRefs[0], second.acceptedInputRefs[0]);
  assert.equal(recordsOf(boundary, runRef, "input_fact").length, 1);
  assert.equal(recordsOf(boundary, runRef, "interaction_segment").length, 2);
  const ingestions = recordsOf(boundary, runRef, "sut_transition_evidence")
    .filter((record) => record.transitionKind === "ingest_sut_visible_inputs");
  assert.equal(ingestions.length, 2);
  assert.ok(ingestions.every((transition) => transition.inputReferences[0] === first.acceptedInputRefs[0]));
  const processing = recordsOf(boundary, runRef, "sut_transition_evidence")
    .filter((record) => record.transitionKind === "process_interaction_segment");
  assert.equal(processing.length, 2);
  assert.ok(processing.every((transition) => transition.inputReferences.includes(first.acceptedInputRefs[0])));
  assert.equal(recordsOf(boundary, runRef, "attributed_assertion").length, 1);
});

test("inspection between first delivery and redelivery does not alter canonical resolution", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const input = communicationInput();
  const first = ingest(boundary, runRef, [input]);
  const before = boundary.captureInspectionSnapshot(runRef);
  boundary.inspectRecord(runRef, first.acceptedInputRefs[0]);
  boundary.enumerateLocalRelations(runRef, first.acceptedInputRefs[0]);
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
  const second = ingest(boundary, runRef, [input]);
  assert.equal(second.acceptedInputRefs[0], first.acceptedInputRefs[0]);
});

test("different source identities with identical payload remain distinct facts and assertions", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const first = communicationInput();
  const second = { ...first, sourceFactRef: sourceRef() };
  const result = ingest(boundary, runRef, [first, second]);
  boundary.processCurrentInteraction(runRef);

  assert.notEqual(result.acceptedInputRefs[0], result.acceptedInputRefs[1]);
  assert.equal(recordsOf(boundary, runRef, "input_fact").length, 2);
  assert.equal(recordsOf(boundary, runRef, "attributed_assertion").length, 2);
});

test("fixture-initialized attribution is reused on redelivery but distinct sources remain distinct", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const historical = communicationInput({ semanticStatusOrigin: "fixture_initialized" });
  ingest(boundary, runRef, [historical]);
  ingest(boundary, runRef, [historical]);
  assert.equal(recordsOf(boundary, runRef, "attributed_assertion").length, 1);
  ingest(boundary, runRef, [{ ...historical, sourceFactRef: sourceRef() }]);
  assert.equal(recordsOf(boundary, runRef, "attributed_assertion").length, 2);
});

test("temporal assessment uses redelivered raw observation and chronology without a state selector", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const observation = taskObservationInput({ occurrenceScenarioDay: 0, sessionId: "session-old", sessionOrder: 1 });
  const first = ingest(boundary, runRef, [observation]);
  boundary.processCurrentInteraction(runRef);
  const chronology = chronologyInput({ scenarioDay: 135, sessionOrder: 3 });
  ingest(boundary, runRef, [observation, chronology]);
  boundary.processCurrentInteraction(runRef);
  const assessment = recordsOf(boundary, runRef, "temporal_eligibility_assessment")[0];

  assert.equal(assessment.assessedObservationRef, first.acceptedInputRefs[0]);
  assert.equal(assessment.eligibility, "ineligible");
  assert.equal(assessment.ageDays, 135);
  assert.equal(assessment.useTarget, "independent_current_skill_authority");
  assert.equal(boundary.inspectRecord(runRef, first.acceptedInputRefs[0]).payload.occurrenceScenarioDay, 0);
  assert.equal(recordsOf(boundary, runRef, "input_fact").some((fact) => fact.role === "state_reference"), false);
});

test("same temporal basis reuses its assessment while a new chronology creates a new one", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const observation = taskObservationInput({ occurrenceScenarioDay: 0, sessionOrder: 1 });
  const chronology = chronologyInput({ scenarioDay: 30, sessionOrder: 2 });
  ingest(boundary, runRef, [observation, chronology]);
  boundary.processCurrentInteraction(runRef);
  ingest(boundary, runRef, [observation, chronology]);
  boundary.processCurrentInteraction(runRef);
  assert.equal(recordsOf(boundary, runRef, "temporal_eligibility_assessment").length, 1);

  const laterChronology = chronologyInput({ scenarioDay: 135, occurrenceOrder: 3, sessionOrder: 3 });
  ingest(boundary, runRef, [observation, laterChronology]);
  boundary.processCurrentInteraction(runRef);
  const assessments = recordsOf(boundary, runRef, "temporal_eligibility_assessment");
  assert.equal(assessments.length, 2);
  assert.deepEqual(assessments.map((record) => record.eligibility).sort(), ["eligible", "ineligible"]);
});

test("recent evidence remains eligible and old evidence remains ineligible under the selected rule", () => {
  for (const [scenarioDay, expected] of [[30, "eligible"], [91, "ineligible"]]) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    ingest(boundary, runRef, [
      taskObservationInput({ occurrenceScenarioDay: 0, sessionOrder: 1 }),
      chronologyInput({ scenarioDay })
    ]);
    boundary.processCurrentInteraction(runRef);
    assert.equal(recordsOf(boundary, runRef, "temporal_eligibility_assessment")[0].eligibility, expected);
  }
});

test("exact calibration redelivery reuses canonical facts and one role-qualified comparison", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  const replay = ingest(boundary, runRef, prepared.inputs);
  boundary.processCurrentInteraction(runRef);

  assert.deepEqual(replay.acceptedInputRefs, prepared.ingestion.acceptedInputRefs);
  assert.equal(recordsOf(boundary, runRef, "dimension_comparison").length, 1);
});

test("equal-score observations with different source identities form a distinct comparison basis", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  prepareComparison(boundary, runRef, 4, 1);
  ingest(boundary, runRef, calibrationInputs(4, 1));
  boundary.processCurrentInteraction(runRef);
  assert.equal(recordsOf(boundary, runRef, "dimension_comparison").length, 2);
});

test("observations from different dimensions do not form a comparison or candidate", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const inputs = calibrationInputs();
  inputs[1] = { ...inputs[1], dimension: "particle_pattern_b" };
  ingest(boundary, runRef, [...inputs, affordanceInput()]);
  boundary.processCurrentInteraction(runRef);
  assert.equal(recordsOf(boundary, runRef, "dimension_comparison").length, 0);
  assert.equal(recordsOf(boundary, runRef, "trial_candidate").length, 0);
  assert.equal(recordsOf(boundary, runRef, "non_activation_disposition")[0].reason, "exact_comparison_support_unavailable");
});

test("candidate forms from current raw observations through exact local comparison relations", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  const affordance = affordanceInput();
  replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
  const candidate = recordsOf(boundary, runRef, "trial_candidate")[0];
  const relations = boundary.enumerateLocalRelations(runRef, candidate.reference);

  assert.equal(candidate.supportComparisonRef, prepared.comparison.reference);
  assert.equal(candidate.lifecycleStatus, "formed_non_active");
  assert.ok(relations.some((relation) => relation.relationKind === "basis" && relation.targetRole === "selected_trial_direction"));
  assert.ok(relations.some((relation) => relation.relationKind === "basis" && relation.targetRole === "comparison_input"));
  assert.ok(relations.some((relation) => relation.relationKind === "support" && relation.targetRole === "dimension_comparison"));
  assert.equal(relations.some((relation) => relation.targetRole === "state_reference_carrier"), false);
  assert.deepEqual(boundary.emitAvailableOutputs(runRef), []);
});

test("equal calibration records one exact-basis non-activation disposition across replay", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef, 3, 3);
  const affordance = affordanceInput();
  replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
  replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
  assert.equal(recordsOf(boundary, runRef, "trial_candidate").length, 0);
  const dispositions = recordsOf(boundary, runRef, "non_activation_disposition");
  assert.equal(dispositions.length, 1);
  assert.equal(dispositions[0].reason, "no_observed_recognition_production_difference");
});

test("missing production affordance withholds and exact trial replay does not duplicate a candidate", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  const wrongAffordance = affordanceInput({ direction: "TRIAL-RECOG-REVIEW" });
  replayTrialBasis(boundary, runRef, prepared.inputs, [wrongAffordance]);
  assert.equal(recordsOf(boundary, runRef, "non_activation_disposition")[0].reason, "required_trial_direction_unavailable");

  const productionAffordance = affordanceInput();
  replayTrialBasis(boundary, runRef, prepared.inputs, [productionAffordance]);
  replayTrialBasis(boundary, runRef, prepared.inputs, [productionAffordance]);
  assert.equal(recordsOf(boundary, runRef, "trial_candidate").length, 1);
});

test("a retained comparison state reference cannot rescue missing or subset raw support", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  ingest(boundary, runRef, [
    prepared.inputs[0],
    stateReferenceInput(prepared.comparison.reference),
    affordanceInput()
  ]);
  boundary.processCurrentInteraction(runRef);
  assert.equal(recordsOf(boundary, runRef, "trial_candidate").length, 0);
  assert.equal(recordsOf(boundary, runRef, "non_activation_disposition")[0].reason, "exact_comparison_support_unavailable");
});

test("a comparison sharing only one observation is not accepted for a mixed exact basis", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  const differentProduction = { ...prepared.inputs[1], sourceFactRef: sourceRef() };
  ingest(boundary, runRef, [prepared.inputs[0], differentProduction, affordanceInput()]);
  boundary.processCurrentInteraction(runRef);
  const candidates = recordsOf(boundary, runRef, "trial_candidate");
  assert.equal(candidates.length, 1);
  assert.notEqual(candidates[0].supportComparisonRef, prepared.comparison.reference);
  const newComparison = recordsOf(boundary, runRef, "dimension_comparison")
    .find((comparison) => comparison.reference !== prepared.comparison.reference);
  assert.equal(candidates[0].supportComparisonRef, newComparison.reference);
});

test("multiple materially distinct exact comparison anchors fail closed", () => {
  const run = new RunState();
  const observations = calibrationInputs();
  run.assertSourceFactConsistency(observations);
  run.ingest(observations);
  run.processCurrentInteraction();
  const comparison = [...run.records.values()].find((record) => record.family === "dimension_comparison");
  const duplicate = { ...structuredClone(comparison), reference: createReference("state") };
  run.records.set(duplicate.reference, duplicate);
  for (const relation of run.relations.filter((item) => item.fromRef === comparison.reference)) {
    run.relations.push({ ...structuredClone(relation), fromRef: duplicate.reference });
  }
  const trialInputs = [...observations, affordanceInput()];
  run.assertSourceFactConsistency(trialInputs);
  run.ingest(trialInputs);
  assert.throws(() => run.processCurrentInteraction(), /Multiple materially distinct exact dimension comparisons/);
});

test("an inert opaque state reference does not change temporal or candidate behavior", () => {
  function execute(includeReference) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    const prepared = prepareComparison(boundary, runRef);
    const inputs = [...prepared.inputs, affordanceInput()];
    if (includeReference) {
      inputs.push(stateReferenceInput(prepared.comparison.reference));
    }
    ingest(boundary, runRef, inputs);
    boundary.processCurrentInteraction(runRef);
    return recordsOf(boundary, runRef, "trial_candidate").map((candidate) => ({
      candidateType: candidate.candidateType,
      proposedScope: candidate.proposedScope,
      lifecycleStatus: candidate.lifecycleStatus
    }));
  }
  assert.deepEqual(execute(false), execute(true));
});

test("state-reference shape has no semantic purpose and remains same-run opaque", () => {
  const boundary = createSutBoundary();
  const firstRun = boundary.startRun();
  const fact = ingest(boundary, firstRun, [communicationInput()]);
  assert.throws(
    () => ingest(boundary, firstRun, [stateReferenceInput(fact.acceptedInputRefs[0], { purpose: "candidate_support" })]),
    /must contain exactly/
  );
  const secondRun = boundary.startRun();
  assert.throws(
    () => ingest(boundary, secondRun, [stateReferenceInput(fact.acceptedInputRefs[0])]),
    /does not resolve inside this run/
  );
});

test("inspection interleaving does not change exact-basis reuse or candidate formation", () => {
  function execute(withInspection) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    const prepared = prepareComparison(boundary, runRef);
    if (withInspection) {
      boundary.captureInspectionSnapshot(runRef);
      boundary.inspectRecord(runRef, prepared.comparison.reference);
      boundary.enumerateLocalRelations(runRef, prepared.comparison.reference);
    }
    const affordance = affordanceInput();
    replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
    replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
    return {
      comparisons: recordsOf(boundary, runRef, "dimension_comparison").length,
      candidates: recordsOf(boundary, runRef, "trial_candidate").length,
      dispositions: recordsOf(boundary, runRef, "non_activation_disposition").length
    };
  }
  assert.deepEqual(execute(false), execute(true));
});

test("independent runs cannot resolve prior source identity or retained state", () => {
  const boundary = createSutBoundary();
  const firstRun = boundary.startRun();
  const input = communicationInput();
  const first = ingest(boundary, firstRun, [input]);
  boundary.endRun(firstRun);
  const secondRun = boundary.startRun();
  const second = ingest(boundary, secondRun, [input]);
  assert.notEqual(second.acceptedInputRefs[0], first.acceptedInputRefs[0]);
  assert.throws(() => boundary.inspectRecord(secondRun, first.acceptedInputRefs[0]), /Unknown or closed/);
  assert.throws(() => boundary.captureInspectionSnapshot(firstRun), /Unknown or closed/);
});
