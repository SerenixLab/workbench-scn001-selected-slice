import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createSutBoundary } from "../index.js";
import { validateFocusedDrillInstructionClosure } from "../src/focusedDrill.js";
import { validateRetainedInputFact } from "../src/retainedStateClosure.js";
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
    sourceActor: "simulated-dependency", occurrenceOrder: 1, requestedRef,
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

function focusedDrillContextInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "context_label", sourceActor: "fixture-driver",
    occurrenceOrder: 15, surfaceLabel: "text_simulated", activity: "japanese_practice",
    taskMode: "focused_production_drill", consequence: "low", ...overrides
  };
}

function focusedDrillRequestInput(overrides = {}) {
  return communicationInput({
    occurrenceOrder: 16,
    content: "Please correct me right away during this drill.",
    context: "focused_production_drill",
    semanticStatusOrigin: "unclassified",
    ...overrides
  });
}

function focusedDrillRealizationInput(requestedRef, overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "simulator_behavior_realization",
    sourceActor: "simulated-dependency", occurrenceOrder: 17, requestedRef,
    requestedBehavior: "immediate_correction", realizedBehavior: "immediate_correction",
    fidelity: "match", mismatchOrigin: null, ...overrides
  };
}

function focusedDrillObservationInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "task_observation", sourceActor: "fixture-scorer",
    occurrenceOrder: 18,
    itemRefs: ["DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"],
    taskMode: "focused_production_drill", dimension: "particle_pattern_a",
    performance: { kind: "aggregate", correctCount: 5, totalCount: 6 },
    occurrenceScenarioDay: 0, sessionId: "focused-drill-current", sessionOrder: 3,
    ...overrides
  };
}

function focusedDrillFeedbackInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "outcome_fact", sourceActor: "synthetic-user-a",
    occurrenceOrder: 19, observation: "That helped for this drill.",
    context: "focused_production_drill", ...overrides
  };
}

function directContextInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "context_label", sourceActor: "fixture-driver",
    occurrenceOrder: 19, surfaceLabel: "voice_simulated", activity: "japanese_practice",
    taskMode: "spontaneous_production", consequence: "low", realVoiceStack: "absent",
    scenarioDay: 138, sessionId: "spontaneous-correction-current", ...overrides
  };
}

function directInterruptionInput(overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "fixture_evidence", sourceActor: "fixture-driver",
    occurrenceOrder: 20, event: "over_aggressive_mid_sentence_interruption",
    context: "current_spontaneous_production_session", ...overrides
  };
}

function directRequestInput(overrides = {}) {
  return communicationInput({
    occurrenceOrder: 21,
    content: "Don't stop me mid-sentence like that here. Let me finish first.",
    context: "spontaneous_production", semanticStatusOrigin: "unclassified", ...overrides
  });
}

function directChronologyInput(overrides = {}) {
  return chronologyInput({
    occurrenceOrder: 22, scenarioDay: 138,
    sessionId: "spontaneous-correction-current", sessionOrder: 4,
    focusedDrillScenarioDay: 135, oldDrillPreferenceScenarioDay: 15, ...overrides
  });
}

function directRealizationInput(requestedRef, overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "simulator_behavior_realization",
    sourceActor: "simulated-dependency", occurrenceOrder: 23, requestedRef,
    requestedBehavior: "turn_completion_correction",
    realizedBehavior: "turn_completion_correction", fidelity: "match",
    mismatchOrigin: null, ...overrides
  };
}

function laterRealizationInput(requestedRef, overrides = {}) {
  return {
    sourceFactRef: sourceRef(), kind: "simulator_behavior_realization",
    sourceActor: "simulated-dependency", occurrenceOrder: 33, requestedRef,
    requestedBehavior: "delay_minor_correction_until_turn_completion",
    realizedBehavior: "delay_minor_correction_until_turn_completion",
    fidelity: "match", mismatchOrigin: null, ...overrides
  };
}

function laterOutcomeInputs(overrides = {}) {
  return [
    {
      sourceFactRef: sourceRef(), kind: "outcome_fact", sourceActor: "fixture-scorer",
      occurrenceOrder: 33, observation: "user_spoke_longer",
      context: "spontaneous_production",
      comparison: {
        metric: "speaking_duration", relation: "longer_than",
        baselineSessionId: "spontaneous-correction-current",
        currentSessionId: "spontaneous-outcome-later"
      },
      ...overrides.comparative
    },
    {
      sourceFactRef: sourceRef(), kind: "outcome_fact", sourceActor: "synthetic-user-a",
      occurrenceOrder: 34, observation: "This pacing feels easier.",
      context: "spontaneous_production", ...overrides.feedback
    },
    {
      sourceFactRef: sourceRef(), kind: "material_context_change",
      sourceActor: "fixture-driver", occurrenceOrder: 35,
      description: "no_zoey_available_co_intervention_event_supplied",
      coInterventionVisibility: "none_supplied_to_zoey",
      completeness: "non_exhaustive_for_private_or_unobserved_causes",
      ...overrides.coIntervention
    }
  ];
}

function explanationRequestInput(overrides = {}) {
  return communicationInput({
    occurrenceOrder: 36,
    content: "Why are you correcting differently now?",
    context: "spontaneous_production", semanticStatusOrigin: "unclassified",
    ...overrides
  });
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

function activationReadyRun(overrides = {}) {
  const run = new RunState();
  const calibration = calibrationInputs();
  if (overrides.observationDay !== undefined) {
    for (const observation of calibration) observation.occurrenceScenarioDay = overrides.observationDay;
  }
  const consequence = fixtureControlInput({
    control: "consequence", value: overrides.consequence ?? "low", occurrenceOrder: 13
  });
  const reversibility = fixtureControlInput({
    control: "reversibility", value: overrides.reversibility ?? "reversible", occurrenceOrder: 14
  });
  const inputs = [
    chronologyInput({ scenarioDay: overrides.chronologyDay ?? 0 }),
    ...calibration,
    {
      sourceFactRef: sourceRef(), kind: "context_label", sourceActor: "fixture-driver",
      occurrenceOrder: 4, surfaceLabel: "text_simulated",
      activity: overrides.activity ?? "japanese_practice",
      taskMode: "spontaneous_production", consequence: overrides.contextConsequence ?? "low"
    },
    affordanceInput(),
    fixtureControlInput({
      control: "trial_policy",
      value: overrides.trialPolicy ?? "bounded_reversible_trial_no_durable_adaptation",
      occurrenceOrder: 6
    }),
    consequence,
    reversibility
  ];
  if (overrides.candidateUserControl) inputs.push(fixtureControlInput({
    control: "user_governed_constraints", value: overrides.candidateUserControl,
    occurrenceOrder: 20
  }));
  if (overrides.candidateRetention) inputs.push(fixtureControlInput({
    control: "evaluation_retention_basis", value: overrides.candidateRetention,
    occurrenceOrder: 21
  }));
  if (overrides.candidateUnknownControl) inputs.push(fixtureControlInput({
    control: "undeclared_activation_control", value: "ignored", occurrenceOrder: 22
  }));
  run.assertSourceFactConsistency(inputs);
  run.ingest(inputs);
  run.processCurrentInteraction();
  const proposal = [...run.records.values()].find((record) => record.family === "proposal_intent");
  const realization = simulatorInput(proposal.reference);
  run.assertSourceFactConsistency([realization]);
  run.ingest([realization]);
  run.processCurrentInteraction();
  const acceptance = [realization, userResponseInput()];
  if (!overrides.omitRetention) acceptance.push(fixtureControlInput({
    control: "evaluation_retention_basis", value: overrides.retention ?? "named_formal_run",
    occurrenceOrder: 11
  }));
  if (!overrides.omitUserControl) acceptance.push(fixtureControlInput({
    control: "user_governed_constraints",
    value: overrides.userControl ?? "exhaustive_selected_slice_scope", occurrenceOrder: 12
  }));
  acceptance.push(
    overrides.distinctConsequenceRedelivery
      ? fixtureControlInput({ control: "consequence", value: "low", occurrenceOrder: 13 })
      : consequence,
    overrides.distinctReversibilityRedelivery
      ? fixtureControlInput({ control: "reversibility", value: "reversible", occurrenceOrder: 14 })
      : reversibility
  );
  if (overrides.bindingTrialPolicy) acceptance.push(fixtureControlInput({
    control: "trial_policy", value: overrides.bindingTrialPolicy, occurrenceOrder: 23
  }));
  if (overrides.materialContextChange) acceptance.push({
    sourceFactRef: sourceRef(), kind: "material_context_change", sourceActor: "fixture-driver",
    occurrenceOrder: 24, description: "practice context changed"
  });
  if (overrides.conflictingUserControl) acceptance.push(fixtureControlInput({
    control: "user_governed_constraints", value: "opt_out", occurrenceOrder: 15
  }));
  if (overrides.conflictingConsequence) acceptance.push(fixtureControlInput({
    control: "consequence", value: "high", occurrenceOrder: 16
  }));
  if (overrides.conflictingReversibility) acceptance.push(fixtureControlInput({
    control: "reversibility", value: "irreversible", occurrenceOrder: 17
  }));
  if (overrides.equalUserControl) acceptance.push(fixtureControlInput({
    control: "user_governed_constraints", value: "exhaustive_selected_slice_scope",
    occurrenceOrder: 18
  }));
  if (overrides.extraControl) acceptance.push(fixtureControlInput({
    control: "undeclared_activation_control", value: "ignored", occurrenceOrder: 19
  }));
  run.assertSourceFactConsistency(acceptance);
  run.ingest(acceptance);
  overrides.beforeFinalProcess?.(run);
  run.processCurrentInteraction();
  return run;
}

function activationAssessmentOnlyRun() {
  const run = activationReadyRun();
  const trial = [...run.records.values()].find((record) => record.family === "active_trial");
  const transition = run.records.get(trial.createdByTransitionRef);
  run.records.delete(trial.reference);
  run.records.delete(transition.reference);
  run.relations = run.relations.filter((relation) => relation.fromRef !== trial.reference);
  for (const record of run.records.values()) {
    if (record.transitionKind === "process_interaction_segment") {
      record.resultReferences = record.resultReferences.filter(
        (reference) => reference !== transition.reference
      );
    }
  }
  return run;
}

function focusedDrillDecisionRun() {
  const run = activationReadyRun();
  const inputs = [focusedDrillContextInput(), focusedDrillRequestInput()];
  run.assertSourceFactConsistency(inputs);
  run.ingest(inputs);
  run.processCurrentInteraction();
  return {
    run,
    inputs,
    activeTrial: [...run.records.values()].find((record) => record.family === "active_trial"),
    instruction: [...run.records.values()].find(
      (record) => record.family === "focused_drill_instruction"
    ),
    disposition: [...run.records.values()].find(
      (record) => record.family === "focused_drill_behavior_disposition"
    )
  };
}

function focusedDrillRealizedRun(overrides = {}) {
  const decision = focusedDrillDecisionRun();
  const input = focusedDrillRealizationInput(decision.disposition.reference, overrides);
  decision.run.assertSourceFactConsistency([input]);
  decision.run.ingest([input]);
  decision.run.processCurrentInteraction();
  const fact = [...decision.run.records.values()].find(
    (record) => record.role === "simulator_behavior_realization"
  );
  const transition = [...decision.run.records.values()].find(
    (record) => record.transitionKind === "record_focused_drill_realization"
  );
  return { ...decision, input, fact, realizationTransition: transition };
}

function focusedDrillOutcomeRun() {
  const realized = focusedDrillRealizedRun();
  const inputs = [focusedDrillObservationInput(), focusedDrillFeedbackInput()];
  realized.run.assertSourceFactConsistency(inputs);
  realized.run.ingest(inputs);
  realized.run.processCurrentInteraction();
  const outcome = [...realized.run.records.values()].find(
    (record) => record.family === "focused_drill_outcome"
  );
  return { ...realized, outcomeInputs: inputs, outcome };
}

function directCorrectionDecisionRun({ withFocusedPrefix = true } = {}) {
  const run = withFocusedPrefix ? focusedDrillOutcomeRun().run : new RunState();
  let controls = [...run.records.values()].filter((record) => (
    record.family === "input_fact" && record.role === "fixture_control_fact"
      && ["user_governed_constraints", "consequence", "reversibility"]
        .includes(record.payload.control)
  )).map((record) => record.payload);
  if (!withFocusedPrefix) {
    controls = [
      fixtureControlInput({
        control: "user_governed_constraints", value: "exhaustive_selected_slice_scope",
        occurrenceOrder: 12
      }),
      fixtureControlInput({ control: "consequence", value: "low", occurrenceOrder: 13 }),
      fixtureControlInput({
        control: "reversibility", value: "reversible", occurrenceOrder: 14
      })
    ];
    run.assertSourceFactConsistency(controls);
    run.ingest(controls);
    run.processCurrentInteraction();
  }
  const inputs = [
    directContextInput(), directInterruptionInput(), directRequestInput(),
    directChronologyInput(), ...controls
  ];
  run.assertSourceFactConsistency(inputs);
  run.ingest(inputs);
  run.processCurrentInteraction();
  return {
    run, inputs,
    correctionState: [...run.records.values()].find(
      (record) => record.family === "scoped_current_correction_control"
    ),
    disposition: [...run.records.values()].find(
      (record) => record.family === "direct_current_session_correction_disposition"
    )
  };
}

function directCorrectionRealizedRun(overrides = {}) {
  const decision = directCorrectionDecisionRun();
  const input = directRealizationInput(decision.disposition.reference, overrides);
  decision.run.assertSourceFactConsistency([input]);
  decision.run.ingest([input]);
  decision.run.processCurrentInteraction();
  const fact = [...decision.run.records.values()].find((record) => (
    record.role === "simulator_behavior_realization"
      && record.payload.requestedBehavior === "turn_completion_correction"
  ));
  return { ...decision, input, fact };
}

function laterUseRun({ counterfactual = false } = {}) {
  const completed = directCorrectionRealizedRun();
  const activeTrial = [...completed.run.records.values()].find(
    (record) => record.family === "active_delayed_correction_trial"
  );
  const controls = [...completed.run.records.values()].filter((record) => (
    record.family === "input_fact" && record.role === "fixture_control_fact"
    && ["user_governed_constraints", "consequence"].includes(record.payload.control)
  )).map((record) => record.payload);
  const context = {
    sourceFactRef: sourceRef(), kind: "context_label", sourceActor: "fixture-driver",
    occurrenceOrder: 30, surfaceLabel: "voice_simulated",
    activity: counterfactual ? "focused_accuracy_drill" : "japanese_practice",
    taskMode: counterfactual ? "focused_production_drill" : "spontaneous_production",
    consequence: "low", scenarioDay: 145,
    sessionId: counterfactual ? "focused-opt-in-later" : "spontaneous-outcome-later"
  };
  const reference = {
    sourceFactRef: sourceRef(), kind: "state_reference", sourceActor: "fixture-driver",
    occurrenceOrder: 31, stateRef: activeTrial.reference
  };
  const communication = counterfactual ? communicationInput({
    occurrenceOrder: 32,
    content: "For this drill, correct me immediately so I can fix each attempt.",
    context: "focused_production_drill", semanticStatusOrigin: "unclassified"
  }) : undefined;
  const inputs = [context, reference, ...(communication ? [communication] : []), ...controls];
  completed.run.assertSourceFactConsistency(inputs);
  completed.run.ingest(inputs);
  completed.run.processCurrentInteraction();
  return {
    ...completed, activeTrial, inputs, context, reference, communication,
    assessment: [...completed.run.records.values()].find((record) => (
      record.family === "later_use_applicability"
    )),
    laterDisposition: [...completed.run.records.values()].find((record) => (
      record.family === "later_behavior_disposition"
    ))
  };
}

function laterRealizedRun() {
  const later = laterUseRun();
  const realizationInput = laterRealizationInput(later.laterDisposition.reference);
  later.run.assertSourceFactConsistency([realizationInput]);
  later.run.ingest([realizationInput]);
  later.run.processCurrentInteraction();
  const realizationFact = [...later.run.records.values()].find((record) => (
    record.role === "simulator_behavior_realization"
    && record.payload.requestedRef === later.laterDisposition.reference
  ));
  return { ...later, realizationInput, realizationFact };
}

function laterOutcomeRun() {
  const realized = laterRealizedRun();
  const outcomeInputs = laterOutcomeInputs();
  realized.run.assertSourceFactConsistency(outcomeInputs);
  realized.run.ingest(outcomeInputs);
  realized.run.processCurrentInteraction();
  return {
    ...realized, outcomeInputs,
    outcome: [...realized.run.records.values()].find(
      (record) => record.family === "later_outcome"
    ),
    uncertainty: [...realized.run.records.values()].find(
      (record) => record.family === "outcome_uncertainty"
    )
  };
}

function groundedExplanationRun() {
  const completed = laterOutcomeRun();
  const oldObservation = taskObservationInput({
    occurrenceOrder: 37, itemRef: "historical-target-production-evidence",
    taskMode: "spontaneous_production", occurrenceScenarioDay: 0,
    sessionId: "old-practice-history", sessionOrder: 1
  });
  const unrelatedObservation = taskObservationInput({
    occurrenceOrder: 38, itemRef: "unrelated-historical-evidence",
    dimension: "unrelated_dimension", occurrenceScenarioDay: 0,
    sessionId: "unrelated-old-practice", sessionOrder: 1
  });
  completed.run.assertSourceFactConsistency([oldObservation, unrelatedObservation]);
  completed.run.ingest([oldObservation, unrelatedObservation]);
  completed.run.processCurrentInteraction();
  const chronology = chronologyInput({
    occurrenceOrder: 39, scenarioDay: 145,
    sessionId: "spontaneous-outcome-later", sessionOrder: 5
  });
  completed.run.assertSourceFactConsistency([
    oldObservation, unrelatedObservation, chronology
  ]);
  completed.run.ingest([oldObservation, unrelatedObservation, chronology]);
  completed.run.processCurrentInteraction();
  const request = explanationRequestInput();
  completed.run.assertSourceFactConsistency([request]);
  completed.run.ingest([request]);
  completed.run.processCurrentInteraction();
  return {
    ...completed, oldObservation, unrelatedObservation, chronology, request,
    support: [...completed.run.records.values()].find(
      (record) => record.family === "explanation_support"
    ),
    explanation: [...completed.run.records.values()].find(
      (record) => record.family === "user_facing_explanation"
    )
  };
}

function laterStateProjection(run, assessment) {
  return run.records.get(assessment.stateProjectionRef);
}

function cloneRetainedTransition(run, transition, overrides = {}) {
  const clone = {
    ...structuredClone(transition),
    reference: createReference("transition"),
    ...overrides
  };
  run.records.set(clone.reference, clone);
  return clone;
}

function retainedMutationSnapshot(run) {
  return structuredClone({
    nextOrder: run.nextOrder,
    records: [...run.records.entries()],
    relations: run.relations,
    actorReferences: [...run.actorReferences.entries()],
    sourceFactBindings: [...run.sourceFactBindings.entries()],
    pendingInteractions: run.pendingInteractions
  });
}

function appendEqualScopeCandidate(run) {
  const existingRefs = new Set([...run.records.values()]
    .filter((record) => record.family === "trial_candidate")
    .map((record) => record.reference));
  const inputs = [
    chronologyInput(),
    ...calibrationInputs(),
    {
      sourceFactRef: sourceRef(), kind: "context_label", sourceActor: "fixture-driver",
      occurrenceOrder: 4, surfaceLabel: "text_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low"
    },
    affordanceInput(),
    fixtureControlInput({
      control: "trial_policy", value: "bounded_reversible_trial_no_durable_adaptation",
      occurrenceOrder: 6
    }),
    fixtureControlInput({ control: "consequence", value: "low", occurrenceOrder: 13 }),
    fixtureControlInput({ control: "reversibility", value: "reversible", occurrenceOrder: 14 })
  ];
  run.assertSourceFactConsistency(inputs);
  run.ingest(inputs);
  run.processCurrentInteraction();
  const candidate = [...run.records.values()].find((record) => (
    record.family === "trial_candidate" && !existingRefs.has(record.reference)
  ));
  run.validateProductionCandidateClosure(candidate.reference);
  return candidate;
}

function retargetAssessmentMaterialToCandidate(run, assessment, candidate) {
  const binding = run.records.get(assessment.bindingAssessmentRef);
  const activationInteraction = run.records.get(binding.interactionRef);
  const basis = run.resolveActivationCandidateBasis(candidate);
  const participants = run.resolveActivationParticipants(
    candidate, binding, basis, activationInteraction
  );
  const refs = [
    participants.candidateRef, participants.bindingAssessmentRef, participants.comparisonRef,
    participants.recognitionObservationRef, participants.productionObservationRef,
    participants.chronologyRef, participants.contextRef, ...participants.contextChangeRefs,
    ...Object.values(participants.controlBasisRefs.candidateInteraction).flat(),
    ...Object.values(participants.controlBasisRefs.bindingInteraction).flat()
  ];
  const roleRefs = new Map([
    ["activation_candidate", participants.candidateRef],
    ["proposal_response_binding", participants.bindingAssessmentRef],
    ["candidate_support_comparison", participants.comparisonRef],
    ["current_recognition_evidence", participants.recognitionObservationRef],
    ["current_production_evidence", participants.productionObservationRef],
    ["activation_chronology", participants.chronologyRef],
    ["activation_context", participants.contextRef],
    ["candidate_trial_policy_control", participants.controlBasisRefs.candidateInteraction.trialPolicyRefs[0]],
    ["candidate_consequence_control", participants.controlBasisRefs.candidateInteraction.consequenceRefs[0]],
    ["candidate_reversibility_control", participants.controlBasisRefs.candidateInteraction.reversibilityRefs[0]],
    ["binding_user_governed_control", participants.controlBasisRefs.bindingInteraction.userGovernedConstraintRefs[0]],
    ["binding_consequence_control", participants.controlBasisRefs.bindingInteraction.consequenceRefs[0]],
    ["binding_reversibility_control", participants.controlBasisRefs.bindingInteraction.reversibilityRefs[0]],
    ["binding_retention_control", participants.controlBasisRefs.bindingInteraction.retentionBasisRefs[0]]
  ]);
  assessment.candidateRef = participants.candidateRef;
  assessment.comparisonRef = participants.comparisonRef;
  assessment.recognitionObservationRef = participants.recognitionObservationRef;
  assessment.productionObservationRef = participants.productionObservationRef;
  assessment.chronologyRef = participants.chronologyRef;
  assessment.contextRef = participants.contextRef;
  assessment.controlBasisRefs = structuredClone(participants.controlBasisRefs);
  assessment.materialBasisRefs = [...new Set(refs)];
  assessment.activeScope = structuredClone(candidate.proposedScope);
  run.records.get(assessment.createdByTransitionRef).inputReferences = [...new Set(refs)];
  for (const relation of run.relations.filter((item) => (
    item.fromRef === assessment.reference && item.relationKind === "basis"
  ))) relation.toRef = roleRefs.get(relation.targetRole);
}

function retargetFactToWrongActor(run, fact, sourceActor) {
  const originalActor = run.records.get(fact.sourceActorRef);
  const actor = {
    reference: createReference("source"), family: "semantic_source", origin: fact.origin,
    sourceActor, createdOrder: originalActor.createdOrder
  };
  run.records.set(actor.reference, actor);
  fact.payload.sourceActor = sourceActor;
  fact.sourceActorRef = actor.reference;
  const meaning = structuredClone(fact.payload);
  delete meaning.sourceFactRef;
  run.sourceFactBindings.get(fact.sourceFactRef).semanticMeaning = meaning;
  run.relations.find((relation) => (
    relation.fromRef === fact.reference && relation.relationKind === "source"
  )).toRef = actor.reference;
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
    { sourceActor: "simulated-dependency" },
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

test("retained input rejects an omitted fixture-initialized assertion result", () => {
  const run = new RunState();
  const communication = communicationInput({
    semanticStatusOrigin: "fixture_initialized",
    context: "old_practice_history"
  });
  run.assertSourceFactConsistency([communication]);
  const ingress = run.ingest([communication]);
  const interaction = run.pendingInteractions[0];
  const fact = run.records.get(ingress.acceptedInputRefs[0]);
  const ingestion = run.records.get(interaction.createdByTransitionRef);
  ingestion.resultReferences = [interaction.reference];

  assert.throws(() => validateRetainedInputFact({
    records: run.records,
    relations: run.relations,
    sourceFactBindings: run.sourceFactBindings,
    fact,
    origin: "fixture",
    role: "communication",
    interaction,
    expectedSourceActor: "synthetic-user-a"
  }), /retained input-fact closure is malformed/);
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

test("activation assessment derives nine checks and a separate active trial from exact closure", () => {
  const run = activationReadyRun();
  const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
  const trial = [...run.records.values()].find((record) => record.family === "active_trial");
  assert.deepEqual(Object.keys(assessment.checkResults).sort(), [
    "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
    "reversibility", "consequence", "current_applicability", "retention_basis",
    "non_adaptation_boundary"
  ].sort());
  assert.equal(Object.values(assessment.checkResults).every((result) => result.status === "passed"), true);
  assert.equal(assessment.overallStatus, "sufficient");
  assert.equal(trial.activationAssessmentRef, assessment.reference);
  assert.equal(run.records.get(trial.candidateRef).lifecycleStatus, "formed_non_active");
  for (const record of [assessment, trial]) assert.equal([...run.records.values()].filter(
    (candidate) => candidate.reference === record.createdByTransitionRef
      || candidate.resultReferences?.includes(record.reference)
  ).length, 1);
  run.validActivationAssessmentClosure(assessment);
  run.validActiveTrialClosure(trial);
});

test("each semantic activation failure retains an insufficient assessment and creates no trial", () => {
  for (const overrides of [
    { userControl: "unsupported" }, { reversibility: "irreversible" },
    { consequence: "high" }, { contextConsequence: "high" },
    { activity: "calendar_operation" }, { retention: "production_memory" },
    { trialPolicy: "durable_adaptation" }
  ]) {
    const run = activationReadyRun(overrides);
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    assert.equal(assessment.overallStatus, "insufficient");
    assert.equal(Object.values(assessment.checkResults).some((result) => result.status === "failed"), true);
    assert.equal([...run.records.values()].some((record) => record.family === "active_trial"), false);
    run.validActivationAssessmentClosure(assessment);
  }
});

test("activation replay validates assessment and trial closure instead of trusting stored labels", () => {
  const attacks = [
    ({ assessment }) => { assessment.overallStatus = "insufficient"; },
    ({ assessment }) => { assessment.checkResults.scope.status = "failed"; },
    ({ run, assessment }) => { run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === assessment.reference && relation.relationKind === "basis"), 1); },
    ({ run, trial }) => { run.relations.splice(run.relations.findIndex((relation) => relation.fromRef === trial.reference && relation.relationKind === "transition_ancestry"), 1); },
    ({ trial }) => { trial.currentStatus = "active"; trial.activationAssessmentRef = createReference("state"); }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const trial = [...run.records.values()].find((record) => record.family === "active_trial");
    attack({ run, assessment, trial });
    assert.throws(
      () => run.validActiveTrialClosure(trial),
      /Activation assessment|Active trial/
    );
  }
});

test("missing and conflicting controls retain failed or unresolved assessments without activation", () => {
  const cases = [
    [{ omitUserControl: true }, "user_governed_constraints", "failed", "insufficient"],
    [{ omitRetention: true }, "retention_basis", "failed", "insufficient"],
    [{ conflictingUserControl: true }, "user_governed_constraints", "unresolved", "unresolved_conflict"],
    [{ conflictingConsequence: true }, "consequence", "unresolved", "unresolved_conflict"],
    [{ conflictingReversibility: true }, "reversibility", "unresolved", "unresolved_conflict"],
    [{ equalUserControl: true }, "user_governed_constraints", "unresolved", "unresolved_conflict"]
  ];
  for (const [overrides, check, status, overall] of cases) {
    const run = activationReadyRun(overrides);
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    assert.equal(assessment.checkResults[check].status, status);
    assert.equal(assessment.overallStatus, overall);
    assert.equal([...run.records.values()].some((record) => record.family === "active_trial"), false);
    assert.equal(assessment.materialBasisRefs.length, new Set(assessment.materialBasisRefs).size);
    run.validActivationAssessmentClosure(assessment);
  }
});

test("co-applicable candidate and binding controls combine by exact identity", () => {
  const cases = [
    [{ candidateUserControl: "opt_out" }, "user_governed_constraints"],
    [{ candidateRetention: "production_memory" }, "retention_basis"],
    [{ bindingTrialPolicy: "durable_adaptation" }, "non_adaptation_boundary"],
    [{ bindingTrialPolicy: "bounded_reversible_trial_no_durable_adaptation" },
      "non_adaptation_boundary"]
  ];
  for (const [overrides, check] of cases) {
    const run = activationReadyRun(overrides);
    const assessment = [...run.records.values()].find(
      (record) => record.family === "activation_assessment"
    );
    assert.equal(assessment.checkResults[check].status, "unresolved");
    assert.equal(assessment.overallStatus, "unresolved_conflict");
    assert.equal([...run.records.values()].some((record) => record.family === "active_trial"), false);
    run.validActivationAssessmentClosure(assessment);
  }
});

test("consequence and reversibility require exact redelivery and retain both logical roles", () => {
  for (const [overrides, check] of [
    [{ distinctConsequenceRedelivery: true }, "consequence"],
    [{ distinctReversibilityRedelivery: true }, "reversibility"]
  ]) {
    const run = activationReadyRun(overrides);
    const assessment = [...run.records.values()].find(
      (record) => record.family === "activation_assessment"
    );
    assert.equal(assessment.checkResults[check].status, "failed");
    assert.match(assessment.checkResults[check].reason, /identity_mismatch/);
    const key = check === "consequence" ? "consequenceRefs" : "reversibilityRefs";
    const candidateRef = assessment.controlBasisRefs.candidateInteraction[key][0];
    const bindingRef = assessment.controlBasisRefs.bindingInteraction[key][0];
    assert.notEqual(candidateRef, bindingRef);
    assert.equal(assessment.materialBasisRefs.includes(candidateRef), true);
    assert.equal(assessment.materialBasisRefs.includes(bindingRef), true);
    assert.equal([...run.records.values()].some((record) => record.family === "active_trial"), false);
    run.validActivationAssessmentClosure(assessment);
  }

  const run = activationReadyRun();
  const assessment = [...run.records.values()].find(
    (record) => record.family === "activation_assessment"
  );
  for (const [key, roles] of [
    ["consequenceRefs", ["candidate_consequence_control", "binding_consequence_control"]],
    ["reversibilityRefs", ["candidate_reversibility_control", "binding_reversibility_control"]]
  ]) {
    const candidateRef = assessment.controlBasisRefs.candidateInteraction[key][0];
    const bindingRef = assessment.controlBasisRefs.bindingInteraction[key][0];
    assert.equal(candidateRef, bindingRef);
    for (const role of roles) assert.equal(run.relations.some((relation) => (
      relation.fromRef === assessment.reference && relation.toRef === candidateRef
        && relation.targetRole === role
    )), true);
  }
});

test("material context change is exact retained assessment basis", () => {
  const run = activationReadyRun({ materialContextChange: true });
  const assessment = [...run.records.values()].find(
    (record) => record.family === "activation_assessment"
  );
  const contextChange = [...run.records.values()].find(
    (record) => record.role === "material_context_change"
  );
  assert.equal(assessment.checkResults.current_applicability.status, "failed");
  assert.equal(assessment.materialBasisRefs.includes(contextChange.reference), true);
  const relationIndex = run.relations.findIndex((relation) => (
    relation.fromRef === assessment.reference && relation.toRef === contextChange.reference
      && relation.targetRole === "binding_material_context_change"
  ));
  assert.notEqual(relationIndex, -1);
  run.relations.splice(relationIndex, 1);
  assert.throws(() => run.validActivationAssessmentClosure(assessment), /Activation/);
});

test("valid old observations fail current authority and cannot create an active trial", () => {
  const run = activationReadyRun({ observationDay: 1, chronologyDay: 2 });
  const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
  assert.equal(assessment.checkResults.current_stale_basis.status, "failed");
  assert.equal(assessment.checkResults.current_stale_basis.reason, "support_not_current_under_chronology");
  assert.equal(assessment.overallStatus, "insufficient");
  assert.equal([...run.records.values()].some((record) => record.family === "active_trial"), false);
  run.validActivationAssessmentClosure(assessment);
});

test("activation assessment participant, transition, and relation attacks fail exact closure", () => {
  const attacks = [
    ({ assessment }) => { assessment.comparisonRef = createReference("state"); },
    ({ assessment }) => { assessment.recognitionObservationRef = createReference("state"); },
    ({ assessment }) => { assessment.chronologyRef = createReference("state"); },
    ({ assessment }) => { assessment.materialBasisRefs.shift(); },
    ({ assessment }) => { assessment.materialBasisRefs.push(createReference("state")); },
    ({ assessment }) => { assessment.materialBasisRefs.push(assessment.materialBasisRefs[0]); },
    ({ assessment }) => { assessment.controlBasisRefs.bindingInteraction.retentionBasisRefs = []; },
    ({ transition }) => { transition.inputReferences.shift(); },
    ({ transition }) => { transition.inputReferences.push(createReference("state")); },
    ({ transition }) => { transition.origin = "fixture"; },
    ({ transition }) => { transition.family = "other"; },
    ({ transition }) => { transition.interactionRef = createReference("interaction"); },
    ({ assessment }) => { assessment.interactionRef = createReference("interaction"); },
    ({ run, assessment }) => { run.relations.find((r) => r.fromRef === assessment.reference).targetRole = "wrong"; },
    ({ run, assessment }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === assessment.reference), 1); },
    ({ run, assessment }) => { run.relations.splice(run.relations.findIndex((r) => (
      r.fromRef === assessment.reference && r.targetRole === "binding_consequence_control"
    )), 1); },
    ({ run, assessment }) => { run.relations.push({ ...structuredClone(run.relations.find((r) => r.fromRef === assessment.reference)), toRef: createReference("state") }); }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const transition = run.records.get(assessment.createdByTransitionRef);
    attack({ run, assessment, transition });
    assert.throws(() => run.validActivationAssessmentClosure(assessment), /Activation|Binding/);
  }
});

test("activation assessment rejects duplicate creating-transition claims across pointer rewrites", () => {
  for (const rewritePointer of [false, true]) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find(
      (record) => record.family === "activation_assessment"
    );
    const original = run.records.get(assessment.createdByTransitionRef);
    const clone = cloneRetainedTransition(run, original);
    if (rewritePointer) assessment.createdByTransitionRef = clone.reference;
    assert.throws(
      () => run.validActivationAssessmentClosure(assessment),
      /Activation assessment requires exactly one retained creating transition/
    );
  }
});

test("active trial rejects duplicate creating-transition claims across pointer rewrites", () => {
  for (const rewritePointer of [false, true]) {
    const run = activationReadyRun();
    const trial = [...run.records.values()].find((record) => record.family === "active_trial");
    const original = run.records.get(trial.createdByTransitionRef);
    const clone = cloneRetainedTransition(run, original);
    if (rewritePointer) trial.createdByTransitionRef = clone.reference;
    assert.throws(
      () => run.validActiveTrialClosure(trial),
      /Active trial requires exactly one retained creating transition/
    );
  }
});

test("malformed or partial transition claims cannot hide behind the canonical creator", () => {
  const variants = [
    (clone) => { clone.transitionKind = "other"; },
    (clone) => { clone.origin = "fixture"; },
    (clone) => { clone.interactionRef = createReference("interaction"); },
    (clone) => { clone.inputReferences = []; },
    (clone) => { clone.result = "other"; },
    (clone) => { clone.family = "other"; }
  ];
  for (const family of ["activation_assessment", "active_trial"]) {
    for (const mutate of variants) {
      const run = activationReadyRun();
      const record = [...run.records.values()].find((item) => item.family === family);
      const clone = cloneRetainedTransition(run, run.records.get(record.createdByTransitionRef));
      mutate(clone);
      assert.throws(
        () => family === "activation_assessment"
          ? run.validActivationAssessmentClosure(record)
          : run.validActiveTrialClosure(record),
        /requires exactly one retained creating transition/
      );
    }
    const run = activationReadyRun();
    const record = [...run.records.values()].find((item) => item.family === family);
    const partial = {
      reference: createReference("transition"), resultReferences: [record.reference]
    };
    run.records.set(partial.reference, partial);
    assert.throws(
      () => family === "activation_assessment"
        ? run.validActivationAssessmentClosure(record)
        : run.validActiveTrialClosure(record),
      /requires exactly one retained creating transition/
    );
  }
});

test("activation retained input mutation and provenance attacks fail integrity", () => {
  const attacks = [
    ({ observation }) => { observation.payload.occurrenceScenarioDay += 1; },
    ({ chronology }) => { chronology.payload.scenarioDay += 1; },
    ({ context }) => { context.payload.consequence = "high"; },
    ({ control }) => { control.payload.value = "production_memory"; },
    ({ control }) => { control.payload.control = "other"; },
    ({ control }) => { control.payload.sourceFactRef = sourceRef(); },
    ({ run, control }) => { run.relations.find((r) => r.fromRef === control.reference && r.relationKind === "source").createdOrder -= 1; },
    ({ run, control }) => {
      const interaction = [...run.records.values()].find((record) => record.family === "interaction_segment" && record.inputReferences.includes(control.reference) && record.reference !== control.firstInteractionRef);
      run.relations.find((r) => r.fromRef === interaction.createdByTransitionRef && r.toRef === control.reference).createdOrder -= 1;
    }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const observation = run.records.get(assessment.recognitionObservationRef);
    const chronology = run.records.get(assessment.chronologyRef);
    const context = run.records.get(assessment.contextRef);
    const control = run.records.get(
      assessment.controlBasisRefs.candidateInteraction.consequenceRefs[0]
    );
    attack({ run, assessment, observation, chronology, context, control });
    assert.throws(() => run.validActivationAssessmentClosure(assessment), /Activation|Binding/);
  }
});

test("activation candidate and comparison lineage attacks fail exact closure", () => {
  const attacks = [
    ({ relation }) => { relation.assertedByRole = "fixture"; },
    ({ relation }) => { relation.createdOrder -= 1; },
    ({ relation }) => { relation.effectiveOrder -= 1; },
    ({ run, candidate }) => { run.relations.splice(run.relations.findIndex((r) => r.fromRef === candidate.reference && r.relationKind === "support"), 1); },
    ({ run, candidate }) => { run.relations.find((r) => r.fromRef === candidate.reference && r.relationKind === "support").toRef = createReference("state"); },
    ({ comparisonTransition }) => { comparisonTransition.origin = "fixture"; },
    ({ observationRelation }) => { observationRelation.semanticDimension = "other"; },
    ({ observationRelation }) => { observationRelation.semanticTaskMode = "other"; },
    ({ observationRelation }) => { observationRelation.createdOrder -= 1; },
    ({ observation }) => { observation.payload.dimension = "other"; }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const candidate = run.records.get(assessment.candidateRef);
    const comparison = run.records.get(assessment.comparisonRef);
    const observation = run.records.get(assessment.recognitionObservationRef);
    const relation = run.relations.find((r) => r.fromRef === candidate.reference && r.targetRole === "comparison_input");
    const observationRelation = run.relations.find((r) => r.fromRef === comparison.reference && r.targetRole === "recognition_observation");
    const comparisonTransition = run.records.get(comparison.createdByTransitionRef);
    attack({ run, assessment, candidate, comparison, observation, relation, observationRelation, comparisonTransition });
    assert.throws(() => run.validActivationAssessmentClosure(assessment), /Activation/);
  }
});

test("active-trial identity, transition, and ancestry attacks fail complete closure", () => {
  const attacks = [
    ({ trial }) => { trial.activationBasisType = "other"; },
    ({ trial }) => { trial.interactionRef = createReference("interaction"); },
    ({ transition }) => { transition.origin = "fixture"; },
    ({ transition }) => { transition.family = "other"; },
    ({ transition }) => { transition.interactionRef = createReference("interaction"); },
    ({ transition }) => { transition.inputReferences.push(transition.inputReferences[0]); },
    ({ ancestry }) => { ancestry.targetRole = "wrong"; },
    ({ ancestry }) => { ancestry.assertedByRole = "fixture"; },
    ({ ancestry }) => { ancestry.createdOrder -= 1; },
    ({ run, trial, ancestry }) => { run.relations.push({ ...structuredClone(ancestry), toRef: trial.reference }); }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const trial = [...run.records.values()].find((record) => record.family === "active_trial");
    const transition = run.records.get(trial.createdByTransitionRef);
    const ancestry = run.relations.find((r) => r.fromRef === trial.reference && r.relationKind === "transition_ancestry");
    attack({ run, trial, transition, ancestry });
    assert.throws(() => run.validActiveTrialClosure(trial), /Active trial|Activation/);
  }
});

test("activation candidate is the exact candidate reached through binding proposal ancestry", () => {
  {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const original = run.records.get(assessment.candidateRef);
    const substitute = appendEqualScopeCandidate(run);
    assert.notEqual(substitute.reference, original.reference);
    assert.deepEqual(substitute.proposedScope, original.proposedScope);
    assert.equal(substitute.lifecycleStatus, "formed_non_active");
    assert.equal(original.lifecycleStatus, "formed_non_active");
    assessment.candidateRef = substitute.reference;
    assert.throws(
      () => run.validActivationAssessmentClosure(assessment),
      /Activation assessment closure/
    );
  }

  {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const binding = run.records.get(assessment.bindingAssessmentRef);
    const proposal = run.validateCandidateBoundProposal(binding.proposalRef);
    const substitute = appendEqualScopeCandidate(run);
    assert.deepEqual(substitute.proposedScope, proposal.proposedScope);
    retargetAssessmentMaterialToCandidate(run, assessment, substitute);
    assert.equal(assessment.comparisonRef, substitute.supportComparisonRef);
    assert.throws(
      () => run.validActivationAssessmentClosure(assessment),
      /Activation assessment closure/
    );
  }
});

test("active trial cannot consistently substitute another equal-scope candidate", () => {
  const run = activationReadyRun();
  const trial = [...run.records.values()].find((record) => record.family === "active_trial");
  const assessment = run.records.get(trial.activationAssessmentRef);
  const substitute = appendEqualScopeCandidate(run);
  const transition = run.records.get(trial.createdByTransitionRef);
  const candidateAncestry = run.relations.find((relation) => (
    relation.fromRef === trial.reference && relation.targetRole === "trial_candidate"
  ));
  assert.deepEqual(substitute.proposedScope, trial.activeScope);
  trial.candidateRef = substitute.reference;
  transition.inputReferences[0] = substitute.reference;
  candidateAncestry.toRef = substitute.reference;
  assert.equal(assessment.candidateRef === substitute.reference, false);
  assert.throws(() => run.validActiveTrialClosure(trial), /Active trial closure/);
});

test("activation assessment and trial require the exact binding interaction and ingestion order", () => {
  const attacks = [
    ({ run, assessment, assessmentTransition }) => {
      const input = fixtureControlInput({ control: "evaluation_retention_basis" });
      run.assertSourceFactConsistency([input]);
      run.ingest([input]);
      const later = run.pendingInteractions.at(-1);
      assessment.interactionRef = later.reference;
      assessmentTransition.interactionRef = later.reference;
    },
    ({ run, binding, assessment, trial, assessmentTransition, trialTransition }) => {
      const bindingInteraction = run.records.get(binding.interactionRef);
      const inputs = bindingInteraction.inputReferences.map((ref) => (
        structuredClone(run.records.get(ref).payload)
      ));
      run.assertSourceFactConsistency(inputs);
      run.ingest(inputs);
      const later = run.pendingInteractions.at(-1);
      assessment.interactionRef = later.reference;
      trial.interactionRef = later.reference;
      assessmentTransition.interactionRef = later.reference;
      trialTransition.interactionRef = later.reference;
    },
    ({ run, assessment, assessmentTransition }) => {
      const candidate = run.records.get(assessment.candidateRef);
      assessment.interactionRef = candidate.interactionRef;
      assessmentTransition.interactionRef = candidate.interactionRef;
    },
    ({ run, binding, assessment, assessmentTransition }) => {
      const bindingInteraction = run.records.get(binding.interactionRef);
      const inputs = bindingInteraction.inputReferences
        .map((ref) => run.records.get(ref))
        .filter((fact) => fact.reference !== binding.userResponseRefs[0])
        .map((fact) => structuredClone(fact.payload));
      run.assertSourceFactConsistency(inputs);
      run.ingest(inputs);
      const later = run.pendingInteractions.at(-1);
      assessment.interactionRef = later.reference;
      assessmentTransition.interactionRef = later.reference;
    },
    ({ run, binding, assessment, assessmentTransition }) => {
      const bindingInteraction = run.records.get(binding.interactionRef);
      const inputs = bindingInteraction.inputReferences
        .map((ref) => run.records.get(ref))
        .filter((fact) => fact.reference !== binding.realizationFactRefs[0])
        .map((fact) => structuredClone(fact.payload));
      run.assertSourceFactConsistency(inputs);
      run.ingest(inputs);
      const later = run.pendingInteractions.at(-1);
      assessment.interactionRef = later.reference;
      assessmentTransition.interactionRef = later.reference;
    },
    ({ run, binding, assessment }) => {
      const ingestion = run.records.get(
        run.records.get(binding.interactionRef).createdByTransitionRef
      );
      assessment.createdOrder = ingestion.createdOrder - 1;
    },
    ({ run, binding, assessmentTransition }) => {
      const ingestion = run.records.get(
        run.records.get(binding.interactionRef).createdByTransitionRef
      );
      assessmentTransition.createdOrder = ingestion.createdOrder - 1;
    }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const trial = [...run.records.values()].find((record) => record.family === "active_trial");
    const binding = run.records.get(assessment.bindingAssessmentRef);
    const assessmentTransition = run.records.get(assessment.createdByTransitionRef);
    const trialTransition = run.records.get(trial.createdByTransitionRef);
    attack({ run, binding, assessment, trial, assessmentTransition, trialTransition });
    assert.throws(() => run.validActiveTrialClosure(trial), /Activation|Active trial/);
  }
});

test("unknown controls from either activation interaction fail closed before assessment mutation", () => {
  for (const overrides of [{ candidateUnknownControl: true }, { extraControl: true }]) {
    let run;
    assert.throws(
      () => activationReadyRun({ ...overrides, beforeFinalProcess: (value) => { run = value; } }),
      /unknown co-applicable control fact/
    );
    assert.equal([...run.records.values()].some(
      (record) => record.family === "activation_assessment" || record.family === "active_trial"
    ), false);
    assert.equal([...run.records.values()].some((record) => (
      record.transitionKind === "assess_production_focused_trial_activation"
        || record.transitionKind === "activate_production_focused_trial"
    )), false);
  }
});

test("activation methods reject fake transitions and wrong interactions before mutation", () => {
  const attacks = [
    (run, assessment, binding, interaction) => {
      const real = run.records.get(binding.createdByTransitionRef);
      const fake = { ...structuredClone(real), reference: createReference("transition") };
      run.records.set(fake.reference, fake);
      return () => run.assessProductionTrialActivation(
        interaction,
        interaction.inputReferences.map((ref) => run.records.get(ref)),
        fake.reference
      );
    },
    (run, assessment, binding, interaction) => {
      const real = run.records.get(assessment.createdByTransitionRef);
      const fake = { ...structuredClone(real), reference: createReference("transition") };
      run.records.set(fake.reference, fake);
      return () => run.activateProductionFocusedTrial(interaction, fake.reference);
    },
    (run, assessment) => {
      const candidate = run.records.get(assessment.candidateRef);
      const wrongInteraction = run.records.get(candidate.interactionRef);
      return () => run.activateProductionFocusedTrial(
        wrongInteraction, assessment.createdByTransitionRef
      );
    },
    (run, assessment, binding) => {
      const candidate = run.records.get(assessment.candidateRef);
      const wrongInteraction = run.records.get(candidate.interactionRef);
      return () => run.assessProductionTrialActivation(
        wrongInteraction,
        wrongInteraction.inputReferences.map((ref) => run.records.get(ref)),
        binding.createdByTransitionRef
      );
    }
  ];
  for (const prepare of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find(
      (record) => record.family === "activation_assessment"
    );
    const binding = run.records.get(assessment.bindingAssessmentRef);
    const interaction = run.records.get(binding.interactionRef);
    const attack = prepare(run, assessment, binding, interaction);
    const before = structuredClone({
      nextOrder: run.nextOrder,
      records: [...run.records.entries()],
      relations: run.relations,
      pendingInteractions: run.pendingInteractions
    });
    assert.throws(attack, /exact creating/);
    assert.deepEqual({
      nextOrder: run.nextOrder,
      records: [...run.records.entries()],
      relations: run.relations,
      pendingInteractions: run.pendingInteractions
    }, before);
  }
});

test("competing creator evidence fails activation replay before retained mutation", () => {
  const cases = [
    (run, assessment, trial, binding, interaction) => {
      const clone = cloneRetainedTransition(
        run, run.records.get(assessment.createdByTransitionRef)
      );
      assessment.createdByTransitionRef = clone.reference;
      return () => run.assessProductionTrialActivation(
        interaction,
        interaction.inputReferences.map((ref) => run.records.get(ref)),
        binding.createdByTransitionRef
      );
    },
    (run, assessment, trial, binding, interaction) => {
      const clone = cloneRetainedTransition(run, run.records.get(trial.createdByTransitionRef));
      trial.createdByTransitionRef = clone.reference;
      return () => run.activateProductionFocusedTrial(
        interaction, assessment.createdByTransitionRef
      );
    },
    (run, assessment, trial, binding, interaction) => {
      cloneRetainedTransition(run, run.records.get(binding.createdByTransitionRef), {
        transitionKind: "other"
      });
      return () => run.assessProductionTrialActivation(
        interaction,
        interaction.inputReferences.map((ref) => run.records.get(ref)),
        binding.createdByTransitionRef
      );
    }
  ];
  for (const prepare of cases) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find(
      (record) => record.family === "activation_assessment"
    );
    const trial = [...run.records.values()].find((record) => record.family === "active_trial");
    const binding = run.records.get(assessment.bindingAssessmentRef);
    const interaction = run.records.get(binding.interactionRef);
    const replay = prepare(run, assessment, trial, binding, interaction);
    const before = retainedMutationSnapshot(run);
    assert.throws(replay, /requires exactly one retained creating transition/);
    assert.deepEqual(retainedMutationSnapshot(run), before);
  }
});

test("a cloned assessment transition cannot create an active trial", () => {
  const run = activationAssessmentOnlyRun();
  const assessment = [...run.records.values()].find(
    (record) => record.family === "activation_assessment"
  );
  const interaction = run.records.get(assessment.interactionRef);
  const clone = cloneRetainedTransition(
    run, run.records.get(assessment.createdByTransitionRef)
  );
  assessment.createdByTransitionRef = clone.reference;
  const before = retainedMutationSnapshot(run);
  assert.throws(
    () => run.activateProductionFocusedTrial(interaction, clone.reference),
    /Activation assessment requires exactly one retained creating transition/
  );
  assert.deepEqual(retainedMutationSnapshot(run), before);
  assert.equal(
    [...run.records.values()].some((record) => record.family === "active_trial"), false
  );
});

test("activation-relevant facts require their exact semantic-source actors", () => {
  const cases = [
    [(assessment) => assessment.controlBasisRefs.candidateInteraction.trialPolicyRefs[0], "synthetic-user-a"],
    [(assessment) => assessment.controlBasisRefs.bindingInteraction.retentionBasisRefs[0], "fixture-scorer"],
    [(assessment) => assessment.chronologyRef, "synthetic-user-a"],
    [(assessment) => assessment.contextRef, "simulated-dependency"],
    [(assessment) => assessment.recognitionObservationRef, "fixture-driver"],
    [(assessment) => assessment.productionObservationRef, "synthetic-user-a"],
    [(assessment, binding) => binding.userResponseRefs[0], "fixture-driver"],
    [(assessment, binding) => binding.realizationFactRefs[0], "fixture-driver"]
  ];
  for (const [select, wrongActor] of cases) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const binding = run.records.get(assessment.bindingAssessmentRef);
    const fact = run.records.get(select(assessment, binding));
    retargetFactToWrongActor(run, fact, wrongActor);
    assert.equal(run.records.get(fact.sourceActorRef).sourceActor, fact.payload.sourceActor);
    assert.equal(run.relations.filter((relation) => (
      relation.fromRef === fact.reference && relation.relationKind === "source"
    )).length, 1);
    assert.throws(
      () => run.validActivationAssessmentClosure(assessment),
      /Activation retained input-fact closure|Binding assessment/
    );
  }
});

test("activation retained facts require complete exact first-ingestion provenance", () => {
  const attacks = [
    ({ control, currentInteraction }) => { control.firstInteractionRef = currentInteraction.reference; },
    ({ firstInteraction, control }) => {
      firstInteraction.inputReferences = firstInteraction.inputReferences
        .filter((ref) => ref !== control.reference);
    },
    ({ firstIngestion, control }) => {
      firstIngestion.inputReferences = firstIngestion.inputReferences
        .filter((ref) => ref !== control.reference);
    },
    ({ run, firstIngestion, control }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === firstIngestion.reference && relation.toRef === control.reference
          && relation.targetRole === "ingested_input"
      )), 1);
    },
    ({ run, firstIngestion, control, assessment }) => {
      run.relations.find((relation) => (
        relation.fromRef === firstIngestion.reference && relation.toRef === control.reference
          && relation.targetRole === "ingested_input"
      )).toRef = assessment.chronologyRef;
    },
    ({ run, control, currentInteraction }) => {
      control.firstInteractionRef = currentInteraction.reference;
      const currentIngestion = run.records.get(currentInteraction.createdByTransitionRef);
      run.relations.find((relation) => (
        relation.fromRef === control.reference && relation.relationKind === "source"
      )).createdOrder = currentIngestion.createdOrder;
    },
    ({ control, firstIngestion }) => { control.createdOrder = firstIngestion.createdOrder + 1; },
    ({ run, control }) => {
      run.records.get(control.sourceActorRef).createdOrder = control.createdOrder + 1;
    }
  ];
  for (const attack of attacks) {
    const run = activationReadyRun();
    const assessment = [...run.records.values()].find((record) => record.family === "activation_assessment");
    const control = run.records.get(
      assessment.controlBasisRefs.candidateInteraction.consequenceRefs[0]
    );
    const currentInteraction = run.records.get(assessment.interactionRef);
    const firstInteraction = run.records.get(control.firstInteractionRef);
    const firstIngestion = run.records.get(firstInteraction.createdByTransitionRef);
    attack({ run, assessment, control, currentInteraction, firstInteraction, firstIngestion });
    assert.throws(
      () => run.validActivationAssessmentClosure(assessment),
      /Activation retained input-fact closure/
    );
  }
});

test("focused-drill instruction and disposition are exact separate state after retained activation", () => {
  const { run, inputs, activeTrial, instruction, disposition } = focusedDrillDecisionRun();
  const candidate = run.records.get(activeTrial.candidateRef);
  const candidateBefore = structuredClone(candidate);
  const trialBefore = structuredClone(activeTrial);
  assert.ok(instruction);
  assert.ok(disposition);
  assert.notEqual(instruction.reference, activeTrial.reference);
  assert.notEqual(disposition.reference, instruction.reference);
  assert.notEqual(disposition.reference, activeTrial.reference);
  assert.equal(instruction.sourceCommunicationRef, run.sourceFactBindings.get(
    inputs[1].sourceFactRef
  ).inputFactRef);
  assert.equal(instruction.contextRef, run.sourceFactBindings.get(inputs[0].sourceFactRef).inputFactRef);
  assert.equal(instruction.globalPreference, "not_established");
  assert.equal(disposition.activeTrialRef, activeTrial.reference);
  assert.equal(disposition.instructionRef, instruction.reference);
  assert.equal(disposition.requestedBehavior, "immediate_correction");
  run.validateFocusedDrillDispositionClosure(disposition);
  const output = run.emitAvailableOutputs();
  assert.equal(output.length, 1);
  assert.equal(output[0].requestedRef, disposition.reference);
  assert.equal(output[0].outputRef, disposition.createdByTransitionRef);
  assert.equal(Object.isFrozen(output), true);
  assert.equal(Object.isFrozen(output[0].drillScope), true);
  assert.deepEqual(run.records.get(candidate.reference), candidateBefore);
  assert.deepEqual(run.records.get(activeTrial.reference), trialBefore);

  const focusedCounts = () => ({
    instructions: [...run.records.values()].filter(
      (record) => record.family === "focused_drill_instruction"
    ).length,
    dispositions: [...run.records.values()].filter(
      (record) => record.family === "focused_drill_behavior_disposition"
    ).length,
    instructionTransitions: [...run.records.values()].filter(
      (record) => record.transitionKind === "derive_focused_drill_instruction"
    ).length,
    dispositionTransitions: [...run.records.values()].filter(
      (record) => record.transitionKind === "derive_focused_drill_behavior_disposition"
    ).length
  });
  const beforeReplay = focusedCounts();
  run.assertSourceFactConsistency(inputs);
  run.ingest(inputs);
  run.processCurrentInteraction();
  assert.deepEqual(focusedCounts(), beforeReplay);
  assert.equal(run.emitAvailableOutputs()[0].requestedRef, disposition.reference);
});

test("focused-drill derivation fails closed for missing, historical, wrong-actor, or incompatible input", () => {
  const cases = [
    [focusedDrillRequestInput()],
    [focusedDrillContextInput()],
    [focusedDrillContextInput(), focusedDrillRequestInput({ sourceActor: "fixture-driver" })],
    [focusedDrillContextInput({ consequence: "high" }), focusedDrillRequestInput()],
    [focusedDrillContextInput({ taskMode: "spontaneous_production" }), focusedDrillRequestInput()],
    [focusedDrillContextInput(), focusedDrillRequestInput({
      context: "focused_text_drill", semanticStatusOrigin: "fixture_initialized"
    })],
    [focusedDrillContextInput(), focusedDrillRequestInput(), focusedDrillRequestInput()]
  ];
  for (const inputs of cases) {
    const run = activationReadyRun();
    run.assertSourceFactConsistency(inputs);
    run.ingest(inputs);
    try {
      run.processCurrentInteraction();
    } catch (error) {
      assert.match(error.message, /Focused-drill|retained input-fact closure/);
    }
    assert.equal([...run.records.values()].some((record) => (
      record.family === "focused_drill_instruction"
      || record.family === "focused_drill_behavior_disposition"
    )), false);
  }

  const noTrial = new RunState();
  const inputs = [focusedDrillContextInput(), focusedDrillRequestInput()];
  noTrial.assertSourceFactConsistency(inputs);
  noTrial.ingest(inputs);
  noTrial.processCurrentInteraction();
  assert.equal([...noTrial.records.values()].some((record) => (
    record.family === "focused_drill_instruction"
    || record.family === "focused_drill_behavior_disposition"
  )), false);
});

test("equal-payload prior drill instructions remain distinct and are never selected by order", () => {
  const first = focusedDrillDecisionRun();
  const inputs = [focusedDrillContextInput(), focusedDrillRequestInput()];
  first.run.assertSourceFactConsistency(inputs);
  first.run.ingest(inputs);
  first.run.processCurrentInteraction();
  const instructions = [...first.run.records.values()].filter(
    (record) => record.family === "focused_drill_instruction"
  );
  const dispositions = [...first.run.records.values()].filter(
    (record) => record.family === "focused_drill_behavior_disposition"
  );
  assert.equal(instructions.length, 2);
  assert.equal(dispositions.length, 2);
  assert.notEqual(instructions[0].sourceCommunicationRef, instructions[1].sourceCommunicationRef);
  assert.notEqual(dispositions[0].instructionRef, dispositions[1].instructionRef);
  const before = retainedMutationSnapshot(first.run);
  assert.throws(() => first.run.emitAvailableOutputs(), /output ambiguity/i);
  assert.deepEqual(retainedMutationSnapshot(first.run), before);
});

test("focused-drill realization is separate, exact-targeted, and mismatch cannot create outcome", () => {
  const matched = focusedDrillRealizedRun();
  const closure = matched.run.resolveFocusedDrillRealizationClosure(
    matched.disposition.reference,
    matched.fact.reference
  );
  assert.equal(closure.fact.reference, matched.fact.reference);
  assert.equal(closure.disposition.reference, matched.disposition.reference);
  assert.notEqual(closure.fact.reference, matched.disposition.reference);
  assert.deepEqual(closure.transition.inputReferences, [
    matched.fact.reference, matched.disposition.reference
  ]);
  assert.deepEqual(matched.run.emitAvailableOutputs(), []);

  const mismatch = focusedDrillRealizedRun({
    realizedBehavior: "delayed_correction",
    fidelity: "mismatch",
    mismatchOrigin: "simulated_dependency"
  });
  const outcomeInputs = [focusedDrillObservationInput(), focusedDrillFeedbackInput()];
  mismatch.run.assertSourceFactConsistency(outcomeInputs);
  mismatch.run.ingest(outcomeInputs);
  mismatch.run.processCurrentInteraction();
  assert.equal([...mismatch.run.records.values()].some(
    (record) => record.family === "focused_drill_outcome"
  ), false);

  const wrongTarget = focusedDrillDecisionRun();
  const candidate = [...wrongTarget.run.records.values()].find(
    (record) => record.family === "trial_candidate"
  );
  const wrongInput = focusedDrillRealizationInput(candidate.reference);
  wrongTarget.run.assertSourceFactConsistency([wrongInput]);
  wrongTarget.run.ingest([wrongInput]);
  const before = retainedMutationSnapshot(wrongTarget.run);
  assert.throws(
    () => wrongTarget.run.processCurrentInteraction(),
    /must target an exact SUT behavior disposition/
  );
  assert.deepEqual(retainedMutationSnapshot(wrongTarget.run), before);
});

test("short-term focused-drill outcome requires every exact material participant", () => {
  {
    const realized = focusedDrillRealizedRun();
    const input = focusedDrillObservationInput();
    realized.run.assertSourceFactConsistency([input]);
    realized.run.ingest([input]);
    realized.run.processCurrentInteraction();
    assert.equal([...realized.run.records.values()].some(
      (record) => record.family === "focused_drill_outcome"
    ), false);
  }
  {
    const realized = focusedDrillRealizedRun();
    const input = focusedDrillFeedbackInput();
    realized.run.assertSourceFactConsistency([input]);
    realized.run.ingest([input]);
    realized.run.processCurrentInteraction();
    assert.equal([...realized.run.records.values()].some(
      (record) => record.family === "focused_drill_outcome"
    ), false);
  }
  const completed = focusedDrillOutcomeRun();
  const outcome = completed.run.validateFocusedDrillOutcomeClosure(completed.outcome);
  assert.equal(outcome.activeTrialRef, completed.activeTrial.reference);
  assert.equal(outcome.instructionRef, completed.instruction.reference);
  assert.equal(outcome.behaviorDispositionRef, completed.disposition.reference);
  assert.equal(outcome.realizationFactRef, completed.fact.reference);
  assert.equal(outcome.observationRef, completed.run.sourceFactBindings.get(
    completed.outcomeInputs[0].sourceFactRef
  ).inputFactRef);
  assert.equal(outcome.feedbackRef, completed.run.sourceFactBindings.get(
    completed.outcomeInputs[1].sourceFactRef
  ).inputFactRef);
  assert.equal(outcome.longTermEfficacy, "not_established");
  assert.equal(outcome.globalPreference, "not_established");
  assert.equal(outcome.spontaneousProductionApplicability, "not_established");
  assert.equal(outcome.futureApplicability, "not_established");
  assert.equal(completed.run.relations.filter((relation) => (
    relation.fromRef === outcome.reference && relation.relationKind === "outcome"
  )).length, 9);
});

test("focused-drill closure attacks fail before allocating or repairing retained state", () => {
  {
    const completed = focusedDrillOutcomeRun();
    completed.run.relations.splice(completed.run.relations.findIndex((relation) => (
      relation.fromRef === completed.outcome.reference
      && relation.targetRole === "focused_drill_observation"
    )), 1);
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(
      () => completed.run.validateFocusedDrillOutcomeClosure(completed.outcome),
      /outcome closure is malformed/
    );
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
  {
    const decision = focusedDrillDecisionRun();
    cloneRetainedTransition(
      decision.run,
      decision.run.records.get(decision.instruction.createdByTransitionRef)
    );
    const before = retainedMutationSnapshot(decision.run);
    assert.throws(
      () => decision.run.emitAvailableOutputs(),
      /requires exactly one retained creating transition/
    );
    assert.deepEqual(retainedMutationSnapshot(decision.run), before);
  }
  {
    const decision = focusedDrillDecisionRun();
    const communication = decision.run.records.get(
      decision.instruction.sourceCommunicationRef
    );
    const assertion = decision.run.records.get(
      decision.instruction.attributedAssertionRef
    );
    const clone = {
      ...structuredClone(assertion), reference: createReference("assertion")
    };
    decision.run.records.set(clone.reference, clone);
    const before = retainedMutationSnapshot(decision.run);
    assert.throws(
      () => decision.run.emitAvailableOutputs(),
      /attribution closure is malformed/
    );
    assert.equal(clone.sourceCommunicationRef, communication.reference);
    assert.deepEqual(retainedMutationSnapshot(decision.run), before);
  }
  {
    const decision = focusedDrillDecisionRun();
    const interaction = decision.run.records.get(decision.instruction.interactionRef);
    const ingestion = decision.run.records.get(interaction.createdByTransitionRef);
    const communicationRef = decision.instruction.sourceCommunicationRef;
    const communicationBasis = decision.run.relations.find((relation) => (
      relation.fromRef === ingestion.reference
      && relation.toRef === communicationRef
      && relation.targetRole === "ingested_input"
    ));
    interaction.inputReferences.push(communicationRef);
    ingestion.inputReferences.push(communicationRef);
    decision.run.relations.push(structuredClone(communicationBasis));
    const before = retainedMutationSnapshot(decision.run);
    assert.throws(
      () => decision.run.emitAvailableOutputs(),
      /retained input-fact closure is malformed/
    );
    assert.deepEqual(retainedMutationSnapshot(decision.run), before);
  }
  {
    const run = activationReadyRun();
    const inputs = [focusedDrillContextInput(), focusedDrillRequestInput()];
    run.assertSourceFactConsistency(inputs);
    run.ingest(inputs);
    const interaction = run.pendingInteractions[0];
    const facts = interaction.inputReferences.map((reference) => run.records.get(reference));
    run.deriveAttributedAssertions(interaction, facts);
    const trial = [...run.records.values()].find((record) => record.family === "active_trial");
    run.records.set(createReference("state"), {
      ...structuredClone(trial), reference: createReference("state")
    });
    const before = retainedMutationSnapshot(run);
    assert.throws(
      () => run.deriveFocusedDrillDecision(interaction, facts),
      /requires one exact active production trial/
    );
    assert.deepEqual(retainedMutationSnapshot(run), before);
  }
});

test("every focused-drill family requires the complete active-trial foundation", () => {
  const attacks = [
    ({ run, activeTrial }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === activeTrial.reference
        && relation.targetRole === "trial_candidate"
      )), 1);
    },
    ({ run, activeTrial }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === activeTrial.reference
        && relation.targetRole === "activation_assessment"
      )), 1);
    },
    ({ run, activeTrial }) => {
      cloneRetainedTransition(run, run.records.get(activeTrial.createdByTransitionRef));
    },
    ({ run, activeTrial }) => {
      run.records.get(activeTrial.activationAssessmentRef).overallStatus = "insufficient";
    },
    ({ run, activeTrial }) => {
      const candidate = run.records.get(activeTrial.candidateRef);
      const substitute = { ...structuredClone(candidate), reference: createReference("state") };
      run.records.set(substitute.reference, substitute);
      activeTrial.candidateRef = substitute.reference;
    },
    ({ run, activeTrial }) => {
      activeTrial.interactionRef = run.records.get(activeTrial.candidateRef).interactionRef;
    },
    ({ run, activeTrial }) => {
      run.records.get(activeTrial.createdByTransitionRef).createdOrder = activeTrial.createdOrder;
    }
  ];
  for (const attack of attacks) {
    const completed = focusedDrillOutcomeRun();
    attack(completed);
    const validators = [
      () => validateFocusedDrillInstructionClosure({
        records: completed.run.records,
        relations: completed.run.relations,
        sourceFactBindings: completed.run.sourceFactBindings,
        instruction: completed.instruction,
        validateActiveTrial: (trial) => completed.run.validActiveTrialClosure(trial)
      }),
      () => completed.run.validateFocusedDrillDispositionClosure(completed.disposition),
      () => completed.run.resolveFocusedDrillRealizationClosure(
        completed.disposition.reference, completed.fact.reference
      ),
      () => completed.run.validateFocusedDrillOutcomeClosure(completed.outcome)
    ];
    for (const validate of validators) {
      const before = retainedMutationSnapshot(completed.run);
      assert.throws(validate);
      assert.deepEqual(retainedMutationSnapshot(completed.run), before);
    }
  }
});

test("focused-drill realization cannot be retargeted beyond exact first ingestion", () => {
  const attacks = [
    ({ realizationTransition, laterInteraction }) => {
      realizationTransition.interactionRef = laterInteraction.reference;
    },
    ({ run, realizationTransition, realizationRelation, laterInteraction, laterIngestion }) => {
      realizationTransition.interactionRef = laterInteraction.reference;
      realizationTransition.createdOrder = laterIngestion.createdOrder + 1;
      realizationRelation.createdOrder = realizationTransition.createdOrder;
      realizationRelation.effectiveOrder = realizationTransition.createdOrder;
      for (const relation of run.relations.filter((item) => (
        item.fromRef === realizationTransition.reference && item.relationKind === "basis"
      ))) {
        relation.createdOrder = realizationTransition.createdOrder;
        relation.effectiveOrder = realizationTransition.createdOrder;
      }
    },
    ({ run, fact, firstInteraction, laterIngestion }) => {
      firstInteraction.createdByTransitionRef = laterIngestion.reference;
      run.relations.find((relation) => (
        relation.fromRef === fact.reference && relation.relationKind === "source"
      )).createdOrder = laterIngestion.createdOrder;
    },
    ({ realizationTransition, laterInteraction }) => {
      realizationTransition.createdOrder = laterInteraction.createdOrder;
    },
    ({ run, fact, firstInteraction, firstIngestion, laterInteraction, laterIngestion,
      realizationTransition, realizationRelation }) => {
      fact.firstInteractionRef = laterInteraction.reference;
      firstInteraction.inputReferences = [];
      firstIngestion.inputReferences = [];
      run.relations = run.relations.filter((relation) => !(
        relation.fromRef === firstIngestion.reference
        && relation.toRef === fact.reference
        && relation.relationKind === "basis"
      ));
      run.relations.find((relation) => (
        relation.fromRef === fact.reference && relation.relationKind === "source"
      )).createdOrder = laterIngestion.createdOrder;
      realizationTransition.interactionRef = laterInteraction.reference;
      realizationTransition.createdOrder = laterIngestion.createdOrder + 1;
      realizationRelation.createdOrder = realizationTransition.createdOrder;
      realizationRelation.effectiveOrder = realizationTransition.createdOrder;
      for (const relation of run.relations.filter((item) => (
        item.fromRef === realizationTransition.reference && item.relationKind === "basis"
      ))) {
        relation.createdOrder = realizationTransition.createdOrder;
        relation.effectiveOrder = realizationTransition.createdOrder;
      }
    },
    ({ run, firstInteraction, firstIngestion }) => {
      const clone = cloneRetainedTransition(run, firstIngestion);
      firstInteraction.createdByTransitionRef = clone.reference;
      for (const relation of run.relations.filter((item) => (
        item.fromRef === firstIngestion.reference && item.relationKind === "basis"
      ))) {
        run.relations.push({ ...structuredClone(relation), fromRef: clone.reference });
      }
    }
  ];
  for (const [attackIndex, attack] of attacks.entries()) {
    const realized = focusedDrillRealizedRun();
    realized.run.assertSourceFactConsistency([realized.input]);
    realized.run.ingest([realized.input]);
    const laterInteraction = realized.run.pendingInteractions[0];
    const laterIngestion = realized.run.records.get(laterInteraction.createdByTransitionRef);
    const firstInteraction = realized.run.records.get(realized.fact.firstInteractionRef);
    const firstIngestion = realized.run.records.get(firstInteraction.createdByTransitionRef);
    const realizationRelation = realized.run.relations.find((relation) => (
      relation.relationKind === "realization"
      && relation.fromRef === realized.fact.reference
      && relation.toRef === realized.disposition.reference
    ));
    attack({
      ...realized,
      laterInteraction,
      laterIngestion,
      firstInteraction,
      firstIngestion,
      realizationRelation
    });
    const before = retainedMutationSnapshot(realized.run);
    assert.throws(() => realized.run.resolveFocusedDrillRealizationClosure(
      realized.disposition.reference, realized.fact.reference
    ), undefined, `realization attack ${attackIndex + 1} must fail`);
    assert.deepEqual(retainedMutationSnapshot(realized.run), before);
  }
});

test("focused-drill outcome requires its exact unique ingestion evidence", () => {
  const attacks = [
    ({ run, outcome }) => {
      outcome.outcomeIngestionTransitionRef = createReference("transition");
    },
    ({ run, outcome, interaction, ingestion }) => {
      const fake = cloneRetainedTransition(run, ingestion, {
        inputReferences: [], resultReferences: [interaction.reference]
      });
      outcome.outcomeIngestionTransitionRef = fake.reference;
      interaction.createdByTransitionRef = fake.reference;
    },
    ({ run, outcome, interaction, ingestion, outcomeTransition, ingestionRelation }) => {
      const fake = cloneRetainedTransition(run, ingestion, { inputReferences: [] });
      run.records.delete(ingestion.reference);
      outcome.outcomeIngestionTransitionRef = fake.reference;
      interaction.createdByTransitionRef = fake.reference;
      outcomeTransition.inputReferences = outcomeTransition.inputReferences.map(
        (reference) => reference === ingestion.reference ? fake.reference : reference
      );
      ingestionRelation.toRef = fake.reference;
    },
    ({ run, outcome, interaction, ingestion }) => {
      const clone = cloneRetainedTransition(run, ingestion);
      outcome.outcomeIngestionTransitionRef = clone.reference;
      interaction.createdByTransitionRef = clone.reference;
    },
    ({ outcome }) => {
      outcome.outcomeIngestionTransitionRef = createReference("transition");
    },
    ({ run, ingestion }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === ingestion.reference && relation.relationKind === "basis"
      )), 1);
    },
    ({ run, ingestion }) => {
      const relation = run.relations.find((item) => (
        item.fromRef === ingestion.reference && item.relationKind === "basis"
      ));
      run.relations.push(structuredClone(relation));
    },
    ({ run, ingestion, outcome }) => {
      run.relations.find((item) => (
        item.fromRef === ingestion.reference && item.relationKind === "basis"
      )).toRef = outcome.reference;
    },
    ({ ingestion }) => {
      ingestion.inputReferences = ingestion.inputReferences.slice(1);
    },
    ({ ingestion }) => {
      ingestion.resultReferences = [];
    }
  ];
  for (const attack of attacks) {
    const completed = focusedDrillOutcomeRun();
    const interaction = completed.run.records.get(completed.outcome.interactionRef);
    const ingestion = completed.run.records.get(interaction.createdByTransitionRef);
    const outcomeTransition = completed.run.records.get(
      completed.outcome.createdByTransitionRef
    );
    const ingestionRelation = completed.run.relations.find((relation) => (
      relation.fromRef === completed.outcome.reference
      && relation.targetRole === "outcome_ingestion"
    ));
    attack({
      ...completed, interaction, ingestion, outcomeTransition, ingestionRelation
    });
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(
      () => completed.run.validateFocusedDrillOutcomeClosure(completed.outcome)
    );
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
});

test("focused-drill identities remain isolated across independent RunState instances", () => {
  const first = focusedDrillOutcomeRun();
  const second = focusedDrillOutcomeRun();
  for (const key of ["instruction", "disposition", "fact", "outcome"]) {
    assert.notEqual(first[key].reference, second[key].reference);
    assert.equal(second.run.records.has(first[key].reference), false);
  }
});

test("current user correction independently authorizes separate direct state and disposition", () => {
  const direct = directCorrectionDecisionRun({ withFocusedPrefix: false });
  assert.ok(direct.correctionState);
  assert.ok(direct.disposition);
  assert.notEqual(direct.correctionState.reference, direct.disposition.reference);
  assert.equal(direct.correctionState.authority, "explicit_current_user_correction");
  assert.equal(direct.correctionState.correctionTiming, "turn_completion_correction");
  assert.equal(direct.disposition.behaviorEffect, "immediate_current_session_change");
  assert.equal(direct.disposition.requestedBehavior, "turn_completion_correction");
  assert.equal([...direct.run.records.values()].some((record) => (
    record.family === "active_trial" || record.family === "focused_drill_instruction"
  )), false);
  const output = direct.run.emitAvailableOutputs()[0];
  assert.equal(output.requestedRef, direct.disposition.reference);
  assert.equal(output.requestedBehavior, "turn_completion_correction");
});

test("earlier equal-payload correction evidence cannot substitute for current evidence", () => {
  const run = new RunState();
  const controls = [
    fixtureControlInput({
      control: "user_governed_constraints", value: "exhaustive_selected_slice_scope",
      occurrenceOrder: 12
    }),
    fixtureControlInput({ control: "consequence", value: "low", occurrenceOrder: 13 }),
    fixtureControlInput({
      control: "reversibility", value: "reversible", occurrenceOrder: 14
    })
  ];
  run.assertSourceFactConsistency(controls);
  run.ingest(controls);
  run.processCurrentInteraction();
  const request = directRequestInput();
  run.assertSourceFactConsistency([request]);
  run.ingest([request]);
  run.processCurrentInteraction();
  const current = [
    directContextInput(), directInterruptionInput(), request, directChronologyInput(),
    ...controls
  ];
  run.assertSourceFactConsistency(current);
  run.ingest(current);
  const before = retainedMutationSnapshot(run);
  assert.throws(
    () => run.processCurrentInteraction(),
    /exact first-ingested current-session evidence/
  );
  assert.deepEqual(retainedMutationSnapshot(run), before);
  assert.equal([...run.records.values()].some((record) => [
    "scoped_current_correction_control",
    "direct_current_session_correction_disposition"
  ].includes(record.family)), false);
});

test("direct realization requires exact identity and mismatch remains non-matching", () => {
  const matched = directCorrectionRealizedRun();
  const closure = matched.run.resolveDirectCorrectionRealizationClosure(
    matched.disposition.reference, matched.fact.reference
  );
  assert.equal(closure.fact.reference, matched.fact.reference);
  assert.equal(closure.disposition.reference, matched.disposition.reference);
  assert.deepEqual(matched.run.emitAvailableOutputs(), []);

  const mismatch = directCorrectionRealizedRun({
    realizedBehavior: "immediate_correction", fidelity: "mismatch",
    mismatchOrigin: "simulated_dependency"
  });
  const mismatchClosure = mismatch.run.resolveDirectCorrectionRealizationClosure(
    mismatch.disposition.reference, mismatch.fact.reference
  );
  assert.equal(mismatchClosure.fact.payload.fidelity, "mismatch");
  assert.notEqual(
    mismatchClosure.fact.payload.realizedBehavior,
    mismatchClosure.fact.payload.requestedBehavior
  );
  assert.equal([...mismatch.run.records.values()].some(
    (record) => record.family === "delayed_correction_candidate"
  ), false);
});

test("matched direct realization forms, assesses, and activates the exact delayed candidate", () => {
  const completed = directCorrectionRealizedRun();
  const candidate = [...completed.run.records.values()].find(
    (record) => record.family === "delayed_correction_candidate"
  );
  assert.ok(candidate);
  completed.run.validateDelayedCorrectionCandidateClosure(candidate);
  assert.equal(candidate.lifecycleStatus, "formed_non_active");
  assert.equal(candidate.activationStatus, "not_assessed");
  assert.equal(candidate.behaviorInfluence, "prohibited_until_activation");
  assert.equal(candidate.userPreference, "not_established");
  assert.equal(candidate.globalPolicy, "not_established");
  assert.equal(candidate.durableAdaptation, "unsupported_in_selected_slice");
  assert.equal(candidate.directDispositionRef, completed.disposition.reference);
  assert.equal(candidate.directRealizationFactRef, completed.fact.reference);
  assert.equal(candidate.focusedOutcomeRef, [...completed.run.records.values()].find(
    (record) => record.family === "focused_drill_outcome"
  ).reference);
  assert.deepEqual(candidate.proposedScope, {
    activity: "japanese_practice",
    taskMode: "spontaneous_production",
    surfaceLabel: "voice_simulated",
    correctionClass: "minor_correction",
    timing: "turn_completion",
    consequence: "low",
    excludedTaskModes: ["focused_production_drill"],
    explicitImmediateCorrection: "excluded"
  });
  assert.deepEqual(candidate.activationRequirements, [
    "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
    "reversibility", "consequence", "current_applicability", "retention_basis",
    "non_adaptation_boundary"
  ]);
  const relations = completed.run.relations.filter(
    (relation) => relation.fromRef === candidate.reference
  );
  assert.equal(relations.filter(
    (relation) => relation.relationKind === "transition_ancestry"
  ).length, 1);
  assert.equal(relations.filter((relation) => relation.relationKind === "basis").length, 15);
  assert.equal(relations.filter((relation) => relation.relationKind === "support").length, 6);
  assert.equal(relations.some((relation) => (
    relation.relationKind === "basis"
    && relation.toRef === candidate.directRealizationFactRef
  )), true);
  assert.equal(relations.some((relation) => (
    relation.relationKind === "support"
    && relation.toRef === candidate.directRealizationFactRef
  )), true);
  const transition = completed.run.records.get(candidate.createdByTransitionRef);
  assert.equal(transition.inputReferences.length, new Set(transition.inputReferences).size);
  assert.equal(completed.run.emitAvailableOutputs().length, 0);
  const assessment = [...completed.run.records.values()].find(
    (record) => record.family === "delayed_correction_activation_assessment"
  );
  const activeDelayedTrial = [...completed.run.records.values()].find(
    (record) => record.family === "active_delayed_correction_trial"
  );
  assert.ok(assessment);
  assert.ok(activeDelayedTrial);
  completed.run.validateDelayedActivationAssessmentClosure(assessment);
  completed.run.validateActiveDelayedCorrectionTrialClosure(activeDelayedTrial);
  assert.equal(assessment.candidateRef, candidate.reference);
  assert.equal(
    assessment.activationBasisType, "same_candidate_scoped_correction_evidence"
  );
  assert.deepEqual(Object.keys(assessment.checkResults), candidate.activationRequirements);
  assert.equal(
    Object.values(assessment.checkResults).every((result) => result.status === "passed"),
    true
  );
  assert.equal(assessment.overallStatus, "sufficient");
  assert.equal(activeDelayedTrial.candidateRef, candidate.reference);
  assert.equal(activeDelayedTrial.activationAssessmentRef, assessment.reference);
  assert.equal(activeDelayedTrial.currentStatus, "active");
  assert.equal(activeDelayedTrial.userPreference, "not_established");
  assert.equal(activeDelayedTrial.globalPolicy, "not_established");
  assert.equal(activeDelayedTrial.durableAdaptation, "unsupported_in_selected_slice");
  assert.deepEqual(activeDelayedTrial.retainedStateRefs, {
    candidate: candidate.reference,
    correctionState: completed.correctionState.reference,
    directDisposition: completed.disposition.reference
  });
  assert.equal(candidate.lifecycleStatus, "formed_non_active");
  assert.equal(candidate.activationStatus, "not_assessed");
  assert.equal(candidate.behaviorInfluence, "prohibited_until_activation");
  assert.equal(assessment.materialBasisRefs.some((reference) => (
    completed.run.records.get(reference)?.role === "user_response"
  )), false);
  assert.equal(completed.run.relations.filter((relation) => (
    relation.fromRef === activeDelayedTrial.reference
    && relation.relationKind === "transition_ancestry"
  )).length, 2);

  const before = structuredClone(candidate);
  completed.run.assertSourceFactConsistency([completed.input]);
  completed.run.ingest([completed.input]);
  completed.run.processCurrentInteraction();
  assert.deepEqual([...completed.run.records.values()].filter(
    (record) => record.family === "delayed_correction_candidate"
  ), [before]);
  assert.equal([...completed.run.records.values()].filter(
    (record) => record.family === "delayed_correction_activation_assessment"
  ).length, 1);
  assert.equal([...completed.run.records.values()].filter(
    (record) => record.family === "active_delayed_correction_trial"
  ).length, 1);
  assert.equal(completed.run.emitAvailableOutputs().length, 0);
});

test("delayed activation closure rejects candidate, assessment, and ancestry attacks", () => {
  const attacks = [
    ({ assessment }) => {
      assessment.checkResults.scope.reason = "stored_pass_label_only";
    },
    ({ assessment }) => {
      assessment.materialBasisRefs = assessment.materialBasisRefs.slice(1);
    },
    ({ run, assessment }) => {
      cloneRetainedTransition(run, run.records.get(assessment.createdByTransitionRef));
    },
    ({ assessment }) => {
      assessment.createdByTransitionRef = "transition_missing_delayed_assessment";
    },
    ({ run, assessment }) => {
      const response = [...run.records.values()].find(
        (record) => record.role === "user_response"
      );
      run.relations.push({
        relationKind: "support",
        fromRef: assessment.reference,
        toRef: response.reference,
        targetRole: "second_user_approval",
        effectiveOrder: assessment.createdOrder,
        createdOrder: run.records.get(assessment.createdByTransitionRef).createdOrder,
        assertedByRole: "sut"
      });
    },
    ({ trial }) => {
      trial.retainedStateRefs.correctionState = trial.retainedStateRefs.directDisposition;
    },
    ({ trial }) => {
      trial.createdByTransitionRef = "transition_missing_active_delayed_trial";
    },
    ({ run, trial }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === trial.reference
        && relation.targetRole === "activation_assessment"
      )), 1);
    },
    ({ run, trial }) => {
      run.relations.push({
        relationKind: "basis",
        fromRef: trial.reference,
        toRef: trial.retainedStateRefs.correctionState,
        targetRole: "undeclared_trial_basis",
        effectiveOrder: trial.createdOrder,
        createdOrder: run.records.get(trial.createdByTransitionRef).createdOrder,
        assertedByRole: "sut"
      });
    },
    ({ candidate }) => {
      candidate.behaviorInfluence = "allowed_before_activation";
    },
    ({ candidate }) => {
      candidate.createdByTransitionRef = "transition_missing_delayed_candidate";
    }
  ];
  for (const attack of attacks) {
    const completed = directCorrectionRealizedRun();
    const candidate = [...completed.run.records.values()].find(
      (record) => record.family === "delayed_correction_candidate"
    );
    const assessment = [...completed.run.records.values()].find(
      (record) => record.family === "delayed_correction_activation_assessment"
    );
    const trial = [...completed.run.records.values()].find(
      (record) => record.family === "active_delayed_correction_trial"
    );
    attack({ run: completed.run, candidate, assessment, trial });
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(
      () => completed.run.validateActiveDelayedCorrectionTrialClosure(trial),
      /Delayed-correction|delayed-correction|Active delayed/
    );
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
});

test("delayed candidate requires the completed focused and direct realization lineage", () => {
  const directOnly = directCorrectionDecisionRun({ withFocusedPrefix: false });
  const directFact = directRealizationInput(directOnly.disposition.reference);
  directOnly.run.assertSourceFactConsistency([directFact]);
  directOnly.run.ingest([directFact]);
  directOnly.run.processCurrentInteraction();
  assert.equal([...directOnly.run.records.values()].some(
    (record) => record.family === "delayed_correction_candidate"
  ), false);

  for (const attack of [
    ({ candidate }) => { candidate.activationStatus = "sufficient"; },
    ({ candidate }) => { candidate.proposedScope.taskMode = "focused_production_drill"; },
    ({ candidate }) => { candidate.directDispositionRef = candidate.focusedDispositionRef; },
    ({ run, candidate }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === candidate.reference
        && relation.targetRole === "prior_focused_outcome"
      )), 1);
    },
    ({ run, candidate }) => {
      cloneRetainedTransition(run, run.records.get(candidate.createdByTransitionRef));
    }
  ]) {
    const completed = directCorrectionRealizedRun();
    const candidate = [...completed.run.records.values()].find(
      (record) => record.family === "delayed_correction_candidate"
    );
    attack({ run: completed.run, candidate });
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(
      () => completed.run.validateDelayedCorrectionCandidateClosure(candidate),
      /Delayed-correction candidate|Direct current-session|Focused|retained creating/
    );
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
});

test("later spontaneous use rechecks applicability before selecting delayed correction", () => {
  const later = laterUseRun();
  assert.ok(later.assessment);
  assert.ok(later.laterDisposition);
  later.run.validateLaterUseAssessmentClosure(later.assessment);
  later.run.validateLaterDispositionClosure(later.laterDisposition);
  assert.equal(later.assessment.activeTrialRef, later.activeTrial.reference);
  assert.equal(later.assessment.applicabilityResult, "applicable");
  assert.equal(
    later.assessment.selectedBehavior, "delay_minor_correction_until_turn_completion"
  );
  assert.equal(later.laterDisposition.activeTrialRef, later.activeTrial.reference);
  assert.equal(later.laterDisposition.globalPolicy, "not_established");
  const projection = laterStateProjection(later.run, later.assessment);
  assert.equal(projection.family, "lineage_preserving_projection");
  assert.equal(projection.projectionTargetRef, later.activeTrial.reference);
  assert.equal(projection.sourceReferenceFactRef, later.assessment.stateReferenceFactRef);
  assert.equal(projection.projectionRule, "same_run_opaque_reference_identity");
  assert.equal(projection.viewIdentity, "active_delayed_trial_effective_state");
  assert.equal(projection.semanticContribution, "none_reference_only");
  assert.deepEqual(projection.effectiveTargetState, {
    targetRef: later.activeTrial.reference,
    lifecycleVersion: later.activeTrial.lifecycleVersion,
    currentStatus: later.activeTrial.currentStatus,
    activeScope: later.activeTrial.activeScope,
    correctionPath: later.activeTrial.correctionPath
  });
  assert.deepEqual(later.run.relations.filter((relation) => (
    relation.fromRef === projection.reference
  )).map((relation) => [relation.relationKind, relation.toRef, relation.targetRole]), [
    ["projection_of", later.activeTrial.reference, "active_delayed_correction_trial"],
    ["basis", later.assessment.stateReferenceFactRef, "opaque_state_reference_fact"]
  ]);
  const outputs = later.run.emitAvailableOutputs();
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].kind, "later_delayed_correction_request");
  assert.equal(outputs[0].requestedRef, later.laterDisposition.reference);
  const realization = {
    sourceFactRef: sourceRef(), kind: "simulator_behavior_realization",
    sourceActor: "simulated-dependency", occurrenceOrder: 33,
    requestedRef: later.laterDisposition.reference,
    requestedBehavior: "delay_minor_correction_until_turn_completion",
    realizedBehavior: "delay_minor_correction_until_turn_completion",
    fidelity: "match", mismatchOrigin: null
  };
  later.run.assertSourceFactConsistency([realization]);
  later.run.ingest([realization]);
  later.run.processCurrentInteraction();
  const fact = [...later.run.records.values()].find((record) => (
    record.role === "simulator_behavior_realization"
    && record.payload.requestedRef === later.laterDisposition.reference
  ));
  const closure = later.run.resolveLaterRealizationClosure(
    later.laterDisposition.reference, fact.reference
  );
  assert.equal(closure.fact.reference, fact.reference);
  assert.deepEqual(later.run.emitAvailableOutputs(), []);
  assert.equal([...later.run.records.values()].some((record) => (
    ["later_outcome", "explanation_support"].includes(record.family)
  )), false);
});

test("drill opt-in makes the same active delayed trial explicitly inapplicable", () => {
  const later = laterUseRun({ counterfactual: true });
  assert.ok(later.assessment);
  later.run.validateLaterUseAssessmentClosure(later.assessment);
  assert.equal(later.assessment.activeTrialRef, later.activeTrial.reference);
  assert.equal(later.assessment.applicabilityResult, "not_applicable");
  assert.equal(
    later.assessment.reason, "focused_drill_explicit_immediate_correction_excluded"
  );
  assert.equal(later.assessment.selectedBehavior, null);
  assert.equal(later.assessment.behaviorInfluence, "prohibits_delayed_correction_here");
  assert.equal(later.laterDisposition, undefined);
  assert.deepEqual(later.run.emitAvailableOutputs(), []);
  assert.equal(later.activeTrial.currentStatus, "active");
  const projection = laterStateProjection(later.run, later.assessment);
  assert.equal(projection.projectionTargetRef, later.activeTrial.reference);
  assert.equal(projection.sourceReferenceFactRef, later.assessment.stateReferenceFactRef);
  assert.equal(later.run.relations.some((relation) => (
    relation.fromRef === projection.reference
    && relation.relationKind === "projection_of"
    && relation.toRef === later.activeTrial.reference
    && relation.targetRole === "active_delayed_correction_trial"
  )), true);
  assert.equal([...later.run.records.values()].some((record) => (
    ["narrowing", "supersession", "retirement"].includes(record.family)
  )), false);
});

test("later-use closures reject envelope, attribution, and support corruption passively", () => {
  const canonicalAttacks = [
    ({ assessment }) => { assessment.oracleResult = "applicable"; },
    ({ run, assessment }) => {
      run.records.get(assessment.createdByTransitionRef).oracleResult = "applicable";
    },
    ({ run, laterDisposition }) => {
      run.records.get(laterDisposition.createdByTransitionRef).result = "accepted";
    },
    ({ run, assessment }) => {
      const relation = run.relations.find((candidate) => (
        candidate.fromRef === assessment.reference
        && candidate.relationKind === "applicability"
      ));
      run.relations.push(structuredClone(relation));
    },
    ({ run, assessment }) => {
      run.records.get(assessment.interactionRef).oracleBranch = "later_use";
    },
    ({ run, assessment }) => {
      laterStateProjection(run, assessment).projectionRule = "trust_fixture_state";
    },
    ({ run, assessment }) => {
      laterStateProjection(run, assessment).viewIdentity = "fixture_declared_state";
    },
    ({ run, assessment }) => {
      laterStateProjection(run, assessment).effectiveTargetState.currentStatus = "retired";
    },
    ({ run, assessment }) => {
      laterStateProjection(run, assessment).projectionTargetRef = createReference("state");
    },
    ({ run, assessment }) => {
      const projection = laterStateProjection(run, assessment);
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === projection.reference && relation.relationKind === "projection_of"
      )), 1);
    },
    ({ run, assessment }) => {
      const projection = laterStateProjection(run, assessment);
      run.relations.find((relation) => (
        relation.fromRef === projection.reference && relation.relationKind === "projection_of"
      )).toRef = createReference("state");
    },
    ({ run, assessment }) => {
      const projection = laterStateProjection(run, assessment);
      run.relations.find((relation) => (
        relation.fromRef === projection.reference && relation.relationKind === "projection_of"
      )).createdOrder -= 1;
    },
    ({ run, assessment }) => {
      const projection = laterStateProjection(run, assessment);
      const reference = createReference("state");
      run.records.set(reference, { ...structuredClone(projection), reference });
    },
    ({ run, assessment }) => {
      const projection = laterStateProjection(run, assessment);
      const clone = cloneRetainedTransition(run, run.records.get(
        projection.createdByTransitionRef
      ));
      projection.createdByTransitionRef = clone.reference;
    },
    ({ run, assessment }) => {
      const projection = laterStateProjection(run, assessment);
      cloneRetainedTransition(run, run.records.get(projection.createdByTransitionRef));
    }
  ];
  for (const attack of canonicalAttacks) {
    const later = laterUseRun();
    attack(later);
    const before = retainedMutationSnapshot(later.run);
    assert.throws(() => later.run.emitAvailableOutputs());
    assert.deepEqual(retainedMutationSnapshot(later.run), before);
  }

  const counterfactual = laterUseRun({ counterfactual: true });
  const assertion = [...counterfactual.run.records.values()].find((record) => (
    record.family === "attributed_assertion"
    && record.interactionRef === counterfactual.assessment.interactionRef
  ));
  assertion.epistemicStatus = "accepted_user_preference";
  const before = retainedMutationSnapshot(counterfactual.run);
  assert.throws(() => counterfactual.run.validateLaterUseAssessmentClosure(
    counterfactual.assessment
  ));
  assert.deepEqual(retainedMutationSnapshot(counterfactual.run), before);

  const rewrittenCreator = laterUseRun({ counterfactual: true });
  const rewrittenAssertion = [...rewrittenCreator.run.records.values()].find((record) => (
    record.family === "attributed_assertion"
    && record.interactionRef === rewrittenCreator.assessment.interactionRef
  ));
  rewrittenAssertion.createdByTransitionRef = createReference("transition");
  const rewrittenBefore = retainedMutationSnapshot(rewrittenCreator.run);
  assert.throws(() => rewrittenCreator.run.validateLaterUseAssessmentClosure(
    rewrittenCreator.assessment
  ));
  assert.deepEqual(retainedMutationSnapshot(rewrittenCreator.run), rewrittenBefore);
});

test("later realization has one ingestion creator and rejects competing evidence", () => {
  const later = laterUseRun();
  const input = {
    sourceFactRef: sourceRef(), kind: "simulator_behavior_realization",
    sourceActor: "simulated-dependency", occurrenceOrder: 33,
    requestedRef: later.laterDisposition.reference,
    requestedBehavior: "delay_minor_correction_until_turn_completion",
    realizedBehavior: "delay_minor_correction_until_turn_completion",
    fidelity: "match", mismatchOrigin: null
  };
  later.run.assertSourceFactConsistency([input]);
  later.run.ingest([input]);
  later.run.processCurrentInteraction();
  const fact = [...later.run.records.values()].find((record) => (
    record.role === "simulator_behavior_realization"
    && record.payload.requestedRef === later.laterDisposition.reference
  ));
  const transition = [...later.run.records.values()].find((record) => (
    record.transitionKind === "record_later_delayed_correction_realization"
  ));
  const relation = later.run.relations.find((candidate) => (
    candidate.relationKind === "realization" && candidate.fromRef === fact.reference
  ));
  assert.deepEqual(transition.resultReferences, []);
  assert.notEqual(fact.createdByTransitionRef, transition.reference);
  assert.equal(relation.effectiveOrder, transition.createdOrder);
  cloneRetainedTransition(later.run, transition);
  const before = retainedMutationSnapshot(later.run);
  assert.throws(() => later.run.resolveLaterRealizationClosure(
    later.laterDisposition.reference, fact.reference
  ));
  assert.deepEqual(retainedMutationSnapshot(later.run), before);

  const partial = laterUseRun();
  const partialInput = {
    ...input, sourceFactRef: sourceRef(), requestedRef: partial.laterDisposition.reference
  };
  partial.run.assertSourceFactConsistency([partialInput]);
  partial.run.ingest([partialInput]);
  const partialFact = [...partial.run.records.values()].find((record) => (
    record.role === "simulator_behavior_realization"
    && record.payload.requestedRef === partial.laterDisposition.reference
  ));
  const ingestion = partial.run.records.get(
    partial.run.records.get(partialFact.firstInteractionRef).createdByTransitionRef
  );
  cloneRetainedTransition(partial.run, ingestion, {
    transitionKind: "record_later_delayed_correction_realization",
    inputReferences: [partial.laterDisposition.reference],
    resultReferences: [],
    result: "partial_claim"
  });
  const partialBefore = retainedMutationSnapshot(partial.run);
  assert.throws(() => partial.run.processCurrentInteraction());
  assert.deepEqual(retainedMutationSnapshot(partial.run), partialBefore);
});

test("later outcome remains intervention-conditioned with non-exhaustive uncertainty", () => {
  const completed = laterOutcomeRun();
  const closure = completed.run.validateLaterOutcomeClosure(completed.outcome);
  assert.equal(closure.outcome.activeTrialRef, completed.activeTrial.reference);
  assert.equal(
    closure.outcome.classification,
    "intervention_conditioned_observed_association"
  );
  assert.equal(closure.outcome.causalScope, "association_only_not_causal_proof");
  assert.deepEqual(closure.outcome.coInterventionStatus, {
    zoeyAvailable: "none_supplied",
    completeness: "non_exhaustive_for_private_or_unobserved_causes"
  });
  assert.equal(closure.uncertainty.alternativeCauses, "private_or_unobserved_not_excluded");
  assert.deepEqual(closure.uncertainty.unsupportedClaims, [
    "causal_theory", "long_term_learning_efficacy", "fatigue_status",
    "global_voice_preference", "fixed_learning_style"
  ]);
});

test("later outcome creation requires exact realized behavior and complete raw bundle", () => {
  {
    const realized = laterRealizedRun();
    realized.realizationFact.payload.realizedBehavior = "mid_sentence_correction";
    const inputs = laterOutcomeInputs();
    realized.run.assertSourceFactConsistency(inputs);
    realized.run.ingest(inputs);
    const before = retainedMutationSnapshot(realized.run);
    assert.throws(() => realized.run.processCurrentInteraction());
    assert.deepEqual(retainedMutationSnapshot(realized.run), before);
    assert.equal([...realized.run.records.values()].some(
      (record) => record.family === "later_outcome"
    ), false);
  }
  {
    const realized = laterRealizedRun();
    const [comparative] = laterOutcomeInputs();
    realized.run.assertSourceFactConsistency([comparative]);
    realized.run.ingest([comparative]);
    const before = retainedMutationSnapshot(realized.run);
    assert.throws(() => realized.run.processCurrentInteraction(), /exact three-fact bundle/);
    assert.deepEqual(retainedMutationSnapshot(realized.run), before);
  }
});

test("later outcome closure rejects promotion, substitution, and creator ambiguity passively", () => {
  const attacks = [
    ({ outcome }) => { outcome.causalScope = "causal_proof"; },
    ({ outcome }) => { outcome.fixedLearningStyle = "established"; },
    ({ outcome }) => { outcome.coInterventionStatus.completeness = "exhaustive"; },
    ({ uncertainty }) => { uncertainty.alternativeCauses = "excluded"; },
    ({ run, outcome }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === outcome.reference
        && relation.targetRole === "comparative_speaking_observation"
      )), 1);
    },
    ({ run, uncertainty }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === uncertainty.reference
        && relation.targetRole === "reported_feedback"
      )), 1);
    },
    ({ run, uncertainty, outcome }) => {
      run.relations.push({
        relationKind: "support", fromRef: uncertainty.reference,
        toRef: outcome.reference, targetRole: "undeclared_uncertainty_support",
        effectiveOrder: uncertainty.createdOrder,
        createdOrder: run.records.get(uncertainty.createdByTransitionRef).createdOrder,
        assertedByRole: "sut"
      });
    },
    ({ run, uncertainty }) => {
      cloneRetainedTransition(run, run.records.get(uncertainty.createdByTransitionRef));
    }
  ];
  for (const attack of attacks) {
    const completed = laterOutcomeRun();
    attack(completed);
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(() => completed.run.validateLaterOutcomeClosure(completed.outcome));
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
});

test("grounded explanation retains typed lineage and explicit epistemic limits", () => {
  const completed = groundedExplanationRun();
  const closure = completed.run.validateExplanationClosure(completed.support);
  assert.equal(closure.explanation.supportRef, completed.support.reference);
  assert.equal(completed.support.temporalAssessmentRefs.length, 1);
  assert.equal([...completed.run.records.values()].filter((record) => (
    record.family === "temporal_eligibility_assessment"
    && record.eligibility === "ineligible"
  )).length, 2);
  assert.equal(
    completed.support.hiddenChainOfThought, "not_required_not_retained"
  );
  assert.match(closure.explanation.userFacingText, /spontaneous practice/);
  assert.match(closure.explanation.userFacingText, /focused drill/);
  assert.match(closure.explanation.userFacingText, /not proof of cause/);
  assert.deepEqual(
    closure.limitations.map((limit) => limit.limitType),
    ["scope", "epistemic_uncertainty", "causal", "unsupported_generalization"]
  );
});

test("explanation closure rejects lineage gaps, hidden reasoning, and creator ambiguity passively", () => {
  const attacks = [
    ({ support }) => { support.temporalAssessmentRefs = []; },
    ({ run }) => {
      [...run.records.values()].find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      )).ageDays -= 1;
    },
    ({ run }) => {
      const assessment = [...run.records.values()].find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      ));
      cloneRetainedTransition(run, run.records.get(assessment.createdByTransitionRef));
    },
    ({ run }) => {
      const assessment = [...run.records.values()].find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "particle_pattern_a"
      ));
      run.records.get(assessment.createdByTransitionRef).resultReferences.push(
        assessment.reference
      );
    },
    ({ run }) => {
      const distractor = [...run.records.values()].find((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.dimension === "unrelated_dimension"
      ));
      run.records.get(distractor.createdByTransitionRef).resultReferences.push(
        distractor.reference
      );
    },
    ({ support }) => { support.focusedInstructionRef = support.focusedOutcomeRef; },
    ({ support }) => { support.hiddenChainOfThought = "retained"; },
    ({ explanation }) => {
      explanation.causalStatement = "the intervention caused improvement";
    },
    ({ run, support }) => {
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === support.reference
        && relation.targetRole === "active_delayed_correction_trial"
      )), 1);
    },
    ({ run, explanation }) => {
      cloneRetainedTransition(run, run.records.get(explanation.createdByTransitionRef));
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      assertion.createdByTransitionRef = createReference("transition");
    },
    ({ run, support }) => {
      run.records.get(support.requestAssertionRef).unexpected = "extra";
    },
    ({ run, support }) => {
      run.records.get(support.requestAssertionRef).family = "unrelated_family";
    },
    ({ run, support }) => {
      run.records.get(support.requestAssertionRef).origin = "fixture";
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.createdByTransitionRef).family = "unrelated_family";
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.createdByTransitionRef).origin = "fixture";
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.createdByTransitionRef).result = "malformed";
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.createdByTransitionRef).inputReferences.push(
        support.outcomeRef
      );
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.createdByTransitionRef).resultReferences.push(
        support.outcomeRef
      );
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.createdByTransitionRef).resultReferences.push(
        assertion.reference
      );
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.records.get(assertion.sourceActorRef).sourceActor = "substituted-user";
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === assertion.reference && relation.relationKind === "source"
      )), 1);
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      const relation = run.relations.find((candidate) => (
        candidate.fromRef === assertion.reference && candidate.relationKind === "basis"
      ));
      run.relations.push(structuredClone(relation));
    },
    ({ run, support }) => {
      const assertion = run.records.get(support.requestAssertionRef);
      const clone = structuredClone(assertion);
      clone.reference = createReference("assertion");
      run.records.set(clone.reference, clone);
    },
    ({ run, explanation }) => {
      const clone = structuredClone(explanation);
      clone.reference = createReference("state");
      run.records.set(clone.reference, clone);
    },
    ({ run, support }) => {
      const clone = structuredClone(support);
      clone.reference = createReference("state");
      run.records.set(clone.reference, clone);
    },
    ({ run, support }) => {
      const clone = structuredClone(run.records.get(support.limitationRefs.scope));
      clone.reference = createReference("state");
      run.records.set(clone.reference, clone);
    }
  ];
  for (const attack of attacks) {
    const completed = groundedExplanationRun();
    attack(completed);
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(() => completed.run.validateExplanationClosure(completed.support));
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
});

test("direct closure enforces exact creator and attribution envelopes", () => {
  const attacks = [
    ({ correctionState }) => {
      correctionState.createdByTransitionRef = createReference("transition");
    },
    ({ disposition }) => {
      disposition.createdByTransitionRef = createReference("transition");
    },
    ({ run, correctionState }) => {
      run.records.get(correctionState.attributedAssertionRef)
        .createdByTransitionRef = createReference("transition");
    },
    ({ run, correctionState, disposition }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.createdByTransitionRef).inputReferences.push(
        disposition.reference
      );
    },
    ({ run, correctionState, disposition }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.createdByTransitionRef).resultReferences.push(
        disposition.reference
      );
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.createdByTransitionRef).resultReferences.push(
        assertion.reference
      );
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.createdByTransitionRef).family = "wrong_family";
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.createdByTransitionRef).origin = "fixture";
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.createdByTransitionRef).result = "malformed";
    },
    ({ run, correctionState }) => {
      run.records.get(correctionState.attributedAssertionRef).unexpected = "extra";
    },
    ({ run, correctionState }) => {
      run.records.get(correctionState.attributedAssertionRef).family = "unrelated_family";
    },
    ({ run, correctionState }) => {
      run.records.get(correctionState.attributedAssertionRef).origin = "fixture";
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.records.get(assertion.sourceActorRef).sourceActor = "substituted-user";
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      run.relations.splice(run.relations.findIndex((relation) => (
        relation.fromRef === assertion.reference && relation.relationKind === "source"
      )), 1);
    },
    ({ run, correctionState }) => {
      const assertion = run.records.get(correctionState.attributedAssertionRef);
      const relation = run.relations.find((candidate) => (
        candidate.fromRef === assertion.reference && candidate.relationKind === "basis"
      ));
      run.relations.push(structuredClone(relation));
    }
  ];
  for (const attack of attacks) {
    const completed = directCorrectionDecisionRun({ withFocusedPrefix: false });
    attack(completed);
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(() => completed.run.emitAvailableOutputs());
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
});

test("processing rolls back partial derivation on a late integrity failure", () => {
  const completed = laterOutcomeRun();
  const request = explanationRequestInput();
  completed.run.assertSourceFactConsistency([request]);
  completed.run.ingest([request]);
  const before = retainedMutationSnapshot(completed.run);
  assert.throws(
    () => completed.run.processCurrentInteraction(),
    /temporal history basis is incomplete/
  );
  assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  assert.throws(
    () => completed.run.processCurrentInteraction(),
    /temporal history basis is incomplete/
  );
  assert.deepEqual(retainedMutationSnapshot(completed.run), before);
});

test("late direct and later-use failures roll back attribution and projection work", () => {
  {
    const completed = directCorrectionDecisionRun({ withFocusedPrefix: false });
    const inputs = [
      directContextInput(), directInterruptionInput(), directRequestInput(),
      directChronologyInput(),
      fixtureControlInput({
        control: "user_governed_constraints", value: "exhaustive_selected_slice_scope",
        occurrenceOrder: 12
      }),
      fixtureControlInput({ control: "consequence", value: "low", occurrenceOrder: 13 }),
      fixtureControlInput({ control: "reversibility", value: "reversible", occurrenceOrder: 14 })
    ];
    completed.run.assertSourceFactConsistency(inputs);
    completed.run.ingest(inputs);
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(
      () => completed.run.processCurrentInteraction(),
      /redelivery|competing current correction/
    );
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
  }
  {
    const completed = directCorrectionRealizedRun();
    const activeTrial = [...completed.run.records.values()].find(
      (record) => record.family === "active_delayed_correction_trial"
    );
    const controls = [...completed.run.records.values()].filter((record) => (
      record.family === "input_fact" && record.role === "fixture_control_fact"
      && ["user_governed_constraints", "consequence"].includes(record.payload.control)
    )).map((record) => record.payload);
    const inputs = [{
      sourceFactRef: sourceRef(), kind: "context_label", sourceActor: "fixture-driver",
      occurrenceOrder: 30, surfaceLabel: "voice_simulated",
      activity: "focused_accuracy_drill", taskMode: "focused_production_drill",
      consequence: "low", scenarioDay: 145, sessionId: "focused-opt-in-later"
    }, {
      sourceFactRef: sourceRef(), kind: "state_reference", sourceActor: "fixture-driver",
      occurrenceOrder: 31, stateRef: activeTrial.reference
    }, communicationInput({
      occurrenceOrder: 32,
      content: "For this drill, correct me immediately so I can fix each attempt.",
      context: "focused_production_drill", semanticStatusOrigin: "unclassified"
    }), ...controls];
    completed.run.assertSourceFactConsistency(inputs);
    completed.run.ingest(inputs);
    activeTrial.currentStatus = "retired";
    const interactionRef = completed.run.pendingInteractions[0].reference;
    const before = retainedMutationSnapshot(completed.run);
    assert.throws(() => completed.run.processCurrentInteraction());
    assert.deepEqual(retainedMutationSnapshot(completed.run), before);
    assert.equal([...completed.run.records.values()].some((record) => (
      record.family === "lineage_preserving_projection"
      && record.interactionRef === interactionRef
    )), false);
  }
});

test("premature explanation is processed as unavailable without wedging the run", () => {
  const run = new RunState();
  const request = explanationRequestInput();
  run.assertSourceFactConsistency([request]);
  run.ingest([request]);
  assert.doesNotThrow(() => run.processCurrentInteraction());
  assert.equal(run.pendingInteractions.length, 0);
  assert.equal([...run.records.values()].filter(
    (record) => record.family === "attributed_assertion"
  ).length, 1);
  assert.equal([...run.records.values()].some(
    (record) => record.family === "explanation_support"
  ), false);
  const followUp = communicationInput({
    occurrenceOrder: 41, content: "Continue with the practice.",
    context: "spontaneous_production", semanticStatusOrigin: "unclassified"
  });
  run.assertSourceFactConsistency([followUp]);
  run.ingest([followUp]);
  assert.doesNotThrow(() => run.processCurrentInteraction());
  assert.equal(run.pendingInteractions.length, 0);
});

test("premature explanation rejects orphan terminal artifacts without mutation", () => {
  for (const family of [
    "user_facing_explanation", "explanation_support", "explanation_limit"
  ]) {
    const run = new RunState();
    const request = explanationRequestInput();
    run.assertSourceFactConsistency([request]);
    run.ingest([request]);
    const orphan = {
      reference: createReference("state"), family, origin: "sut",
      createdOrder: run.allocateOrder()
    };
    run.records.set(orphan.reference, orphan);
    const before = retainedMutationSnapshot(run);
    assert.throws(
      () => run.processCurrentInteraction(),
      /Explanation (?:support is ambiguous|artifacts exist without an outcome)/
    );
    assert.deepEqual(retainedMutationSnapshot(run), before);
  }
});

test("multiple outstanding output families fail transparently without mutation", () => {
  const selected = selectedProposalRun();
  const controls = [
    fixtureControlInput({
      control: "user_governed_constraints", value: "exhaustive_selected_slice_scope",
      occurrenceOrder: 12
    }),
    fixtureControlInput({ control: "consequence", value: "low", occurrenceOrder: 13 }),
    fixtureControlInput({ control: "reversibility", value: "reversible", occurrenceOrder: 14 })
  ];
  selected.run.assertSourceFactConsistency(controls);
  selected.run.ingest(controls);
  selected.run.processCurrentInteraction();
  const direct = [
    directContextInput(), directInterruptionInput(), directRequestInput(),
    directChronologyInput(), ...controls
  ];
  selected.run.assertSourceFactConsistency(direct);
  selected.run.ingest(direct);
  selected.run.processCurrentInteraction();
  const before = retainedMutationSnapshot(selected.run);
  assert.throws(() => selected.run.emitAvailableOutputs(), /output ambiguity/i);
  assert.deepEqual(retainedMutationSnapshot(selected.run), before);
});

test("terminal outcome and explanation families reject unreferenced competitors", () => {
  for (const family of ["later_outcome", "outcome_uncertainty"]) {
    const completed = laterOutcomeRun();
    const clone = structuredClone([...completed.run.records.values()].find(
      (record) => record.family === family
    ));
    clone.reference = createReference("state");
    completed.run.records.set(clone.reference, clone);
    assert.throws(() => completed.run.validateLaterOutcomeClosure(completed.outcome));
  }
  for (const family of ["user_facing_explanation", "explanation_support", "explanation_limit"]) {
    const completed = groundedExplanationRun();
    const clone = structuredClone([...completed.run.records.values()].find(
      (record) => record.family === family
    ));
    clone.reference = createReference("state");
    completed.run.records.set(clone.reference, clone);
    assert.throws(() => completed.run.validateExplanationClosure(completed.support));
  }
  {
    const completed = groundedExplanationRun();
    completed.support.limitationRefs.causal = completed.support.limitationRefs.scope;
    assert.throws(() => completed.run.validateExplanationClosure(completed.support));
  }
  {
    const completed = groundedExplanationRun();
    completed.run.records.get(completed.support.createdByTransitionRef)
      .resultReferences.push(completed.support.outcomeRef);
    assert.throws(() => completed.run.validateExplanationClosure(completed.support));
  }
});

test("direct closure attacks fail without allocating order or repairing state", () => {
  {
    const decision = directCorrectionDecisionRun();
    cloneRetainedTransition(
      decision.run, decision.run.records.get(decision.disposition.createdByTransitionRef)
    );
    const before = retainedMutationSnapshot(decision.run);
    assert.throws(
      () => decision.run.emitAvailableOutputs(),
      /requires exactly one retained creating transition/
    );
    assert.deepEqual(retainedMutationSnapshot(decision.run), before);
  }
  {
    const realized = directCorrectionRealizedRun();
    const transition = [...realized.run.records.values()].find((record) => (
      record.transitionKind === "record_direct_current_session_correction_realization"
    ));
    realized.run.relations.splice(realized.run.relations.findIndex((relation) => (
      relation.fromRef === transition.reference
      && relation.targetRole === "requested_direct_correction_disposition"
    )), 1);
    const before = retainedMutationSnapshot(realized.run);
    assert.throws(() => realized.run.resolveDirectCorrectionRealizationClosure(
      realized.disposition.reference, realized.fact.reference
    ));
    assert.deepEqual(retainedMutationSnapshot(realized.run), before);
  }
  {
    const realized = directCorrectionRealizedRun();
    realized.fact.firstInteractionRef = realized.correctionState.interactionRef;
    const before = retainedMutationSnapshot(realized.run);
    assert.throws(() => realized.run.resolveDirectCorrectionRealizationClosure(
      realized.disposition.reference, realized.fact.reference
    ));
    assert.deepEqual(retainedMutationSnapshot(realized.run), before);
  }
});
