import { SUT_PUBLIC_BOUNDARY_METHODS } from "@zoey/scn001-sut-core";

import { createSourceFactReference, projectFixtureRecords } from "./fixtureProjection.js";
import { realizeProposalOutput } from "./simulator.js";
import { createSimulatorProjector } from "./simulatorProjection.js";

const ACCEPTANCE_FIXTURES = Object.freeze({
  "P-USER-ACCEPT": Object.freeze({ role: "user_response", data: Object.freeze({
    content: "Yes, let's try that.", context: "proposal_response"
  }) }),
  "FC-RET-001": Object.freeze({ role: "fixture_control_fact", data: Object.freeze({
    control: "evaluation_retention_basis", value: "named_formal_run"
  }) }),
  "FC-UGC-001": Object.freeze({ role: "fixture_control_fact", data: Object.freeze({
    control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
  }) }),
  "FC-CONSEQ-001": Object.freeze({ role: "fixture_control_fact", data: Object.freeze({
    control: "consequence", value: "low"
  }) }),
  "FC-REV-001": Object.freeze({ role: "fixture_control_fact", data: Object.freeze({
    control: "reversibility", value: "reversible"
  }) })
});

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
      runTransport.set(runRef, {
        routed: new Map(), projector: createProjector(), nextOrder: 1, acceptanceDeliveries: new Map()
      });
      return runRef;
    },

    endRun(runRef) {
      sutBoundary.endRun(runRef);
      runSourceFactReferences.delete(runRef);
      runTransport.delete(runRef);
    },

    deliverFixtureRecords(runRef, fixtureRecords) {
      if (Array.isArray(fixtureRecords) && fixtureRecords.some((record) => record?.role === "user_response")) {
        throw new Error("Generic formal fixture delivery cannot deliver user_response records.");
      }
      return deliverProjectedFixtureRecords(runRef, fixtureRecords);
    },

    deliverProposalAcceptanceIfEligible(runRef, responseAndControlFixtureRecords) {
      const transport = runTransport.get(runRef);
      if (!transport) throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      validateAcceptanceFixtureSet(responseAndControlFixtureRecords);
      const eligible = findEligibleRoutedRealizations(sutBoundary, runRef, transport);
      if (eligible.length === 0) return Object.freeze([]);
      if (eligible.length > 1) {
        throw new Error("Acceptance branch requires exactly one eligible routed realization.");
      }
      const { outputRef, record } = eligible[0];
      const prior = transport.acceptanceDeliveries.get(outputRef);
      if (prior) return prior;
      const simulatorInput = transport.projector.project(record);
      const fixtureBatch = projectFixtureRecords(
        responseAndControlFixtureRecords,
        sourceFactReferenceForRun(runRef)
      );
      const result = sutBoundary.ingestSutVisibleInputs(runRef, {
        inputs: [simulatorInput, ...fixtureBatch.inputs]
      });
      const frozen = deepFreeze([{ outputRef, acceptedInputRefs: [...result.acceptedInputRefs] }]);
      transport.acceptanceDeliveries.set(outputRef, frozen);
      return frozen;
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

  function sourceFactReferenceForRun(runRef) {
      const sourceReferences = runSourceFactReferences.get(runRef);
      if (!sourceReferences) {
        throw new Error(`Unknown or closed evaluation run: ${runRef}.`);
      }
      return (fixtureRecordId) => {
        const existing = sourceReferences.get(fixtureRecordId);
        if (existing) {
          return existing;
        }
        const created = createSourceFactReference();
        sourceReferences.set(fixtureRecordId, created);
        return created;
      };
  }

  function deliverProjectedFixtureRecords(runRef, fixtureRecords) {
      const sourceFactReferenceFor = sourceFactReferenceForRun(runRef);
      return sutBoundary.ingestSutVisibleInputs(
        runRef,
        projectFixtureRecords(fixtureRecords, sourceFactReferenceFor)
      );
  }
}

function validateAcceptanceFixtureSet(records) {
  if (!Array.isArray(records) || records.length !== 5) {
    throw new Error("Acceptance delivery requires the exact five-record response/control set.");
  }
  const byId = new Map(records.map((record) => [record?.fixtureRecordId, record]));
  if (byId.size !== 5 || Object.keys(ACCEPTANCE_FIXTURES).some((id) => !byId.has(id))) {
    throw new Error("Acceptance delivery requires exact package-local fixture identities.");
  }
  for (const [id, expected] of Object.entries(ACCEPTANCE_FIXTURES)) {
    const record = byId.get(id);
    projectFixtureRecords([record], () => "source_00000000-0000-0000-0000-000000000000");
    if (record.role !== expected.role) throw new Error(`Invalid role for ${id}.`);
    if (JSON.stringify(record.data) !== JSON.stringify(expected.data)) {
      throw new Error(`Invalid package-local content for ${id}.`);
    }
  }
}

function findEligibleRoutedRealizations(sutBoundary, runRef, transport) {
  const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
  return [...transport.routed.entries()].flatMap(([outputRef, record]) => {
    if (transport.acceptanceDeliveries.has(outputRef)) return [{ outputRef, record }];
    if (record.fidelity !== "match"
      || record.requestedMaterialIntent !== "offer_scoped_trial_for_user_decision"
      || record.requestedCandidateMaterialIntent !== "practice_spontaneous_production_for_target_dimension"
      || record.requestedScope.taskMode !== "spontaneous_production"
      || JSON.stringify(record.realizedMaterialIntent) !== JSON.stringify({
        materialIntent: record.requestedMaterialIntent,
        candidateMaterialIntent: record.requestedCandidateMaterialIntent,
        proposedScope: record.requestedScope
      })) return [];
    const proposal = snapshot.records.find((item) => item.reference === record.requestedRef);
    const candidate = snapshot.records.find((item) => item.reference === record.candidateRef);
    const affordance = snapshot.records.find((item) => item.reference === candidate?.trialDirectionRef);
    const simulatorFact = snapshot.records.find((item) => (
      item.family === "input_fact" && item.role === "simulator_realization"
      && item.payload.requestedRef === record.requestedRef
      && item.payload.realizedBehavior === record.realizedBehavior
      && item.payload.fidelity === record.fidelity
    ));
    const realization = snapshot.relations.find((relation) => (
      relation.relationKind === "realization" && relation.fromRef === simulatorFact?.reference
      && relation.toRef === proposal?.reference && relation.targetRole === "proposal_intent"
    ));
    const transition = snapshot.records.find((item) => (
      item.transitionKind === "record_proposal_realization"
      && item.inputReferences?.[0] === simulatorFact?.reference
      && item.inputReferences?.[1] === outputRef
      && item.inputReferences?.[2] === proposal?.reference
    ));
    return proposal?.candidateRef === candidate?.reference
      && candidate?.materialIntent === "practice_spontaneous_production_for_target_dimension"
      && candidate?.lifecycleStatus === "formed_non_active" && candidate?.lifecycleVersion === 1
      && candidate?.proposedScope?.taskMode === "spontaneous_production"
      && JSON.stringify(candidate.proposedScope) === JSON.stringify(record.requestedScope)
      && affordance?.role === "affordance_fact" && affordance?.payload?.direction === "TRIAL-PROD-FOCUS"
      && realization && transition ? [{ outputRef, record }] : [];
  });
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
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
