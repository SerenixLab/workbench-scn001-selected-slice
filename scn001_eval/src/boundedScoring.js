import {
  ARTIFACT_HASH_DOMAIN,
  ARTIFACT_KIND_SCHEMA,
  assertExactKeys,
  assertNonemptyString,
  assertOpaqueId,
  assertSha256,
  assertSortedUniqueStrings,
  canonicalizeJson,
  createExactArtifactReference,
  deepFreeze,
  fingerprintCanonicalJson,
  resolveExactArtifactReference,
  validateCanonicalArtifact,
  validateExactArtifactReference
} from "./formalArtifactIdentity.js";
import {
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest
} from "./configurationIdentity.js";
import {
  REQUIRED_CLAIM_CLASSES,
  REQUIRED_PATHS,
  validateCampaignAuthorization,
  validateQualificationPlan,
  validateQualificationResult
} from "./formalAuthority.js";
import {
  createAuthorityNamespaceIndex,
  validateAuthorityNamespaceIndex,
  validateCampaignEvidenceIndex,
  validateFormalEvidenceArtifact,
  verifyDurableEvidence,
  verifySingleEffectiveNamespaceHead
} from "./formalEvidence.js";
import {
  CLAIM_OBLIGATION_MAP,
  verifyDurableFormalRunRecord
} from "./formalRunRecord.js";

export const BOUNDED_RESULT_VALUES = Object.freeze([
  "BOUNDED_PASS", "BOUNDED_FAIL", "NOT_YET_DETERMINABLE"
]);
export const RESULT_STANDING_VALUES = Object.freeze([
  "CURRENT", "RESULT_REEVALUATION_REQUIRED", "SUPERSEDED"
]);

const GROW_002_EXCLUSION = "For fixture/oracle package SCN001-SSFO-V0.2.0 and the first synthetic selected-slice milestone, general longitudinal agreement-drift, anti-correction-drift, and personality-drift detection are not evaluated and cannot be claimed.";
const RESULT_CEILING = "The result covers curated-context temporal handling, evidence-responsive trial formation, scoped trial use, intervention-conditioned outcome semantics, and bounded explanation provenance on the registered paths. It does not establish full SCN-001 success, general longitudinal drift resistance, retrieval, production memory, durable adaptation, real voice behavior, Japanese teaching quality, statistical reliability, production readiness, or real continuity.";
const INDETERMINATE_CEILING = `Any future determination would be limited to the four registered paths, five mandatory selected-slice claim classes, and these exclusions: ${RESULT_CEILING}`;
const QUESTION_MATRIX = deepFreeze({
  matrix_revision: "ADR-012-R3",
  blocking_dependencies: ["EVAL-004", "EVAL-007"],
  bounded_exclusions: ["GROW-002"],
  trigger_absent_families: [
    "AUTH-001..006", "CONT-001..002", "DEP-002..004", "GROW-003..005",
    "INIT-001..002", "LEG-001..005", "MEM-001..005", "PROD-001..003,005",
    "REPO-001", "SURF-001..002", "TIME-001", "TRUST-001"
  ],
  open_claim_affecting_questions: [],
  working_assumptions: []
});
const AGGREGATION_IMPLEMENTATION_FINGERPRINT = fingerprintCanonicalJson(
  "zoey:bounded-aggregation-implementation:v1",
  {
    policy: "CONJUNCTIVE_NONNUMERIC_V1",
    paths: REQUIRED_PATHS,
    claims: REQUIRED_CLAIM_CLASSES,
    obligation_map: CLAIM_OBLIGATION_MAP,
    result_values: BOUNDED_RESULT_VALUES,
    question_matrix: QUESTION_MATRIX
  }
);
const UNRESOLVED_KINDS = Object.freeze([
  "AUTHORITY", "VALIDITY", "REPLACEMENT", "COVERAGE", "COMPARISON",
  "QUESTION", "EVIDENCE_UNIVERSE"
]);

export async function createBoundedCampaignResult(input) {
  assertExactKeys(input, [
    "store", "artifact_id", "result_id", "authorization", "authority_context",
    "campaign_index", "closure_namespace", "closure_receipt", "run_records",
    "historical_campaigns", "additional_unresolved_closure", "producer_identity", "validator_identity",
    "validation_result", "created_at", "created_by", "supersedes_result",
    "supersession_decision"
  ], [], "bounded campaign result input");
  const computed = await computeBoundedResult(input);
  const payload = {
    artifact_kind: "BOUNDED_CAMPAIGN_RESULT",
    schema_id: ARTIFACT_KIND_SCHEMA.BOUNDED_CAMPAIGN_RESULT,
    schema_revision: 1,
    result_id: input.result_id,
    behavior_manifest_ref: structuredClone(input.authorization.identity_payload.behavior_manifest_ref),
    evaluation_manifest_ref: structuredClone(input.authorization.identity_payload.evaluation_manifest_ref),
    campaign_authorization_ref: createExactArtifactReference(input.authorization),
    campaign_index_ref: createExactArtifactReference(input.campaign_index),
    pre_result_namespace_ref: createExactArtifactReference(input.closure_namespace),
    closure_receipt_ref: createExactArtifactReference(input.closure_receipt),
    qualification_plan_ref: structuredClone(input.authorization.identity_payload.qualification_plan_ref),
    qualification_result_ref: structuredClone(input.authorization.identity_payload.qualification_result_ref),
    run_count_branch: input.authorization.identity_payload.run_count_branch,
    planned_valid_runs_per_path: input.authorization.identity_payload.planned_valid_runs_per_path,
    attempt_inventory_digest: fingerprintCanonicalJson(
      "zoey:campaign-attempt-inventory:v1", input.campaign_index.identity_payload.attempt_inventory
    ),
    path_claim_results: computed.pathClaimResults,
    claim_class_results: computed.claimClassResults,
    valid_run_refs: computed.validRunRefs,
    invalid_run_refs: computed.invalidRunRefs,
    hard_failure_refs: computed.hardFailureRefs,
    unresolved_closure: computed.unresolvedClosure,
    scoreability_policy: {
      policy_id: "SCN001-BOUNDED-CONJUNCTIVE-V1",
      policy_revision: "ADR-012-R3",
      aggregation_implementation_fingerprint: AGGREGATION_IMPLEMENTATION_FINGERPRINT,
      numeric_scoring: false,
      voting: false,
      class_substitution: false
    },
    question_matrix: structuredClone(QUESTION_MATRIX),
    bounded_result: computed.boundedResult,
    decisive_basis: computed.decisiveBasis,
    bounded_claim: boundedClaim(computed.boundedResult, computed.decisiveBasis),
    grow_002_exclusion: GROW_002_EXCLUSION,
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    validation_result: input.validation_result,
    created_at: input.created_at,
    created_by: input.created_by,
    supersedes_result_ref: input.supersedes_result === null
      ? null : createExactArtifactReference(input.supersedes_result),
    supersession_decision_ref: input.supersession_decision === null
      ? null : createExactArtifactReference(input.supersession_decision),
    authority_status: "RESULT_AUTHORITY_PENDING_INDEX_CLOSURE"
  };
  const result = buildArtifact(input.artifact_id, "BOUNDED_CAMPAIGN_RESULT", payload);
  await validateBoundedCampaignResult(result, input);
  await input.store.writeArtifact(result, (artifact) => validateBoundedCampaignResult(
    artifact, input
  ));
  return result;
}

export async function validateBoundedCampaignResult(result, context) {
  validateCanonicalArtifact(result, { allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"] });
  const payload = result.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "result_id",
    "behavior_manifest_ref", "evaluation_manifest_ref", "campaign_authorization_ref",
    "campaign_index_ref", "pre_result_namespace_ref", "closure_receipt_ref",
    "qualification_plan_ref", "qualification_result_ref", "run_count_branch",
    "planned_valid_runs_per_path", "attempt_inventory_digest", "path_claim_results",
    "claim_class_results", "valid_run_refs", "invalid_run_refs", "hard_failure_refs",
    "unresolved_closure", "scoreability_policy", "question_matrix", "bounded_result",
    "decisive_basis", "bounded_claim", "grow_002_exclusion", "producer_identity",
    "validator_identity", "validation_result", "created_at", "created_by",
    "supersedes_result_ref", "supersession_decision_ref", "authority_status"
  ], [], "bounded campaign result payload");
  assertOpaqueId(payload.result_id, "bounded result_id");
  validateCampaignAuthorization(context.authorization, context.authority_context);
  validateCampaignEvidenceIndex(context.campaign_index, {
    authorization: context.authorization
  });
  validateAuthorityNamespaceIndex(context.closure_namespace);
  validateFormalEvidenceArtifact(context.closure_receipt);
  for (const [reference, artifact, kind] of [
    [payload.campaign_authorization_ref, context.authorization, "CAMPAIGN_AUTHORIZATION"],
    [payload.campaign_index_ref, context.campaign_index, "CAMPAIGN_EVIDENCE_INDEX"],
    [payload.pre_result_namespace_ref, context.closure_namespace, "AUTHORITY_NAMESPACE_INDEX"],
    [payload.closure_receipt_ref, context.closure_receipt, "FORMAL_EVIDENCE_ARTIFACT"]
  ]) resolveExactArtifactReference(reference, artifact, { allowedKinds: [kind] });
  if (canonicalizeJson(payload.behavior_manifest_ref)
      !== canonicalizeJson(context.authorization.identity_payload.behavior_manifest_ref)
    || canonicalizeJson(payload.evaluation_manifest_ref)
      !== canonicalizeJson(context.authorization.identity_payload.evaluation_manifest_ref)
    || canonicalizeJson(payload.qualification_plan_ref)
      !== canonicalizeJson(context.authorization.identity_payload.qualification_plan_ref)
    || canonicalizeJson(payload.qualification_result_ref)
      !== canonicalizeJson(context.authorization.identity_payload.qualification_result_ref)
    || payload.run_count_branch !== context.authorization.identity_payload.run_count_branch
    || payload.planned_valid_runs_per_path
      !== context.authorization.identity_payload.planned_valid_runs_per_path
    || payload.attempt_inventory_digest !== fingerprintCanonicalJson(
      "zoey:campaign-attempt-inventory:v1", context.campaign_index.identity_payload.attempt_inventory
    )) throw new Error("Bounded result repeats a conflicting authority/configuration fact.");
  const computed = await computeBoundedResult(context);
  for (const [field, expected] of Object.entries({
    path_claim_results: computed.pathClaimResults,
    claim_class_results: computed.claimClassResults,
    valid_run_refs: computed.validRunRefs,
    invalid_run_refs: computed.invalidRunRefs,
    hard_failure_refs: computed.hardFailureRefs,
    unresolved_closure: computed.unresolvedClosure,
    bounded_result: computed.boundedResult,
    decisive_basis: computed.decisiveBasis,
    bounded_claim: boundedClaim(computed.boundedResult, computed.decisiveBasis)
  })) if (canonicalizeJson(payload[field]) !== canonicalizeJson(expected)) {
    throw new Error(`Bounded result ${field} was not independently recomputed.`);
  }
  validateScoreabilityPolicy(payload.scoreability_policy);
  if (canonicalizeJson(payload.question_matrix) !== canonicalizeJson(QUESTION_MATRIX)
    || payload.grow_002_exclusion !== GROW_002_EXCLUSION
    || payload.authority_status !== "RESULT_AUTHORITY_PENDING_INDEX_CLOSURE") {
    throw new Error("Bounded result policy/exclusion/initial authority state is invalid.");
  }
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  validateCreated(payload.created_at, payload.created_by);
  if (payload.validation_result !== "VALIDATED"
    || payload.created_by !== payload.producer_identity) {
    throw new Error("Bounded result producer/validation provenance is invalid.");
  }
  validateSupersession(payload, result, context);
  if (payload.supersedes_result_ref !== null) {
    await context.store.readArtifact(
      payload.supersedes_result_ref,
      (artifact) => validateCanonicalArtifact(artifact, {
        allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"]
      })
    );
    await context.store.readArtifact(
      payload.supersession_decision_ref, validateResultStandingDecision
    );
    await verifyDurableSupersessionStanding(
      context.store, context.supersedes_result, context.supersession_decision
    );
  }
  return result;
}

export function createResultStandingDecision(input) {
  assertExactKeys(input, [
    "artifact_id", "result", "prior_standing", "standing", "reason_code",
    "basis_delta_digest", "basis_evidence_refs", "proposed_by",
    "independent_reviewer", "review_attestation_ref", "owner_identity",
    "owner_decision", "effective_at", "effective_by"
  ], [], "result standing decision input");
  validateCanonicalArtifact(input.result, { allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"] });
  if (input.prior_standing !== null) validateResultStandingDecision(input.prior_standing);
  const priorRef = input.prior_standing === null
    ? null : createExactArtifactReference(input.prior_standing);
  const payload = {
    artifact_kind: "EVALUATION_DECISION",
    schema_id: ARTIFACT_KIND_SCHEMA.EVALUATION_DECISION,
    schema_revision: 1,
    decision_kind: "BOUNDED_RESULT_STANDING",
    result_ref: createExactArtifactReference(input.result),
    prior_standing_ref: priorRef,
    standing: input.standing,
    reason_code: input.reason_code,
    basis_delta_digest: input.basis_delta_digest,
    basis_evidence_refs: structuredClone(input.basis_evidence_refs),
    proposed_by: input.proposed_by,
    independent_reviewer: input.independent_reviewer,
    review_attestation_ref: structuredClone(input.review_attestation_ref),
    owner_identity: input.owner_identity,
    owner_decision: input.owner_decision,
    effective_at: input.effective_at,
    effective_by: input.effective_by
  };
  const decision = buildArtifact(input.artifact_id, "EVALUATION_DECISION", payload);
  validateResultStandingDecision(decision, {
    result: input.result,
    priorStanding: input.prior_standing
  });
  return decision;
}

export function validateResultStandingDecision(decision, context = {}) {
  validateCanonicalArtifact(decision, { allowedKinds: ["EVALUATION_DECISION"] });
  const payload = decision.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "decision_kind", "result_ref",
    "prior_standing_ref", "standing", "reason_code", "basis_delta_digest",
    "basis_evidence_refs", "proposed_by", "independent_reviewer",
    "review_attestation_ref", "owner_identity", "owner_decision", "effective_at",
    "effective_by"
  ], [], "result standing decision payload");
  if (payload.decision_kind !== "BOUNDED_RESULT_STANDING"
    || !RESULT_STANDING_VALUES.includes(payload.standing)) {
    throw new Error("Result standing decision kind/value is invalid.");
  }
  validateExactArtifactReference(payload.result_ref, { allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"] });
  if (payload.prior_standing_ref !== null) {
    validateExactArtifactReference(payload.prior_standing_ref, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
  }
  if (context.result) resolveExactArtifactReference(payload.result_ref, context.result, {
    allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"]
  });
  if (context.priorStanding !== undefined) {
    if ((context.priorStanding === null) !== (payload.prior_standing_ref === null)) {
      throw new Error("Result standing predecessor presence is inconsistent.");
    }
    if (context.priorStanding !== null) {
      resolveExactArtifactReference(payload.prior_standing_ref, context.priorStanding, {
        allowedKinds: ["EVALUATION_DECISION"]
      });
      if (canonicalizeJson(context.priorStanding.identity_payload.result_ref)
        !== canonicalizeJson(payload.result_ref)) {
        throw new Error("Result standing chain crosses bounded results.");
      }
      validateStandingTransition(context.priorStanding, decision);
    }
  }
  assertOpaqueId(payload.reason_code, "result standing reason_code");
  assertSha256(payload.basis_delta_digest, "result standing basis_delta_digest");
  validateReferenceList(payload.basis_evidence_refs, ["FORMAL_EVIDENCE_ARTIFACT"]);
  if (payload.basis_evidence_refs.length === 0) throw new Error("Result standing requires evidence.");
  validateExactArtifactReference(payload.review_attestation_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  if (new Set([
    payload.proposed_by, payload.independent_reviewer, payload.owner_identity
  ]).size !== 3 || payload.owner_decision !== "ACCEPTED"
    || payload.effective_by !== payload.owner_identity) {
    throw new Error("Result standing requires independent review and owner acceptance.");
  }
  for (const actor of [
    payload.proposed_by, payload.independent_reviewer, payload.owner_identity
  ]) assertOpaqueId(actor, "result standing actor");
  if (payload.prior_standing_ref === null && payload.standing !== "CURRENT") {
    throw new Error("Initial result standing must be CURRENT.");
  }
  if (payload.prior_standing_ref !== null && payload.standing === "CURRENT") {
    throw new Error("A later standing decision cannot reset history to CURRENT.");
  }
  validateCreated(payload.effective_at, payload.effective_by);
  return decision;
}

export function resolveResultStanding(result, decisions) {
  validateCanonicalArtifact(result, { allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"] });
  if (!Array.isArray(decisions) || decisions.length === 0) {
    throw new Error("Bounded result requires an indexed standing decision.");
  }
  const byReference = new Map();
  const predecessors = new Set();
  for (const decision of decisions) {
    validateResultStandingDecision(decision);
    if (canonicalizeJson(decision.identity_payload.result_ref)
      !== canonicalizeJson(createExactArtifactReference(result))) {
      throw new Error("Standing set includes a different bounded result.");
    }
    const decisionIdentity = canonicalizeJson(createExactArtifactReference(decision));
    if (byReference.has(decisionIdentity)) {
      throw new Error("Result standing set duplicates an exact decision.");
    }
    byReference.set(decisionIdentity, decision);
    if (decision.identity_payload.prior_standing_ref !== null) {
      predecessors.add(canonicalizeJson(decision.identity_payload.prior_standing_ref));
    }
  }
  const heads = decisions.filter((decision) => !predecessors.has(
    canonicalizeJson(createExactArtifactReference(decision))
  ));
  if (heads.length !== 1) throw new Error("Result standing history has a fork.");
  let current = heads[0];
  const visited = new Set();
  while (current.identity_payload.prior_standing_ref !== null) {
    const currentIdentity = canonicalizeJson(createExactArtifactReference(current));
    if (visited.has(currentIdentity)) throw new Error("Result standing history has a cycle.");
    visited.add(currentIdentity);
    const prior = byReference.get(canonicalizeJson(current.identity_payload.prior_standing_ref));
    if (!prior) throw new Error("Result standing predecessor is missing.");
    resolveExactArtifactReference(current.identity_payload.prior_standing_ref, prior, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
    validateStandingTransition(prior, current);
    current = prior;
  }
  if (current.identity_payload.standing !== "CURRENT") {
    throw new Error("Result standing chain has no initial CURRENT decision.");
  }
  return heads[0];
}

function validateStandingTransition(prior, current) {
  const priorPayload = prior.identity_payload;
  const currentPayload = current.identity_payload;
  const allowed = priorPayload.standing === "CURRENT"
    ? ["RESULT_REEVALUATION_REQUIRED", "SUPERSEDED"]
    : priorPayload.standing === "RESULT_REEVALUATION_REQUIRED"
      ? ["SUPERSEDED"]
      : [];
  if (!allowed.includes(currentPayload.standing)) {
    throw new Error("Result standing transition is not monotonic or uses a terminal predecessor.");
  }
  if (Date.parse(currentPayload.effective_at) <= Date.parse(priorPayload.effective_at)) {
    throw new Error("Result standing successor must become effective after its predecessor.");
  }
}

export async function resolveBoundedResultAuthority(input) {
  assertExactKeys(input, [
    "store", "result", "result_context", "indexing_namespace", "indexing_receipt",
    "standing_decisions"
  ], [], "bounded result authority input");
  await validateBoundedCampaignResult(input.result, input.result_context);
  validateAuthorityNamespaceIndex(input.indexing_namespace);
  await verifyDurableEvidence(input.store, input.indexing_receipt);
  await input.store.readArtifact(
    createExactArtifactReference(input.result),
    (artifact) => validateBoundedCampaignResult(artifact, input.result_context)
  );
  const resultRef = createExactArtifactReference(input.result);
  if (!input.indexing_namespace.identity_payload.bounded_result_refs.some(
    (reference) => canonicalizeJson(reference) === canonicalizeJson(resultRef)
  ) || canonicalizeJson(input.indexing_namespace.identity_payload.prior_index_ref)
      !== canonicalizeJson(createExactArtifactReference(input.result_context.closure_namespace))) {
    throw new Error("Later namespace does not non-circularly index the exact bounded result.");
  }
  const receipt = input.indexing_receipt.identity_payload.semantic_envelope;
  const authorizationRef = createExactArtifactReference(input.result_context.authorization);
  if (input.indexing_receipt.identity_payload.evidence_kind !== "ANCHOR_RECEIPT"
    || canonicalizeJson(receipt.namespace_index_ref)
      !== canonicalizeJson(createExactArtifactReference(input.indexing_namespace))
    || canonicalizeJson(receipt.authorization_ref) !== canonicalizeJson(authorizationRef)
    || receipt.profile
      !== input.result_context.authorization.identity_payload.anchor_requirement.profile
    || receipt.authority_ref
      !== input.result_context.authorization.identity_payload.anchor_requirement.authority_ref
    || input.indexing_receipt.identity_payload.producer_identity
      === input.result.identity_payload.producer_identity) {
    throw new Error("Bounded result indexing namespace lacks its exact external receipt.");
  }
  const head = await verifySingleEffectiveNamespaceHead(
    input.store, input.indexing_namespace.identity_payload.namespace_id
  );
  if (head.content_fingerprint !== input.indexing_namespace.content_fingerprint) {
    throw new Error("Bounded result is indexed only by a non-effective namespace revision.");
  }
  const standing = resolveResultStanding(input.result, input.standing_decisions);
  for (const decision of input.standing_decisions) {
    await input.store.readArtifact(
      createExactArtifactReference(decision), validateResultStandingDecision
    );
    for (const evidenceRef of [
      ...decision.identity_payload.basis_evidence_refs,
      decision.identity_payload.review_attestation_ref
    ]) {
      const evidence = await input.store.readArtifact(evidenceRef, validateFormalEvidenceArtifact);
      await verifyDurableEvidence(input.store, evidence);
    }
  }
  const standingRef = createExactArtifactReference(standing);
  const indexedDecisionRefs = new Set(
    input.indexing_namespace.identity_payload.decision_refs.map(canonicalizeJson)
  );
  if (!input.standing_decisions.every((decision) => indexedDecisionRefs.has(
    canonicalizeJson(createExactArtifactReference(decision))
  ))) throw new Error("Effective namespace omits part of the exact result standing chain.");
  return deepFreeze({
    result_ref: resultRef,
    indexing_namespace_ref: createExactArtifactReference(input.indexing_namespace),
    indexing_receipt_ref: createExactArtifactReference(input.indexing_receipt),
    effective_standing_ref: standingRef,
    standing: standing.identity_payload.standing,
    authority_status: standing.identity_payload.standing === "CURRENT"
      ? "AUTHORITATIVE_BOUNDED_RESULT"
      : "AUTHORITATIVE_RESULT_NOT_CURRENT",
    claim_authorized: standing.identity_payload.standing === "CURRENT"
  });
}

export function createResultIndexingNamespace(input) {
  assertExactKeys(input, [
    "artifact_id", "prior_namespace", "predecessor_receipt", "result",
    "standing_decisions", "cutoff_label", "producer_identity", "validator_identity",
    "created_at", "created_by"
  ], [], "result indexing namespace input");
  const prior = input.prior_namespace.identity_payload;
  if (canonicalizeJson(input.result.identity_payload.pre_result_namespace_ref)
    !== canonicalizeJson(createExactArtifactReference(input.prior_namespace))) {
    throw new Error("Result indexing namespace is not the result's exact later successor.");
  }
  for (const decision of input.standing_decisions) {
    validateResultStandingDecision(decision, { result: input.result });
  }
  const resultRef = createExactArtifactReference(input.result);
  const decisionRefs = [
    ...prior.decision_refs,
    ...input.standing_decisions.map(createExactArtifactReference)
  ].sort(referenceSort);
  const boundedRefs = [...prior.bounded_result_refs, resultRef].sort(referenceSort);
  validateFormalEvidenceArtifact(input.predecessor_receipt);
  if (canonicalizeJson(input.predecessor_receipt.identity_payload.semantic_envelope.namespace_index_ref)
    !== canonicalizeJson(createExactArtifactReference(input.prior_namespace))) {
    throw new Error("Result indexing namespace requires the prior revision's exact receipt.");
  }
  const anchorReceiptRefs = [
    ...prior.anchor_receipt_refs,
    createExactArtifactReference(input.predecessor_receipt)
  ].sort(referenceSort);
  return createAuthorityNamespaceIndex({
    artifact_id: input.artifact_id,
    namespace_id: prior.namespace_id,
    revision: prior.revision + 1,
    authority_identity: prior.authority_identity,
    prior_index: input.prior_namespace,
    qualification_plan_refs: prior.qualification_plan_refs,
    qualification_result_refs: prior.qualification_result_refs,
    campaign_authorization_refs: prior.campaign_authorization_refs,
    campaign_index_refs: prior.campaign_index_refs,
    bounded_result_refs: boundedRefs,
    decision_refs: decisionRefs,
    anchor_receipt_refs: anchorReceiptRefs,
    manifest_bindings: prior.manifest_bindings,
    anchor_declarations: prior.anchor_declarations,
    cutoff_label: input.cutoff_label,
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    validation_result: "VALIDATED",
    created_at: input.created_at,
    created_by: input.created_by
  });
}

async function computeBoundedResult(input) {
  validateCampaignAuthorization(input.authorization, input.authority_context);
  validateCampaignEvidenceIndex(input.campaign_index, { authorization: input.authorization });
  validateAuthorityNamespaceIndex(input.closure_namespace);
  await verifyDurableEvidence(input.store, input.closure_receipt);
  await input.store.readConfigurationManifest(
    input.authorization.identity_payload.behavior_manifest_ref,
    validateBehaviorConfigurationManifest
  );
  await input.store.readConfigurationManifest(
    input.authorization.identity_payload.evaluation_manifest_ref,
    validateEvaluationConfigurationManifest
  );
  await input.store.readArtifact(
    createExactArtifactReference(input.authorization),
    (artifact) => validateCampaignAuthorization(artifact, input.authority_context)
  );
  if (input.authorization.identity_payload.qualification_plan_ref !== null) {
    await input.store.readArtifact(
      input.authorization.identity_payload.qualification_plan_ref,
      (artifact) => validateQualificationPlan(artifact, {
        behaviorManifest: input.authority_context.behavior_manifest,
        evaluationManifest: input.authority_context.evaluation_manifest
      })
    );
  }
  if (input.authorization.identity_payload.qualification_result_ref !== null) {
    await input.store.readArtifact(
      input.authorization.identity_payload.qualification_result_ref,
      (artifact) => validateQualificationResult(artifact, {
        plan: input.authority_context.qualification_plan,
        behaviorManifest: input.authority_context.behavior_manifest,
        evaluationManifest: input.authority_context.evaluation_manifest
      })
    );
  }
  const campaignIndexRef = createExactArtifactReference(input.campaign_index);
  await input.store.readArtifact(campaignIndexRef, (artifact) => validateCampaignEvidenceIndex(
    artifact, { authorization: input.authorization }
  ));
  for (const evidenceRef of input.campaign_index.identity_payload.evidence_refs) {
    const evidence = await input.store.readArtifact(evidenceRef, validateFormalEvidenceArtifact);
    await verifyDurableEvidence(input.store, evidence);
  }
  for (const decisionRef of input.campaign_index.identity_payload.decision_refs) {
    await input.store.readArtifact(decisionRef, (artifact) => validateCanonicalArtifact(
      artifact, { allowedKinds: ["EVALUATION_DECISION"] }
    ));
  }
  if (!input.closure_namespace.identity_payload.campaign_index_refs.some(
    (reference) => canonicalizeJson(reference) === canonicalizeJson(campaignIndexRef)
  )) throw new Error("Pre-result namespace does not include the exact frozen campaign index.");
  const receiptSemantics = input.closure_receipt.identity_payload.semantic_envelope;
  const authorizationRef = createExactArtifactReference(input.authorization);
  if (input.closure_receipt.identity_payload.evidence_kind !== "ANCHOR_RECEIPT"
    || canonicalizeJson(receiptSemantics.namespace_index_ref)
      !== canonicalizeJson(createExactArtifactReference(input.closure_namespace))
    || canonicalizeJson(receiptSemantics.authorization_ref)
      !== canonicalizeJson(authorizationRef)
    || receiptSemantics.profile !== input.authorization.identity_payload.anchor_requirement.profile
    || receiptSemantics.authority_ref
      !== input.authorization.identity_payload.anchor_requirement.authority_ref
    || input.closure_receipt.identity_payload.producer_identity === input.producer_identity) {
    throw new Error("Pre-result closure namespace lacks its exact external receipt.");
  }
  const head = await verifySingleEffectiveNamespaceHead(
    input.store, input.closure_namespace.identity_payload.namespace_id
  );
  const unresolved = validateAdditionalUnresolved(input.additional_unresolved_closure);
  const currentAuthorizationRef = createExactArtifactReference(input.authorization);
  if (!namespaceContainsAuthorizationBinding(input.closure_namespace, input.authorization)) {
    unresolved.push(unresolvedFinding(
      "AUTHORITY", [currentAuthorizationRef],
      "current campaign authorization or its exact manifest binding is absent from the closure namespace"
    ));
  }
  if (!await namespaceDescendsFrom(input.store, head, input.closure_namespace)) {
    unresolved.push(unresolvedFinding(
      "AUTHORITY", [createExactArtifactReference(input.closure_namespace)],
      "pre-result namespace is not on the effective single-head history"
    ));
  }
  const runByReference = new Map();
  if (!Array.isArray(input.run_records)) throw new Error("Result run context must be an array.");
  const indexedRunIdentities = new Set(
    input.campaign_index.identity_payload.run_record_refs.map(canonicalizeJson)
  );
  for (const entry of input.run_records) {
    const context = {
      ...entry.context,
      evidenceArtifacts: entry.context.evidence_artifacts
    };
    await verifyDurableFormalRunRecord(input.store, entry.record, context);
    const identity = canonicalizeJson(createExactArtifactReference(entry.record));
    if (!indexedRunIdentities.has(identity) || runByReference.has(identity)) {
      throw new Error("Result context imports or duplicates a run outside the frozen index.");
    }
    runByReference.set(identity, entry.record);
  }
  const validRuns = [];
  const invalidRuns = [];
  for (const runRef of input.campaign_index.identity_payload.run_record_refs) {
    const record = runByReference.get(canonicalizeJson(runRef));
    if (!record) {
      unresolved.push(unresolvedFinding(
        "EVIDENCE_UNIVERSE", [runRef], "campaign run record is not resolvable at cutoff"
      ));
      continue;
    }
    if (record.identity_payload.run_validity === "VALID") validRuns.push(record);
    else invalidRuns.push(record);
  }
  const namespaceCampaignIndexes = new Set(
    input.closure_namespace.identity_payload.campaign_index_refs.map(canonicalizeJson)
  );
  if (!Array.isArray(input.historical_campaigns)) {
    throw new Error("Historical campaign attribution context must be an array.");
  }
  const suppliedCampaignIndexes = new Set([
    canonicalizeJson(campaignIndexRef),
    ...input.historical_campaigns.map((campaign) => canonicalizeJson(
      createExactArtifactReference(campaign.campaign_index)
    ))
  ]);
  if (namespaceCampaignIndexes.size !== suppliedCampaignIndexes.size
    || [...namespaceCampaignIndexes].some((reference) => !suppliedCampaignIndexes.has(reference))) {
    unresolved.push(unresolvedFinding(
      "EVIDENCE_UNIVERSE", [createExactArtifactReference(input.closure_namespace)],
      "not every campaign index in the effective namespace has attribution context"
    ));
  }
  const historicalHardRuns = [];
  const historicalClaimFailures = [];
  const namespaceAuthorizationRefs = new Set(
    input.closure_namespace.identity_payload.campaign_authorization_refs.map(canonicalizeJson)
  );
  for (const campaign of input.historical_campaigns) {
    assertExactKeys(campaign, [
      "authorization", "authority_context", "campaign_index", "run_records"
    ], [], "historical campaign context");
    if (!Array.isArray(campaign.run_records)) {
      throw new Error("Historical campaign run context must be an array.");
    }
    validateCampaignAuthorization(campaign.authorization, campaign.authority_context);
    validateCampaignEvidenceIndex(campaign.campaign_index, {
      authorization: campaign.authorization
    });
    const historicalAuthorizationRef = createExactArtifactReference(campaign.authorization);
    if (!namespaceAuthorizationRefs.has(canonicalizeJson(historicalAuthorizationRef))
      || !namespaceContainsAuthorizationBinding(input.closure_namespace, campaign.authorization)) {
      unresolved.push(unresolvedFinding(
        "AUTHORITY", [historicalAuthorizationRef],
        "historical campaign authorization or its exact manifest binding is absent from the closure namespace"
      ));
    }
    await input.store.readConfigurationManifest(
      campaign.authorization.identity_payload.behavior_manifest_ref,
      validateBehaviorConfigurationManifest
    );
    await input.store.readConfigurationManifest(
      campaign.authorization.identity_payload.evaluation_manifest_ref,
      validateEvaluationConfigurationManifest
    );
    await input.store.readArtifact(
      historicalAuthorizationRef,
      (artifact) => validateCampaignAuthorization(artifact, campaign.authority_context)
    );
    if (campaign.authorization.identity_payload.qualification_plan_ref !== null) {
      await input.store.readArtifact(
        campaign.authorization.identity_payload.qualification_plan_ref,
        (artifact) => validateQualificationPlan(artifact, {
          behaviorManifest: campaign.authority_context.behavior_manifest,
          evaluationManifest: campaign.authority_context.evaluation_manifest
        })
      );
    }
    if (campaign.authorization.identity_payload.qualification_result_ref !== null) {
      await input.store.readArtifact(
        campaign.authorization.identity_payload.qualification_result_ref,
        (artifact) => validateQualificationResult(artifact, {
          plan: campaign.authority_context.qualification_plan,
          behaviorManifest: campaign.authority_context.behavior_manifest,
          evaluationManifest: campaign.authority_context.evaluation_manifest
        })
      );
    }
    await input.store.readArtifact(
      createExactArtifactReference(campaign.campaign_index),
      (artifact) => validateCampaignEvidenceIndex(artifact, {
        authorization: campaign.authorization
      })
    );
    for (const evidenceRef of campaign.campaign_index.identity_payload.evidence_refs) {
      const evidence = await input.store.readArtifact(evidenceRef, validateFormalEvidenceArtifact);
      await verifyDurableEvidence(input.store, evidence);
    }
    for (const decisionRef of campaign.campaign_index.identity_payload.decision_refs) {
      await input.store.readArtifact(decisionRef, (artifact) => validateCanonicalArtifact(
        artifact, { allowedKinds: ["EVALUATION_DECISION"] }
      ));
    }
    const historicalRunRefs = new Set(
      campaign.campaign_index.identity_payload.run_record_refs.map(canonicalizeJson)
    );
    const historicalRuns = [];
    for (const entry of campaign.run_records) {
      const runContext = {
        ...entry.context,
        evidenceArtifacts: entry.context.evidence_artifacts
      };
      const runRef = createExactArtifactReference(entry.record);
      if (!historicalRunRefs.has(canonicalizeJson(runRef))) {
        throw new Error("Historical campaign context imports an unindexed run.");
      }
      await verifyDurableFormalRunRecord(input.store, entry.record, runContext);
      historicalRuns.push(entry.record);
    }
    const historicalValidRuns = historicalRuns.filter(
      (record) => record.identity_payload.run_validity === "VALID"
    );
    const historicalHard = historicalValidRuns.filter(
      (record) => record.identity_payload.invariant_result === "HARD_FAIL"
    );
    const historicalExpectedCount = campaign.authorization.identity_payload.planned_valid_runs_per_path;
    const historicalCountClosed = REQUIRED_PATHS.every((path) => (
      historicalValidRuns.filter((record) => record.identity_payload.path_id === path).length
        === historicalExpectedCount
    ));
    const historicalEarlyHardClosed = historicalHard.length > 0
      && validateEarlyHardFailureClosure(
        campaign.campaign_index.identity_payload.attempt_inventory, historicalHard
      );
    const historicalDispositionOpen = campaign.campaign_index.identity_payload.attempt_inventory.some(
      (entry) => [
        "STARTED_EVIDENCE_PENDING", "ABANDONED_RETAINED",
        "AUTHORITY_INVALIDATED_RETAINED", "SUPERSEDED_RETAINED"
      ].includes(entry.disposition)
    );
    const historicalClosureComplete = campaign.run_records.length === historicalRunRefs.size
      && campaign.campaign_index.identity_payload.campaign_lifecycle === "closed"
      && !historicalDispositionOpen
      && (historicalCountClosed || historicalEarlyHardClosed);
    if (!historicalClosureComplete) {
      unresolved.push(unresolvedFinding(
        "EVIDENCE_UNIVERSE", [createExactArtifactReference(campaign.campaign_index)],
        "historical campaign authority, attempt, or valid-run closure is incomplete"
      ));
      continue;
    }
    const sameBehavior = campaign.authorization.identity_payload.behavior_manifest_ref.behavior_fingerprint
      === input.authorization.identity_payload.behavior_manifest_ref.behavior_fingerprint;
    const sameEvaluation = campaign.authorization.identity_payload.evaluation_manifest_ref.evaluation_fingerprint
      === input.authorization.identity_payload.evaluation_manifest_ref.evaluation_fingerprint;
    if (sameBehavior) historicalHardRuns.push(...historicalHard);
    if (sameBehavior && sameEvaluation) {
      for (const record of historicalValidRuns) {
        for (const obligation of record.identity_payload.obligation_results) {
          if (obligation.pressure === "REQUIRED" && obligation.result !== "PASS") {
            historicalClaimFailures.push({ record, obligation });
          }
        }
      }
    }
  }
  for (const attempt of input.campaign_index.identity_payload.attempt_inventory) {
    if (attempt.run_record_ref === null) continue;
    const record = runByReference.get(canonicalizeJson(attempt.run_record_ref));
    if (!record) continue;
    if ((attempt.disposition === "SEALED_RECORD"
        && record.identity_payload.run_validity !== "VALID")
      || (attempt.disposition === "INVALID_RETAINED"
        && record.identity_payload.run_validity !== "INVALID_UNSCORABLE")) {
      unresolved.push(unresolvedFinding(
        "VALIDITY", [attempt.run_record_ref],
        "attempt disposition conflicts with the sealed run-validity domain"
      ));
    }
  }
  const pathClaimResults = aggregatePathClaims(validRuns);
  const claimClassResults = aggregateClaimClasses(pathClaimResults);
  const currentHardRuns = validRuns.filter(
    (record) => record.identity_payload.invariant_result === "HARD_FAIL"
  );
  const hardRuns = [...currentHardRuns, ...historicalHardRuns];
  const expectedCount = input.authorization.identity_payload.planned_valid_runs_per_path;
  const countDefects = REQUIRED_PATHS.filter((path) => (
    validRuns.filter((record) => record.identity_payload.path_id === path).length !== expectedCount
  ));
  const earlyHardClosed = currentHardRuns.length > 0 && validateEarlyHardFailureClosure(
    input.campaign_index.identity_payload.attempt_inventory, currentHardRuns
  );
  if (countDefects.length > 0 && !earlyHardClosed) {
    unresolved.push(unresolvedFinding(
      "COVERAGE",
      [campaignIndexRef],
      `required valid run count is incomplete or excessive for paths ${countDefects.join(", ")}`
    ));
  }
  const unresolvedDispositions = input.campaign_index.identity_payload.attempt_inventory.filter(
    (entry) => [
      "STARTED_EVIDENCE_PENDING", "ABANDONED_RETAINED",
      "AUTHORITY_INVALIDATED_RETAINED", "SUPERSEDED_RETAINED"
    ].includes(entry.disposition)
  );
  if (unresolvedDispositions.length > 0) {
    unresolved.push(unresolvedFinding(
      "EVIDENCE_UNIVERSE", [campaignIndexRef],
      "campaign contains an unresolved started/abandoned/invalidated/superseded attempt disposition"
    ));
  }
  if (input.campaign_index.identity_payload.campaign_lifecycle !== "closed") {
    unresolved.push(unresolvedFinding(
      "EVIDENCE_UNIVERSE", [campaignIndexRef], "campaign lifecycle is not closed"
    ));
  }
  const unresolvedClosure = uniqueUnresolved(unresolved);
  let boundedResult;
  let decisiveBasis;
  if (unresolvedClosure.length > 0) {
    boundedResult = "NOT_YET_DETERMINABLE";
    decisiveBasis = {
      decisive_kind: "UNRESOLVED_CLOSURE",
      decisive_run_ref: null,
      decisive_finding_digest: null,
      decisive_path: null,
      decisive_claim_class: null,
      statement: unresolvedClosure.map((entry) => entry.statement).join("; ")
    };
  } else if (hardRuns.length > 0) {
    const run = hardRuns.sort((left, right) => left.artifact_id.localeCompare(right.artifact_id))[0];
    const finding = run.identity_payload.failure_findings.find(
      (entry) => entry.failure_kind === "HARD_INVARIANT"
    );
    boundedResult = "BOUNDED_FAIL";
    decisiveBasis = {
      decisive_kind: "HARD_INVARIANT",
      decisive_run_ref: createExactArtifactReference(run),
      decisive_finding_digest: finding.finding_digest,
      decisive_path: run.identity_payload.path_id,
      decisive_claim_class: null,
      statement: `authoritative valid hard invariant ${finding.rule_id} failed on ${run.identity_payload.path_id}`
    };
  } else {
    const nonpassing = pathClaimResults.find((entry) => (
      entry.pressure === "REQUIRED" && entry.result !== "PASS"
    ));
    if (nonpassing) {
      boundedResult = "BOUNDED_FAIL";
      decisiveBasis = {
        decisive_kind: "CLAIM_NONPASS",
        decisive_run_ref: nonpassing.basis_run_refs[0] ?? null,
        decisive_finding_digest: nonpassing.finding_digests[0] ?? null,
        decisive_path: nonpassing.path_id,
        decisive_claim_class: nonpassing.claim_class,
        statement: `${nonpassing.claim_class} is ${nonpassing.result} on ${nonpassing.path_id}`
      };
    } else if (historicalClaimFailures.length > 0) {
      const failure = historicalClaimFailures.sort((left, right) => (
        `${left.record.artifact_id}:${left.obligation.claim_class}`.localeCompare(
          `${right.record.artifact_id}:${right.obligation.claim_class}`
        )
      ))[0];
      const finding = failure.record.identity_payload.failure_findings.find(
        (entry) => entry.finding_id === failure.obligation.finding_ids[0]
      );
      boundedResult = "BOUNDED_FAIL";
      decisiveBasis = {
        decisive_kind: "CLAIM_NONPASS",
        decisive_run_ref: createExactArtifactReference(failure.record),
        decisive_finding_digest: finding.finding_digest,
        decisive_path: failure.record.identity_payload.path_id,
        decisive_claim_class: failure.obligation.claim_class,
        statement: `${failure.obligation.claim_class} remained ${failure.obligation.result} in an authoritative historical campaign under unchanged behavior and evaluation configuration`
      };
    } else {
      boundedResult = "BOUNDED_PASS";
      decisiveBasis = {
        decisive_kind: "ALL_REQUIRED_CLOSURE",
        decisive_run_ref: null,
        decisive_finding_digest: null,
        decisive_path: null,
        decisive_claim_class: null,
        statement: "all required path/claim obligations passed with exact non-pressure closure"
      };
    }
  }
  return {
    boundedResult,
    decisiveBasis: deepFreeze(decisiveBasis),
    pathClaimResults,
    claimClassResults,
    validRunRefs: validRuns.map(createExactArtifactReference).sort(referenceSort),
    invalidRunRefs: invalidRuns.map(createExactArtifactReference).sort(referenceSort),
    hardFailureRefs: hardRuns.map(createExactArtifactReference).sort(referenceSort),
    unresolvedClosure
  };
}

function aggregatePathClaims(validRuns) {
  const entries = [];
  for (const pathId of [...REQUIRED_PATHS].sort()) {
    const pathRuns = validRuns.filter((record) => record.identity_payload.path_id === pathId);
    for (const claimClass of [...REQUIRED_CLAIM_CLASSES].sort()) {
      const pressure = CLAIM_OBLIGATION_MAP[pathId][claimClass] ? "REQUIRED" : "NON_PRESSURE";
      const results = pathRuns.map((record) => record.identity_payload.obligation_results.find(
        (entry) => entry.claim_class === claimClass
      )).filter(Boolean);
      let result = "NOT_APPLICABLE";
      if (pressure === "REQUIRED") {
        if (results.some((entry) => entry.result === "OBLIGATION_FAIL")) result = "OBLIGATION_FAIL";
        else if (results.some((entry) => entry.result === "NOT_REACHED")) result = "NOT_REACHED";
        else if (results.length > 0 && results.every((entry) => entry.result === "PASS")) result = "PASS";
        else result = "NOT_REACHED";
      }
      const findings = pathRuns.flatMap((record) => record.identity_payload.failure_findings.filter(
        (finding) => finding.failure_kind === "OBLIGATION"
          && finding.affected_claim_classes.includes(claimClass)
      ));
      entries.push(deepFreeze({
        path_id: pathId,
        claim_class: claimClass,
        pressure,
        result,
        basis_run_refs: pathRuns.map(createExactArtifactReference).sort(referenceSort),
        finding_digests: findings.map((finding) => finding.finding_digest).sort()
      }));
    }
  }
  return deepFreeze(entries);
}

function aggregateClaimClasses(pathClaimResults) {
  return deepFreeze([...REQUIRED_CLAIM_CLASSES].sort().map((claimClass) => {
    const required = pathClaimResults.filter(
      (entry) => entry.claim_class === claimClass && entry.pressure === "REQUIRED"
    );
    let result = "PASS";
    if (required.some((entry) => entry.result === "OBLIGATION_FAIL")) result = "OBLIGATION_FAIL";
    else if (required.some((entry) => entry.result === "NOT_REACHED")) result = "NOT_REACHED";
    return {
      claim_class: claimClass,
      result,
      required_path_count: required.length,
      evidence_eligible: result === "PASS"
    };
  }));
}

function validateEarlyHardFailureClosure(inventory, hardRuns) {
  const hardRefs = new Map(hardRuns.map((run) => [
    canonicalizeJson(createExactArtifactReference(run)),
    new Set(run.identity_payload.failure_findings.filter(
      (finding) => finding.failure_kind === "HARD_INVARIANT"
    ).map((finding) => finding.finding_digest))
  ]));
  return inventory.every((entry) => {
    if (entry.run_record_ref !== null) return true;
    if (entry.disposition !== "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE") return false;
    const findings = hardRefs.get(canonicalizeJson(
      entry.unused_slot_disposition.decisive_run_ref
    ));
    return findings?.has(entry.unused_slot_disposition.decisive_failure_digest) === true;
  });
}

function validateAdditionalUnresolved(entries) {
  if (!Array.isArray(entries)) throw new Error("Additional unresolved closure must be an array.");
  return entries.map((entry) => {
    assertExactKeys(entry, ["closure_kind", "basis_refs", "statement"], [], "unresolved closure");
    if (!UNRESOLVED_KINDS.includes(entry.closure_kind)) {
      throw new Error("Unresolved closure kind is invalid.");
    }
    validateReferenceList(entry.basis_refs);
    assertNonemptyString(entry.statement, "unresolved closure statement");
    if (/\b(?:failed|failure artifact|passed)\b/i.test(entry.statement)) {
      throw new Error("Indeterminate closure wording cannot attribute pass/failure.");
    }
    return deepFreeze(structuredClone(entry));
  });
}

function unresolvedFinding(closureKind, basisRefs, statement) {
  return deepFreeze({ closure_kind: closureKind, basis_refs: basisRefs, statement });
}

function uniqueUnresolved(entries) {
  const byIdentity = new Map(entries.map((entry) => [canonicalizeJson(entry), entry]));
  return deepFreeze([...byIdentity.values()].sort((left, right) => (
    canonicalizeJson(left).localeCompare(canonicalizeJson(right))
  )));
}

function namespaceContainsAuthorizationBinding(namespace, authorization) {
  const authorizationRef = createExactArtifactReference(authorization);
  const payload = authorization.identity_payload;
  return namespace.identity_payload.campaign_authorization_refs.some(
    (reference) => canonicalizeJson(reference) === canonicalizeJson(authorizationRef)
  ) && namespace.identity_payload.manifest_bindings.some((binding) => (
    canonicalizeJson(binding.campaign_authorization_ref) === canonicalizeJson(authorizationRef)
      && canonicalizeJson(binding.behavior_manifest_ref)
        === canonicalizeJson(payload.behavior_manifest_ref)
      && canonicalizeJson(binding.evaluation_manifest_ref)
        === canonicalizeJson(payload.evaluation_manifest_ref)
  ));
}

function boundedClaim(result, basis) {
  if (result === "BOUNDED_PASS") {
    return deepFreeze({
      summary: "Under synthetic SCN-001 selected-slice fixture/oracle package SCN001-SSFO-V0.2.0, the exact declared behavior and evaluation configuration, and the authoritative formal campaign and evidence cutoff, the tested behavior configuration passed the conjunctive gate across the five mandatory selected-slice claim classes.",
      ceiling: RESULT_CEILING
    });
  }
  if (result === "BOUNDED_FAIL") {
    const earlyHardBoundary = basis.decisive_kind === "HARD_INVARIANT"
      ? " The gate requires all five classes; this decisive global invariant ended the campaign and does not imply that every class was reached."
      : "";
    return deepFreeze({
      summary: `Under synthetic SCN-001 selected-slice fixture/oracle package SCN001-SSFO-V0.2.0, the exact declared behavior and evaluation configuration, and the authoritative formal campaign and evidence cutoff, the tested behavior configuration failed the conjunctive gate across the five mandatory selected-slice claim classes because ${basis.statement}.${earlyHardBoundary}`,
      ceiling: RESULT_CEILING
    });
  }
  return deepFreeze({
    summary: `No bounded pass/fail determination is supported for the exact declared behavior and evaluation configuration because ${basis.statement} remains unresolved. This is campaign indeterminacy, not a SUT failure or pass.`,
    ceiling: INDETERMINATE_CEILING
  });
}

async function namespaceDescendsFrom(store, head, ancestor) {
  let current = head;
  const targetRef = createExactArtifactReference(ancestor);
  const visited = new Set();
  while (true) {
    if (current.content_fingerprint === ancestor.content_fingerprint
      && current.artifact_id === ancestor.artifact_id) return true;
    if (visited.has(current.content_fingerprint)) return false;
    visited.add(current.content_fingerprint);
    const priorRef = current.identity_payload.prior_index_ref;
    if (priorRef === null) return false;
    if (canonicalizeJson(priorRef) === canonicalizeJson(targetRef)) return true;
    current = await store.readArtifact(priorRef, validateAuthorityNamespaceIndex);
  }
}

function validateScoreabilityPolicy(policy) {
  assertExactKeys(policy, [
    "policy_id", "policy_revision", "aggregation_implementation_fingerprint",
    "numeric_scoring", "voting", "class_substitution"
  ], [], "scoreability policy");
  if (policy.policy_id !== "SCN001-BOUNDED-CONJUNCTIVE-V1"
    || policy.policy_revision !== "ADR-012-R3"
    || policy.aggregation_implementation_fingerprint !== AGGREGATION_IMPLEMENTATION_FINGERPRINT
    || policy.numeric_scoring !== false || policy.voting !== false
    || policy.class_substitution !== false) {
    throw new Error("Bounded result scoreability policy is invalid.");
  }
}

function validateSupersession(payload, result, context) {
  if (payload.supersedes_result_ref === null) {
    if (payload.supersession_decision_ref !== null || context.supersedes_result !== null
      || context.supersession_decision !== null) {
      throw new Error("Bounded result supersession fields are inconsistent.");
    }
    return;
  }
  if (!context.supersedes_result || context.supersedes_result.artifact_id === result.artifact_id) {
    throw new Error("Bounded result supersession requires a distinct exact predecessor.");
  }
  resolveExactArtifactReference(payload.supersedes_result_ref, context.supersedes_result, {
    allowedKinds: ["BOUNDED_CAMPAIGN_RESULT"]
  });
  if (payload.supersession_decision_ref === null || !context.supersession_decision) {
    throw new Error("Bounded result supersession requires its accepted standing decision.");
  }
  validateExactArtifactReference(payload.supersession_decision_ref, {
    allowedKinds: ["EVALUATION_DECISION"]
  });
  validateResultStandingDecision(context.supersession_decision, {
    result: context.supersedes_result
  });
  resolveExactArtifactReference(
    payload.supersession_decision_ref, context.supersession_decision,
    { allowedKinds: ["EVALUATION_DECISION"] }
  );
  if (context.supersession_decision.identity_payload.standing !== "SUPERSEDED") {
    throw new Error("Bounded result predecessor lacks accepted SUPERSEDED standing.");
  }
}

async function verifyDurableSupersessionStanding(store, result, headDecision) {
  const decisions = [];
  const visited = new Set();
  let current = headDecision;
  while (true) {
    const currentRef = createExactArtifactReference(current);
    const identity = canonicalizeJson(currentRef);
    if (visited.has(identity)) throw new Error("Durable result standing history has a cycle.");
    visited.add(identity);
    await store.readArtifact(currentRef, validateResultStandingDecision);
    decisions.push(current);
    for (const evidenceRef of [
      ...current.identity_payload.basis_evidence_refs,
      current.identity_payload.review_attestation_ref
    ]) {
      const evidence = await store.readArtifact(evidenceRef, validateFormalEvidenceArtifact);
      await verifyDurableEvidence(store, evidence);
    }
    if (current.identity_payload.prior_standing_ref === null) break;
    current = await store.readArtifact(
      current.identity_payload.prior_standing_ref, validateResultStandingDecision
    );
  }
  const resolvedHead = resolveResultStanding(result, decisions);
  if (canonicalizeJson(createExactArtifactReference(resolvedHead))
      !== canonicalizeJson(createExactArtifactReference(headDecision))
    || resolvedHead.identity_payload.standing !== "SUPERSEDED") {
    throw new Error("Bounded result supersession lacks a durable terminal standing chain.");
  }
}

function validateReferenceList(references, allowedKinds) {
  if (!Array.isArray(references)) throw new Error("Exact reference list must be an array.");
  const identities = [];
  for (const reference of references) {
    validateExactArtifactReference(reference, allowedKinds ? { allowedKinds } : {});
    identities.push(canonicalizeJson(reference));
  }
  assertSortedUniqueStrings(identities, "exact reference list");
}

function buildArtifact(artifactId, artifactKind, payload) {
  assertOpaqueId(artifactId, "bounded scoring artifact_id");
  return deepFreeze({
    artifact_id: artifactId,
    artifact_kind: artifactKind,
    schema_id: ARTIFACT_KIND_SCHEMA[artifactKind],
    schema_revision: 1,
    identity_payload: structuredClone(payload),
    canonicalization_scheme: "RFC8785-JCS",
    canonicalization_revision: 1,
    hash_algorithm: "sha-256",
    hash_domain: ARTIFACT_HASH_DOMAIN[artifactKind],
    content_fingerprint: fingerprintCanonicalJson(ARTIFACT_HASH_DOMAIN[artifactKind], payload)
  });
}

function referenceSort(left, right) {
  return `${left.artifact_kind}:${left.artifact_id}:${left.content_fingerprint}`.localeCompare(
    `${right.artifact_kind}:${right.artifact_id}:${right.content_fingerprint}`
  );
}

function validateDistinctActors(left, right) {
  assertOpaqueId(left, "bounded result producer identity");
  assertOpaqueId(right, "bounded result validator identity");
  if (left === right) throw new Error("Bounded result producer and validator must be distinct.");
}

function validateCreated(createdAt, createdBy) {
  if (typeof createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(createdAt)
    || new Date(createdAt).toISOString().replace(".000Z", "Z") !== createdAt) {
    throw new Error("Bounded scoring time must be an RFC3339 UTC second.");
  }
  assertOpaqueId(createdBy, "bounded scoring actor");
}
