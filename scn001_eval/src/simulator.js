import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const OUTPUT_KEYS = [
  "kind", "outputRef", "requestedRef", "candidateRef", "materialIntent",
  "candidateMaterialIntent", "proposedScope"
];
const FOCUSED_DRILL_OUTPUT_KEYS = [
  "kind", "outputRef", "requestedRef", "requestedBehavior", "drillScope"
];
const DIRECT_CORRECTION_OUTPUT_KEYS = [
  "kind", "outputRef", "requestedRef", "requestedBehavior", "sessionScope"
];
const LATER_DELAYED_OUTPUT_KEYS = [
  "kind", "outputRef", "requestedRef", "requestedBehavior", "useScope"
];

export function realizeAvailableOutput(output, occurrenceOrder = 1) {
  if (output?.kind === "proposal_realization_request") {
    return realizeProposalOutput(output, occurrenceOrder);
  }
  if (output?.kind === "focused_drill_behavior_request") {
    return realizeFocusedDrillOutput(output, occurrenceOrder);
  }
  if (output?.kind === "direct_current_session_correction_request") {
    return realizeDirectCorrectionOutput(output, occurrenceOrder);
  }
  if (output?.kind === "later_delayed_correction_request") {
    return realizeLaterDelayedCorrectionOutput(output, occurrenceOrder);
  }
  throw new Error("Unsupported SUT realization request kind.");
}

export function realizeLaterDelayedCorrectionOutput(output, occurrenceOrder = 1) {
  assertExactKeys(output, LATER_DELAYED_OUTPUT_KEYS, "later delayed-correction request");
  assertExactKeys(output.useScope, [
    "activity", "taskMode", "surfaceLabel", "consequence", "scenarioDay", "sessionId"
  ], "useScope");
  if (output.kind !== "later_delayed_correction_request"
    || output.requestedBehavior !== "delay_minor_correction_until_turn_completion"
    || output.useScope.activity !== "japanese_practice"
    || output.useScope.taskMode !== "spontaneous_production"
    || output.useScope.surfaceLabel !== "voice_simulated"
    || output.useScope.consequence !== "low"
    || output.useScope.scenarioDay !== 145
    || output.useScope.sessionId !== "spontaneous-outcome-later") {
    throw new Error("Unsupported later delayed-correction request material.");
  }
  const canonicalInterventionPremise = Object.freeze({
    activity: output.useScope.activity,
    taskMode: output.useScope.taskMode,
    correctionClass: "minor_correction",
    timing: "turn_completion",
    sessionId: output.useScope.sessionId
  });
  const canonicalInterventionPremiseMatch = (
    canonicalInterventionPremise.activity === "japanese_practice"
    && canonicalInterventionPremise.taskMode === "spontaneous_production"
    && canonicalInterventionPremise.correctionClass === "minor_correction"
    && canonicalInterventionPremise.timing === "turn_completion"
    && canonicalInterventionPremise.sessionId === "spontaneous-outcome-later"
  );
  return Object.freeze({
    simulatorRecordId: `simulator_${randomUUID()}`,
    role: "simulated_behavior_realization_fact",
    sourceActor: "simulated-dependency",
    occurrenceOrder,
    requestedOutputRef: output.outputRef,
    requestedRef: output.requestedRef,
    requestedBehavior: output.requestedBehavior,
    realizedBehavior: output.requestedBehavior,
    fidelity: "match",
    canonicalInterventionPremise,
    canonicalInterventionPremiseMatch,
    mismatchOrigin: null
  });
}

export function realizeProposalOutput(output, occurrenceOrder = 1) {
  assertExactKeys(output, OUTPUT_KEYS, "proposal realization request");
  assertExactKeys(output.proposedScope, ["dimension", "taskMode"], "proposedScope");
  if (
    output.kind !== "proposal_realization_request"
    || output.materialIntent !== "offer_scoped_trial_for_user_decision"
    || output.candidateMaterialIntent !== "practice_spontaneous_production_for_target_dimension"
    || output.proposedScope.taskMode !== "spontaneous_production"
    || typeof output.proposedScope.dimension !== "string"
    || output.proposedScope.dimension.length === 0
  ) throw new Error("Unsupported proposal realization request material.");
  const realizedMaterialIntent = {
    materialIntent: "offer_scoped_trial_for_user_decision",
    candidateMaterialIntent: "practice_spontaneous_production_for_target_dimension",
    proposedScope: structuredClone(output.proposedScope)
  };
  const requestedMeaning = {
    materialIntent: output.materialIntent,
    candidateMaterialIntent: output.candidateMaterialIntent,
    proposedScope: output.proposedScope
  };
  return Object.freeze({
    simulatorRecordId: `simulator_${randomUUID()}`,
    role: "simulated_realization_fact",
    sourceActor: "simulated-dependency",
    occurrenceOrder,
    requestedOutputRef: output.outputRef,
    requestedRef: output.requestedRef,
    candidateRef: output.candidateRef,
    requestedMaterialIntent: output.materialIntent,
    requestedCandidateMaterialIntent: output.candidateMaterialIntent,
    requestedScope: Object.freeze(structuredClone(output.proposedScope)),
    realizedBehavior: `Would you like to try a short practice focused on producing ${presentDimension(output.proposedScope.dimension)} yourself?`,
    realizedMaterialIntent: Object.freeze(realizedMaterialIntent),
    fidelity: isDeepStrictEqual(requestedMeaning, realizedMaterialIntent) ? "match" : "mismatch",
    mismatchOrigin: null
  });
}

export function realizeFocusedDrillOutput(output, occurrenceOrder = 1) {
  assertExactKeys(output, FOCUSED_DRILL_OUTPUT_KEYS, "focused-drill realization request");
  assertExactKeys(
    output.drillScope,
    ["activity", "taskMode", "surfaceLabel", "consequence"],
    "drillScope"
  );
  if (output.kind !== "focused_drill_behavior_request"
    || output.requestedBehavior !== "immediate_correction"
    || output.drillScope.activity !== "japanese_practice"
    || output.drillScope.taskMode !== "focused_production_drill"
    || output.drillScope.surfaceLabel !== "text_simulated"
    || output.drillScope.consequence !== "low") {
    throw new Error("Unsupported focused-drill behavior request material.");
  }
  return Object.freeze({
    simulatorRecordId: `simulator_${randomUUID()}`,
    role: "simulated_behavior_realization_fact",
    sourceActor: "simulated-dependency",
    occurrenceOrder,
    requestedOutputRef: output.outputRef,
    requestedRef: output.requestedRef,
    requestedBehavior: output.requestedBehavior,
    realizedBehavior: output.requestedBehavior,
    fidelity: "match",
    mismatchOrigin: null
  });
}

export function realizeDirectCorrectionOutput(output, occurrenceOrder = 1) {
  assertExactKeys(output, DIRECT_CORRECTION_OUTPUT_KEYS, "direct-correction realization request");
  assertExactKeys(output.sessionScope, [
    "activity", "taskMode", "surfaceLabel", "realVoiceStack", "scenarioDay", "sessionId"
  ], "sessionScope");
  if (output.kind !== "direct_current_session_correction_request"
    || output.requestedBehavior !== "turn_completion_correction"
    || output.sessionScope.activity !== "japanese_practice"
    || output.sessionScope.taskMode !== "spontaneous_production"
    || output.sessionScope.surfaceLabel !== "voice_simulated"
    || output.sessionScope.realVoiceStack !== "absent"
    || output.sessionScope.scenarioDay !== 138
    || output.sessionScope.sessionId !== "spontaneous-correction-current") {
    throw new Error("Unsupported direct current-session correction request material.");
  }
  return Object.freeze({
    simulatorRecordId: `simulator_${randomUUID()}`,
    role: "simulated_behavior_realization_fact",
    sourceActor: "simulated-dependency",
    occurrenceOrder,
    requestedOutputRef: output.outputRef,
    requestedRef: output.requestedRef,
    requestedBehavior: output.requestedBehavior,
    realizedBehavior: output.requestedBehavior,
    fidelity: "match",
    mismatchOrigin: null
  });
}

function presentDimension(value) { return value.replaceAll("_", " "); }
function assertExactKeys(value, keys, path) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
    || Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) {
    throw new Error(`${path} must contain exactly: ${[...keys].sort().join(", ")}.`);
  }
}
