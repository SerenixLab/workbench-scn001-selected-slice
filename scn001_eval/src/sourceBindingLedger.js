import { isDeepStrictEqual } from "node:util";

export function createSourceBindingLedger() {
  const bySourceFactRef = new Map();
  const sourceFactRefByRetainedFactRef = new Map();

  return Object.freeze({
    assertDeliveryCompatible(projectedInputs) {
      validateProjectedInputs(projectedInputs);
      const projectedBySource = new Map();
      for (const input of projectedInputs) {
        const existing = bySourceFactRef.get(input.sourceFactRef);
        const projected = projectedBySource.get(input.sourceFactRef);
        if (existing && !isDeepStrictEqual(existing.projectedMeaning, input)) {
          throw new Error("Evaluation source identity cannot be rebound to new projected meaning.");
        }
        if (projected && !isDeepStrictEqual(projected, input)) {
          throw new Error("One delivery cannot rebind an evaluation source identity.");
        }
        projectedBySource.set(input.sourceFactRef, input);
      }
    },

    recordSuccessfulIngress(projectedInputs, ingressResult, inspectionSnapshot) {
      validateProjectedInputs(projectedInputs);
      const acceptedInputRefs = ingressResult?.acceptedInputRefs;
      if (!Array.isArray(acceptedInputRefs)
        || acceptedInputRefs.length !== projectedInputs.length
        || acceptedInputRefs.some((reference) => (
          typeof reference !== "string" || reference.length === 0
        ))
        || typeof ingressResult.transitionRef !== "string"
        || ingressResult.transitionRef.length === 0) {
        throw new Error("Successful ingress must correlate every projected input to one retained fact.");
      }

      const resolved = resolveSuccessfulIngress(
        inspectionSnapshot, projectedInputs, acceptedInputRefs, ingressResult.transitionRef
      );

      const pending = [];
      const pendingBySource = new Map();
      const pendingSourceByRetained = new Map();
      for (const [index, input] of projectedInputs.entries()) {
        const acceptedInputFactRef = acceptedInputRefs[index];
        const existing = bySourceFactRef.get(input.sourceFactRef);
        const existingSource = sourceFactRefByRetainedFactRef.get(acceptedInputFactRef);
        const pendingExisting = pendingBySource.get(input.sourceFactRef);
        const pendingRetainedSource = pendingSourceByRetained.get(acceptedInputFactRef);
        if (existing && (existing.acceptedInputFactRef !== acceptedInputFactRef
          || existing.firstInteractionRef !== resolved[index].firstInteractionRef
          || existing.firstIngestionTransitionRef
            !== resolved[index].firstIngestionTransitionRef
          || !isDeepStrictEqual(existing.projectedMeaning, input))) {
          throw new Error("Evaluation source identity cannot be rebound after successful ingress.");
        }
        if (existingSource && existingSource !== input.sourceFactRef) {
          throw new Error("A retained fact cannot receive two evaluation source bindings.");
        }
        if (pendingExisting && (pendingExisting.acceptedInputFactRef !== acceptedInputFactRef
          || pendingExisting.firstInteractionRef !== resolved[index].firstInteractionRef
          || pendingExisting.firstIngestionTransitionRef
            !== resolved[index].firstIngestionTransitionRef
          || !isDeepStrictEqual(pendingExisting.projectedMeaning, input))) {
          throw new Error("One ingress cannot rebind an evaluation source identity.");
        }
        if (pendingRetainedSource && pendingRetainedSource !== input.sourceFactRef) {
          throw new Error("One ingress cannot bind two sources to one retained fact.");
        }
        if (existing || pendingExisting) continue;

        const entry = deepFreeze({
          sourceFactRef: input.sourceFactRef,
          projectedMeaning: structuredClone(input),
          acceptedInputFactRef,
          firstInteractionRef: resolved[index].firstInteractionRef,
          firstIngestionTransitionRef: resolved[index].firstIngestionTransitionRef,
          deliveryOrigin: input.kind.startsWith("simulator_") ? "simulator" : "fixture",
          role: input.kind
        });
        pending.push(entry);
        pendingBySource.set(entry.sourceFactRef, entry);
        pendingSourceByRetained.set(entry.acceptedInputFactRef, entry.sourceFactRef);
      }

      for (const entry of pending) {
        bySourceFactRef.set(entry.sourceFactRef, entry);
        sourceFactRefByRetainedFactRef.set(
          entry.acceptedInputFactRef, entry.sourceFactRef
        );
      }
    },

    readOnlyEvidence() {
      return deepFreeze([...bySourceFactRef.values()].map((entry) => structuredClone(entry)));
    },

    clear() {
      bySourceFactRef.clear();
      sourceFactRefByRetainedFactRef.clear();
    }
  });
}

function resolveSuccessfulIngress(snapshot, projectedInputs, acceptedInputRefs, transitionRef) {
  if (!snapshot || !Array.isArray(snapshot.records) || !Array.isArray(snapshot.relations)) {
    throw new Error("Successful ingress identity inspection is malformed.");
  }
  const records = new Map();
  for (const record of snapshot.records) {
    if (typeof record?.reference !== "string" || record.reference.length === 0
      || records.has(record.reference)) {
      throw new Error("Successful ingress identity inspection has ambiguous records.");
    }
    records.set(record.reference, record);
  }

  const currentIngestion = records.get(transitionRef);
  const currentInteraction = records.get(currentIngestion?.interactionRef);
  validateIngestionClosure(
    records, snapshot.relations, currentInteraction, currentIngestion,
    uniqueReferences(acceptedInputRefs)
  );

  return acceptedInputRefs.map((acceptedInputFactRef, index) => {
    const projectedInput = projectedInputs[index];
    const fact = records.get(acceptedInputFactRef);
    if (!hasExactKeys(fact, [
      "reference", "family", "origin", "role", "sourceFactRef", "payload",
      "firstInteractionRef", "createdOrder", "sourceActorRef"
    ]) || fact.family !== "input_fact"
      || fact.origin !== (projectedInput.kind.startsWith("simulator_")
        ? "simulator" : "fixture")
      || fact.role !== projectedInput.kind || fact.sourceFactRef !== projectedInput.sourceFactRef
      || !isDeepStrictEqual(fact.payload, projectedInput)) {
      throw new Error("Successful ingress retained fact identity is malformed.");
    }
    const firstInteraction = records.get(fact.firstInteractionRef);
    const firstIngestion = records.get(firstInteraction?.createdByTransitionRef);
    const actor = records.get(fact.sourceActorRef);
    const sources = snapshot.relations.filter((relation) => (
      relation.fromRef === fact.reference && relation.relationKind === "source"
    ));
    validateIngestionClosure(
      records, snapshot.relations, firstInteraction, firstIngestion,
      firstInteraction?.inputReferences
    );
    if (!firstInteraction.inputReferences.includes(fact.reference)
      || !hasExactKeys(actor, [
        "reference", "family", "origin", "sourceActor", "createdOrder"
      ]) || actor.family !== "semantic_source" || actor.origin !== fact.origin
      || actor.sourceActor !== projectedInput.sourceActor
      || sources.length !== 1 || sources[0].toRef !== actor.reference
      || sources[0].targetRole !== "semantic_source"
      || sources[0].assertedByRole !== "sut"
      || sources[0].effectiveOrder !== fact.createdOrder
      || sources[0].createdOrder !== firstIngestion.createdOrder
      || actor.createdOrder >= fact.createdOrder
      || fact.createdOrder >= firstInteraction.createdOrder) {
      throw new Error("Successful ingress original fact identity is malformed.");
    }
    return {
      firstInteractionRef: firstInteraction.reference,
      firstIngestionTransitionRef: firstIngestion.reference
    };
  });
}

function validateIngestionClosure(records, relations, interaction, ingestion, expectedInputs) {
  const claimants = [...records.values()].filter((record) => (
    record.reference === interaction?.createdByTransitionRef
      || record.resultReferences?.includes(interaction?.reference)
  ));
  const bases = relations.filter((relation) => (
    relation.fromRef === ingestion?.reference && relation.relationKind === "basis"
  ));
  const additionalResults = ingestion?.resultReferences?.filter(
    (reference) => reference !== interaction?.reference
  ) ?? [];
  const expectedInitializedCommunicationRefs = interaction?.inputReferences
    ?.filter((reference) => {
      const inputFact = records.get(reference);
      return inputFact?.family === "input_fact"
        && inputFact.origin === "fixture"
        && inputFact.role === "communication"
        && inputFact.firstInteractionRef === interaction.reference
        && inputFact.payload?.semanticStatusOrigin === "fixture_initialized";
    }) ?? [];
  if (!hasExactKeys(interaction, [
    "reference", "family", "origin", "inputReferences", "createdOrder",
    "createdByTransitionRef"
  ]) || interaction.family !== "interaction_segment" || interaction.origin !== "sut"
    || !Array.isArray(expectedInputs)
    || !isDeepStrictEqual(interaction.inputReferences, expectedInputs)
    || new Set(interaction.inputReferences).size !== interaction.inputReferences.length
    || !hasExactKeys(ingestion, [
      "reference", "family", "origin", "transitionKind", "interactionRef",
      "inputReferences", "resultReferences", "createdOrder", "result"
    ]) || ingestion.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
    || ingestion.transitionKind !== "ingest_sut_visible_inputs"
    || ingestion.interactionRef !== interaction.reference || ingestion.result !== "accepted"
    || interaction.createdByTransitionRef !== ingestion.reference || claimants.length !== 1
    || !isDeepStrictEqual(ingestion.inputReferences, interaction.inputReferences)
    || ingestion.resultReferences.filter((reference) => (
      reference === interaction.reference
    )).length !== 1
    || new Set(ingestion.resultReferences).size !== ingestion.resultReferences.length
    || additionalResults.some((reference) => !isValidInitializedIngestionResult(
      records, relations, reference, ingestion, interaction
    ))
    || !isDeepStrictEqual(additionalResults.map(
      (reference) => records.get(reference)?.sourceCommunicationRef
    ), expectedInitializedCommunicationRefs)
    || bases.length !== interaction.inputReferences.length
    || !sameReferenceSet(
      bases.map((relation) => relation.toRef), interaction.inputReferences
    )
    || bases.some((relation) => relation.targetRole !== "ingested_input"
      || relation.assertedByRole !== "sut"
      || relation.effectiveOrder !== ingestion.createdOrder
      || relation.createdOrder !== ingestion.createdOrder)
    || interaction.createdOrder >= ingestion.createdOrder) {
    throw new Error("Successful ingress transition identity is malformed.");
  }
}

function isValidInitializedIngestionResult(
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

function uniqueReferences(references) {
  return [...new Set(references)];
}

function sameReferenceSet(left, right) {
  return isDeepStrictEqual([...left].sort(), [...right].sort());
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function validateProjectedInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("Evaluation source binding requires projected SUT-visible inputs.");
  }
  for (const input of inputs) {
    if (!input || Object.getPrototypeOf(input) !== Object.prototype
      || typeof input.sourceFactRef !== "string" || input.sourceFactRef.length === 0
      || typeof input.kind !== "string" || input.kind.length === 0) {
      throw new Error("Evaluation source binding requires complete projected input meaning.");
    }
  }
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
