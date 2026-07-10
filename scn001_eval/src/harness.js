import { SUT_PUBLIC_BOUNDARY_METHODS } from "@zoey/scn001-sut-core";

import { createSourceFactReference, projectFixtureRecords } from "./fixtureProjection.js";
import { realizeProposalOutput } from "./simulator.js";
import { createSimulatorProjector } from "./simulatorProjection.js";

export function createEvaluationHarness(sutBoundary, ...extraArguments) {
  if (extraArguments.length !== 0) {
    throw new Error("The formal evaluation harness accepts only the SUT public boundary.");
  }
  return createHarnessForMechanismTests(sutBoundary);
}

export function createHarnessForMechanismTests(sutBoundary, dependencies = {}) {
  assertPublicBoundary(sutBoundary);
  const renderOutput = dependencies.renderOutput ?? realizeProposalOutput;
  const createProjector = dependencies.createProjector ?? createSimulatorProjector;
  const runSourceFactReferences = new Map();
  const runTransport = new Map();

  return Object.freeze({
    startRun() {
      const runRef = sutBoundary.startRun();
      runSourceFactReferences.set(runRef, new Map());
      runTransport.set(runRef, { routed: new Map(), projector: createProjector(), nextOrder: 1 });
      return runRef;
    },

    endRun(runRef) {
      sutBoundary.endRun(runRef);
      runSourceFactReferences.delete(runRef);
      runTransport.delete(runRef);
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

    realizeAvailableOutputs(runRef) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      const outputs = sutBoundary.emitAvailableOutputs(runRef);
      if (outputs.length === 0) return Object.freeze([]);
      if (outputs.length !== 1) {
        throw new Error("Harness boundary integrity requires at most one available SUT output.");
      }
      const output = outputs[0];
      const prior = transport.routed.get(output.outputRef);
      if (prior) return Object.freeze([prior]);
      const record = renderOutput(output, transport.nextOrder);
      const projected = transport.projector.project(record);
      sutBoundary.ingestSutVisibleInputs(runRef, { inputs: [projected] });
      transport.routed.set(output.outputRef, record);
      transport.nextOrder += 1;
      return Object.freeze([record]);
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
