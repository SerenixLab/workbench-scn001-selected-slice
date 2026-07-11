import { SUT_PUBLIC_BOUNDARY_METHODS } from "@zoey/scn001-sut-core";

import { createSourceFactReference, projectFixtureRecords } from "./fixtureProjection.js";
import { realizeProposalOutput } from "./simulator.js";
import { createSimulatorProjector } from "./simulatorProjection.js";

const ACCEPTANCE_FIXTURES = Object.freeze({
  "P-USER-ACCEPT": Object.freeze({ role: "user_response", sourceActor: "synthetic-user-a", occurrenceOrder: 10, data: Object.freeze({
    content: "Yes, let's try that.", context: "proposal_response"
  }) }),
  "FC-RET-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 11, data: Object.freeze({
    control: "evaluation_retention_basis", value: "named_formal_run"
  }) }),
  "FC-UGC-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 12, data: Object.freeze({
    control: "user_governed_constraints", value: "exhaustive_selected_slice_scope"
  }) }),
  "FC-CONSEQ-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 13, data: Object.freeze({
    control: "consequence", value: "low"
  }) }),
  "FC-REV-001": Object.freeze({ role: "fixture_control_fact", sourceActor: "fixture-driver", occurrenceOrder: 14, data: Object.freeze({
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
      const { outputRef, entry } = eligible[0];
      const { record } = entry;
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
      if (prior) return Object.freeze([prior.record]);
      const record = renderOutput(output, transport.nextOrder);
      const projected = transport.projector.project(record);
      const result = sutBoundary.ingestSutVisibleInputs(runRef, { inputs: [projected] });
      if (!Array.isArray(result.acceptedInputRefs) || result.acceptedInputRefs.length !== 1) {
        throw new Error("Simulator routing must accept exactly one SUT input fact reference.");
      }
      transport.routed.set(output.outputRef, Object.freeze({
        record,
        simulatorFactRef: result.acceptedInputRefs[0]
      }));
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
    if (record.sourceActor !== expected.sourceActor) throw new Error(`Invalid source actor for ${id}.`);
    if (record.occurrenceOrder !== expected.occurrenceOrder) throw new Error(`Invalid occurrence order for ${id}.`);
    if (JSON.stringify(record.data) !== JSON.stringify(expected.data)) {
      throw new Error(`Invalid package-local content for ${id}.`);
    }
  }
}

function findEligibleRoutedRealizations(sutBoundary, runRef, transport) {
  const snapshot = sutBoundary.captureInspectionSnapshot(runRef);
  return [...transport.routed.entries()].flatMap(([outputRef, entry]) => {
    const { record, simulatorFactRef } = entry;
    if (transport.acceptanceDeliveries.has(outputRef)) return [{ outputRef, entry }];
    if (record.fidelity !== "match"
      || record.requestedMaterialIntent !== "offer_scoped_trial_for_user_decision"
      || record.requestedCandidateMaterialIntent !== "practice_spontaneous_production_for_target_dimension"
      || record.requestedScope.taskMode !== "spontaneous_production"
      || JSON.stringify(record.realizedMaterialIntent) !== JSON.stringify({
        materialIntent: record.requestedMaterialIntent,
        candidateMaterialIntent: record.requestedCandidateMaterialIntent,
        proposedScope: record.requestedScope
      })) return [];
    const proposal = exactRecord(snapshot, record.requestedRef, "proposal");
    const candidate = exactRecord(snapshot, record.candidateRef, "candidate");
    const affordance = exactRecord(snapshot, candidate?.trialDirectionRef, "trial direction");
    const candidateTransition = exactRecord(snapshot, candidate?.createdByTransitionRef, "candidate transition");
    const proposalTransition = exactRecord(snapshot, proposal?.createdByTransitionRef, "proposal transition");
    const proposalInteraction = exactRecord(snapshot, proposal?.interactionRef, "proposal interaction");
    const simulatorFact = exactRecord(snapshot, simulatorFactRef, "routed simulator fact");
    const transitions = snapshot.records.filter((item) => item.transitionKind === "record_proposal_realization"
      && (item.inputReferences?.includes(simulatorFactRef) || item.inputReferences?.includes(record.requestedRef)));
    const realizations = snapshot.relations.filter((relation) => relation.relationKind === "realization"
      && (relation.fromRef === simulatorFactRef || relation.toRef === record.requestedRef));
    if (transitions.length === 0 && realizations.length === 0) return [];
    const selection = exactRecord(snapshot, outputRef, "proposal selection");
    const transition = exactlyOne(transitions, "recording transition");
    const realization = exactlyOne(realizations, "realization relation");
    const factBasis = snapshot.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis" && relation.targetRole === "simulator_realization_fact");
    const selectionBasis = snapshot.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis" && relation.targetRole === "proposal_realization_selection");
    const recordingBases = snapshot.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis");
    const directionBasis = snapshot.relations.filter((relation) => relation.fromRef === candidate.reference
      && relation.relationKind === "basis" && relation.targetRole === "selected_trial_direction");
    const ancestry = snapshot.relations.filter((relation) => relation.fromRef === proposal.reference
      && relation.relationKind === "transition_ancestry");
    const copiedProposalEvidence = snapshot.relations.filter((relation) => relation.fromRef === proposal.reference
      && ["basis", "support"].includes(relation.relationKind));
    const proposalCandidateBasis = snapshot.relations.filter((relation) => (
      relation.fromRef === proposalTransition?.reference && relation.relationKind === "basis"
    ));
    const selectionIntentBasis = snapshot.relations.filter((relation) => relation.fromRef === selection.reference
      && relation.relationKind === "basis" && relation.targetRole === "selected_proposal_intent");
    const selectionBases = snapshot.relations.filter((relation) => relation.fromRef === selection.reference
      && relation.relationKind === "basis");
    const factInteraction = exactRecord(snapshot, simulatorFact?.firstInteractionRef, "simulator interaction");
    const valid = proposal?.family === "proposal_intent" && proposal.origin === "sut"
      && proposal.proposalType === "candidate_bound_trial_offer"
      && proposal.materialIntent === "offer_scoped_trial_for_user_decision"
      && proposal.candidateRef === candidate?.reference
      && proposal.candidateMaterialIntent === candidate?.materialIntent
      && JSON.stringify(proposal.proposedScope) === JSON.stringify(candidate?.proposedScope)
      && proposal.responseExpectation === "candidate_bound_trial_decision"
      && proposal.statusOrigin === "sut_transition"
      && proposalTransition?.family === "sut_transition_evidence" && proposalTransition.origin === "sut"
      && proposalTransition.transitionKind === "form_candidate_bound_proposal_intent"
      && proposalTransition.result === "proposal_intent_formed"
      && JSON.stringify(proposalTransition.inputReferences) === JSON.stringify([candidate.reference])
      && JSON.stringify(proposalTransition.resultReferences) === JSON.stringify([proposal.reference])
      && proposalTransition.interactionRef === proposal.interactionRef
      && proposalInteraction?.family === "interaction_segment" && proposalInteraction.origin === "sut"
      && proposal.interactionRef === candidate.interactionRef
      && candidate.createdOrder < candidateTransition.createdOrder
      && candidateTransition.createdOrder < proposal.createdOrder
      && proposal.createdOrder < proposalTransition.createdOrder
      && proposalTransition.createdOrder > candidateTransition.createdOrder
      && proposalCandidateBasis.length === 1
      && proposalCandidateBasis[0].toRef === candidate.reference
      && proposalCandidateBasis[0].targetRole === "proposal_candidate"
      && proposalCandidateBasis[0].assertedByRole === "sut"
      && proposalCandidateBasis[0].effectiveOrder === proposalTransition.createdOrder
      && proposalCandidateBasis[0].createdOrder === proposalTransition.createdOrder
      && ancestry.length === 1 && ancestry[0].toRef === candidate.reference
      && ancestry[0].targetRole === "candidate" && ancestry[0].assertedByRole === "sut"
      && ancestry[0].effectiveOrder === proposal.createdOrder
      && ancestry[0].createdOrder === proposalTransition.createdOrder
      && copiedProposalEvidence.length === 0
      && candidate?.family === "trial_candidate" && candidate.origin === "sut"
      && candidate.candidateType === "production_focused_practice"
      && candidate?.materialIntent === "practice_spontaneous_production_for_target_dimension"
      && candidate.candidateSource === "sut_transition"
      && candidate.purpose === "provisional_evaluative_trial"
      && candidate?.lifecycleStatus === "formed_non_active" && candidate?.lifecycleVersion === 1
      && candidate.statusOrigin === "sut_transition"
      && candidate?.proposedScope?.taskMode === "spontaneous_production"
      && JSON.stringify(candidate.proposedScope) === JSON.stringify(record.requestedScope)
      && candidateTransition?.family === "sut_transition_evidence" && candidateTransition.origin === "sut"
      && candidateTransition.transitionKind === "form_or_withhold_production_focused_candidate"
      && candidateTransition.result === "candidate_formed"
      && candidateTransition.interactionRef === candidate.interactionRef
      && candidateTransition.inputReferences?.includes(affordance.reference)
      && candidateTransition.resultReferences?.includes(candidate.reference)
      && affordance?.family === "input_fact" && affordance.origin === "fixture"
      && affordance.role === "affordance_fact" && affordance?.payload?.direction === "TRIAL-PROD-FOCUS"
      && directionBasis.length === 1 && directionBasis[0].toRef === affordance.reference
      && directionBasis[0].assertedByRole === "sut"
      && directionBasis[0].effectiveOrder === candidate.createdOrder
      && directionBasis[0].createdOrder === candidateTransition.createdOrder
      && simulatorFact?.family === "input_fact" && simulatorFact.origin === "simulator"
      && simulatorFact.role === "simulator_realization"
      && simulatorFact.payload.requestedRef === proposal.reference
      && simulatorFact.payload.realizedBehavior === record.realizedBehavior
      && simulatorFact.payload.fidelity === record.fidelity
      && simulatorFact.sourceFactRef === transport.projector.project(record).sourceFactRef
      && factInteraction?.family === "interaction_segment"
      && factInteraction.inputReferences?.includes(simulatorFact.reference)
      && selection?.family === "sut_transition_evidence"
      && selection.transitionKind === "select_proposal_for_realization"
      && selection.origin === "sut" && selection.result === "proposal_selected_for_realization"
      && JSON.stringify(selection.inputReferences) === JSON.stringify([proposal.reference])
      && selection.resultReferences?.length === 0
      && selection.interactionRef === proposal.interactionRef
      && selection.createdOrder > proposalTransition.createdOrder && selection.createdOrder < simulatorFact.createdOrder
      && selectionIntentBasis.length === 1 && selectionIntentBasis[0].toRef === proposal.reference
      && selectionBases.length === 1
      && selectionIntentBasis[0].assertedByRole === "sut"
      && selectionIntentBasis[0].createdOrder === selection.createdOrder
      && selectionIntentBasis[0].effectiveOrder === selection.createdOrder
      && transition.family === "sut_transition_evidence" && transition.origin === "sut"
      && transition.transitionKind === "record_proposal_realization"
      && transition.interactionRef === factInteraction.reference
      && transition.result === "proposal_realization_recorded"
      && JSON.stringify(transition.inputReferences) === JSON.stringify([simulatorFactRef, outputRef, proposal.reference])
      && transition.resultReferences?.length === 0 && transition.createdOrder > simulatorFact.createdOrder
      && realization.fromRef === simulatorFactRef && realization.toRef === proposal.reference
      && realization.targetRole === "proposal_intent" && realization.assertedByRole === "sut"
      && realization.fromRef !== realization.toRef
      && realization.createdOrder === transition.createdOrder && realization.effectiveOrder === transition.createdOrder
      && factBasis.length === 1 && factBasis[0].toRef === simulatorFactRef
      && recordingBases.length === 2
      && factBasis[0].assertedByRole === "sut" && factBasis[0].createdOrder === transition.createdOrder
      && factBasis[0].effectiveOrder === transition.createdOrder
      && selectionBasis.length === 1 && selectionBasis[0].toRef === outputRef
      && selectionBasis[0].assertedByRole === "sut" && selectionBasis[0].createdOrder === transition.createdOrder
      && selectionBasis[0].effectiveOrder === transition.createdOrder;
    if (!valid) throw new Error("Acceptance branch boundary integrity requires an exact P/S/F/R/E checkpoint.");
    return [{ outputRef, entry }];
  });
}

function exactRecord(snapshot, reference, label) {
  const matches = snapshot.records.filter((record) => record.reference === reference);
  if (matches.length > 1) throw new Error(`Acceptance branch has ambiguous ${label} identity.`);
  return matches[0];
}

function exactlyOne(values, label) {
  if (values.length !== 1) throw new Error(`Acceptance branch requires exactly one ${label}.`);
  return values[0];
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
