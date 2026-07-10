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
    semanticStatusOrigin: "unclassified",
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
    performance: {
      kind: "binary",
      correct: false
    },
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
  const interaction = snapshot.records.find((record) => record.family === "interaction_segment");
  const relations = boundary.enumerateLocalRelations(runRef, result.acceptedInputRefs[0]);

  assert.equal(fact.family, "input_fact");
  assert.equal(fact.origin, "fixture");
  assert.equal(fact.role, "communication");
  assert.equal(snapshot.records.filter((record) => record.family === "sut_transition_evidence").length, 1);
  assert.equal(relations.filter((relation) => relation.relationKind === "source").length, 1);
  assert.equal(relations.filter((relation) => relation.relationKind === "basis").length, 1);
  assert.ok(fact.createdOrder < boundary.inspectRecord(runRef, result.transitionRef).createdOrder);
  assert.deepEqual(interaction.inputReferences, result.acceptedInputRefs);
  assert.equal(interaction.createdByTransitionRef, result.transitionRef);
});

test("fixture-initialized historical assertions retain fixture origin without SUT re-attribution", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const result = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [communicationInput({
      content: "I always freeze on particles.",
      semanticStatusOrigin: "fixture_initialized"
    })]
  });

  const beforeProcessing = boundary.captureInspectionSnapshot(runRef);
  const initializedAssertion = beforeProcessing.records.find((record) => record.family === "attributed_assertion");

  assert.equal(initializedAssertion.origin, "fixture");
  assert.equal(initializedAssertion.statusOrigin, "fixture_initialized");
  assert.equal(initializedAssertion.createdByTransitionRef, result.transitionRef);
  assert.ok(boundary.inspectRecord(runRef, result.transitionRef).resultReferences.includes(initializedAssertion.reference));

  boundary.processCurrentInteraction(runRef);
  const assertions = boundary.captureInspectionSnapshot(runRef).records.filter((record) => (
    record.family === "attributed_assertion"
  ));
  assert.equal(assertions.length, 1);
  assert.equal(assertions[0].statusOrigin, "fixture_initialized");
});

test("simulator realization inputs retain simulator record and source origin", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const requested = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [communicationInput()]
  });
  const realization = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [{
      kind: "simulator_realization",
      sourceActor: "simulated-dependency",
      occurrenceOrder: 2,
      requestedRef: requested.acceptedInputRefs[0],
      realizedBehavior: "Please continue.",
      fidelity: "match"
    }]
  });

  const realizationFact = boundary.inspectRecord(runRef, realization.acceptedInputRefs[0]);
  const source = boundary.inspectRecord(runRef, realizationFact.sourceActorRef);

  assert.equal(realizationFact.origin, "simulator");
  assert.equal(source.origin, "simulator");
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
        purpose: "independent_current_skill_authority"
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
        purpose: "independent_current_skill_authority"
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
        purpose: "independent_current_skill_authority"
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
      purpose: "independent_current_skill_authority"
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
    const transition = boundary.inspectRecord(runRef, assertion.createdByTransitionRef);
    assert.equal(transition.transitionKind, "attribute_current_communications");
    assert.ok(transition.resultReferences.includes(assertion.reference));
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

test("processing derives a scoped recognition-production comparison from separate aggregate observations", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const ingested = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      taskObservationInput({
        itemRef: "recognition-calibration-items",
        taskMode: "recognition",
        performance: { kind: "aggregate", correctCount: 4, totalCount: 4 },
        occurrenceOrder: 1
      }),
      taskObservationInput({
        itemRef: "production-calibration-items",
        taskMode: "spontaneous_production",
        performance: { kind: "aggregate", correctCount: 1, totalCount: 4 },
        occurrenceOrder: 2
      })
    ]
  });

  boundary.processCurrentInteraction(runRef);
  const snapshot = boundary.captureInspectionSnapshot(runRef);
  const comparison = snapshot.records.find((record) => record.family === "dimension_comparison");
  const recognition = boundary.inspectRecord(runRef, ingested.acceptedInputRefs[0]);
  const production = boundary.inspectRecord(runRef, ingested.acceptedInputRefs[1]);

  assert.equal(recognition.role, "task_observation");
  assert.equal(recognition.payload.taskMode, "recognition");
  assert.equal(production.role, "task_observation");
  assert.equal(production.payload.taskMode, "spontaneous_production");
  assert.equal(comparison.targetDimension, "particle_pattern_a");
  assert.deepEqual(comparison.recognitionPerformance, { correctCount: 4, totalCount: 4 });
  assert.deepEqual(comparison.productionPerformance, { correctCount: 1, totalCount: 4 });
  assert.equal(comparison.comparisonResult, "recognition_score_higher");
  assert.equal(comparison.uncertainty, "bounded_to_supplied_calibration");
  assert.equal(comparison.recognitionObservationRefs[0], recognition.reference);
  assert.equal(comparison.productionObservationRefs[0], production.reference);
  assert.equal(snapshot.records.some((record) => (
    ["current_skill_state", "global_skill_state", "trial_candidate", "active_trial"].includes(record.family)
  )), false);

  const relations = boundary.enumerateLocalRelations(runRef, comparison.reference);
  assert.ok(relations.some((relation) => (
    relation.targetRole === "recognition_observation"
    && relation.semanticTaskMode === "recognition"
  )));
  assert.ok(relations.some((relation) => (
    relation.targetRole === "production_observation"
    && relation.semanticTaskMode === "spontaneous_production"
  )));
  assert.ok(relations.every((relation) => relation.semanticDimension === "particle_pattern_a"));
  const transition = boundary.inspectRecord(runRef, comparison.createdByTransitionRef);
  assert.equal(transition.transitionKind, "compare_recognition_and_spontaneous_production");
  assert.ok(transition.resultReferences.includes(comparison.reference));
});

test("equal calibration remains a no-difference comparison and does not create production-focused state", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      taskObservationInput({
        itemRef: "recognition-calibration-items",
        taskMode: "recognition",
        performance: { kind: "aggregate", correctCount: 3, totalCount: 4 },
        occurrenceOrder: 1
      }),
      taskObservationInput({
        itemRef: "production-calibration-items",
        taskMode: "spontaneous_production",
        performance: { kind: "aggregate", correctCount: 3, totalCount: 4 },
        occurrenceOrder: 2
      })
    ]
  });

  boundary.processCurrentInteraction(runRef);
  const records = boundary.captureInspectionSnapshot(runRef).records;
  const comparison = records.find((record) => record.family === "dimension_comparison");

  assert.equal(comparison.comparisonResult, "no_observed_score_difference");
  assert.equal(records.some((record) => (
    ["trial_candidate", "production_focused_candidate", "active_trial"].includes(record.family)
  )), false);
});

test("processing does not compare recognition and production observations across dimensions", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      taskObservationInput({
        taskMode: "recognition",
        dimension: "particle_pattern_a",
        performance: { kind: "aggregate", correctCount: 4, totalCount: 4 },
        occurrenceOrder: 1
      }),
      taskObservationInput({
        taskMode: "spontaneous_production",
        dimension: "particle_pattern_b",
        performance: { kind: "aggregate", correctCount: 1, totalCount: 4 },
        occurrenceOrder: 2
      })
    ]
  });

  boundary.processCurrentInteraction(runRef);
  assert.equal(boundary.captureInspectionSnapshot(runRef).records.some((record) => (
    record.family === "dimension_comparison"
  )), false);
});

test("invalid aggregate performance is rejected without semantic side effects", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const before = boundary.captureInspectionSnapshot(runRef);

  assert.throws(
    () => boundary.ingestSutVisibleInputs(runRef, {
      inputs: [taskObservationInput({
        performance: { kind: "aggregate", correctCount: 5, totalCount: 4 }
      })]
    }),
    /must not exceed totalCount/
  );
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
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

test("processing consumes interactions in order and reassesses referenced evidence at the current chronology", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const firstInteraction = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      taskObservationInput({ occurrenceScenarioDay: 0, sessionId: "session-old", sessionOrder: 1 }),
      chronologyInput({ scenarioDay: 30 })
    ]
  });
  const secondInteraction = boundary.ingestSutVisibleInputs(runRef, {
    inputs: [
      {
        kind: "state_reference",
        sourceActor: "fixture-driver",
        occurrenceOrder: 3,
        stateRef: firstInteraction.acceptedInputRefs[0],
        purpose: "independent_current_skill_authority"
      },
      chronologyInput({ occurrenceOrder: 4, scenarioDay: 135, sessionOrder: 3 })
    ]
  });

  boundary.processCurrentInteraction(runRef);
  let assessments = boundary.captureInspectionSnapshot(runRef).records.filter((record) => (
    record.family === "temporal_eligibility_assessment"
  ));
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].ageDays, 30);
  assert.equal(assessments[0].eligibility, "eligible");
  assert.equal(assessments[0].chronologyRef, firstInteraction.acceptedInputRefs[1]);
  const firstFact = boundary.inspectRecord(runRef, firstInteraction.acceptedInputRefs[0]);
  const processedInteractions = boundary.captureInspectionSnapshot(runRef).records.filter((record) => (
    record.transitionKind === "process_interaction_segment"
  ));
  assert.equal(processedInteractions.length, 1);
  assert.equal(processedInteractions[0].interactionRef, firstFact.interactionRef);

  boundary.processCurrentInteraction(runRef);
  assessments = boundary.captureInspectionSnapshot(runRef).records.filter((record) => (
    record.family === "temporal_eligibility_assessment"
  ));
  assert.equal(assessments.length, 2);
  const laterAssessment = assessments.find((assessment) => assessment.ageDays === 135);
  assert.equal(laterAssessment.eligibility, "ineligible");
  assert.equal(laterAssessment.assessedObservationRef, firstInteraction.acceptedInputRefs[0]);
  assert.equal(laterAssessment.chronologyRef, secondInteraction.acceptedInputRefs[1]);
  assert.equal(laterAssessment.evidenceReferenceRef, secondInteraction.acceptedInputRefs[0]);
  const transition = boundary.inspectRecord(runRef, laterAssessment.createdByTransitionRef);
  assert.ok(transition.resultReferences.includes(laterAssessment.reference));
  assert.ok(transition.inputReferences.includes(secondInteraction.acceptedInputRefs[0]));
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
