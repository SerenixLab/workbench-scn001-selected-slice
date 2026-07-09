import { SutBoundaryValidationError, SutReferenceError } from "./errors.js";
import { validateInputBatch } from "./inputValidation.js";
import { RunState } from "./runState.js";

export const SUT_PUBLIC_BOUNDARY_METHODS = Object.freeze([
  "startRun",
  "endRun",
  "ingestSutVisibleInputs",
  "processCurrentInteraction",
  "emitAvailableOutputs",
  "captureInspectionSnapshot",
  "inspectRecord",
  "enumerateLocalRelations"
]);

export function createSutBoundary() {
  const runs = new Map();

  return Object.freeze({
    startRun(...argumentsReceived) {
      assertArity("startRun", argumentsReceived, 0);
      const run = new RunState();
      runs.set(run.runRef, run);
      return run.runRef;
    },

    endRun(...argumentsReceived) {
      assertArity("endRun", argumentsReceived, 1);
      const [runRef] = argumentsReceived;
      getRun(runs, runRef);
      runs.delete(runRef);
    },

    ingestSutVisibleInputs(...argumentsReceived) {
      assertArity("ingestSutVisibleInputs", argumentsReceived, 2);
      const [runRef, batch] = argumentsReceived;
      const inputs = validateInputBatch(batch);
      return getRun(runs, runRef).ingest(inputs);
    },

    processCurrentInteraction(...argumentsReceived) {
      assertArity("processCurrentInteraction", argumentsReceived, 1);
      const [runRef] = argumentsReceived;
      getRun(runs, runRef);
      return Object.freeze([]);
    },

    emitAvailableOutputs(...argumentsReceived) {
      assertArity("emitAvailableOutputs", argumentsReceived, 1);
      const [runRef] = argumentsReceived;
      getRun(runs, runRef);
      return Object.freeze([]);
    },

    captureInspectionSnapshot(...argumentsReceived) {
      assertArity("captureInspectionSnapshot", argumentsReceived, 1);
      const [runRef] = argumentsReceived;
      return getRun(runs, runRef).snapshot();
    },

    inspectRecord(...argumentsReceived) {
      assertArity("inspectRecord", argumentsReceived, 2);
      const [runRef, recordRef] = argumentsReceived;
      return getRun(runs, runRef).inspectRecord(recordRef);
    },

    enumerateLocalRelations(...argumentsReceived) {
      assertArity("enumerateLocalRelations", argumentsReceived, 2);
      const [runRef, recordRef] = argumentsReceived;
      return getRun(runs, runRef).enumerateLocalRelations(recordRef);
    }
  });
}

function getRun(runs, runRef) {
  if (typeof runRef !== "string" || !runs.has(runRef)) {
    throw new SutReferenceError(runRef);
  }
  return runs.get(runRef);
}

function assertArity(methodName, argumentsReceived, expectedArity) {
  if (argumentsReceived.length !== expectedArity) {
    throw new SutBoundaryValidationError(`${methodName} accepts exactly ${expectedArity} argument(s).`);
  }
}
