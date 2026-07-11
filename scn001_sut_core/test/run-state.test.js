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

function simulatorInput(requestedRef, overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "simulator_realization",
    sourceActor: "simulated_dependency", occurrenceOrder: 1, requestedRef,
    realizedBehavior: "Would you like to try it?", fidelity: "match", ...overrides
  };
}

function userResponseInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "user_response", sourceActor: "synthetic-user-a",
    occurrenceOrder: 2, content: "Yes, let's try that.", context: "proposal_response",
    ...overrides
  };
}

function fixtureControlInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "fixture_control_fact", sourceActor: "fixture-driver",
    occurrenceOrder: 3, control: "evaluation_retention_basis", value: "named_formal_run",
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
  const processingResult = boundary.processCurrentInteraction(runRef);
  return { ingestion, processingResult };
}

function deriveCandidateWithoutProposal(run, inputs = [...calibrationInputs(), affordanceInput()]) {
  run.assertSourceFactConsistency(inputs);
  run.ingest(inputs);
  const interaction = run.pendingInteractions.shift();
  const interactionFacts = interaction.inputReferences.map((reference) => run.records.get(reference));
  run.deriveDimensionComparisons(interaction, interactionFacts);
  const candidateTransitionRef = run.deriveTrialCandidateDecisions(interaction, interactionFacts);
  const candidate = [...run.records.values()].find((record) => record.family === "trial_candidate");
  return { interaction, candidateTransitionRef, candidate };
}

function selectedProposalRun() {
  const run = new RunState();
  const derived = deriveCandidateWithoutProposal(run);
  const proposalTransitionRef = run.deriveCandidateBoundProposalIntents(
    derived.interaction, derived.candidateTransitionRef
  );
  const selectionRef = run.deriveProposalRealizationSelection(derived.interaction, proposalTransitionRef);
  const proposal = [...run.records.values()].find((record) => record.family === "proposal_intent");
  return { run, ...derived, proposalTransitionRef, selectionRef, proposal };
}

function realizedProposalRun() {
  const selected = selectedProposalRun();
  const input = simulatorInput(selected.proposal.reference);
  selected.run.assertSourceFactConsistency([input]);
  selected.run.ingest([input]);
  const interaction = selected.run.pendingInteractions.at(-1);
  const facts = interaction.inputReferences.map((reference) => selected.run.records.get(reference));
  selected.run.recordProposalRealizations(interaction, facts);
  const transition = [...selected.run.records.values()].find(
    (record) => record.transitionKind === "record_proposal_realization"
  );
  const fact = facts[0];
  const relation = selected.run.relations.find((candidate) => candidate.relationKind === "realization");
  return { ...selected, input, interaction, fact, transition, relation };
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

test("same-batch duplicate source identity is one semantic communication basis participant", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const input = communicationInput();
  const ingestion = ingest(boundary, runRef, [input, structuredClone(input)]);

  assert.equal(ingestion.acceptedInputRefs.length, 2);
  assert.equal(ingestion.acceptedInputRefs[0], ingestion.acceptedInputRefs[1]);
  assert.equal(recordsOf(boundary, runRef, "input_fact").length, 1);
  const interaction = recordsOf(boundary, runRef, "interaction_segment")[0];
  assert.deepEqual(interaction.inputReferences, [ingestion.acceptedInputRefs[0]]);
  const ingestTransition = boundary.inspectRecord(runRef, ingestion.transitionRef);
  assert.deepEqual(ingestTransition.inputReferences, [ingestion.acceptedInputRefs[0]]);
  const ingestedRelations = boundary.enumerateLocalRelations(runRef, ingestion.transitionRef)
    .filter((relation) => relation.fromRef === ingestion.transitionRef
      && relation.targetRole === "ingested_input");
  assert.equal(ingestedRelations.length, 1);

  boundary.processCurrentInteraction(runRef);
  const assertions = recordsOf(boundary, runRef, "attributed_assertion");
  assert.equal(assertions.length, 1);
  const attributionBasis = boundary.enumerateLocalRelations(runRef, assertions[0].reference)
    .filter((relation) => relation.fromRef === assertions[0].reference
      && relation.targetRole === "attributed_communication");
  assert.equal(attributionBasis.length, 1);
  const processing = recordsOf(boundary, runRef, "sut_transition_evidence")
    .find((record) => record.transitionKind === "process_interaction_segment");
  assert.equal(processing.inputReferences.filter(
    (reference) => reference === ingestion.acceptedInputRefs[0]
  ).length, 1);
  const processedInputRelations = boundary.enumerateLocalRelations(runRef, processing.reference)
    .filter((relation) => relation.fromRef === processing.reference
      && relation.targetRole === "processed_input");
  assert.equal(processedInputRelations.length, 1);
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

test("same-batch duplicate historical observation creates one temporal assessment basis", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const observation = taskObservationInput({ occurrenceScenarioDay: 0, sessionOrder: 1 });
  const chronology = chronologyInput({ scenarioDay: 135, sessionOrder: 3 });
  const ingestion = ingest(boundary, runRef, [
    observation,
    structuredClone(observation),
    chronology
  ]);
  boundary.processCurrentInteraction(runRef);

  assert.equal(ingestion.acceptedInputRefs[0], ingestion.acceptedInputRefs[1]);
  const assessments = recordsOf(boundary, runRef, "temporal_eligibility_assessment");
  assert.equal(assessments.length, 1);
  assert.equal(assessments[0].assessedObservationRef, ingestion.acceptedInputRefs[0]);
  const assessedEvidenceRelations = boundary.enumerateLocalRelations(runRef, assessments[0].reference)
    .filter((relation) => relation.fromRef === assessments[0].reference
      && relation.targetRole === "assessed_evidence");
  assert.equal(assessedEvidenceRelations.length, 1);
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

test("same-batch duplicate recognition or production observation is counted once", () => {
  for (const duplicateIndex of [0, 1]) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    const observations = calibrationInputs(4, 1);
    ingest(boundary, runRef, [
      observations[0],
      observations[1],
      structuredClone(observations[duplicateIndex])
    ]);
    boundary.processCurrentInteraction(runRef);
    const comparison = recordsOf(boundary, runRef, "dimension_comparison")[0];

    assert.deepEqual(comparison.recognitionPerformance, { correctCount: 4, totalCount: 4 });
    assert.deepEqual(comparison.productionPerformance, { correctCount: 1, totalCount: 4 });
    const basisRefs = duplicateIndex === 0
      ? comparison.recognitionObservationRefs
      : comparison.productionObservationRefs;
    assert.equal(basisRefs.length, 1);
    const targetRole = duplicateIndex === 0
      ? "recognition_observation"
      : "production_observation";
    const basisRelations = boundary.enumerateLocalRelations(runRef, comparison.reference)
      .filter((relation) => relation.fromRef === comparison.reference
        && relation.targetRole === targetRole
        && relation.toRef === basisRefs[0]);
    assert.equal(basisRelations.length, 1);
  }
});

test("equal-payload observations with different source identities remain separate aggregation inputs", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const observations = calibrationInputs(4, 1);
  const secondRecognition = { ...structuredClone(observations[0]), sourceFactRef: sourceRef() };
  ingest(boundary, runRef, [observations[0], secondRecognition, observations[1]]);
  boundary.processCurrentInteraction(runRef);
  const comparison = recordsOf(boundary, runRef, "dimension_comparison")[0];

  assert.equal(comparison.recognitionObservationRefs.length, 2);
  assert.notEqual(
    comparison.recognitionObservationRefs[0],
    comparison.recognitionObservationRefs[1]
  );
  assert.deepEqual(comparison.recognitionPerformance, { correctCount: 8, totalCount: 8 });
  const recognitionRelations = boundary.enumerateLocalRelations(runRef, comparison.reference)
    .filter((relation) => relation.fromRef === comparison.reference
      && relation.targetRole === "recognition_observation");
  assert.equal(recognitionRelations.length, 2);
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

test("supported candidate creates a distinct immutable candidate-bound proposal intent", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  const affordance = affordanceInput();
  const { processingResult } = replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
  const candidate = recordsOf(boundary, runRef, "trial_candidate")[0];
  const proposal = recordsOf(boundary, runRef, "proposal_intent")[0];
  const candidateRelations = boundary.enumerateLocalRelations(runRef, candidate.reference);
  const proposalRelations = boundary.enumerateLocalRelations(runRef, proposal.reference);
  const proposalTransition = boundary.inspectRecord(runRef, proposal.createdByTransitionRef);
  const candidateTransition = boundary.inspectRecord(runRef, candidate.createdByTransitionRef);
  const processingTransition = recordsOf(boundary, runRef, "sut_transition_evidence")
    .filter((record) => record.transitionKind === "process_interaction_segment")
    .at(-1);

  assert.equal(candidate.supportComparisonRef, prepared.comparison.reference);
  assert.equal(candidate.family, "trial_candidate");
  assert.equal(candidate.lifecycleStatus, "formed_non_active");
  assert.equal(candidate.lifecycleVersion, 1);
  assert.equal(proposal.family, "proposal_intent");
  assert.notEqual(proposal.reference, candidate.reference);
  assert.equal(proposal.proposalType, "candidate_bound_trial_offer");
  assert.equal(proposal.candidateRef, candidate.reference);
  assert.equal(proposal.materialIntent, "offer_scoped_trial_for_user_decision");
  assert.equal(proposal.candidateMaterialIntent, candidate.materialIntent);
  assert.deepEqual(proposal.proposedScope, candidate.proposedScope);
  assert.notEqual(proposal.proposedScope, candidate.proposedScope);
  assert.deepEqual(proposal.proposedScope, {
    dimension: "particle_pattern_a",
    taskMode: "spontaneous_production"
  });
  assert.equal(proposal.responseExpectation, "candidate_bound_trial_decision");
  assert.equal(proposal.origin, "sut");
  assert.equal(proposal.statusOrigin, "sut_transition");
  assert.ok(candidateRelations.some((relation) => relation.relationKind === "basis" && relation.targetRole === "selected_trial_direction"));
  assert.ok(candidateRelations.some((relation) => relation.relationKind === "basis" && relation.targetRole === "comparison_input"));
  assert.ok(candidateRelations.some((relation) => relation.relationKind === "support" && relation.targetRole === "dimension_comparison"));
  assert.equal(proposalRelations.filter((relation) => (
    relation.fromRef === proposal.reference
    && relation.relationKind === "transition_ancestry"
    && relation.targetRole === "candidate"
    && relation.toRef === candidate.reference
  )).length, 1);
  assert.equal(proposalRelations.some((relation) => (
    relation.fromRef === proposal.reference
    && ["basis", "support"].includes(relation.relationKind)
  )), false);
  assert.equal(proposalTransition.transitionKind, "form_candidate_bound_proposal_intent");
  assert.deepEqual(proposalTransition.inputReferences, [candidate.reference]);
  assert.deepEqual(proposalTransition.resultReferences, [proposal.reference]);
  assert.ok(proposalTransition.createdOrder > candidateTransition.createdOrder);
  assert.equal(boundary.enumerateLocalRelations(runRef, proposalTransition.reference).filter((relation) => (
    relation.fromRef === proposalTransition.reference
    && relation.relationKind === "basis"
    && relation.targetRole === "proposal_candidate"
    && relation.toRef === candidate.reference
  )).length, 1);
  assert.ok(processingTransition.resultReferences.includes(proposalTransition.reference));
  assert.equal(Object.isFrozen(processingResult), true);
  assert.deepEqual(processingResult, []);
  assert.equal(boundary.emitAvailableOutputs(runRef).length, 1);
  assert.equal(recordsOf(boundary, runRef, "active_trial").length, 0);
  assert.equal(recordsOf(boundary, runRef, "activation_assessment").length, 0);
  assert.equal(recordsOf(boundary, runRef, "binding_assessment").length, 0);
  for (const forbiddenField of [
    "surfaceStatus",
    "proposalLifecycle",
    "proposalVersion",
    "accepted",
    "bindingStatus",
    "activationEligible",
    "selectedForRealization"
  ]) {
    assert.equal(forbiddenField in proposal, false);
  }
  assert.equal(boundary.captureInspectionSnapshot(runRef).records.some((record) => [
    "simulator_realization",
    "user_response_binding",
    "activation_check",
    "formal_evaluation_record",
    "scoring_artifact",
    "completion_package"
  ].includes(record.family)), false);
  assert.doesNotMatch(JSON.stringify(proposal), /wording|realization|fixture|path|checkpoint|claim|expectedTransition/i);
});

test("proposal formation leaves the candidate structurally unchanged", () => {
  const run = new RunState();
  const { interaction, candidateTransitionRef, candidate } = deriveCandidateWithoutProposal(run);
  const candidateBefore = structuredClone(candidate);

  run.deriveCandidateBoundProposalIntents(interaction, candidateTransitionRef);

  assert.deepEqual(run.records.get(candidate.reference), candidateBefore);
  assert.equal([...run.records.values()].filter((record) => record.family === "proposal_intent").length, 1);
});

test("one proposal creates exact SUT selection evidence and a passive frozen output", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const inputs = [...calibrationInputs(), affordanceInput()];
  ingest(boundary, runRef, inputs);
  boundary.processCurrentInteraction(runRef);
  const proposal = recordsOf(boundary, runRef, "proposal_intent")[0];
  const candidate = recordsOf(boundary, runRef, "trial_candidate")[0];
  const selection = recordsOf(boundary, runRef, "sut_transition_evidence")
    .find((record) => record.transitionKind === "select_proposal_for_realization");
  const before = boundary.captureInspectionSnapshot(runRef);
  const first = boundary.emitAvailableOutputs(runRef);
  const second = boundary.emitAvailableOutputs(runRef);

  assert.deepEqual(selection.inputReferences, [proposal.reference]);
  assert.deepEqual(selection.resultReferences, []);
  assert.equal(selection.result, "proposal_selected_for_realization");
  assert.ok(selection.createdOrder > proposal.createdOrder);
  assert.equal(boundary.enumerateLocalRelations(runRef, selection.reference).filter((relation) => (
    relation.fromRef === selection.reference && relation.relationKind === "basis"
      && relation.targetRole === "selected_proposal_intent" && relation.toRef === proposal.reference
  )).length, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first[0]).sort(), [
    "candidateMaterialIntent", "candidateRef", "kind", "materialIntent", "outputRef",
    "proposedScope", "requestedRef"
  ].sort());
  assert.equal(first[0].outputRef, selection.reference);
  assert.equal(first[0].requestedRef, proposal.reference);
  assert.equal(first[0].candidateRef, candidate.reference);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first[0]), true);
  assert.equal(Object.isFrozen(first[0].proposedScope), true);
  assert.deepEqual(boundary.captureInspectionSnapshot(runRef), before);
  assert.doesNotMatch(JSON.stringify(first), /fixture|path|bundle|checkpoint|claim|oracle|branch|score|wording/i);
});

test("selection and realization integrity attacks fail closed", () => {
  const run = new RunState();
  const derived = deriveCandidateWithoutProposal(run);
  const proposalTransitionRef = run.deriveCandidateBoundProposalIntents(
    derived.interaction, derived.candidateTransitionRef
  );
  const selectionRef = run.deriveProposalRealizationSelection(derived.interaction, proposalTransitionRef);
  const selection = run.records.get(selectionRef);
  run.relations.splice(run.relations.findIndex((relation) => (
    relation.fromRef === selectionRef && relation.targetRole === "selected_proposal_intent"
  )), 1);
  assert.throws(() => run.emitAvailableOutputs(), /selection evidence is malformed/);

  const duplicateRun = new RunState();
  const duplicateDerived = deriveCandidateWithoutProposal(duplicateRun);
  const transitionRef = duplicateRun.deriveCandidateBoundProposalIntents(
    duplicateDerived.interaction, duplicateDerived.candidateTransitionRef
  );
  const firstSelectionRef = duplicateRun.deriveProposalRealizationSelection(
    duplicateDerived.interaction, transitionRef
  );
  const duplicate = { ...structuredClone(duplicateRun.records.get(firstSelectionRef)), reference: createReference("transition") };
  duplicateRun.records.set(duplicate.reference, duplicate);
  assert.throws(() => duplicateRun.deriveProposalRealizationSelection(
    duplicateDerived.interaction, transitionRef
  ), /Multiple proposal realization selections/);
});

test("candidate-bound proposal integrity is revalidated before emission and realization", () => {
  const attacks = [
    ({ proposal }) => { proposal.proposedScope.dimension = "corrupted"; },
    ({ proposal }) => { proposal.materialIntent = "corrupted"; },
    ({ proposal }) => { proposal.candidateMaterialIntent = "corrupted"; },
    ({ run, proposal, candidate }) => {
      const equalCandidate = { ...structuredClone(candidate), reference: createReference("state") };
      run.records.set(equalCandidate.reference, equalCandidate);
      proposal.candidateRef = equalCandidate.reference;
    },
    ({ run, proposal }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === proposal.reference && relation.relationKind === "transition_ancestry"
      )), 1);
    },
    ({ run, proposal, candidate }) => {
      run.relations.push({
        ...structuredClone(run.relations.find((relation) => (
          relation.fromRef === proposal.reference && relation.relationKind === "transition_ancestry"
        ))),
        toRef: createReference("state")
      });
    },
    ({ run, proposalTransitionRef }) => {
      run.records.get(proposalTransitionRef).inputReferences[0] = createReference("state");
    },
    ({ run, proposal, candidateTransitionRef }) => {
      proposal.createdOrder = run.records.get(candidateTransitionRef).createdOrder - 1;
      run.relations.find((relation) => relation.fromRef === proposal.reference
        && relation.relationKind === "transition_ancestry").effectiveOrder = proposal.createdOrder;
    },
    ({ run, proposal, candidateTransitionRef }) => {
      proposal.createdOrder = run.records.get(candidateTransitionRef).createdOrder;
    },
    ({ proposal, candidate }) => { proposal.createdOrder = candidate.createdOrder - 1; },
    ({ run, proposalTransitionRef }) => { run.relations.splice(run.relations.findIndex((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )), 1); },
    ({ run, proposalTransitionRef }) => { run.relations.push(structuredClone(run.relations.find((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )))); },
    ({ run, proposalTransitionRef }) => { run.relations.find((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )).toRef = createReference("state"); },
    ({ run, proposalTransitionRef }) => { run.relations.find((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )).targetRole = "wrong"; },
    ({ run, proposalTransitionRef }) => { run.relations.find((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )).assertedByRole = "fixture"; },
    ({ run, proposalTransitionRef }) => { run.relations.find((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )).createdOrder -= 1; },
    ({ run, proposalTransitionRef }) => { run.relations.find((relation) => (
      relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"
    )).effectiveOrder -= 1; },
    ({ run, proposalTransitionRef }) => { const basis = run.relations.find((relation) => relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"); run.relations.push({ ...structuredClone(basis), targetRole: "wrong" }); },
    ({ run, proposalTransitionRef }) => { const basis = run.relations.find((relation) => relation.fromRef === proposalTransitionRef && relation.targetRole === "proposal_candidate"); run.relations.push({ ...structuredClone(basis), toRef: createReference("state") }); },
    ({ candidate }) => { candidate.lifecycleStatus = "active"; }
  ];
  for (const attack of attacks) {
    const selected = selectedProposalRun();
    attack(selected);
    assert.throws(() => selected.run.emitAvailableOutputs(), /proposal|Proposal|candidate/);
  }

  const selected = selectedProposalRun();
  const input = simulatorInput(selected.proposal.reference);
  selected.run.assertSourceFactConsistency([input]);
  selected.run.ingest([input]);
  const interaction = selected.run.pendingInteractions.at(-1);
  const facts = interaction.inputReferences.map((reference) => selected.run.records.get(reference));
  selected.proposal.proposedScope.dimension = "corrupted";
  assert.throws(
    () => selected.run.recordProposalRealizations(interaction, facts),
    /candidate material state/
  );
});

test("exact proposal realization closure rejects malformed and ambiguous evidence", () => {
  const attacks = [
    ({ relation }) => { relation.targetRole = "candidate"; },
    ({ relation }) => { relation.assertedByRole = "fixture"; },
    ({ relation }) => { relation.fromRef = createReference("state"); },
    ({ relation }) => { relation.createdOrder -= 1; },
    ({ run, transition }) => { run.records.delete(transition.reference); },
    ({ run, transition }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === transition.reference && relation.targetRole === "simulator_realization_fact"
      )), 1);
    },
    ({ run, transition }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === transition.reference && relation.targetRole === "proposal_realization_selection"
      )), 1);
    },
    ({ transition }) => { transition.inputReferences[1] = createReference("transition"); },
    ({ transition }) => { transition.inputReferences[2] = createReference("state"); },
    ({ run, transition }) => {
      const duplicate = { ...structuredClone(transition), reference: createReference("transition") };
      run.records.set(duplicate.reference, duplicate);
    },
    ({ run, relation }) => { run.relations.push(structuredClone(relation)); }
  ];
  for (const attack of attacks) {
    const realized = realizedProposalRun();
    attack(realized);
    assert.throws(
      () => realized.run.emitAvailableOutputs(),
      /realization evidence|P\/S\/F\/R\/E/
    );
  }
});

test("exact realization replay reuses only a complete valid closure", () => {
  const realized = realizedProposalRun();
  assert.deepEqual(realized.run.emitAvailableOutputs(), []);
  realized.run.assertSourceFactConsistency([structuredClone(realized.input)]);
  realized.run.ingest([structuredClone(realized.input)]);
  const replayInteraction = realized.run.pendingInteractions.at(-1);
  const replayFacts = replayInteraction.inputReferences.map((reference) => realized.run.records.get(reference));
  assert.equal(realized.run.recordProposalRealizations(replayInteraction, replayFacts), undefined);
  assert.equal([...realized.run.records.values()].filter(
    (record) => record.transitionKind === "record_proposal_realization"
  ).length, 1);
  assert.equal(realized.run.relations.filter((relation) => relation.relationKind === "realization").length, 1);

  realized.relation.targetRole = "candidate";
  assert.throws(
    () => realized.run.recordProposalRealizations(replayInteraction, replayFacts),
    /P\/S\/F\/R\/E/
  );
});

test("response without a current realization creates one unbound raw-response assessment", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const response = userResponseInput();
  ingest(boundary, runRef, [response]);
  assert.deepEqual(boundary.processCurrentInteraction(runRef), []);
  const assessment = recordsOf(boundary, runRef, "binding_assessment")[0];
  assert.equal(assessment.proposalRef, null);
  assert.equal(assessment.bindingStatus, "unbound");
  assert.equal(assessment.responseStatus, "accepted");
  assert.equal(assessment.materialIntentStatus, "unknown");
  assert.deepEqual(assessment.realizationFactRefs, []);
  assert.equal(assessment.userResponseRefs.length, 1);
});

test("multiple current response participants create one ambiguous assessment without selection", () => {
  for (const responses of [
    [userResponseInput(), userResponseInput({ content: "No." })],
    [userResponseInput({ content: "No." }), userResponseInput()]
  ]) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    ingest(boundary, runRef, responses);
    boundary.processCurrentInteraction(runRef);
    const assessments = recordsOf(boundary, runRef, "binding_assessment");
    assert.equal(assessments.length, 1);
    assert.equal(assessments[0].bindingStatus, "ambiguous");
    assert.equal(assessments[0].responseStatus, "ambiguous_or_non_accepting");
    assert.equal(assessments[0].userResponseRefs.length, 2);
  }
});

test("an unprocessed current realization participant fails closed instead of being labeled surfaced", () => {
  const realized = realizedProposalRun();
  const secondRealization = simulatorInput(realized.proposal.reference);
  const response = userResponseInput();
  realized.run.assertSourceFactConsistency([realized.input, secondRealization, response]);
  realized.run.ingest([realized.input, secondRealization, response]);
  const interaction = realized.run.pendingInteractions.at(-1);
  const facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  assert.throws(() => realized.run.assessProposalResponseBinding(interaction, facts), /P\/S\/F\/R\/E/);
  assert.equal([...realized.run.records.values()].filter(
    (record) => record.family === "binding_assessment"
  ).length, 0);
  assert.equal([...realized.run.records.values()].filter(
    (record) => record.transitionKind === "record_proposal_realization"
  ).length, 1);
});

test("wrong actor or response context remains raw evidence but cannot become bound", () => {
  for (const overrides of [
    { sourceActor: "fixture-driver" },
    { sourceActor: "simulated_dependency" },
    { context: "focused_drill" }
  ]) {
    const realized = realizedProposalRun();
    const response = userResponseInput(overrides);
    realized.run.assertSourceFactConsistency([realized.input, response]);
    realized.run.ingest([realized.input, response]);
    const interaction = realized.run.pendingInteractions.at(-1);
    const facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
    realized.run.assessProposalResponseBinding(interaction, facts);
    const assessment = [...realized.run.records.values()].find((record) => record.family === "binding_assessment");
    assert.equal(assessment.bindingStatus, "unbound");
    assert.equal(assessment.responseStatus, "accepted");
    assert.equal(assessment.materialIntentStatus, "match");
    assert.equal(assessment.reason, "response_not_attributable_to_expected_user");
    const raw = realized.run.records.get(assessment.userResponseRefs[0]);
    assert.deepEqual(raw.payload, response);
    assert.equal("bindingStatus" in raw.payload, false);
  }
});

test("canonical response attribution requires one exact typed source closure", () => {
  const attacks = [
    ({ run, response }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === response.reference && r.relationKind === "source"), 1); },
    ({ run, response }) => { run.relations.find((r) => r.fromRef === response.reference && r.relationKind === "source").toRef = createReference("actor"); },
    ({ run, response }) => { run.relations.push(structuredClone(run.relations.find((r) => r.fromRef === response.reference && r.relationKind === "source"))); },
    ({ run, response }) => { run.relations.find((r) => r.fromRef === response.reference && r.relationKind === "source").targetRole = "wrong"; },
    ({ run, response }) => { run.relations.find((r) => r.fromRef === response.reference && r.relationKind === "source").assertedByRole = "fixture"; },
    ({ run, response }) => { run.relations.find((r) => r.fromRef === response.reference && r.relationKind === "source").createdOrder = response.createdOrder; }
  ];
  for (const attack of attacks) {
    const realized = realizedProposalRun();
    const input = userResponseInput();
    realized.run.assertSourceFactConsistency([realized.input, input]);
    realized.run.ingest([realized.input, input]);
    const interaction = realized.run.pendingInteractions.at(-1);
    const response = interaction.inputReferences.map((ref) => realized.run.records.get(ref))
      .find((record) => record.role === "user_response");
    attack({ ...realized, response });
    const facts = interaction.inputReferences.map((ref) => realized.run.records.get(ref));
    realized.run.assessProposalResponseBinding(interaction, facts);
    const assessment = [...realized.run.records.values()].find((record) => record.family === "binding_assessment");
    assert.equal(assessment.bindingStatus, "unbound");
    assert.equal(assessment.reason, "response_not_attributable_to_expected_user");
  }
});

test("binding replay closes interaction, assessment order, participant multiplicity, status, and relations", () => {
  const attacks = [
    ({ run, assessment, transition }) => { const other = { reference: createReference("interaction"), family: "interaction_segment", origin: "sut", inputReferences: [], createdOrder: 1 }; run.records.set(other.reference, other); assessment.interactionRef = other.reference; transition.interactionRef = other.reference; },
    ({ run, assessment }) => { run.records.get(assessment.interactionRef).inputReferences = assessment.realizationFactRefs; },
    ({ run, assessment }) => { run.records.get(assessment.interactionRef).inputReferences = assessment.userResponseRefs; },
    ({ run, assessment }) => { run.records.get(assessment.interactionRef).createdOrder = assessment.createdOrder + 1; },
    ({ run, assessment }) => { run.records.get(assessment.interactionRef).createdByTransitionRef = createReference("transition"); },
    ({ run, assessment }) => { run.records.get(run.records.get(assessment.interactionRef).createdByTransitionRef).transitionKind = "other"; },
    ({ run, assessment }) => { run.records.get(run.records.get(assessment.interactionRef).createdByTransitionRef).origin = "fixture"; },
    ({ run, assessment }) => { run.records.get(run.records.get(assessment.interactionRef).createdByTransitionRef).result = "other"; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).inputReferences = assessment.realizationFactRefs; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).inputReferences = assessment.userResponseRefs; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).resultReferences = []; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); interaction.inputReferences.push(createReference("state")); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).createdOrder = assessment.createdOrder; },
    ({ run, assessment, transition }) => { const interaction = run.records.get(assessment.interactionRef); transition.createdOrder = assessment.createdOrder + 2; run.records.get(interaction.createdByTransitionRef).createdOrder = assessment.createdOrder + 1; },
    ({ run, assessment, transition }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).createdOrder = transition.createdOrder; },
    ({ run, assessment, transition }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).createdOrder = transition.createdOrder + 1; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); ingestion.createdOrder = assessment.createdOrder; run.relations.find((relation) => relation.fromRef === assessment.userResponseRefs[0] && relation.relationKind === "source").createdOrder = ingestion.createdOrder; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === ingestion.reference && relation.toRef === assessment.userResponseRefs[0] && relation.targetRole === "ingested_input"), 1); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === ingestion.reference && relation.toRef === assessment.realizationFactRefs[0] && relation.targetRole === "ingested_input"), 1); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); const controlRef = interaction.inputReferences.find((ref) => run.records.get(ref).role === "fixture_control_fact"); run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === ingestion.reference && relation.toRef === controlRef && relation.targetRole === "ingested_input"), 1); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.push(structuredClone(run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis"))); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis").toRef = createReference("state"); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis").targetRole = "wrong"; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis").assertedByRole = "fixture"; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis").createdOrder -= 1; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis").effectiveOrder -= 1; },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); run.relations.push({ ...structuredClone(run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis")), toRef: createReference("state") }); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); const unresolved = createReference("state"); interaction.inputReferences.push(unresolved); ingestion.inputReferences.push(unresolved); run.relations.push({ ...structuredClone(run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis")), toRef: unresolved }); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); interaction.inputReferences.push(assessment.reference); ingestion.inputReferences.push(assessment.reference); run.relations.push({ ...structuredClone(run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis")), toRef: assessment.reference }); },
    ({ run, assessment, transition }) => { const interaction = run.records.get(assessment.interactionRef); const ingestion = run.records.get(interaction.createdByTransitionRef); interaction.inputReferences.push(transition.reference); ingestion.inputReferences.push(transition.reference); run.relations.push({ ...structuredClone(run.relations.find((relation) => relation.fromRef === ingestion.reference && relation.relationKind === "basis")), toRef: transition.reference }); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).resultReferences.push(interaction.reference); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).resultReferences.push(createReference("state")); },
    ({ run, assessment }) => { const interaction = run.records.get(assessment.interactionRef); run.records.get(interaction.createdByTransitionRef).resultReferences.push(assessment.reference); },
    ({ assessment }) => { assessment.createdOrder = 1; },
    ({ run, assessment }) => { const duplicate = structuredClone(assessment); duplicate.reference = createReference("state"); duplicate.proposalRef = createReference("state"); run.records.set(duplicate.reference, duplicate); },
    ({ run, assessment }) => { const duplicate = structuredClone(assessment); duplicate.reference = createReference("state"); duplicate.proposalRef = null; run.records.set(duplicate.reference, duplicate); },
    ({ assessment }) => { assessment.materialIntentStatus = "unknown"; },
    ({ assessment }) => { assessment.proposalRef = createReference("state"); },
    ({ assessment }) => { assessment.responseStatus = "ambiguous_or_non_accepting"; },
    ({ run, assessment, transition }) => { run.relations.push({ ...run.relations.find((r) => r.fromRef === assessment.reference && r.targetRole === "actual_user_response"), toRef: createReference("state"), createdOrder: transition.createdOrder }); }
  ];
  for (const attack of attacks) {
    const realized = realizedProposalRun();
    const response = userResponseInput();
    const control = fixtureControlInput();
    realized.run.assertSourceFactConsistency([realized.input, response, control]);
    realized.run.ingest([realized.input, response, control]);
    let interaction = realized.run.pendingInteractions.at(-1);
    let facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
    realized.run.assessProposalResponseBinding(interaction, facts);
    const assessment = [...realized.run.records.values()].find((record) => record.family === "binding_assessment");
    const transition = realized.run.records.get(assessment.createdByTransitionRef);
    attack({ ...realized, assessment, transition });
    realized.run.assertSourceFactConsistency([realized.input, response, control]);
    realized.run.ingest([realized.input, response, control]);
    interaction = realized.run.pendingInteractions.at(-1);
    facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
    assert.throws(() => realized.run.assessProposalResponseBinding(interaction, facts), /[Bb]inding|B\/T\/P\/F\/U\/R/);
  }
});

test("binding replay validates exact transition, bases, and participant relations", () => {
  const attacks = [
    ({ assessment }) => { assessment.origin = "fixture"; },
    ({ assessment }) => { assessment.bindingType = "other"; },
    ({ assessment }) => { assessment.statusOrigin = "fixture"; },
    ({ assessment }) => { assessment.reason = "other"; },
    ({ run, transition }) => { run.records.delete(transition.reference); },
    ({ transition }) => { transition.inputReferences[0] = createReference("state"); },
    ({ assessment, transition }) => { transition.inputReferences.push(assessment.userResponseRefs[0]); },
    ({ assessment, transition }) => { transition.inputReferences.push(assessment.realizationFactRefs[0]); },
    ({ assessment, transition }) => { transition.inputReferences.push(assessment.proposalRef); },
    ({ run, assessment, transition }) => { const realizationRef = assessment.realizationFactRefs[0]; const closureTransition = [...run.records.values()].find((record) => record.transitionKind === "record_proposal_realization" && record.inputReferences?.includes(realizationRef)); transition.inputReferences.push(closureTransition.reference); },
    ({ run, transition }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === transition.reference && r.targetRole === "proposal_realization_evidence"), 1); },
    ({ run, transition }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === transition.reference && r.targetRole === "user_response_fact"), 1); },
    ({ run, assessment }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === assessment.reference && r.targetRole === "candidate_bound_proposal_intent"), 1); },
    ({ run, assessment }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === assessment.reference && r.targetRole === "actual_surfaced_realization"), 1); },
    ({ run, assessment }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === assessment.reference && r.targetRole === "actual_user_response"), 1); },
    ({ run, assessment }) => { run.relations.find((r) => r.fromRef === assessment.reference).targetRole = "wrong"; },
    ({ run, assessment }) => { run.relations.find((r) => r.fromRef === assessment.reference).assertedByRole = "fixture"; },
    ({ run, assessment }) => { run.relations.find((r) => r.fromRef === assessment.reference).createdOrder -= 1; },
    ({ run, assessment }) => { run.relations.push(structuredClone(run.relations.find((r) => r.fromRef === assessment.reference))); },
    ({ run, assessment }) => {
      const duplicate = structuredClone(assessment);
      duplicate.reference = createReference("state");
      run.records.set(duplicate.reference, duplicate);
    },
    ({ run, transition }) => {
      const duplicate = structuredClone(transition);
      duplicate.reference = createReference("transition");
      run.records.set(duplicate.reference, duplicate);
    }
  ];
  for (const attack of attacks) {
    const realized = realizedProposalRun();
    const response = userResponseInput();
    realized.run.assertSourceFactConsistency([realized.input, response]);
    realized.run.ingest([realized.input, response]);
    let interaction = realized.run.pendingInteractions.at(-1);
    let facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
    realized.run.assessProposalResponseBinding(interaction, facts);
    const assessment = [...realized.run.records.values()].find((record) => record.family === "binding_assessment");
    const transition = realized.run.records.get(assessment.createdByTransitionRef);
    attack({ ...realized, assessment, transition });
    realized.run.assertSourceFactConsistency([realized.input, response]);
    realized.run.ingest([realized.input, response]);
    interaction = realized.run.pendingInteractions.at(-1);
    facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
    assert.throws(() => realized.run.assessProposalResponseBinding(interaction, facts), /[Bb]inding|B\/T\/P\/F\/U\/R/);
  }
});

test("binding assessment cannot be retargeted to a later exact F/U replay interaction", () => {
  const realized = realizedProposalRun();
  const response = userResponseInput();
  realized.run.assertSourceFactConsistency([realized.input, response]);
  realized.run.ingest([realized.input, response]);
  let interaction = realized.run.pendingInteractions.at(-1);
  let facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  realized.run.assessProposalResponseBinding(interaction, facts);
  const assessment = [...realized.run.records.values()].find((record) => record.family === "binding_assessment");
  const transition = realized.run.records.get(assessment.createdByTransitionRef);

  realized.run.assertSourceFactConsistency([realized.input, response]);
  realized.run.ingest([realized.input, response]);
  interaction = realized.run.pendingInteractions.at(-1);
  assessment.interactionRef = interaction.reference;
  transition.interactionRef = interaction.reference;
  facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  assert.throws(
    () => realized.run.assessProposalResponseBinding(interaction, facts),
    /[Bb]inding|B\/T\/P\/F\/U\/R/
  );
});

test("binding ingestion accepts a valid fixture-initialized assertion result", () => {
  const realized = realizedProposalRun();
  const response = userResponseInput();
  const communication = communicationInput({
    semanticStatusOrigin: "fixture_initialized",
    context: "proposal_response"
  });
  const inputs = [realized.input, response, communication];
  realized.run.assertSourceFactConsistency(inputs);
  realized.run.ingest(inputs);
  let interaction = realized.run.pendingInteractions.at(-1);
  let facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  realized.run.assessProposalResponseBinding(interaction, facts);
  const ingestion = realized.run.records.get(interaction.createdByTransitionRef);
  assert.equal(ingestion.resultReferences.length, 2);
  assert.equal(realized.run.records.get(ingestion.resultReferences[1]).family, "attributed_assertion");

  realized.run.assertSourceFactConsistency(inputs);
  realized.run.ingest(inputs);
  interaction = realized.run.pendingInteractions.at(-1);
  facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  assert.equal(realized.run.assessProposalResponseBinding(interaction, facts), undefined);
});

test("noncanonical response stays non-accepting and mismatch fidelity never becomes material match", () => {
  const noncanonical = realizedProposalRun();
  const response = userResponseInput({ content: "Sure." });
  noncanonical.run.assertSourceFactConsistency([noncanonical.input, response]);
  noncanonical.run.ingest([noncanonical.input, response]);
  let interaction = noncanonical.run.pendingInteractions.at(-1);
  let facts = interaction.inputReferences.map((reference) => noncanonical.run.records.get(reference));
  noncanonical.run.assessProposalResponseBinding(interaction, facts);
  assert.equal([...noncanonical.run.records.values()].find(
    (record) => record.family === "binding_assessment"
  ).responseStatus, "ambiguous_or_non_accepting");

  const mismatch = selectedProposalRun();
  const mismatchInput = simulatorInput(mismatch.proposal.reference, { fidelity: "mismatch" });
  mismatch.run.assertSourceFactConsistency([mismatchInput]);
  mismatch.run.ingest([mismatchInput]);
  mismatch.run.processCurrentInteraction();
  const mismatchResponse = userResponseInput();
  mismatch.run.assertSourceFactConsistency([mismatchInput, mismatchResponse]);
  mismatch.run.ingest([mismatchInput, mismatchResponse]);
  interaction = mismatch.run.pendingInteractions.at(-1);
  facts = interaction.inputReferences.map((reference) => mismatch.run.records.get(reference));
  mismatch.run.assessProposalResponseBinding(interaction, facts);
  const assessment = [...mismatch.run.records.values()].find(
    (record) => record.family === "binding_assessment"
  );
  assert.equal(assessment.bindingStatus, "bound");
  assert.equal(assessment.responseStatus, "accepted");
  assert.equal(assessment.materialIntentStatus, "mismatch");
});

test("binding replay reuses exact F/U identity while equal-content new U stays distinct", () => {
  const realized = realizedProposalRun();
  const response = userResponseInput();
  realized.run.assertSourceFactConsistency([realized.input, response]);
  realized.run.ingest([realized.input, response]);
  let interaction = realized.run.pendingInteractions.at(-1);
  let facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  realized.run.assessProposalResponseBinding(interaction, facts);
  const first = [...realized.run.records.values()].find((record) => record.family === "binding_assessment");

  realized.run.assertSourceFactConsistency([realized.input, response]);
  realized.run.ingest([realized.input, response]);
  interaction = realized.run.pendingInteractions.at(-1);
  facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  assert.equal(realized.run.assessProposalResponseBinding(interaction, facts), undefined);
  assert.equal([...realized.run.records.values()].filter(
    (record) => record.family === "binding_assessment"
  ).length, 1);

  const later = userResponseInput();
  realized.run.assertSourceFactConsistency([realized.input, later]);
  realized.run.ingest([realized.input, later]);
  interaction = realized.run.pendingInteractions.at(-1);
  facts = interaction.inputReferences.map((reference) => realized.run.records.get(reference));
  realized.run.assessProposalResponseBinding(interaction, facts);
  const assessments = [...realized.run.records.values()].filter(
    (record) => record.family === "binding_assessment"
  );
  assert.equal(assessments.length, 2);
  assert.notEqual(assessments[1].reference, first.reference);
  assert.notEqual(assessments[1].userResponseRefs[0], first.userResponseRefs[0]);
  assert.equal(realized.run.relations.some((relation) => (
    relation.relationKind === "binding" && relation.fromRef === first.userResponseRefs[0]
  )), false);
});

test("two current proposals create neither selection nor output in either result order", () => {
  for (const dimensions of [["particle_pattern_a", "particle_pattern_b"], ["particle_pattern_b", "particle_pattern_a"]]) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    ingest(boundary, runRef, [
      ...calibrationInputs(4, 1, { dimension: dimensions[0] }),
      ...calibrationInputs(4, 1, { dimension: dimensions[1] }),
      affordanceInput()
    ]);
    boundary.processCurrentInteraction(runRef);
    assert.equal(recordsOf(boundary, runRef, "proposal_intent").length, 2);
    assert.equal(recordsOf(boundary, runRef, "sut_transition_evidence")
      .filter((record) => record.transitionKind === "select_proposal_for_realization").length, 0);
    assert.deepEqual(boundary.emitAvailableOutputs(runRef), []);
    assert.equal(recordsOf(boundary, runRef, "ambiguity_conflict").length, 0);
    assert.equal(recordsOf(boundary, runRef, "clarification_request").length, 0);
  }
});

test("proposal realization rejects wrong targets, missing selection, and a second distinct fact", () => {
  for (const targetFamily of ["trial_candidate", "dimension_comparison"]) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    ingest(boundary, runRef, [...calibrationInputs(), affordanceInput()]);
    boundary.processCurrentInteraction(runRef);
    const target = recordsOf(boundary, runRef, targetFamily)[0];
    ingest(boundary, runRef, [simulatorInput(target.reference)]);
    assert.throws(() => boundary.processCurrentInteraction(runRef), /must target a SUT proposal intent/);
  }

  const unselected = new RunState();
  const derived = deriveCandidateWithoutProposal(unselected);
  unselected.deriveCandidateBoundProposalIntents(derived.interaction, derived.candidateTransitionRef);
  const proposal = [...unselected.records.values()].find((record) => record.family === "proposal_intent");
  const input = simulatorInput(proposal.reference);
  unselected.assertSourceFactConsistency([input]);
  unselected.ingest([input]);
  const interaction = unselected.pendingInteractions.at(-1);
  const facts = interaction.inputReferences.map((reference) => unselected.records.get(reference));
  assert.throws(() => unselected.recordProposalRealizations(interaction, facts), /exactly one prior SUT selection/);

  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  ingest(boundary, runRef, [...calibrationInputs(), affordanceInput()]);
  boundary.processCurrentInteraction(runRef);
  const selectedProposal = recordsOf(boundary, runRef, "proposal_intent")[0];
  const first = simulatorInput(selectedProposal.reference);
  ingest(boundary, runRef, [first]);
  boundary.processCurrentInteraction(runRef);
  ingest(boundary, runRef, [simulatorInput(selectedProposal.reference)]);
  assert.throws(() => boundary.processCurrentInteraction(runRef), /distinct realization already exists/);
  assert.equal(recordsOf(boundary, runRef, "sut_transition_evidence")
    .filter((record) => record.transitionKind === "record_proposal_realization").length, 1);
});

test("exact candidate replay creates no duplicate proposal and retained candidates are not scanned", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const prepared = prepareComparison(boundary, runRef);
  const affordance = affordanceInput();
  replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);
  const proposalRef = recordsOf(boundary, runRef, "proposal_intent")[0].reference;
  const proposalTransitionCount = recordsOf(boundary, runRef, "sut_transition_evidence")
    .filter((record) => record.transitionKind === "form_candidate_bound_proposal_intent").length;

  boundary.captureInspectionSnapshot(runRef);
  boundary.inspectRecord(runRef, proposalRef);
  boundary.enumerateLocalRelations(runRef, proposalRef);
  replayTrialBasis(boundary, runRef, prepared.inputs, [affordance]);

  assert.deepEqual(recordsOf(boundary, runRef, "proposal_intent").map((record) => record.reference), [proposalRef]);
  assert.equal(recordsOf(boundary, runRef, "sut_transition_evidence")
    .filter((record) => record.transitionKind === "form_candidate_bound_proposal_intent").length, proposalTransitionCount);
});

test("distinct equal-payload candidates receive distinct proposal identities", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const firstObservations = calibrationInputs();
  const affordance = affordanceInput();
  ingest(boundary, runRef, [...firstObservations, affordance]);
  boundary.processCurrentInteraction(runRef);
  const secondObservations = calibrationInputs();
  ingest(boundary, runRef, [...secondObservations, affordance]);
  boundary.processCurrentInteraction(runRef);

  const candidates = recordsOf(boundary, runRef, "trial_candidate");
  const proposals = recordsOf(boundary, runRef, "proposal_intent");
  assert.equal(candidates.length, 2);
  assert.equal(proposals.length, 2);
  assert.notEqual(candidates[0].reference, candidates[1].reference);
  assert.notEqual(proposals[0].reference, proposals[1].reference);
  assert.deepEqual(candidates[0].proposedScope, candidates[1].proposedScope);
  assert.deepEqual(proposals.map((proposal) => proposal.candidateRef).sort(), candidates.map((candidate) => candidate.reference).sort());
});

test("one current transition with two eligible candidates creates two unselected proposals", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  ingest(boundary, runRef, [
    ...calibrationInputs(4, 1, { dimension: "particle_pattern_a" }),
    ...calibrationInputs(4, 1, { dimension: "particle_pattern_b" }),
    affordanceInput()
  ]);
  boundary.processCurrentInteraction(runRef);

  const candidates = recordsOf(boundary, runRef, "trial_candidate");
  const proposals = recordsOf(boundary, runRef, "proposal_intent");
  assert.equal(candidates.length, 2);
  assert.equal(proposals.length, 2);
  assert.deepEqual(new Set(proposals.map((proposal) => proposal.candidateRef)), new Set(candidates.map((candidate) => candidate.reference)));
  assert.equal(boundary.captureInspectionSnapshot(runRef).records.some((record) => (
    "selectedForRealization" in record
    || "preferredProposal" in record
    || "primaryProposal" in record
  )), false);
  assert.deepEqual(boundary.emitAvailableOutputs(runRef), []);
});

test("multi-candidate proposal formation requires one exhaustive basis per input", () => {
  function multiCandidateRun() {
    const run = new RunState();
    const inputs = [
      ...calibrationInputs(4, 1, { dimension: "particle_pattern_a" }),
      ...calibrationInputs(4, 1, { dimension: "particle_pattern_b" }),
      affordanceInput()
    ];
    run.assertSourceFactConsistency(inputs);
    run.ingest(inputs);
    run.processCurrentInteraction();
    const proposals = [...run.records.values()].filter((record) => record.family === "proposal_intent");
    const transition = run.records.get(proposals[0].createdByTransitionRef);
    return { run, proposals, transition };
  }

  const valid = multiCandidateRun();
  assert.equal(valid.proposals.length, 2);
  valid.proposals.forEach((proposal) => valid.run.validateCandidateBoundProposal(proposal.reference));

  for (const attack of [
    ({ run, proposals, transition }) => { const unresolved = createReference("state"); transition.inputReferences[1] = unresolved; run.relations.find((relation) => relation.fromRef === transition.reference && relation.toRef === proposals[1].candidateRef && relation.targetRole === "proposal_candidate").toRef = unresolved; proposals[1].candidateRef = unresolved; },
    ({ run, proposals, transition }) => { const comparison = [...run.records.values()].find((record) => record.family === "dimension_comparison"); const prior = proposals[1].candidateRef; transition.inputReferences[1] = comparison.reference; run.relations.find((relation) => relation.fromRef === transition.reference && relation.toRef === prior && relation.targetRole === "proposal_candidate").toRef = comparison.reference; proposals[1].candidateRef = comparison.reference; },
    ({ run, proposals, transition }) => { const affordance = [...run.records.values()].find((record) => record.role === "affordance_fact"); const prior = proposals[1].candidateRef; transition.inputReferences[1] = affordance.reference; run.relations.find((relation) => relation.fromRef === transition.reference && relation.toRef === prior && relation.targetRole === "proposal_candidate").toRef = affordance.reference; proposals[1].candidateRef = affordance.reference; },
    ({ transition }) => { transition.resultReferences[1] = createReference("state"); },
    ({ run, transition }) => { transition.resultReferences[1] = [...run.records.values()].find((record) => record.family === "dimension_comparison").reference; },
    ({ proposals }) => { proposals[1].createdByTransitionRef = createReference("transition"); },
    ({ transition }) => { transition.resultReferences.pop(); },
    ({ run, proposals, transition }) => { const extra = structuredClone(proposals[0]); extra.reference = createReference("state"); run.records.set(extra.reference, extra); transition.resultReferences.push(extra.reference); },
    ({ proposals }) => { proposals[1].candidateRef = proposals[0].candidateRef; },
    ({ proposals }) => { proposals[1].candidateRef = createReference("state"); },
    ({ run, transition }) => { run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === transition.reference && relation.toRef === transition.inputReferences[1] && relation.targetRole === "proposal_candidate"), 1); },
    ({ run, transition }) => { const basis = run.relations.find((relation) => relation.fromRef === transition.reference && relation.toRef === transition.inputReferences[0] && relation.targetRole === "proposal_candidate"); run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === transition.reference && relation.toRef === transition.inputReferences[1] && relation.targetRole === "proposal_candidate"), 1); run.relations.push(structuredClone(basis)); },
    ({ transition }) => { transition.inputReferences[1] = createReference("state"); }
  ]) {
    const attacked = multiCandidateRun();
    attack(attacked);
    assert.throws(
      () => attacked.run.validateCandidateBoundProposal(attacked.proposals[0].reference),
      /proposal|Proposal|candidate/
    );
  }
});

test("non-activation and unsupported candidate families create no proposal state", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  ingest(boundary, runRef, [...calibrationInputs(3, 3), affordanceInput()]);
  boundary.processCurrentInteraction(runRef);
  assert.equal(recordsOf(boundary, runRef, "non_activation_disposition").length, 1);
  assert.equal(recordsOf(boundary, runRef, "proposal_intent").length, 0);
  assert.equal(recordsOf(boundary, runRef, "sut_transition_evidence")
    .some((record) => record.transitionKind === "form_candidate_bound_proposal_intent"), false);

  const run = new RunState();
  const derived = deriveCandidateWithoutProposal(run);
  derived.candidate.candidateType = "delayed_correction_practice";
  assert.equal(run.deriveCandidateBoundProposalIntents(
    derived.interaction,
    derived.candidateTransitionRef
  ), undefined);
  assert.equal([...run.records.values()].some((record) => record.family === "proposal_intent"), false);
});

test("malformed production candidates and conflicting proposal state fail closed", () => {
  const malformedRun = new RunState();
  const malformed = deriveCandidateWithoutProposal(malformedRun);
  malformed.candidate.lifecycleStatus = "active";
  assert.throws(
    () => malformedRun.deriveCandidateBoundProposalIntents(
      malformed.interaction,
      malformed.candidateTransitionRef
    ),
    /violates the required formed non-active state contract/
  );

  const conflictingRun = new RunState();
  const conflicting = deriveCandidateWithoutProposal(conflictingRun);
  conflictingRun.deriveCandidateBoundProposalIntents(
    conflicting.interaction,
    conflicting.candidateTransitionRef
  );
  const proposal = [...conflictingRun.records.values()]
    .find((record) => record.family === "proposal_intent");
  proposal.proposedScope = { ...proposal.proposedScope, taskMode: "all_production" };
  assert.throws(
    () => conflictingRun.deriveCandidateBoundProposalIntents(
      conflicting.interaction,
      conflicting.candidateTransitionRef
    ),
    /conflicts with its exact candidate material state/
  );

  const ambiguousRun = new RunState();
  const ambiguous = deriveCandidateWithoutProposal(ambiguousRun);
  ambiguousRun.deriveCandidateBoundProposalIntents(
    ambiguous.interaction,
    ambiguous.candidateTransitionRef
  );
  const existing = [...ambiguousRun.records.values()]
    .find((record) => record.family === "proposal_intent");
  const duplicate = {
    ...structuredClone(existing),
    reference: createReference("state"),
    materialIntent: "conflicting_offer"
  };
  ambiguousRun.records.set(duplicate.reference, duplicate);
  assert.throws(
    () => ambiguousRun.deriveCandidateBoundProposalIntents(
      ambiguous.interaction,
      ambiguous.candidateTransitionRef
    ),
    /Multiple candidate-bound proposal intents/
  );
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

test("incomplete-evidence non-activation reuse requires exact observation and affordance basis", () => {
  const boundary = createSutBoundary();
  const runRef = boundary.startRun();
  const observationA = taskObservationInput({ taskMode: "recognition" });
  const observationB = { ...structuredClone(observationA), sourceFactRef: sourceRef() };
  const affordance = affordanceInput();
  const first = ingest(boundary, runRef, [observationA, affordance]);
  boundary.processCurrentInteraction(runRef);

  let dispositions = recordsOf(boundary, runRef, "non_activation_disposition");
  assert.equal(dispositions.length, 1);
  assert.deepEqual(dispositions[0].observationBasisRefs, [first.acceptedInputRefs[0]]);
  const firstDispositionRef = dispositions[0].reference;
  const firstBasisRelations = boundary.enumerateLocalRelations(runRef, firstDispositionRef)
    .filter((relation) => relation.fromRef === firstDispositionRef
      && relation.targetRole === "candidate_formation_observation");
  assert.deepEqual(firstBasisRelations.map((relation) => relation.toRef), [first.acceptedInputRefs[0]]);
  const creatingTransition = boundary.inspectRecord(
    runRef,
    dispositions[0].createdByTransitionRef
  );
  assert.ok(creatingTransition.inputReferences.includes(first.acceptedInputRefs[0]));
  assert.ok(firstBasisRelations.every((relation) => (
    relation.createdOrder === creatingTransition.createdOrder
    && relation.effectiveOrder === dispositions[0].createdOrder
  )));

  ingest(boundary, runRef, [observationA, affordance]);
  boundary.processCurrentInteraction(runRef);
  dispositions = recordsOf(boundary, runRef, "non_activation_disposition");
  assert.equal(dispositions.length, 1);
  assert.equal(
    boundary.enumerateLocalRelations(runRef, firstDispositionRef)
      .filter((relation) => relation.fromRef === firstDispositionRef
        && relation.targetRole === "candidate_formation_observation").length,
    1
  );

  const changed = ingest(boundary, runRef, [observationB, affordance]);
  boundary.processCurrentInteraction(runRef);
  dispositions = recordsOf(boundary, runRef, "non_activation_disposition");
  assert.equal(dispositions.length, 2);
  assert.notEqual(dispositions[0].reference, dispositions[1].reference);
  assert.deepEqual(dispositions[1].observationBasisRefs, [changed.acceptedInputRefs[0]]);
  assert.notEqual(changed.acceptedInputRefs[0], first.acceptedInputRefs[0]);
});

test("complete no-comparison dispositions preserve and distinguish exact observation bases", () => {
  const run = new RunState();
  const affordance = affordanceInput();

  function deriveWithoutComparison(observations) {
    const inputs = [...observations, affordance];
    run.assertSourceFactConsistency(inputs);
    const ingestion = run.ingest(inputs);
    const interaction = run.pendingInteractions.shift();
    const interactionFacts = interaction.inputReferences.map((reference) => run.records.get(reference));
    run.deriveTrialCandidateDecisions(interaction, interactionFacts);
    return { ingestion, observations };
  }

  const first = deriveWithoutComparison(calibrationInputs(4, 1));
  const second = deriveWithoutComparison(calibrationInputs(4, 1));
  const dispositions = [...run.records.values()]
    .filter((record) => record.family === "non_activation_disposition")
    .sort((left, right) => left.createdOrder - right.createdOrder);

  assert.equal(dispositions.length, 2);
  assert.deepEqual(
    dispositions[0].observationBasisRefs,
    first.ingestion.acceptedInputRefs.slice(0, 2)
  );
  assert.deepEqual(
    dispositions[1].observationBasisRefs,
    second.ingestion.acceptedInputRefs.slice(0, 2)
  );
  assert.notDeepEqual(dispositions[0].observationBasisRefs, dispositions[1].observationBasisRefs);
  for (const disposition of dispositions) {
    const basisRelations = run.relations.filter((relation) => (
      relation.fromRef === disposition.reference
      && relation.targetRole === "candidate_formation_observation"
    ));
    assert.deepEqual(
      basisRelations.map((relation) => relation.toRef),
      disposition.observationBasisRefs
    );
    const transition = run.records.get(disposition.createdByTransitionRef);
    assert.ok(disposition.observationBasisRefs.every(
      (reference) => transition.inputReferences.includes(reference)
    ));
  }
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
      proposals: recordsOf(boundary, runRef, "proposal_intent").length,
      dispositions: recordsOf(boundary, runRef, "non_activation_disposition").length
    };
  }
  assert.deepEqual(execute(false), execute(true));
});

test("inspection interleaving does not change same-batch canonical uniqueness", () => {
  function execute(withInspection) {
    const boundary = createSutBoundary();
    const runRef = boundary.startRun();
    const input = communicationInput();
    const ingestion = ingest(boundary, runRef, [input, structuredClone(input)]);
    if (withInspection) {
      boundary.captureInspectionSnapshot(runRef);
      boundary.inspectRecord(runRef, ingestion.acceptedInputRefs[0]);
      boundary.enumerateLocalRelations(runRef, ingestion.transitionRef);
    }
    boundary.processCurrentInteraction(runRef);
    const interaction = recordsOf(boundary, runRef, "interaction_segment")[0];
    const assertion = recordsOf(boundary, runRef, "attributed_assertion")[0];
    return {
      interactionInputCount: interaction.inputReferences.length,
      assertionCount: recordsOf(boundary, runRef, "attributed_assertion").length,
      attributionBasisCount: boundary.enumerateLocalRelations(runRef, assertion.reference)
        .filter((relation) => relation.fromRef === assertion.reference
          && relation.targetRole === "attributed_communication").length
    };
  }

  assert.deepEqual(execute(false), execute(true));
  assert.deepEqual(execute(false), {
    interactionInputCount: 1,
    assertionCount: 1,
    attributionBasisCount: 1
  });
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

test("proposal intent does not survive independent run termination", () => {
  const boundary = createSutBoundary();
  const firstRun = boundary.startRun();
  ingest(boundary, firstRun, [...calibrationInputs(), affordanceInput()]);
  boundary.processCurrentInteraction(firstRun);
  const proposalRef = recordsOf(boundary, firstRun, "proposal_intent")[0].reference;
  boundary.endRun(firstRun);

  const secondRun = boundary.startRun();
  assert.equal(recordsOf(boundary, secondRun, "proposal_intent").length, 0);
  assert.throws(() => boundary.inspectRecord(secondRun, proposalRef), /Unknown or closed/);
});
