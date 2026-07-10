import { SUT_PUBLIC_BOUNDARY_METHODS } from "@zoey/scn001-sut-core";

import { createSourceFactReference, projectFixtureRecords } from "./fixtureProjection.js";

export function createEvaluationHarness(sutBoundary) {
  assertPublicBoundary(sutBoundary);
  const runSourceFactReferences = new Map();

  return Object.freeze({
    startRun() {
      const runRef = sutBoundary.startRun();
      runSourceFactReferences.set(runRef, new Map());
      return runRef;
    },

    endRun(runRef) {
      sutBoundary.endRun(runRef);
      runSourceFactReferences.delete(runRef);
    },

    deliverFixtureRecords(runRef, fixtureRecords) {
      const sourceReferences = runSourceFactReferences.get(runRef);
      if (!sourceReferences) {
        throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      }
      const sourceFactReferenceFor = (fixtureRecordId) => {
        const existing = sourceReferences.get(fixtureRecordId);
        if (existing) {
          return existing;
        }
        const created = createSourceFactReference();
        sourceReferences.set(fixtureRecordId, created);
        return created;
      };
      return sutBoundary.ingestSutVisibleInputs(
        runRef,
        projectFixtureRecords(fixtureRecords, sourceFactReferenceFor)
      );
    },

    processCurrentInteraction(runRef) {
      return sutBoundary.processCurrentInteraction(runRef);
    },

    emitAvailableOutputs(runRef) {
      return sutBoundary.emitAvailableOutputs(runRef);
    },

    captureInspectionSnapshot(runRef) {
      return sutBoundary.captureInspectionSnapshot(runRef);
    }
  });
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
