import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";

export function sourceFactMeaning(input) {
  const meaning = structuredClone(input);
  delete meaning.sourceFactRef;
  return meaning;
}

export function validateRetainedInputFact({
  records, relations, sourceFactBindings, fact, origin, role, interaction,
  expectedSourceActor
}) {
  const binding = sourceFactBindings.get(fact?.sourceFactRef);
  const actor = records.get(fact?.sourceActorRef);
  const ingestion = records.get(interaction?.createdByTransitionRef);
  const firstInteraction = records.get(fact?.firstInteractionRef);
  const firstIngestion = records.get(firstInteraction?.createdByTransitionRef);
  const source = relations.filter((relation) => relation.fromRef === fact.reference
    && relation.relationKind === "source");
  const basis = relations.filter((relation) => relation.fromRef === ingestion?.reference
    && relation.toRef === fact.reference && relation.relationKind === "basis");
  const firstBasis = relations.filter((relation) => (
    relation.fromRef === firstIngestion?.reference
    && relation.toRef === fact.reference
    && relation.relationKind === "basis"
  ));
  const containingInteractions = [...records.values()]
    .filter((record) => record.family === "interaction_segment"
      && record.inputReferences?.includes(fact.reference))
    .sort(byCreatedOrder);
  if (fact?.family !== "input_fact" || fact.origin !== origin || fact.role !== role
    || fact.payload?.sourceFactRef !== fact.sourceFactRef
    || binding?.inputFactRef !== fact.reference
    || binding.firstInteractionRef !== fact.firstInteractionRef
    || binding.firstIngestionTransitionRef !== firstIngestion?.reference
    || !isDeepStrictEqual(binding.semanticMeaning, sourceFactMeaning(fact.payload))
    || actor?.family !== "semantic_source" || actor.origin !== origin
    || fact.payload.sourceActor !== expectedSourceActor
    || actor.sourceActor !== expectedSourceActor
    || actor.sourceActor !== fact.payload.sourceActor || actor.reference !== fact.sourceActorRef
    || source.length !== 1 || source[0].toRef !== actor.reference
    || source[0].targetRole !== "semantic_source" || source[0].assertedByRole !== "sut"
    || source[0].effectiveOrder !== fact.createdOrder
    || source[0].createdOrder !== firstIngestion?.createdOrder
    || actor.createdOrder >= fact.createdOrder
    || firstInteraction?.family !== "interaction_segment" || firstInteraction.origin !== "sut"
    || firstInteraction.createdByTransitionRef !== binding.firstIngestionTransitionRef
    || containingInteractions.length === 0
    || containingInteractions[0].reference !== firstInteraction.reference
    || firstInteraction.inputReferences.filter((ref) => ref === fact.reference).length !== 1
    || firstIngestion?.family !== "sut_transition_evidence" || firstIngestion.origin !== "sut"
    || firstIngestion.transitionKind !== "ingest_sut_visible_inputs"
    || firstIngestion.interactionRef !== firstInteraction.reference
    || firstIngestion.inputReferences?.filter((ref) => ref === fact.reference).length !== 1
    || firstIngestion.resultReferences?.filter((ref) => ref === firstInteraction.reference).length !== 1
    || firstBasis.length !== 1 || firstBasis[0].targetRole !== "ingested_input"
    || firstBasis[0].assertedByRole !== "sut"
    || firstBasis[0].effectiveOrder !== firstIngestion.createdOrder
    || firstBasis[0].createdOrder !== firstIngestion.createdOrder
    || fact.createdOrder >= firstInteraction.createdOrder
    || firstInteraction.createdOrder >= firstIngestion.createdOrder
    || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
    || interaction.inputReferences.filter((ref) => ref === fact.reference).length !== 1
    || ingestion?.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference
    || ingestion.inputReferences.filter((ref) => ref === fact.reference).length !== 1
    || basis.length !== 1 || basis[0].targetRole !== "ingested_input"
    || basis[0].assertedByRole !== "sut" || basis[0].effectiveOrder !== ingestion.createdOrder
    || basis[0].createdOrder !== ingestion.createdOrder) {
    throw new SutStateIntegrityError("Activation retained input-fact closure is malformed.");
  }
}

export function isCanonicalProposalResponse(records, relations, response) {
  const actor = records.get(response.sourceActorRef);
  const ingestionInteraction = records.get(response.firstInteractionRef);
  const ingestionTransition = records.get(ingestionInteraction?.createdByTransitionRef);
  const sources = relations.filter((relation) => (
    relation.fromRef === response.reference && relation.relationKind === "source"
  ));
  return response.family === "input_fact" && response.origin === "fixture"
    && response.role === "user_response"
    && response.payload.context === "proposal_response"
    && response.payload.sourceActor === "synthetic-user-a"
    && response.sourceActorRef === actor?.reference
    && actor?.family === "semantic_source" && actor.origin === "fixture"
    && actor.sourceActor === "synthetic-user-a"
    && actor.createdOrder < response.createdOrder
    && ingestionInteraction?.family === "interaction_segment"
    && ingestionInteraction.inputReferences?.includes(response.reference)
    && ingestionTransition?.transitionKind === "ingest_sut_visible_inputs"
    && sources.length === 1 && sources[0].toRef === actor.reference
    && sources[0].targetRole === "semantic_source"
    && sources[0].assertedByRole === "sut"
    && sources[0].effectiveOrder === response.createdOrder
    && sources[0].createdOrder === ingestionTransition.createdOrder;
}

export function isValidInitializedIngestionResult(
  records, relations, reference, transition, interaction
) {
  const assertion = records.get(reference);
  const communication = records.get(assertion?.sourceCommunicationRef);
  const actor = records.get(assertion?.sourceActorRef);
  const sources = relations.filter((relation) => (
    relation.fromRef === reference && relation.relationKind === "source"
  ));
  const bases = relations.filter((relation) => (
    relation.fromRef === reference && relation.relationKind === "basis"
  ));
  return assertion?.family === "attributed_assertion" && assertion.origin === "fixture"
    && assertion.epistemicStatus === "attributed_user_assertion"
    && assertion.statusOrigin === "fixture_initialized"
    && assertion.interactionRef === interaction?.reference
    && assertion.createdByTransitionRef === transition?.reference
    && assertion.createdOrder < transition.createdOrder
    && communication?.family === "input_fact" && communication.origin === "fixture"
    && communication.role === "communication"
    && communication.payload?.semanticStatusOrigin === "fixture_initialized"
    && assertion.context === communication.payload.context
    && assertion.occurrenceOrder === communication.payload.occurrenceOrder
    && transition.inputReferences?.includes(communication.reference)
    && actor?.family === "semantic_source" && actor.origin === "fixture"
    && actor.sourceActor === communication.payload.sourceActor
    && actor.reference === assertion.sourceActorRef
    && communication.sourceActorRef === actor.reference
    && sources.length === 1 && sources[0].toRef === actor.reference
    && sources[0].targetRole === "semantic_source"
    && sources[0].assertedByRole === "fixture"
    && sources[0].effectiveOrder === assertion.createdOrder
    && sources[0].createdOrder === transition.createdOrder
    && bases.length === 1 && bases[0].toRef === communication.reference
    && bases[0].targetRole === "initialized_communication"
    && bases[0].assertedByRole === "fixture"
    && bases[0].effectiveOrder === assertion.createdOrder
    && bases[0].createdOrder === transition.createdOrder;
}

export function resolveUniqueCreatingTransition(records, record, label) {
  const claimants = [...records.values()].filter((candidate) => (
    candidate.reference === record?.createdByTransitionRef
    || candidate.resultReferences?.includes(record?.reference)
  ));
  if (claimants.length !== 1) {
    throw new SutStateIntegrityError(
      `${label} requires exactly one retained creating transition.`
    );
  }
  return claimants[0];
}

function byCreatedOrder(left, right) {
  return left.createdOrder - right.createdOrder;
}
