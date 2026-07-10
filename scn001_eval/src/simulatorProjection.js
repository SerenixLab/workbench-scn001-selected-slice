import { randomUUID } from "node:crypto";

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
      return {
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
  if (record?.role !== "simulated_realization_fact" || typeof record.simulatorRecordId !== "string") {
    throw new Error("Invalid evaluation-side simulator record.");
  }
}
