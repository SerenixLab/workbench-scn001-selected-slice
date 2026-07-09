import { randomUUID } from "node:crypto";

import { SutReferenceError } from "./errors.js";

export class RunState {
  constructor() {
    this.runRef = createReference("run");
    this.nextOrder = 1;
    this.records = new Map();
    this.relations = [];
    this.actorReferences = new Map();
  }

  ingest(inputs) {
    const stagedActors = [];
    const stagedFacts = [];

    for (const input of inputs) {
      const actor = this.stageActor(input.sourceActor, stagedActors);
      stagedFacts.push({
        reference: createReference("state"),
        family: "input_fact",
        origin: "fixture",
        role: input.kind,
        payload: input,
        createdOrder: this.allocateOrder(),
        sourceActorRef: actor.reference
      });
    }

    const transition = {
      reference: createReference("transition"),
      family: "sut_transition_evidence",
      origin: "sut",
      transitionKind: "ingest_sut_visible_inputs",
      inputReferences: stagedFacts.map((fact) => fact.reference),
      createdOrder: this.allocateOrder(),
      result: "accepted"
    };

    for (const actor of stagedActors) {
      this.records.set(actor.reference, actor);
      this.actorReferences.set(actor.sourceActor, actor.reference);
    }
    for (const fact of stagedFacts) {
      this.records.set(fact.reference, fact);
    }
    this.records.set(transition.reference, transition);

    for (const fact of stagedFacts) {
      this.relations.push({
        relationKind: "source",
        fromRef: fact.reference,
        toRef: fact.sourceActorRef,
        targetRole: "semantic_source",
        effectiveOrder: fact.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
      this.relations.push({
        relationKind: "basis",
        fromRef: transition.reference,
        toRef: fact.reference,
        targetRole: "ingested_input",
        effectiveOrder: transition.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }

    return {
      acceptedInputRefs: stagedFacts.map((fact) => fact.reference),
      transitionRef: transition.reference
    };
  }

  snapshot() {
    return clone({
      runRef: this.runRef,
      records: [...this.records.values()].sort(byCreatedOrder),
      relations: [...this.relations].sort(byCreatedOrder)
    });
  }

  inspectRecord(reference) {
    const record = this.records.get(reference);
    if (!record) {
      throw new SutReferenceError(reference);
    }
    return clone(record);
  }

  enumerateLocalRelations(reference) {
    if (!this.records.has(reference)) {
      throw new SutReferenceError(reference);
    }
    return clone(this.relations.filter((relation) => relation.fromRef === reference || relation.toRef === reference));
  }

  stageActor(sourceActor, stagedActors) {
    const existingReference = this.actorReferences.get(sourceActor);
    if (existingReference) {
      return this.records.get(existingReference);
    }

    const alreadyStaged = stagedActors.find((actor) => actor.sourceActor === sourceActor);
    if (alreadyStaged) {
      return alreadyStaged;
    }

    const actor = {
      reference: createReference("actor"),
      family: "semantic_source",
      origin: "fixture",
      sourceActor,
      createdOrder: this.allocateOrder()
    };
    stagedActors.push(actor);
    return actor;
  }

  allocateOrder() {
    const order = this.nextOrder;
    this.nextOrder += 1;
    return order;
  }
}

export function createReference(family) {
  return `${family}_${randomUUID()}`;
}

function byCreatedOrder(left, right) {
  return left.createdOrder - right.createdOrder;
}

function clone(value) {
  return structuredClone(value);
}
