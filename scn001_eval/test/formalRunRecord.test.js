import assert from "node:assert/strict";
import test from "node:test";

import { createExactArtifactReference } from "../src/formalArtifactIdentity.js";
import { REQUIRED_CLAIM_CLASSES } from "../src/formalAuthority.js";
import {
  CLAIM_OBLIGATION_MAP,
  createFailureFinding,
  createFormalRunRecord,
  validateFormalRunRecord
} from "../src/formalRunRecord.js";
import {
  createAuthorizedAttempt,
  createFormalCampaignFixture
} from "../test_support/formalCampaignFixtures.js";

test("formal run sealing preserves orthogonal outcomes and complete durable evidence", async () => {
  const setup = await createFormalCampaignFixture();
  const attempt = await createAuthorizedAttempt(
    setup, setup.campaignAuthorization.identity_payload.attempt_slots[0]
  );
  const input = runInput(setup, attempt);
  const record = await createFormalRunRecord(input);
  assert.equal(record.identity_payload.run_validity, "VALID");
  assert.equal(record.identity_payload.invariant_result, "INVARIANTS_CLEAR");
  assert.equal(record.identity_payload.obligation_results.length, 5);
  assert.equal(record.identity_payload.authority_status,
    "AUTHORITY_PENDING_CAMPAIGN_INDEX_CLOSURE");
  assert.equal(validateFormalRunRecord(record, runContext(input)), record);
  assert.equal((await setup.store.readArtifact(
    createExactArtifactReference(record),
    (artifact) => validateFormalRunRecord(artifact, runContext(input))
  )).content_fingerprint, record.content_fingerprint);
});

test("required pressure cannot become NOT_APPLICABLE or import another path's obligations", async () => {
  const setup = await createFormalCampaignFixture();
  const attempt = await createAuthorizedAttempt(
    setup, setup.campaignAuthorization.identity_payload.attempt_slots[0]
  );
  const input = runInput(setup, attempt);
  const required = input.obligation_results.find((entry) => entry.pressure === "REQUIRED");
  required.result = "NOT_APPLICABLE";
  await assert.rejects(() => createFormalRunRecord(input), /incomplete or weakened/);

  const substituted = runInput(setup, attempt);
  const pressured = substituted.obligation_results.find((entry) => entry.pressure === "REQUIRED");
  pressured.obligation_ids = ["SCN001-SSFO-V0.2.0-OBL-SCOPE-002"];
  await assert.rejects(() => createFormalRunRecord(substituted), /incomplete or weakened/);
});

test("invalid attempts remain unscorable instead of fabricating SUT failure", async () => {
  const setup = await createFormalCampaignFixture();
  const attempt = await createAuthorizedAttempt(
    setup, setup.campaignAuthorization.identity_payload.attempt_slots[0]
  );
  const invalid = runInput(setup, attempt, {
    run_validity: "INVALID_UNSCORABLE",
    invariant_result: null,
    obligation_results: [],
    failure_findings: []
  });
  const record = await createFormalRunRecord(invalid);
  assert.equal(record.identity_payload.run_validity, "INVALID_UNSCORABLE");

  const mislabeled = runInput(setup, attempt, {
    run_validity: "INVALID_UNSCORABLE",
    invariant_result: "HARD_FAIL",
    obligation_results: passObligations(attempt.slot.path_id)
  });
  await assert.rejects(() => createFormalRunRecord(mislabeled), /cannot fabricate scored outcomes/);
});

test("hard failure requires an exact rule finding over sealed run evidence", async () => {
  const setup = await createFormalCampaignFixture();
  const attempt = await createAuthorizedAttempt(
    setup, setup.campaignAuthorization.identity_payload.attempt_slots[0]
  );
  const observedRef = createExactArtifactReference(attempt.evidenceArtifacts[4]);
  const finding = createFailureFinding({
    finding_id: "finding:hard-invariant:001",
    failure_kind: "HARD_INVARIANT",
    rule_id: "SCN001-SSFO-V0.2.0-INV-001",
    observed_refs: [observedRef],
    expected_classification: "NO_STALE_BASIS_PROMOTION",
    actual_classification: "STALE_BASIS_PROMOTED",
    affected_claim_classes: [...REQUIRED_CLAIM_CLASSES].sort()
  });
  const hard = runInput(setup, attempt, {
    invariant_result: "HARD_FAIL",
    failure_findings: [finding]
  });
  const record = await createFormalRunRecord(hard);
  assert.equal(record.identity_payload.invariant_result, "HARD_FAIL");

  const ungrounded = createFailureFinding({
    finding_id: "finding:hard-invariant:ungrounded",
    failure_kind: "HARD_INVARIANT",
    rule_id: "SCN001-SSFO-V0.2.0-INV-001",
    observed_refs: [{ ...observedRef, artifact_id: "artifact:not-in-run" }],
    expected_classification: "NO_STALE_BASIS_PROMOTION",
    actual_classification: "STALE_BASIS_PROMOTED",
    affected_claim_classes: [...REQUIRED_CLAIM_CLASSES].sort()
  });
  await assert.rejects(
    () => createFormalRunRecord(runInput(setup, attempt, {
      invariant_result: "HARD_FAIL",
      failure_findings: [ungrounded]
    })),
    /outside the sealed run/
  );
});

test("run sealing rejects actor collapse, missing control evidence, and cross-attempt capture", async () => {
  const setup = await createFormalCampaignFixture();
  const [firstSlot, secondSlot] = setup.campaignAuthorization.identity_payload.attempt_slots;
  const first = await createAuthorizedAttempt(setup, firstSlot);
  const second = await createAuthorizedAttempt(setup, secondSlot);

  const selfValidated = runInput(setup, first, {
    validator_identity: "actor:formal-run-producer",
    sealed_by: "actor:formal-run-producer"
  });
  await assert.rejects(() => createFormalRunRecord(selfValidated), /must be distinct/);

  const missingControl = runInput(setup, first);
  missingControl.evidence_artifacts = missingControl.evidence_artifacts.filter(
    (artifact) => createExactArtifactReference(artifact).artifact_id
      !== missingControl.initial_state_evidence_ref.artifact_id
  );
  await assert.rejects(
    () => createFormalRunRecord(missingControl),
    /missing required|absent|exact typed control-proof set/
  );

  const missingSelection = runInput(setup, first);
  missingSelection.evidence_artifacts = missingSelection.evidence_artifacts.filter(
    (artifact) => createExactArtifactReference(artifact).artifact_id
      !== missingSelection.selection_independence_evidence_ref.artifact_id
  );
  await assert.rejects(
    () => createFormalRunRecord(missingSelection),
    /missing required|absent|exact typed control-proof set/
  );

  const crossed = runInput(setup, first);
  crossed.evidence_artifacts[4] = second.evidenceArtifacts[4];
  await assert.rejects(() => createFormalRunRecord(crossed), /crosses campaign, attempt, or path|evidence list/);
});

function runInput(setup, attempt, overrides = {}) {
  return {
    store: setup.store,
    artifact_id: `artifact:formal-run:${attempt.slot.attempt_id}`,
    record_id: `record:formal-run:${attempt.slot.attempt_id}`,
    authorization: setup.campaignAuthorization,
    authority_context: setup.authorityContext,
    authorizing_namespace: setup.namespace,
    anchor_receipt: setup.anchorReceipt,
    anchor_public_key: setup.anchorPublicKey,
    start_grant: attempt.startGrant,
    attempt_allocation: attempt.attemptAllocation,
    evidence_artifacts: attempt.evidenceArtifacts,
    qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts,
    initial_state_evidence_ref: createExactArtifactReference(attempt.initialState),
    isolation_evidence_ref: createExactArtifactReference(attempt.isolation),
    selection_independence_evidence_ref: createExactArtifactReference(
      attempt.selectionIndependence
    ),
    delivered_bundle_ids: [`bundle:${attempt.slot.attempt_id}`],
    ordered_delivery_refs: attempt.orderedDeliveryRefs,
    provider_handles: {
      applicability: "not_applicable",
      reason_code: "deterministic_non_provider_sut",
      handles: {}
    },
    actual_seed_commitment: attempt.slot.seed_commitment,
    run_validity: "VALID",
    invariant_result: "INVARIANTS_CLEAR",
    obligation_results: passObligations(attempt.slot.path_id),
    failure_findings: [],
    predecessor_run_ref: null,
    producer_identity: "actor:formal-run-producer",
    validator_identity: "actor:formal-run-validator",
    seal_result: "VALIDATED_AND_SEALED",
    sealed_at: "2026-07-21T14:00:00Z",
    sealed_by: "actor:formal-run-validator",
    ...overrides
  };
}

function runContext(input) {
  return { ...input, evidenceArtifacts: input.evidence_artifacts };
}

function passObligations(pathId) {
  const pressure = CLAIM_OBLIGATION_MAP[pathId];
  return [...REQUIRED_CLAIM_CLASSES].sort().map((claimClass) => {
    const requirement = pressure[claimClass];
    return requirement ? {
      claim_class: claimClass,
      pressure: "REQUIRED",
      result: "PASS",
      obligation_ids: [...requirement.obligation_ids],
      checkpoint_ids: [...requirement.checkpoint_ids],
      finding_ids: []
    } : {
      claim_class: claimClass,
      pressure: "NON_PRESSURE",
      result: "NOT_APPLICABLE",
      obligation_ids: [],
      checkpoint_ids: [],
      finding_ids: []
    };
  });
}
