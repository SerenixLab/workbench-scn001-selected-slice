import { SUT_PUBLIC_BOUNDARY_METHODS } from "@zoey/scn001-sut-core";

import { createSourceFactReference, projectFixtureRecords } from "./fixtureProjection.js";
import {
  findExactCompletedFocusedDrillPrefix,
  findExactDirectCorrectionRealization
} from "./directCorrectionCheckpoint.js";
import { findExactDelayedCorrectionCandidate } from "./delayedCandidateCheckpoint.js";
import { findExactActiveDelayedCorrectionTrial } from "./delayedActiveCheckpoint.js";
import {
  findExactCanonicalIntervention,
  findExactLaterRealization,
  findExactLaterUse
} from "./laterUseCheckpoint.js";
import {
  findExactExplanation,
  findExactLaterOutcome
} from "./laterOutcomeCheckpoint.js";
import { findExactActiveProductionTrial } from "./productionActiveCheckpoint.js";
import { realizeAvailableOutput } from "./simulator.js";
import { createSimulatorProjector } from "./simulatorProjection.js";
import { createSourceBindingLedger } from "./sourceBindingLedger.js";

const ACCEPTANCE_FIXTURES = Object.freeze({
  "P-USER-ACCEPT": Object.freeze({ role: "user_response", sourceActor: "synthetic-user-a", occurrenceOrder: 10, data: Object.freeze({
    content: "Yes, let's try that.", context: "proposal_response"
  }) }),
  "FC-RET-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 11, data: Object.freeze({
    control: "evaluation_retention_basis", value: "named_formal_run"
  }) }),
  "FC-UGC-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 12, data: Object.freeze({
    control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
  }) }),
  "FC-CONSEQ-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 13, data: Object.freeze({
    control: "consequence", value: "low"
  }) }),
  "FC-REV-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 14, data: Object.freeze({
    control: "reversibility", value: "reversible"
  }) })
});

const FOCUSED_DRILL_OPEN_FIXTURES = Object.freeze({
  "D-001": Object.freeze({
    role: "context_label", sourceActor: "fixture-driver", occurrenceOrder: 15,
    data: Object.freeze({
      surfaceLabel: "text_simulated", activity: "japanese_practice",
      taskMode: "focused_production_drill", consequence: "low"
    })
  }),
  "D-002": Object.freeze({
    role: "communication_event", sourceActor: "synthetic-user-a", occurrenceOrder: 16,
    data: Object.freeze({
      content: "Please correct me right away during this drill.",
      context: "focused_production_drill", semanticStatusOrigin: "unclassified"
    })
  })
});

const FOCUSED_DRILL_OUTCOME_FIXTURES = Object.freeze({
  "D-003": Object.freeze({
    role: "task_observation", sourceActor: "fixture-scorer", occurrenceOrder: 17,
    data: Object.freeze({
      itemRefs: Object.freeze([
        "DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"
      ]),
      taskMode: "focused_production_drill", dimension: "particle_pattern_a",
      performance: Object.freeze({ kind: "aggregate", correctCount: 5, totalCount: 6 }),
      occurrenceScenarioDay: 135, sessionId: "focused-drill-current", sessionOrder: 3
    })
  }),
  "D-004": Object.freeze({
    role: "outcome_fact", sourceActor: "synthetic-user-a", occurrenceOrder: 18,
    data: Object.freeze({
      observation: "That helped for this drill.", context: "focused_production_drill"
    })
  })
});

const DIRECT_CORRECTION_FIXTURES = Object.freeze({
  "V-001": Object.freeze({
    role: "context_label", sourceActor: "fixture-driver", occurrenceOrder: 19,
    data: Object.freeze({
      surfaceLabel: "voice_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low",
      realVoiceStack: "absent", scenarioDay: 138,
      sessionId: "spontaneous-correction-current"
    })
  }),
  "V-002": Object.freeze({
    role: "fixture_evidence", sourceActor: "fixture-driver", occurrenceOrder: 20,
    data: Object.freeze({
      event: "over_aggressive_mid_sentence_interruption",
      context: "current_spontaneous_production_session"
    })
  }),
  "V-003": Object.freeze({
    role: "communication_event", sourceActor: "synthetic-user-a", occurrenceOrder: 21,
    data: Object.freeze({
      content: "Don't stop me mid-sentence like that here. Let me finish first.",
      context: "spontaneous_production", semanticStatusOrigin: "unclassified"
    })
  }),
  "V-004": Object.freeze({
    role: "chronology_fact", sourceActor: "fixture-driver", occurrenceOrder: 22,
    data: Object.freeze({
      scenarioDay: 138, sessionId: "spontaneous-correction-current", sessionOrder: 4,
      focusedDrillScenarioDay: 135, oldDrillPreferenceScenarioDay: 15
    })
  }),
  "FC-UGC-001": ACCEPTANCE_FIXTURES["FC-UGC-001"],
  "FC-CONSEQ-001": ACCEPTANCE_FIXTURES["FC-CONSEQ-001"],
  "FC-REV-001": ACCEPTANCE_FIXTURES["FC-REV-001"]
});

const LATER_OUTCOME_FIXTURES = Object.freeze({
  "L-003": Object.freeze({
    role: "outcome_fact", sourceActor: "fixture-scorer", occurrenceOrder: 33,
    data: Object.freeze({
      observation: "user_spoke_longer", context: "spontaneous_production",
      comparison: Object.freeze({
        metric: "speaking_duration", relation: "longer_than",
        baselineSessionId: "spontaneous-correction-current",
        currentSessionId: "spontaneous-outcome-later"
      })
    })
  }),
  "L-004": Object.freeze({
    role: "outcome_fact", sourceActor: "synthetic-user-a", occurrenceOrder: 34,
    data: Object.freeze({
      observation: "This pacing feels easier.", context: "spontaneous_production"
    })
  }),
  "L-005": Object.freeze({
    role: "material_context_change", sourceActor: "fixture-driver", occurrenceOrder: 35,
    data: Object.freeze({
      description: "no_zoey_available_co_intervention_event_supplied",
      coInterventionVisibility: "none_supplied_to_zoey",
      completeness: "non_exhaustive_for_private_or_unobserved_causes"
    })
  })
});

const EXPLANATION_FIXTURES = Object.freeze({
  "X-001": Object.freeze({
    role: "communication_event", sourceActor: "synthetic-user-a", occurrenceOrder: 36,
    data: Object.freeze({
      content: "Why are you correcting differently now?",
      context: "spontaneous_production",
      semanticStatusOrigin: "unclassified"
    })
  })
});

const RESERVED_FOCUSED_DRILL_FIXTURE_IDS = new Set([
  ...Object.keys(FOCUSED_DRILL_OPEN_FIXTURES),
  ...Object.keys(FOCUSED_DRILL_OUTCOME_FIXTURES)
]);
const RESERVED_LATER_OUTCOME_FIXTURE_IDS = new Set([
  ...Object.keys(LATER_OUTCOME_FIXTURES), ...Object.keys(EXPLANATION_FIXTURES)
]);
export function createEvaluationHarness(sutBoundary, ...extraArguments) {
  if (extraArguments.length !== 0) {
    throw new Error("The formal evaluation harness accepts only the SUT public boundary.");
  }
  return createHarnessForMechanismTests(sutBoundary);
}

export function createHarnessForMechanismTests(sutBoundary, dependencies = {}) {
  assertPublicBoundary(sutBoundary);
  const renderOutput = dependencies.renderOutput ?? realizeAvailableOutput;
  const createProjector = dependencies.createProjector ?? createSimulatorProjector;
  const createBindingLedger = dependencies.createSourceBindingLedger
    ?? createSourceBindingLedger;
  const runSourceFactReferences = new Map();
  const runSourceBindings = new Map();
  const runTransport = new Map();

  return Object.freeze({
    startRun() {
      const runRef = sutBoundary.startRun();
      runSourceFactReferences.set(runRef, new Map());
      runSourceBindings.set(runRef, createBindingLedger());
      runTransport.set(runRef, {
        routed: new Map(), projector: createProjector(), nextOrder: 1,
        acceptanceDeliveries: new Map(), focusedOpenDeliveries: new Map(),
        focusedOutcomeDeliveries: new Map(), directOpenDeliveries: new Map(),
        laterUseDeliveries: new Map(), laterOutcomeDeliveries: new Map(),
        explanationDeliveries: new Map()
      });
      return runRef;
    },

    endRun(runRef) {
      try {
        sutBoundary.endRun(runRef);
      } finally {
        runSourceBindings.get(runRef)?.clear();
        runSourceBindings.delete(runRef);
        runSourceFactReferences.delete(runRef);
        runTransport.delete(runRef);
      }
    },

    deliverFixtureRecords(runRef, fixtureRecords) {
      if (Array.isArray(fixtureRecords) && fixtureRecords.some((record) => record?.role === "user_response")) {
        throw new Error("Generic formal fixture delivery cannot deliver user_response records.");
      }
      if (Array.isArray(fixtureRecords) && fixtureRecords.some((record) => (
        RESERVED_FOCUSED_DRILL_FIXTURE_IDS.has(record?.fixtureRecordId)
        || isFocusedDrillFixtureMaterial(record)
      ))) {
        throw new Error("Focused-drill fixture records require their staged checkpoint delivery.");
      }
      if (Array.isArray(fixtureRecords) && fixtureRecords.some((record) => (
        isDirectCorrectionFixtureMaterial(record)
      ))) {
        throw new Error(
          "Spontaneous-correction fixture records require their staged prefix delivery."
        );
      }
      if (Array.isArray(fixtureRecords) && fixtureRecords.some((record) => (
        RESERVED_LATER_OUTCOME_FIXTURE_IDS.has(record?.fixtureRecordId)
        || isLaterOutcomeOrExplanationMaterial(record)
      ))) {
        throw new Error(
          "Later outcome and explanation records require their staged checkpoint delivery."
        );
      }
      return deliverProjectedFixtureRecords(runRef, fixtureRecords);
    },

    deliverFocusedDrillInputsIfEligible(runRef, fixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateExactFixtureSet(
        fixtureRecords, FOCUSED_DRILL_OPEN_FIXTURES,
        "Focused-drill opening delivery"
      );
      const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
      const activeTrial = findExactActiveProductionTrial(
        snapshot, sourceBindingEvidenceForRun(runRef)
      );
      if (!activeTrial) return Object.freeze([]);
      const prior = transport.focusedOpenDeliveries.get(activeTrial.reference);
      if (prior) return prior;
      const result = deliverProjectedFixtureRecords(runRef, fixtureRecords);
      const frozen = deepFreeze([{
        activeTrialRef: activeTrial.reference,
        acceptedInputRefs: [...result.acceptedInputRefs]
      }]);
      transport.focusedOpenDeliveries.set(activeTrial.reference, frozen);
      return frozen;
    },

    deliverProposalAcceptanceIfEligible(runRef, responseAndControlFixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateAcceptanceFixtureSet(responseAndControlFixtureRecords);
      const eligible = findEligibleRoutedRealizations(sutBoundary, runRef, transport);
      if (eligible.length === 0) return Object.freeze([]);
      if (eligible.length > 1) {
        throw new Error("Acceptance branch requires exactly one eligible routed realization.");
      }
      const { outputRef, entry } = eligible[0];
      const { record } = entry;
      const prior = transport.acceptanceDeliveries.get(outputRef);
      if (prior) return prior;
      const simulatorInput = transport.projector.project(record);
      const fixtureBatch = projectFixtureRecords(
        responseAndControlFixtureRecords,
        sourceFactReferenceForRun(runRef)
      );
      const result = ingestWithSourceBindings(
        runRef, [simulatorInput, ...fixtureBatch.inputs]
      );
      const frozen = deepFreeze([{ outputRef, acceptedInputRefs: [...result.acceptedInputRefs] }]);
      transport.acceptanceDeliveries.set(outputRef, frozen);
      return frozen;
    },

    deliverFocusedDrillOutcomeIfEligible(runRef, fixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateExactFixtureSet(
        fixtureRecords, FOCUSED_DRILL_OUTCOME_FIXTURES,
        "Focused-drill outcome delivery"
      );
      const eligible = findEligibleFocusedDrillRealizations(
        sutBoundary, runRef, transport, sourceBindingEvidenceForRun(runRef)
      );
      if (eligible.length === 0) return Object.freeze([]);
      if (eligible.length !== 1) {
        throw new Error(
          "Focused-drill realization checkpoint requires exactly one eligible disposition."
        );
      }
      const { outputRef } = eligible[0];
      const prior = transport.focusedOutcomeDeliveries.get(outputRef);
      if (prior) return prior;
      const result = deliverProjectedFixtureRecords(runRef, fixtureRecords);
      const frozen = deepFreeze([{
        outputRef,
        acceptedInputRefs: [...result.acceptedInputRefs]
      }]);
      transport.focusedOutcomeDeliveries.set(outputRef, frozen);
      return frozen;
    },

    deliverSpontaneousCorrectionInputsIfEligible(runRef, fixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateExactFixtureSet(
        fixtureRecords, DIRECT_CORRECTION_FIXTURES,
        "Spontaneous-correction opening delivery"
      );
      if (transport.directOpenDeliveries.size === 1) {
        return [...transport.directOpenDeliveries.values()][0];
      }
      const focusedRealizations = findEligibleFocusedDrillRealizations(
        sutBoundary, runRef, transport, sourceBindingEvidenceForRun(runRef)
      );
      if (focusedRealizations.length === 0) return Object.freeze([]);
      if (focusedRealizations.length !== 1) {
        throw new Error(
          "Spontaneous-correction opening requires exactly one exact focused-drill realization."
        );
      }
      const prefix = findExactCompletedFocusedDrillPrefix(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef)
      );
      if (!prefix) return Object.freeze([]);
      const prior = transport.directOpenDeliveries.get(prefix.outcome.reference);
      if (prior) return prior;
      const result = deliverProjectedFixtureRecords(runRef, fixtureRecords);
      const frozen = deepFreeze([{
        focusedDrillOutcomeRef: prefix.outcome.reference,
        acceptedInputRefs: [...result.acceptedInputRefs]
      }]);
      transport.directOpenDeliveries.set(prefix.outcome.reference, frozen);
      return frozen;
    },

    inspectDirectCorrectionRealizedCheckpoint(runRef) {
      const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
      const sourceBindings = sourceBindingEvidenceForRun(runRef);
      const closure = findExactDirectCorrectionRealization(
        snapshot, sourceBindings
      );
      if (!closure) return Object.freeze([]);
      const focusedPrefix = findExactCompletedFocusedDrillPrefix(
        snapshot, sourceBindings, {
          allowDirectCorrectionState: true,
          allowDelayedCorrectionCandidate: true,
          allowDelayedCorrectionActivation: true
        }
      );
      validateDirectCorrectionTrajectory(snapshot, focusedPrefix, closure);
      return deepFreeze([{
        correctionStateRef: closure.state.reference,
        dispositionRef: closure.disposition.reference,
        realizationFactRef: closure.fact.reference,
        realizationTransitionRef: closure.realizationTransition.reference
      }]);
    },

    inspectDelayedCorrectionCandidateCheckpoint(runRef) {
      const closure = findExactDelayedCorrectionCandidate(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef)
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        candidateRef: closure.candidate.reference,
        lifecycleStatus: closure.candidate.lifecycleStatus,
        directDispositionRef: closure.direct.disposition.reference,
        focusedOutcomeRef: closure.focused.outcome.reference
      }]);
    },

    inspectActiveDelayedCorrectionCheckpoint(runRef) {
      const closure = findExactActiveDelayedCorrectionTrial(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef)
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        candidateRef: closure.candidate.reference,
        activationAssessmentRef: closure.assessment.reference,
        activeTrialRef: closure.trial.reference,
        activationBasisType: closure.assessment.activationBasisType,
        overallStatus: closure.assessment.overallStatus,
        checkResults: structuredClone(closure.assessment.checkResults),
        activeScope: structuredClone(closure.trial.activeScope),
        currentStatus: closure.trial.currentStatus
      }]);
    },

    deliverLaterUseInputsIfEligible(runRef, fixtureRecords) {
      return deliverLaterUseBranch(runRef, fixtureRecords, "canonical_spontaneous_later_use");
    },

    deliverDrillOptInInputsIfEligible(runRef, fixtureRecords) {
      return deliverLaterUseBranch(runRef, fixtureRecords, "drill_opt_in_counterfactual");
    },

    inspectLaterDispositionCheckpoint(runRef) {
      const closure = findExactLaterUse(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        "canonical_spontaneous_later_use"
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        activeTrialRef: closure.active.trial.reference,
        applicabilityAssessmentRef: closure.assessment.reference,
        dispositionRef: closure.disposition.reference,
        applicabilityResult: closure.assessment.applicabilityResult,
        requestedBehavior: closure.disposition.requestedBehavior
      }]);
    },

    inspectDrillOptInCheckpoint(runRef) {
      const closure = findExactLaterUse(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        "drill_opt_in_counterfactual"
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        activeTrialRef: closure.active.trial.reference,
        applicabilityAssessmentRef: closure.assessment.reference,
        applicabilityResult: closure.assessment.applicabilityResult,
        reason: closure.assessment.reason
      }]);
    },

    inspectLaterRealizationCheckpoint(runRef) {
      const closure = findExactLaterRealization(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef)
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        activeTrialRef: closure.active.trial.reference,
        dispositionRef: closure.disposition.reference,
        realizationFactRef: closure.fact.reference,
        realizationTransitionRef: closure.realizationTransition.reference
      }]);
    },

    inspectCanonicalInterventionCheckpoint(runRef) {
      const closure = findExactCanonicalIntervention(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        simulatorRoutingEvidenceForRun(runRef)
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        activeTrialRef: closure.active.trial.reference,
        dispositionRef: closure.disposition.reference,
        realizationFactRef: closure.fact.reference,
        canonicalInterventionPremise: closure.canonicalInterventionPremise
      }]);
    },

    deliverLaterOutcomeIfEligible(runRef, fixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateExactFixtureSet(
        fixtureRecords, LATER_OUTCOME_FIXTURES, "Later outcome delivery"
      );
      const canonical = findExactCanonicalIntervention(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        simulatorRoutingEvidenceForRun(runRef)
      );
      if (!canonical) return Object.freeze([]);
      const prior = transport.laterOutcomeDeliveries.get(canonical.disposition.reference);
      if (prior) return prior;
      const result = deliverProjectedFixtureRecords(runRef, fixtureRecords);
      const frozen = deepFreeze([{
        dispositionRef: canonical.disposition.reference,
        realizationFactRef: canonical.fact.reference,
        acceptedInputRefs: [...result.acceptedInputRefs]
      }]);
      transport.laterOutcomeDeliveries.set(canonical.disposition.reference, frozen);
      return frozen;
    },

    inspectLaterOutcomeCheckpoint(runRef) {
      const closure = findExactLaterOutcome(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        simulatorRoutingEvidenceForRun(runRef)
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        activeTrialRef: closure.canonical.active.trial.reference,
        dispositionRef: closure.canonical.disposition.reference,
        outcomeRef: closure.outcome.reference,
        uncertaintyRef: closure.uncertainty.reference,
        classification: closure.outcome.classification,
        causalScope: closure.outcome.causalScope
      }]);
    },

    deliverExplanationPromptIfEligible(runRef, fixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateExactFixtureSet(
        fixtureRecords, EXPLANATION_FIXTURES, "Explanation prompt delivery"
      );
      const outcome = findExactLaterOutcome(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        simulatorRoutingEvidenceForRun(runRef)
      );
      if (!outcome) return Object.freeze([]);
      const prior = transport.explanationDeliveries.get(outcome.outcome.reference);
      if (prior) return prior;
      const result = deliverProjectedFixtureRecords(runRef, fixtureRecords);
      const frozen = deepFreeze([{
        outcomeRef: outcome.outcome.reference,
        acceptedInputRefs: [...result.acceptedInputRefs]
      }]);
      transport.explanationDeliveries.set(outcome.outcome.reference, frozen);
      return frozen;
    },

    inspectExplanationCheckpoint(runRef) {
      const closure = findExactExplanation(
        sutBoundary.captureInspectionSnapshot(runRef),
        sourceBindingEvidenceForRun(runRef),
        simulatorRoutingEvidenceForRun(runRef)
      );
      if (!closure) return Object.freeze([]);
      return deepFreeze([{
        outcomeRef: closure.later.outcome.reference,
        supportRef: closure.support.reference,
        explanationRef: closure.explanation.reference,
        userFacingText: closure.explanation.userFacingText,
        limitationRefs: structuredClone(closure.support.limitationRefs)
      }]);
    },

    processCurrentInteraction(runRef) {
      return sutBoundary.processCurrentInteraction(runRef);
    },

    emitAvailableOutputs(runRef) {
      return sutBoundary.emitAvailableOutputs(runRef);
    },

    realizeAvailableOutputs(runRef) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      const outputs = sutBoundary.emitAvailableOutputs(runRef);
      if (outputs.length === 0) return Object.freeze([]);
      if (outputs.length !== 1) {
        throw new Error("Harness boundary integrity requires at most one available SUT output.");
      }
      const output = outputs[0];
      const prior = transport.routed.get(output.outputRef);
      if (prior) return Object.freeze([prior.record]);
      const record = renderOutput(output, transport.nextOrder);
      const projected = transport.projector.project(record);
      const result = ingestWithSourceBindings(runRef, [projected]);
      if (!Array.isArray(result.acceptedInputRefs) || result.acceptedInputRefs.length !== 1) {
        throw new Error("Simulator routing must accept exactly one SUT input fact reference.");
      }
      transport.routed.set(output.outputRef, Object.freeze({
        output,
        record,
        simulatorFactRef: result.acceptedInputRefs[0]
      }));
      transport.nextOrder += 1;
      return Object.freeze([record]);
    },

    captureInspectionSnapshot(runRef) {
      return sutBoundary.captureInspectionSnapshot(runRef);
    }
  });

  function sourceFactReferenceForRun(runRef) {
      const sourceReferences = runSourceFactReferences.get(runRef);
      if (!sourceReferences) {
        throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      }
      return (fixtureRecordId) => {
        const existing = sourceReferences.get(fixtureRecordId);
        if (existing) {
          return existing;
        }
        const created = createSourceFactReference();
        sourceReferences.set(fixtureRecordId, created);
        return created;
      };
  }

  function simulatorRoutingEvidenceForRun(runRef) {
    const transport = runTransport.get(runRef);
    if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
    return [...transport.routed.values()].map((entry) => ({
      simulatorFactRef: entry.simulatorFactRef,
      record: structuredClone(entry.record)
    }));
  }

  function deliverProjectedFixtureRecords(runRef, fixtureRecords) {
    const sourceFactReferenceFor = sourceFactReferenceForRun(runRef);
    const { inputs } = projectFixtureRecords(fixtureRecords, sourceFactReferenceFor);
    return ingestWithSourceBindings(runRef, inputs);
  }

  function ingestWithSourceBindings(runRef, inputs) {
    const ledger = runSourceBindings.get(runRef);
    if (!ledger) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
    ledger.assertDeliveryCompatible(inputs);
    const result = sutBoundary.ingestSutVisibleInputs(runRef, { inputs });
    const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
    ledger.recordSuccessfulIngress(inputs, result, snapshot);
    return result;
  }

  function sourceBindingEvidenceForRun(runRef) {
    const ledger = runSourceBindings.get(runRef);
    if (!ledger) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
    return ledger.readOnlyEvidence();
  }

  function deliverLaterUseBranch(runRef, fixtureRecords, pathType) {
    const transport = runTransport.get(runRef);
    if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
    const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
    const active = findExactActiveDelayedCorrectionTrial(
      snapshot, sourceBindingEvidenceForRun(runRef)
    );
    if (!active) return Object.freeze([]);
    validateLaterUseFixtureSet(fixtureRecords, pathType, active.trial.reference);
    const key = `${pathType}:${active.trial.reference}`;
    const prior = transport.laterUseDeliveries.get(key);
    if (prior) return prior;
    const result = deliverProjectedFixtureRecords(runRef, fixtureRecords);
    const frozen = deepFreeze([{
      activeTrialRef: active.trial.reference,
      acceptedInputRefs: [...result.acceptedInputRefs]
    }]);
    transport.laterUseDeliveries.set(key, frozen);
    return frozen;
  }
}

function validateLaterUseFixtureSet(records, pathType, activeTrialRef) {
  const canonical = pathType === "canonical_spontaneous_later_use";
  const ids = canonical
    ? ["L-001", "L-002", "FC-UGC-001", "FC-CONSEQ-001"]
    : ["CF2-L-001", "CF2-L-002", "CF2-L-003", "FC-UGC-001", "FC-CONSEQ-001"];
  if (!Array.isArray(records) || records.length !== ids.length
    || new Set(records.map((record) => record.fixtureRecordId)).size !== ids.length
    || ids.some((id) => !records.some((record) => record.fixtureRecordId === id))) {
    throw new Error("Later-use delivery requires the exact declared bundle.");
  }
  const byId = new Map(records.map((record) => [record.fixtureRecordId, record]));
  const context = byId.get(canonical ? "L-001" : "CF2-L-001");
  const reference = byId.get(canonical ? "L-002" : "CF2-L-003");
  const userGoverned = byId.get("FC-UGC-001");
  const consequence = byId.get("FC-CONSEQ-001");
  const expectedContext = canonical ? {
    surfaceLabel: "voice_simulated", activity: "japanese_practice",
    taskMode: "spontaneous_production", consequence: "low", scenarioDay: 145,
    sessionId: "spontaneous-outcome-later"
  } : {
    surfaceLabel: "voice_simulated", activity: "focused_accuracy_drill",
    taskMode: "focused_production_drill", consequence: "low", scenarioDay: 145,
    sessionId: "focused-opt-in-later"
  };
  if (context.role !== "context_label" || context.sourceActor !== "fixture-driver"
    || context.occurrenceOrder !== 30
    || JSON.stringify(context.data) !== JSON.stringify(expectedContext)
    || reference.role !== "sut_state_reference"
    || reference.sourceActor !== "fixture-driver"
    || reference.occurrenceOrder !== (canonical ? 31 : 32)
    || reference.data.stateRef !== activeTrialRef
    || userGoverned?.role !== "fixture_control_fact"
    || userGoverned.sourceActor !== "fixture-driver"
    || userGoverned.occurrenceOrder !== 12
    || JSON.stringify(userGoverned.data) !== JSON.stringify({
      control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
    })
    || consequence?.role !== "fixture_control_fact"
    || consequence.sourceActor !== "fixture-driver"
    || consequence.occurrenceOrder !== 13
    || JSON.stringify(consequence.data) !== JSON.stringify({
      control: "consequence", value: "low"
    })) {
    throw new Error("Later-use bundle does not preserve exact scope and trial identity.");
  }
  if (!canonical) {
    const communication = byId.get("CF2-L-002");
    if (communication.role !== "communication_event"
      || communication.sourceActor !== "synthetic-user-a"
      || communication.occurrenceOrder !== 31
      || communication.data.content
        !== "For this drill, correct me immediately so I can fix each attempt."
      || communication.data.context !== "focused_production_drill"
      || communication.data.semanticStatusOrigin !== "unclassified") {
      throw new Error("Drill opt-in communication is malformed.");
    }
  }
  projectFixtureRecords(records, () => "source_00000000-0000-0000-0000-000000000000");
}

function validateDirectCorrectionTrajectory(snapshot, focusedPrefix, closure) {
  if (!focusedPrefix) {
    throw new Error(
      "Direct-correction checkpoint requires the exact completed focused-drill prefix."
    );
  }
  const records = new Map(snapshot.records.map((record) => [record.reference, record]));
  const focusedOutcomeTransition = records.get(
    focusedPrefix.outcome.createdByTransitionRef
  );
  const directIngestion = records.get(closure.state.ingestionTransitionRef);
  const activationAssessment = records.get(
    focusedPrefix.activeTrial.activationAssessmentRef
  );
  const retainedControlRefs = new Set(
    Object.values(activationAssessment?.controlBasisRefs ?? {})
      .flatMap((inventory) => Object.values(inventory ?? {}))
      .flat()
  );
  const directControlRefs = Object.values(closure.state.controlBasisRefs ?? {});
  const priorFocusedRefs = new Set([
    focusedPrefix.activeTrial.reference,
    focusedPrefix.instruction.reference,
    focusedPrefix.disposition.reference,
    focusedPrefix.realizationFact.reference,
    focusedPrefix.outcome.realizationTransitionRef,
    focusedPrefix.outcome.reference
  ]);
  const directRefs = new Set([
    closure.state.reference,
    closure.disposition.reference,
    closure.fact.reference,
    closure.realizationTransition.reference
  ]);
  const lifecycleKinds = new Set([
    "conflict", "correction", "deletion", "erasure", "forgetting", "narrowing",
    "redaction", "retirement", "revocation", "supersession"
  ]);
  const collapsedScopes = snapshot.relations.some((relation) => (
    lifecycleKinds.has(relation.relationKind)
      && ((priorFocusedRefs.has(relation.fromRef) && directRefs.has(relation.toRef))
        || (directRefs.has(relation.fromRef) && priorFocusedRefs.has(relation.toRef)))
  ));
  if (!focusedOutcomeTransition
    || !directIngestion
    || focusedOutcomeTransition.createdOrder >= directIngestion.createdOrder
    || directControlRefs.length !== 3
    || directControlRefs.some((reference) => !retainedControlRefs.has(reference))
    || collapsedScopes) {
    throw new Error(
      "Direct-correction checkpoint does not preserve the exact prior focused-drill trajectory."
    );
  }
}

function validateAcceptanceFixtureSet(records) {
  if (!Array.isArray(records) || records.length !== 5) {
    throw new Error("Acceptance delivery requires the exact five-record response/control set.");
  }
  const byId = new Map(records.map((record) => [record?.fixtureRecordId, record]));
  if (byId.size !== 5 || Object.keys(ACCEPTANCE_FIXTURES).some((id) => !byId.has(id))) {
    throw new Error("Acceptance delivery requires exact package-local fixture identities.");
  }
  for (const [id, expected] of Object.entries(ACCEPTANCE_FIXTURES)) {
    const record = byId.get(id);
    projectFixtureRecords([record], () => "source_00000000-0000-0000-0000-000000000000");
    if (record.role !== expected.role) throw new Error(`Invalid role for ${id}.`);
    if (record.sourceActor !== expected.sourceActor) throw new Error(`Invalid source actor for ${id}.`);
    if (record.occurrenceOrder !== expected.occurrenceOrder) throw new Error(`Invalid occurrence order for ${id}.`);
    if (JSON.stringify(record.data) !== JSON.stringify(expected.data)) {
      throw new Error(`Invalid package-local content for ${id}.`);
    }
  }
}

function findEligibleRoutedRealizations(sutBoundary, runRef, transport) {
  const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
  return [...transport.routed.entries()].flatMap(([outputRef, entry]) => {
    const { record, simulatorFactRef } = entry;
    if (transport.acceptanceDeliveries.has(outputRef)) return [{ outputRef, entry }];
    if (record.fidelity !== "match"
      || record.requestedMaterialIntent !== "offer_scoped_trial_for_user_decision"
      || record.requestedCandidateMaterialIntent !== "practice_spontaneous_production_for_target_dimension"
      || record.requestedScope.taskMode !== "spontaneous_production"
      || JSON.stringify(record.realizedMaterialIntent) !== JSON.stringify({
        materialIntent: record.requestedMaterialIntent,
        candidateMaterialIntent: record.requestedCandidateMaterialIntent,
        proposedScope: record.requestedScope
      })) return [];
    const proposal = exactRecord(snapshot, record.requestedRef, "proposal");
    const candidate = exactRecord(snapshot, record.candidateRef, "candidate");
    const affordance = exactRecord(snapshot, candidate?.trialDirectionRef, "trial direction");
    const candidateTransition = exactRecord(snapshot, candidate?.createdByTransitionRef, "candidate transition");
    const proposalTransition = exactRecord(snapshot, proposal?.createdByTransitionRef, "proposal transition");
    const proposalInteraction = exactRecord(snapshot, proposal?.interactionRef, "proposal interaction");
    const simulatorFact = exactRecord(snapshot, simulatorFactRef, "routed simulator fact");
    const transitions = snapshot.records.filter((item) => item.transitionKind === "record_proposal_realization"
      && (item.inputReferences?.includes(simulatorFactRef) || item.inputReferences?.includes(record.requestedRef)));
    const realizations = snapshot.relations.filter((relation) => relation.relationKind === "realization"
      && (relation.fromRef === simulatorFactRef || relation.toRef === record.requestedRef));
    if (transitions.length === 0 && realizations.length === 0) return [];
    const selection = exactRecord(snapshot, outputRef, "proposal selection");
    const transition = exactlyOne(transitions, "recording transition");
    const realization = exactlyOne(realizations, "realization relation");
    const factBasis = snapshot.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis" && relation.targetRole === "simulator_realization_fact");
    const selectionBasis = snapshot.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis" && relation.targetRole === "proposal_realization_selection");
    const recordingBases = snapshot.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis");
    const directionBasis = snapshot.relations.filter((relation) => relation.fromRef === candidate.reference
      && relation.relationKind === "basis" && relation.targetRole === "selected_trial_direction");
    const ancestry = snapshot.relations.filter((relation) => relation.fromRef === proposal.reference
      && relation.relationKind === "transition_ancestry");
    const copiedProposalEvidence = snapshot.relations.filter((relation) => relation.fromRef === proposal.reference
      && ["basis", "support"].includes(relation.relationKind));
    const proposalCandidateBasis = snapshot.relations.filter((relation) => (
      relation.fromRef === proposalTransition?.reference && relation.relationKind === "basis"
    ));
    const selectionIntentBasis = snapshot.relations.filter((relation) => relation.fromRef === selection.reference
      && relation.relationKind === "basis" && relation.targetRole === "selected_proposal_intent");
    const selectionBases = snapshot.relations.filter((relation) => relation.fromRef === selection.reference
      && relation.relationKind === "basis");
    const factInteraction = exactRecord(snapshot, simulatorFact?.firstInteractionRef, "simulator interaction");
    const valid = proposal?.family === "proposal_intent" && proposal.origin === "sut"
      && proposal.proposalType === "candidate_bound_trial_offer"
      && proposal.materialIntent === "offer_scoped_trial_for_user_decision"
      && proposal.candidateRef === candidate?.reference
      && proposal.candidateMaterialIntent === candidate?.materialIntent
      && JSON.stringify(proposal.proposedScope) === JSON.stringify(candidate?.proposedScope)
      && proposal.responseExpectation === "candidate_bound_trial_decision"
      && proposal.statusOrigin === "sut_transition"
      && proposalTransition?.family === "sut_transition_evidence" && proposalTransition.origin === "sut"
      && proposalTransition.transitionKind === "form_candidate_bound_proposal_intent"
      && proposalTransition.result === "proposal_intent_formed"
      && JSON.stringify(proposalTransition.inputReferences) === JSON.stringify([candidate.reference])
      && JSON.stringify(proposalTransition.resultReferences) === JSON.stringify([proposal.reference])
      && proposalTransition.interactionRef === proposal.interactionRef
      && proposalInteraction?.family === "interaction_segment" && proposalInteraction.origin === "sut"
      && proposal.interactionRef === candidate.interactionRef
      && candidate.createdOrder < candidateTransition.createdOrder
      && candidateTransition.createdOrder < proposal.createdOrder
      && proposal.createdOrder < proposalTransition.createdOrder
      && proposalTransition.createdOrder > candidateTransition.createdOrder
      && proposalCandidateBasis.length === 1
      && proposalCandidateBasis[0].toRef === candidate.reference
      && proposalCandidateBasis[0].targetRole === "proposal_candidate"
      && proposalCandidateBasis[0].assertedByRole === "sut"
      && proposalCandidateBasis[0].effectiveOrder === proposalTransition.createdOrder
      && proposalCandidateBasis[0].createdOrder === proposalTransition.createdOrder
      && ancestry.length === 1 && ancestry[0].toRef === candidate.reference
      && ancestry[0].targetRole === "candidate" && ancestry[0].assertedByRole === "sut"
      && ancestry[0].effectiveOrder === proposal.createdOrder
      && ancestry[0].createdOrder === proposalTransition.createdOrder
      && copiedProposalEvidence.length === 0
      && candidate?.family === "trial_candidate" && candidate.origin === "sut"
      && candidate.candidateType === "production_focused_practice"
      && candidate?.materialIntent === "practice_spontaneous_production_for_target_dimension"
      && candidate.candidateSource === "sut_transition"
      && candidate.purpose === "provisional_evaluative_trial"
      && candidate?.lifecycleStatus === "formed_non_active" && candidate?.lifecycleVersion === 1
      && candidate.statusOrigin === "sut_transition"
      && candidate?.proposedScope?.taskMode === "spontaneous_production"
      && JSON.stringify(candidate.proposedScope) === JSON.stringify(record.requestedScope)
      && candidateTransition?.family === "sut_transition_evidence" && candidateTransition.origin === "sut"
      && candidateTransition.transitionKind === "form_or_withhold_production_focused_candidate"
      && candidateTransition.result === "candidate_formed"
      && candidateTransition.interactionRef === candidate.interactionRef
      && candidateTransition.inputReferences?.includes(affordance.reference)
      && candidateTransition.resultReferences?.includes(candidate.reference)
      && affordance?.family === "input_fact" && affordance.origin === "fixture"
      && affordance.role === "affordance_fact" && affordance?.payload?.direction === "TRIAL-PROD-FOCUS"
      && directionBasis.length === 1 && directionBasis[0].toRef === affordance.reference
      && directionBasis[0].assertedByRole === "sut"
      && directionBasis[0].effectiveOrder === candidate.createdOrder
      && directionBasis[0].createdOrder === candidateTransition.createdOrder
      && simulatorFact?.family === "input_fact" && simulatorFact.origin === "simulator"
      && simulatorFact.role === "simulator_realization"
      && simulatorFact.payload.requestedRef === proposal.reference
      && simulatorFact.payload.realizedBehavior === record.realizedBehavior
      && simulatorFact.payload.fidelity === record.fidelity
      && simulatorFact.sourceFactRef === transport.projector.project(record).sourceFactRef
      && factInteraction?.family === "interaction_segment"
      && factInteraction.inputReferences?.includes(simulatorFact.reference)
      && selection?.family === "sut_transition_evidence"
      && selection.transitionKind === "select_proposal_for_realization"
      && selection.origin === "sut" && selection.result === "proposal_selected_for_realization"
      && JSON.stringify(selection.inputReferences) === JSON.stringify([proposal.reference])
      && selection.resultReferences?.length === 0
      && selection.interactionRef === proposal.interactionRef
      && selection.createdOrder > proposalTransition.createdOrder && selection.createdOrder < simulatorFact.createdOrder
      && selectionIntentBasis.length === 1 && selectionIntentBasis[0].toRef === proposal.reference
      && selectionBases.length === 1
      && selectionIntentBasis[0].assertedByRole === "sut"
      && selectionIntentBasis[0].createdOrder === selection.createdOrder
      && selectionIntentBasis[0].effectiveOrder === selection.createdOrder
      && transition.family === "sut_transition_evidence" && transition.origin === "sut"
      && transition.transitionKind === "record_proposal_realization"
      && transition.interactionRef === factInteraction.reference
      && transition.result === "proposal_realization_recorded"
      && JSON.stringify(transition.inputReferences) === JSON.stringify([simulatorFactRef, outputRef, proposal.reference])
      && transition.resultReferences?.length === 0 && transition.createdOrder > simulatorFact.createdOrder
      && realization.fromRef === simulatorFactRef && realization.toRef === proposal.reference
      && realization.targetRole === "proposal_intent" && realization.assertedByRole === "sut"
      && realization.fromRef !== realization.toRef
      && realization.createdOrder === transition.createdOrder && realization.effectiveOrder === transition.createdOrder
      && factBasis.length === 1 && factBasis[0].toRef === simulatorFactRef
      && recordingBases.length === 2
      && factBasis[0].assertedByRole === "sut" && factBasis[0].createdOrder === transition.createdOrder
      && factBasis[0].effectiveOrder === transition.createdOrder
      && selectionBasis.length === 1 && selectionBasis[0].toRef === outputRef
      && selectionBasis[0].assertedByRole === "sut" && selectionBasis[0].createdOrder === transition.createdOrder
      && selectionBasis[0].effectiveOrder === transition.createdOrder;
    if (!valid) throw new Error("Acceptance branch boundary integrity requires an exact P/S/F/R/E checkpoint.");
    return [{ outputRef, entry }];
  });
}

function findEligibleFocusedDrillRealizations(
  sutBoundary, runRef, transport, sourceBindingEvidence
) {
  const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
  const activeTrial = findExactActiveProductionTrial(snapshot, sourceBindingEvidence);
  if (!activeTrial) return [];
  return [...transport.routed.entries()].flatMap(([outputRef, entry]) => {
    const { output, record, simulatorFactRef } = entry;
    if (record.role !== "simulated_behavior_realization_fact") return [];
    if (record.requestedBehavior !== "immediate_correction"
      || record.realizedBehavior !== "immediate_correction"
      || record.fidelity !== "match" || record.mismatchOrigin !== null) return [];
    const disposition = exactRecord(snapshot, record.requestedRef, "focused-drill disposition");
    const instruction = exactRecord(snapshot, disposition?.instructionRef, "drill instruction");
    const context = exactRecord(snapshot, disposition?.contextRef, "focused-drill context");
    const communication = exactRecord(
      snapshot, instruction?.sourceCommunicationRef, "focused-drill request"
    );
    const assertion = exactRecord(
      snapshot, instruction?.attributedAssertionRef, "focused-drill attribution"
    );
    const instructionActor = exactRecord(
      snapshot, instruction?.sourceActorRef, "focused-drill request actor"
    );
    const attributionTransition = uniqueCreatingTransition(
      snapshot, assertion, "focused-drill attribution"
    );
    const instructionTransition = uniqueCreatingTransition(
      snapshot, instruction, "focused-drill instruction"
    );
    const dispositionTransition = uniqueCreatingTransition(
      snapshot, disposition, "focused-drill disposition"
    );
    const fact = exactRecord(snapshot, simulatorFactRef, "focused-drill simulator fact");
    const transitions = snapshot.records.filter((item) => (
      item.transitionKind === "record_focused_drill_realization"
      && (item.inputReferences?.includes(simulatorFactRef)
        || item.inputReferences?.includes(disposition.reference))
    ));
    const realizationRelations = snapshot.relations.filter((relation) => (
      relation.relationKind === "realization"
      && (relation.fromRef === simulatorFactRef || relation.toRef === disposition.reference)
    ));
    if (transitions.length === 0 && realizationRelations.length === 0) return [];
    const transition = exactlyOne(transitions, "focused-drill recording transition");
    const realization = exactlyOne(realizationRelations, "focused-drill realization relation");
    const bases = snapshot.relations.filter((relation) => (
      relation.fromRef === transition.reference && relation.relationKind === "basis"
    ));
    const instructionBases = snapshot.relations.filter((relation) => (
      relation.fromRef === instruction.reference && relation.relationKind === "basis"
    ));
    const instructionSources = snapshot.relations.filter((relation) => (
      relation.fromRef === instruction.reference && relation.relationKind === "source"
    ));
    const assertionBases = snapshot.relations.filter((relation) => (
      relation.fromRef === assertion.reference && relation.relationKind === "basis"
    ));
    const assertionSources = snapshot.relations.filter((relation) => (
      relation.fromRef === assertion.reference && relation.relationKind === "source"
    ));
    const dispositionBases = snapshot.relations.filter((relation) => (
      relation.fromRef === disposition.reference && relation.relationKind === "basis"
    ));
    const projected = transport.projector.project(record);
    const valid = hasExactKeys(output, [
      "kind", "outputRef", "requestedRef", "requestedBehavior", "drillScope"
    ]) && output.kind === "focused_drill_behavior_request"
      && output.outputRef === outputRef && output.requestedRef === disposition.reference
      && output.requestedBehavior === "immediate_correction"
      && outputRef === disposition.createdByTransitionRef
      && hasExactKeys(instruction, [
        "reference", "family", "origin", "instructionType", "activeTrialRef",
        "sourceCommunicationRef", "attributedAssertionRef", "sourceActorRef", "contextRef",
        "drillScope", "requestedBehavior", "authority", "applicability", "globalPreference",
        "statusOrigin", "interactionRef", "createdOrder", "createdByTransitionRef"
      ])
      && hasExactKeys(disposition, [
        "reference", "family", "origin", "dispositionType", "activeTrialRef",
        "instructionRef", "contextRef", "drillScope", "requestedBehavior",
        "behaviorStatus", "statusOrigin", "interactionRef", "createdOrder",
        "createdByTransitionRef"
      ])
      && disposition?.family === "focused_drill_behavior_disposition"
      && disposition.origin === "sut"
      && disposition.dispositionType === "current_focused_drill_correction_behavior"
      && disposition.activeTrialRef === activeTrial.reference
      && disposition.instructionRef === instruction.reference
      && disposition.contextRef === context.reference
      && disposition.requestedBehavior === "immediate_correction"
      && disposition.behaviorStatus === "requested_for_exact_current_drill"
      && disposition.statusOrigin === "sut_transition"
      && disposition.interactionRef === instruction.interactionRef
      && JSON.stringify(disposition.drillScope) === JSON.stringify(instruction.drillScope)
      && instruction?.family === "focused_drill_instruction" && instruction.origin === "sut"
      && instruction.instructionType === "explicit_current_focused_drill_correction"
      && instruction.activeTrialRef === activeTrial.reference
      && instruction.requestedBehavior === "immediate_correction"
      && instruction.authority === "explicit_expected_user_request"
      && instruction.applicability === "exact_current_focused_drill_only"
      && instruction.globalPreference === "not_established"
      && instruction.contextRef === context.reference
      && instruction.sourceActorRef === communication.sourceActorRef
      && instruction.sourceActorRef === instructionActor.reference
      && instructionActor?.family === "semantic_source"
      && instructionActor.origin === "fixture"
      && instructionActor.sourceActor === "synthetic-user-a"
      && hasExactRetainedInputClosure(
        snapshot, context, "fixture", "context_label", "fixture-driver"
      )
      && hasExactRetainedInputClosure(
        snapshot, communication, "fixture", "communication", "synthetic-user-a"
      )
      && assertion?.family === "attributed_assertion" && assertion.origin === "sut"
      && hasExactKeys(assertion, [
        "reference", "family", "origin", "sourceCommunicationRef", "sourceActorRef",
        "context", "occurrenceOrder", "epistemicStatus", "statusOrigin", "interactionRef",
        "createdOrder", "createdByTransitionRef"
      ])
      && assertion.sourceCommunicationRef === communication.reference
      && assertion.sourceActorRef === communication.sourceActorRef
      && assertion.context === communication.payload.context
      && assertion.occurrenceOrder === communication.payload.occurrenceOrder
      && assertion.epistemicStatus === "attributed_user_assertion"
      && assertion.statusOrigin === "sut_transition"
      && assertion.interactionRef === instruction.interactionRef
      && communication?.family === "input_fact" && communication.origin === "fixture"
      && communication.role === "communication"
      && communication.payload?.sourceActor === "synthetic-user-a"
      && context?.family === "input_fact" && context.origin === "fixture"
      && context.role === "context_label"
      && context.payload?.activity === "japanese_practice"
      && context.payload?.taskMode === "focused_production_drill"
      && context.payload?.surfaceLabel === "text_simulated"
      && context.payload?.consequence === "low"
      && instruction.interactionRef === context.firstInteractionRef
      && instruction.interactionRef === communication.firstInteractionRef
      && attributionTransition.transitionKind === "attribute_current_communications"
      && attributionTransition.origin === "sut"
      && attributionTransition.interactionRef === instruction.interactionRef
      && attributionTransition.inputReferences.includes(communication.reference)
      && attributionTransition.resultReferences.includes(assertion.reference)
      && assertionBases.length === 1
      && hasRoleReference(assertionBases, communication.reference, "attributed_communication")
      && exactRelationMetadata(
        assertionBases[0], assertion.createdOrder, attributionTransition.createdOrder, "sut"
      )
      && assertionSources.length === 1
      && hasRoleReference(assertionSources, instructionActor.reference, "semantic_source")
      && exactRelationMetadata(
        assertionSources[0], assertion.createdOrder, attributionTransition.createdOrder, "sut"
      )
      && instructionTransition.transitionKind === "derive_focused_drill_instruction"
      && instructionTransition.origin === "sut"
      && instructionTransition.interactionRef === instruction.interactionRef
      && instructionTransition.result === "focused_drill_instruction_derived"
      && JSON.stringify(instructionTransition.inputReferences) === JSON.stringify([
        activeTrial.reference, context.reference, communication.reference, assertion.reference
      ])
      && JSON.stringify(instructionTransition.resultReferences) === JSON.stringify([
        instruction.reference
      ])
      && instructionBases.length === 4
      && hasRoleReference(instructionBases, activeTrial.reference, "active_production_trial")
      && hasRoleReference(instructionBases, context.reference, "current_focused_drill_context")
      && hasRoleReference(
        instructionBases, communication.reference, "explicit_request_communication"
      )
      && hasRoleReference(
        instructionBases, assertion.reference, "attributed_current_request"
      )
      && instructionBases.every((relation) => exactRelationMetadata(
        relation, instruction.createdOrder, instructionTransition.createdOrder, "sut"
      ))
      && instructionSources.length === 1
      && hasRoleReference(instructionSources, instructionActor.reference, "semantic_source")
      && exactRelationMetadata(
        instructionSources[0], instruction.createdOrder, instructionTransition.createdOrder, "sut"
      )
      && dispositionTransition.transitionKind
        === "derive_focused_drill_behavior_disposition"
      && dispositionTransition.origin === "sut"
      && dispositionTransition.interactionRef === disposition.interactionRef
      && dispositionTransition.result === "focused_drill_behavior_disposition_derived"
      && JSON.stringify(dispositionTransition.inputReferences) === JSON.stringify([
        activeTrial.reference, context.reference, instruction.reference
      ])
      && JSON.stringify(dispositionTransition.resultReferences) === JSON.stringify([
        disposition.reference
      ])
      && dispositionBases.length === 3
      && hasRoleReference(dispositionBases, activeTrial.reference, "active_production_trial")
      && hasRoleReference(dispositionBases, context.reference, "current_focused_drill_context")
      && hasRoleReference(
        dispositionBases, instruction.reference, "explicit_focused_drill_instruction"
      )
      && dispositionBases.every((relation) => exactRelationMetadata(
        relation, disposition.createdOrder, dispositionTransition.createdOrder, "sut"
      ))
      && fact?.family === "input_fact" && fact.origin === "simulator"
      && fact.role === "simulator_behavior_realization"
      && hasExactRetainedInputClosure(
        snapshot, fact, "simulator", "simulator_behavior_realization",
        "simulated-dependency"
      )
      && fact.sourceFactRef === projected.sourceFactRef
      && fact.payload.requestedRef === disposition.reference
      && fact.payload.requestedBehavior === record.requestedBehavior
      && fact.payload.realizedBehavior === record.realizedBehavior
      && fact.payload.fidelity === record.fidelity
      && fact.payload.mismatchOrigin === record.mismatchOrigin
      && transition.family === "sut_transition_evidence" && transition.origin === "sut"
      && transition.transitionKind === "record_focused_drill_realization"
      && transition.interactionRef === fact.firstInteractionRef
      && transition.result === "focused_drill_realization_recorded"
      && JSON.stringify(transition.inputReferences) === JSON.stringify([
        fact.reference, disposition.reference
      ])
      && transition.resultReferences.length === 0
      && bases.length === 2
      && hasRoleReference(bases, fact.reference, "simulator_behavior_realization_fact")
      && hasRoleReference(bases, disposition.reference, "requested_focused_drill_disposition")
      && bases.every((relation) => exactRelationMetadata(
        relation, transition.createdOrder, transition.createdOrder, "sut"
      ))
      && realization.fromRef === fact.reference
      && realization.toRef === disposition.reference
      && realization.targetRole === "focused_drill_behavior_disposition"
      && realization.assertedByRole === "sut"
      && realization.fromRef !== realization.toRef
      && realization.createdOrder === transition.createdOrder
      && realization.effectiveOrder === transition.createdOrder
      && attributionTransition.createdOrder < instruction.createdOrder
      && instruction.createdOrder < instructionTransition.createdOrder
      && instructionTransition.createdOrder < disposition.createdOrder
      && dispositionTransition.createdOrder < fact.createdOrder
      && fact.createdOrder < transition.createdOrder;
    if (!valid) {
      throw new Error(
        "CP-DRILL-REALIZATION-MATCH requires exact T/I/D/F/R/E closure."
      );
    }
    return [{ outputRef, entry }];
  });
}

function validateExactFixtureSet(records, expectedFixtures, label) {
  const expectedIds = Object.keys(expectedFixtures);
  if (!Array.isArray(records) || records.length !== expectedIds.length) {
    throw new Error(`${label} requires its exact package-local fixture set.`);
  }
  const byId = new Map(records.map((record) => [record?.fixtureRecordId, record]));
  if (byId.size !== expectedIds.length || expectedIds.some((id) => !byId.has(id))) {
    throw new Error(`${label} requires exact package-local fixture identities.`);
  }
  for (const [id, expected] of Object.entries(expectedFixtures)) {
    const record = byId.get(id);
    projectFixtureRecords([record], () => "source_00000000-0000-0000-0000-000000000000");
    if (record.role !== expected.role || record.sourceActor !== expected.sourceActor
      || record.occurrenceOrder !== expected.occurrenceOrder
      || JSON.stringify(record.data) !== JSON.stringify(expected.data)) {
      throw new Error(`${label} contains invalid package-local content for ${id}.`);
    }
  }
}

function isFocusedDrillFixtureMaterial(record) {
  const data = record?.data;
  return (record?.role === "context_label"
      && record.sourceActor === "fixture-driver"
      && data?.activity === "japanese_practice"
      && data.taskMode === "focused_production_drill"
      && data.surfaceLabel === "text_simulated"
      && data.consequence === "low")
    || (record?.role === "communication_event"
      && record.sourceActor === "synthetic-user-a"
      && data?.content?.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
        === "please correct me right away during this drill."
      && data.context === "focused_production_drill"
      && data.semanticStatusOrigin === "unclassified")
    || (record?.role === "task_observation"
      && record.sourceActor === "fixture-scorer"
      && JSON.stringify(data?.itemRefs) === JSON.stringify([
        "DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"
      ])
      && data.taskMode === "focused_production_drill"
      && data.dimension === "particle_pattern_a"
      && JSON.stringify(data.performance) === JSON.stringify({
        kind: "aggregate", correctCount: 5, totalCount: 6
      }))
    || (record?.role === "outcome_fact"
      && record.sourceActor === "synthetic-user-a"
      && data?.observation === "That helped for this drill."
      && data.context === "focused_production_drill");
}

function isDirectCorrectionFixtureMaterial(record) {
  const data = record?.data;
  return (record?.role === "context_label"
      && data?.taskMode === "spontaneous_production"
      && data.surfaceLabel === "voice_simulated"
      && data.sessionId === "spontaneous-correction-current")
    || (record?.role === "fixture_evidence"
      && data?.event === "over_aggressive_mid_sentence_interruption")
    || (record?.role === "communication_event"
      && data?.content?.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
        === "don't stop me mid-sentence like that here. let me finish first.")
    || (record?.role === "chronology_fact"
      && data?.focusedDrillScenarioDay === 135
      && data.oldDrillPreferenceScenarioDay === 15);
}

function isLaterOutcomeOrExplanationMaterial(record) {
  const data = record?.data;
  return (record?.role === "outcome_fact"
      && data?.comparison?.metric === "speaking_duration"
      && data.comparison.currentSessionId === "spontaneous-outcome-later")
    || (record?.role === "outcome_fact"
      && data?.observation === "This pacing feels easier.")
    || (record?.role === "material_context_change"
      && data?.coInterventionVisibility === "none_supplied_to_zoey")
    || (record?.role === "communication_event"
      && data?.content?.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
        === "why are you correcting differently now?");
}

function uniqueCreatingTransition(snapshot, record, label) {
  const claimants = snapshot.records.filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
    || candidate.resultReferences?.includes(record?.reference)
  ));
  if (claimants.length !== 1) {
    throw new Error(`${label} requires exactly one retained creating transition.`);
  }
  return claimants[0];
}

function hasRoleReference(relations, reference, role) {
  return relations.filter((relation) => (
    relation.toRef === reference && relation.targetRole === role
  )).length === 1;
}

function hasExactRetainedInputClosure(snapshot, fact, origin, role, sourceActor) {
  if (!hasExactKeys(fact, [
    "reference", "family", "origin", "role", "sourceFactRef", "payload",
    "firstInteractionRef", "createdOrder", "sourceActorRef"
  ]) || fact.family !== "input_fact" || fact.origin !== origin || fact.role !== role
    || fact.payload?.sourceActor !== sourceActor) return false;
  const actor = exactRecord(snapshot, fact.sourceActorRef, `${role} semantic actor`);
  const interaction = exactRecord(snapshot, fact.firstInteractionRef, `${role} interaction`);
  const ingestion = uniqueCreatingTransition(snapshot, interaction, `${role} ingestion`);
  const sources = snapshot.relations.filter((relation) => (
    relation.fromRef === fact.reference && relation.relationKind === "source"
  ));
  const ingestionBases = snapshot.relations.filter((relation) => (
    relation.fromRef === ingestion.reference && relation.relationKind === "basis"
  ));
  return hasExactKeys(actor, ["reference", "family", "origin", "sourceActor", "createdOrder"])
    && actor.family === "semantic_source" && actor.origin === origin
    && actor.sourceActor === sourceActor
    && hasExactKeys(interaction, [
      "reference", "family", "origin", "inputReferences", "createdOrder",
      "createdByTransitionRef"
    ])
    && interaction.family === "interaction_segment" && interaction.origin === "sut"
    && interaction.inputReferences.includes(fact.reference)
    && interaction.inputReferences.length === new Set(interaction.inputReferences).size
    && ingestion.family === "sut_transition_evidence" && ingestion.origin === "sut"
    && ingestion.transitionKind === "ingest_sut_visible_inputs"
    && ingestion.interactionRef === interaction.reference
    && JSON.stringify(ingestion.inputReferences) === JSON.stringify(interaction.inputReferences)
    && JSON.stringify(ingestion.resultReferences) === JSON.stringify([interaction.reference])
    && ingestion.result === "accepted"
    && sources.length === 1
    && hasRoleReference(sources, actor.reference, "semantic_source")
    && exactRelationMetadata(sources[0], fact.createdOrder, ingestion.createdOrder, "sut")
    && ingestionBases.length === interaction.inputReferences.length
    && interaction.inputReferences.every((reference) => (
      hasRoleReference(ingestionBases, reference, "ingested_input")
    ))
    && ingestionBases.every((relation) => exactRelationMetadata(
      relation, ingestion.createdOrder, ingestion.createdOrder, "sut"
    ))
    && actor.createdOrder < fact.createdOrder
    && fact.createdOrder < interaction.createdOrder
    && interaction.createdOrder < ingestion.createdOrder;
}

function exactRelationMetadata(relation, effectiveOrder, createdOrder, assertedByRole) {
  return relation?.effectiveOrder === effectiveOrder
    && relation.createdOrder === createdOrder
    && relation.assertedByRole === assertedByRole;
}

function sameReferenceSet(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function exactRecord(snapshot, reference, label) {
  const matches = snapshot.records.filter((record) => record.reference === reference);
  if (matches.length > 1) throw new Error(`Acceptance branch has ambiguous ${label} identity.`);
  return matches[0];
}

function exactlyOne(values, label) {
  if (values.length !== 1) throw new Error(`Acceptance branch requires exactly one ${label}.`);
  return values[0];
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function assertPublicBoundary(sutBoundary) {
  if (typeof sutBoundary !== "object" || sutBoundary === null) {
    throw new Error("The harness requires a SUT public boundary object.");
  }

  for (const method of SUT_PUBLIC_BOUNDARY_METHODS) {
    if (typeof sutBoundary[method] !== "function") {
      throw new Error(`The harness requires public SUT method ${method}.`);
    }
  }
}
