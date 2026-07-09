import { randomUUID } from "node:crypto";

import { SutBoundaryValidationError, SutReferenceError } from "./errors.js";

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

  assertInputReferencesResolve(inputs) {
    for (const input of inputs) {
      const reference = input.kind === "state_reference"
        ? input.stateRef
        : input.kind === "simulator_realization"
          ? input.requestedRef
          : undefined;

      if (reference && !this.records.has(reference)) {
        throw new SutBoundaryValidationError(
          `SUT-visible reference ${reference} does not resolve inside this run.`
        );
      }
    }
  }

  processCurrentInteraction() {
    this.deriveAttributedAssertions();
    this.deriveTemporalEligibilityAssessments();
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

  deriveAttributedAssertions() {
    const communicationFacts = this.inputFacts().filter((fact) => (
      fact.role === "communication" && !this.hasDerivedRecord(fact.reference, "attributed_assertion")
    ));
    if (communicationFacts.length === 0) {
      return;
    }

    const assertions = communicationFacts.map((fact) => ({
      reference: createReference("state"),
      family: "attributed_assertion",
      origin: "sut",
      sourceCommunicationRef: fact.reference,
      sourceActorRef: fact.sourceActorRef,
      context: fact.payload.context,
      occurrenceOrder: fact.payload.occurrenceOrder,
      epistemicStatus: "attributed_user_assertion",
      statusOrigin: "sut_transition",
      createdOrder: this.allocateOrder()
    }));
    const transition = this.createTransition(
      "attribute_current_communications",
      communicationFacts.map((fact) => fact.reference),
      assertions.map((assertion) => assertion.reference)
    );

    this.commitDerivedRecords(assertions, transition);
    for (const assertion of assertions) {
      this.relations.push({
        relationKind: "source",
        fromRef: assertion.reference,
        toRef: assertion.sourceActorRef,
        targetRole: "semantic_source",
        effectiveOrder: assertion.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
      this.relations.push({
        relationKind: "basis",
        fromRef: assertion.reference,
        toRef: assertion.sourceCommunicationRef,
        targetRole: "attributed_communication",
        effectiveOrder: assertion.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }
  }

  deriveTemporalEligibilityAssessments() {
    const currentChronology = this.currentChronologyFact();
    if (!currentChronology) {
      return;
    }

    const observations = this.inputFacts().filter((fact) => (
      fact.role === "task_observation"
      && fact.payload.occurrenceScenarioDay < currentChronology.payload.scenarioDay
      && !this.hasDerivedRecord(fact.reference, "temporal_eligibility_assessment")
    ));
    if (observations.length === 0) {
      return;
    }

    const assessments = observations.map((observation) => {
      const ageDays = currentChronology.payload.scenarioDay - observation.payload.occurrenceScenarioDay;
      return {
        reference: createReference("state"),
        family: "temporal_eligibility_assessment",
        origin: "sut",
        assessedObservationRef: observation.reference,
        chronologyRef: currentChronology.reference,
        useTarget: "independent_current_skill_authority",
        dimension: observation.payload.dimension,
        observationScenarioDay: observation.payload.occurrenceScenarioDay,
        currentScenarioDay: currentChronology.payload.scenarioDay,
        ageDays,
        eligibility: ageDays > 90 ? "ineligible" : "eligible",
        temporalUncertainty: "none",
        statusOrigin: "sut_transition",
        createdOrder: this.allocateOrder()
      };
    });
    const transition = this.createTransition(
      "assess_temporal_eligibility",
      [...observations.map((observation) => observation.reference), currentChronology.reference],
      assessments.map((assessment) => assessment.reference)
    );

    this.commitDerivedRecords(assessments, transition);
    for (const assessment of assessments) {
      this.relations.push({
        relationKind: "basis",
        fromRef: assessment.reference,
        toRef: assessment.assessedObservationRef,
        targetRole: "assessed_evidence",
        semanticUseTarget: assessment.useTarget,
        effectiveOrder: assessment.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
      this.relations.push({
        relationKind: "basis",
        fromRef: assessment.reference,
        toRef: assessment.chronologyRef,
        targetRole: "current_chronology",
        semanticUseTarget: assessment.useTarget,
        effectiveOrder: assessment.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }
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

  inputFacts() {
    return [...this.records.values()].filter((record) => record.family === "input_fact");
  }

  currentChronologyFact() {
    return this.inputFacts()
      .filter((fact) => fact.role === "chronology_fact")
      .sort((left, right) => (
        right.payload.scenarioDay - left.payload.scenarioDay
        || right.payload.sessionOrder - left.payload.sessionOrder
        || right.payload.occurrenceOrder - left.payload.occurrenceOrder
      ))[0];
  }

  hasDerivedRecord(inputReference, family) {
    return this.relations.some((relation) => (
      relation.relationKind === "basis"
      && relation.toRef === inputReference
      && this.records.get(relation.fromRef)?.family === family
    ));
  }

  createTransition(transitionKind, inputReferences, resultReferences) {
    return {
      reference: createReference("transition"),
      family: "sut_transition_evidence",
      origin: "sut",
      transitionKind,
      inputReferences,
      resultReferences,
      createdOrder: this.allocateOrder(),
      result: "accepted"
    };
  }

  commitDerivedRecords(records, transition) {
    for (const record of records) {
      this.records.set(record.reference, record);
    }
    this.records.set(transition.reference, transition);
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
