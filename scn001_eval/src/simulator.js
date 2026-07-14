import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const OUTPUT_KEYS = [
  "kind", "outputRef", "requestedRef", "candidateRef", "materialIntent",
  "candidateMaterialIntent", "proposedScope"
];
const FOCUSED_DRILL_OUTPUT_KEYS = [
  "kind", "outputRef", "requestedRef", "requestedBehavior", "drillScope"
];

export function realizeAvailableOutput(output, occurrenceOrder = 1) {
  if (output?.kind === "proposal_realization_request") {
    return realizeProposalOutput(output, occurrenceOrder);
  }
  if (output?.kind === "focused_drill_behavior_request") {
    return realizeFocusedDrillOutput(output, occurrenceOrder);
  }
  throw new Error("Unsupported SUT realization request kind.");
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

function presentDimension(value) { return value.replaceAll("_", " "); }
function assertExactKeys(value, keys, path) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype
    || Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) {
    throw new Error(`${path} must contain exactly: ${[...keys].sort().join(", ")}.`);
  }
}
