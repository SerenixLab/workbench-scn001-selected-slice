import { randomUUID } from "node:crypto";

import { SutBoundaryValidationError, SutReferenceError } from "./errors.js";

export class RunState {
  constructor() {
    this.runRef = createReference("run");
    this.nextOrder = 1;
    this.records = new Map();
    this.relations = [];
    this.actorReferences = new Map();
    this.pendingInteractions = [];
  }

  ingest(inputs) {
    const interactionRef = createReference("interaction");
    const stagedActors = [];
    const stagedFacts = [];

    for (const input of inputs) {
      const origin = inputOrigin(input);
      const actor = this.stageActor(input.sourceActor, origin, stagedActors);
      stagedFacts.push({
        reference: createReference("state"),
        family: "input_fact",
        origin,
        role: input.kind,
        payload: input,
        interactionRef,
        createdOrder: this.allocateOrder(),
        sourceActorRef: actor.reference
      });
    }

    const initializedAssertions = stagedFacts
      .filter((fact) => (
        fact.role === "communication"
        && fact.payload.semanticStatusOrigin === "fixture_initialized"
      ))
      .map((fact) => ({
        reference: createReference("state"),
        family: "attributed_assertion",
        origin: "fixture",
        sourceCommunicationRef: fact.reference,
        sourceActorRef: fact.sourceActorRef,
        context: fact.payload.context,
        occurrenceOrder: fact.payload.occurrenceOrder,
        epistemicStatus: "attributed_user_assertion",
        statusOrigin: "fixture_initialized",
        interactionRef,
        createdOrder: this.allocateOrder()
      }));
    const interaction = {
      reference: interactionRef,
      family: "interaction_segment",
      origin: "sut",
      inputReferences: stagedFacts.map((fact) => fact.reference),
      createdOrder: this.allocateOrder()
    };

    const transition = {
      reference: createReference("transition"),
      family: "sut_transition_evidence",
      origin: "sut",
      transitionKind: "ingest_sut_visible_inputs",
      interactionRef,
      inputReferences: stagedFacts.map((fact) => fact.reference),
      resultReferences: [
        interaction.reference,
        ...initializedAssertions.map((assertion) => assertion.reference)
      ],
      createdOrder: this.allocateOrder(),
      result: "accepted"
    };
    for (const assertion of initializedAssertions) {
      assertion.createdByTransitionRef = transition.reference;
    }
    interaction.createdByTransitionRef = transition.reference;

    for (const actor of stagedActors) {
      this.records.set(actor.reference, actor);
      this.actorReferences.set(actorReferenceKey(actor.sourceActor, actor.origin), actor.reference);
    }
    for (const fact of stagedFacts) {
      this.records.set(fact.reference, fact);
    }
    for (const assertion of initializedAssertions) {
      this.records.set(assertion.reference, assertion);
    }
    this.records.set(interaction.reference, interaction);
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

    for (const assertion of initializedAssertions) {
      this.relations.push({
        relationKind: "source",
        fromRef: assertion.reference,
        toRef: assertion.sourceActorRef,
        targetRole: "semantic_source",
        effectiveOrder: assertion.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "fixture"
      });
      this.relations.push({
        relationKind: "basis",
        fromRef: assertion.reference,
        toRef: assertion.sourceCommunicationRef,
        targetRole: "initialized_communication",
        effectiveOrder: assertion.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "fixture"
      });
    }

    this.pendingInteractions.push(interaction);

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
    const interaction = this.pendingInteractions[0];
    if (!interaction) {
      return;
    }

    const interactionFacts = interaction.inputReferences.map((reference) => this.records.get(reference));
    const semanticTransitionRefs = [
      this.deriveAttributedAssertions(interaction, interactionFacts),
      this.deriveTemporalEligibilityAssessments(interaction, interactionFacts),
      this.deriveDimensionComparisons(interaction, interactionFacts)
    ].filter(Boolean);
    const processingTransition = this.createTransition(
      "process_interaction_segment",
      [interaction.reference, ...interaction.inputReferences],
      semanticTransitionRefs,
      interaction.reference
    );
    processingTransition.result = "processed";
    this.records.set(processingTransition.reference, processingTransition);
    for (const reference of [interaction.reference, ...interaction.inputReferences]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: processingTransition.reference,
        toRef: reference,
        targetRole: reference === interaction.reference ? "processed_interaction" : "processed_input",
        effectiveOrder: processingTransition.createdOrder,
        createdOrder: processingTransition.createdOrder,
        assertedByRole: "sut"
      });
    }
    this.pendingInteractions.shift();
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

  deriveAttributedAssertions(interaction, interactionFacts) {
    const communicationFacts = interactionFacts.filter((fact) => (
      fact.role === "communication"
      && fact.payload.semanticStatusOrigin === "unclassified"
    ));
    if (communicationFacts.length === 0) {
      return undefined;
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
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    }));
    const transition = this.createTransition(
      "attribute_current_communications",
      communicationFacts.map((fact) => fact.reference),
      assertions.map((assertion) => assertion.reference),
      interaction.reference
    );
    attachCreatingTransition(assertions, transition);

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
    return transition.reference;
  }

  deriveTemporalEligibilityAssessments(interaction, interactionFacts) {
    const currentChronology = this.currentChronologyFact(interactionFacts);
    if (!currentChronology) {
      return undefined;
    }

    const evidenceEntries = this.temporalEvidenceEntries(interactionFacts)
      .filter(({ observation }) => (
        observation.payload.occurrenceScenarioDay < currentChronology.payload.scenarioDay
      ));
    if (evidenceEntries.length === 0) {
      return undefined;
    }

    const assessments = evidenceEntries.map(({ observation, referenceFact }) => {
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
        evidenceReferenceRef: referenceFact?.reference,
        interactionRef: interaction.reference,
        createdOrder: this.allocateOrder()
      };
    });
    const inputReferences = uniqueReferences([
      ...evidenceEntries.flatMap(({ observation, referenceFact }) => (
        referenceFact ? [observation.reference, referenceFact.reference] : [observation.reference]
      )),
      currentChronology.reference
    ]);
    const transition = this.createTransition(
      "assess_temporal_eligibility",
      inputReferences,
      assessments.map((assessment) => assessment.reference),
      interaction.reference
    );
    attachCreatingTransition(assessments, transition);

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
      if (assessment.evidenceReferenceRef) {
        this.relations.push({
          relationKind: "basis",
          fromRef: assessment.reference,
          toRef: assessment.evidenceReferenceRef,
          targetRole: "evidence_reference",
          semanticUseTarget: assessment.useTarget,
          effectiveOrder: assessment.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
      }
    }
    return transition.reference;
  }

  deriveDimensionComparisons(interaction, interactionFacts) {
    const observationsByDimension = new Map();
    for (const fact of interactionFacts) {
      if (
        fact.role !== "task_observation"
        || !["recognition", "spontaneous_production"].includes(fact.payload.taskMode)
      ) {
        continue;
      }

      const grouped = observationsByDimension.get(fact.payload.dimension) ?? {
        recognition: [],
        spontaneousProduction: []
      };
      const target = fact.payload.taskMode === "recognition"
        ? grouped.recognition
        : grouped.spontaneousProduction;
      target.push(fact);
      observationsByDimension.set(fact.payload.dimension, grouped);
    }

    const comparisons = [];
    for (const [dimension, grouped] of observationsByDimension) {
      if (grouped.recognition.length === 0 || grouped.spontaneousProduction.length === 0) {
        continue;
      }

      const recognitionPerformance = summarizePerformance(grouped.recognition);
      const productionPerformance = summarizePerformance(grouped.spontaneousProduction);
      comparisons.push({
        reference: createReference("state"),
        family: "dimension_comparison",
        origin: "sut",
        targetDimension: dimension,
        recognitionTaskMode: "recognition",
        productionTaskMode: "spontaneous_production",
        recognitionObservationRefs: grouped.recognition.map((fact) => fact.reference),
        productionObservationRefs: grouped.spontaneousProduction.map((fact) => fact.reference),
        recognitionPerformance,
        productionPerformance,
        comparisonResult: comparePerformance(recognitionPerformance, productionPerformance),
        uncertainty: "bounded_to_supplied_calibration",
        statusOrigin: "sut_transition",
        interactionRef: interaction.reference,
        createdOrder: this.allocateOrder()
      });
    }
    if (comparisons.length === 0) {
      return undefined;
    }

    const transition = this.createTransition(
      "compare_recognition_and_spontaneous_production",
      uniqueReferences(comparisons.flatMap((comparison) => [
        ...comparison.recognitionObservationRefs,
        ...comparison.productionObservationRefs
      ])),
      comparisons.map((comparison) => comparison.reference),
      interaction.reference
    );
    attachCreatingTransition(comparisons, transition);
    this.commitDerivedRecords(comparisons, transition);

    for (const comparison of comparisons) {
      for (const reference of comparison.recognitionObservationRefs) {
        this.relations.push(comparisonBasisRelation(
          comparison,
          reference,
          "recognition_observation",
          "recognition",
          transition
        ));
      }
      for (const reference of comparison.productionObservationRefs) {
        this.relations.push(comparisonBasisRelation(
          comparison,
          reference,
          "production_observation",
          "spontaneous_production",
          transition
        ));
      }
    }
    return transition.reference;
  }

  stageActor(sourceActor, origin, stagedActors) {
    const identityKey = actorReferenceKey(sourceActor, origin);
    const existingReference = this.actorReferences.get(identityKey);
    if (existingReference) {
      return this.records.get(existingReference);
    }

    const alreadyStaged = stagedActors.find((actor) => (
      actor.sourceActor === sourceActor && actor.origin === origin
    ));
    if (alreadyStaged) {
      return alreadyStaged;
    }

    const actor = {
      reference: createReference("actor"),
      family: "semantic_source",
      origin,
      sourceActor,
      createdOrder: this.allocateOrder()
    };
    stagedActors.push(actor);
    return actor;
  }

  currentChronologyFact(interactionFacts) {
    return interactionFacts
      .filter((fact) => fact.role === "chronology_fact")
      .sort((left, right) => (
        right.payload.scenarioDay - left.payload.scenarioDay
        || right.payload.sessionOrder - left.payload.sessionOrder
        || right.payload.occurrenceOrder - left.payload.occurrenceOrder
      ))[0];
  }

  temporalEvidenceEntries(interactionFacts) {
    const entries = [];
    const seenObservationRefs = new Set();

    for (const fact of interactionFacts) {
      const observation = fact.role === "task_observation"
        ? fact
        : fact.role === "state_reference"
          && fact.payload.purpose === "independent_current_skill_authority"
          ? this.records.get(fact.payload.stateRef)
          : undefined;
      if (
        observation?.family !== "input_fact"
        || observation.role !== "task_observation"
        || seenObservationRefs.has(observation.reference)
      ) {
        continue;
      }

      seenObservationRefs.add(observation.reference);
      entries.push({
        observation,
        referenceFact: fact.role === "state_reference" ? fact : undefined
      });
    }

    return entries;
  }

  createTransition(transitionKind, inputReferences, resultReferences, interactionRef) {
    return {
      reference: createReference("transition"),
      family: "sut_transition_evidence",
      origin: "sut",
      transitionKind,
      interactionRef,
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

function inputOrigin(input) {
  return input.kind === "simulator_realization" ? "simulator" : "fixture";
}

function actorReferenceKey(sourceActor, origin) {
  return `${origin}:${sourceActor}`;
}

function attachCreatingTransition(records, transition) {
  for (const record of records) {
    record.createdByTransitionRef = transition.reference;
  }
}

function uniqueReferences(references) {
  return [...new Set(references)];
}

function summarizePerformance(observations) {
  return observations.reduce((summary, observation) => {
    const performance = observation.payload.performance;
    if (performance.kind === "binary") {
      summary.correctCount += performance.correct ? 1 : 0;
      summary.totalCount += 1;
    } else {
      summary.correctCount += performance.correctCount;
      summary.totalCount += performance.totalCount;
    }
    return summary;
  }, { correctCount: 0, totalCount: 0 });
}

function comparePerformance(recognitionPerformance, productionPerformance) {
  const crossProductDifference = (
    recognitionPerformance.correctCount * productionPerformance.totalCount
    - productionPerformance.correctCount * recognitionPerformance.totalCount
  );
  if (crossProductDifference > 0) {
    return "recognition_score_higher";
  }
  if (crossProductDifference < 0) {
    return "spontaneous_production_score_higher";
  }
  return "no_observed_score_difference";
}

function comparisonBasisRelation(comparison, reference, targetRole, taskMode, transition) {
  return {
    relationKind: "basis",
    fromRef: comparison.reference,
    toRef: reference,
    targetRole,
    semanticDimension: comparison.targetDimension,
    semanticTaskMode: taskMode,
    effectiveOrder: comparison.createdOrder,
    createdOrder: transition.createdOrder,
    assertedByRole: "sut"
  };
}

function clone(value) {
  return structuredClone(value);
}
