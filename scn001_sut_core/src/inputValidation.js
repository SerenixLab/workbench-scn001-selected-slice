import { SutBoundaryValidationError } from "./errors.js";

const inputValidators = {
  communication: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "content", "context", "semanticStatusOrigin"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.content, `${path}.content`);
    assertString(input.context, `${path}.context`);
    assertOneOf(input.semanticStatusOrigin, ["unclassified", "fixture_initialized"], `${path}.semanticStatusOrigin`);
  },
  task_observation: (input, path) => {
    assertCommonInputFields(input, path);
    const itemIdentityKey = Object.hasOwn(input, "itemRefs") ? "itemRefs" : "itemRef";
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", itemIdentityKey, "taskMode", "dimension", "performance", "occurrenceScenarioDay", "sessionId", "sessionOrder"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    if (itemIdentityKey === "itemRefs") {
      assertStringArray(input.itemRefs, `${path}.itemRefs`);
    } else {
      assertString(input.itemRef, `${path}.itemRef`);
    }
    assertString(input.taskMode, `${path}.taskMode`);
    assertString(input.dimension, `${path}.dimension`);
    assertPerformance(input.performance, `${path}.performance`);
    assertNonNegativeInteger(input.occurrenceScenarioDay, `${path}.occurrenceScenarioDay`);
    assertString(input.sessionId, `${path}.sessionId`);
    assertPositiveInteger(input.sessionOrder, `${path}.sessionOrder`);
  },
  chronology_fact: (input, path) => {
    assertCommonInputFields(input, path);
    const directChronology = Object.hasOwn(input, "focusedDrillScenarioDay");
    assertExactKeys(input, [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "scenarioDay",
      "sessionId", "sessionOrder",
      ...(directChronology
        ? ["focusedDrillScenarioDay", "oldDrillPreferenceScenarioDay"] : [])
    ], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertNonNegativeInteger(input.scenarioDay, `${path}.scenarioDay`);
    assertString(input.sessionId, `${path}.sessionId`);
    assertPositiveInteger(input.sessionOrder, `${path}.sessionOrder`);
    if (directChronology) {
      assertNonNegativeInteger(input.focusedDrillScenarioDay, `${path}.focusedDrillScenarioDay`);
      assertNonNegativeInteger(
        input.oldDrillPreferenceScenarioDay, `${path}.oldDrillPreferenceScenarioDay`
      );
    }
  },
  context_label: (input, path) => {
    assertCommonInputFields(input, path);
    const directContext = Object.hasOwn(input, "realVoiceStack");
    const timedContext = directContext
      || Object.hasOwn(input, "scenarioDay") || Object.hasOwn(input, "sessionId");
    assertExactKeys(input, [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "surfaceLabel",
      "activity", "taskMode", "consequence",
      ...(directContext ? ["realVoiceStack"] : []),
      ...(timedContext ? ["scenarioDay", "sessionId"] : [])
    ], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.surfaceLabel, `${path}.surfaceLabel`);
    assertString(input.activity, `${path}.activity`);
    assertString(input.taskMode, `${path}.taskMode`);
    assertString(input.consequence, `${path}.consequence`);
    if (directContext) assertString(input.realVoiceStack, `${path}.realVoiceStack`);
    if (timedContext) {
      assertNonNegativeInteger(input.scenarioDay, `${path}.scenarioDay`);
      assertString(input.sessionId, `${path}.sessionId`);
    }
  },
  affordance_fact: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "direction", "description"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.direction, `${path}.direction`);
    assertString(input.description, `${path}.description`);
  },
  fixture_control_fact: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "control", "value"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.control, `${path}.control`);
    assertString(input.value, `${path}.value`);
  },
  user_response: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "content", "context"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.content, `${path}.content`);
    assertString(input.context, `${path}.context`);
  },
  simulator_realization: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "requestedRef", "realizedBehavior", "fidelity"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertOpaqueStateReference(input.requestedRef, `${path}.requestedRef`);
    assertString(input.realizedBehavior, `${path}.realizedBehavior`);
    assertOneOf(input.fidelity, ["match", "mismatch", "unknown"], `${path}.fidelity`);
  },
  simulator_behavior_realization: (input, path) => {
    assertCommonInputFields(input, path);
    const later = input.requestedBehavior
      === "delay_minor_correction_until_turn_completion";
    assertExactKeys(input, [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "requestedRef",
      "requestedBehavior", "realizedBehavior", "fidelity",
      ...(later ? [
        "canonicalInterventionPremise", "canonicalInterventionPremiseMatch"
      ] : []),
      "mismatchOrigin"
    ], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertOpaqueStateReference(input.requestedRef, `${path}.requestedRef`);
    assertString(input.requestedBehavior, `${path}.requestedBehavior`);
    assertString(input.realizedBehavior, `${path}.realizedBehavior`);
    assertOneOf(input.fidelity, ["match", "mismatch"], `${path}.fidelity`);
    if (later) {
      assertExactKeys(input.canonicalInterventionPremise, [
        "activity", "taskMode", "correctionClass", "timing", "sessionId"
      ], `${path}.canonicalInterventionPremise`);
      for (const key of Object.keys(input.canonicalInterventionPremise)) {
        assertString(
          input.canonicalInterventionPremise[key],
          `${path}.canonicalInterventionPremise.${key}`
        );
      }
      if (typeof input.canonicalInterventionPremiseMatch !== "boolean") {
        throw new SutBoundaryValidationError(
          `${path}.canonicalInterventionPremiseMatch must be a boolean.`
        );
      }
    }
    if (input.mismatchOrigin !== null) {
      assertString(input.mismatchOrigin, `${path}.mismatchOrigin`);
    }
  },
  state_reference: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, ["sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "stateRef"], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertOpaqueStateReference(input.stateRef, `${path}.stateRef`);
  },
  outcome_fact: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "observation",
      "context", ...(input.comparison ? ["comparison"] : [])
    ], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.observation, `${path}.observation`);
    assertString(input.context, `${path}.context`);
    if (input.comparison) {
      assertExactKeys(input.comparison, [
        "metric", "relation", "baselineSessionId", "currentSessionId"
      ], `${path}.comparison`);
      for (const key of Object.keys(input.comparison)) {
        assertString(input.comparison[key], `${path}.comparison.${key}`);
      }
    }
  },
  material_context_change: (input, path) => {
    assertCommonInputFields(input, path);
    const coIntervention = input.coInterventionVisibility !== undefined
      || input.completeness !== undefined;
    assertExactKeys(input, [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "description",
      ...(coIntervention ? ["coInterventionVisibility", "completeness"] : [])
    ], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.description, `${path}.description`);
    if (coIntervention) {
      assertString(input.coInterventionVisibility, `${path}.coInterventionVisibility`);
      assertString(input.completeness, `${path}.completeness`);
    }
  },
  fixture_evidence: (input, path) => {
    assertCommonInputFields(input, path);
    assertExactKeys(input, [
      "sourceFactRef", "kind", "sourceActor", "occurrenceOrder", "event", "context"
    ], path);
    assertString(input.sourceActor, `${path}.sourceActor`);
    assertPositiveInteger(input.occurrenceOrder, `${path}.occurrenceOrder`);
    assertString(input.event, `${path}.event`);
    assertString(input.context, `${path}.context`);
  }
};

export function validateInputBatch(batch) {
  assertExactKeys(batch, ["inputs"], "batch");
  if (!Array.isArray(batch.inputs) || batch.inputs.length === 0) {
    throw new SutBoundaryValidationError("batch.inputs must be a non-empty array.");
  }

  batch.inputs.forEach((input, index) => {
    const path = `batch.inputs[${index}]`;
    if (!isPlainObject(input) || typeof input.kind !== "string") {
      throw new SutBoundaryValidationError(`${path}.kind must identify a supported SUT-visible input role.`);
    }
    const validator = inputValidators[input.kind];
    if (!validator) {
      throw new SutBoundaryValidationError(`${path}.kind is not an accepted SUT-visible input role.`);
    }
    validator(input, path);
  });

  return structuredClone(batch.inputs);
}

function assertCommonInputFields(input, path) {
  assertOpaqueSourceFactReference(input.sourceFactRef, `${path}.sourceFactRef`);
}

function assertExactKeys(value, expectedKeys, path) {
  if (!isPlainObject(value)) {
    throw new SutBoundaryValidationError(`${path} must be a plain object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actualKeys.length !== expected.length || actualKeys.some((key, index) => key !== expected[index])) {
    throw new SutBoundaryValidationError(`${path} must contain exactly: ${expected.join(", ")}.`);
  }
}

function assertString(value, path) {
  if (typeof value !== "string" || value.length === 0) {
    throw new SutBoundaryValidationError(`${path} must be a non-empty string.`);
  }
}

function assertStringArray(value, path) {
  if (!Array.isArray(value) || value.length === 0
    || value.some((item) => typeof item !== "string" || item.length === 0)
    || new Set(value).size !== value.length) {
    throw new SutBoundaryValidationError(`${path} must be a non-empty array of unique strings.`);
  }
}

function assertBoolean(value, path) {
  if (typeof value !== "boolean") {
    throw new SutBoundaryValidationError(`${path} must be boolean.`);
  }
}

function assertPerformance(value, path) {
  if (!isPlainObject(value) || typeof value.kind !== "string") {
    throw new SutBoundaryValidationError(`${path}.kind must identify a supported raw performance form.`);
  }
  if (value.kind === "binary") {
    assertExactKeys(value, ["kind", "correct"], path);
    assertBoolean(value.correct, `${path}.correct`);
    return;
  }
  if (value.kind === "aggregate") {
    assertExactKeys(value, ["kind", "correctCount", "totalCount"], path);
    assertNonNegativeInteger(value.correctCount, `${path}.correctCount`);
    assertPositiveInteger(value.totalCount, `${path}.totalCount`);
    if (value.correctCount > value.totalCount) {
      throw new SutBoundaryValidationError(`${path}.correctCount must not exceed totalCount.`);
    }
    return;
  }
  throw new SutBoundaryValidationError(`${path}.kind is not an accepted raw performance form.`);
}

function assertPositiveInteger(value, path) {
  if (!Number.isInteger(value) || value < 1) {
    throw new SutBoundaryValidationError(`${path} must be a positive integer.`);
  }
}

function assertNonNegativeInteger(value, path) {
  if (!Number.isInteger(value) || value < 0) {
    throw new SutBoundaryValidationError(`${path} must be a non-negative integer.`);
  }
}

function assertOpaqueStateReference(value, path) {
  if (typeof value !== "string" || !/^state_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
    throw new SutBoundaryValidationError(`${path} must be an opaque SUT state reference.`);
  }
}

function assertOpaqueSourceFactReference(value, path) {
  if (typeof value !== "string" || !/^source_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
    throw new SutBoundaryValidationError(`${path} must be an opaque run-local source-fact reference.`);
  }
}

function assertOneOf(value, allowedValues, path) {
  if (!allowedValues.includes(value)) {
    throw new SutBoundaryValidationError(`${path} must be one of: ${allowedValues.join(", ")}.`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
