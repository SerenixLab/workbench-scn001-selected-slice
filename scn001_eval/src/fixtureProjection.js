const roleDefinitions = {
  communication_event: {
    kind: "communication",
    keys: ["content", "context", "semanticStatusOrigin"]
  },
  task_observation: {
    kind: "task_observation",
    keys: ["itemRef", "taskMode", "dimension", "performance", "occurrenceScenarioDay", "sessionId", "sessionOrder"]
  },
  chronology_fact: {
    kind: "chronology_fact",
    keys: ["scenarioDay", "sessionId", "sessionOrder"]
  },
  context_label: {
    kind: "context_label",
    keys: ["surfaceLabel", "activity", "taskMode", "consequence"]
  },
  affordance_fact: {
    kind: "affordance_fact",
    keys: ["direction", "description"]
  },
  fixture_control_fact: {
    kind: "fixture_control_fact",
    keys: ["control", "value"]
  },
  user_response: {
    kind: "user_response",
    keys: ["content", "context"]
  },
  simulator_realization_fact: {
    kind: "simulator_realization",
    keys: ["requestedRef", "realizedBehavior", "fidelity"]
  },
  sut_state_reference: {
    kind: "state_reference",
    keys: ["stateRef", "purpose"]
  },
  outcome_fact: {
    kind: "outcome_fact",
    keys: ["observation", "context"]
  },
  material_context_change: {
    kind: "material_context_change",
    keys: ["description"]
  }
};

export function projectFixtureRecord(record) {
  assertExactKeys(record, ["fixtureRecordId", "role", "sourceActor", "occurrenceOrder", "data", "oracleAnnotations"], "fixture record");
  const definition = roleDefinitions[record.role];
  if (!definition) {
    throw new Error(`Unsupported fixture role: ${record.role}.`);
  }
  assertExactKeys(record.data, definition.keys, `fixture record ${record.fixtureRecordId}.data`);
  if (definition.kind === "task_observation") {
    assertRawPerformance(record.data.performance, `fixture record ${record.fixtureRecordId}.data.performance`);
  }

  return {
    kind: definition.kind,
    sourceActor: record.sourceActor,
    occurrenceOrder: record.occurrenceOrder,
    ...structuredClone(record.data)
  };
}

export function projectFixtureRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Fixture projection requires a non-empty record array.");
  }
  return {
    inputs: records.map(projectFixtureRecord)
  };
}

function assertExactKeys(value, expectedKeys, path) {
  if (!isPlainObject(value)) {
    throw new Error(`${path} must be a plain object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actualKeys.length !== expected.length || actualKeys.some((key, index) => key !== expected[index])) {
    throw new Error(`${path} must contain exactly: ${expected.join(", ")}.`);
  }
}

function assertRawPerformance(value, path) {
  if (!isPlainObject(value) || typeof value.kind !== "string") {
    throw new Error(`${path}.kind must identify a supported raw performance form.`);
  }
  if (value.kind === "binary") {
    assertExactKeys(value, ["kind", "correct"], path);
    if (typeof value.correct !== "boolean") {
      throw new Error(`${path}.correct must be boolean.`);
    }
    return;
  }
  if (value.kind === "aggregate") {
    assertExactKeys(value, ["kind", "correctCount", "totalCount"], path);
    if (!Number.isInteger(value.correctCount) || value.correctCount < 0) {
      throw new Error(`${path}.correctCount must be a non-negative integer.`);
    }
    if (!Number.isInteger(value.totalCount) || value.totalCount < 1) {
      throw new Error(`${path}.totalCount must be a positive integer.`);
    }
    if (value.correctCount > value.totalCount) {
      throw new Error(`${path}.correctCount must not exceed totalCount.`);
    }
    return;
  }
  throw new Error(`${path}.kind is not an accepted raw performance form.`);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
