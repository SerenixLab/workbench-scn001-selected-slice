import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { SutBoundaryValidationError, SutReferenceError, SutStateIntegrityError } from "./errors.js";

const PRODUCTION_FOCUSED_TRIAL_DIRECTION = "TRIAL-PROD-FOCUS";

export class RunState {
  constructor() {
    this.runRef = createReference("run");
    this.nextOrder = 1;
    this.records = new Map();
    this.relations = [];
    this.actorReferences = new Map();
    this.sourceFactBindings = new Map();
    this.pendingInteractions = [];
  }

  ingest(inputs) {
    const interactionRef = createReference("interaction");
    const stagedActors = [];
    const stagedFacts = [];
    const acceptedInputFacts = [];
    const inputFacts = [];
    const semanticInputReferences = new Set();

    for (const input of inputs) {
      const existingBinding = this.sourceFactBindings.get(input.sourceFactRef);
      if (existingBinding) {
        const fact = this.records.get(existingBinding.inputFactRef);
        acceptedInputFacts.push(fact);
        appendUniqueSemanticInput(inputFacts, semanticInputReferences, fact);
        continue;
      }
      const alreadyStaged = stagedFacts.find((fact) => fact.sourceFactRef === input.sourceFactRef);
      if (alreadyStaged) {
        acceptedInputFacts.push(alreadyStaged);
        appendUniqueSemanticInput(inputFacts, semanticInputReferences, alreadyStaged);
        continue;
      }
      const origin = inputOrigin(input);
      const actor = this.stageActor(input.sourceActor, origin, stagedActors);
      const fact = {
        reference: createReference("state"),
        family: "input_fact",
        origin,
        role: input.kind,
        sourceFactRef: input.sourceFactRef,
        payload: input,
        firstInteractionRef: interactionRef,
        createdOrder: this.allocateOrder(),
        sourceActorRef: actor.reference
      };
      stagedFacts.push(fact);
      acceptedInputFacts.push(fact);
      appendUniqueSemanticInput(inputFacts, semanticInputReferences, fact);
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
      inputReferences: inputFacts.map((fact) => fact.reference),
      createdOrder: this.allocateOrder()
    };

    const transition = {
      reference: createReference("transition"),
      family: "sut_transition_evidence",
      origin: "sut",
      transitionKind: "ingest_sut_visible_inputs",
      interactionRef,
      inputReferences: inputFacts.map((fact) => fact.reference),
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
      this.sourceFactBindings.set(fact.sourceFactRef, {
        inputFactRef: fact.reference,
        semanticMeaning: sourceFactMeaning(fact.payload)
      });
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
    }
    for (const fact of inputFacts) {
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
      acceptedInputRefs: acceptedInputFacts.map((fact) => fact.reference),
      transitionRef: transition.reference
    };
  }

  assertSourceFactConsistency(inputs) {
    const batchMeanings = new Map();
    for (const input of inputs) {
      const meaning = sourceFactMeaning(input);
      const batchMeaning = batchMeanings.get(input.sourceFactRef);
      if (batchMeaning && !isDeepStrictEqual(batchMeaning, meaning)) {
        throw new SutBoundaryValidationError(
          `Source-fact reference ${input.sourceFactRef} cannot identify different SUT-visible fact content.`
        );
      }
      batchMeanings.set(input.sourceFactRef, meaning);

      const existing = this.sourceFactBindings.get(input.sourceFactRef);
      if (existing && !isDeepStrictEqual(existing.semanticMeaning, meaning)) {
        throw new SutBoundaryValidationError(
          `Source-fact reference ${input.sourceFactRef} cannot be rebound to different SUT-visible fact content.`
        );
      }
    }
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
    const attributionTransitionRef = this.deriveAttributedAssertions(interaction, interactionFacts);
    const temporalAssessmentTransitionRef = this.deriveTemporalEligibilityAssessments(
      interaction,
      interactionFacts
    );
    const comparisonTransitionRef = this.deriveDimensionComparisons(interaction, interactionFacts);
    const candidateFormationTransitionRef = this.deriveTrialCandidateDecisions(
      interaction,
      interactionFacts
    );
    const proposalIntentTransitionRef = this.deriveCandidateBoundProposalIntents(
      interaction,
      candidateFormationTransitionRef
    );
    const proposalRealizationSelectionTransitionRef = this.deriveProposalRealizationSelection(
      interaction,
      proposalIntentTransitionRef
    );
    const proposalRealizationTransitionRef = this.recordProposalRealizations(
      interaction,
      interactionFacts
    );
    const bindingAssessmentTransitionRef = this.assessProposalResponseBinding(
      interaction,
      interactionFacts
    );
    const semanticTransitionRefs = [
      attributionTransitionRef,
      temporalAssessmentTransitionRef,
      comparisonTransitionRef,
      candidateFormationTransitionRef,
      proposalIntentTransitionRef,
      proposalRealizationSelectionTransitionRef,
      proposalRealizationTransitionRef,
      bindingAssessmentTransitionRef
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

  emitAvailableOutputs() {
    const outstanding = [...this.records.values()]
      .filter((record) => record.transitionKind === "select_proposal_for_realization")
      .map((selection) => {
        const proposal = this.validateProposalSelection(selection);
        const realization = this.resolveProposalRealizationClosure(proposal.reference);
        return realization ? undefined : { selection, proposal };
      })
      .filter(Boolean);
    if (outstanding.length !== 1) {
      return Object.freeze([]);
    }
    const { selection, proposal } = outstanding[0];
    return deepFreeze([{
      kind: "proposal_realization_request",
      outputRef: selection.reference,
      requestedRef: proposal.reference,
      candidateRef: proposal.candidateRef,
      materialIntent: proposal.materialIntent,
      candidateMaterialIntent: proposal.candidateMaterialIntent,
      proposedScope: structuredClone(proposal.proposedScope)
    }]);
  }

  deriveAttributedAssertions(interaction, interactionFacts) {
    const communicationFacts = interactionFacts.filter((fact) => (
      fact.role === "communication"
      && fact.payload.semanticStatusOrigin === "unclassified"
      && !this.findRecord((record) => (
        record.family === "attributed_assertion"
        && record.sourceCommunicationRef === fact.reference
        && record.statusOrigin === "sut_transition"
      ))
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

    const observations = interactionFacts
      .filter((fact) => fact.role === "task_observation")
      .filter((observation) => (
        observation.payload.occurrenceScenarioDay < currentChronology.payload.scenarioDay
      ));
    if (observations.length === 0) {
      return undefined;
    }

    const assessments = observations.flatMap((observation) => {
      const existing = this.findRecord((record) => (
        record.family === "temporal_eligibility_assessment"
        && record.assessedObservationRef === observation.reference
        && record.chronologyRef === currentChronology.reference
        && record.useTarget === "independent_current_skill_authority"
      ));
      if (existing) {
        return [];
      }
      const ageDays = currentChronology.payload.scenarioDay - observation.payload.occurrenceScenarioDay;
      return [{
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
        interactionRef: interaction.reference,
        createdOrder: this.allocateOrder()
      }];
    });
    if (assessments.length === 0) {
      return undefined;
    }
    const inputReferences = uniqueReferences([
      ...assessments.map((assessment) => assessment.assessedObservationRef),
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

      const recognitionObservationRefs = grouped.recognition.map((fact) => fact.reference);
      const productionObservationRefs = grouped.spontaneousProduction.map((fact) => fact.reference);
      const existing = this.findRecord((record) => (
        record.family === "dimension_comparison"
        && record.targetDimension === dimension
        && record.recognitionTaskMode === "recognition"
        && record.productionTaskMode === "spontaneous_production"
        && sameReferenceSet(record.recognitionObservationRefs, recognitionObservationRefs)
        && sameReferenceSet(record.productionObservationRefs, productionObservationRefs)
      ));
      if (existing) {
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
        recognitionObservationRefs,
        productionObservationRefs,
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

  deriveTrialCandidateDecisions(interaction, interactionFacts) {
    const observations = interactionFacts.filter((fact) => (
      fact.role === "task_observation"
      && ["recognition", "spontaneous_production"].includes(fact.payload.taskMode)
    ));
    const affordances = interactionFacts.filter((fact) => fact.role === "affordance_fact");
    if (observations.length === 0 || affordances.length === 0) {
      return undefined;
    }

    const productionAffordances = affordances.filter((fact) => (
      fact.payload.direction === PRODUCTION_FOCUSED_TRIAL_DIRECTION
    ));
    const observationGroups = groupCalibrationObservations(observations);
    const completeGroups = [...observationGroups.entries()].filter(([, grouped]) => (
      grouped.recognition.length > 0 && grouped.spontaneousProduction.length > 0
    ));
    const decisions = [];

    if (completeGroups.length === 0) {
      decisions.push({
        kind: "non_activation",
        disposition: "DISP-REQUEST-MORE-EVIDENCE",
        reason: "exact_comparison_support_unavailable",
        observationBasisRefs: uniqueReferences(observations.map((fact) => fact.reference))
      });
    }

    for (const [dimension, grouped] of completeGroups) {
      const comparison = this.resolveExactDimensionComparison(
        dimension,
        grouped.recognition.map((fact) => fact.reference),
        grouped.spontaneousProduction.map((fact) => fact.reference)
      );
      if (!comparison) {
        decisions.push({
          kind: "non_activation",
          disposition: "DISP-REQUEST-MORE-EVIDENCE",
          reason: "exact_comparison_support_unavailable",
          targetDimension: dimension,
          observationBasisRefs: uniqueReferences([
            ...grouped.recognition.map((fact) => fact.reference),
            ...grouped.spontaneousProduction.map((fact) => fact.reference)
          ])
        });
        continue;
      }
      if (productionAffordances.length !== 1) {
        decisions.push({
          kind: "non_activation",
          comparison,
          disposition: "DISP-WITHHOLD",
          reason: productionAffordances.length === 0
            ? "required_trial_direction_unavailable"
            : "required_trial_direction_ambiguous"
        });
        continue;
      }

      const selectedAffordance = productionAffordances[0];
      if (comparison.comparisonResult !== "recognition_score_higher") {
        decisions.push({
          kind: "non_activation",
          comparison,
          selectedAffordance,
          disposition: "DISP-WITHHOLD",
          reason: comparison.comparisonResult === "no_observed_score_difference"
            ? "no_observed_recognition_production_difference"
            : "production_focused_direction_not_supported"
        });
        continue;
      }

      decisions.push({
        kind: "candidate",
        comparison,
        selectedAffordance
      });
    }

    const decisionBasisAffordanceRefs = sortedReferences(affordances.map((fact) => fact.reference));
    const newDecisions = decisions.filter((decision) => !this.findExistingTrialDecision(
      decision,
      decisionBasisAffordanceRefs
    ));
    if (newDecisions.length === 0) {
      return undefined;
    }

    const decisionRecords = newDecisions.map((decision) => (
      decision.kind === "candidate"
        ? {
            reference: createReference("state"),
            family: "trial_candidate",
            origin: "sut",
            candidateType: "production_focused_practice",
            materialIntent: "practice_spontaneous_production_for_target_dimension",
            candidateSource: "sut_transition",
            purpose: "provisional_evaluative_trial",
            trialDirectionRef: decision.selectedAffordance.reference,
            supportComparisonRef: decision.comparison.reference,
            proposedScope: {
              dimension: decision.comparison.targetDimension,
              taskMode: "spontaneous_production"
            },
            reversibility: "retirable_before_activation",
            correctionPath: "separate_activation_required_before_behavior_effect",
            lifecycleStatus: "formed_non_active",
            lifecycleVersion: 1,
            decisionBasisAffordanceRefs,
            uncertainty: decision.comparison.uncertainty,
            statusOrigin: "sut_transition",
            interactionRef: interaction.reference,
            createdOrder: this.allocateOrder()
          }
        : {
            reference: createReference("state"),
            family: "non_activation_disposition",
            origin: "sut",
            disposition: decision.disposition,
            reason: decision.reason,
            appliesTo: "trial_candidate_formation",
            consideredTrialDirectionRef: decision.selectedAffordance?.reference,
            supportComparisonRef: decision.comparison?.reference,
            targetDimension: decision.comparison?.targetDimension ?? decision.targetDimension,
            observationBasisRefs: decision.observationBasisRefs,
            decisionBasisAffordanceRefs,
            statusOrigin: "sut_transition",
            interactionRef: interaction.reference,
            createdOrder: this.allocateOrder()
          }
    ));
    const transition = this.createTransition(
      "form_or_withhold_production_focused_candidate",
      uniqueReferences([
        ...observations.map((fact) => fact.reference),
        ...newDecisions.flatMap((decision) => (
          decision.comparison ? [decision.comparison.reference] : []
        )),
        ...affordances.map((fact) => fact.reference)
      ]),
      decisionRecords.map((record) => record.reference),
      interaction.reference
    );
    const candidateCount = newDecisions.filter((decision) => decision.kind === "candidate").length;
    transition.result = candidateCount === newDecisions.length
      ? "candidate_formed"
      : candidateCount === 0
        ? "non_activation_recorded"
        : "candidate_and_non_activation_recorded";
    attachCreatingTransition(decisionRecords, transition);
    this.commitDerivedRecords(decisionRecords, transition);

    newDecisions.forEach((decision, index) => {
      const record = decisionRecords[index];
      if (decision.kind === "candidate") {
        this.relations.push({
          relationKind: "basis",
          fromRef: record.reference,
          toRef: decision.selectedAffordance.reference,
          targetRole: "selected_trial_direction",
          effectiveOrder: record.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
        this.relations.push({
          relationKind: "basis",
          fromRef: record.reference,
          toRef: decision.comparison.reference,
          targetRole: "comparison_input",
          effectiveOrder: record.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
        this.relations.push({
          relationKind: "support",
          fromRef: record.reference,
          toRef: decision.comparison.reference,
          targetRole: "dimension_comparison",
          effectiveOrder: record.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
        return;
      }
      if (decision.comparison) {
        this.relations.push({
          relationKind: "basis",
          fromRef: record.reference,
          toRef: decision.comparison.reference,
          targetRole: "comparison_evidence",
          effectiveOrder: record.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
      }
      for (const observationRef of decision.observationBasisRefs ?? []) {
        this.relations.push({
          relationKind: "basis",
          fromRef: record.reference,
          toRef: observationRef,
          targetRole: "candidate_formation_observation",
          effectiveOrder: record.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
      }
      if (decision.selectedAffordance) {
        this.relations.push({
          relationKind: "basis",
          fromRef: record.reference,
          toRef: decision.selectedAffordance.reference,
          targetRole: "considered_trial_direction",
          effectiveOrder: record.createdOrder,
          createdOrder: transition.createdOrder,
          assertedByRole: "sut"
        });
      }
    });

    return transition.reference;
  }

  deriveCandidateBoundProposalIntents(interaction, candidateFormationTransitionRef) {
    if (!candidateFormationTransitionRef) {
      return undefined;
    }

    const candidateFormationTransition = this.records.get(candidateFormationTransitionRef);
    if (
      candidateFormationTransition?.family !== "sut_transition_evidence"
      || candidateFormationTransition.transitionKind
        !== "form_or_withhold_production_focused_candidate"
      || candidateFormationTransition.interactionRef !== interaction.reference
    ) {
      throw new SutStateIntegrityError(
        "Proposal-intent formation requires the current exact candidate-formation transition."
      );
    }

    const eligibleCandidates = [];
    for (const resultRef of candidateFormationTransition.resultReferences) {
      const result = this.records.get(resultRef);
      if (!result) {
        throw new SutStateIntegrityError(
          "Candidate-formation transition contains an unresolved result reference."
        );
      }
      if (result.family !== "trial_candidate") {
        continue;
      }
      if (result.candidateType !== "production_focused_practice") {
        continue;
      }
      assertEligibleProductionCandidate(result, candidateFormationTransitionRef);
      eligibleCandidates.push(result);
    }
    if (eligibleCandidates.length === 0) {
      return undefined;
    }

    const candidatesNeedingProposal = [];
    for (const candidate of eligibleCandidates) {
      const existingProposals = [...this.records.values()].filter((record) => (
        record.family === "proposal_intent"
        && record.candidateRef === candidate.reference
      ));
      if (existingProposals.length > 1) {
        throw new SutStateIntegrityError(
          "Multiple candidate-bound proposal intents resolve for one exact candidate identity."
        );
      }
      if (existingProposals.length === 1) {
        this.assertExistingCandidateBoundProposal(existingProposals[0], candidate);
        continue;
      }
      candidatesNeedingProposal.push(candidate);
    }
    if (candidatesNeedingProposal.length === 0) {
      return undefined;
    }

    const proposalIntents = candidatesNeedingProposal.map((candidate) => ({
      reference: createReference("state"),
      family: "proposal_intent",
      origin: "sut",
      proposalType: "candidate_bound_trial_offer",
      candidateRef: candidate.reference,
      materialIntent: "offer_scoped_trial_for_user_decision",
      candidateMaterialIntent: candidate.materialIntent,
      proposedScope: structuredClone(candidate.proposedScope),
      responseExpectation: "candidate_bound_trial_decision",
      statusOrigin: "sut_transition",
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    }));
    const transition = this.createTransition(
      "form_candidate_bound_proposal_intent",
      candidatesNeedingProposal.map((candidate) => candidate.reference),
      proposalIntents.map((proposal) => proposal.reference),
      interaction.reference
    );
    transition.result = "proposal_intent_formed";
    attachCreatingTransition(proposalIntents, transition);
    this.commitDerivedRecords(proposalIntents, transition);

    proposalIntents.forEach((proposal, index) => {
      const candidate = candidatesNeedingProposal[index];
      this.relations.push({
        relationKind: "transition_ancestry",
        fromRef: proposal.reference,
        toRef: candidate.reference,
        targetRole: "candidate",
        effectiveOrder: proposal.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
      this.relations.push({
        relationKind: "basis",
        fromRef: transition.reference,
        toRef: candidate.reference,
        targetRole: "proposal_candidate",
        effectiveOrder: transition.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    });

    return transition.reference;
  }

  deriveProposalRealizationSelection(interaction, proposalIntentTransitionRef) {
    if (!proposalIntentTransitionRef) return undefined;
    const formation = this.records.get(proposalIntentTransitionRef);
    if (
      formation?.transitionKind !== "form_candidate_bound_proposal_intent"
      || formation.interactionRef !== interaction.reference
    ) {
      throw new SutStateIntegrityError(
        "Proposal realization selection requires the current exact proposal-intent transition."
      );
    }
    const proposals = formation.resultReferences.map((reference) => {
      const proposal = this.records.get(reference);
      if (
        proposal?.family !== "proposal_intent"
        || proposal.createdByTransitionRef !== formation.reference
      ) {
        throw new SutStateIntegrityError(
          "Proposal-intent transition contains an invalid proposal result reference."
        );
      }
      return proposal;
    });
    if (proposals.length !== 1) return undefined;
    const proposal = this.validateCandidateBoundProposal(proposals[0].reference);
    const existing = [...this.records.values()].filter((record) => (
      record.transitionKind === "select_proposal_for_realization"
      && record.inputReferences?.includes(proposal.reference)
    ));
    if (existing.length > 1) {
      throw new SutStateIntegrityError("Multiple proposal realization selections exist for one proposal.");
    }
    if (existing.length === 1) {
      this.validateProposalSelection(existing[0], proposal.reference);
      return existing[0].reference;
    }
    const selection = this.createTransition(
      "select_proposal_for_realization",
      [proposal.reference],
      [],
      interaction.reference
    );
    selection.result = "proposal_selected_for_realization";
    this.records.set(selection.reference, selection);
    this.relations.push({
      relationKind: "basis",
      fromRef: selection.reference,
      toRef: proposal.reference,
      targetRole: "selected_proposal_intent",
      effectiveOrder: selection.createdOrder,
      createdOrder: selection.createdOrder,
      assertedByRole: "sut"
    });
    return selection.reference;
  }

  validateProposalSelection(selection, expectedProposalRef) {
    const proposalRef = selection.inputReferences?.[0];
    const proposal = this.validateCandidateBoundProposal(proposalRef);
    const basis = this.relations.filter((relation) => (
      relation.fromRef === selection.reference
      && relation.relationKind === "basis"
      && relation.targetRole === "selected_proposal_intent"
      && relation.toRef === proposalRef
    ));
    if (
      selection.family !== "sut_transition_evidence"
      || selection.origin !== "sut"
      || selection.transitionKind !== "select_proposal_for_realization"
      || selection.result !== "proposal_selected_for_realization"
      || selection.inputReferences.length !== 1
      || selection.resultReferences.length !== 0
      || (expectedProposalRef && proposalRef !== expectedProposalRef)
      || selection.interactionRef !== proposal.interactionRef
      || selection.createdOrder <= proposal.createdOrder
      || basis.length !== 1
      || basis[0].assertedByRole !== "sut"
      || basis[0].effectiveOrder !== selection.createdOrder
      || basis[0].createdOrder !== selection.createdOrder
    ) {
      throw new SutStateIntegrityError("Proposal realization selection evidence is malformed.");
    }
    return proposal;
  }

  recordProposalRealizations(interaction, interactionFacts) {
    const facts = interactionFacts.filter((fact) => fact.role === "simulator_realization");
    if (facts.length === 0) return undefined;
    if (facts.length > 1) {
      return undefined;
    }
    const fact = facts[0];
    const proposal = this.records.get(fact.payload.requestedRef);
    if (proposal?.family !== "proposal_intent" || proposal.origin !== "sut") {
      throw new SutStateIntegrityError("Simulator realization must target a SUT proposal intent.");
    }
    this.validateCandidateBoundProposal(proposal.reference);
    const selections = [...this.records.values()].filter((record) => (
      record.transitionKind === "select_proposal_for_realization"
      && record.inputReferences?.includes(proposal.reference)
    ));
    if (selections.length !== 1) {
      throw new SutStateIntegrityError("Proposal realization requires exactly one prior SUT selection.");
    }
    const selection = selections[0];
    this.validateProposalSelection(selection, proposal.reference);
    if (selection.createdOrder >= fact.createdOrder) {
      throw new SutStateIntegrityError("Proposal selection must precede simulator realization input.");
    }
    const existing = this.resolveProposalRealizationClosure(proposal.reference);
    if (existing) {
      if (existing.fact.reference === fact.reference) {
        return undefined;
      }
      throw new SutStateIntegrityError("A distinct realization already exists for this proposal.");
    }
    const transition = this.createTransition(
      "record_proposal_realization",
      [fact.reference, selection.reference, proposal.reference],
      [],
      interaction.reference
    );
    transition.result = "proposal_realization_recorded";
    this.records.set(transition.reference, transition);
    for (const [reference, targetRole] of [
      [fact.reference, "simulator_realization_fact"],
      [selection.reference, "proposal_realization_selection"]
    ]) {
      this.relations.push({
        relationKind: "basis", fromRef: transition.reference, toRef: reference, targetRole,
        effectiveOrder: transition.createdOrder, createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }
    this.relations.push({
      relationKind: "realization",
      fromRef: fact.reference,
      toRef: proposal.reference,
      targetRole: "proposal_intent",
      effectiveOrder: transition.createdOrder,
      createdOrder: transition.createdOrder,
      assertedByRole: "sut"
    });
    return transition.reference;
  }

  assessProposalResponseBinding(interaction, interactionFacts) {
    const responses = interactionFacts.filter((fact) => fact.role === "user_response");
    if (responses.length === 0) return undefined;
    const realizations = interactionFacts.filter((fact) => fact.role === "simulator_realization");
    let proposal;
    let closure;
    let bindingStatus;
    let materialIntentStatus;
    let reason;

    const realizationClosures = realizations.map((realization) => {
      const target = this.records.get(realization.payload.requestedRef);
      if (target?.family !== "proposal_intent") {
        throw new SutStateIntegrityError("Current proposal-response binding target is unresolved.");
      }
      const resolved = this.resolveProposalRealizationClosure(target.reference, realization.reference);
      if (!resolved) {
        throw new SutStateIntegrityError("Ambiguous binding cannot claim an unprocessed realization participant.");
      }
      return resolved;
    });

    if (responses.length !== 1 || realizations.length > 1) {
      bindingStatus = "ambiguous";
      materialIntentStatus = "unknown";
      reason = "multiple_current_binding_participants";
      if (realizationClosures.length === 1) {
        closure = realizationClosures[0];
        proposal = closure.proposal;
      }
    } else if (realizations.length === 0) {
      bindingStatus = "unbound";
      materialIntentStatus = "unknown";
      reason = "no_current_surfaced_realization";
    } else {
      const realization = realizations[0];
      proposal = this.records.get(realization.payload.requestedRef);
      if (proposal?.family !== "proposal_intent") {
        throw new SutStateIntegrityError("Current proposal-response binding target is unresolved.");
      }
      closure = realizationClosures[0];
      if (!closure || closure.fact.reference !== realization.reference) {
        throw new SutStateIntegrityError(
          "Proposal-response binding requires the exact current P/S/F/R/E realization closure."
        );
      }
      this.validateCandidateBoundProposal(proposal.reference);
      const attributable = this.isCanonicalProposalResponse(responses[0]);
      bindingStatus = attributable ? "bound" : "unbound";
      materialIntentStatus = realization.payload.fidelity === "match" ? "match" : "mismatch";
      reason = !attributable ? "response_not_attributable_to_expected_user"
        : materialIntentStatus === "match"
        ? "exact_candidate_bound_proposal_response"
        : "surfaced_realization_material_mismatch";
    }

    const responseStatus = responses.length === 1 && classifyProposalResponse(responses[0].payload.content)
      ? "accepted"
      : "ambiguous_or_non_accepting";
    const realizationFactRefs = realizations.map((fact) => fact.reference);
    const userResponseRefs = responses.map((fact) => fact.reference);
    const existing = [...this.records.values()].filter((record) => (
      record.family === "binding_assessment"
      && sameReferenceSet(record.realizationFactRefs, realizationFactRefs)
      && sameReferenceSet(record.userResponseRefs, userResponseRefs)
    ));
    if (existing.length > 1) throw new SutStateIntegrityError("Multiple matching binding assessments exist.");
    if (existing.length === 1) {
      this.validateBindingAssessmentClosure(existing[0]);
      if (existing[0].bindingStatus !== bindingStatus
        || existing[0].responseStatus !== responseStatus
        || existing[0].materialIntentStatus !== materialIntentStatus
        || existing[0].reason !== reason) {
        throw new SutStateIntegrityError("Existing binding assessment contradicts the exact current classification.");
      }
      return undefined;
    }

    const assessment = {
      reference: createReference("state"),
      family: "binding_assessment",
      origin: "sut",
      bindingType: "candidate_bound_proposal_response",
      proposalRef: proposal?.reference ?? null,
      realizationFactRefs,
      userResponseRefs,
      bindingStatus,
      responseStatus,
      materialIntentStatus,
      reason,
      statusOrigin: "sut_transition",
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    const transitionInputs = uniqueReferences([
      ...(proposal ? [proposal.reference] : []),
      ...realizationFactRefs,
      ...userResponseRefs,
      ...realizationClosures.map((item) => item.transition.reference)
    ]);
    const transition = this.createTransition(
      "assess_proposal_response_binding",
      transitionInputs,
      [assessment.reference],
      interaction.reference
    );
    transition.result = "binding_assessed";
    attachCreatingTransition([assessment], transition);
    this.commitDerivedRecords([assessment], transition);

    for (const response of responses) {
      this.relations.push(bindingBasisRelation(
        transition, response.reference, "user_response_fact"
      ));
    }
    for (const realizationClosure of realizationClosures) {
      this.relations.push(bindingBasisRelation(
        transition, realizationClosure.transition.reference, "proposal_realization_evidence"
      ));
    }
    if (proposal) {
      this.relations.push(bindingRelation(
        assessment, proposal.reference, "candidate_bound_proposal_intent", transition
      ));
    }
    for (const realization of realizations) {
      this.relations.push(bindingRelation(
        assessment, realization.reference, "actual_surfaced_realization", transition
      ));
    }
    for (const response of responses) {
      this.relations.push(bindingRelation(
        assessment, response.reference, "actual_user_response", transition
      ));
    }
    return transition.reference;
  }

  isCanonicalProposalResponse(response) {
    const actor = this.records.get(response.sourceActorRef);
    const ingestionInteraction = this.records.get(response.firstInteractionRef);
    const ingestionTransition = this.records.get(ingestionInteraction?.createdByTransitionRef);
    const sources = this.relations.filter((relation) => (
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

  validateBindingAssessmentClosure(assessment) {
    if (assessment?.family !== "binding_assessment" || assessment.origin !== "sut"
      || assessment.bindingType !== "candidate_bound_proposal_response"
      || assessment.statusOrigin !== "sut_transition") {
      throw new SutStateIntegrityError("Binding assessment identity is malformed.");
    }
    const transitions = [...this.records.values()].filter((record) =>
      record.transitionKind === "assess_proposal_response_binding"
      && (record.resultReferences?.includes(assessment.reference)
        || record.reference === assessment.createdByTransitionRef));
    if (transitions.length !== 1) throw new SutStateIntegrityError("Binding assessment requires exactly one transition.");
    const transition = transitions[0];
    const responses = assessment.userResponseRefs.map((reference) => this.records.get(reference));
    if (responses.some((response) => response?.family !== "input_fact"
      || response.origin !== "fixture" || response.role !== "user_response")) {
      throw new SutStateIntegrityError("Binding assessment has an invalid response participant.");
    }
    const realizationClosures = assessment.realizationFactRefs.map((reference) => {
      const fact = this.records.get(reference);
      const proposalRef = fact?.payload?.requestedRef;
      const closure = proposalRef && this.resolveProposalRealizationClosure(proposalRef, reference);
      if (!closure) throw new SutStateIntegrityError("Binding assessment has an invalid realization participant.");
      return closure;
    });
    const expectedInputs = uniqueReferences([
      ...(assessment.proposalRef ? [assessment.proposalRef] : []),
      ...assessment.realizationFactRefs, ...assessment.userResponseRefs,
      ...realizationClosures.map((closure) => closure.transition.reference)
    ]);
    const basis = this.relations.filter((relation) => relation.fromRef === transition.reference
      && relation.relationKind === "basis");
    const bindings = this.relations.filter((relation) => relation.fromRef === assessment.reference
      && relation.relationKind === "binding");
    const expectedBindings = [
      ...(assessment.proposalRef ? [[assessment.proposalRef, "candidate_bound_proposal_intent"]] : []),
      ...assessment.realizationFactRefs.map((ref) => [ref, "actual_surfaced_realization"]),
      ...assessment.userResponseRefs.map((ref) => [ref, "actual_user_response"])
    ];
    const validRelations = expectedBindings.every(([toRef, role]) => bindings.filter((relation) =>
      relation.toRef === toRef && relation.targetRole === role && relation.assertedByRole === "sut"
      && relation.effectiveOrder === assessment.createdOrder
      && relation.createdOrder === transition.createdOrder).length === 1);
    const expectedBasis = [
      ...assessment.userResponseRefs.map((ref) => [ref, "user_response_fact"]),
      ...realizationClosures.map((closure) => [closure.transition.reference, "proposal_realization_evidence"])
    ];
    const interaction = this.records.get(assessment.interactionRef);
    const ingestionTransition = this.records.get(interaction?.createdByTransitionRef);
    const ingestionBasis = this.relations.filter((relation) => (
      relation.fromRef === ingestionTransition?.reference && relation.relationKind === "basis"
    ));
    const participantRefs = [...assessment.realizationFactRefs, ...assessment.userResponseRefs];
    const representedProposals = new Set(realizationClosures.map((item) => item.proposal.reference));
    const expectedResponseStatus = responses.length === 1
      && classifyProposalResponse(responses[0].payload.content)
      ? "accepted" : "ambiguous_or_non_accepting";
    const canonicalBound = assessment.bindingStatus === "bound"
      && assessment.responseStatus === "accepted"
      && assessment.materialIntentStatus === "match"
      && assessment.reason === "exact_candidate_bound_proposal_response"
      && responses.length === 1 && this.isCanonicalProposalResponse(responses[0])
      && realizationClosures.length === 1 && assessment.proposalRef === realizationClosures[0].proposal.reference;
    const validUnbound = assessment.bindingStatus === "unbound"
      && assessment.responseStatus === expectedResponseStatus
      && ((realizationClosures.length === 0 && assessment.proposalRef === null
        && assessment.materialIntentStatus === "unknown"
        && assessment.reason === "no_current_surfaced_realization")
        || (realizationClosures.length === 1 && responses.length === 1
          && !this.isCanonicalProposalResponse(responses[0])
          && assessment.proposalRef === realizationClosures[0].proposal.reference
          && assessment.materialIntentStatus === (realizationClosures[0].fact.payload.fidelity === "match"
            ? "match" : "mismatch")
          && assessment.reason === "response_not_attributable_to_expected_user"));
    const validAmbiguous = assessment.bindingStatus === "ambiguous"
      && assessment.reason === "multiple_current_binding_participants"
      && assessment.materialIntentStatus === "unknown"
      && assessment.responseStatus === expectedResponseStatus
      && assessment.proposalRef === (representedProposals.size === 1
        ? [...representedProposals][0] : null)
      && (responses.length !== 1 || realizationClosures.length > 1);
    const validBasis = expectedBasis.every(([toRef, role]) => basis.filter((relation) =>
      relation.toRef === toRef && relation.targetRole === role && relation.assertedByRole === "sut"
      && relation.effectiveOrder === transition.createdOrder
      && relation.createdOrder === transition.createdOrder).length === 1);
    if (transition.family !== "sut_transition_evidence" || transition.origin !== "sut"
      || transition.result !== "binding_assessed" || transition.interactionRef !== assessment.interactionRef
      || interaction?.family !== "interaction_segment" || interaction.origin !== "sut"
      || interaction.createdOrder >= assessment.createdOrder
      || ingestionTransition?.family !== "sut_transition_evidence"
      || ingestionTransition.origin !== "sut"
      || ingestionTransition.transitionKind !== "ingest_sut_visible_inputs"
      || ingestionTransition.interactionRef !== interaction.reference
      || ingestionTransition.result !== "accepted"
      || !ingestionTransition.resultReferences?.includes(interaction.reference)
      || ingestionTransition.createdOrder <= interaction.createdOrder
      || ingestionTransition.createdOrder >= assessment.createdOrder
      || ingestionTransition.inputReferences?.length !== interaction.inputReferences?.length
      || !sameReferenceSet(ingestionTransition.inputReferences, interaction.inputReferences)
      || new Set(ingestionTransition.inputReferences).size !== ingestionTransition.inputReferences.length
      || new Set(interaction.inputReferences).size !== interaction.inputReferences.length
      || ingestionBasis.length !== ingestionTransition.inputReferences.length
      || ingestionBasis.some((relation) => (
        relation.targetRole !== "ingested_input"
        || relation.assertedByRole !== "sut"
        || relation.effectiveOrder !== ingestionTransition.createdOrder
        || relation.createdOrder !== ingestionTransition.createdOrder
      ))
      || new Set(ingestionBasis.map((relation) => relation.toRef)).size !== ingestionBasis.length
      || !sameReferenceSet(
        ingestionBasis.map((relation) => relation.toRef),
        ingestionTransition.inputReferences
      )
      || participantRefs.some((reference) => !interaction.inputReferences?.includes(reference))
      || !sameReferenceSet(transition.inputReferences, expectedInputs)
      || transition.inputReferences?.length !== expectedInputs.length
      || new Set(transition.inputReferences).size !== transition.inputReferences.length
      || transition.resultReferences?.length !== 1 || transition.resultReferences[0] !== assessment.reference
      || assessment.createdByTransitionRef !== transition.reference
      || transition.createdOrder <= assessment.createdOrder
      || responses.some((response) => assessment.createdOrder <= response.createdOrder)
      || realizationClosures.some((closure) => assessment.createdOrder <= closure.transition.createdOrder)
      || responses.some((response) => transition.createdOrder <= response.createdOrder)
      || realizationClosures.some((closure) => transition.createdOrder <= closure.transition.createdOrder)
      || !(canonicalBound || validUnbound || validAmbiguous
        || (assessment.bindingStatus === "bound" && assessment.materialIntentStatus === "mismatch"
          && assessment.reason === "surfaced_realization_material_mismatch"
          && assessment.responseStatus === "accepted"
          && responses.length === 1 && this.isCanonicalProposalResponse(responses[0])
          && realizationClosures.length === 1
          && assessment.proposalRef === realizationClosures[0].proposal.reference
          && realizationClosures[0].fact.payload.fidelity === "mismatch"))
      || bindings.length !== expectedBindings.length || !validRelations
      || basis.length !== expectedBasis.length || !validBasis) {
      throw new SutStateIntegrityError("Binding assessment does not form an exact B/T/P/F/U/R closure.");
    }
    return assessment;
  }

  validateCandidateBoundProposal(proposalRef) {
    const proposal = this.records.get(proposalRef);
    const candidate = this.records.get(proposal?.candidateRef);
    if (proposal?.family !== "proposal_intent" || !candidate) {
      throw new SutStateIntegrityError("Candidate-bound proposal identity is unresolved.");
    }
    assertEligibleProductionCandidate(candidate, candidate.createdByTransitionRef);
    assertProposalPreservesCandidate(proposal, candidate);

    const candidateTransition = this.records.get(candidate.createdByTransitionRef);
    const proposalTransition = this.records.get(proposal.createdByTransitionRef);
    const interaction = this.records.get(proposal.interactionRef);
    const ancestry = this.relations.filter((relation) => (
      relation.fromRef === proposal.reference
      && relation.relationKind === "transition_ancestry"
      && relation.targetRole === "candidate"
    ));
    const copiedEvidence = this.relations.filter((relation) => (
      relation.fromRef === proposal.reference
      && ["basis", "support"].includes(relation.relationKind)
    ));
    const directionBasis = this.relations.filter((relation) => (
      relation.fromRef === candidate.reference && relation.relationKind === "basis"
      && relation.targetRole === "selected_trial_direction"
    ));
    const proposalTransitionBasis = this.relations.filter((relation) => (
      relation.fromRef === proposalTransition?.reference
      && relation.relationKind === "basis"
    ));
    const direction = this.records.get(candidate.trialDirectionRef);
    if (
      candidate.family !== "trial_candidate"
      || candidate.candidateType !== "production_focused_practice"
      || candidateTransition?.family !== "sut_transition_evidence"
      || candidateTransition.origin !== "sut"
      || candidateTransition.transitionKind !== "form_or_withhold_production_focused_candidate"
      || candidateTransition.interactionRef !== candidate.interactionRef
      || !candidateTransition.resultReferences?.includes(candidate.reference)
      || candidate.createdOrder >= candidateTransition.createdOrder
      || proposalTransition?.family !== "sut_transition_evidence"
      || proposalTransition.origin !== "sut"
      || proposalTransition.transitionKind !== "form_candidate_bound_proposal_intent"
      || proposalTransition.result !== "proposal_intent_formed"
      || interaction?.family !== "interaction_segment"
      || interaction.origin !== "sut"
      || proposalTransition.interactionRef !== proposal.interactionRef
      || proposal.interactionRef !== candidate.interactionRef
      || !proposalTransition.inputReferences?.includes(candidate.reference)
      || new Set(proposalTransition.inputReferences).size !== proposalTransition.inputReferences.length
      || !proposalTransition.resultReferences?.includes(proposal.reference)
      || new Set(proposalTransition.resultReferences).size !== proposalTransition.resultReferences.length
      || proposalTransition.createdOrder <= candidateTransition.createdOrder
      || proposalTransition.createdOrder <= candidate.createdOrder
      || proposal.createdOrder <= candidateTransition.createdOrder
      || proposal.createdOrder <= candidate.createdOrder
      || proposal.createdOrder >= proposalTransition.createdOrder
      || proposalTransitionBasis.length !== proposalTransition.inputReferences.length
      || proposalTransitionBasis.some((relation) => (
        relation.targetRole !== "proposal_candidate"
        || relation.assertedByRole !== "sut"
        || relation.effectiveOrder !== proposalTransition.createdOrder
        || relation.createdOrder !== proposalTransition.createdOrder
      ))
      || new Set(proposalTransitionBasis.map((relation) => relation.toRef)).size
        !== proposalTransitionBasis.length
      || !sameReferenceSet(
        proposalTransitionBasis.map((relation) => relation.toRef),
        proposalTransition.inputReferences
      )
      || ancestry.length !== 1
      || ancestry[0].toRef !== candidate.reference
      || ancestry[0].assertedByRole !== "sut"
      || ancestry[0].effectiveOrder !== proposal.createdOrder
      || ancestry[0].createdOrder !== proposalTransition.createdOrder
      || copiedEvidence.length !== 0
      || direction?.family !== "input_fact" || direction.origin !== "fixture"
      || direction.role !== "affordance_fact"
      || direction.payload?.direction !== PRODUCTION_FOCUSED_TRIAL_DIRECTION
      || directionBasis.length !== 1 || directionBasis[0].toRef !== direction.reference
      || directionBasis[0].assertedByRole !== "sut"
      || directionBasis[0].effectiveOrder !== candidate.createdOrder
      || directionBasis[0].createdOrder !== candidateTransition.createdOrder
    ) {
      throw new SutStateIntegrityError(
        "Candidate-bound proposal intent has malformed material, creation, or ancestry closure."
      );
    }
    return proposal;
  }

  resolveProposalRealizationClosure(proposalRef, expectedFactRef) {
    const proposal = this.validateCandidateBoundProposal(proposalRef);
    const selections = [...this.records.values()].filter((record) => (
      record.transitionKind === "select_proposal_for_realization"
      && record.inputReferences?.includes(proposal.reference)
    ));
    if (selections.length !== 1) {
      throw new SutStateIntegrityError("Proposal realization closure requires exactly one selection.");
    }
    const selection = selections[0];
    this.validateProposalSelection(selection, proposal.reference);
    const relations = this.relations.filter((relation) => (
      relation.relationKind === "realization" && relation.toRef === proposal.reference
    ));
    const transitions = [...this.records.values()].filter((record) => (
      record.transitionKind === "record_proposal_realization"
      && record.inputReferences?.includes(proposal.reference)
    ));
    if (relations.length === 0 && transitions.length === 0) return undefined;
    if (relations.length !== 1 || transitions.length !== 1) {
      throw new SutStateIntegrityError("Proposal realization evidence is malformed or ambiguous.");
    }
    const relation = relations[0];
    const transition = transitions[0];
    const fact = this.records.get(relation.fromRef);
    const interaction = this.records.get(transition.interactionRef);
    const factBasis = this.relations.filter((candidate) => (
      candidate.fromRef === transition.reference
      && candidate.relationKind === "basis"
      && candidate.targetRole === "simulator_realization_fact"
    ));
    const selectionBasis = this.relations.filter((candidate) => (
      candidate.fromRef === transition.reference
      && candidate.relationKind === "basis"
      && candidate.targetRole === "proposal_realization_selection"
    ));
    if (
      fact?.family !== "input_fact"
      || fact.origin !== "simulator"
      || fact.role !== "simulator_realization"
      || fact.payload?.requestedRef !== proposal.reference
      || (expectedFactRef && fact.reference !== expectedFactRef)
      || fact.createdOrder <= selection.createdOrder
      || interaction?.family !== "interaction_segment"
      || !interaction.inputReferences?.includes(fact.reference)
      || transition.family !== "sut_transition_evidence"
      || transition.origin !== "sut"
      || transition.result !== "proposal_realization_recorded"
      || transition.inputReferences?.length !== 3
      || transition.inputReferences[0] !== fact.reference
      || transition.inputReferences[1] !== selection.reference
      || transition.inputReferences[2] !== proposal.reference
      || transition.resultReferences?.length !== 0
      || transition.createdOrder <= fact.createdOrder
      || transition.createdOrder <= selection.createdOrder
      || factBasis.length !== 1
      || factBasis[0].toRef !== fact.reference
      || factBasis[0].assertedByRole !== "sut"
      || factBasis[0].effectiveOrder !== transition.createdOrder
      || factBasis[0].createdOrder !== transition.createdOrder
      || selectionBasis.length !== 1
      || selectionBasis[0].toRef !== selection.reference
      || selectionBasis[0].assertedByRole !== "sut"
      || selectionBasis[0].effectiveOrder !== transition.createdOrder
      || selectionBasis[0].createdOrder !== transition.createdOrder
      || relation.targetRole !== "proposal_intent"
      || relation.assertedByRole !== "sut"
      || relation.fromRef === relation.toRef
      || relation.effectiveOrder !== transition.createdOrder
      || relation.createdOrder !== transition.createdOrder
    ) {
      throw new SutStateIntegrityError("Proposal realization evidence does not form an exact P/S/F/R/E closure.");
    }
    return { proposal, selection, fact, transition, relation };
  }

  assertExistingCandidateBoundProposal(proposal, candidate) {
    if (proposal.candidateRef !== candidate.reference) {
      throw new SutStateIntegrityError("Existing proposal resolves a different exact candidate identity.");
    }
    this.validateCandidateBoundProposal(proposal.reference);
  }

  resolveExactDimensionComparison(dimension, recognitionRefs, productionRefs) {
    const candidateAnchors = intersectReferenceSets([
      ...recognitionRefs.map((reference) => this.comparisonAnchorsFor(
        reference,
        "recognition_observation"
      )),
      ...productionRefs.map((reference) => this.comparisonAnchorsFor(
        reference,
        "production_observation"
      ))
    ]);
    const exactMatches = [...candidateAnchors]
      .map((reference) => this.records.get(reference))
      .filter((record) => (
        record?.family === "dimension_comparison"
        && record.targetDimension === dimension
        && record.recognitionTaskMode === "recognition"
        && record.productionTaskMode === "spontaneous_production"
        && sameReferenceSet(record.recognitionObservationRefs, recognitionRefs)
        && sameReferenceSet(record.productionObservationRefs, productionRefs)
      ));

    if (exactMatches.length > 1) {
      throw new SutStateIntegrityError(
        "Multiple materially distinct exact dimension comparisons resolve from the current observation basis."
      );
    }
    return exactMatches[0];
  }

  comparisonAnchorsFor(observationRef, targetRole) {
    return new Set(this.relations
      .filter((relation) => (
        relation.relationKind === "basis"
        && relation.toRef === observationRef
        && relation.targetRole === targetRole
      ))
      .map((relation) => relation.fromRef));
  }

  findExistingTrialDecision(decision, affordanceRefs) {
    return this.findRecord((record) => {
      if (!sameReferenceSet(record.decisionBasisAffordanceRefs ?? [], affordanceRefs)) {
        return false;
      }
      if (decision.kind === "candidate") {
        return record.family === "trial_candidate"
          && record.supportComparisonRef === decision.comparison.reference
          && record.trialDirectionRef === decision.selectedAffordance.reference;
      }
      return record.family === "non_activation_disposition"
        && record.reason === decision.reason
        && record.disposition === decision.disposition
        && record.supportComparisonRef === decision.comparison?.reference
        && sameReferenceSet(
          record.observationBasisRefs ?? [],
          decision.observationBasisRefs ?? []
        )
        && record.targetDimension === (
          decision.comparison?.targetDimension ?? decision.targetDimension
        );
    });
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

  findRecord(predicate) {
    return [...this.records.values()].find(predicate);
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

function appendUniqueSemanticInput(inputFacts, semanticInputReferences, fact) {
  if (semanticInputReferences.has(fact.reference)) {
    return;
  }
  semanticInputReferences.add(fact.reference);
  inputFacts.push(fact);
}

function sourceFactMeaning(input) {
  const meaning = structuredClone(input);
  delete meaning.sourceFactRef;
  return meaning;
}

function sortedReferences(references) {
  return [...references].sort();
}

function sameReferenceSet(left, right) {
  return isDeepStrictEqual(sortedReferences(left), sortedReferences(right));
}

function intersectReferenceSets(sets) {
  if (sets.length === 0) {
    return new Set();
  }
  return new Set([...sets[0]].filter((reference) => (
    sets.slice(1).every((set) => set.has(reference))
  )));
}

function groupCalibrationObservations(observations) {
  const groups = new Map();
  for (const observation of observations) {
    const grouped = groups.get(observation.payload.dimension) ?? {
      recognition: [],
      spontaneousProduction: []
    };
    const target = observation.payload.taskMode === "recognition"
      ? grouped.recognition
      : grouped.spontaneousProduction;
    target.push(observation);
    groups.set(observation.payload.dimension, grouped);
  }
  return groups;
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

function classifyProposalResponse(content) {
  return content.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("en-US")
    === "yes, let's try that.";
}

function bindingBasisRelation(transition, toRef, targetRole) {
  return {
    relationKind: "basis",
    fromRef: transition.reference,
    toRef,
    targetRole,
    effectiveOrder: transition.createdOrder,
    createdOrder: transition.createdOrder,
    assertedByRole: "sut"
  };
}

function bindingRelation(assessment, toRef, targetRole, transition) {
  return {
    relationKind: "binding",
    fromRef: assessment.reference,
    toRef,
    targetRole,
    effectiveOrder: assessment.createdOrder,
    createdOrder: transition.createdOrder,
    assertedByRole: "sut"
  };
}

function assertEligibleProductionCandidate(candidate, candidateFormationTransitionRef) {
  if (
    candidate.origin !== "sut"
    || candidate.lifecycleStatus !== "formed_non_active"
    || candidate.lifecycleVersion !== 1
    || candidate.purpose !== "provisional_evaluative_trial"
    || candidate.materialIntent !== "practice_spontaneous_production_for_target_dimension"
    || !hasExactKeys(candidate.proposedScope, ["dimension", "taskMode"])
    || candidate.proposedScope?.taskMode !== "spontaneous_production"
    || typeof candidate.proposedScope?.dimension !== "string"
    || candidate.proposedScope.dimension.length === 0
    || candidate.createdByTransitionRef !== candidateFormationTransitionRef
  ) {
    throw new SutStateIntegrityError(
      "Proposal-eligible production candidate violates the required formed non-active state contract."
    );
  }
}

function assertProposalPreservesCandidate(proposal, candidate) {
  if (
    proposal.origin !== "sut"
    || proposal.proposalType !== "candidate_bound_trial_offer"
    || proposal.candidateRef !== candidate.reference
    || proposal.materialIntent !== "offer_scoped_trial_for_user_decision"
    || !hasExactKeys(proposal.proposedScope, ["dimension", "taskMode"])
    || proposal.candidateMaterialIntent !== candidate.materialIntent
    || !isDeepStrictEqual(proposal.proposedScope, candidate.proposedScope)
    || proposal.responseExpectation !== "candidate_bound_trial_decision"
    || proposal.statusOrigin !== "sut_transition"
  ) {
    throw new SutStateIntegrityError(
      "Existing candidate-bound proposal intent conflicts with its exact candidate material state."
    );
  }
}

function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function clone(value) {
  return structuredClone(value);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
