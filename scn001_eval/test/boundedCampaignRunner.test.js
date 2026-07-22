import assert from "node:assert/strict";
import test from "node:test";

import { executeBoundedSelectedSliceCampaign } from "../src/boundedCampaignRunner.js";
import { createFormalCampaignFixture } from "../test_support/formalCampaignFixtures.js";
import {
  createFixtureAnchorReceiptBytes,
  createFixtureFreshStartAttestationBytes
} from "../test_support/anchorFixture.js";

test("trusted campaign executes every primary slot and derives bounded pass pending standing", async () => {
  const setup = await createFormalCampaignFixture();
  const result = await executeBoundedSelectedSliceCampaign(inputFor(setup));
  assert.equal(result.attempt_results.length, 4);
  assert.ok(result.attempt_results.every((attempt) => attempt.execution_status === "SEALED"));
  assert.equal(result.campaign_index.identity_payload.campaign_lifecycle, "closed");
  assert.equal(result.bounded_result.identity_payload.bounded_result, "BOUNDED_PASS");
  assert.equal(result.execution_status, "RESULT_PENDING_OWNER_STANDING");
  assert.equal(result.standing_decision, null);
  assert.equal(result.claim_authorized, false);
});

test("conservative qualification branch executes all twelve primary slots", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const input = inputFor(setup);
  input.artifact_namespace = "artifact:trusted-campaign:conservative";
  input.campaign_index_artifact_id = "artifact:trusted-campaign:conservative:index";
  input.closure_namespace_artifact_id = "artifact:trusted-campaign:conservative:namespace";
  input.closure_receipt_artifact_id = "artifact:trusted-campaign:conservative:receipt";
  input.bounded_result_artifact_id = "artifact:trusted-campaign:conservative:result";
  input.bounded_result_id = "result:trusted-campaign:conservative";
  const result = await executeBoundedSelectedSliceCampaign(input);
  assert.equal(result.attempt_results.length, 12);
  assert.equal(result.bounded_result.identity_payload.run_count_branch, "CONSERVATIVE_THREE");
  assert.equal(result.bounded_result.identity_payload.bounded_result, "BOUNDED_PASS");
  assert.equal(result.claim_authorized, false);
});

test("campaign input cannot import an owner standing decision", async () => {
  const setup = await createFormalCampaignFixture();
  await assert.rejects(
    () => executeBoundedSelectedSliceCampaign({
      ...inputFor(setup),
      standing_decision: { standing: "CURRENT" }
    }),
    /invalid fields/
  );
});

function inputFor(setup) {
  return {
    store: setup.store,
    authorization: setup.campaignAuthorization,
    authority_context: setup.authorityContext,
    authorizing_namespace: setup.namespace,
    authorization_anchor_receipt: setup.anchorReceipt,
    anchor_public_key: setup.anchorPublicKey,
    fresh_start_attestor: async (request) => createFixtureFreshStartAttestationBytes({
      ...structuredClone(request),
      challenge: `challenge:campaign:${request.attempt_id}`,
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      start_event_id: `event:campaign-start:${request.attempt_id}`,
      producer_identity: "actor:external-start-platform",
      issued_at: "2026-07-22T17:59:00Z"
    }),
    closure_receipt_attestor: async (request) => createFixtureAnchorReceiptBytes({
      ...structuredClone(request),
      external_commit_sha: "c".repeat(40),
      external_event_id: "event:campaign-closure:trusted-runner",
      producer_identity: "actor:external-anchor-platform",
      issued_at: "2026-07-22T18:30:00Z"
    }),
    qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts,
    artifact_namespace: "artifact:trusted-campaign",
    campaign_index_artifact_id: "artifact:trusted-campaign:index",
    closure_namespace_artifact_id: "artifact:trusted-campaign:namespace",
    closure_receipt_artifact_id: "artifact:trusted-campaign:closure-receipt",
    bounded_result_artifact_id: "artifact:trusted-campaign:result",
    bounded_result_id: "result:trusted-campaign",
    campaign_cutoff_label: "campaign:trusted:closed",
    namespace_cutoff_label: "namespace:trusted:closure",
    evidence_producer_identity: "actor:formal-pipeline-recorder",
    evidence_validator_identity: "actor:formal-pipeline-evidence-validator",
    run_producer_identity: "actor:formal-pipeline-run-producer",
    run_validator_identity: "actor:formal-pipeline-run-validator",
    index_producer_identity: "actor:campaign-index-producer",
    index_validator_identity: "actor:campaign-index-validator",
    namespace_validator_identity: "actor:namespace-index-validator",
    receipt_validator_identity: "actor:external-gate-validator",
    result_producer_identity: "actor:bounded-result-producer",
    result_validator_identity: "actor:bounded-result-validator",
    campaign_actor_identity: "actor:campaign-evaluator",
    attempts_sealed_at: "2026-07-22T18:00:00Z",
    index_frozen_at: "2026-07-22T18:20:00Z",
    namespace_created_at: "2026-07-22T18:25:00Z",
    closure_receipt_sealed_at: "2026-07-22T18:30:00Z",
    result_created_at: "2026-07-22T18:35:00Z"
  };
}
