import { randomUUID } from "node:crypto";

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
    keys: ["stateRef"]
  },
  outcome_fact: {
    kind: "outcome_fact",
    keys: ["observation", "context"]
  },
  material_context_change: {
    kind: "material_context_change",
    keys: ["description"]
  },
  fixture_evidence: {
    kind: "fixture_evidence",
    keys: ["event", "context"]
  }
};

export function projectFixtureRecord(record, sourceFactRef = createSourceFactReference()) {
  assertExactKeys(record, ["fixtureRecordId", "role", "sourceActor", "occurrenceOrder", "data", "oracleAnnotations"], "fixture record");
  const definition = roleDefinitions[record.role];
  if (!definition) {
    throw new Error(`Unsupported fixture role: ${record.role}.`);
  }
  let dataKeys = definition.keys;
  if (record.role === "task_observation" && Object.hasOwn(record.data, "itemRefs")) {
    dataKeys = definition.keys.map((key) => key === "itemRef" ? "itemRefs" : key);
  } else if (record.role === "context_label" && Object.hasOwn(record.data, "scenarioDay")) {
    dataKeys = [...definition.keys, "scenarioDay", "sessionId"];
    if (Object.hasOwn(record.data, "realVoiceStack")) dataKeys.push("realVoiceStack");
  } else if (record.role === "chronology_fact"
    && Object.hasOwn(record.data, "focusedDrillScenarioDay")) {
    dataKeys = [
      ...definition.keys, "focusedDrillScenarioDay", "oldDrillPreferenceScenarioDay"
    ];
  }
  assertExactKeys(record.data, dataKeys, `fixture record ${record.fixtureRecordId}.data`);
  if (definition.kind === "task_observation") {
    if (Object.hasOwn(record.data, "itemRefs")) {
      assertStringArray(record.data.itemRefs, `fixture record ${record.fixtureRecordId}.data.itemRefs`);
    }
    assertRawPerformance(record.data.performance, `fixture record ${record.fixtureRecordId}.data.performance`);
  }

  return {
    sourceFactRef,
    kind: definition.kind,
    sourceActor: record.sourceActor,
    occurrenceOrder: record.occurrenceOrder,
    ...structuredClone(record.data)
  };
}

export function projectFixtureRecords(records, sourceFactReferenceFor = () => createSourceFactReference()) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Fixture projection requires a non-empty record array.");
  }
  return {
    inputs: records.map((record) => projectFixtureRecord(
      record,
      sourceFactReferenceFor(record.fixtureRecordId)
    ))
  };
}

export function createSourceFactReference() {
  return `source_${randomUUID()}`;
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

function assertStringArray(value, path) {
  if (!Array.isArray(value) || value.length === 0
    || value.some((item) => typeof item !== "string" || item.length === 0)
    || new Set(value).size !== value.length) {
    throw new Error(`${path} must be a non-empty array of unique strings.`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
