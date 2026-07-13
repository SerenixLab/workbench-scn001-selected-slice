import { isDeepStrictEqual } from "node:util";

import { SutStateIntegrityError } from "./errors.js";

export const ACTIVATION_CHECK_NAMES = Object.freeze([
  "scope", "basis_lineage", "current_stale_basis", "user_governed_constraints",
  "reversibility", "consequence", "current_applicability", "retention_basis",
  "non_adaptation_boundary"
]);

export const ACTIVATION_CONTROL_TYPES = Object.freeze([
  "trial_policy", "user_governed_constraints", "consequence", "reversibility",
  "evaluation_retention_basis"
]);

const ACTIVATION_CONTROL_REF_KEYS = Object.freeze([
  "trialPolicyRefs", "userGovernedConstraintRefs", "consequenceRefs",
  "reversibilityRefs", "retentionBasisRefs"
]);

export function deriveActivationCheckResults(records, {
  candidate, proposal, binding, basis, controlBasisRefs, contextChangeRefs
}) {
  const pass = (reason) => ({ status: "passed", reason });
  const fail = (reason) => ({ status: "failed", reason });
  const unresolved = (reason) => ({ status: "unresolved", reason });
  const classifyControl = (refs, supportedValue, reasons) => {
    const exactRefs = uniqueReferences(refs);
    if (exactRefs.length === 0) return fail(reasons.missing);
    if (exactRefs.length > 1) return unresolved(reasons.conflicting);
    return records.get(exactRefs[0]).payload.value === supportedValue
      ? pass(reasons.passed) : fail(reasons.unsupported);
  };
  const combinedControlRefs = (key) => [
    ...controlBasisRefs.candidateInteraction[key],
    ...controlBasisRefs.bindingInteraction[key]
  ];
  const classifyRedelivery = (key, supportedValue, reasons) => {
    const candidateRefs = uniqueReferences(controlBasisRefs.candidateInteraction[key]);
    const bindingRefs = uniqueReferences(controlBasisRefs.bindingInteraction[key]);
    if (candidateRefs.length === 0) return fail(reasons.missingCandidate);
    if (bindingRefs.length === 0) return fail(reasons.missingBinding);
    if (candidateRefs.length > 1 || bindingRefs.length > 1) {
      return unresolved(reasons.conflicting);
    }
    if (candidateRefs[0] !== bindingRefs[0]) return fail(reasons.identityMismatch);
    return records.get(candidateRefs[0]).payload.value === supportedValue
      ? pass(reasons.passed) : fail(reasons.unsupported);
  };
  const current = basis.recognition.payload.occurrenceScenarioDay
      === basis.chronology.payload.scenarioDay
    && basis.production.payload.occurrenceScenarioDay === basis.chronology.payload.scenarioDay
    && basis.recognition.firstInteractionRef === candidate.interactionRef
    && basis.production.firstInteractionRef === candidate.interactionRef;
  const contextCompatible = basis.context.payload.activity === "japanese_practice"
    && basis.context.payload.taskMode === "spontaneous_production";
  return {
    scope: isDeepStrictEqual(proposal.proposedScope, candidate.proposedScope)
      && candidate.proposedScope.taskMode === "spontaneous_production"
      ? pass("exact_bounded_candidate_scope") : fail("candidate_proposal_scope_mismatch"),
    basis_lineage: binding.proposalRef === proposal.reference
      ? pass("exact_candidate_proposal_binding_lineage") : fail("incomplete_activation_lineage"),
    current_stale_basis: current
      ? pass("current_calibration_support") : fail("support_not_current_under_chronology"),
    user_governed_constraints: classifyControl(
      combinedControlRefs("userGovernedConstraintRefs"), "exhaustive_selected_slice_scope",
      { missing: "user_governed_control_missing", conflicting: "conflicting_user_governed_controls",
        passed: "exhaustive_selected_slice_constraints", unsupported: "unsupported_user_governed_constraints" }
    ),
    reversibility: candidate.reversibility !== "retirable_before_activation"
      ? fail("candidate_reversibility_not_supported")
      : classifyRedelivery("reversibilityRefs", "reversible",
        { missingCandidate: "candidate_reversibility_control_missing",
          missingBinding: "canonical_reversibility_redelivery_missing",
          conflicting: "conflicting_reversibility_controls",
          identityMismatch: "canonical_reversibility_redelivery_identity_mismatch",
          passed: "reversible_separate_trial_state", unsupported: "reversibility_not_supported" }),
    consequence: basis.context.payload.consequence !== "low"
      ? fail("context_consequence_not_low")
      : classifyRedelivery("consequenceRefs", "low",
        { missingCandidate: "candidate_consequence_control_missing",
          missingBinding: "canonical_consequence_redelivery_missing",
          conflicting: "conflicting_consequence_controls",
          identityMismatch: "canonical_consequence_redelivery_identity_mismatch",
          passed: "low_consequence_synthetic_context", unsupported: "consequence_not_low" }),
    current_applicability: contextCompatible && contextChangeRefs.length === 0
      ? pass("current_japanese_production_context_compatible") : fail("current_context_not_applicable"),
    retention_basis: classifyControl(combinedControlRefs("retentionBasisRefs"), "named_formal_run",
      { missing: "retention_control_missing", conflicting: "conflicting_retention_controls",
        passed: "named_formal_run_disposable_retention", unsupported: "unsupported_retention_basis" }),
    non_adaptation_boundary: candidate.purpose !== "provisional_evaluative_trial"
      ? fail("candidate_not_provisional")
      : classifyControl(combinedControlRefs("trialPolicyRefs"),
        "bounded_reversible_trial_no_durable_adaptation",
        { missing: "trial_policy_control_missing", conflicting: "conflicting_trial_policy_controls",
          passed: "bounded_zoey_trial_not_durable_adaptation",
          unsupported: "durable_adaptation_not_permitted" })
  };
}

export function deriveActivationOverallStatus(checkResults) {
  const results = Object.values(checkResults);
  if (results.some((result) => result.status === "failed")) return "insufficient";
  if (results.some((result) => result.status === "unresolved")) return "unresolved_conflict";
  return "sufficient";
}

export function activationMaterialBasisRefs(participants) {
  return uniqueReferences([
    participants.candidateRef, participants.bindingAssessmentRef, participants.comparisonRef,
    participants.recognitionObservationRef, participants.productionObservationRef,
    participants.chronologyRef, participants.contextRef, ...participants.contextChangeRefs,
    ...activationControlBasisRefs(participants.controlBasisRefs)
  ]);
}

export function activationParticipantRolePairs(participants) {
  return [
    [participants.candidateRef, "activation_candidate"],
    [participants.bindingAssessmentRef, "proposal_response_binding"],
    [participants.comparisonRef, "candidate_support_comparison"],
    [participants.recognitionObservationRef, "current_recognition_evidence"],
    [participants.productionObservationRef, "current_production_evidence"],
    [participants.chronologyRef, "activation_chronology"],
    [participants.contextRef, "activation_context"],
    ...participants.contextChangeRefs.map((ref) => [ref, "binding_material_context_change"]),
    ...activationControlRolePairs(
      participants.controlBasisRefs.candidateInteraction, "candidate"
    ),
    ...activationControlRolePairs(
      participants.controlBasisRefs.bindingInteraction, "binding"
    )
  ];
}

export function activationControlRefKey(control) {
  return {
    trial_policy: "trialPolicyRefs",
    user_governed_constraints: "userGovernedConstraintRefs",
    consequence: "consequenceRefs",
    reversibility: "reversibilityRefs",
    evaluation_retention_basis: "retentionBasisRefs"
  }[control];
}

export function hasExactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
}

function activationControlBasisRefs(controlBasisRefs) {
  if (!hasExactKeys(controlBasisRefs, ["candidateInteraction", "bindingInteraction"])
    || !hasExactKeys(controlBasisRefs.candidateInteraction, ACTIVATION_CONTROL_REF_KEYS)
    || !hasExactKeys(controlBasisRefs.bindingInteraction, ACTIVATION_CONTROL_REF_KEYS)) {
    throw new SutStateIntegrityError("Activation control-basis inventory is malformed.");
  }
  return ["candidateInteraction", "bindingInteraction"].flatMap((region) => (
    ACTIVATION_CONTROL_REF_KEYS.flatMap((key) => controlBasisRefs[region][key])
  ));
}

function activationControlRolePairs(inventory, prefix) {
  return [
    ...inventory.trialPolicyRefs.map((ref) => [ref, `${prefix}_trial_policy_control`]),
    ...inventory.userGovernedConstraintRefs.map((ref) => [ref, `${prefix}_user_governed_control`]),
    ...inventory.consequenceRefs.map((ref) => [ref, `${prefix}_consequence_control`]),
    ...inventory.reversibilityRefs.map((ref) => [ref, `${prefix}_reversibility_control`]),
    ...inventory.retentionBasisRefs.map((ref) => [ref, `${prefix}_retention_control`])
  ];
}

function uniqueReferences(references) {
  return [...new Set(references)];
}
