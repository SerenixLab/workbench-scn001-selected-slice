import assert from "node:assert/strict";
import test from "node:test";

import {
  SUT_PUBLIC_BOUNDARY_METHODS,
  createSutBoundary
} from "@zoey/scn001-sut-core";

import {
  executeBoundedSelectedSliceCampaign,
  executeBoundedSelectedSliceCampaignForMechanismTest
} from "../src/boundedCampaignRunner.js";
import { createExactArtifactReference } from "../src/formalArtifactIdentity.js";
import { createAuthorityNamespaceIndex } from "../src/formalEvidence.js";
import { createFormalCampaignFixture } from "../test_support/formalCampaignFixtures.js";
import {
  createFixtureAnchorReceiptBytes,
  createFixtureFreshStartAttestationBytes
} from "../test_support/anchorFixture.js";

test("qualified campaign suspends before scoring when formal output diverges from its baseline", async () => {
  const setup = await createFormalCampaignFixture();
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(inputFor(setup));
  assert.equal(result.attempt_results.length, 1);
  assert.equal(result.attempt_results[0].execution_status, "SEALED");
  assert.equal(
    result.execution_status,
    "QUALIFICATION_DIVERGENCE_REQUIRES_ACCEPTED_DECISION"
  );
  assert.equal(result.required_decision.reason_code, "deterministic_qualification_invalidated");
  assert.equal(result.campaign_index, null);
  assert.equal(result.bounded_result, null);
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
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(input);
  assert.equal(result.attempt_results.length, 12);
  assert.equal(result.bounded_result.identity_payload.run_count_branch, "CONSERVATIVE_THREE");
  assert.equal(result.bounded_result.identity_payload.bounded_result, "BOUNDED_PASS");
  assert.equal(result.claim_authorized, false);
});

test("campaign input cannot import an owner standing decision", async () => {
  const setup = await createFormalCampaignFixture();
  await assert.rejects(
    () => executeBoundedSelectedSliceCampaignForMechanismTest({
      ...inputFor(setup),
      standing_decision: { standing: "CURRENT" }
    }),
    /invalid fields/
  );
});

test("sealable interruption is retained, classified, and replaced prospectively", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const base = createSutBoundary();
  const interrupted = Object.freeze(Object.fromEntries(
    SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
      method,
      method === "ingestSutVisibleInputs"
        ? () => { throw new Error("injected campaign interruption"); }
        : (...argumentsReceived) => base[method](...argumentsReceived)
    ])
  ));
  let boundaryCount = 0;
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(
    inputFor(setup),
    {
      sut_boundary_factory: () => {
        boundaryCount += 1;
        return boundaryCount === 1 ? interrupted : undefined;
      }
    }
  );
  assert.equal(result.attempt_results.length, 13);
  assert.equal(result.attempt_results[0].attempt_disposition, "INVALID_RETAINED");
  assert.equal(
    result.attempt_results[0].run_record.identity_payload.run_validity,
    "INVALID_UNSCORABLE"
  );
  assert.equal(result.attempt_results[1].slot.allocation_kind, "INVALIDITY_DERIVED_REPLACEMENT");
  assert.equal(result.attempt_results[1].execution_status, "SEALED");
  assert.equal(result.campaign_index.identity_payload.decision_refs.length, 1);
  assert.equal(result.campaign_index.identity_payload.campaign_lifecycle, "closed");
  assert.equal(result.campaign_index.identity_payload.lifecycle_reason, "planned_attempt_set_closed");
  assert.equal(result.bounded_result.identity_payload.bounded_result, "BOUNDED_PASS");
  assert.equal(result.claim_authorized, false);
});

test("SUT processing failure remains scored and cannot trigger replacement", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  let boundaryCount = 0;
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(
    inputFor(setup),
    {
      sut_boundary_factory: () => {
        boundaryCount += 1;
        if (boundaryCount !== 1) return undefined;
        const base = createSutBoundary();
        return Object.freeze(Object.fromEntries(
          SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
            method,
            method === "processCurrentInteraction"
              ? () => { throw new Error("campaign SUT processing failure"); }
              : (...argumentsReceived) => base[method](...argumentsReceived)
          ])
        ));
      }
    }
  );
  assert.equal(result.attempt_results.length, 12);
  assert.equal(result.attempt_results[0].transcript.execution_status,
    "COMPLETED_WITH_SUT_FAILURE");
  assert.equal(result.attempt_results[0].run_record.identity_payload.run_validity, "VALID");
  assert.equal(result.campaign_index.identity_payload.decision_refs.length, 0);
  assert.equal(
    result.campaign_index.identity_payload.attempt_inventory.filter(
      (entry) => entry.replacement_allocation !== null
    ).length,
    0
  );
  assert.equal(result.bounded_result.identity_payload.bounded_result, "BOUNDED_FAIL");
});

test("repeated sealable interruption suspends at the accepted root-cause limit", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const interrupted = () => {
    const base = createSutBoundary();
    return Object.freeze(Object.fromEntries(
      SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
        method,
        method === "ingestSutVisibleInputs"
          ? () => { throw new Error("repeated campaign interruption"); }
          : (...argumentsReceived) => base[method](...argumentsReceived)
      ])
    ));
  };
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(
    inputFor(setup),
    { sut_boundary_factory: interrupted }
  );
  assert.equal(result.attempt_results.length, 2);
  assert.ok(result.attempt_results.every(
    (attempt) => attempt.attempt_disposition === "INVALID_RETAINED"
  ));
  assert.equal(result.campaign_index.identity_payload.decision_refs.length, 2);
  assert.equal(result.campaign_index.identity_payload.campaign_lifecycle, "suspended");
  assert.equal(
    result.campaign_index.identity_payload.lifecycle_reason,
    "repeated_invalidity_root_cause"
  );
  assert.equal(
    result.bounded_result.identity_payload.bounded_result,
    "NOT_YET_DETERMINABLE"
  );
  assert.equal(result.claim_authorized, false);
});

test("post-start seal failure freezes an abandoned authority-review suspension", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const rejectingStore = Object.freeze({
    ...setup.store,
    async writeArtifact(artifact, validator) {
      if (artifact.artifact_kind === "FORMAL_RUN_RECORD") {
        throw new Error("injected campaign seal failure");
      }
      return setup.store.writeArtifact(artifact, validator);
    }
  });
  const input = inputFor(setup);
  input.store = rejectingStore;
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(input);
  assert.equal(result.attempt_results.length, 1);
  assert.equal(result.attempt_results[0].attempt_disposition, "ABANDONED_RETAINED");
  assert.equal(result.campaign_index.identity_payload.campaign_lifecycle, "suspended");
  assert.equal(result.campaign_index.identity_payload.lifecycle_reason, "authority_review_required");
  assert.equal(result.campaign_index.identity_payload.decision_refs.length, 0);
  assert.equal(
    result.bounded_result.identity_payload.bounded_result,
    "NOT_YET_DETERMINABLE"
  );
  assert.equal(result.claim_authorized, false);
});

test("three campaign-wide invalid attempts suspend before a third replacement", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const interruptedPaths = new Set(
    setup.campaignAuthorization.identity_payload.required_paths.slice(0, 3)
  );
  const result = await executeBoundedSelectedSliceCampaignForMechanismTest(
    inputFor(setup),
    {
      sut_boundary_factory: (slot) => {
        if (slot.slot_kind !== "PRIMARY" || slot.ordinal !== 1
          || !interruptedPaths.has(slot.path_id)) {
          return undefined;
        }
        const base = createSutBoundary();
        return Object.freeze(Object.fromEntries(
          SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
            method,
            method === "ingestSutVisibleInputs"
              ? () => { throw new Error(`campaign-wide interruption:${slot.path_id}`); }
              : (...argumentsReceived) => base[method](...argumentsReceived)
          ])
        ));
      }
    }
  );
  assert.equal(result.campaign_index.identity_payload.decision_refs.length, 3);
  assert.equal(result.campaign_index.identity_payload.campaign_lifecycle, "suspended");
  assert.equal(
    result.campaign_index.identity_payload.lifecycle_reason,
    "invalid_attempt_limit_reached"
  );
  assert.equal(
    result.campaign_index.identity_payload.attempt_inventory.filter(
      (entry) => entry.replacement_allocation !== null
    ).length,
    2
  );
  assert.equal(result.bounded_result.identity_payload.bounded_result, "NOT_YET_DETERMINABLE");
  assert.equal(result.claim_authorized, false);
});

test("replacement start rejects a signed substitution of its allocation basis", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const base = createSutBoundary();
  const interrupted = Object.freeze(Object.fromEntries(
    SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
      method,
      method === "ingestSutVisibleInputs"
        ? () => { throw new Error("replacement-binding interruption"); }
        : (...argumentsReceived) => base[method](...argumentsReceived)
    ])
  ));
  const input = inputFor(setup);
  input.fresh_start_attestor = async (request) => createFixtureFreshStartAttestationBytes({
    ...structuredClone(request),
    allocation_binding_digest: request.attempt_id.includes(":replacement-attempt:")
      ? `sha256:${"f".repeat(64)}`
      : request.allocation_binding_digest,
    challenge: `challenge:campaign:${request.attempt_id}`,
    issued_by: "actor:external-gate",
    observed_by: "actor:external-gate",
    start_event_id: `event:campaign-start:${request.attempt_id}`,
    producer_identity: "actor:external-start-platform",
    issued_at: "2026-07-22T17:59:00Z"
  });
  let boundaryCount = 0;
  await assert.rejects(
    () => executeBoundedSelectedSliceCampaignForMechanismTest(input, {
      sut_boundary_factory: () => {
        boundaryCount += 1;
        return boundaryCount === 1 ? interrupted : undefined;
      }
    }),
    /conflicts on allocation_binding_digest/
  );
});

test("trusted campaign entry rejects generic authorization without measurement roots", async () => {
  const setup = await createFormalCampaignFixture();
  await assert.rejects(
    () => executeBoundedSelectedSliceCampaign(inputFor(setup)),
    /missing=\[repository_root,canonical_meta_root\]/
  );
});

test("trusted campaign cannot measure a repository other than its loaded runtime", async () => {
  const setup = await createFormalCampaignFixture();
  await assert.rejects(
    () => executeBoundedSelectedSliceCampaign({
      ...inputFor(setup),
      repository_root: setup.store.root,
      canonical_meta_root: setup.store.root
    }),
    /measurement root must be the exact loaded evaluator repository/
  );
});

test("campaign rejects omitted prior history before executing an attempt", async () => {
  const setup = await createFormalCampaignFixture({ qualification: "NOT_QUALIFIED" });
  const prior = setup.namespace.identity_payload;
  const priorCampaignRef = {
    artifact_id: "artifact:campaign-index:prior:unresolved",
    artifact_kind: "CAMPAIGN_EVIDENCE_INDEX",
    schema_id: "zoey.campaign-evidence-index",
    schema_revision: 1,
    content_fingerprint: `sha256:${"a".repeat(64)}`
  };
  const namespace = createAuthorityNamespaceIndex({
    artifact_id: "artifact:namespace-index:with-prior-campaign",
    namespace_id: prior.namespace_id,
    revision: prior.revision + 1,
    authority_identity: prior.authority_identity,
    prior_index: setup.namespace,
    prior_index_receipt_ref: createExactArtifactReference(setup.anchorReceipt),
    qualification_plan_refs: prior.qualification_plan_refs,
    qualification_result_refs: prior.qualification_result_refs,
    campaign_authorization_refs: prior.campaign_authorization_refs,
    campaign_index_refs: [...prior.campaign_index_refs, priorCampaignRef],
    bounded_result_refs: prior.bounded_result_refs,
    decision_refs: prior.decision_refs,
    anchor_receipt_refs: [
      ...prior.anchor_receipt_refs,
      createExactArtifactReference(setup.anchorReceipt)
    ].sort(referenceSort),
    manifest_bindings: prior.manifest_bindings,
    anchor_declarations: prior.anchor_declarations,
    cutoff_label: "namespace:history:required",
    producer_identity: prior.authority_identity,
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-22T17:50:00Z",
    created_by: prior.authority_identity
  });
  await assert.rejects(
    () => executeBoundedSelectedSliceCampaignForMechanismTest({
      ...inputFor(setup),
      authorizing_namespace: namespace
    }),
    /history context must close every prior indexed campaign exactly/
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
    campaign_decisions: [],
    historical_campaigns: [],
    additional_unresolved_closure: [],
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

function referenceSort(left, right) {
  return `${left.artifact_kind}:${left.artifact_id}:${left.content_fingerprint}`.localeCompare(
    `${right.artifact_kind}:${right.artifact_id}:${right.content_fingerprint}`
  );
}
