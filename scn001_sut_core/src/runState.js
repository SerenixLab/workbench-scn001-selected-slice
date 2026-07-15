import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { SutBoundaryValidationError, SutReferenceError, SutStateIntegrityError } from "./errors.js";
import {
  deriveDirectCorrectionParticipants,
  isMatchedDirectRealization,
  resolveDirectCorrectionRealizationClosure,
  TURN_COMPLETION_CORRECTION_BEHAVIOR,
  validateDirectCorrectionDispositionClosure
} from "./directCorrection.js";
import {
  deriveFocusedDrillDecisionParticipants,
  deriveFocusedDrillOutcomeParticipants,
  IMMEDIATE_CORRECTION_BEHAVIOR,
  isMatchedImmediateRealization,
  resolveFocusedDrillRealizationClosure,
  validateFocusedDrillDispositionClosure,
  validateFocusedDrillOutcomeClosure
} from "./focusedDrill.js";
import {
  assertEligibleProductionCandidate,
  classifyProposalResponse,
  PRODUCTION_FOCUSED_TRIAL_DIRECTION,
  resolveProposalRealizationClosure,
  validateBindingAssessmentClosure,
  validateCandidateBoundProposal,
  validateProductionCandidateClosure,
  validateProposalResultClosure,
  validateProposalSelection
} from "./proposalClosure.js";
import {
  ACTIVATION_CHECK_NAMES,
  ACTIVATION_CONTROL_TYPES,
  activationControlRefKey,
  activationMaterialBasisRefs,
  activationParticipantRolePairs,
  deriveActivationCheckResults,
  deriveActivationOverallStatus,
  hasExactKeys
} from "./productionTrialActivation.js";
import {
  isCanonicalProposalResponse,
  isValidInitializedIngestionResult,
  resolveUniqueCreatingTransition,
  sourceFactMeaning,
  validateRetainedInputFact
} from "./retainedStateClosure.js";

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
        firstInteractionRef: fact.firstInteractionRef,
        firstIngestionTransitionRef: transition.reference,
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
        : ["simulator_realization", "simulator_behavior_realization"].includes(input.kind)
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
    const activationAssessmentTransitionRef = this.assessProductionTrialActivation(
      interaction,
      interactionFacts,
      bindingAssessmentTransitionRef
    );
    const activeTrialTransitionRef = this.activateProductionFocusedTrial(
      interaction,
      activationAssessmentTransitionRef
    );
    const focusedDrillDecisionTransitionRefs = this.deriveFocusedDrillDecision(
      interaction,
      interactionFacts
    );
    const focusedDrillRealizationTransitionRef = this.recordFocusedDrillRealization(
      interaction,
      interactionFacts
    );
    const focusedDrillOutcomeTransitionRef = this.recordFocusedDrillOutcome(
      interaction,
      interactionFacts
    );
    const directCorrectionTransitionRefs = this.deriveDirectCorrectionDecision(
      interaction,
      interactionFacts
    );
    const directCorrectionRealizationTransitionRef = this.recordDirectCorrectionRealization(
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
      bindingAssessmentTransitionRef,
      activationAssessmentTransitionRef,
      activeTrialTransitionRef,
      ...focusedDrillDecisionTransitionRefs,
      focusedDrillRealizationTransitionRef,
      focusedDrillOutcomeTransitionRef,
      ...directCorrectionTransitionRefs,
      directCorrectionRealizationTransitionRef
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
    const proposalOutputs = [...this.records.values()]
      .filter((record) => record.transitionKind === "select_proposal_for_realization")
      .map((selection) => {
        const proposal = this.validateProposalSelection(selection);
        const realization = this.resolveProposalRealizationClosure(proposal.reference);
        return realization ? undefined : { selection, proposal };
      })
      .filter(Boolean)
      .map(({ selection, proposal }) => ({
        kind: "proposal_realization_request",
        outputRef: selection.reference,
        requestedRef: proposal.reference,
        candidateRef: proposal.candidateRef,
        materialIntent: proposal.materialIntent,
        candidateMaterialIntent: proposal.candidateMaterialIntent,
        proposedScope: structuredClone(proposal.proposedScope)
      }));
    const focusedDrillOutputs = [...this.records.values()]
      .filter((record) => record.family === "focused_drill_behavior_disposition")
      .map((disposition) => {
        const activeTrial = this.records.get(disposition.activeTrialRef);
        this.validActiveTrialClosure(activeTrial);
        this.validateFocusedDrillDispositionClosure(disposition);
        const realization = this.resolveFocusedDrillRealizationClosure(disposition.reference);
        return realization ? undefined : {
          kind: "focused_drill_behavior_request",
          outputRef: disposition.createdByTransitionRef,
          requestedRef: disposition.reference,
          requestedBehavior: disposition.requestedBehavior,
          drillScope: structuredClone(disposition.drillScope)
        };
      })
      .filter(Boolean);
    const directCorrectionOutputs = [...this.records.values()]
      .filter((record) => record.family === "direct_current_session_correction_disposition")
      .map((disposition) => {
        this.validateDirectCorrectionDispositionClosure(disposition);
        const realization = this.resolveDirectCorrectionRealizationClosure(disposition.reference);
        return realization ? undefined : {
          kind: "direct_current_session_correction_request",
          outputRef: disposition.createdByTransitionRef,
          requestedRef: disposition.reference,
          requestedBehavior: disposition.requestedBehavior,
          sessionScope: structuredClone(disposition.sessionScope)
        };
      })
      .filter(Boolean);
    const outstanding = [
      ...proposalOutputs, ...focusedDrillOutputs, ...directCorrectionOutputs
    ];
    if (outstanding.length !== 1) {
      return Object.freeze([]);
    }
    return deepFreeze(outstanding);
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
    return validateProposalSelection(
      this.records, this.relations, selection, expectedProposalRef
    );
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

  assessProductionTrialActivation(interaction, interactionFacts, bindingTransitionRef) {
    if (!bindingTransitionRef) return undefined;
    const binding = this.resolveActivationBindingTrigger(interaction, bindingTransitionRef);
    const positive = binding.bindingStatus === "bound" && binding.responseStatus === "accepted"
      && binding.materialIntentStatus === "match"
      && binding.reason === "exact_candidate_bound_proposal_response";
    if (!positive) return undefined;

    const currentRealizations = interactionFacts.filter((fact) => fact.role === "simulator_realization");
    const currentResponses = interactionFacts.filter((fact) => fact.role === "user_response");
    if (currentRealizations.length !== 1 || currentResponses.length !== 1) return undefined;

    const proposal = this.validateCandidateBoundProposal(binding.proposalRef);
    const candidateClosure = this.validateProductionCandidateClosure(proposal.candidateRef);
    const candidate = candidateClosure.candidate;
    this.resolveActivationBindingContext(binding, interaction);
    const basis = this.resolveActivationCandidateBasis(candidate);
    const participants = this.resolveActivationParticipants(candidate, binding, basis, interaction);
    const checkResults = this.deriveActivationCheckResults({
      candidate, proposal, binding, basis, controlBasisRefs: participants.controlBasisRefs,
      contextChangeRefs: participants.contextChangeRefs
    });
    const overallStatus = deriveActivationOverallStatus(checkResults);
    const materialRefs = activationMaterialBasisRefs(participants);
    const existing = [...this.records.values()].filter((record) => (
      record.family === "activation_assessment"
      && record.candidateRef === candidate.reference
      && record.bindingAssessmentRef === binding.reference
    ));
    if (existing.length > 1) throw new SutStateIntegrityError("Multiple competing activation assessments resolve for one candidate and binding.");
    if (existing.length === 1) {
      this.validActivationAssessmentClosure(existing[0]);
      if (!sameReferenceSet(existing[0].materialBasisRefs, materialRefs)
        || !isDeepStrictEqual(existing[0].checkResults, checkResults)) {
        throw new SutStateIntegrityError("Existing activation assessment has a competing material basis.");
      }
      return undefined;
    }

    const assessment = {
      reference: createReference("state"), family: "activation_assessment", origin: "sut",
      activationType: "production_focused_candidate_activation",
      activationBasisType: "bound_candidate_specific_proposal_acceptance",
      candidateRef: candidate.reference, bindingAssessmentRef: binding.reference,
      activeScope: structuredClone(candidate.proposedScope), overallStatus,
      comparisonRef: participants.comparisonRef,
      recognitionObservationRef: participants.recognitionObservationRef,
      productionObservationRef: participants.productionObservationRef,
      chronologyRef: participants.chronologyRef, contextRef: participants.contextRef,
      controlBasisRefs: structuredClone(participants.controlBasisRefs),
      checkResults, materialBasisRefs: materialRefs,
      statusOrigin: "sut_transition", interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    const transition = this.createTransition(
      "assess_production_focused_trial_activation", materialRefs,
      [assessment.reference], interaction.reference
    );
    transition.result = "activation_assessed";
    attachCreatingTransition([assessment], transition);
    this.commitDerivedRecords([assessment], transition);
    for (const [reference, role] of activationParticipantRolePairs(participants)) this.relations.push({
      relationKind: "basis", fromRef: assessment.reference, toRef: reference,
      targetRole: role, effectiveOrder: assessment.createdOrder,
      createdOrder: transition.createdOrder, assertedByRole: "sut"
    });
    return transition.reference;
  }

  activateProductionFocusedTrial(interaction, assessmentTransitionRef) {
    if (!assessmentTransitionRef) return undefined;
    const assessment = this.resolveActiveTrialTrigger(interaction, assessmentTransitionRef);
    if (assessment.overallStatus !== "sufficient"
      || Object.values(assessment.checkResults).some((result) => result.status !== "passed")) {
      return undefined;
    }
    const candidate = this.records.get(assessment.candidateRef);
    const existing = [...this.records.values()].filter((record) => (
      record.family === "active_trial" && record.candidateRef === candidate.reference
    ));
    if (existing.length > 1) throw new SutStateIntegrityError("Multiple active trials resolve for one candidate.");
    if (existing.length === 1) {
      this.validActiveTrialClosure(existing[0]);
      if (existing[0].activationAssessmentRef !== assessment.reference) {
        throw new SutStateIntegrityError("A competing active trial already resolves for this candidate.");
      }
      return undefined;
    }
    const trial = {
      reference: createReference("state"), family: "active_trial", origin: "sut",
      trialType: "production_focused_practice", trialOrigin: "zoey_derived_trial",
      candidateRef: candidate.reference, activationAssessmentRef: assessment.reference,
      activationBasisType: "bound_candidate_specific_proposal_acceptance",
      activeScope: structuredClone(candidate.proposedScope), currentStatus: "active",
      lifecycleVersion: 1, correctionPath: "narrow_retire_supersede_or_clarify",
      statusOrigin: "sut_transition", interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    const transition = this.createTransition(
      "activate_production_focused_trial", [candidate.reference, assessment.reference],
      [trial.reference], interaction.reference
    );
    transition.result = "trial_activated";
    attachCreatingTransition([trial], transition);
    this.commitDerivedRecords([trial], transition);
    for (const [reference, role] of [
      [candidate.reference, "trial_candidate"], [assessment.reference, "activation_assessment"]
    ]) this.relations.push({
      relationKind: "transition_ancestry", fromRef: trial.reference, toRef: reference,
      targetRole: role, effectiveOrder: trial.createdOrder,
      createdOrder: transition.createdOrder, assertedByRole: "sut"
    });
    return transition.reference;
  }

  deriveFocusedDrillDecision(interaction, interactionFacts) {
    const activeTrial = this.resolveExactActiveProductionTrial();
    if (!activeTrial) return [];
    const participants = deriveFocusedDrillDecisionParticipants({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      interaction,
      interactionFacts,
      activeTrial,
      validateActiveTrial: (trial) => this.validActiveTrialClosure(trial)
    });
    if (!participants || participants.kind === "reuse") return [];

    const instruction = {
      reference: createReference("state"),
      family: "focused_drill_instruction",
      origin: "sut",
      instructionType: "explicit_current_focused_drill_correction",
      activeTrialRef: activeTrial.reference,
      sourceCommunicationRef: participants.communication.reference,
      attributedAssertionRef: participants.assertion.reference,
      sourceActorRef: participants.sourceActorRef,
      contextRef: participants.context.reference,
      drillScope: structuredClone(participants.drillScope),
      requestedBehavior: IMMEDIATE_CORRECTION_BEHAVIOR,
      authority: "explicit_expected_user_request",
      applicability: "exact_current_focused_drill_only",
      globalPreference: "not_established",
      statusOrigin: "sut_transition",
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    const instructionInputs = [
      activeTrial.reference,
      participants.context.reference,
      participants.communication.reference,
      participants.assertion.reference
    ];
    const instructionTransition = this.createTransition(
      "derive_focused_drill_instruction",
      instructionInputs,
      [instruction.reference],
      interaction.reference
    );
    instructionTransition.result = "focused_drill_instruction_derived";
    attachCreatingTransition([instruction], instructionTransition);

    const disposition = {
      reference: createReference("state"),
      family: "focused_drill_behavior_disposition",
      origin: "sut",
      dispositionType: "current_focused_drill_correction_behavior",
      activeTrialRef: activeTrial.reference,
      instructionRef: instruction.reference,
      contextRef: participants.context.reference,
      drillScope: structuredClone(participants.drillScope),
      requestedBehavior: IMMEDIATE_CORRECTION_BEHAVIOR,
      behaviorStatus: "requested_for_exact_current_drill",
      statusOrigin: "sut_transition",
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    const dispositionInputs = [
      activeTrial.reference,
      participants.context.reference,
      instruction.reference
    ];
    const dispositionTransition = this.createTransition(
      "derive_focused_drill_behavior_disposition",
      dispositionInputs,
      [disposition.reference],
      interaction.reference
    );
    dispositionTransition.result = "focused_drill_behavior_disposition_derived";
    attachCreatingTransition([disposition], dispositionTransition);

    this.commitDerivedRecords([instruction], instructionTransition);
    this.commitDerivedRecords([disposition], dispositionTransition);
    for (const [reference, role] of [
      [activeTrial.reference, "active_production_trial"],
      [participants.context.reference, "current_focused_drill_context"],
      [participants.communication.reference, "explicit_request_communication"],
      [participants.assertion.reference, "attributed_current_request"]
    ]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: instruction.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: instruction.createdOrder,
        createdOrder: instructionTransition.createdOrder,
        assertedByRole: "sut"
      });
    }
    this.relations.push({
      relationKind: "source",
      fromRef: instruction.reference,
      toRef: participants.sourceActorRef,
      targetRole: "semantic_source",
      effectiveOrder: instruction.createdOrder,
      createdOrder: instructionTransition.createdOrder,
      assertedByRole: "sut"
    });
    for (const [reference, role] of [
      [activeTrial.reference, "active_production_trial"],
      [participants.context.reference, "current_focused_drill_context"],
      [instruction.reference, "explicit_focused_drill_instruction"]
    ]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: disposition.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: disposition.createdOrder,
        createdOrder: dispositionTransition.createdOrder,
        assertedByRole: "sut"
      });
    }
    return [instructionTransition.reference, dispositionTransition.reference];
  }

  recordFocusedDrillRealization(interaction, interactionFacts) {
    const behaviorFacts = interactionFacts.filter((fact) => (
      fact.role === "simulator_behavior_realization"
    ));
    const facts = behaviorFacts.filter((fact) => (
      this.records.get(fact.payload.requestedRef)?.family
        === "focused_drill_behavior_disposition"
    ));
    if (behaviorFacts.some((fact) => ![
      "focused_drill_behavior_disposition",
      "direct_current_session_correction_disposition"
    ].includes(this.records.get(fact.payload.requestedRef)?.family))) {
      throw new SutStateIntegrityError(
        "Focused-drill realization must target an exact SUT behavior disposition."
      );
    }
    if (facts.length === 0) return undefined;
    if (facts.length !== 1) return undefined;
    const fact = facts[0];
    const disposition = this.records.get(fact.payload.requestedRef);
    if (disposition?.family !== "focused_drill_behavior_disposition") {
      throw new SutStateIntegrityError(
        "Focused-drill realization must target an exact SUT behavior disposition."
      );
    }
    const activeTrial = this.resolveExactActiveProductionTrial();
    if (!activeTrial || disposition.activeTrialRef !== activeTrial.reference) {
      throw new SutStateIntegrityError(
        "Focused-drill realization requires the exact retained active production trial."
      );
    }
    this.validateFocusedDrillDispositionClosure(disposition);
    const payload = fact.payload;
    const validMatch = isMatchedImmediateRealization(payload);
    const validMismatch = payload.requestedBehavior === IMMEDIATE_CORRECTION_BEHAVIOR
      && payload.fidelity === "mismatch"
      && payload.realizedBehavior !== IMMEDIATE_CORRECTION_BEHAVIOR
      && typeof payload.mismatchOrigin === "string"
      && payload.mismatchOrigin.length > 0;
    if (!validMatch && !validMismatch) {
      throw new SutStateIntegrityError("Focused-drill simulator realization is inconsistent.");
    }
    this.validateRetainedInputFact(
      fact, "simulator", "simulator_behavior_realization", interaction,
      "simulated-dependency"
    );
    const existing = this.resolveFocusedDrillRealizationClosure(disposition.reference);
    if (existing) {
      if (existing.fact.reference === fact.reference) return undefined;
      throw new SutStateIntegrityError(
        "A distinct realization already exists for this focused-drill disposition."
      );
    }
    const transition = this.createTransition(
      "record_focused_drill_realization",
      [fact.reference, disposition.reference],
      [],
      interaction.reference
    );
    transition.result = "focused_drill_realization_recorded";
    this.records.set(transition.reference, transition);
    for (const [reference, role] of [
      [fact.reference, "simulator_behavior_realization_fact"],
      [disposition.reference, "requested_focused_drill_disposition"]
    ]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: transition.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: transition.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }
    this.relations.push({
      relationKind: "realization",
      fromRef: fact.reference,
      toRef: disposition.reference,
      targetRole: "focused_drill_behavior_disposition",
      effectiveOrder: transition.createdOrder,
      createdOrder: transition.createdOrder,
      assertedByRole: "sut"
    });
    return transition.reference;
  }

  recordFocusedDrillOutcome(interaction, interactionFacts) {
    const activeTrial = this.resolveExactActiveProductionTrial();
    if (!activeTrial) return undefined;
    const realizationClosures = [...this.records.values()]
      .filter((record) => record.family === "focused_drill_behavior_disposition")
      .map((disposition) => {
        if (disposition.activeTrialRef !== activeTrial.reference) {
          throw new SutStateIntegrityError(
            "Focused-drill state cannot resolve a different active production trial."
          );
        }
        return this.resolveFocusedDrillRealizationClosure(disposition.reference);
      })
      .filter(Boolean)
      .filter((closure) => isMatchedImmediateRealization(closure.fact.payload));
    const participants = deriveFocusedDrillOutcomeParticipants({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      interaction,
      interactionFacts,
      realizationClosures,
      validateActiveTrial: (trial) => this.validActiveTrialClosure(trial)
    });
    if (!participants || participants.kind === "reuse") return undefined;
    if (participants.activeTrial.reference !== activeTrial.reference) {
      throw new SutStateIntegrityError(
        "Focused-drill outcome must use the exact retained active production trial."
      );
    }
    const outcome = {
      reference: createReference("state"),
      family: "focused_drill_outcome",
      origin: "sut",
      outcomeType: "short_term_intervention_conditioned_focused_drill",
      activeTrialRef: activeTrial.reference,
      instructionRef: participants.instruction.reference,
      behaviorDispositionRef: participants.disposition.reference,
      realizationFactRef: participants.realization.fact.reference,
      realizationTransitionRef: participants.realization.transition.reference,
      observationRef: participants.observation.reference,
      feedbackRef: participants.feedback.reference,
      outcomeIngestionTransitionRef: participants.ingestion.reference,
      observedPerformance: { correctCount: 5, totalCount: 6 },
      feedbackClassification: "positive_current_drill_feedback",
      interventionConditioning:
        "immediate_correction_followed_by_supplied_drill_observation_and_feedback",
      coInterventionStatus: "none_supplied",
      causalScope: "association_only_for_exact_intervention_conditioned_drill",
      longTermEfficacy: "not_established",
      globalPreference: "not_established",
      spontaneousProductionApplicability: "not_established",
      futureApplicability: "not_established",
      statusOrigin: "sut_transition",
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    const participantPairs = [
      [activeTrial.reference, "active_production_trial"],
      [participants.instruction.reference, "explicit_focused_drill_instruction"],
      [participants.disposition.reference, "focused_drill_behavior_disposition"],
      [participants.realization.fact.reference, "matched_simulator_realization"],
      [participants.realization.transition.reference, "realization_transition_evidence"],
      [participants.observation.reference, "focused_drill_observation"],
      [participants.feedback.reference, "current_user_feedback"],
      [interaction.reference, "outcome_interaction"],
      [participants.ingestion.reference, "outcome_ingestion"]
    ];
    const transition = this.createTransition(
      "record_short_term_focused_drill_outcome",
      participantPairs.map(([reference]) => reference),
      [outcome.reference],
      interaction.reference
    );
    transition.result = "short_term_focused_drill_outcome_recorded";
    attachCreatingTransition([outcome], transition);
    this.commitDerivedRecords([outcome], transition);
    for (const [reference, role] of participantPairs) {
      this.relations.push({
        relationKind: "outcome",
        fromRef: outcome.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: outcome.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }
    return transition.reference;
  }

  resolveExactActiveProductionTrial() {
    const activeTrials = [...this.records.values()].filter((record) => (
      record.family === "active_trial"
    ));
    if (activeTrials.length === 0) return undefined;
    if (activeTrials.length !== 1) {
      throw new SutStateIntegrityError(
        "Focused-drill processing requires one exact active production trial."
      );
    }
    return this.validActiveTrialClosure(activeTrials[0]);
  }

  validateFocusedDrillDispositionClosure(disposition) {
    return validateFocusedDrillDispositionClosure({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      disposition,
      validateActiveTrial: (trial) => this.validActiveTrialClosure(trial)
    });
  }

  resolveFocusedDrillRealizationClosure(dispositionRef, expectedFactRef) {
    return resolveFocusedDrillRealizationClosure({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      dispositionRef,
      expectedFactRef,
      validateActiveTrial: (trial) => this.validActiveTrialClosure(trial)
    });
  }

  validateFocusedDrillOutcomeClosure(outcome) {
    return validateFocusedDrillOutcomeClosure({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      outcome,
      validateActiveTrial: (trial) => this.validActiveTrialClosure(trial)
    });
  }

  deriveDirectCorrectionDecision(interaction, interactionFacts) {
    const participants = deriveDirectCorrectionParticipants({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      interaction,
      interactionFacts
    });
    if (!participants || participants.kind === "reuse") return [];

    const correctionState = {
      reference: createReference("state"),
      family: "scoped_current_correction_control",
      origin: "sut",
      controlType: "correction_timing_during_current_spontaneous_session",
      authority: "explicit_current_user_correction",
      interpretedTarget: "correction_timing_during_current_spontaneous_production_session",
      requestedBehavior: "do_not_interrupt_mid_sentence_allow_turn_completion_before_correction",
      correctionTiming: TURN_COMPLETION_CORRECTION_BEHAVIOR,
      activity: participants.sessionScope.activity,
      taskMode: participants.sessionScope.taskMode,
      surfaceLabel: participants.sessionScope.surfaceLabel,
      sessionScope: structuredClone(participants.sessionScope),
      currentApplicability: "applicable_to_exact_current_session",
      futureApplicability: "not_established",
      globalPreference: "not_established",
      sourceCommunicationRef: participants.communication.reference,
      attributedAssertionRef: participants.assertion.reference,
      sourceActorRef: participants.sourceActorRef,
      contextRef: participants.context.reference,
      interruptionEventRef: participants.interruption.reference,
      chronologyRef: participants.chronology.reference,
      controlBasisRefs: structuredClone(participants.controlBasisRefs),
      interactionRef: interaction.reference,
      ingestionTransitionRef: participants.ingestion.reference,
      statusOrigin: "sut_transition",
      createdOrder: this.allocateOrder()
    };
    correctionState.effectiveOrder = correctionState.createdOrder;
    const controlReferences = Object.values(participants.controlBasisRefs);
    const correctionInputs = [
      participants.context.reference,
      participants.interruption.reference,
      participants.communication.reference,
      participants.assertion.reference,
      participants.chronology.reference,
      ...controlReferences,
      interaction.reference,
      participants.ingestion.reference
    ];
    const correctionTransition = this.createTransition(
      "derive_scoped_current_correction_control",
      correctionInputs,
      [correctionState.reference],
      interaction.reference
    );
    correctionTransition.result = "scoped_current_correction_control_derived";
    attachCreatingTransition([correctionState], correctionTransition);

    const disposition = {
      reference: createReference("state"),
      family: "direct_current_session_correction_disposition",
      origin: "sut",
      dispositionType: "respect_explicit_current_correction",
      correctionControlRef: correctionState.reference,
      contextRef: participants.context.reference,
      requestedBehavior: TURN_COMPLETION_CORRECTION_BEHAVIOR,
      behaviorEffect: "immediate_current_session_change",
      sessionScope: structuredClone(participants.sessionScope),
      futureApplicability: "not_established",
      globalPolicy: "not_established",
      durableAdaptation: "not_established",
      statusOrigin: "sut_transition",
      interactionRef: interaction.reference,
      createdOrder: this.allocateOrder()
    };
    disposition.effectiveOrder = disposition.createdOrder;
    const dispositionTransition = this.createTransition(
      "derive_direct_current_session_correction_disposition",
      [correctionState.reference, participants.context.reference],
      [disposition.reference],
      interaction.reference
    );
    dispositionTransition.result = "direct_current_session_correction_disposition_derived";
    attachCreatingTransition([disposition], dispositionTransition);

    this.commitDerivedRecords([correctionState], correctionTransition);
    this.commitDerivedRecords([disposition], dispositionTransition);
    for (const [reference, role] of [
      [participants.context.reference, "current_spontaneous_context"],
      [participants.interruption.reference, "supplied_interruption_event"],
      [participants.communication.reference, "explicit_current_user_correction"],
      [participants.assertion.reference, "attributed_current_user_correction"],
      [participants.chronology.reference, "current_correction_chronology"],
      [participants.controlBasisRefs.userGoverned, "user_governed_control"],
      [participants.controlBasisRefs.consequence, "consequence_control"],
      [participants.controlBasisRefs.reversibility, "reversibility_control"],
      [interaction.reference, "current_correction_interaction"],
      [participants.ingestion.reference, "current_correction_ingestion"]
    ]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: correctionState.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: correctionState.createdOrder,
        createdOrder: correctionTransition.createdOrder,
        assertedByRole: "sut"
      });
    }
    this.relations.push({
      relationKind: "source",
      fromRef: correctionState.reference,
      toRef: participants.sourceActorRef,
      targetRole: "semantic_source",
      effectiveOrder: correctionState.createdOrder,
      createdOrder: correctionTransition.createdOrder,
      assertedByRole: "sut"
    });
    for (const [reference, role] of [
      [correctionState.reference, "scoped_current_correction_control"],
      [participants.context.reference, "current_spontaneous_context"]
    ]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: disposition.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: disposition.createdOrder,
        createdOrder: dispositionTransition.createdOrder,
        assertedByRole: "sut"
      });
    }
    return [correctionTransition.reference, dispositionTransition.reference];
  }

  recordDirectCorrectionRealization(interaction, interactionFacts) {
    const facts = interactionFacts.filter((fact) => (
      fact.role === "simulator_behavior_realization"
      && this.records.get(fact.payload.requestedRef)?.family
        === "direct_current_session_correction_disposition"
    ));
    if (facts.length === 0) return undefined;
    if (facts.length !== 1) return undefined;
    const fact = facts[0];
    const disposition = this.records.get(fact.payload.requestedRef);
    this.validateDirectCorrectionDispositionClosure(disposition);
    const payload = fact.payload;
    const validMismatch = payload.requestedBehavior === TURN_COMPLETION_CORRECTION_BEHAVIOR
      && payload.fidelity === "mismatch"
      && payload.realizedBehavior !== TURN_COMPLETION_CORRECTION_BEHAVIOR
      && typeof payload.mismatchOrigin === "string" && payload.mismatchOrigin.length > 0;
    if (!isMatchedDirectRealization(payload) && !validMismatch) {
      throw new SutStateIntegrityError("Direct correction simulator realization is inconsistent.");
    }
    this.validateRetainedInputFact(
      fact, "simulator", "simulator_behavior_realization", interaction,
      "simulated-dependency"
    );
    const existing = this.resolveDirectCorrectionRealizationClosure(disposition.reference);
    if (existing) {
      if (existing.fact.reference === fact.reference) return undefined;
      throw new SutStateIntegrityError(
        "A distinct realization already exists for this direct correction disposition."
      );
    }
    const transition = this.createTransition(
      "record_direct_current_session_correction_realization",
      [fact.reference, disposition.reference],
      [],
      interaction.reference
    );
    transition.result = "direct_current_session_correction_realization_recorded";
    this.records.set(transition.reference, transition);
    for (const [reference, role] of [
      [fact.reference, "simulator_behavior_realization_fact"],
      [disposition.reference, "requested_direct_correction_disposition"]
    ]) {
      this.relations.push({
        relationKind: "basis",
        fromRef: transition.reference,
        toRef: reference,
        targetRole: role,
        effectiveOrder: transition.createdOrder,
        createdOrder: transition.createdOrder,
        assertedByRole: "sut"
      });
    }
    this.relations.push({
      relationKind: "realization",
      fromRef: fact.reference,
      toRef: disposition.reference,
      targetRole: "direct_current_session_correction_disposition",
      effectiveOrder: transition.createdOrder,
      createdOrder: transition.createdOrder,
      assertedByRole: "sut"
    });
    return transition.reference;
  }

  validateDirectCorrectionDispositionClosure(disposition) {
    return validateDirectCorrectionDispositionClosure({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      disposition
    });
  }

  resolveDirectCorrectionRealizationClosure(dispositionRef, expectedFactRef) {
    return resolveDirectCorrectionRealizationClosure({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      dispositionRef,
      expectedFactRef
    });
  }

  resolveActivationBindingTrigger(interaction, bindingTransitionRef) {
    const transition = this.records.get(bindingTransitionRef);
    const binding = this.records.get(transition?.resultReferences?.[0]);
    if (transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
      || transition.transitionKind !== "assess_proposal_response_binding"
      || transition.result !== "binding_assessed"
      || !isDeepStrictEqual(transition.resultReferences, [binding?.reference])
      || binding?.createdByTransitionRef !== bindingTransitionRef
      || transition.interactionRef !== interaction?.reference
      || binding?.interactionRef !== interaction?.reference) {
      throw new SutStateIntegrityError(
        "Activation assessment requires the exact creating binding transition and interaction."
      );
    }
    this.validateBindingAssessmentClosure(binding);
    return binding;
  }

  resolveActiveTrialTrigger(interaction, assessmentTransitionRef) {
    const transition = this.records.get(assessmentTransitionRef);
    const assessment = this.records.get(transition?.resultReferences?.[0]);
    const binding = this.records.get(assessment?.bindingAssessmentRef);
    if (transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
      || transition.transitionKind !== "assess_production_focused_trial_activation"
      || transition.result !== "activation_assessed"
      || !isDeepStrictEqual(transition.resultReferences, [assessment?.reference])
      || assessment?.createdByTransitionRef !== assessmentTransitionRef
      || transition.interactionRef !== interaction?.reference
      || assessment?.interactionRef !== interaction?.reference
      || binding?.interactionRef !== interaction?.reference) {
      throw new SutStateIntegrityError(
        "Trial activation requires the exact creating assessment transition and binding interaction."
      );
    }
    this.validActivationAssessmentClosure(assessment);
    return assessment;
  }

  resolveActivationCandidateBasis(candidate) {
    const interaction = this.records.get(candidate.interactionRef);
    const comparison = this.records.get(candidate.supportComparisonRef);
    const candidateRelations = this.relations.filter((relation) => relation.fromRef === candidate.reference);
    const comparisonBasis = candidateRelations.filter((relation) => relation.relationKind === "basis"
      && relation.targetRole === "comparison_input" && relation.toRef === comparison?.reference);
    const support = candidateRelations.filter((relation) => relation.relationKind === "support"
      && relation.targetRole === "dimension_comparison" && relation.toRef === comparison?.reference);
    const competing = candidateRelations.filter((relation) => (
      ["comparison_input", "dimension_comparison"].includes(relation.targetRole)
      || this.records.get(relation.toRef)?.family === "dimension_comparison"
    ));
    const candidateTransition = this.records.get(candidate.createdByTransitionRef);
    if (comparison?.family !== "dimension_comparison" || comparison.origin !== "sut"
      || comparisonBasis.length !== 1
      || support.length !== 1 || competing.length !== 2
      || comparison.targetDimension !== candidate.proposedScope.dimension
      || [...comparisonBasis, ...support].some((relation) => relation.assertedByRole !== "sut"
        || relation.effectiveOrder !== candidate.createdOrder
        || relation.createdOrder !== candidateTransition.createdOrder)) {
      throw new SutStateIntegrityError("Activation requires the exact candidate support comparison closure.");
    }
    const recognition = this.resolveSingleComparisonParticipant(comparison, "recognitionObservationRefs", "recognition");
    const production = this.resolveSingleComparisonParticipant(comparison, "productionObservationRefs", "spontaneous_production");
    const chronologyFacts = interaction.inputReferences.map((ref) => this.records.get(ref))
      .filter((fact) => fact?.role === "chronology_fact");
    const contexts = interaction.inputReferences.map((ref) => this.records.get(ref))
      .filter((fact) => fact?.role === "context_label");
    if (chronologyFacts.length !== 1 || contexts.length !== 1) {
      throw new SutStateIntegrityError("Activation requires exact chronology and context participants.");
    }
    this.validateRetainedInputFact(
      chronologyFacts[0], "fixture", "chronology_fact", interaction, "fixture-driver"
    );
    this.validateRetainedInputFact(
      contexts[0], "fixture", "context_label", interaction, "fixture-driver"
    );
    return { interaction, comparison, recognition, production, chronology: chronologyFacts[0], context: contexts[0] };
  }

  resolveSingleComparisonParticipant(comparison, property, taskMode) {
    if (comparison[property]?.length !== 1) {
      throw new SutStateIntegrityError("Activation requires one exact observation per comparison role.");
    }
    const observation = this.records.get(comparison[property][0]);
    const transition = this.records.get(comparison.createdByTransitionRef);
    const relation = this.relations.filter((candidate) => candidate.fromRef === comparison.reference
      && candidate.toRef === observation?.reference && candidate.relationKind === "basis"
      && candidate.targetRole === (taskMode === "recognition" ? "recognition_observation" : "production_observation"));
    const allObservationRelations = this.relations.filter((candidate) => (
      candidate.fromRef === comparison.reference && candidate.relationKind === "basis"
    ));
    const expectedInputs = uniqueReferences([
      ...comparison.recognitionObservationRefs, ...comparison.productionObservationRefs
    ]);
    if (observation?.role !== "task_observation" || observation.payload.taskMode !== taskMode
      || observation.payload.dimension !== comparison.targetDimension
      || relation.length !== 1 || relation[0].assertedByRole !== "sut"
      || relation[0].semanticDimension !== comparison.targetDimension
      || relation[0].semanticTaskMode !== taskMode
      || relation[0].effectiveOrder !== comparison.createdOrder
      || relation[0].createdOrder !== transition?.createdOrder
      || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
      || transition.transitionKind !== "compare_recognition_and_spontaneous_production"
      || transition.interactionRef !== comparison.interactionRef
      || !isDeepStrictEqual(transition.inputReferences, expectedInputs)
      || !isDeepStrictEqual(transition.resultReferences, [comparison.reference])
      || transition.result !== "accepted" || comparison.createdOrder >= transition.createdOrder
      || allObservationRelations.length !== expectedInputs.length) {
      throw new SutStateIntegrityError("Activation comparison observation closure is malformed.");
    }
    this.validateRetainedInputFact(
      observation, "fixture", "task_observation", this.records.get(comparison.interactionRef),
      "fixture-scorer"
    );
    return observation;
  }

  validateRetainedInputFact(fact, origin, role, interaction, expectedSourceActor) {
    return validateRetainedInputFact({
      records: this.records,
      relations: this.relations,
      sourceFactBindings: this.sourceFactBindings,
      fact,
      origin,
      role,
      interaction,
      expectedSourceActor
    });
  }

  resolveActivationBindingContext(binding, activationInteraction) {
    const bindingInteraction = this.records.get(binding.interactionRef);
    const bindingTransition = this.records.get(binding.createdByTransitionRef);
    const ingestion = this.records.get(bindingInteraction?.createdByTransitionRef);
    const realizationRefs = binding.realizationFactRefs ?? [];
    const responseRefs = binding.userResponseRefs ?? [];
    const realization = this.records.get(realizationRefs[0]);
    const response = this.records.get(responseRefs[0]);
    if (bindingInteraction?.family !== "interaction_segment" || bindingInteraction.origin !== "sut"
      || activationInteraction?.reference !== bindingInteraction.reference
      || realizationRefs.length !== 1 || responseRefs.length !== 1
      || bindingInteraction.inputReferences.filter((ref) => ref === realization?.reference).length !== 1
      || bindingInteraction.inputReferences.filter((ref) => ref === response?.reference).length !== 1
      || ingestion?.family !== "sut_transition_evidence" || ingestion.origin !== "sut"
      || ingestion.transitionKind !== "ingest_sut_visible_inputs"
      || ingestion.interactionRef !== bindingInteraction.reference
      || bindingInteraction.createdOrder >= ingestion.createdOrder
      || ingestion.createdOrder >= binding.createdOrder
      || binding.createdOrder >= bindingTransition?.createdOrder) {
      throw new SutStateIntegrityError("Activation must retain the exact binding interaction closure.");
    }
    this.validateRetainedInputFact(
      realization, "simulator", "simulator_realization", bindingInteraction, "simulated-dependency"
    );
    this.validateRetainedInputFact(
      response, "fixture", "user_response", bindingInteraction, "synthetic-user-a"
    );
    return { bindingInteraction, ingestion, bindingTransition, realization, response };
  }

  resolveActivationParticipants(candidate, binding, basis, activationInteraction) {
    const controlInventory = (interaction) => {
      const inventory = {
        trialPolicyRefs: [], userGovernedConstraintRefs: [], consequenceRefs: [],
        reversibilityRefs: [], retentionBasisRefs: []
      };
      for (const fact of interaction.inputReferences.map((ref) => this.records.get(ref))
        .filter((record) => record?.role === "fixture_control_fact")) {
        this.validateRetainedInputFact(
          fact, "fixture", "fixture_control_fact", interaction, "fixture-driver"
        );
        if (!ACTIVATION_CONTROL_TYPES.includes(fact.payload.control)) {
          throw new SutStateIntegrityError(
            "Activation assessment cannot classify an unknown co-applicable control fact."
          );
        }
        inventory[activationControlRefKey(fact.payload.control)].push(fact.reference);
      }
      return inventory;
    };
    const controlBasisRefs = {
      candidateInteraction: controlInventory(basis.interaction),
      bindingInteraction: controlInventory(activationInteraction)
    };
    const contextChanges = activationInteraction.inputReferences
      .map((ref) => this.records.get(ref))
      .filter((fact) => fact?.role === "material_context_change");
    for (const fact of contextChanges) {
      this.validateRetainedInputFact(
        fact, "fixture", "material_context_change", activationInteraction, "fixture-driver"
      );
    }
    return {
      candidateRef: candidate.reference, bindingAssessmentRef: binding.reference,
      comparisonRef: basis.comparison.reference,
      recognitionObservationRef: basis.recognition.reference,
      productionObservationRef: basis.production.reference,
      chronologyRef: basis.chronology.reference, contextRef: basis.context.reference,
      contextChangeRefs: contextChanges.map((fact) => fact.reference), controlBasisRefs
    };
  }

  deriveActivationCheckResults({
    candidate, proposal, binding, basis, controlBasisRefs, contextChangeRefs
  }) {
    return deriveActivationCheckResults(this.records, {
      candidate,
      proposal,
      binding,
      basis,
      controlBasisRefs,
      contextChangeRefs
    });
  }

  validActivationAssessmentClosure(assessment) {
    if (!hasExactKeys(assessment, [
      "reference", "family", "origin", "activationType", "activationBasisType",
      "candidateRef", "bindingAssessmentRef", "activeScope", "overallStatus",
      "comparisonRef", "recognitionObservationRef", "productionObservationRef",
      "chronologyRef", "contextRef", "controlBasisRefs", "checkResults",
      "materialBasisRefs", "statusOrigin", "interactionRef", "createdOrder",
      "createdByTransitionRef"
    ]) || assessment.family !== "activation_assessment" || assessment.origin !== "sut"
      || assessment.activationType !== "production_focused_candidate_activation"
      || assessment.activationBasisType !== "bound_candidate_specific_proposal_acceptance"
      || assessment.statusOrigin !== "sut_transition" || !hasExactKeys(assessment.checkResults, ACTIVATION_CHECK_NAMES)) {
      throw new SutStateIntegrityError("Activation assessment identity or check set is malformed.");
    }
    const competingAssessments = [...this.records.values()].filter((record) => (
      record.family === "activation_assessment"
      && record.candidateRef === assessment.candidateRef
      && record.bindingAssessmentRef === assessment.bindingAssessmentRef
    ));
    if (competingAssessments.length !== 1 || competingAssessments[0].reference !== assessment.reference) {
      throw new SutStateIntegrityError("Activation assessment identity is duplicated or competing.");
    }
    const transition = this.resolveUniqueCreatingTransition(
      assessment, "Activation assessment"
    );
    const binding = this.records.get(assessment.bindingAssessmentRef);
    this.validateBindingAssessmentClosure(binding);
    const proposal = this.validateCandidateBoundProposal(binding.proposalRef);
    const candidateClosure = this.validateProductionCandidateClosure(proposal.candidateRef);
    const candidate = candidateClosure.candidate;
    const activationInteraction = this.records.get(assessment.interactionRef);
    if (activationInteraction?.family !== "interaction_segment" || activationInteraction.origin !== "sut") {
      throw new SutStateIntegrityError("Activation assessment interaction is malformed.");
    }
    const bindingContext = this.resolveActivationBindingContext(binding, activationInteraction);
    const basis = this.resolveActivationCandidateBasis(candidate);
    const participants = this.resolveActivationParticipants(
      candidate, binding, basis, activationInteraction
    );
    const materialRefs = activationMaterialBasisRefs(participants);
    const expected = this.deriveActivationCheckResults({
      candidate, proposal, binding, basis, controlBasisRefs: participants.controlBasisRefs,
      contextChangeRefs: participants.contextChangeRefs
    });
    const relations = this.relations.filter((relation) => relation.fromRef === assessment.reference
      && relation.relationKind === "basis");
    const expectedPairs = activationParticipantRolePairs(participants);
    if (transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
      || transition.transitionKind !== "assess_production_focused_trial_activation"
      || transition.interactionRef !== activationInteraction?.reference
      || transition.result !== "activation_assessed"
      || !isDeepStrictEqual(transition.inputReferences, materialRefs)
      || new Set(transition.inputReferences).size !== transition.inputReferences.length
      || !isDeepStrictEqual(transition.resultReferences, [assessment.reference])
      || !isDeepStrictEqual(assessment.controlBasisRefs, participants.controlBasisRefs)
      || !isDeepStrictEqual(assessment.materialBasisRefs, materialRefs)
      || assessment.comparisonRef !== participants.comparisonRef
      || assessment.recognitionObservationRef !== participants.recognitionObservationRef
      || assessment.productionObservationRef !== participants.productionObservationRef
      || assessment.chronologyRef !== participants.chronologyRef
      || assessment.contextRef !== participants.contextRef
      || assessment.candidateRef !== proposal.candidateRef
      || relations.length !== expectedPairs.length
      || !sameRoleReferencePairs(relations, expectedPairs)
      || relations.some((relation) => relation.assertedByRole !== "sut"
        || relation.effectiveOrder !== assessment.createdOrder
        || relation.createdOrder !== transition.createdOrder)
      || !isDeepStrictEqual(assessment.checkResults, expected)
      || assessment.overallStatus !== deriveActivationOverallStatus(expected)
      || !isDeepStrictEqual(assessment.activeScope, candidate.proposedScope)
      || bindingContext.bindingTransition.createdOrder >= assessment.createdOrder
      || assessment.createdOrder >= transition.createdOrder
      || materialRefs.some((ref) => this.records.get(ref)?.createdOrder >= assessment.createdOrder)) {
      throw new SutStateIntegrityError("Activation assessment closure is malformed.");
    }
    return assessment;
  }

  validActiveTrialClosure(trial) {
    const transition = this.resolveUniqueCreatingTransition(trial, "Active trial");
    const candidate = this.records.get(trial?.candidateRef);
    const assessment = this.records.get(trial?.activationAssessmentRef);
    this.validActivationAssessmentClosure(assessment);
    const assessmentTransition = this.records.get(assessment?.createdByTransitionRef);
    const ancestry = this.relations.filter((relation) => relation.fromRef === trial?.reference
      && relation.relationKind === "transition_ancestry");
    const competingTrials = [...this.records.values()].filter((record) => (
      record.family === "active_trial" && record.candidateRef === trial?.candidateRef
    ));
    if (!hasExactKeys(trial, [
      "reference", "family", "origin", "trialType", "trialOrigin", "candidateRef",
      "activationAssessmentRef", "activationBasisType", "activeScope", "currentStatus",
      "lifecycleVersion", "correctionPath", "statusOrigin", "interactionRef", "createdOrder",
      "createdByTransitionRef"
    ]) || trial.family !== "active_trial" || trial.origin !== "sut"
      || trial.trialType !== "production_focused_practice" || trial.trialOrigin !== "zoey_derived_trial"
      || trial.currentStatus !== "active" || trial.lifecycleVersion !== 1
      || trial.activationBasisType !== "bound_candidate_specific_proposal_acceptance"
      || trial.correctionPath !== "narrow_retire_supersede_or_clarify"
      || competingTrials.length !== 1 || competingTrials[0].reference !== trial.reference
      || trial.statusOrigin !== "sut_transition" || !isDeepStrictEqual(trial.activeScope, candidate.proposedScope)
      || trial.candidateRef !== assessment.candidateRef
      || candidate.lifecycleStatus !== "formed_non_active" || candidate.lifecycleVersion !== 1
      || assessment.overallStatus !== "sufficient"
      || Object.values(assessment.checkResults).some((result) => result.status !== "passed")
      || trial.interactionRef !== assessment.interactionRef
      || transition?.family !== "sut_transition_evidence" || transition.origin !== "sut"
      || transition.transitionKind !== "activate_production_focused_trial"
      || transition.interactionRef !== trial.interactionRef
      || transition.result !== "trial_activated"
      || !isDeepStrictEqual(transition.inputReferences, [candidate.reference, assessment.reference])
      || new Set(transition.inputReferences).size !== 2
      || !isDeepStrictEqual(transition.resultReferences, [trial.reference])
      || ancestry.length !== 2
      || !ancestry.some((relation) => relation.toRef === candidate.reference && relation.targetRole === "trial_candidate")
      || !ancestry.some((relation) => relation.toRef === assessment.reference && relation.targetRole === "activation_assessment")
      || ancestry.some((relation) => relation.assertedByRole !== "sut"
        || relation.effectiveOrder !== trial.createdOrder || relation.createdOrder !== transition.createdOrder)
      || assessment.createdOrder >= assessmentTransition.createdOrder
      || assessmentTransition.createdOrder >= trial.createdOrder
      || trial.createdOrder >= transition.createdOrder) {
      throw new SutStateIntegrityError("Active trial closure is malformed.");
    }
    return trial;
  }

  isCanonicalProposalResponse(response) {
    return isCanonicalProposalResponse(this.records, this.relations, response);
  }

  isValidInitializedIngestionResult(reference, transition, interaction) {
    return isValidInitializedIngestionResult(
      this.records, this.relations, reference, transition, interaction
    );
  }

  validateBindingAssessmentClosure(assessment) {
    return validateBindingAssessmentClosure(this.records, this.relations, assessment);
  }

  validateCandidateBoundProposal(proposalRef) {
    return validateCandidateBoundProposal(this.records, this.relations, proposalRef);
  }

  validateProductionCandidateClosure(candidateRef) {
    return validateProductionCandidateClosure(this.records, this.relations, candidateRef);
  }

  validateProposalResultClosure(proposalRef, transition, candidateByRef) {
    return validateProposalResultClosure(
      this.records, this.relations, proposalRef, transition, candidateByRef
    );
  }

  resolveProposalRealizationClosure(proposalRef, expectedFactRef) {
    return resolveProposalRealizationClosure(
      this.records, this.relations, proposalRef, expectedFactRef
    );
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

  resolveUniqueCreatingTransition(record, label) {
    return resolveUniqueCreatingTransition(this.records, record, label);
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
  return ["simulator_realization", "simulator_behavior_realization"].includes(input.kind)
    ? "simulator" : "fixture";
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

function sameRoleReferencePairs(relations, expectedPairs) {
  const actual = relations.map((relation) => `${relation.targetRole}:${relation.toRef}`).sort();
  const expected = expectedPairs.map(([ref, role]) => `${role}:${ref}`).sort();
  return isDeepStrictEqual(actual, expected);
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
