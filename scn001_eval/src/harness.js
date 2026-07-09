import { SUT_PUBLIC_BOUNDARY_METHODS } from "@zoey/scn001-sut-core";

import { projectFixtureRecords } from "./fixtureProjection.js";

export function createEvaluationHarness(sutBoundary) {
  assertPublicBoundary(sutBoundary);

  return Object.freeze({
    startRun() {
      return sutBoundary.startRun();
    },

    endRun(runRef) {
      return sutBoundary.endRun(runRef);
    },

    deliverFixtureRecords(runRef, fixtureRecords) {
      return sutBoundary.ingestSutVisibleInputs(runRef, projectFixtureRecords(fixtureRecords));
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
