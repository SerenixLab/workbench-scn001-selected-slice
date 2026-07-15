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

    recordSuccessfulIngress(projectedInputs, acceptedInputRefs) {
      validateProjectedInputs(projectedInputs);
      if (!Array.isArray(acceptedInputRefs)
        || acceptedInputRefs.length !== projectedInputs.length
        || acceptedInputRefs.some((reference) => (
          typeof reference !== "string" || reference.length === 0
        ))) {
        throw new Error("Successful ingress must correlate every projected input to one retained fact.");
      }

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
          || !isDeepStrictEqual(existing.projectedMeaning, input))) {
          throw new Error("Evaluation source identity cannot be rebound after successful ingress.");
        }
        if (existingSource && existingSource !== input.sourceFactRef) {
          throw new Error("A retained fact cannot receive two evaluation source bindings.");
        }
        if (pendingExisting && (pendingExisting.acceptedInputFactRef !== acceptedInputFactRef
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
