import {
  assertExactKeys,
  assertOpaqueId,
  createExactArtifactReference,
  deepFreeze
} from "./formalArtifactIdentity.js";
import { validateCampaignAuthorization } from "./formalAuthority.js";
import {
  captureAuthenticatedAnchorReceipt,
  createAuthorityNamespaceIndex,
  createCampaignEvidenceIndex,
  validateAuthorityNamespaceIndex,
  validateCampaignEvidenceIndex
} from "./formalEvidence.js";
import { createBoundedCampaignResult } from "./boundedScoring.js";
import { executeFormalSelectedSliceAttempt } from "./selectedSliceFormalPipeline.js";
import { verifyConfigurationManifestsFromCommit } from "./configurationMeasurement.js";

export async function executeBoundedSelectedSliceCampaign(input) {
  assertExactKeys(input, [
    ...CAMPAIGN_INPUT_KEYS, "repository_root", "canonical_meta_root"
  ], ["source_commit"], "trusted bounded selected-slice campaign input");
  await verifyConfigurationManifestsFromCommit({
    repository_root: input.repository_root,
    canonical_meta_root: input.canonical_meta_root,
    source_commit: input.source_commit,
    behavior_manifest: input.authority_context.behavior_manifest,
    evaluation_manifest: input.authority_context.evaluation_manifest
  });
  if (input.authorization.identity_payload.run_count_branch !== "NONDETERMINISTIC_THREE"
    || input.authorization.identity_payload.qualification_plan_ref !== null
    || input.authorization.identity_payload.qualification_result_ref !== null) {
    throw new Error("Trusted V1 campaigns require measured conservative authorization.");
  }
  const {
    repository_root: ignoredRepositoryRoot,
    canonical_meta_root: ignoredCanonicalMetaRoot,
    source_commit: ignoredSourceCommit,
    ...campaignInput
  } = input;
  void ignoredRepositoryRoot;
  void ignoredCanonicalMetaRoot;
  void ignoredSourceCommit;
  return executeCampaign(campaignInput);
}

export async function executeBoundedSelectedSliceCampaignForMechanismTest(input) {
  return executeCampaign(input);
}

async function executeCampaign(input) {
  validateInput(input);
  const authorization = input.authorization;
  const authorizationRef = createExactArtifactReference(authorization);
  const allSlots = [
    ...authorization.identity_payload.attempt_slots,
    ...authorization.identity_payload.contingency_slots
  ];
  const attemptResults = [];
  let decisiveHardFailure = null;
  for (const slot of authorization.identity_payload.attempt_slots) {
    if (decisiveHardFailure !== null) break;
    const result = await executeFormalSelectedSliceAttempt({
      store: input.store,
      authorization,
      authority_context: input.authority_context,
      authorizing_namespace: input.authorizing_namespace,
      anchor_receipt: input.authorization_anchor_receipt,
      anchor_public_key: input.anchor_public_key,
      slot_id: slot.slot_id,
      fresh_start_attestor: input.fresh_start_attestor,
      qualification_evidence_artifacts: input.qualification_evidence_artifacts,
      artifact_namespace: `${input.artifact_namespace}:attempt:${slot.attempt_id}`,
      evidence_producer_identity: input.evidence_producer_identity,
      evidence_validator_identity: input.evidence_validator_identity,
      run_producer_identity: input.run_producer_identity,
      run_validator_identity: input.run_validator_identity,
      sealed_at: input.attempts_sealed_at
    });
    attemptResults.push(result);
    if (result.run_record?.identity_payload.invariant_result === "HARD_FAIL") {
      decisiveHardFailure = result;
    }
  }
  const inventory = allSlots.map((slot) => inventoryEntry(
    slot, attemptResults, decisiveHardFailure, authorizationRef,
    input.campaign_actor_identity, input.index_frozen_at
  ));
  const evidenceArtifacts = [
    input.authorization_anchor_receipt,
    ...attemptResults.flatMap((result) => result.evidence_artifacts)
  ];
  const runEntries = attemptResults.filter((result) => result.run_record !== null).map(
    (result) => ({ record: result.run_record, context: result.run_record_context })
  );
  const campaignIndex = createCampaignEvidenceIndex({
    artifact_id: input.campaign_index_artifact_id,
    campaign_authorization: authorization,
    authorizing_namespace: input.authorizing_namespace,
    attempt_inventory: inventory,
    evidence_refs: evidenceArtifacts.map(createExactArtifactReference).sort(referenceSort),
    run_record_refs: runEntries.map((entry) => createExactArtifactReference(entry.record))
      .sort(referenceSort),
    decision_refs: [],
    anchor_receipt_refs: [createExactArtifactReference(input.authorization_anchor_receipt)],
    qualification_plan_ref: authorization.identity_payload.qualification_plan_ref,
    qualification_result_ref: authorization.identity_payload.qualification_result_ref,
    prior_index: null,
    campaign_lifecycle: campaignLifecycle(attemptResults, decisiveHardFailure),
    lifecycle_reason: campaignLifecycleReason(attemptResults, decisiveHardFailure),
    cutoff_label: input.campaign_cutoff_label,
    producer_identity: input.index_producer_identity,
    validator_identity: input.index_validator_identity,
    validation_result: "VALIDATED",
    frozen_at: input.index_frozen_at,
    frozen_by: input.index_validator_identity
  });
  await input.store.writeArtifact(campaignIndex, (artifact) => validateCampaignEvidenceIndex(
    artifact, { authorization }
  ));
  const closureNamespace = createClosureNamespace(input, campaignIndex);
  await input.store.writeArtifact(closureNamespace, validateAuthorityNamespaceIndex);
  const receiptRequest = deepFreeze({
    profile: authorization.identity_payload.anchor_requirement.profile,
    authority_subject_ref: authorizationRef,
    namespace_index_ref: createExactArtifactReference(closureNamespace),
    authority_ref: authorization.identity_payload.anchor_requirement.authority_ref,
    observed_predecessor: input.authorization_anchor_receipt.identity_payload.semantic_envelope
      .external_commit_sha
  });
  const rawReceipt = await input.closure_receipt_attestor(receiptRequest);
  const closureReceipt = await captureAuthenticatedAnchorReceipt(input.store, {
    artifact_id: input.closure_receipt_artifact_id,
    raw_receipt_bytes: rawReceipt,
    anchor_requirement: authorization.identity_payload.anchor_requirement,
    public_key: input.anchor_public_key,
    expected_authority_subject_ref: authorizationRef,
    expected_namespace_index_ref: createExactArtifactReference(closureNamespace),
    campaign_authorization_ref: authorizationRef,
    validator_identity: input.receipt_validator_identity,
    sealed_at: input.closure_receipt_sealed_at
  });
  const boundedResult = await createBoundedCampaignResult({
    store: input.store,
    artifact_id: input.bounded_result_artifact_id,
    result_id: input.bounded_result_id,
    authorization,
    authority_context: input.authority_context,
    campaign_index: campaignIndex,
    closure_namespace: closureNamespace,
    closure_receipt: closureReceipt,
    anchor_public_key: input.anchor_public_key,
    run_records: runEntries,
    campaign_decisions: [],
    qualification_evidence_artifacts: input.qualification_evidence_artifacts,
    historical_campaigns: [],
    additional_unresolved_closure: [],
    producer_identity: input.result_producer_identity,
    validator_identity: input.result_validator_identity,
    validation_result: "VALIDATED",
    created_at: input.result_created_at,
    created_by: input.result_producer_identity,
    supersedes_result: null,
    supersession_decision: null
  });
  return deepFreeze({
    execution_status: "RESULT_PENDING_OWNER_STANDING",
    attempt_results: attemptResults,
    campaign_index: campaignIndex,
    closure_namespace: closureNamespace,
    closure_receipt: closureReceipt,
    bounded_result: boundedResult,
    standing_decision: null,
    claim_authorized: false
  });
}

function inventoryEntry(slot, results, hardFailure, authorizationRef, actor, recordedAt) {
  const result = results.find((candidate) => candidate.slot.attempt_id === slot.attempt_id);
  if (result?.run_record) return {
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    disposition: "SEALED_RECORD",
    run_record_ref: createExactArtifactReference(result.run_record),
    evidence_refs: result.evidence_refs.slice().sort(referenceSort),
    invalidity_decision_ref: null,
    replacement_allocation: null,
    unused_slot_disposition: null
  };
  if (result !== undefined) return {
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    disposition: result.attempt_disposition,
    run_record_ref: null,
    evidence_refs: result.evidence_refs.slice().sort(referenceSort),
    invalidity_decision_ref: null,
    replacement_allocation: null,
    unused_slot_disposition: null
  };
  if (hardFailure !== null) {
    const finding = hardFailure.run_record.identity_payload.failure_findings.find(
      (candidate) => candidate.failure_kind === "HARD_INVARIANT"
    );
    return {
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      disposition: "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE",
      run_record_ref: null,
      evidence_refs: [],
      invalidity_decision_ref: null,
      replacement_allocation: null,
      unused_slot_disposition: {
        disposition_kind: "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE",
        campaign_authorization_ref: authorizationRef,
        decisive_run_ref: createExactArtifactReference(hardFailure.run_record),
        basis_decision_ref: null,
        decisive_failure_digest: finding.finding_digest,
        actor_identity: actor,
        recorded_at: recordedAt,
        material_output_observed: false
      }
    };
  }
  return {
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    disposition: "UNSTARTED_NOT_ACTIVATED",
    run_record_ref: null,
    evidence_refs: [],
    invalidity_decision_ref: null,
    replacement_allocation: null,
    unused_slot_disposition: null
  };
}

function createClosureNamespace(input, campaignIndex) {
  const prior = input.authorizing_namespace.identity_payload;
  return createAuthorityNamespaceIndex({
    artifact_id: input.closure_namespace_artifact_id,
    namespace_id: prior.namespace_id,
    revision: prior.revision + 1,
    authority_identity: prior.authority_identity,
    prior_index: input.authorizing_namespace,
    prior_index_receipt_ref: createExactArtifactReference(input.authorization_anchor_receipt),
    qualification_plan_refs: prior.qualification_plan_refs,
    qualification_result_refs: prior.qualification_result_refs,
    campaign_authorization_refs: prior.campaign_authorization_refs,
    campaign_index_refs: [
      ...prior.campaign_index_refs,
      createExactArtifactReference(campaignIndex)
    ].sort(referenceSort),
    bounded_result_refs: prior.bounded_result_refs,
    decision_refs: prior.decision_refs,
    anchor_receipt_refs: [
      ...prior.anchor_receipt_refs,
      createExactArtifactReference(input.authorization_anchor_receipt)
    ].sort(referenceSort),
    manifest_bindings: prior.manifest_bindings,
    anchor_declarations: prior.anchor_declarations,
    cutoff_label: input.namespace_cutoff_label,
    producer_identity: prior.authority_identity,
    validator_identity: input.namespace_validator_identity,
    validation_result: "VALIDATED",
    created_at: input.namespace_created_at,
    created_by: prior.authority_identity
  });
}

function campaignLifecycle(results, hardFailure) {
  if (hardFailure !== null) return "closed";
  return results.some((result) => result.run_record === null) ? "suspended" : "closed";
}

function campaignLifecycleReason(results, hardFailure) {
  if (hardFailure !== null) return "authoritative_global_hard_failure";
  return results.some((result) => result.run_record === null)
    ? "authority_review_required"
    : "planned_attempt_set_closed";
}

const CAMPAIGN_INPUT_KEYS = Object.freeze([
  "store", "authorization", "authority_context", "authorizing_namespace",
  "authorization_anchor_receipt", "anchor_public_key", "fresh_start_attestor",
  "closure_receipt_attestor", "qualification_evidence_artifacts", "artifact_namespace",
  "campaign_index_artifact_id", "closure_namespace_artifact_id",
  "closure_receipt_artifact_id", "bounded_result_artifact_id", "bounded_result_id",
  "campaign_cutoff_label", "namespace_cutoff_label", "evidence_producer_identity",
  "evidence_validator_identity", "run_producer_identity", "run_validator_identity",
  "index_producer_identity", "index_validator_identity", "namespace_validator_identity",
  "receipt_validator_identity", "result_producer_identity", "result_validator_identity",
  "campaign_actor_identity", "attempts_sealed_at", "index_frozen_at",
  "namespace_created_at", "closure_receipt_sealed_at", "result_created_at"
]);

function validateInput(input) {
  assertExactKeys(input, CAMPAIGN_INPUT_KEYS, [], "bounded selected-slice campaign input");
  validateCampaignAuthorization(input.authorization, input.authority_context);
  validateAuthorityNamespaceIndex(input.authorizing_namespace);
  if (typeof input.fresh_start_attestor !== "function"
    || typeof input.closure_receipt_attestor !== "function") {
    throw new Error("Bounded campaign requires external start and closure attestors.");
  }
  for (const field of [
    "artifact_namespace", "campaign_index_artifact_id", "closure_namespace_artifact_id",
    "closure_receipt_artifact_id", "bounded_result_artifact_id", "bounded_result_id",
    "campaign_cutoff_label", "namespace_cutoff_label", "evidence_producer_identity",
    "evidence_validator_identity", "run_producer_identity", "run_validator_identity",
    "index_producer_identity", "index_validator_identity", "namespace_validator_identity",
    "receipt_validator_identity", "result_producer_identity", "result_validator_identity",
    "campaign_actor_identity"
  ]) assertOpaqueId(input[field], `bounded campaign ${field}`);
}

function referenceSort(left, right) {
  return `${left.artifact_kind}:${left.artifact_id}:${left.content_fingerprint}`.localeCompare(
    `${right.artifact_kind}:${right.artifact_id}:${right.content_fingerprint}`
  );
}
