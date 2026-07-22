import assert from "node:assert/strict";
import test from "node:test";

import {
  ARTIFACT_HASH_DOMAIN,
  createExactArtifactReference,
  fingerprintCanonicalJson
} from "../src/formalArtifactIdentity.js";
import {
  createMaterialAuthorityDecision,
  REQUIRED_CLAIM_CLASSES,
  validateMaterialAuthorityDecision
} from "../src/formalAuthority.js";
import {
  createAuthorityNamespaceIndex,
  createCampaignEvidenceIndex,
  captureAuthenticatedAnchorReceipt,
  captureFormalEvidence,
  validateAuthorityNamespaceIndex,
  validateCampaignEvidenceIndex,
  validateFormalEvidenceArtifact
} from "../src/formalEvidence.js";
import { createFailureFinding } from "../src/formalRunRecord.js";
import {
  createClaimInvalidationDecision,
  createBoundedCampaignResult,
  createResultIndexingNamespace,
  createResultStandingDecision,
  resolveBoundedResultAuthority,
  resolveClaimInvalidationAuthority,
  resolveClaimInvalidationHistory,
  resolveResultStanding,
  validateBoundedCampaignResult,
  validateClaimInvalidationDecision,
  validateResultStandingDecision
} from "../src/boundedScoring.js";
import {
  createFormalCampaignFixture,
  createSealedRun,
  passObligations,
  sha256
} from "../test_support/formalCampaignFixtures.js";
import { digest } from "../test_support/formalFixtures.js";
import { createFixtureAnchorReceiptBytes } from "../test_support/anchorFixture.js";

test("complete conjunctive closure produces a pending bounded pass", async () => {
  const campaign = await completeCampaign("PASS");
  const result = await createBoundedCampaignResult(resultInput(campaign));
  assert.equal(result.identity_payload.bounded_result, "BOUNDED_PASS");
  assert.equal(result.identity_payload.claim_class_results.length, 5);
  assert(result.identity_payload.claim_class_results.every(
    (entry) => entry.result === "PASS" && entry.evidence_eligible
  ));
  assert.equal(result.identity_payload.path_claim_results.length, 20);
  assert.equal(result.identity_payload.authority_status,
    "RESULT_AUTHORITY_PENDING_INDEX_CLOSURE");
  assert.match(result.identity_payload.bounded_claim.ceiling, /does not establish full SCN-001/);
  assert.match(result.identity_payload.bounded_claim.claim_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(
    result.identity_payload.attempt_inventory,
    campaign.campaignIndex.identity_payload.attempt_inventory
  );
  assert.deepEqual(result.identity_payload.pre_result_cutoff, {
    namespace_revision: campaign.closureNamespace.identity_payload.revision,
    cutoff_label: campaign.closureNamespace.identity_payload.cutoff_label
  });
});

test("missing valid coverage remains indeterminate and never becomes bounded failure", async () => {
  const campaign = await completeCampaign("MISSING_COVERAGE");
  const result = await createBoundedCampaignResult(resultInput(campaign));
  assert.equal(result.identity_payload.bounded_result, "NOT_YET_DETERMINABLE");
  assert.match(result.identity_payload.bounded_claim.summary, /indeterminacy, not a SUT failure or pass/);
  assert(!result.identity_payload.bounded_claim.summary.includes("tested behavior configuration failed"));
});

test("an un-attributed campaign index in the namespace blocks favorable aggregation", async () => {
  const campaign = await completeCampaign("PASS");
  const extraIndex = structuredClone(campaign.campaignIndex);
  extraIndex.artifact_id = "artifact:campaign-index:unattributed-history";
  await campaign.setup.store.writeArtifact(extraIndex, (artifact) => validateCampaignEvidenceIndex(
    artifact, { authorization: campaign.setup.campaignAuthorization }
  ));
  const prior = campaign.closureNamespace.identity_payload;
  const expandedNamespace = createAuthorityNamespaceIndex({
    artifact_id: "artifact:namespace-index:unattributed-history:004",
    namespace_id: prior.namespace_id,
    revision: 4,
    authority_identity: prior.authority_identity,
    prior_index: campaign.closureNamespace,
    prior_index_receipt_ref: createExactArtifactReference(campaign.closureReceipt),
    qualification_plan_refs: prior.qualification_plan_refs,
    qualification_result_refs: prior.qualification_result_refs,
    campaign_authorization_refs: prior.campaign_authorization_refs,
    campaign_index_refs: [
      createExactArtifactReference(campaign.campaignIndex),
      createExactArtifactReference(extraIndex)
    ].sort(referenceSort),
    bounded_result_refs: [],
    decision_refs: [],
    anchor_receipt_refs: [
      ...prior.anchor_receipt_refs,
      createExactArtifactReference(campaign.closureReceipt)
    ].sort(referenceSort),
    manifest_bindings: prior.manifest_bindings,
    anchor_declarations: prior.anchor_declarations,
    cutoff_label: "namespace:unattributed-history:004",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T15:50:00Z",
    created_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(expandedNamespace, validateAuthorityNamespaceIndex);
  const expandedReceipt = await namespaceReceipt(
    campaign.setup, expandedNamespace, "unattributed-history", "2026-07-21T15:55:00Z"
  );
  const input = {
    ...resultInput(campaign),
    artifact_id: "artifact:bounded-result:unattributed-history",
    result_id: "result:bounded:unattributed-history",
    closure_namespace: expandedNamespace,
    closure_receipt: expandedReceipt
  };
  const result = await createBoundedCampaignResult(input);
  assert.equal(result.identity_payload.bounded_result, "NOT_YET_DETERMINABLE");
  assert.match(result.identity_payload.decisive_basis.statement, /not every campaign index/);
});

test("closed historical non-pressure results cannot manufacture a later failure", async () => {
  const campaign = await completeCampaign("PASS");
  const historicalIndex = structuredClone(campaign.campaignIndex);
  historicalIndex.artifact_id = "artifact:campaign-index:closed-history";
  await campaign.setup.store.writeArtifact(
    historicalIndex,
    (artifact) => validateCampaignEvidenceIndex(artifact, {
      authorization: campaign.setup.campaignAuthorization
    })
  );
  const prior = campaign.closureNamespace.identity_payload;
  const expandedNamespace = createAuthorityNamespaceIndex({
    artifact_id: "artifact:namespace-index:closed-history:004",
    namespace_id: prior.namespace_id,
    revision: 4,
    authority_identity: prior.authority_identity,
    prior_index: campaign.closureNamespace,
    prior_index_receipt_ref: createExactArtifactReference(campaign.closureReceipt),
    qualification_plan_refs: prior.qualification_plan_refs,
    qualification_result_refs: prior.qualification_result_refs,
    campaign_authorization_refs: prior.campaign_authorization_refs,
    campaign_index_refs: [
      createExactArtifactReference(campaign.campaignIndex),
      createExactArtifactReference(historicalIndex)
    ].sort(referenceSort),
    bounded_result_refs: [],
    decision_refs: [],
    anchor_receipt_refs: [
      ...prior.anchor_receipt_refs,
      createExactArtifactReference(campaign.closureReceipt)
    ].sort(referenceSort),
    manifest_bindings: prior.manifest_bindings,
    anchor_declarations: prior.anchor_declarations,
    cutoff_label: "namespace:closed-history:004",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T15:50:00Z",
    created_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(expandedNamespace, validateAuthorityNamespaceIndex);
  const expandedReceipt = await namespaceReceipt(
    campaign.setup, expandedNamespace, "closed-history", "2026-07-21T15:55:00Z"
  );
  const input = {
    ...resultInput(campaign),
    artifact_id: "artifact:bounded-result:closed-history",
    result_id: "result:bounded:closed-history",
    closure_namespace: expandedNamespace,
    closure_receipt: expandedReceipt,
    historical_campaigns: [{
      authorization: campaign.setup.campaignAuthorization,
      authority_context: campaign.setup.authorityContext,
      campaign_index: historicalIndex,
      run_records: campaign.runs,
      campaign_decisions: [],
      qualification_evidence_artifacts: campaign.setup.qualificationEvidenceArtifacts,
      anchor_public_key: campaign.setup.anchorPublicKey
    }]
  };
  const result = await createBoundedCampaignResult(input);
  assert.equal(result.identity_payload.bounded_result, "BOUNDED_PASS");
});

test("NOT_QUALIFIED mechanically requires three conjunctive runs per path", async () => {
  const campaign = await completeCampaign("THREE_RUN_PASS", {
    qualification: "NOT_QUALIFIED"
  });
  const result = await createBoundedCampaignResult(resultInput(campaign));
  assert.equal(result.identity_payload.run_count_branch, "CONSERVATIVE_THREE");
  assert.equal(result.identity_payload.planned_valid_runs_per_path, 3);
  assert.equal(result.identity_payload.valid_run_refs.length, 12);
  assert.equal(result.identity_payload.bounded_result, "BOUNDED_PASS");
});

test("three-run aggregation is conjunctive and cannot outvote one obligation failure", async () => {
  const campaign = await completeCampaign("THREE_RUN_ONE_FAIL", {
    qualification: "NOT_QUALIFIED"
  });
  const result = await createBoundedCampaignResult(resultInput(campaign));
  assert.equal(result.identity_payload.valid_run_refs.length, 12);
  assert.equal(result.identity_payload.bounded_result, "BOUNDED_FAIL");
  assert.equal(result.identity_payload.decisive_basis.decisive_kind, "CLAIM_NONPASS");
});

test("one authoritative hard failure closes early only with exact never-started dispositions", async () => {
  const campaign = await completeCampaign("EARLY_HARD_FAIL");
  const result = await createBoundedCampaignResult(resultInput(campaign));
  assert.equal(result.identity_payload.bounded_result, "BOUNDED_FAIL");
  assert.equal(result.identity_payload.decisive_basis.decisive_kind, "HARD_INVARIANT");
  assert.match(result.identity_payload.bounded_claim.summary, /does not imply that every class was reached/);

  const defective = await completeCampaign("EARLY_HARD_FAIL", { cancelAllUnused: false });
  const unresolved = await createBoundedCampaignResult(resultInput(defective));
  assert.equal(unresolved.identity_payload.bounded_result, "NOT_YET_DETERMINABLE");
});

test("aggregation is independently recomputed and rejects weighted or favorable rewrites", async () => {
  const campaign = await completeCampaign("PASS");
  const input = resultInput(campaign);
  const result = await createBoundedCampaignResult(input);
  const weighted = structuredClone(result);
  weighted.identity_payload.scoreability_policy.numeric_scoring = true;
  resign(weighted);
  await assert.rejects(
    () => validateBoundedCampaignResult(weighted, input),
    /scoreability policy is invalid/
  );

  const favorable = structuredClone(result);
  favorable.identity_payload.path_claim_results[0].result = "OBLIGATION_FAIL";
  favorable.identity_payload.bounded_result = "BOUNDED_PASS";
  resign(favorable);
  await assert.rejects(
    () => validateBoundedCampaignResult(favorable, input),
    /independently recomputed/
  );

  const blame = resultInput(campaign);
  blame.artifact_id = "artifact:bounded-result:blame-missing-authority";
  blame.result_id = "result:bounded:blame-missing-authority";
  blame.additional_unresolved_closure = [{
    closure_kind: "AUTHORITY",
    basis_refs: [createExactArtifactReference(campaign.campaignIndex)],
    statement: "the SUT failed because authority was missing"
  }];
  await assert.rejects(
    () => createBoundedCampaignResult(blame),
    /cannot attribute pass\/failure/
  );
});

test("bounded-result supersession requires accepted immutable SUPERSEDED standing", async () => {
  const campaign = await completeCampaign("PASS");
  const priorInput = resultInput(campaign);
  const prior = await createBoundedCampaignResult(priorInput);
  const current = currentStanding(prior, campaign.closureReceipt);
  const superseded = createResultStandingDecision({
    artifact_id: "artifact:standing:superseded:002",
    result: prior,
    prior_standing: current,
    standing: "SUPERSEDED",
    reason_code: "standing:accepted-result-supersession",
    basis_delta_digest: digest("f"),
    basis_evidence_refs: [createExactArtifactReference(campaign.closureReceipt)],
    proposed_by: "actor:standing-investigator",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: createExactArtifactReference(campaign.closureReceipt),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:20:00Z",
    effective_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(current, validateResultStandingDecision);
  await campaign.setup.store.writeArtifact(superseded, validateResultStandingDecision);
  const nextInput = {
    ...resultInput(campaign),
    artifact_id: "artifact:bounded-result:superseding:002",
    result_id: "result:bounded:superseding:002",
    supersedes_result: prior,
    supersession_decision: superseded
  };
  const next = await createBoundedCampaignResult(nextInput);
  assert.deepEqual(next.identity_payload.supersedes_result_ref,
    createExactArtifactReference(prior));
  assert.deepEqual(next.identity_payload.supersession_decision_ref,
    createExactArtifactReference(superseded));

  const missingDecision = {
    ...nextInput,
    artifact_id: "artifact:bounded-result:missing-supersession-decision",
    result_id: "result:bounded:missing-supersession-decision",
    supersession_decision: null
  };
  await assert.rejects(
    () => createBoundedCampaignResult(missingDecision),
    /supersession fields are inconsistent|requires its accepted standing decision/
  );

  const orphanCurrent = createResultStandingDecision({
    ...currentStandingInput(prior, campaign.closureReceipt),
    artifact_id: "artifact:standing:orphan-current:001"
  });
  const orphanSuperseded = createResultStandingDecision({
    artifact_id: "artifact:standing:orphan-superseded:002",
    result: prior,
    prior_standing: orphanCurrent,
    standing: "SUPERSEDED",
    reason_code: "standing:orphaned-supersession",
    basis_delta_digest: digest("b"),
    basis_evidence_refs: [createExactArtifactReference(campaign.closureReceipt)],
    proposed_by: "actor:standing-investigator",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: createExactArtifactReference(campaign.closureReceipt),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:21:00Z",
    effective_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(orphanSuperseded, validateResultStandingDecision);
  await assert.rejects(() => createBoundedCampaignResult({
    ...resultInput(campaign),
    artifact_id: "artifact:bounded-result:orphaned-standing",
    result_id: "result:bounded:orphaned-standing",
    supersedes_result: prior,
    supersession_decision: orphanSuperseded
  }), /ENOENT/);
});

test("result becomes claim-authoritative only through later indexed CURRENT standing", async () => {
  const campaign = await completeCampaign("PASS");
  const input = resultInput(campaign);
  const result = await createBoundedCampaignResult(input);
  const standing = currentStanding(result, campaign.closureReceipt);
  await campaign.setup.store.writeArtifact(standing, validateResultStandingDecision);
  const indexingNamespace = createResultIndexingNamespace({
    artifact_id: "artifact:namespace-index:result-indexing:004",
    prior_namespace: campaign.closureNamespace,
    predecessor_receipt: campaign.closureReceipt,
    result,
    standing_decisions: [standing],
    cutoff_label: "namespace:result-indexing:004",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    created_at: "2026-07-21T17:00:00Z",
    created_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(indexingNamespace, validateAuthorityNamespaceIndex);
  const indexingReceipt = await namespaceReceipt(
    campaign.setup, indexingNamespace, "result-indexing", "2026-07-21T17:05:00Z"
  );
  const authority = await resolveBoundedResultAuthority({
    store: campaign.setup.store,
    result,
    result_context: input,
    indexing_namespace: indexingNamespace,
    indexing_receipt: indexingReceipt,
    standing_decisions: [standing]
  });
  assert.equal(authority.authority_status, "AUTHORITATIVE_BOUNDED_RESULT");
  assert.equal(authority.claim_authorized, true);

  await assert.rejects(
    () => resolveBoundedResultAuthority({
      store: campaign.setup.store,
      result,
      result_context: input,
      indexing_namespace: campaign.closureNamespace,
      indexing_receipt: campaign.closureReceipt,
      standing_decisions: [standing]
    }),
    /does not non-circularly index/
  );
});

test("standing history is immutable, owner-reviewed, and fork-intolerant", async () => {
  const campaign = await completeCampaign("PASS");
  const result = await createBoundedCampaignResult(resultInput(campaign));
  const current = currentStanding(result, campaign.closureReceipt);
  const reevaluate = createResultStandingDecision({
    artifact_id: "artifact:standing:reevaluate:002",
    result,
    prior_standing: current,
    standing: "RESULT_REEVALUATION_REQUIRED",
    reason_code: "standing:deterministic-divergence",
    basis_delta_digest: digest("d"),
    basis_evidence_refs: [createExactArtifactReference(campaign.closureReceipt)],
    proposed_by: "actor:standing-investigator",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: createExactArtifactReference(campaign.closureReceipt),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:10:00Z",
    effective_by: "actor:zoey-project-owner"
  });
  assert.equal(resolveResultStanding(result, [current, reevaluate]).identity_payload.standing,
    "RESULT_REEVALUATION_REQUIRED");

  const fork = createResultStandingDecision({
    artifact_id: "artifact:standing:fork:002",
    result,
    prior_standing: current,
    standing: "SUPERSEDED",
    reason_code: "standing:competing-fork",
    basis_delta_digest: digest("e"),
    basis_evidence_refs: [createExactArtifactReference(campaign.closureReceipt)],
    proposed_by: "actor:standing-investigator",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: createExactArtifactReference(campaign.closureReceipt),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:11:00Z",
    effective_by: "actor:zoey-project-owner"
  });
  assert.throws(() => resolveResultStanding(result, [current, reevaluate, fork]), /fork/);
  assert.throws(() => createResultIndexingNamespace({
    artifact_id: "artifact:namespace-index:standing-fork",
    prior_namespace: campaign.closureNamespace,
    predecessor_receipt: campaign.closureReceipt,
    result,
    standing_decisions: [current, reevaluate, fork],
    cutoff_label: "namespace:standing-fork",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    created_at: "2026-07-21T17:15:00Z",
    created_by: "actor:zoey-project-owner"
  }), /fork/);

  const superseded = createResultStandingDecision({
    artifact_id: "artifact:standing:terminal:003",
    result,
    prior_standing: reevaluate,
    standing: "SUPERSEDED",
    reason_code: "standing:terminal-supersession",
    basis_delta_digest: digest("f"),
    basis_evidence_refs: [createExactArtifactReference(campaign.closureReceipt)],
    proposed_by: "actor:standing-investigator",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: createExactArtifactReference(campaign.closureReceipt),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:12:00Z",
    effective_by: "actor:zoey-project-owner"
  });
  assert.equal(resolveResultStanding(result, [current, reevaluate, superseded])
    .identity_payload.standing, "SUPERSEDED");
  assert.throws(() => createResultStandingDecision({
    artifact_id: "artifact:standing:terminal-reopen:004",
    result,
    prior_standing: superseded,
    standing: "RESULT_REEVALUATION_REQUIRED",
    reason_code: "standing:forbidden-terminal-reopen",
    basis_delta_digest: digest("a"),
    basis_evidence_refs: [createExactArtifactReference(campaign.closureReceipt)],
    proposed_by: "actor:standing-investigator",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: createExactArtifactReference(campaign.closureReceipt),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:13:00Z",
    effective_by: "actor:zoey-project-owner"
  }), /terminal predecessor/);

  assert.throws(() => createResultStandingDecision({
    ...currentStandingInput(result, campaign.closureReceipt),
    artifact_id: "artifact:standing:self-reviewed",
    independent_reviewer: "actor:standing-producer"
  }), /independent review and owner acceptance/);
});

test("claim invalidation binds the exact overclaim, ceiling, owner review, and history", async () => {
  const campaign = await completeCampaign("PASS");
  const resultContext = resultInput(campaign);
  const result = await createBoundedCampaignResult(resultContext);
  await campaign.setup.store.writeArtifact(
    result, (artifact) => validateBoundedCampaignResult(artifact, resultContext)
  );
  const standing = currentStanding(result, campaign.closureReceipt);
  await campaign.setup.store.writeArtifact(standing, validateResultStandingDecision);
  const resultNamespace = createResultIndexingNamespace({
    artifact_id: "artifact:namespace-index:claim-result:004",
    prior_namespace: campaign.closureNamespace,
    predecessor_receipt: campaign.closureReceipt,
    result,
    standing_decisions: [standing],
    cutoff_label: "namespace:claim-result:004",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    created_at: "2026-07-21T17:00:00Z",
    created_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(resultNamespace, validateAuthorityNamespaceIndex);
  const resultReceipt = await namespaceReceipt(
    campaign.setup, resultNamespace, "claim-result", "2026-07-21T17:05:00Z"
  );
  const evidenceRef = createExactArtifactReference(resultReceipt);
  const base = {
    artifact_id: "artifact:claim-invalidation:001",
    offending_artifact_ref: evidenceRef,
    result,
    campaign_authorization: campaign.setup.campaignAuthorization,
    prior_invalidation: null,
    superseding_artifact_ref: null,
    supported_claim_ceiling: result.identity_payload.bounded_claim.ceiling,
    observed_overclaim: "Zoey has complete production-ready memory and durable adaptation.",
    reason_code: "claim:exceeds-selected-slice-ceiling",
    basis_evidence_refs: [evidenceRef],
    proposed_by: "actor:claim-auditor",
    independent_reviewer: "actor:claim-reviewer",
    review_attestation_ref: evidenceRef,
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T17:20:00Z",
    effective_by: "actor:zoey-project-owner"
  };
  const initial = createClaimInvalidationDecision(base);
  validateClaimInvalidationDecision(initial, {
    result,
    campaignAuthorization: campaign.setup.campaignAuthorization,
    priorInvalidation: null
  });
  assert.match(initial.identity_payload.observed_claim_fingerprint, /^sha256:[0-9a-f]{64}$/);
  const successor = createClaimInvalidationDecision({
    ...base,
    artifact_id: "artifact:claim-invalidation:002",
    prior_invalidation: initial,
    superseding_artifact_ref: createExactArtifactReference(result),
    reason_code: "claim:superseding-presentation-recorded",
    effective_at: "2026-07-21T17:21:00Z"
  });
  assert.equal(resolveClaimInvalidationHistory([initial, successor]).content_fingerprint,
    successor.content_fingerprint);
  await campaign.setup.store.writeArtifact(initial, validateClaimInvalidationDecision);
  await campaign.setup.store.writeArtifact(successor, validateClaimInvalidationDecision);
  const priorNamespace = resultNamespace.identity_payload;
  const claimNamespace = createAuthorityNamespaceIndex({
    artifact_id: "artifact:namespace-index:claim-invalidation:005",
    namespace_id: priorNamespace.namespace_id,
    revision: 5,
    authority_identity: priorNamespace.authority_identity,
    prior_index: resultNamespace,
    prior_index_receipt_ref: createExactArtifactReference(resultReceipt),
    qualification_plan_refs: priorNamespace.qualification_plan_refs,
    qualification_result_refs: priorNamespace.qualification_result_refs,
    campaign_authorization_refs: priorNamespace.campaign_authorization_refs,
    campaign_index_refs: priorNamespace.campaign_index_refs,
    bounded_result_refs: priorNamespace.bounded_result_refs,
    decision_refs: [
      ...priorNamespace.decision_refs,
      createExactArtifactReference(initial),
      createExactArtifactReference(successor)
    ].sort(referenceSort),
    anchor_receipt_refs: [
      ...priorNamespace.anchor_receipt_refs,
      createExactArtifactReference(resultReceipt)
    ].sort(referenceSort),
    manifest_bindings: priorNamespace.manifest_bindings,
    anchor_declarations: priorNamespace.anchor_declarations,
    cutoff_label: "namespace:claim-invalidation:005",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T17:25:00Z",
    created_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(claimNamespace, validateAuthorityNamespaceIndex);
  const claimReceipt = await namespaceReceipt(
    campaign.setup, claimNamespace, "claim-invalidation", "2026-07-21T17:30:00Z"
  );
  const authority = await resolveClaimInvalidationAuthority({
    store: campaign.setup.store,
    result,
    campaign_authorization: campaign.setup.campaignAuthorization,
    decisions: [initial, successor],
    indexing_namespace: claimNamespace,
    indexing_receipt: claimReceipt,
    anchor_public_key: campaign.setup.anchorPublicKey
  });
  assert.equal(authority.authority_status, "AUTHORITATIVE_CLAIM_INVALIDATION");
  assert.throws(() => createClaimInvalidationDecision({
    ...base,
    artifact_id: "artifact:claim-invalidation:self-approved",
    independent_reviewer: "actor:claim-auditor"
  }), /independent review/);
  const fork = createClaimInvalidationDecision({
    ...base,
    artifact_id: "artifact:claim-invalidation:fork",
    prior_invalidation: initial,
    effective_at: "2026-07-21T17:22:00Z"
  });
  assert.throws(
    () => resolveClaimInvalidationHistory([initial, successor, fork]), /fork/
  );
});

test("post-qualification divergence suspends one-run scoring through one exact decision", async () => {
  const campaign = await completeCampaign("PASS");
  const evidenceRef = createExactArtifactReference(campaign.setup.anchorReceipt);
  const decision = createMaterialAuthorityDecision({
    artifact_id: "artifact:qualification-invalidation:001",
    decision_kind: "QUALIFICATION_RESULT_CORRECTION",
    subject_ref: createExactArtifactReference(campaign.setup.qualificationResult),
    prior_decision_ref: null,
    reason_code: "deterministic_qualification_invalidated",
    original_disposition: "QUALIFIED",
    replacement_disposition: "INVALIDATED_BY_POST_QUALIFICATION_DIVERGENCE",
    basis_delta_digest: digest("9"),
    basis_evidence_refs: [evidenceRef],
    proposed_by: "actor:divergence-investigator",
    independent_reviewer: "actor:divergence-reviewer",
    review_attestation_ref: evidenceRef,
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    affected_claims: [...REQUIRED_CLAIM_CLASSES].sort(),
    effective_at: "2026-07-21T16:10:00Z",
    effective_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(decision, validateMaterialAuthorityDecision);
  const priorIndex = campaign.campaignIndex.identity_payload;
  const suspendedIndex = createCampaignEvidenceIndex({
    artifact_id: "artifact:campaign-index:qualification-suspended",
    campaign_authorization: campaign.setup.campaignAuthorization,
    authorizing_namespace: campaign.setup.namespace,
    attempt_inventory: priorIndex.attempt_inventory,
    evidence_refs: priorIndex.evidence_refs,
    run_record_refs: priorIndex.run_record_refs,
    decision_refs: [createExactArtifactReference(decision)],
    anchor_receipt_refs: priorIndex.anchor_receipt_refs,
    qualification_plan_ref: priorIndex.qualification_plan_ref,
    qualification_result_ref: priorIndex.qualification_result_ref,
    prior_index: campaign.campaignIndex,
    campaign_lifecycle: "suspended",
    lifecycle_reason: "deterministic_qualification_invalidated",
    cutoff_label: "campaign:qualification-suspended",
    producer_identity: "actor:campaign-index-producer",
    validator_identity: "actor:campaign-index-validator",
    validation_result: "VALIDATED",
    frozen_at: "2026-07-21T16:15:00Z",
    frozen_by: "actor:campaign-index-validator"
  });
  await campaign.setup.store.writeArtifact(suspendedIndex, (artifact) => (
    validateCampaignEvidenceIndex(artifact, {
      authorization: campaign.setup.campaignAuthorization
    })
  ));
  const priorNamespace = campaign.closureNamespace.identity_payload;
  const closureNamespace = createAuthorityNamespaceIndex({
    artifact_id: "artifact:namespace-index:qualification-suspended:004",
    namespace_id: priorNamespace.namespace_id,
    revision: 4,
    authority_identity: priorNamespace.authority_identity,
    prior_index: campaign.closureNamespace,
    prior_index_receipt_ref: createExactArtifactReference(campaign.closureReceipt),
    qualification_plan_refs: priorNamespace.qualification_plan_refs,
    qualification_result_refs: priorNamespace.qualification_result_refs,
    campaign_authorization_refs: priorNamespace.campaign_authorization_refs,
    campaign_index_refs: [
      ...priorNamespace.campaign_index_refs,
      createExactArtifactReference(suspendedIndex)
    ].sort(referenceSort),
    bounded_result_refs: priorNamespace.bounded_result_refs,
    decision_refs: [createExactArtifactReference(decision)],
    anchor_receipt_refs: [
      ...priorNamespace.anchor_receipt_refs,
      createExactArtifactReference(campaign.closureReceipt)
    ].sort(referenceSort),
    manifest_bindings: priorNamespace.manifest_bindings,
    anchor_declarations: priorNamespace.anchor_declarations,
    cutoff_label: "namespace:qualification-suspended:004",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T16:20:00Z",
    created_by: "actor:zoey-project-owner"
  });
  await campaign.setup.store.writeArtifact(closureNamespace, validateAuthorityNamespaceIndex);
  const closureReceipt = await namespaceReceipt(
    campaign.setup, closureNamespace, "qualification-suspended", "2026-07-21T16:25:00Z"
  );
  const input = {
    ...resultInput(campaign),
    artifact_id: "artifact:bounded-result:qualification-suspended",
    result_id: "result:bounded:qualification-suspended",
    campaign_index: suspendedIndex,
    closure_namespace: closureNamespace,
    closure_receipt: closureReceipt,
    campaign_decisions: [decision],
    historical_campaigns: [{
      authorization: campaign.setup.campaignAuthorization,
      authority_context: campaign.setup.authorityContext,
      campaign_index: campaign.campaignIndex,
      run_records: campaign.runs,
      campaign_decisions: [],
      qualification_evidence_artifacts: campaign.setup.qualificationEvidenceArtifacts,
      anchor_public_key: campaign.setup.anchorPublicKey
    }]
  };
  const result = await createBoundedCampaignResult(input);
  assert.equal(result.identity_payload.bounded_result, "NOT_YET_DETERMINABLE");
  assert.match(result.identity_payload.decisive_basis.statement, /not closed/);
});

async function completeCampaign(
  mode,
  { cancelAllUnused = true, qualification = "QUALIFIED" } = {}
) {
  const setup = await createFormalCampaignFixture({ qualification });
  const primarySlots = setup.campaignAuthorization.identity_payload.attempt_slots;
  const runs = [];
  if (["PASS", "THREE_RUN_PASS", "THREE_RUN_ONE_FAIL"].includes(mode)) {
    for (const [index, slot] of primarySlots.entries()) {
      runs.push(await createSealedRun(setup, slot, (attempt) => {
        if (mode !== "THREE_RUN_ONE_FAIL" || index !== 0) return {};
        const finding = createFailureFinding({
          finding_id: "finding:obligation:three-run:001",
          failure_kind: "OBLIGATION",
          rule_id: "SCN001-SSFO-V0.2.0-OBL-TIME-OLD-001",
          observed_refs: [createExactArtifactReference(attempt.evidenceArtifacts[5])],
          expected_classification: "STALE_BASIS_INELIGIBLE",
          actual_classification: "STALE_BASIS_ELIGIBLE",
          affected_claim_classes: ["CC-TIME-STALE-BASIS"]
        });
        const obligations = passObligations(attempt.slot.path_id);
        const time = obligations.find(
          (entry) => entry.claim_class === "CC-TIME-STALE-BASIS"
        );
        time.result = "OBLIGATION_FAIL";
        time.finding_ids = [finding.finding_id];
        return { obligation_results: obligations, failure_findings: [finding] };
      }));
    }
  } else if (mode === "EARLY_HARD_FAIL") {
    runs.push(await createSealedRun(setup, primarySlots[0], (attempt) => {
      const finding = createFailureFinding({
        finding_id: "finding:early-hard:001",
        failure_kind: "HARD_INVARIANT",
        rule_id: "SCN001-SSFO-V0.2.0-INV-001",
        observed_refs: [createExactArtifactReference(attempt.evidenceArtifacts[4])],
        expected_classification: "NO_STALE_BASIS_PROMOTION",
        actual_classification: "STALE_BASIS_PROMOTED",
        affected_claim_classes: [...REQUIRED_CLAIM_CLASSES].sort()
      });
      return { invariant_result: "HARD_FAIL", failure_findings: [finding] };
    }));
  }
  const runByAttempt = new Map(runs.map((entry) => [entry.record.identity_payload.attempt_id, entry]));
  const decisiveRun = runs[0]?.record ?? null;
  const decisiveFinding = decisiveRun?.identity_payload.failure_findings[0] ?? null;
  const authorizationRef = createExactArtifactReference(setup.campaignAuthorization);
  const allSlots = [
    ...primarySlots,
    ...setup.campaignAuthorization.identity_payload.contingency_slots
  ];
  const inventory = allSlots.map((slot, index) => {
    const run = runByAttempt.get(slot.attempt_id);
    if (run) return {
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      disposition: "SEALED_RECORD",
      run_record_ref: createExactArtifactReference(run.record),
      evidence_refs: run.context.evidence_artifacts.map(createExactArtifactReference).sort(referenceSort),
      invalidity_decision_ref: null,
      replacement_allocation: null,
      unused_slot_disposition: null
    };
    const cancel = mode === "EARLY_HARD_FAIL" && (cancelAllUnused || index !== 1);
    return {
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      disposition: cancel
        ? "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE"
        : "UNSTARTED_NOT_ACTIVATED",
      run_record_ref: null,
      evidence_refs: [],
      invalidity_decision_ref: null,
      replacement_allocation: null,
      unused_slot_disposition: cancel ? {
        disposition_kind: "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE",
        campaign_authorization_ref: authorizationRef,
        decisive_run_ref: createExactArtifactReference(decisiveRun),
        basis_decision_ref: null,
        decisive_failure_digest: decisiveFinding.finding_digest,
        actor_identity: "actor:campaign-evaluator",
        recorded_at: "2026-07-21T15:00:00Z",
        material_output_observed: false
      } : null
    };
  });
  const anchorRef = createExactArtifactReference(setup.anchorReceipt);
  const evidenceRefs = [
    anchorRef,
    ...runs.flatMap((entry) => entry.context.evidence_artifacts.map(createExactArtifactReference))
  ].sort(referenceSort);
  const campaignIndex = createCampaignEvidenceIndex({
    artifact_id: `artifact:campaign-index:${mode.toLowerCase()}`,
    campaign_authorization: setup.campaignAuthorization,
    authorizing_namespace: setup.namespace,
    attempt_inventory: inventory,
    evidence_refs: evidenceRefs,
    run_record_refs: runs.map((entry) => createExactArtifactReference(entry.record)).sort(referenceSort),
    decision_refs: [],
    anchor_receipt_refs: [anchorRef],
    qualification_plan_ref: createExactArtifactReference(setup.qualificationPlan),
    qualification_result_ref: createExactArtifactReference(setup.qualificationResult),
    prior_index: null,
    campaign_lifecycle: "closed",
    lifecycle_reason: mode === "HARD_FAIL"
      ? "authoritative_global_hard_failure" : "planned_attempt_set_closed",
    cutoff_label: `campaign:${mode.toLowerCase()}:closed`,
    producer_identity: "actor:campaign-index-producer",
    validator_identity: "actor:campaign-index-validator",
    validation_result: "VALIDATED",
    frozen_at: "2026-07-21T15:30:00Z",
    frozen_by: "actor:campaign-index-validator"
  });
  await setup.store.writeArtifact(campaignIndex, (artifact) => validateCampaignEvidenceIndex(
    artifact, { authorization: setup.campaignAuthorization }
  ));
  const closureNamespace = campaignClosureNamespace(setup, campaignIndex);
  await setup.store.writeArtifact(closureNamespace, validateAuthorityNamespaceIndex);
  const closureReceipt = await namespaceReceipt(
    setup, closureNamespace, `campaign-${mode.toLowerCase()}`, "2026-07-21T15:40:00Z"
  );
  return { setup, runs, campaignIndex, closureNamespace, closureReceipt };
}

function campaignClosureNamespace(setup, campaignIndex) {
  const prior = setup.namespace.identity_payload;
  return createAuthorityNamespaceIndex({
    artifact_id: "artifact:namespace-index:campaign-closure:003",
    namespace_id: prior.namespace_id,
    revision: 3,
    authority_identity: prior.authority_identity,
    prior_index: setup.namespace,
    prior_index_receipt_ref: createExactArtifactReference(setup.anchorReceipt),
    qualification_plan_refs: prior.qualification_plan_refs,
    qualification_result_refs: prior.qualification_result_refs,
    campaign_authorization_refs: prior.campaign_authorization_refs,
    campaign_index_refs: [createExactArtifactReference(campaignIndex)],
    bounded_result_refs: [],
    decision_refs: [],
    anchor_receipt_refs: [
      ...prior.anchor_receipt_refs,
      createExactArtifactReference(setup.anchorReceipt)
    ].sort(referenceSort),
    manifest_bindings: prior.manifest_bindings,
    anchor_declarations: prior.anchor_declarations,
    cutoff_label: "namespace:campaign-closure:003",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T15:35:00Z",
    created_by: "actor:zoey-project-owner"
  });
}

async function namespaceReceipt(setup, namespace, suffix, sealedAt) {
  const authorizationRef = createExactArtifactReference(setup.campaignAuthorization);
  const namespaceRef = createExactArtifactReference(namespace);
  const bytes = createFixtureAnchorReceiptBytes({
    profile: "PROTECTED_REMOTE_GATE",
    authority_subject_ref: authorizationRef,
    namespace_index_ref: namespaceRef,
    external_commit_sha: suffix === "result-indexing" ? "c".repeat(40) : "d".repeat(40),
    authority_ref: "refs/heads/formal-authority",
    external_event_id: `event:namespace-receipt:${suffix}`,
    observed_predecessor: "b".repeat(40),
    producer_identity: "actor:external-anchor-platform",
    issued_at: sealedAt
  });
  return captureAuthenticatedAnchorReceipt(setup.store, {
    artifact_id: `artifact:namespace-receipt:${suffix}`,
    raw_receipt_bytes: bytes,
    anchor_requirement: setup.campaignAuthorization.identity_payload.anchor_requirement,
    public_key: setup.anchorPublicKey,
    expected_authority_subject_ref: authorizationRef,
    expected_namespace_index_ref: namespaceRef,
    campaign_authorization_ref: authorizationRef,
    validator_identity: "actor:external-gate-validator",
    sealed_at: sealedAt
  });
}

function resultInput(campaign) {
  return {
    store: campaign.setup.store,
    artifact_id: `artifact:bounded-result:${campaign.campaignIndex.artifact_id}`,
    result_id: `result:bounded:${campaign.campaignIndex.artifact_id}`,
    authorization: campaign.setup.campaignAuthorization,
    authority_context: campaign.setup.authorityContext,
    campaign_index: campaign.campaignIndex,
    closure_namespace: campaign.closureNamespace,
    closure_receipt: campaign.closureReceipt,
    anchor_public_key: campaign.setup.anchorPublicKey,
    run_records: campaign.runs,
    campaign_decisions: [],
    qualification_evidence_artifacts: campaign.setup.qualificationEvidenceArtifacts,
    historical_campaigns: [],
    additional_unresolved_closure: [],
    producer_identity: "actor:bounded-result-producer",
    validator_identity: "actor:bounded-result-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T16:00:00Z",
    created_by: "actor:bounded-result-producer",
    supersedes_result: null,
    supersession_decision: null
  };
}

function currentStanding(result, evidence) {
  return createResultStandingDecision(currentStandingInput(result, evidence));
}

function currentStandingInput(result, evidence) {
  const evidenceRef = createExactArtifactReference(evidence);
  return {
    artifact_id: "artifact:standing:current:001",
    result,
    prior_standing: null,
    standing: "CURRENT",
    reason_code: "standing:initial-validated-result",
    basis_delta_digest: digest("c"),
    basis_evidence_refs: [evidenceRef],
    proposed_by: "actor:standing-producer",
    independent_reviewer: "actor:standing-reviewer",
    review_attestation_ref: evidenceRef,
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    effective_at: "2026-07-21T16:30:00Z",
    effective_by: "actor:zoey-project-owner"
  };
}

function referenceSort(left, right) {
  return `${left.artifact_kind}:${left.artifact_id}:${left.content_fingerprint}`.localeCompare(
    `${right.artifact_kind}:${right.artifact_id}:${right.content_fingerprint}`
  );
}

function resign(artifact) {
  artifact.content_fingerprint = fingerprintCanonicalJson(
    ARTIFACT_HASH_DOMAIN[artifact.artifact_kind], artifact.identity_payload
  );
}
