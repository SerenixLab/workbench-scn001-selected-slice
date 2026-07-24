import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertExactKeys,
  assertOpaqueId,
  canonicalizeJson,
  createExactArtifactReference,
  deepFreeze,
  fingerprintCanonicalJson
} from "./formalArtifactIdentity.js";
import {
  REQUIRED_CLAIM_CLASSES,
  allocateReplacementAttempt,
  createInitialRunInvalidityDecision,
  validateCampaignAuthorization,
  validateInitialRunInvalidityDecision
} from "./formalAuthority.js";
import {
  captureAuthenticatedAnchorReceipt,
  createAuthorityNamespaceIndex,
  createCampaignEvidenceIndex,
  qualificationComparatorInputFingerprint,
  qualificationComparatorInputFromTranscript,
  validateAuthorityNamespaceIndex,
  validateCampaignEvidenceIndex,
  validateFormalEvidenceArtifact,
  verifyRunInvalidityObservation
} from "./formalEvidence.js";
import { createBoundedCampaignResult } from "./boundedScoring.js";
import {
  executeFormalSelectedSliceAttempt,
  executeFormalSelectedSliceAttemptForMechanismTest
} from "./selectedSliceFormalPipeline.js";
import { verifyConfigurationManifestsFromCommit } from "./configurationMeasurement.js";

const TRUSTED_RUNTIME_ROOT = realpathSync(resolve(
  dirname(fileURLToPath(import.meta.url)), "../.."
));

export async function executeBoundedSelectedSliceCampaign(input) {
  assertExactKeys(input, [
    ...CAMPAIGN_INPUT_KEYS, "repository_root", "canonical_meta_root"
  ], ["source_commit"], "trusted bounded selected-slice campaign input");
  if (realpathSync(input.repository_root) !== TRUSTED_RUNTIME_ROOT) {
    throw new Error(
      "Trusted campaign measurement root must be the exact loaded evaluator repository."
    );
  }
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

export async function executeBoundedSelectedSliceCampaignForMechanismTest(
  input, options = {}
) {
  assertExactKeys(
    options, [], ["sut_boundary_factory"], "bounded campaign mechanism-test options"
  );
  if (options.sut_boundary_factory !== undefined
    && typeof options.sut_boundary_factory !== "function") {
    throw new Error("Campaign mechanism-test boundary factory must be callable.");
  }
  return executeCampaign(input, options);
}

async function executeCampaign(input, mechanismOptions = null) {
  validateInput(input);
  const authorization = input.authorization;
  const authorizationRef = createExactArtifactReference(authorization);
  const attemptResults = [];
  const attemptQueue = [...authorization.identity_payload.attempt_slots];
  const replacementAllocations = [];
  const invalidityDecisions = [];
  let decisiveHardFailure = null;
  let qualificationDivergence = null;
  let authorityReviewRequired = false;
  let invalidityStopReason = null;
  while (attemptQueue.length > 0) {
    if (decisiveHardFailure !== null || qualificationDivergence !== null
      || authorityReviewRequired || invalidityStopReason !== null) break;
    const slot = attemptQueue.shift();
    const attemptInput = {
      store: input.store,
      authorization,
      authority_context: input.authority_context,
      authorizing_namespace: input.authorizing_namespace,
      anchor_receipt: input.authorization_anchor_receipt,
      anchor_public_key: input.anchor_public_key,
      slot_id: slot.slot_id,
      fresh_start_attestor: input.fresh_start_attestor,
      qualification_evidence_artifacts: input.qualification_evidence_artifacts,
      artifact_namespace: `${input.artifact_namespace}:attempt:${
        String(attemptResults.length + 1).padStart(3, "0")
      }`,
      evidence_producer_identity: input.evidence_producer_identity,
      evidence_validator_identity: input.evidence_validator_identity,
      run_producer_identity: input.run_producer_identity,
      run_validator_identity: input.run_validator_identity,
      sealed_at: input.attempts_sealed_at,
      ...(slot.allocation_kind === "INVALIDITY_DERIVED_REPLACEMENT"
        ? { attempt_allocation: slot }
        : {})
    };
    const boundary = mechanismOptions?.sut_boundary_factory?.(structuredClone(slot));
    const result = boundary === undefined
      ? await executeFormalSelectedSliceAttempt(attemptInput)
      : await executeFormalSelectedSliceAttemptForMechanismTest(attemptInput, boundary);
    attemptResults.push(result);
    if (result.run_record === null) {
      authorityReviewRequired = true;
    } else if (result.run_record.identity_payload.run_validity === "INVALID_UNSCORABLE") {
      if (result.invalidity_evidence_refs.length !== 1) {
        throw new Error("Sealed invalid attempt requires one exact replayable observation.");
      }
      const invalidityEvidence = await input.store.readArtifact(
        result.invalidity_evidence_refs[0],
        validateFormalEvidenceArtifact
      );
      await verifyRunInvalidityObservation(input.store, invalidityEvidence, {
        attempt_id: result.slot.attempt_id,
        path_id: result.slot.path_id,
        reason_code: result.invalidity.reason_code
      });
      const consequence = invalidityConsequence(
        invalidityDecisions, result.slot.path_id, result.invalidity.reason_code
      );
      const invalidityDecision = createInitialRunInvalidityDecision({
        artifact_id: `${input.artifact_namespace}:invalidity:${
          String(invalidityDecisions.length + 1).padStart(3, "0")
        }`,
        campaign_authorization: authorization,
        run_record_ref: createExactArtifactReference(result.run_record),
        attempt_allocation: result.run_record.identity_payload.attempt_allocation,
        attempt_id: result.slot.attempt_id,
        path_id: result.slot.path_id,
        reason_code: result.invalidity.reason_code,
        basis_evidence_refs: result.invalidity_evidence_refs.slice().sort(referenceSort),
        evaluator_identity: input.campaign_actor_identity,
        validator_identity: input.index_validator_identity,
        validator_result: "CONFIRMED",
        replacement_eligible: consequence.replacementEligible,
        campaign_consequence: consequence.campaignConsequence,
        decided_at: input.index_frozen_at,
        decided_by: input.index_validator_identity
      });
      await input.store.writeArtifact(
        invalidityDecision,
        (artifact) => validateInitialRunInvalidityDecision(artifact, authorization)
      );
      invalidityDecisions.push(invalidityDecision);
      if (consequence.replacementEligible) {
        const replacement = allocateReplacementAttempt({
          authorization,
          invalidity_decisions: invalidityDecisions,
          target_decision: invalidityDecision
        });
        replacementAllocations.push(replacement);
        attemptQueue.unshift(replacement);
      } else {
        invalidityStopReason = consequence.stopReason;
      }
    } else if (result.run_record.identity_payload.invariant_result === "HARD_FAIL") {
      decisiveHardFailure = result;
    } else {
      qualificationDivergence = detectQualificationDivergence(
        input.authority_context, result
      );
    }
  }
  const allSlots = [
    ...authorization.identity_payload.attempt_slots,
    ...authorization.identity_payload.contingency_slots,
    ...replacementAllocations
  ];
  const campaignDecisions = [
    ...input.campaign_decisions,
    ...invalidityDecisions
  ];
  if (qualificationDivergence !== null) {
    return deepFreeze({
      execution_status: "QUALIFICATION_DIVERGENCE_REQUIRES_ACCEPTED_DECISION",
      attempt_results: attemptResults,
      qualification_divergence: qualificationDivergence,
      required_decision: requiredQualificationDivergenceDecision(
        input.authority_context, qualificationDivergence
      ),
      campaign_index: null,
      closure_namespace: null,
      closure_receipt: null,
      bounded_result: null,
      standing_decision: null,
      claim_authorized: false
    });
  }
  const inventory = allSlots.map((slot) => inventoryEntry(
    slot, attemptResults, decisiveHardFailure, authorizationRef,
    input.campaign_actor_identity, input.index_frozen_at, invalidityDecisions
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
    decision_refs: campaignDecisions.map(createExactArtifactReference)
      .sort(referenceSort),
    anchor_receipt_refs: [createExactArtifactReference(input.authorization_anchor_receipt)],
    qualification_plan_ref: authorization.identity_payload.qualification_plan_ref,
    qualification_result_ref: authorization.identity_payload.qualification_result_ref,
    prior_index: null,
    campaign_lifecycle: campaignLifecycle(
      attemptResults, decisiveHardFailure, invalidityStopReason
    ),
    lifecycle_reason: campaignLifecycleReason(
      attemptResults, decisiveHardFailure, invalidityStopReason
    ),
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
    campaign_decisions: campaignDecisions,
    qualification_evidence_artifacts: input.qualification_evidence_artifacts,
    historical_campaigns: input.historical_campaigns,
    additional_unresolved_closure: input.additional_unresolved_closure,
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

function inventoryEntry(
  slot, results, hardFailure, authorizationRef, actor, recordedAt, invalidityDecisions
) {
  const result = results.find((candidate) => candidate.slot.attempt_id === slot.attempt_id);
  const replacementAllocation = slot.allocation_kind === "INVALIDITY_DERIVED_REPLACEMENT"
    ? structuredClone(slot)
    : null;
  const invalidityDecision = invalidityDecisions.find((decision) => (
    decision.identity_payload.attempt_id === slot.attempt_id
  ));
  if (result?.run_record?.identity_payload.run_validity === "INVALID_UNSCORABLE") {
    return {
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      disposition: "INVALID_RETAINED",
      run_record_ref: createExactArtifactReference(result.run_record),
      evidence_refs: result.evidence_refs.slice().sort(referenceSort),
      invalidity_decision_ref: createExactArtifactReference(invalidityDecision),
      replacement_allocation: replacementAllocation,
      unused_slot_disposition: null
    };
  }
  if (result?.run_record) return {
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    disposition: "SEALED_RECORD",
    run_record_ref: createExactArtifactReference(result.run_record),
    evidence_refs: result.evidence_refs.slice().sort(referenceSort),
    invalidity_decision_ref: null,
    replacement_allocation: replacementAllocation,
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

function campaignLifecycle(results, hardFailure, invalidityStopReason) {
  if (hardFailure !== null) return "closed";
  if (invalidityStopReason !== null) return "suspended";
  return results.some((result) => result.run_record === null) ? "suspended" : "closed";
}

function campaignLifecycleReason(results, hardFailure, invalidityStopReason) {
  if (hardFailure !== null) return "authoritative_global_hard_failure";
  if (invalidityStopReason !== null) return invalidityStopReason;
  return results.some((result) => result.run_record === null)
    ? "authority_review_required"
    : "planned_attempt_set_closed";
}

function invalidityConsequence(priorDecisions, pathId, reasonCode) {
  const history = [
    ...priorDecisions.map((decision) => decision.identity_payload),
    { path_id: pathId, reason_code: reasonCode }
  ];
  const pathCount = history.filter((entry) => entry.path_id === pathId).length;
  const sameRootCount = history.filter((entry) => (
    entry.path_id === pathId && entry.reason_code === reasonCode
  )).length;
  const replacementEligible = pathCount <= 2
    && sameRootCount < 2
    && history.length < 3;
  return {
    replacementEligible,
    campaignConsequence: replacementEligible
      ? "CONTINUE_WITH_REPLACEMENT"
      : "SUSPEND_FOR_REVIEW",
    stopReason: replacementEligible
      ? null
      : sameRootCount >= 2
        ? "repeated_invalidity_root_cause"
        : "invalid_attempt_limit_reached"
  };
}

function detectQualificationDivergence(authorityContext, attemptResult) {
  if (authorityContext.qualification_result?.identity_payload.result !== "QUALIFIED"
    || attemptResult.execution_status !== "SEALED") {
    return null;
  }
  const expected = authorityContext.qualification_result.identity_payload.executions.filter(
    (execution) => execution.path_id === attemptResult.slot.path_id
  ).map((execution) => execution.comparator_input_digest);
  if (expected.length !== 2 || new Set(expected).size !== 1) {
    throw new Error("Qualified campaign lacks one closed comparator baseline per path.");
  }
  const observed = qualificationComparatorInputFingerprint(
    qualificationComparatorInputFromTranscript(attemptResult.transcript)
  );
  if (observed === expected[0]) return null;
  return deepFreeze({
    path_id: attemptResult.slot.path_id,
    attempt_id: attemptResult.slot.attempt_id,
    run_record_ref: createExactArtifactReference(attemptResult.run_record),
    qualification_result_ref: createExactArtifactReference(
      authorityContext.qualification_result
    ),
    expected_comparator_input_digest: expected[0],
    observed_comparator_input_digest: observed,
    basis_delta_digest: qualificationDivergenceBasisDigest(
      authorityContext, attemptResult, expected[0], observed
    )
  });
}

function qualificationDivergenceBasisDigest(
  authorityContext, attemptResult, expectedDigest, observedDigest
) {
  return fingerprintCanonicalJson("zoey:post-qualification-divergence:v1", {
    qualification_result_ref: createExactArtifactReference(
      authorityContext.qualification_result
    ),
    path_id: attemptResult.slot.path_id,
    attempt_id: attemptResult.slot.attempt_id,
    run_record_ref: createExactArtifactReference(attemptResult.run_record),
    expected_comparator_input_digest: expectedDigest,
    observed_comparator_input_digest: observedDigest
  });
}

function requiredQualificationDivergenceDecision(authorityContext, divergence) {
  return {
    decision_kind: "QUALIFICATION_RESULT_CORRECTION",
    subject_ref: createExactArtifactReference(authorityContext.qualification_result),
    reason_code: "deterministic_qualification_invalidated",
    original_disposition: "QUALIFIED",
    replacement_disposition: "INVALIDATED_BY_POST_QUALIFICATION_DIVERGENCE",
    basis_delta_digest: divergence.basis_delta_digest,
    affected_claims: [...REQUIRED_CLAIM_CLASSES].sort(),
    required_authority: "INDEPENDENT_REVIEW_AND_OWNER_ACCEPTANCE"
  };
}

const CAMPAIGN_INPUT_KEYS = Object.freeze([
  "store", "authorization", "authority_context", "authorizing_namespace",
  "authorization_anchor_receipt", "anchor_public_key", "fresh_start_attestor",
  "closure_receipt_attestor", "qualification_evidence_artifacts", "campaign_decisions",
  "historical_campaigns", "additional_unresolved_closure", "artifact_namespace",
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
  for (const [field, value] of [
    ["campaign_decisions", input.campaign_decisions],
    ["historical_campaigns", input.historical_campaigns],
    ["additional_unresolved_closure", input.additional_unresolved_closure]
  ]) {
    if (!Array.isArray(value)) {
      throw new Error(`Bounded campaign ${field} must be an explicit closed array.`);
    }
  }
  const indexedHistory = new Set(
    input.authorizing_namespace.identity_payload.campaign_index_refs.map(canonicalizeJson)
  );
  const suppliedHistory = new Set(input.historical_campaigns.map((campaign) => {
    if (campaign === null || typeof campaign !== "object"
      || campaign.campaign_index === undefined) {
      throw new Error("Historical campaign context lacks its exact campaign index.");
    }
    return canonicalizeJson(createExactArtifactReference(campaign.campaign_index));
  }));
  if (indexedHistory.size !== suppliedHistory.size
    || [...indexedHistory].some((reference) => !suppliedHistory.has(reference))) {
    throw new Error(
      "Bounded campaign history context must close every prior indexed campaign exactly."
    );
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
