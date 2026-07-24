import { createSutBoundary } from "@zoey/scn001-sut-core";

import { deepFreeze } from "./formalArtifactIdentity.js";
import { REQUIRED_CLAIM_CLASSES, REQUIRED_PATHS } from "./formalAuthority.js";
import { CLAIM_OBLIGATION_MAP } from "./formalRunRecord.js";
import { createHarnessForFormalRunner } from "./harness.js";

const PATHS = Object.freeze({
  CANONICAL: "SCN001-SSFO-V0.2.0-CANONICAL-THIN",
  NO_SPLIT: "SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT",
  DRILL_OPT_IN: "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN",
  RECENT_BASIS: "SCN001-SSFO-V0.2.0-CF-RECENT-BASIS"
});

export function executeSelectedSlicePath(input) {
  assertRunnerInput(input);
  return executeWithBoundary(input.path_id, createSutBoundary());
}

export function executeSelectedSlicePathForMechanismTest(input, sutBoundary) {
  assertRunnerInput(input);
  return executeWithBoundary(input.path_id, sutBoundary);
}

function executeWithBoundary(pathId, sutBoundary) {
  const session = createExecutionSession(pathId, sutBoundary);
  try {
    const result = session.executeRetainingInterruption();
    if (result.execution_status === "INTERRUPTED") {
      throw new Error(`Selected-slice execution interrupted: ${result.interruption.message}`);
    }
    return result;
  } finally {
    session.close();
  }
}

export function createSelectedSlicePathSession(input) {
  assertRunnerInput(input);
  return createExecutionSession(input.path_id, createSutBoundary());
}

export function createSelectedSlicePathSessionForMechanismTest(input, sutBoundary) {
  assertRunnerInput(input);
  return createExecutionSession(input.path_id, sutBoundary);
}

function createExecutionSession(pathId, sutBoundary) {
  const harness = instrumentHarness(createHarnessForFormalRunner(sutBoundary));
  const runRef = harness.startRun();
  const initialInspection = harness.captureInspectionSnapshot(runRef);
  const events = [];
  let nextEventOrder = 1;
  let executionStarted = false;
  let closed = false;
  const record = (eventKind, bundleId, result, sourceMaterial = null) => {
    events.push({
      event_order: nextEventOrder,
      event_kind: eventKind,
      bundle_id: bundleId,
      source_material: sourceMaterial === null ? null : structuredClone(sourceMaterial),
      result: structuredClone(result),
      inspection_after_event: harness.captureInspectionSnapshot(runRef)
    });
    nextEventOrder += 1;
    return result;
  };
  return Object.freeze({
    path_id: pathId,
    run_ref: runRef,
    initial_inspection: initialInspection,
    executeRetainingInterruption() {
      if (closed || executionStarted) {
        throw new Error("Selected-slice execution session is closed or already consumed.");
      }
      executionStarted = true;
      try {
        if (pathId === PATHS.CANONICAL) executeCanonical(harness, runRef, record);
        if (pathId === PATHS.NO_SPLIT) executeNoSplit(harness, runRef, record);
        if (pathId === PATHS.DRILL_OPT_IN) executeDrillOptIn(harness, runRef, record);
        if (pathId === PATHS.RECENT_BASIS) executeRecentBasis(harness, runRef, record);
        const projection = harness.captureFormalOracleProjection(runRef);
        const derivation = derivePathOutcomes(pathId, projection);
        return deepFreeze({
          execution_status: "COMPLETED",
          path_id: pathId,
          fixture_oracle_package: "SCN001-SSFO-V0.2.0",
          runner_policy: "CONSERVATIVE_THREE_RUN_V1",
          run_ref: runRef,
          initial_inspection: initialInspection,
          event_count: events.length,
          events,
          oracle_projection: projection,
          ...derivation
        });
      } catch (error) {
        if (error instanceof HarnessOperationFailure
          && error.failure_attribution === "SUT") {
          try {
            record("SUT_PROCESSING_FAILED", null, {
              operation: error.operation,
              error_name: error.cause_name,
              message: error.cause_message
            });
            const projection = harness.captureFormalOracleProjection(runRef);
            const derivation = derivePathOutcomes(pathId, projection);
            return deepFreeze({
              execution_status: "COMPLETED_WITH_SUT_FAILURE",
              path_id: pathId,
              fixture_oracle_package: "SCN001-SSFO-V0.2.0",
              runner_policy: "CONSERVATIVE_THREE_RUN_V1",
              run_ref: runRef,
              initial_inspection: initialInspection,
              event_count: events.length,
              events,
              oracle_projection: projection,
              execution_diagnostic: {
                operation: error.operation,
                error_name: error.cause_name,
                message: error.cause_message
              },
              ...derivation
            });
          } catch (captureError) {
            error = captureError;
          }
        }
        const reasonCode = error instanceof HarnessOperationFailure
          ? error.reason_code
          : "SCN001-SSFO-V0.2.0-VAL-005";
        return deepFreeze({
          execution_status: "INTERRUPTED",
          path_id: pathId,
          fixture_oracle_package: "SCN001-SSFO-V0.2.0",
          runner_policy: "CONSERVATIVE_THREE_RUN_V1",
          run_ref: runRef,
          initial_inspection: initialInspection,
          event_count: events.length,
          events,
          interruption: {
            reason_code: reasonCode ?? "SCN001-SSFO-V0.2.0-VAL-005",
            error_name: error instanceof HarnessOperationFailure
              ? error.cause_name
              : error instanceof Error ? error.name : "NonErrorThrow",
            message: error instanceof HarnessOperationFailure
              ? error.cause_message
              : error instanceof Error ? error.message : String(error)
          },
          run_validity: "INVALID_UNSCORABLE",
          invariant_result: null,
          obligation_results: [],
          failure_assertions: []
        });
      }
    },
    close() {
      if (!closed) {
        harness.endRun(runRef);
        closed = true;
      }
    }
  });
}

function executeCanonical(harness, runRef, record) {
  seedOldHistory(harness, runRef, record);
  executeCanonicalPrefix(harness, runRef, record);
  const active = one(harness.inspectActiveDelayedCorrectionCheckpoint(runRef));
  deliverBundle(
    harness, runRef, record, "B-LATER-USE",
    laterUseRecords(active?.activeTrialRef ?? null, false), "deliverLaterUseInputsIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  record("REALIZED", "B-LATER-REALIZATION", harness.realizeAvailableOutputs(runRef));
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverBundle(
    harness, runRef, record, "B-OUTCOME", laterOutcomeRecords(),
    "deliverLaterOutcomeIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverBundle(
    harness, runRef, record, "B-EXPLAIN", explanationRecords(),
    "deliverExplanationPromptIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function executeDrillOptIn(harness, runRef, record) {
  seedOldHistory(harness, runRef, record);
  executeCanonicalPrefix(harness, runRef, record);
  const active = one(harness.inspectActiveDelayedCorrectionCheckpoint(runRef));
  deliverBundle(
    harness, runRef, record, "B-CF2-LATER-USE",
    laterUseRecords(active?.activeTrialRef ?? null, true), "deliverDrillOptInInputsIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function executeCanonicalPrefix(harness, runRef, record) {
  deliverBundle(
    harness, runRef, record, "B-TRIAL-FORM", productionProposalRecords(),
    "deliverFixtureRecords"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  record("REALIZED", "B-PROPOSAL-REALIZATION", harness.realizeAvailableOutputs(runRef));
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverBundle(
    harness, runRef, record, "B-PROPOSAL-ACCEPT", proposalAcceptanceRecords(),
    "deliverProposalAcceptanceIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverBundle(
    harness, runRef, record, "B-FOCUSED-DRILL-OPEN", focusedDrillOpeningRecords(),
    "deliverFocusedDrillInputsIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  record("REALIZED", "B-FOCUSED-DRILL-REALIZATION", harness.realizeAvailableOutputs(runRef));
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverBundle(
    harness, runRef, record, "B-FOCUSED-DRILL-OUTCOME", focusedDrillOutcomeRecords(),
    "deliverFocusedDrillOutcomeIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverBundle(
    harness, runRef, record, "B-SPONT-CORRECT", spontaneousCorrectionRecords(),
    "deliverSpontaneousCorrectionInputsIfEligible"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  record("REALIZED", "B-SPONT-CORRECT-REALIZATION", harness.realizeAvailableOutputs(runRef));
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function executeNoSplit(harness, runRef, record) {
  seedOldHistory(harness, runRef, record);
  deliverBundle(
    harness, runRef, record, "B-CF1-TRIAL-FORM",
    productionProposalRecords({ noSplit: true }), "deliverFixtureRecords"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function executeRecentBasis(harness, runRef, record) {
  const records = [
    fixture("CF3-H-001", "fixture_evidence", "fixture-driver", 1, {
      event: "bounded_target_particle_practice",
      context: "recent_practice_history_day_105"
    }),
    taskObservation(
      "CF3-H-002", 2, 105, "recent-practice-history", 1, 1, 4,
      "recent-target-production-evidence", "spontaneous_production"
    ),
    fixture("CF3-C-004", "chronology_fact", "fixture-driver", 3, {
      scenarioDay: 135, sessionId: "session-current", sessionOrder: 2
    }),
    taskObservation("CF3-C-005", 4, 135, "session-current", 2, 4, 4),
    taskObservation(
      "CF3-C-006", 5, 135, "session-current", 2, 1, 4,
      "production-calibration-items", "spontaneous_production"
    )
  ];
  deliverResume(harness, runRef, record);
  deliverBundle(
    harness, runRef, record, "B-CF3-TEMPORAL-RECENT", records,
    "deliverFixtureRecords"
  );
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function seedOldHistory(harness, runRef, record) {
  const historyEvent = fixture("H-001", "fixture_evidence", "fixture-driver", 1, {
    event: "bounded_target_particle_practice",
    context: "old_practice_history_day_0"
  });
  const old = taskObservation(
    "H-002", 2, 0, "old-practice-history", 1, 1, 4,
    "historical-target-production-evidence", "spontaneous_production"
  );
  const historicalAssertion = fixture(
    "H-003", "communication_event", "synthetic-user-a", 3, {
      content: "I always freeze on particles.", context: "old_practice_history",
      semanticStatusOrigin: "fixture_initialized"
    }
  );
  const historicalCorrection = fixture(
    "H-004", "communication_event", "synthetic-user-a", 4, {
      content: "Correct me immediately during this focused text drill.",
      context: "focused_text_drill", semanticStatusOrigin: "fixture_initialized"
    }
  );
  const historicalOutcome = fixture("H-005", "outcome_fact", "synthetic-user-a", 5, {
    observation: "Immediate correction helped during this old focused drill.",
    context: "focused_text_drill"
  });
  deliverBundle(harness, runRef, record, "B-INITIAL-HISTORY", [
    historyEvent, old, historicalAssertion, historicalCorrection, historicalOutcome
  ], "deliverFixtureRecords");
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
  deliverResume(harness, runRef, record);
  deliverBundle(harness, runRef, record, "B-HISTORY-TEMPORAL-OLD", [
    historyEvent, old, historicalAssertion,
    fixture("C-004", "chronology_fact", "fixture-driver", 9, {
      scenarioDay: 135, sessionId: "session-current", sessionOrder: 2
    })
  ], "deliverFixtureRecords");
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function deliverResume(harness, runRef, record) {
  deliverBundle(harness, runRef, record, "B-RESUME", [
    fixture("C-001", "communication_event", "synthetic-user-a", 6, {
      content: "Let's continue Japanese where we left off.",
      context: "japanese_practice_resume", semanticStatusOrigin: "unclassified"
    }),
    fixture("C-002", "communication_event", "synthetic-user-a", 7, {
      content: "I've forgotten everything.",
      context: "japanese_practice_resume", semanticStatusOrigin: "unclassified"
    }),
    fixture("C-003", "communication_event", "synthetic-user-a", 8, {
      content: "I passed a beginner milestone recently.",
      context: "japanese_practice_resume", semanticStatusOrigin: "unclassified"
    }),
    fixture("C-004", "chronology_fact", "fixture-driver", 9, {
      scenarioDay: 135, sessionId: "session-current", sessionOrder: 2
    }),
    fixture("C-007", "context_label", "fixture-driver", 10, {
      surfaceLabel: "text_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low"
    })
  ], "deliverFixtureRecords");
  record("PROCESSED", null, harness.processCurrentInteraction(runRef));
}

function derivePathOutcomes(pathId, projection) {
  const checks = pathChecks(pathId, projection);
  const hardFailures = deriveHardFailures(pathId, projection);
  const results = [...REQUIRED_CLAIM_CLASSES].sort().map((claimClass) => {
    const obligation = CLAIM_OBLIGATION_MAP[pathId][claimClass];
    if (!obligation) return nonPressureResult(claimClass);
    const check = checks[claimClass];
    const result = check.pass ? "PASS" : check.notReached ? "NOT_REACHED" : "OBLIGATION_FAIL";
    return {
      claim_class: claimClass,
      pressure: "REQUIRED",
      result,
      obligation_ids: [...obligation.obligation_ids],
      checkpoint_ids: [...obligation.checkpoint_ids],
      finding_ids: result === "OBLIGATION_FAIL" ? [`finding:${check.rule_id}`] : []
    };
  });
  const obligationFailures = Object.entries(checks).filter(([, check]) => (
    !check.pass && !check.notReached
  )).map(([claimClass, check]) => ({
    finding_id: `finding:${check.rule_id}`,
    failure_kind: "OBLIGATION",
    rule_id: check.rule_id,
    expected_classification: "REQUIRED_ORACLE_PREDICATE_PRESENT",
    actual_classification: "REQUIRED_ORACLE_PREDICATE_ABSENT",
    affected_claim_classes: [claimClass]
  }));
  const failureAssertions = [...obligationFailures, ...hardFailures].sort(
    (left, right) => left.finding_id.localeCompare(right.finding_id)
  );
  return {
    run_validity: "VALID",
    invariant_result: hardFailures.length === 0 ? "INVARIANTS_CLEAR" : "HARD_FAIL",
    obligation_results: results,
    failure_assertions: failureAssertions
  };
}

function pathChecks(pathId, projection) {
  const c = projection.checkpoints;
  const temporal = temporalStatus(projection);
  const attribution = resumeAttributionPass(projection);
  const comparison = scopedComparisonPass(projection);
  if (pathId === PATHS.NO_SPLIT) {
    const snapshot = projection.snapshot.records;
    return {
      "CC-EVIDENCE-TRIAL-FORMATION": check(
        attribution && comparison && !c.production_active
          && !snapshot.some((entry) => entry.family === "trial_candidate")
          && snapshot.some((entry) => entry.family === "non_activation_disposition"
            && entry.reason === "no_observed_recognition_production_difference"),
        !attribution
          ? "SCN001-SSFO-V0.2.0-OBL-ATTR-001"
          : !comparison
            ? "SCN001-SSFO-V0.2.0-OBL-COMPARE-001"
            : "SCN001-SSFO-V0.2.0-OBL-EVID-005"
      )
    };
  }
  if (pathId === PATHS.DRILL_OPT_IN) {
    return {
      "CC-SCOPE-TRIAL-USE": check(
        c.delayed_active && c.drill_opt_in_disposition && !c.later_realization,
        "SCN001-SSFO-V0.2.0-OBL-SCOPE-002",
        !c.delayed_active
      )
    };
  }
  if (pathId === PATHS.RECENT_BASIS) {
    return {
      "CC-TIME-STALE-BASIS": check(
        temporal.some((entry) => entry.itemRef === "recent-target-production-evidence"
          && entry.eligibility === "eligible"),
        "SCN001-SSFO-V0.2.0-OBL-TIME-RECENT-001"
      )
    };
  }
  const timePass = temporal.some((entry) => (
    entry.itemRef === "historical-target-production-evidence"
      && entry.eligibility === "ineligible"
  ));
  const evidencePass = attribution && timePass && comparison
    && c.production_active && c.proposal_realized;
  const scopePass = c.focused_drill_realized && c.direct_correction_realized
    && c.delayed_candidate && c.delayed_active && c.canonical_later_disposition;
  const outcomePass = scopePass && c.later_realization && c.canonical_intervention
    && c.later_outcome;
  return {
    "CC-TIME-STALE-BASIS": check(
      timePass, "SCN001-SSFO-V0.2.0-OBL-TIME-OLD-001"
    ),
    "CC-EVIDENCE-TRIAL-FORMATION": check(evidencePass, !attribution
      ? "SCN001-SSFO-V0.2.0-OBL-ATTR-001"
      : !timePass
        ? "SCN001-SSFO-V0.2.0-OBL-TIME-OLD-001"
        : !comparison
          ? "SCN001-SSFO-V0.2.0-OBL-COMPARE-001"
          : "SCN001-SSFO-V0.2.0-OBL-EVID-004"),
    "CC-SCOPE-TRIAL-USE": check(
      scopePass, "SCN001-SSFO-V0.2.0-OBL-SCOPE-001", !evidencePass
    ),
    "CC-OUTCOME-SEMANTICS": check(
      outcomePass, "SCN001-SSFO-V0.2.0-OBL-OUT-001", !scopePass
    ),
    "CC-EXPLANATION-PROVENANCE": check(
      c.explanation, "SCN001-SSFO-V0.2.0-OBL-EXPL-001", !outcomePass
    )
  };
}

function deriveHardFailures(pathId, projection) {
  const failures = [];
  if (pathId === PATHS.NO_SPLIT && projection.checkpoints.production_active) {
    failures.push(hardFailure(
      "SCN001-SSFO-V0.2.0-INV-003", "UNSUPPORTED_PRODUCTION_TRIAL_WITH_EQUAL_CALIBRATION",
      "CC-EVIDENCE-TRIAL-FORMATION"
    ));
  }
  if (pathId === PATHS.DRILL_OPT_IN && projection.checkpoints.later_realization) {
    failures.push(hardFailure(
      "SCN001-SSFO-V0.2.0-INV-011", "DELAYED_CORRECTION_APPLIED_IN_OPT_IN_DRILL",
      "CC-SCOPE-TRIAL-USE"
    ));
  }
  return failures;
}

function hardFailure(ruleId, actual, claimClass) {
  return {
    finding_id: `finding:${ruleId}`,
    failure_kind: "HARD_INVARIANT",
    rule_id: ruleId,
    expected_classification: "HARD_INVARIANT_ABSENT",
    actual_classification: actual,
    affected_claim_classes: [claimClass]
  };
}

function resumeAttributionPass(projection) {
  const required = new Set([
    "Let's continue Japanese where we left off.",
    "I've forgotten everything.",
    "I passed a beginner milestone recently."
  ]);
  const records = projection.snapshot.records;
  const communications = records.filter((entry) => (
    entry.family === "input_fact" && required.has(entry.payload?.content)
  ));
  const assertions = records.filter((entry) => entry.family === "attributed_assertion");
  return communications.length === required.size && communications.every((communication) => (
    assertions.some((assertion) => assertion.sourceCommunicationRef === communication.reference)
  ));
}

function scopedComparisonPass(projection) {
  return projection.snapshot.records.some((entry) => (
    entry.family === "dimension_comparison"
      && entry.targetDimension === "particle_pattern_a"
      && entry.recognitionObservationRefs.length > 0
      && entry.productionObservationRefs.length > 0
      && entry.recognitionObservationRefs.every(
        (reference) => !entry.productionObservationRefs.includes(reference)
      )
  ));
}

function temporalStatus(projection) {
  const records = new Map(projection.snapshot.records.map((entry) => [entry.reference, entry]));
  return projection.temporal_assessments.map((assessment) => ({
    eligibility: assessment.eligibility,
    itemRef: records.get(assessment.assessedObservationRef)?.payload?.itemRef ?? null
  }));
}

function check(pass, ruleId, notReached = false) {
  return { pass, rule_id: ruleId, notReached: !pass && notReached };
}

function nonPressureResult(claimClass) {
  return {
    claim_class: claimClass,
    pressure: "NON_PRESSURE",
    result: "NOT_APPLICABLE",
    obligation_ids: [],
    checkpoint_ids: [],
    finding_ids: []
  };
}

function productionProposalRecords({ noSplit = false } = {}) {
  const recognition = noSplit ? 3 : 4;
  const production = noSplit ? 3 : 1;
  return [
    fixture("C-004", "chronology_fact", "fixture-driver", 9, {
      scenarioDay: 135, sessionId: "session-current", sessionOrder: 2
    }),
    taskObservation(noSplit ? "CF1-C-005" : "C-005", 11, 135, "session-current", 2, recognition, 4),
    taskObservation(
      noSplit ? "CF1-C-006" : "C-006", 12, 135, "session-current", 2, production, 4,
      "production-calibration-items", "spontaneous_production"
    ),
    fixture("C-007", "context_label", "fixture-driver", 10, {
      surfaceLabel: "text_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low"
    }),
    fixture("TD-001", "affordance_fact", "fixture-driver", 5, {
      direction: "TRIAL-PROD-FOCUS", description: "Production-focused practice."
    }),
    control("FC-TRIAL-001", 6, "trial_policy", "bounded_reversible_trial_no_durable_adaptation"),
    control("FC-CONSEQ-001", 13, "consequence", "low"),
    control("FC-REV-001", 14, "reversibility", "reversible")
  ];
}

function proposalAcceptanceRecords() {
  return [
    fixture("P-USER-ACCEPT", "user_response", "synthetic-user-a", 10, {
      content: "Yes, let's try that.", context: "proposal_response"
    }),
    control("FC-RET-001", 11, "evaluation_retention_basis", "named_formal_run"),
    control("FC-UGC-001", 12, "user_governed_constraints", "exhaustive_selected_slice_scope"),
    control("FC-CONSEQ-001", 13, "consequence", "low"),
    control("FC-REV-001", 14, "reversibility", "reversible")
  ];
}

function focusedDrillOpeningRecords() {
  return [
    fixture("D-001", "context_label", "fixture-driver", 15, {
      surfaceLabel: "text_simulated", activity: "japanese_practice",
      taskMode: "focused_production_drill", consequence: "low"
    }),
    fixture("D-002", "communication_event", "synthetic-user-a", 16, {
      content: "Please correct me right away during this drill.",
      context: "focused_production_drill", semanticStatusOrigin: "unclassified"
    })
  ];
}

function focusedDrillOutcomeRecords() {
  return [
    fixture("D-003", "task_observation", "fixture-scorer", 17, {
      itemRefs: ["DRILL-1", "DRILL-2", "DRILL-3", "DRILL-4", "DRILL-5", "DRILL-6"],
      taskMode: "focused_production_drill", dimension: "particle_pattern_a",
      performance: { kind: "aggregate", correctCount: 5, totalCount: 6 },
      occurrenceScenarioDay: 135, sessionId: "focused-drill-current", sessionOrder: 3
    }),
    fixture("D-004", "outcome_fact", "synthetic-user-a", 18, {
      observation: "That helped for this drill.", context: "focused_production_drill"
    })
  ];
}

function spontaneousCorrectionRecords() {
  return [
    fixture("V-001", "context_label", "fixture-driver", 19, {
      surfaceLabel: "voice_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low",
      realVoiceStack: "absent", scenarioDay: 138,
      sessionId: "spontaneous-correction-current"
    }),
    fixture("V-002", "fixture_evidence", "fixture-driver", 20, {
      event: "over_aggressive_mid_sentence_interruption",
      context: "current_spontaneous_production_session"
    }),
    fixture("V-003", "communication_event", "synthetic-user-a", 21, {
      content: "Don't stop me mid-sentence like that here. Let me finish first.",
      context: "spontaneous_production", semanticStatusOrigin: "unclassified"
    }),
    fixture("V-004", "chronology_fact", "fixture-driver", 22, {
      scenarioDay: 138, sessionId: "spontaneous-correction-current", sessionOrder: 4,
      focusedDrillScenarioDay: 135, oldDrillPreferenceScenarioDay: 15
    }),
    control("FC-UGC-001", 12, "user_governed_constraints", "exhaustive_selected_slice_scope"),
    control("FC-CONSEQ-001", 13, "consequence", "low"),
    control("FC-REV-001", 14, "reversibility", "reversible")
  ];
}

function laterUseRecords(activeTrialRef, counterfactual) {
  const records = counterfactual ? [
    fixture("CF2-L-001", "context_label", "fixture-driver", 30, {
      surfaceLabel: "voice_simulated", activity: "focused_accuracy_drill",
      taskMode: "focused_production_drill", consequence: "low", scenarioDay: 145,
      sessionId: "focused-opt-in-later"
    }),
    fixture("CF2-L-002", "communication_event", "synthetic-user-a", 31, {
      content: "For this drill, correct me immediately so I can fix each attempt.",
      context: "focused_production_drill", semanticStatusOrigin: "unclassified"
    }),
    fixture("CF2-L-003", "sut_state_reference", "fixture-driver", 32, {
      stateRef: activeTrialRef
    })
  ] : [
    fixture("L-001", "context_label", "fixture-driver", 30, {
      surfaceLabel: "voice_simulated", activity: "japanese_practice",
      taskMode: "spontaneous_production", consequence: "low", scenarioDay: 145,
      sessionId: "spontaneous-outcome-later"
    }),
    fixture("L-002", "sut_state_reference", "fixture-driver", 31, {
      stateRef: activeTrialRef
    })
  ];
  return [...records,
    control("FC-UGC-001", 12, "user_governed_constraints", "exhaustive_selected_slice_scope"),
    control("FC-CONSEQ-001", 13, "consequence", "low")
  ];
}

function laterOutcomeRecords() {
  return [
    fixture("L-003", "outcome_fact", "fixture-scorer", 33, {
      observation: "user_spoke_longer", context: "spontaneous_production",
      comparison: {
        metric: "speaking_duration", relation: "longer_than",
        baselineSessionId: "spontaneous-correction-current",
        currentSessionId: "spontaneous-outcome-later"
      }
    }),
    fixture("L-004", "outcome_fact", "synthetic-user-a", 34, {
      observation: "This pacing feels easier.", context: "spontaneous_production"
    }),
    fixture("L-005", "material_context_change", "fixture-driver", 35, {
      description: "no_zoey_available_co_intervention_event_supplied",
      coInterventionVisibility: "none_supplied_to_zoey",
      completeness: "non_exhaustive_for_private_or_unobserved_causes"
    })
  ];
}

function explanationRecords() {
  return [fixture("X-001", "communication_event", "synthetic-user-a", 36, {
    content: "Why are you correcting differently now?",
    context: "spontaneous_production", semanticStatusOrigin: "unclassified"
  })];
}

function taskObservation(
  id, order, scenarioDay, sessionId, sessionOrder, correctCount, totalCount,
  itemRef = "recognition-calibration-items", taskMode = "recognition",
  dimension = "particle_pattern_a"
) {
  return fixture(id, "task_observation", "fixture-scorer", order, {
    itemRef, taskMode, dimension,
    performance: { kind: "aggregate", correctCount, totalCount },
    occurrenceScenarioDay: scenarioDay, sessionId, sessionOrder
  });
}

function control(id, order, controlName, value) {
  return fixture(id, "fixture_control_fact", "fixture-driver", order, {
    control: controlName, value
  });
}

function fixture(fixtureRecordId, role, sourceActor, occurrenceOrder, data) {
  return { fixtureRecordId, role, sourceActor, occurrenceOrder, data, oracleAnnotations: {} };
}

function one(values) {
  return Array.isArray(values) && values.length === 1 ? values[0] : null;
}

function deliverBundle(harness, runRef, record, bundleId, records, method) {
  try {
    const result = harness[method](runRef, records);
    return record(
      Array.isArray(result) && result.length === 0
        ? "WITHHELD_NOT_ELIGIBLE"
        : "DELIVERED",
      bundleId,
      result,
      records
    );
  } catch (error) {
    record("DELIVERY_INTERRUPTED", bundleId, {
      reason_code: error instanceof HarnessOperationFailure
        ? error.reason_code
        : "SCN001-SSFO-V0.2.0-VAL-002",
      error_name: error instanceof HarnessOperationFailure
        ? error.cause_name
        : error instanceof Error ? error.name : "NonErrorThrow",
      message: error instanceof HarnessOperationFailure
        ? error.cause_message
        : error instanceof Error ? error.message : String(error)
    }, records);
    throw error;
  }
}

class HarnessOperationFailure extends Error {
  constructor(operation, reasonCode, attribution, cause) {
    super(`Selected-slice ${operation} failed.`);
    this.name = "HarnessOperationFailure";
    this.operation = operation;
    this.reason_code = reasonCode;
    this.failure_attribution = attribution;
    this.cause_name = cause instanceof Error ? cause.name : "NonErrorThrow";
    this.cause_message = cause instanceof Error ? cause.message : String(cause);
  }
}

function instrumentHarness(harness) {
  return Object.freeze(Object.fromEntries(
    Object.entries(harness).map(([property, value]) => [
      property,
      typeof value !== "function" ? value : (...args) => {
        try {
          return value(...args);
        } catch (error) {
          const classification = classifyHarnessOperation(property);
          throw new HarnessOperationFailure(
            String(property), classification.reasonCode, classification.attribution, error
          );
        }
      }
    ])
  ));
}

function classifyHarnessOperation(operation) {
  if (operation === "processCurrentInteraction") {
    return { reasonCode: null, attribution: "SUT" };
  }
  if (operation === "realizeAvailableOutputs") {
    return {
      reasonCode: "SCN001-SSFO-V0.2.0-VAL-007",
      attribution: "INFRASTRUCTURE"
    };
  }
  if (String(operation).startsWith("deliver")) {
    return {
      reasonCode: "SCN001-SSFO-V0.2.0-VAL-002",
      attribution: "INFRASTRUCTURE"
    };
  }
  if (String(operation).startsWith("inspect")) {
    return {
      reasonCode: "SCN001-SSFO-V0.2.0-VAL-006",
      attribution: "INFRASTRUCTURE"
    };
  }
  return {
    reasonCode: "SCN001-SSFO-V0.2.0-VAL-005",
    attribution: "INFRASTRUCTURE"
  };
}

function assertRunnerInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).length !== 1 || !Object.hasOwn(input, "path_id")
    || !REQUIRED_PATHS.includes(input.path_id)) {
    throw new Error("Selected-slice runner input must name exactly one accepted path.");
  }
}
