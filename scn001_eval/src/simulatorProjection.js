import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const RECORD_KEYS = [
  "simulatorRecordId", "role", "sourceActor", "occurrenceOrder", "requestedOutputRef",
  "requestedRef", "candidateRef", "requestedMaterialIntent",
  "requestedCandidateMaterialIntent", "requestedScope", "realizedBehavior",
  "realizedMaterialIntent", "fidelity", "mismatchOrigin"
];
const BEHAVIOR_RECORD_KEYS = [
  "simulatorRecordId", "role", "sourceActor", "occurrenceOrder", "requestedOutputRef",
  "requestedRef", "requestedBehavior", "realizedBehavior", "fidelity", "mismatchOrigin"
];
const LATER_BEHAVIOR_RECORD_KEYS = [
  ...BEHAVIOR_RECORD_KEYS,
  "canonicalInterventionPremise", "canonicalInterventionPremiseMatch"
];
const REFERENCE_PATTERNS = {
  requestedOutputRef: /^transition_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  requestedRef: /^state_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  candidateRef: /^state_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
};

export function createSimulatorProjector() {
  const sourceRefs = new Map();
  return Object.freeze({
    project(record) {
      assertSimulatorRecord(record);
      let sourceFactRef = sourceRefs.get(record.simulatorRecordId);
      if (!sourceFactRef) {
        sourceFactRef = `source_${randomUUID()}`;
        sourceRefs.set(record.simulatorRecordId, sourceFactRef);
      }
      return record.role === "simulated_behavior_realization_fact"
        ? {
            sourceFactRef,
            kind: "simulator_behavior_realization",
            sourceActor: record.sourceActor,
            occurrenceOrder: record.occurrenceOrder,
            requestedRef: record.requestedRef,
            requestedBehavior: record.requestedBehavior,
            realizedBehavior: record.realizedBehavior,
            fidelity: record.fidelity,
            ...(record.requestedBehavior === "delay_minor_correction_until_turn_completion"
              ? {
                  canonicalInterventionPremise: structuredClone(
                    record.canonicalInterventionPremise
                  ),
                  canonicalInterventionPremiseMatch:
                    record.canonicalInterventionPremiseMatch
                }
              : {}),
            mismatchOrigin: record.mismatchOrigin
          }
        : {
            sourceFactRef,
            kind: "simulator_realization",
            sourceActor: record.sourceActor,
            occurrenceOrder: record.occurrenceOrder,
            requestedRef: record.requestedRef,
            realizedBehavior: record.realizedBehavior,
            fidelity: record.fidelity
          };
    }
  });
}

function assertSimulatorRecord(record) {
  if (record?.role === "simulated_behavior_realization_fact") {
    assertBehaviorSimulatorRecord(record);
    return;
  }
  assertExactKeys(record, RECORD_KEYS, "evaluation-side simulator record");
  assertExactKeys(record.requestedScope, ["dimension", "taskMode"], "requestedScope");
  assertExactKeys(
    record.realizedMaterialIntent,
    ["materialIntent", "candidateMaterialIntent", "proposedScope"],
    "realizedMaterialIntent"
  );
  assertExactKeys(
    record.realizedMaterialIntent.proposedScope,
    ["dimension", "taskMode"],
    "realizedMaterialIntent.proposedScope"
  );
  for (const [field, pattern] of Object.entries(REFERENCE_PATTERNS)) {
    if (typeof record[field] !== "string" || !pattern.test(record[field])) {
      throw new Error(`Invalid ${field} on evaluation-side simulator record.`);
    }
  }
  const requestedMeaning = {
    materialIntent: record.requestedMaterialIntent,
    candidateMaterialIntent: record.requestedCandidateMaterialIntent,
    proposedScope: record.requestedScope
  };
  const supportedRequested = (
    record.requestedMaterialIntent === "offer_scoped_trial_for_user_decision"
    && record.requestedCandidateMaterialIntent
      === "practice_spontaneous_production_for_target_dimension"
    && validScope(record.requestedScope)
  );
  const supportedRealized = (
    record.realizedMaterialIntent.materialIntent === "offer_scoped_trial_for_user_decision"
    && record.realizedMaterialIntent.candidateMaterialIntent
      === "practice_spontaneous_production_for_target_dimension"
    && validScope(record.realizedMaterialIntent.proposedScope)
  );
  const meaningsMatch = isDeepStrictEqual(requestedMeaning, record.realizedMaterialIntent);
  const fidelityConsistent = (
    (record.fidelity === "match" && meaningsMatch && record.mismatchOrigin === null)
    || (record.fidelity === "mismatch" && !meaningsMatch
      && typeof record.mismatchOrigin === "string" && record.mismatchOrigin.length > 0)
  );
  if (
    record.role !== "simulated_realization_fact"
    || typeof record.simulatorRecordId !== "string"
    || record.simulatorRecordId.length === 0
    || record.sourceActor !== "simulated-dependency"
    || !Number.isSafeInteger(record.occurrenceOrder)
    || record.occurrenceOrder < 1
    || typeof record.realizedBehavior !== "string"
    || record.realizedBehavior.length === 0
    || !supportedRequested
    || !supportedRealized
    || !fidelityConsistent
  ) {
    throw new Error("Invalid evaluation-side simulator record.");
  }
}

function assertBehaviorSimulatorRecord(record) {
  const later = record?.requestedBehavior
    === "delay_minor_correction_until_turn_completion";
  assertExactKeys(
    record, later ? LATER_BEHAVIOR_RECORD_KEYS : BEHAVIOR_RECORD_KEYS,
    "evaluation-side behavior simulator record"
  );
  if (later) {
    assertExactKeys(record.canonicalInterventionPremise, [
      "activity", "taskMode", "correctionClass", "timing", "sessionId"
    ], "canonicalInterventionPremise");
    if (record.canonicalInterventionPremise.activity !== "japanese_practice"
      || record.canonicalInterventionPremise.taskMode !== "spontaneous_production"
      || record.canonicalInterventionPremise.correctionClass !== "minor_correction"
      || record.canonicalInterventionPremise.timing !== "turn_completion"
      || record.canonicalInterventionPremise.sessionId !== "spontaneous-outcome-later"
      || record.canonicalInterventionPremiseMatch !== true) {
      throw new Error("Invalid canonical later-intervention premise.");
    }
  }
  for (const field of ["requestedOutputRef", "requestedRef"]) {
    const pattern = REFERENCE_PATTERNS[field];
    if (typeof record[field] !== "string" || !pattern.test(record[field])) {
      throw new Error(`Invalid ${field} on evaluation-side behavior simulator record.`);
    }
  }
  const match = record.fidelity === "match"
    && record.requestedBehavior === record.realizedBehavior
    && record.mismatchOrigin === null;
  const mismatch = record.fidelity === "mismatch"
    && record.requestedBehavior !== record.realizedBehavior
    && typeof record.mismatchOrigin === "string"
    && record.mismatchOrigin.length > 0;
  if (record.role !== "simulated_behavior_realization_fact"
    || typeof record.simulatorRecordId !== "string" || record.simulatorRecordId.length === 0
    || record.sourceActor !== "simulated-dependency"
    || !Number.isSafeInteger(record.occurrenceOrder) || record.occurrenceOrder < 1
    || ![
      "immediate_correction", "turn_completion_correction",
      "delay_minor_correction_until_turn_completion"
    ].includes(
      record.requestedBehavior
    )
    || typeof record.realizedBehavior !== "string" || record.realizedBehavior.length === 0
    || !(match || mismatch)) {
    throw new Error("Invalid evaluation-side behavior simulator record.");
  }
}

function validScope(scope) {
  return scope.taskMode === "spontaneous_production"
    && typeof scope.dimension === "string" && scope.dimension.length > 0;
}

function assertExactKeys(value, keys, path) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
    || Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) {
    throw new Error(`${path} must contain exactly: ${[...keys].sort().join(", ")}.`);
  }
}
