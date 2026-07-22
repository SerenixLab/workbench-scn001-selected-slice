import {
  ARTIFACT_KIND_SCHEMA,
  assertExactKeys,
  assertNonemptyString,
  assertOpaqueId,
  assertPlainObject,
  assertSha256,
  assertSortedUniqueStrings,
  canonicalizeJson,
  createCanonicalArtifact,
  createExactArtifactReference,
  deepFreeze,
  fingerprintCanonicalJson,
  resolveExactArtifactReference,
  validateCanonicalArtifact,
  validateExactArtifactReference
} from "./formalArtifactIdentity.js";
import {
  createConfigurationManifestReference,
  resolveConfigurationManifestReference,
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest
} from "./configurationIdentity.js";

export const REQUIRED_PATHS = Object.freeze([
  "SCN001-SSFO-V0.2.0-CANONICAL-THIN",
  "SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT",
  "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN",
  "SCN001-SSFO-V0.2.0-CF-RECENT-BASIS"
]);
export const REQUIRED_CLAIM_CLASSES = Object.freeze([
  "CC-EVIDENCE-TRIAL-FORMATION",
  "CC-EXPLANATION-PROVENANCE",
  "CC-OUTCOME-SEMANTICS",
  "CC-SCOPE-TRIAL-USE",
  "CC-TIME-STALE-BASIS"
]);
const QUALIFICATION_RESULTS = Object.freeze([
  "QUALIFIED", "NOT_QUALIFIED", "INCONCLUSIVE"
]);
const MISMATCH_CLASSES = Object.freeze([
  "VALUE_MISMATCH",
  "MISSING_MEMBER",
  "EXTRA_MEMBER",
  "ORDER_MISMATCH",
  "RELATION_MISMATCH",
  "AMBIGUOUS_NORMALIZATION",
  "RAW_DIGEST_MISMATCH",
  "COMPARATOR_ERROR"
]);
const ANCHOR_START_PROFILE = Object.freeze({
  PROTECTED_REMOTE_GATE: "GATE_LAUNCHED_ATTEMPT",
  INDEPENDENT_PREOUTPUT_ATTESTATION: "INDEPENDENT_START_ATTESTATION"
});
const MATERIAL_AUTHORITY_DECISIONS = Object.freeze([
  "AUTHORITY_INVALIDATION",
  "RECORD_CORRECTION",
  "ORACLE_POLICY_RECLASSIFICATION",
  "QUALIFICATION_RESULT_CORRECTION",
  "CAMPAIGN_SUPERSESSION",
  "NAMESPACE_RECONCILIATION"
]);
const RUN_INVALIDITY_REASON_CODES = Object.freeze(Array.from(
  { length: 10 },
  (_, index) => `SCN001-SSFO-V0.2.0-VAL-${String(index + 1).padStart(3, "0")}`
));

export function createQualificationPlan(input) {
  assertExactKeys(input, [
    "artifact_id",
    "authority_namespace_id",
    "behavior_manifest",
    "evaluation_manifest",
    "execution_slots",
    "allocation_policy",
    "producer_identity",
    "validator_identity",
    "custody_plan",
    "anchor_requirement",
    "created_at",
    "created_by"
  ], [], "qualification plan input");
  validateBehaviorConfigurationManifest(input.behavior_manifest);
  validateEvaluationConfigurationManifest(input.evaluation_manifest);
  if (input.evaluation_manifest.identity_payload.deterministic_replay.mode
    !== "QUALIFICATION_SUPPORTED") {
    throw new Error("Qualification plan requires a qualification-supported evaluation manifest.");
  }
  validateQualificationSlots(input.execution_slots);
  validateAllocationPolicy(input.allocation_policy);
  validateDistinctActors(input.producer_identity, input.validator_identity);
  validateCustodyPlan(input.custody_plan);
  validateAnchorRequirement(input.anchor_requirement);
  validateCreated(input.created_at, input.created_by);
  const payload = {
    artifact_kind: "DETERMINISTIC_QUALIFICATION_PLAN",
    schema_id: ARTIFACT_KIND_SCHEMA.DETERMINISTIC_QUALIFICATION_PLAN,
    schema_revision: 1,
    authority_namespace_id: input.authority_namespace_id,
    behavior_manifest_ref: createConfigurationManifestReference(input.behavior_manifest),
    evaluation_manifest_ref: createConfigurationManifestReference(input.evaluation_manifest),
    required_paths: [...REQUIRED_PATHS],
    execution_slots: structuredClone(input.execution_slots),
    initial_state_policy: "DECLARED_CLEAN_INITIAL_STATE",
    isolation_policy: "INDEPENDENT_EXECUTION_STATE",
    capture_policy: "COMPLETE_ORACLE_MATERIAL_CAPTURE",
    simulator_policy: "BOUND_EVALUATION_CONFIGURATION",
    deterministic_equivalence: deterministicEquivalenceFrom(input.evaluation_manifest),
    allocation_policy: structuredClone(input.allocation_policy),
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    custody_plan: structuredClone(input.custody_plan),
    anchor_requirement: structuredClone(input.anchor_requirement),
    created_at: input.created_at,
    created_by: input.created_by,
    execution_evidence_status: "DEVELOPMENT_PREFLIGHT_NOT_FORMAL_SUT_EVIDENCE"
  };
  const plan = createCanonicalArtifact({
    artifact_id: input.artifact_id,
    artifact_kind: "DETERMINISTIC_QUALIFICATION_PLAN",
    identity_payload: payload
  });
  validateQualificationPlan(plan, {
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  });
  return plan;
}

export function validateQualificationPlan(plan, { behaviorManifest, evaluationManifest }) {
  validateCanonicalArtifact(plan, { allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"] });
  const payload = plan.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind",
    "schema_id",
    "schema_revision",
    "authority_namespace_id",
    "behavior_manifest_ref",
    "evaluation_manifest_ref",
    "required_paths",
    "execution_slots",
    "initial_state_policy",
    "isolation_policy",
    "capture_policy",
    "simulator_policy",
    "deterministic_equivalence",
    "allocation_policy",
    "producer_identity",
    "validator_identity",
    "custody_plan",
    "anchor_requirement",
    "created_at",
    "created_by",
    "execution_evidence_status"
  ], [], "qualification plan payload");
  assertOpaqueId(payload.authority_namespace_id, "qualification authority_namespace_id");
  resolveConfigurationManifestReference(payload.behavior_manifest_ref, behaviorManifest);
  resolveConfigurationManifestReference(payload.evaluation_manifest_ref, evaluationManifest);
  validateExactSet(payload.required_paths, REQUIRED_PATHS, "qualification required_paths");
  validateQualificationSlots(payload.execution_slots);
  if (payload.initial_state_policy !== "DECLARED_CLEAN_INITIAL_STATE"
    || payload.isolation_policy !== "INDEPENDENT_EXECUTION_STATE"
    || payload.capture_policy !== "COMPLETE_ORACLE_MATERIAL_CAPTURE"
    || payload.simulator_policy !== "BOUND_EVALUATION_CONFIGURATION"
    || payload.execution_evidence_status !== "DEVELOPMENT_PREFLIGHT_NOT_FORMAL_SUT_EVIDENCE") {
    throw new Error("Qualification plan fixed execution policies are invalid.");
  }
  validateDeterministicEquivalence(payload.deterministic_equivalence, evaluationManifest);
  validateAllocationPolicy(payload.allocation_policy);
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  validateCustodyPlan(payload.custody_plan);
  validateAnchorRequirement(payload.anchor_requirement);
  validateCreated(payload.created_at, payload.created_by);
  return plan;
}

export function createQualificationResult(input) {
  assertExactKeys(input, [
    "artifact_id",
    "plan",
    "behavior_manifest",
    "evaluation_manifest",
    "executions",
    "comparisons",
    "result",
    "producer_identity",
    "validator_identity",
    "validation_result",
    "validation_attestation_ref",
    "anchor_receipt_ref",
    "fresh_start_proof_refs",
    "sealed_at",
    "sealed_by"
  ], ["supersedes_result_ref", "correction_decision_ref"], "qualification result input");
  validateQualificationPlan(input.plan, {
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  });
  const planPayload = input.plan.identity_payload;
  validateQualificationExecutions(input.executions, planPayload.execution_slots);
  validateQualificationComparisons(
    input.comparisons, planPayload.execution_slots, input.executions
  );
  const derived = deriveQualificationResult(input.executions, input.comparisons);
  if (input.result !== derived) {
    throw new Error(`Qualification result must be derived as ${derived}.`);
  }
  validateDistinctActors(input.producer_identity, input.validator_identity);
  if (input.validation_result !== "VALIDATED") {
    throw new Error("Qualification result requires distinct successful validation.");
  }
  validateExactArtifactReference(input.validation_attestation_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  validateExactArtifactReference(input.anchor_receipt_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  validateEvidenceReferences(input.fresh_start_proof_refs, "fresh_start_proof_refs");
  if (input.fresh_start_proof_refs.length !== planPayload.execution_slots.length) {
    throw new Error("Qualification result requires exactly one fresh-start proof per execution.");
  }
  validateCreated(input.sealed_at, input.sealed_by);
  if (input.sealed_by !== input.validator_identity) {
    throw new Error("Qualification result must be sealed by its distinct validator.");
  }
  const supersedes = input.supersedes_result_ref ?? null;
  const correctionDecision = input.correction_decision_ref ?? null;
  if ((supersedes === null) !== (correctionDecision === null)) {
    throw new Error("Qualification supersession requires an exact correction decision.");
  }
  if (supersedes !== null) {
    validateExactArtifactReference(supersedes, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_RESULT"]
    });
    if (supersedes.artifact_id === input.artifact_id) {
      throw new Error("Qualification result cannot supersede its own artifact identity.");
    }
    validateExactArtifactReference(correctionDecision, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
  }
  const payload = {
    artifact_kind: "DETERMINISTIC_QUALIFICATION_RESULT",
    schema_id: ARTIFACT_KIND_SCHEMA.DETERMINISTIC_QUALIFICATION_RESULT,
    schema_revision: 1,
    qualification_plan_ref: createExactArtifactReference(input.plan),
    behavior_manifest_ref: structuredClone(planPayload.behavior_manifest_ref),
    evaluation_manifest_ref: structuredClone(planPayload.evaluation_manifest_ref),
    executions: structuredClone(input.executions),
    comparisons: structuredClone(input.comparisons),
    result: input.result,
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    validation_result: input.validation_result,
    validation_attestation_ref: structuredClone(input.validation_attestation_ref),
    anchor_receipt_ref: structuredClone(input.anchor_receipt_ref),
    fresh_start_proof_refs: structuredClone(input.fresh_start_proof_refs),
    sealed_at: input.sealed_at,
    sealed_by: input.sealed_by,
    supersedes_result_ref: supersedes === null ? null : structuredClone(supersedes),
    correction_decision_ref: correctionDecision === null
      ? null
      : structuredClone(correctionDecision),
    evidence_class: "DETERMINISTIC_QUALIFICATION_ONLY_NOT_FORMAL_SUT_EVIDENCE"
  };
  const result = createCanonicalArtifact({
    artifact_id: input.artifact_id,
    artifact_kind: "DETERMINISTIC_QUALIFICATION_RESULT",
    identity_payload: payload
  });
  validateQualificationResult(result, {
    plan: input.plan,
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  });
  return result;
}

export function validateQualificationResult(
  result,
  { plan, behaviorManifest, evaluationManifest }
) {
  validateCanonicalArtifact(result, {
    allowedKinds: ["DETERMINISTIC_QUALIFICATION_RESULT"]
  });
  validateQualificationPlan(plan, { behaviorManifest, evaluationManifest });
  const payload = result.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind",
    "schema_id",
    "schema_revision",
    "qualification_plan_ref",
    "behavior_manifest_ref",
    "evaluation_manifest_ref",
    "executions",
    "comparisons",
    "result",
    "producer_identity",
    "validator_identity",
    "validation_result",
    "validation_attestation_ref",
    "anchor_receipt_ref",
    "fresh_start_proof_refs",
    "sealed_at",
    "sealed_by",
    "supersedes_result_ref",
    "correction_decision_ref",
    "evidence_class"
  ], [], "qualification result payload");
  resolveExactArtifactReference(payload.qualification_plan_ref, plan, {
    allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
  });
  resolveConfigurationManifestReference(payload.behavior_manifest_ref, behaviorManifest);
  resolveConfigurationManifestReference(payload.evaluation_manifest_ref, evaluationManifest);
  validateQualificationExecutions(payload.executions, plan.identity_payload.execution_slots);
  validateQualificationComparisons(
    payload.comparisons, plan.identity_payload.execution_slots, payload.executions
  );
  if (!QUALIFICATION_RESULTS.includes(payload.result)
    || deriveQualificationResult(payload.executions, payload.comparisons) !== payload.result) {
    throw new Error("Qualification result classification is inconsistent with its evidence.");
  }
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  if (payload.validation_result !== "VALIDATED"
    || payload.evidence_class !== "DETERMINISTIC_QUALIFICATION_ONLY_NOT_FORMAL_SUT_EVIDENCE") {
    throw new Error("Qualification result validation/evidence class is invalid.");
  }
  validateExactArtifactReference(payload.validation_attestation_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  validateExactArtifactReference(payload.anchor_receipt_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  validateEvidenceReferences(payload.fresh_start_proof_refs, "fresh_start_proof_refs");
  if (payload.fresh_start_proof_refs.length !== plan.identity_payload.execution_slots.length) {
    throw new Error("Qualification result requires exactly one fresh-start proof per execution.");
  }
  validateCreated(payload.sealed_at, payload.sealed_by);
  if (payload.sealed_by !== payload.validator_identity) {
    throw new Error("Qualification result must be sealed by its distinct validator.");
  }
  if (payload.supersedes_result_ref !== null) {
    validateExactArtifactReference(payload.supersedes_result_ref, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_RESULT"]
    });
    if (payload.supersedes_result_ref.artifact_id === result.artifact_id) {
      throw new Error("Qualification result cannot supersede itself.");
    }
    validateExactArtifactReference(payload.correction_decision_ref, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
  } else if (payload.correction_decision_ref !== null) {
    throw new Error("Qualification correction decision has no superseded result.");
  }
  return result;
}

export function createCampaignAuthorization(input) {
  assertExactKeys(input, [
    "artifact_id",
    "campaign_id",
    "authority_namespace_id",
    "behavior_manifest",
    "evaluation_manifest",
    "qualification_plan",
    "qualification_result",
    "attempt_slots",
    "contingency_mode",
    "contingency_slots",
    "campaign_authority_identity",
    "producer_identity",
    "custody_plan",
    "anchor_requirement",
    "authorized_at",
    "authorized_by"
  ], [], "campaign authorization input");
  validateBehaviorConfigurationManifest(input.behavior_manifest);
  validateEvaluationConfigurationManifest(input.evaluation_manifest);
  const runCount = validateQualificationBasis(input);
  validateAttemptSlots(input.attempt_slots, runCount.count, "PRIMARY");
  validateContingency(input.contingency_mode, input.contingency_slots, runCount.count);
  validateCrossSlotUniqueness(input.attempt_slots, input.contingency_slots);
  validateDistinctActors(input.producer_identity, input.campaign_authority_identity);
  validateCustodyPlan(input.custody_plan);
  validateAnchorRequirement(input.anchor_requirement);
  validateCreated(input.authorized_at, input.authorized_by);
  if (input.authorized_by !== input.campaign_authority_identity) {
    throw new Error("Campaign authorization must be made by the declared project owner.");
  }
  const evaluation = input.evaluation_manifest.identity_payload;
  const payload = {
    artifact_kind: "CAMPAIGN_AUTHORIZATION",
    schema_id: ARTIFACT_KIND_SCHEMA.CAMPAIGN_AUTHORIZATION,
    schema_revision: 1,
    campaign_id: input.campaign_id,
    authority_namespace_id: input.authority_namespace_id,
    behavior_manifest_ref: createConfigurationManifestReference(input.behavior_manifest),
    evaluation_manifest_ref: createConfigurationManifestReference(input.evaluation_manifest),
    scenario_id: "SCN-001-SELECTED-SLICE",
    fixture_oracle_package: evaluation.fixture_oracle.package_id,
    required_paths: [...evaluation.fixture_oracle.required_paths],
    claim_classes: [...evaluation.fixture_oracle.claim_classes],
    claim_obligation_map_digest: evaluation.fixture_oracle.claim_obligation_map_digest,
    run_count_branch: runCount.branch,
    planned_valid_runs_per_path: runCount.count,
    qualification_plan_ref: input.qualification_plan === null
      ? null
      : createExactArtifactReference(input.qualification_plan),
    qualification_result_ref: input.qualification_result === null
      ? null
      : createExactArtifactReference(input.qualification_result),
    nondeterministic_policy_declaration: runCount.branch === "NONDETERMINISTIC_THREE",
    attempt_slots: structuredClone(input.attempt_slots),
    contingency_mode: input.contingency_mode,
    contingency_slots: structuredClone(input.contingency_slots),
    selection_policy: structuredClone(evaluation.selection_policy),
    known_exploratory_material_disposition: "EXCLUDED_NO_REUSE_OR_CANDIDATE_SELECTION",
    invalidity_replacement_policy: {
      replacement_limit_per_path: 2,
      repeated_root_cause_stop_count: 2,
      campaign_invalid_attempt_suspend_count: 3,
      valid_hard_failure_replaceable: false
    },
    custody_plan: structuredClone(input.custody_plan),
    campaign_authority_role: "PROJECT_OWNER",
    campaign_authority_identity: input.campaign_authority_identity,
    producer_identity: input.producer_identity,
    authorization_result: "AUTHORIZED",
    anchor_requirement: structuredClone(input.anchor_requirement),
    authorized_at: input.authorized_at,
    authorized_by: input.authorized_by,
    lifecycle: "authorized"
  };
  const authorization = createCanonicalArtifact({
    artifact_id: input.artifact_id,
    artifact_kind: "CAMPAIGN_AUTHORIZATION",
    identity_payload: payload
  });
  validateCampaignAuthorization(authorization, input);
  return authorization;
}

export function validateCampaignAuthorization(authorization, context) {
  validateCanonicalArtifact(authorization, { allowedKinds: ["CAMPAIGN_AUTHORIZATION"] });
  validateBehaviorConfigurationManifest(context.behavior_manifest);
  validateEvaluationConfigurationManifest(context.evaluation_manifest);
  const payload = authorization.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "campaign_id",
    "authority_namespace_id", "behavior_manifest_ref", "evaluation_manifest_ref",
    "scenario_id", "fixture_oracle_package", "required_paths", "claim_classes",
    "claim_obligation_map_digest", "run_count_branch", "planned_valid_runs_per_path",
    "qualification_plan_ref", "qualification_result_ref",
    "nondeterministic_policy_declaration", "attempt_slots", "contingency_mode",
    "contingency_slots", "selection_policy", "known_exploratory_material_disposition",
    "invalidity_replacement_policy", "custody_plan", "campaign_authority_role",
    "campaign_authority_identity", "producer_identity", "authorization_result",
    "anchor_requirement", "authorized_at", "authorized_by", "lifecycle"
  ], [], "campaign authorization payload");
  assertOpaqueId(payload.campaign_id, "campaign_id");
  assertOpaqueId(payload.authority_namespace_id, "authority_namespace_id");
  resolveConfigurationManifestReference(payload.behavior_manifest_ref, context.behavior_manifest);
  resolveConfigurationManifestReference(payload.evaluation_manifest_ref, context.evaluation_manifest);
  const evaluation = context.evaluation_manifest.identity_payload;
  if (payload.scenario_id !== "SCN-001-SELECTED-SLICE"
    || payload.fixture_oracle_package !== evaluation.fixture_oracle.package_id
    || payload.claim_obligation_map_digest !== evaluation.fixture_oracle.claim_obligation_map_digest) {
    throw new Error("Campaign authorization conflicts with evaluation authority fields.");
  }
  validateExactSet(payload.required_paths, evaluation.fixture_oracle.required_paths, "campaign paths");
  validateExactSet(payload.claim_classes, evaluation.fixture_oracle.claim_classes, "campaign claims");
  const runCount = validateQualificationBasis({
    ...context,
    qualification_plan: context.qualification_plan,
    qualification_result: context.qualification_result
  });
  if (payload.run_count_branch !== runCount.branch
    || payload.planned_valid_runs_per_path !== runCount.count
    || payload.nondeterministic_policy_declaration !== (runCount.branch === "NONDETERMINISTIC_THREE")) {
    throw new Error("Campaign run-count branch is not mechanically derived.");
  }
  validateNullableResolution(
    payload.qualification_plan_ref,
    context.qualification_plan,
    "DETERMINISTIC_QUALIFICATION_PLAN"
  );
  validateNullableResolution(
    payload.qualification_result_ref,
    context.qualification_result,
    "DETERMINISTIC_QUALIFICATION_RESULT"
  );
  validateAttemptSlots(payload.attempt_slots, runCount.count, "PRIMARY");
  validateContingency(payload.contingency_mode, payload.contingency_slots, runCount.count);
  validateCrossSlotUniqueness(payload.attempt_slots, payload.contingency_slots);
  if (canonicalizeJson(payload.selection_policy) !== canonicalizeJson(evaluation.selection_policy)
    || payload.known_exploratory_material_disposition
      !== "EXCLUDED_NO_REUSE_OR_CANDIDATE_SELECTION") {
    throw new Error("Campaign selection authority conflicts with the evaluation manifest.");
  }
  assertExactKeys(payload.invalidity_replacement_policy, [
    "replacement_limit_per_path", "repeated_root_cause_stop_count",
    "campaign_invalid_attempt_suspend_count", "valid_hard_failure_replaceable"
  ], [], "campaign invalidity policy");
  if (payload.invalidity_replacement_policy.replacement_limit_per_path !== 2
    || payload.invalidity_replacement_policy.repeated_root_cause_stop_count !== 2
    || payload.invalidity_replacement_policy.campaign_invalid_attempt_suspend_count !== 3
    || payload.invalidity_replacement_policy.valid_hard_failure_replaceable !== false) {
    throw new Error("Campaign invalidity/replacement policy is invalid.");
  }
  validateCustodyPlan(payload.custody_plan);
  validateDistinctActors(payload.producer_identity, payload.campaign_authority_identity);
  if (payload.campaign_authority_role !== "PROJECT_OWNER"
    || payload.authorization_result !== "AUTHORIZED"
    || payload.authorized_by !== payload.campaign_authority_identity
    || payload.lifecycle !== "authorized") {
    throw new Error("Campaign authorization actor/result/lifecycle is invalid.");
  }
  validateAnchorRequirement(payload.anchor_requirement);
  validateCreated(payload.authorized_at, payload.authorized_by);
  return authorization;
}

export function validateProspectiveExecutionStartPrerequisites(input) {
  assertExactKeys(input, [
    "authorization",
    "slot_id",
    "authorizing_namespace_ref",
    "anchor_receipt_ref",
    "anchor_verification",
    "fresh_start_proof"
  ], [], "prospective execution start");
  validateCanonicalArtifact(input.authorization, { allowedKinds: ["CAMPAIGN_AUTHORIZATION"] });
  const authorization = input.authorization.identity_payload;
  const slot = [...authorization.attempt_slots, ...authorization.contingency_slots]
    .find((candidate) => candidate.slot_id === input.slot_id);
  if (!slot) throw new Error("Attempt slot was not prospectively authorized.");
  validateExactArtifactReference(input.authorizing_namespace_ref, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  validateExactArtifactReference(input.anchor_receipt_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  validateAnchorVerification(
    input.anchor_verification,
    input.authorization,
    input.authorizing_namespace_ref,
    input.anchor_receipt_ref
  );
  validateFreshStartProof(
    input.fresh_start_proof,
    authorization.anchor_requirement,
    input.anchor_verification,
    input.slot_id
  );
  return deepFreeze({
    authorization_ref: createExactArtifactReference(input.authorization),
    slot: structuredClone(slot),
    authorizing_namespace_ref: structuredClone(input.authorizing_namespace_ref),
    anchor_receipt_ref: structuredClone(input.anchor_receipt_ref),
    anchor_verification: structuredClone(input.anchor_verification),
    fresh_start_proof: structuredClone(input.fresh_start_proof),
    lifecycle: "authorized",
    authority_status: "READY_FOR_DURABLE_AUTHORITY_RESOLUTION",
    execution_start_authorized: false
  });
}

export function createInitialRunInvalidityDecision(input) {
  assertExactKeys(input, [
    "artifact_id",
    "campaign_authorization",
    "run_record_ref",
    "attempt_allocation",
    "attempt_id",
    "path_id",
    "reason_code",
    "basis_evidence_refs",
    "evaluator_identity",
    "validator_identity",
    "validator_result",
    "replacement_eligible",
    "campaign_consequence",
    "decided_at",
    "decided_by"
  ], [], "initial run-invalidity input");
  validateCanonicalArtifact(input.campaign_authorization, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  validateExactArtifactReference(input.run_record_ref, { allowedKinds: ["FORMAL_RUN_RECORD"] });
  validateAttemptAllocation(input.attempt_allocation, input.campaign_authorization);
  assertOpaqueId(input.attempt_id, "run-invalidity attempt_id");
  if (input.attempt_allocation.attempt_id !== input.attempt_id
    || input.attempt_allocation.path_id !== input.path_id) {
    throw new Error("Run invalidity does not bind its exact attempt allocation.");
  }
  if (!REQUIRED_PATHS.includes(input.path_id)
    || !RUN_INVALIDITY_REASON_CODES.includes(input.reason_code)) {
    throw new Error("Run-invalidity path or pre-registered reason code is invalid.");
  }
  validateEvidenceReferences(input.basis_evidence_refs, "run-invalidity basis_evidence_refs");
  if (input.basis_evidence_refs.length === 0) {
    throw new Error("Run invalidity requires exact integrity evidence.");
  }
  validateDistinctActors(input.evaluator_identity, input.validator_identity);
  if (input.validator_result !== "CONFIRMED"
    || !["CONTINUE_WITH_REPLACEMENT", "SUSPEND_FOR_REVIEW", "CLOSE_CAMPAIGN"].includes(
      input.campaign_consequence
    )
    || input.decided_by !== input.validator_identity) {
    throw new Error("Initial run-invalidity validation or consequence is invalid.");
  }
  if ((input.replacement_eligible === true)
    !== (input.campaign_consequence === "CONTINUE_WITH_REPLACEMENT")) {
    throw new Error("Replacement eligibility conflicts with campaign consequence.");
  }
  validateCreated(input.decided_at, input.decided_by);
  const payload = {
    artifact_kind: "EVALUATION_DECISION",
    schema_id: ARTIFACT_KIND_SCHEMA.EVALUATION_DECISION,
    schema_revision: 1,
    decision_kind: "RUN_INVALIDITY",
    campaign_authorization_ref: createExactArtifactReference(input.campaign_authorization),
    run_record_ref: structuredClone(input.run_record_ref),
    attempt_allocation: structuredClone(input.attempt_allocation),
    attempt_id: input.attempt_id,
    path_id: input.path_id,
    run_validity: "INVALID_UNSCORABLE",
    reason_code: input.reason_code,
    basis_evidence_refs: structuredClone(input.basis_evidence_refs),
    evaluator_identity: input.evaluator_identity,
    validator_identity: input.validator_identity,
    validator_result: input.validator_result,
    replacement_eligible: input.replacement_eligible,
    replacement_record_ref: null,
    campaign_consequence: input.campaign_consequence,
    decision_stage: "INITIAL_VALIDATOR_CONFIRMED",
    decided_at: input.decided_at,
    decided_by: input.decided_by
  };
  const decision = createCanonicalArtifact({
    artifact_id: input.artifact_id,
    artifact_kind: "EVALUATION_DECISION",
    identity_payload: payload
  });
  validateInitialRunInvalidityDecision(decision, input.campaign_authorization);
  return decision;
}

export function validateInitialRunInvalidityDecision(decision, authorization) {
  validateCanonicalArtifact(decision, { allowedKinds: ["EVALUATION_DECISION"] });
  validateCanonicalArtifact(authorization, { allowedKinds: ["CAMPAIGN_AUTHORIZATION"] });
  const payload = decision.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "decision_kind",
    "campaign_authorization_ref", "run_record_ref", "attempt_id", "path_id",
    "attempt_allocation",
    "run_validity", "reason_code", "basis_evidence_refs", "evaluator_identity",
    "validator_identity", "validator_result", "replacement_eligible",
    "replacement_record_ref", "campaign_consequence", "decision_stage",
    "decided_at", "decided_by"
  ], [], "initial run-invalidity payload");
  if (payload.decision_kind !== "RUN_INVALIDITY") {
    throw new Error("Expected an initial RUN_INVALIDITY decision.");
  }
  resolveExactArtifactReference(payload.campaign_authorization_ref, authorization, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  validateExactArtifactReference(payload.run_record_ref, { allowedKinds: ["FORMAL_RUN_RECORD"] });
  validateAttemptAllocation(payload.attempt_allocation, authorization);
  assertOpaqueId(payload.attempt_id, "run-invalidity attempt_id");
  if (payload.attempt_allocation.attempt_id !== payload.attempt_id
    || payload.attempt_allocation.path_id !== payload.path_id) {
    throw new Error("Run invalidity does not bind its exact attempt allocation.");
  }
  if (!REQUIRED_PATHS.includes(payload.path_id)
    || payload.run_validity !== "INVALID_UNSCORABLE"
    || !RUN_INVALIDITY_REASON_CODES.includes(payload.reason_code)) {
    throw new Error("Initial run-invalidity classification is invalid.");
  }
  validateEvidenceReferences(payload.basis_evidence_refs, "run-invalidity basis_evidence_refs");
  if (payload.basis_evidence_refs.length === 0) throw new Error("Run invalidity lacks evidence.");
  validateDistinctActors(payload.evaluator_identity, payload.validator_identity);
  if (payload.validator_result !== "CONFIRMED" || payload.replacement_record_ref !== null
    || payload.decision_stage !== "INITIAL_VALIDATOR_CONFIRMED"
    || payload.decided_by !== payload.validator_identity
    || (payload.replacement_eligible === true)
      !== (payload.campaign_consequence === "CONTINUE_WITH_REPLACEMENT")) {
    throw new Error("Initial run-invalidity authority closure is invalid.");
  }
  validateCreated(payload.decided_at, payload.decided_by);
  return decision;
}

export function allocateReplacementAttempt(input) {
  assertExactKeys(input, [
    "authorization", "invalidity_decisions", "target_decision"
  ], [], "replacement allocation input");
  validateCanonicalArtifact(input.authorization, { allowedKinds: ["CAMPAIGN_AUTHORIZATION"] });
  if (!Array.isArray(input.invalidity_decisions) || input.invalidity_decisions.length === 0) {
    throw new Error("Replacement allocation requires complete invalidity history.");
  }
  for (const decision of input.invalidity_decisions) {
    validateInitialRunInvalidityDecision(decision, input.authorization);
  }
  validateInitialRunInvalidityDecision(input.target_decision, input.authorization);
  const targetRef = createExactArtifactReference(input.target_decision);
  const exactTargetOccurrences = input.invalidity_decisions.filter((decision) => (
    canonicalizeJson(createExactArtifactReference(decision)) === canonicalizeJson(targetRef)
  ));
  if (exactTargetOccurrences.length !== 1
    || input.target_decision.identity_payload.replacement_eligible !== true) {
    throw new Error("Replacement target must be one exact eligible retained invalidity decision.");
  }
  const target = input.target_decision.identity_payload;
  const pathHistory = input.invalidity_decisions.filter(
    (decision) => decision.identity_payload.path_id === target.path_id
  );
  const sameRootCause = pathHistory.filter(
    (decision) => decision.identity_payload.reason_code === target.reason_code
  );
  if (pathHistory.length > 2 || sameRootCause.length >= 2
    || input.invalidity_decisions.length >= 3) {
    throw new Error("Replacement allocation is blocked by the accepted stop/review limits.");
  }
  const ordinal = pathHistory.length;
  const basis = {
    campaign_authorization_ref: createExactArtifactReference(input.authorization),
    invalidity_decision_ref: targetRef,
    predecessor_run_ref: structuredClone(target.run_record_ref),
    path_id: target.path_id,
    replacement_ordinal: ordinal
  };
  return deepFreeze({
    ...basis,
    allocation_kind: "INVALIDITY_DERIVED_REPLACEMENT",
    slot_id: `${input.authorization.identity_payload.campaign_id}:replacement-slot:${target.path_id}:${ordinal}`,
    attempt_id: `${input.authorization.identity_payload.campaign_id}:replacement-attempt:${target.path_id}:${ordinal}`,
    selection_basis_digest: fingerprintCanonicalJson(
      "zoey:replacement-allocation-basis:v1", basis
    ),
    seed_commitment: fingerprintCanonicalJson(
      "zoey:replacement-seed-commitment:v1", basis
    ),
    lifecycle: "authorized",
    outcome_independent: true
  });
}

export function createMaterialAuthorityDecision(input) {
  assertExactKeys(input, [
    "artifact_id", "decision_kind", "subject_ref", "prior_decision_ref",
    "reason_code", "original_disposition", "replacement_disposition",
    "basis_delta_digest", "basis_evidence_refs", "proposed_by",
    "independent_reviewer", "review_attestation_ref", "owner_identity",
    "owner_decision", "affected_claims", "effective_at", "effective_by"
  ], [], "material authority decision input");
  if (!MATERIAL_AUTHORITY_DECISIONS.includes(input.decision_kind)) {
    throw new Error("Decision kind is not a material authority decision handled by Phase 7B.");
  }
  validateExactArtifactReference(input.subject_ref);
  validateMaterialDecisionSubject(input.decision_kind, input.subject_ref);
  if (input.prior_decision_ref !== null) {
    validateExactArtifactReference(input.prior_decision_ref, { allowedKinds: ["EVALUATION_DECISION"] });
  }
  assertOpaqueId(input.reason_code, "material authority reason_code");
  assertNonemptyString(input.original_disposition, "material authority original_disposition");
  assertNonemptyString(input.replacement_disposition, "material authority replacement_disposition");
  assertSha256(input.basis_delta_digest, "material authority basis_delta_digest");
  validateEvidenceReferences(input.basis_evidence_refs, "material authority basis_evidence_refs");
  if (input.basis_evidence_refs.length === 0) throw new Error("Material authority decision requires evidence.");
  validateExactArtifactReference(input.review_attestation_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  for (const actor of [input.proposed_by, input.independent_reviewer, input.owner_identity]) {
    assertOpaqueId(actor, "material authority actor");
  }
  if (new Set([
    input.proposed_by, input.independent_reviewer, input.owner_identity
  ]).size !== 3 || input.owner_decision !== "ACCEPTED"
    || input.effective_by !== input.owner_identity) {
    throw new Error("Material authority decision requires independent review and owner acceptance.");
  }
  assertSortedUniqueStrings(input.affected_claims, "material authority affected_claims");
  if (input.affected_claims.some((claim) => !REQUIRED_CLAIM_CLASSES.includes(claim))) {
    throw new Error("Material authority decision names an unknown claim class.");
  }
  validateCreated(input.effective_at, input.effective_by);
  const payload = {
    artifact_kind: "EVALUATION_DECISION",
    schema_id: ARTIFACT_KIND_SCHEMA.EVALUATION_DECISION,
    schema_revision: 1,
    decision_kind: input.decision_kind,
    subject_ref: structuredClone(input.subject_ref),
    prior_decision_ref: input.prior_decision_ref === null
      ? null
      : structuredClone(input.prior_decision_ref),
    reason_code: input.reason_code,
    original_disposition: input.original_disposition,
    replacement_disposition: input.replacement_disposition,
    basis_delta_digest: input.basis_delta_digest,
    basis_evidence_refs: structuredClone(input.basis_evidence_refs),
    proposed_by: input.proposed_by,
    independent_reviewer: input.independent_reviewer,
    review_attestation_ref: structuredClone(input.review_attestation_ref),
    owner_identity: input.owner_identity,
    owner_decision: input.owner_decision,
    affected_claims: structuredClone(input.affected_claims),
    effective_at: input.effective_at,
    effective_by: input.effective_by
  };
  const decision = createCanonicalArtifact({
    artifact_id: input.artifact_id,
    artifact_kind: "EVALUATION_DECISION",
    identity_payload: payload
  });
  validateMaterialAuthorityDecision(decision);
  return decision;
}

export function validateMaterialAuthorityDecision(decision) {
  validateCanonicalArtifact(decision, { allowedKinds: ["EVALUATION_DECISION"] });
  const payload = decision.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "decision_kind",
    "subject_ref", "prior_decision_ref", "reason_code", "original_disposition",
    "replacement_disposition", "basis_delta_digest", "basis_evidence_refs",
    "proposed_by", "independent_reviewer", "review_attestation_ref",
    "owner_identity", "owner_decision", "affected_claims", "effective_at",
    "effective_by"
  ], [], "material authority decision payload");
  if (!MATERIAL_AUTHORITY_DECISIONS.includes(payload.decision_kind)) {
    throw new Error("Material authority decision kind is invalid.");
  }
  validateExactArtifactReference(payload.subject_ref);
  validateMaterialDecisionSubject(payload.decision_kind, payload.subject_ref);
  if (payload.prior_decision_ref !== null) {
    validateExactArtifactReference(payload.prior_decision_ref, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
  }
  assertOpaqueId(payload.reason_code, "material authority reason_code");
  assertNonemptyString(payload.original_disposition, "material authority original_disposition");
  assertNonemptyString(payload.replacement_disposition, "material authority replacement_disposition");
  assertSha256(payload.basis_delta_digest, "material authority basis_delta_digest");
  validateEvidenceReferences(payload.basis_evidence_refs, "material authority basis_evidence_refs");
  if (payload.basis_evidence_refs.length === 0) throw new Error("Material authority decision lacks evidence.");
  validateExactArtifactReference(payload.review_attestation_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  for (const actor of [payload.proposed_by, payload.independent_reviewer, payload.owner_identity]) {
    assertOpaqueId(actor, "material authority actor");
  }
  if (new Set([
    payload.proposed_by, payload.independent_reviewer, payload.owner_identity
  ]).size !== 3 || payload.owner_decision !== "ACCEPTED"
    || payload.effective_by !== payload.owner_identity) {
    throw new Error("Material authority decision lacks independent review or owner acceptance.");
  }
  assertSortedUniqueStrings(payload.affected_claims, "material authority affected_claims");
  if (payload.affected_claims.some((claim) => !REQUIRED_CLAIM_CLASSES.includes(claim))) {
    throw new Error("Material authority decision names an unknown claim class.");
  }
  validateCreated(payload.effective_at, payload.effective_by);
  return decision;
}

function validateQualificationBasis(input) {
  const evaluation = input.evaluation_manifest.identity_payload;
  if (evaluation.deterministic_replay.mode === "EXPLICITLY_NONDETERMINISTIC") {
    if (input.qualification_plan !== null || input.qualification_result !== null) {
      throw new Error("Nondeterministic policy cannot consume qualification artifacts.");
    }
    return { branch: "NONDETERMINISTIC_THREE", count: 3 };
  }
  if (input.qualification_plan === null || input.qualification_result === null) {
    throw new Error("Qualification-supported policy requires exact plan and result artifacts.");
  }
  validateQualificationResult(input.qualification_result, {
    plan: input.qualification_plan,
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  });
  const result = input.qualification_result.identity_payload.result;
  return result === "QUALIFIED"
    ? { branch: "QUALIFIED_ONE", count: 1 }
    : { branch: "CONSERVATIVE_THREE", count: 3 };
}

function validateQualificationSlots(slots) {
  if (!Array.isArray(slots)) throw new Error("Qualification execution slots must be an array.");
  const ids = [];
  for (const path of REQUIRED_PATHS) {
    const pathSlots = slots.filter((slot) => slot.path_id === path);
    if (pathSlots.length < 2) throw new Error("Every qualification path requires at least two slots.");
    pathSlots.forEach((slot, index) => {
      validateQualificationSlot(slot);
      if (slot.ordinal !== index + 1) throw new Error("Qualification slot ordinals must be contiguous.");
    });
  }
  if (slots.some((slot) => !REQUIRED_PATHS.includes(slot.path_id))) {
    throw new Error("Qualification plan contains an undeclared path.");
  }
  for (const slot of slots) ids.push(slot.execution_id);
  assertSortedUniqueStrings(ids, "qualification execution IDs", { allowEmpty: false });
}

function validateQualificationSlot(slot) {
  assertExactKeys(slot, [
    "execution_id", "path_id", "ordinal", "selection_basis_digest"
  ], [], "qualification execution slot");
  assertOpaqueId(slot.execution_id, "qualification execution_id");
  if (!REQUIRED_PATHS.includes(slot.path_id) || !Number.isSafeInteger(slot.ordinal)
    || slot.ordinal < 1) throw new Error("Qualification execution slot identity is invalid.");
  assertSha256(slot.selection_basis_digest, "qualification selection_basis_digest");
}

function validateAllocationPolicy(value) {
  assertExactKeys(value, [
    "method_id", "method_revision", "method_digest", "outcome_independent",
    "invalid_missing_divergent_disposition"
  ], [], "qualification allocation policy");
  assertOpaqueId(value.method_id, "qualification allocation method_id");
  assertNonemptyString(value.method_revision, "qualification allocation method_revision");
  assertSha256(value.method_digest, "qualification allocation method_digest");
  if (value.outcome_independent !== true
    || value.invalid_missing_divergent_disposition !== "RETAIN_NO_RETRY_INTO_QUALIFICATION") {
    throw new Error("Qualification allocation must be outcome-independent and non-retryable.");
  }
}

function deterministicEquivalenceFrom(evaluationManifest) {
  const source = evaluationManifest.identity_payload.deterministic_replay;
  return {
    profile_id: source.profile_id,
    profile_revision: source.profile_revision,
    comparator_fingerprint: source.comparator_fingerprint,
    normalization_rules_digest: source.normalization_rules_digest,
    exclusion_rules_digest: source.exclusion_rules_digest
  };
}

function validateDeterministicEquivalence(value, evaluationManifest) {
  assertExactKeys(value, [
    "profile_id", "profile_revision", "comparator_fingerprint",
    "normalization_rules_digest", "exclusion_rules_digest"
  ], [], "deterministic equivalence policy");
  if (canonicalizeJson(value) !== canonicalizeJson(deterministicEquivalenceFrom(evaluationManifest))) {
    throw new Error("Qualification equivalence policy conflicts with the evaluation manifest.");
  }
}

function validateQualificationExecutions(executions, slots) {
  if (!Array.isArray(executions) || executions.length !== slots.length) {
    throw new Error("Qualification result must retain every planned execution exactly once.");
  }
  const byId = new Map(slots.map((slot) => [slot.execution_id, slot]));
  const ids = [];
  const evidenceIdentities = [];
  for (const execution of executions) {
    assertExactKeys(execution, [
      "execution_id", "path_id", "status", "capture_refs",
      "oracle_projection_digest", "comparator_input_digest"
    ], [], "qualification execution result");
    const slot = byId.get(execution.execution_id);
    if (!slot || execution.path_id !== slot.path_id) {
      throw new Error("Qualification execution does not resolve to its planned slot.");
    }
    if (!["COMPLETED", "INVALID", "MISSING"].includes(execution.status)) {
      throw new Error("Qualification execution status is invalid.");
    }
    if (execution.status === "MISSING") {
      if (execution.capture_refs.length !== 0 || execution.oracle_projection_digest !== null
        || execution.comparator_input_digest !== null) {
        throw new Error("Missing qualification execution cannot fabricate evidence.");
      }
    } else {
      validateEvidenceReferences(execution.capture_refs, "qualification capture_refs");
      if (execution.capture_refs.length === 0) throw new Error("Observed qualification execution requires capture.");
      assertSha256(execution.oracle_projection_digest, "qualification oracle_projection_digest");
      assertSha256(execution.comparator_input_digest, "qualification comparator_input_digest");
    }
    for (const reference of execution.capture_refs) {
      evidenceIdentities.push(`${reference.artifact_id}:${reference.content_fingerprint}`);
    }
    ids.push(execution.execution_id);
  }
  assertSortedUniqueStrings(ids, "qualification result execution IDs", { allowEmpty: false });
  if (new Set(evidenceIdentities).size !== evidenceIdentities.length) {
    throw new Error("Qualification captures cannot be reused across executions.");
  }
}

function validateQualificationComparisons(comparisons, slots, executions) {
  if (!Array.isArray(comparisons)) throw new Error("Qualification comparisons must be an array.");
  const executionById = new Map(executions.map((execution) => [execution.execution_id, execution]));
  const expectedPairs = [];
  for (const path of REQUIRED_PATHS) {
    const ids = slots.filter((slot) => slot.path_id === path).map((slot) => slot.execution_id);
    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) {
        expectedPairs.push(`${ids[left]}::${ids[right]}`);
      }
    }
  }
  const actualPairs = [];
  for (const comparison of comparisons) {
    assertExactKeys(comparison, [
      "left_execution_id", "right_execution_id", "equivalent",
      "mismatch_class", "details_digest"
    ], [], "qualification comparison");
    const left = executionById.get(comparison.left_execution_id);
    const right = executionById.get(comparison.right_execution_id);
    if (!left || !right || left.path_id !== right.path_id
      || comparison.left_execution_id >= comparison.right_execution_id) {
      throw new Error("Qualification comparison pair is invalid or unordered.");
    }
    if (left.status !== "COMPLETED" || right.status !== "COMPLETED") {
      if (comparison.equivalent !== null || comparison.mismatch_class !== "COMPARATOR_ERROR") {
        throw new Error("Incomplete execution pair must close as comparator error.");
      }
    } else if (comparison.equivalent === true) {
      if (comparison.mismatch_class !== null || comparison.details_digest !== null) {
        throw new Error("Equivalent comparison cannot carry mismatch details.");
      }
    } else if (comparison.equivalent === false) {
      if (!MISMATCH_CLASSES.includes(comparison.mismatch_class)
        || comparison.mismatch_class === "COMPARATOR_ERROR") {
        throw new Error("Divergent comparison requires an exact mismatch class.");
      }
      assertSha256(comparison.details_digest, "qualification mismatch details_digest");
    } else {
      throw new Error("Completed comparison must declare equivalent true or false.");
    }
    if (comparison.mismatch_class === "COMPARATOR_ERROR") {
      assertSha256(comparison.details_digest, "qualification comparator error details_digest");
    }
    actualPairs.push(`${comparison.left_execution_id}::${comparison.right_execution_id}`);
  }
  if (canonicalizeJson(actualPairs) !== canonicalizeJson(expectedPairs)) {
    throw new Error("Qualification comparisons do not close every planned pair exactly once.");
  }
}

function deriveQualificationResult(executions, comparisons) {
  if (executions.some((execution) => execution.status !== "COMPLETED")
    || comparisons.some((comparison) => comparison.mismatch_class === "COMPARATOR_ERROR")) {
    return "INCONCLUSIVE";
  }
  return comparisons.every((comparison) => comparison.equivalent === true)
    ? "QUALIFIED"
    : "NOT_QUALIFIED";
}

function validateAttemptSlots(slots, expectedCount, slotKind) {
  if (!Array.isArray(slots)) throw new Error("Campaign attempt slots must be an array.");
  const ids = [];
  for (const path of REQUIRED_PATHS) {
    const pathSlots = slots.filter((slot) => slot.path_id === path);
    if (pathSlots.length !== expectedCount) {
      throw new Error(`Each campaign path requires exactly ${expectedCount} ${slotKind} slots.`);
    }
    pathSlots.forEach((slot, index) => {
      assertExactKeys(slot, [
        "slot_id", "attempt_id", "path_id", "ordinal", "slot_kind",
        "selection_basis_digest", "seed_commitment"
      ], [], "campaign attempt slot");
      assertOpaqueId(slot.slot_id, "campaign slot_id");
      assertOpaqueId(slot.attempt_id, "campaign attempt_id");
      if (slot.path_id !== path || slot.ordinal !== index + 1 || slot.slot_kind !== slotKind) {
        throw new Error("Campaign attempt slot ordering or kind is invalid.");
      }
      assertSha256(slot.selection_basis_digest, "campaign selection_basis_digest");
      assertSha256(slot.seed_commitment, "campaign seed_commitment");
      ids.push(slot.slot_id, slot.attempt_id);
    });
  }
  if (slots.some((slot) => !REQUIRED_PATHS.includes(slot.path_id))) {
    throw new Error("Campaign contains an undeclared attempt path.");
  }
  if (new Set(ids).size !== ids.length) throw new Error("Campaign slot/attempt identities must be unique.");
}

function validateContingency(mode, slots, runCount) {
  if (runCount !== 1) {
    if (mode !== "NOT_APPLICABLE" || !Array.isArray(slots) || slots.length !== 0) {
      throw new Error("Three-run campaigns cannot add deterministic divergence contingency slots.");
    }
    return;
  }
  if (mode === "MANDATORY_CAMPAIGN_SUPERSESSION") {
    if (!Array.isArray(slots) || slots.length !== 0) {
      throw new Error("Supersession contingency cannot preallocate slots.");
    }
    return;
  }
  if (mode !== "PREALLOCATED_TO_THREE") {
    throw new Error("One-run campaign must preallocate divergence slots or require supersession.");
  }
  validateAttemptSlots(slots, 2, "CONTINGENCY");
}

function validateCrossSlotUniqueness(primarySlots, contingencySlots) {
  const identities = [...primarySlots, ...contingencySlots].flatMap(
    (slot) => [slot.slot_id, slot.attempt_id]
  );
  if (new Set(identities).size !== identities.length) {
    throw new Error("Primary and contingency slot/attempt identities must be globally unique.");
  }
}

export function validateAttemptAllocation(allocation, authorization) {
  assertPlainObject(allocation, "attempt allocation");
  if (allocation.allocation_kind === "PROSPECTIVE_SLOT") {
    assertExactKeys(allocation, [
      "allocation_kind", "authorization_ref", "slot_id", "attempt_id", "path_id",
      "selection_basis_digest", "lifecycle", "outcome_independent"
    ], [], "prospective attempt allocation");
    resolveExactArtifactReference(allocation.authorization_ref, authorization, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
    const slot = [
      ...authorization.identity_payload.attempt_slots,
      ...authorization.identity_payload.contingency_slots
    ].find((candidate) => candidate.slot_id === allocation.slot_id);
    if (!slot || slot.attempt_id !== allocation.attempt_id || slot.path_id !== allocation.path_id
      || slot.selection_basis_digest !== allocation.selection_basis_digest) {
      throw new Error("Prospective attempt allocation does not resolve to an authorized slot.");
    }
  } else if (allocation.allocation_kind === "INVALIDITY_DERIVED_REPLACEMENT") {
    assertExactKeys(allocation, [
      "campaign_authorization_ref", "invalidity_decision_ref", "predecessor_run_ref",
      "path_id", "replacement_ordinal", "allocation_kind", "slot_id", "attempt_id",
      "selection_basis_digest", "seed_commitment", "lifecycle", "outcome_independent"
    ], [], "replacement attempt allocation");
    resolveExactArtifactReference(allocation.campaign_authorization_ref, authorization, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
    validateExactArtifactReference(allocation.invalidity_decision_ref, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
    validateExactArtifactReference(allocation.predecessor_run_ref, {
      allowedKinds: ["FORMAL_RUN_RECORD"]
    });
    if (!REQUIRED_PATHS.includes(allocation.path_id)
      || !Number.isSafeInteger(allocation.replacement_ordinal)
      || allocation.replacement_ordinal < 1) {
      throw new Error("Replacement allocation path or ordinal is invalid.");
    }
    const basis = {
      campaign_authorization_ref: allocation.campaign_authorization_ref,
      invalidity_decision_ref: allocation.invalidity_decision_ref,
      predecessor_run_ref: allocation.predecessor_run_ref,
      path_id: allocation.path_id,
      replacement_ordinal: allocation.replacement_ordinal
    };
    const campaignId = authorization.identity_payload.campaign_id;
    if (allocation.slot_id !== `${campaignId}:replacement-slot:${allocation.path_id}:${allocation.replacement_ordinal}`
      || allocation.attempt_id !== `${campaignId}:replacement-attempt:${allocation.path_id}:${allocation.replacement_ordinal}`
      || allocation.selection_basis_digest !== fingerprintCanonicalJson(
        "zoey:replacement-allocation-basis:v1", basis
      ) || allocation.seed_commitment !== fingerprintCanonicalJson(
        "zoey:replacement-seed-commitment:v1", basis
      )) {
      throw new Error("Replacement allocation does not match its deterministic basis.");
    }
  } else {
    throw new Error("Attempt allocation kind is invalid.");
  }
  assertOpaqueId(allocation.slot_id, "attempt allocation.slot_id");
  assertOpaqueId(allocation.attempt_id, "attempt allocation.attempt_id");
  assertSha256(allocation.selection_basis_digest, "attempt allocation.selection_basis_digest");
  if (allocation.allocation_kind === "INVALIDITY_DERIVED_REPLACEMENT") {
    assertSha256(allocation.seed_commitment, "attempt allocation.seed_commitment");
  }
  if (allocation.lifecycle !== "authorized" || allocation.outcome_independent !== true) {
    throw new Error("Attempt allocation must remain prospectively authorized and outcome-independent.");
  }
}

function validateAnchorRequirement(value) {
  assertExactKeys(value, [
    "profile", "authority_ref", "receipt_media_type", "receipt_encoding",
    "receipt_digest_algorithm", "receipt_custody_target", "resolvability_policy",
    "fresh_start_profile"
  ], [], "anchor requirement");
  if (!Object.hasOwn(ANCHOR_START_PROFILE, value.profile)
    || value.fresh_start_profile !== ANCHOR_START_PROFILE[value.profile]
    || value.receipt_digest_algorithm !== "sha-256"
    || value.resolvability_policy !== "REQUIRED_AT_USE") {
    throw new Error("Prospective anchor/fresh-start profile is invalid.");
  }
  for (const field of [
    "authority_ref", "receipt_media_type", "receipt_encoding", "receipt_custody_target"
  ]) assertNonemptyString(value[field], `anchor requirement.${field}`);
}

function validateAnchorVerification(value, authorization, namespaceRef, receiptRef) {
  assertExactKeys(value, [
    "authorization_ref", "namespace_index_ref", "anchor_receipt_ref", "profile",
    "external_commit_sha", "authority_ref", "external_event_id", "observed_predecessor",
    "receipt_bytes_digest", "validator_identity", "producer_identity", "source",
    "verification_result"
  ], [], "anchor verification");
  const expectedAuthorization = createExactArtifactReference(authorization);
  if (canonicalizeJson(value.authorization_ref) !== canonicalizeJson(expectedAuthorization)
    || canonicalizeJson(value.namespace_index_ref) !== canonicalizeJson(namespaceRef)
    || canonicalizeJson(value.anchor_receipt_ref) !== canonicalizeJson(receiptRef)) {
    throw new Error("Anchor verification does not bind exact authority artifacts.");
  }
  if (value.profile !== authorization.identity_payload.anchor_requirement.profile
    || value.authority_ref !== authorization.identity_payload.anchor_requirement.authority_ref
    || !/^[0-9a-f]{40}$/.test(value.external_commit_sha)
    || !/^[0-9a-f]{40}$/.test(value.observed_predecessor)
    || value.external_commit_sha === value.observed_predecessor) {
    throw new Error("Anchor verification external ordering identity is invalid.");
  }
  assertOpaqueId(value.external_event_id, "anchor verification.external_event_id");
  assertSha256(value.receipt_bytes_digest, "anchor verification.receipt_bytes_digest");
  validateDistinctActors(value.producer_identity, value.validator_identity);
  const expectedSource = value.profile === "PROTECTED_REMOTE_GATE"
    ? "EXTERNAL_PLATFORM"
    : "INDEPENDENT_ATTESTOR";
  if (value.source !== expectedSource
    || value.verification_result !== "VERIFIED") {
    throw new Error("Anchor verification must come from a declared independent source.");
  }
}

function validateFreshStartProof(value, anchorRequirement, verification, slotId) {
  assertExactKeys(value, [
    "profile", "slot_id", "challenge", "issued_by", "observed_by", "anchor_event_id",
    "start_event_id", "capture_binding_digest", "verification_result"
  ], [], "fresh-start proof");
  if (value.profile !== anchorRequirement.fresh_start_profile
    || value.slot_id !== slotId
    || value.anchor_event_id !== verification.external_event_id
    || value.start_event_id === value.anchor_event_id
    || value.issued_by === verification.producer_identity
    || value.observed_by === verification.producer_identity
    || value.verification_result !== "VERIFIED") {
    throw new Error("Fresh-start proof lacks independent causal post-anchor closure.");
  }
  assertOpaqueId(value.challenge, "fresh-start proof.challenge");
  assertOpaqueId(value.issued_by, "fresh-start proof.issued_by");
  assertOpaqueId(value.observed_by, "fresh-start proof.observed_by");
  assertOpaqueId(value.start_event_id, "fresh-start proof.start_event_id");
  assertSha256(value.capture_binding_digest, "fresh-start proof.capture_binding_digest");
}

function validateCustodyPlan(value) {
  assertExactKeys(value, ["custody_id", "access_policy_digest"], [], "authority custody plan");
  assertOpaqueId(value.custody_id, "authority custody_id");
  assertSha256(value.access_policy_digest, "authority access_policy_digest");
}

function validateEvidenceReferences(references, label) {
  if (!Array.isArray(references)) throw new Error(`${label} must be an array.`);
  const ids = [];
  for (const reference of references) {
    validateExactArtifactReference(reference, { allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"] });
    ids.push(`${reference.artifact_id}:${reference.content_fingerprint}`);
  }
  assertSortedUniqueStrings(ids, label);
}

function validateNullableResolution(reference, artifact, kind) {
  if (reference === null || artifact === null) {
    if (reference !== artifact) throw new Error(`Nullable ${kind} reference/artifact mismatch.`);
    return;
  }
  resolveExactArtifactReference(reference, artifact, { allowedKinds: [kind] });
}

function validateDistinctActors(producer, validator) {
  assertOpaqueId(producer, "producer identity");
  assertOpaqueId(validator, "validator/authority identity");
  if (producer === validator) throw new Error("Producer and validator/authority must be distinct.");
}

function validateCreated(createdAt, createdBy) {
  if (typeof createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(createdAt)
    || new Date(createdAt).toISOString().replace(".000Z", "Z") !== createdAt) {
    throw new Error("Authority artifact time must be an RFC3339 UTC second.");
  }
  assertOpaqueId(createdBy, "authority artifact actor");
}

function validateExactSet(actual, expected, label) {
  assertSortedUniqueStrings(actual, label, { allowEmpty: false });
  if (canonicalizeJson(actual) !== canonicalizeJson(expected)) {
    throw new Error(`${label} does not match its sole authority.`);
  }
}

function validateMaterialDecisionSubject(decisionKind, subjectRef) {
  const allowed = {
    AUTHORITY_INVALIDATION: [
      "CAMPAIGN_AUTHORIZATION", "FORMAL_RUN_RECORD", "CAMPAIGN_EVIDENCE_INDEX",
      "AUTHORITY_NAMESPACE_INDEX"
    ],
    RECORD_CORRECTION: ["FORMAL_RUN_RECORD", "FORMAL_EVIDENCE_ARTIFACT"],
    ORACLE_POLICY_RECLASSIFICATION: ["FORMAL_RUN_RECORD", "EVALUATION_DECISION"],
    QUALIFICATION_RESULT_CORRECTION: ["DETERMINISTIC_QUALIFICATION_RESULT"],
    CAMPAIGN_SUPERSESSION: ["CAMPAIGN_AUTHORIZATION"],
    NAMESPACE_RECONCILIATION: ["AUTHORITY_NAMESPACE_INDEX"]
  };
  if (!allowed[decisionKind].includes(subjectRef.artifact_kind)) {
    throw new Error(`${decisionKind} cannot target ${subjectRef.artifact_kind}.`);
  }
}
