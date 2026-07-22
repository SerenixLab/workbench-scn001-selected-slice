import assert from "node:assert/strict";
import test from "node:test";

import {
  SUT_PUBLIC_BOUNDARY_METHODS,
  createSutBoundary
} from "@zoey/scn001-sut-core";

import { REQUIRED_PATHS } from "../src/formalAuthority.js";
import { verifyDurableEvidence } from "../src/formalEvidence.js";
import {
  executeFormalSelectedSliceAttempt,
  executeFormalSelectedSliceAttemptForMechanismTest
} from "../src/selectedSliceFormalPipeline.js";
import { createFormalCampaignFixture } from "../test_support/formalCampaignFixtures.js";
import { createFixtureFreshStartAttestationBytes } from "../test_support/anchorFixture.js";

test("trusted pipeline seals actual four-path outcomes and durable transcript evidence", async () => {
  const setup = await createFormalCampaignFixture();
  for (const [index, pathId] of REQUIRED_PATHS.entries()) {
    const slot = setup.campaignAuthorization.identity_payload.attempt_slots.find(
      (candidate) => candidate.path_id === pathId
    );
    const result = await executeFormalSelectedSliceAttempt(
      pipelineInput(setup, slot, `artifact:pipeline:${index + 1}`)
    );
    assert.equal(result.execution_status, "SEALED");
    assert.equal(result.transcript.path_id, pathId);
    assert.equal(result.run_record.identity_payload.run_validity, result.transcript.run_validity);
    assert.deepEqual(
      result.run_record.identity_payload.obligation_results,
      result.transcript.obligation_results
    );
    assert.equal(result.attempt_disposition, "SEALED_RECORD");
    assert.ok(result.evidence_artifacts.length > 4);
    for (const artifact of result.evidence_artifacts) {
      assert.equal((await verifyDurableEvidence(setup.store, artifact)).content_fingerprint,
        artifact.content_fingerprint);
    }
  }
});

test("pipeline input has no caller-authored outcome or chronology fields", async () => {
  const setup = await createFormalCampaignFixture();
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  await assert.rejects(
    () => executeFormalSelectedSliceAttempt({
      ...pipelineInput(setup, slot, "artifact:pipeline:caller-outcome"),
      run_validity: "VALID",
      obligation_results: []
    }),
    /invalid fields/
  );
});

test("signed fresh start must bind the exact recorder-owned run scope", async () => {
  const setup = await createFormalCampaignFixture();
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  const input = pipelineInput(setup, slot, "artifact:pipeline:wrong-run-scope");
  input.fresh_start_attestor = async (request) => createFixtureFreshStartAttestationBytes({
    ...structuredClone(request),
    run_scope_id: "run-scope:attestor-substitution",
    challenge: "challenge:pipeline:wrong-scope",
    issued_by: "actor:external-gate",
    observed_by: "actor:external-gate",
    start_event_id: "event:pipeline-start:wrong-scope",
    producer_identity: "actor:external-start-platform",
    issued_at: "2026-07-22T15:59:00Z"
  });
  await assert.rejects(
    () => executeFormalSelectedSliceAttempt(input),
    /signed payload conflicts on run_scope_id/
  );
});

test("unsigned fresh-start material is rejected before path execution", async () => {
  const setup = await createFormalCampaignFixture();
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  const input = pipelineInput(setup, slot, "artifact:pipeline:unsigned-start");
  input.fresh_start_attestor = async () => Buffer.from("{}\n", "utf8");
  await assert.rejects(
    () => executeFormalSelectedSliceAttempt(input),
    /authenticated fresh-start attestation has invalid fields/
  );
});

test("execution interruption retains partial evidence without sealing a scored run", async () => {
  const setup = await createFormalCampaignFixture();
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  const base = createSutBoundary();
  const interruptedBoundary = Object.freeze(Object.fromEntries(
    SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
      method,
      method === "ingestSutVisibleInputs"
        ? () => { throw new Error("injected fixture ingress interruption"); }
        : (...argumentsReceived) => base[method](...argumentsReceived)
    ])
  ));
  const result = await executeFormalSelectedSliceAttemptForMechanismTest(
    pipelineInput(setup, slot, "artifact:pipeline:interrupted"),
    interruptedBoundary
  );
  assert.equal(result.execution_status, "INTERRUPTED_RETAINED");
  assert.equal(result.attempt_disposition, "ABANDONED_RETAINED");
  assert.equal(result.run_record, null);
  assert.equal(result.invalidity.reason_code, "SCN001-SSFO-V0.2.0-VAL-010");
  assert.match(result.invalidity.message, /injected fixture ingress interruption/);
  assert.equal(result.evidence_artifacts.length, 4);
  for (const artifact of result.evidence_artifacts) {
    await verifyDurableEvidence(setup.store, artifact);
  }
});

test("pipeline seals runner-derived failure and downstream not-reached outcomes", async () => {
  const setup = await createFormalCampaignFixture();
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  const base = createSutBoundary();
  const missingOutputsBoundary = Object.freeze(Object.fromEntries(
    SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
      method,
      method === "emitAvailableOutputs"
        ? () => []
        : (...argumentsReceived) => base[method](...argumentsReceived)
    ])
  ));
  const result = await executeFormalSelectedSliceAttemptForMechanismTest(
    pipelineInput(setup, slot, "artifact:pipeline:derived-failure"),
    missingOutputsBoundary
  );
  const byClaim = new Map(result.run_record.identity_payload.obligation_results.map(
    (entry) => [entry.claim_class, entry.result]
  ));
  assert.equal(result.execution_status, "SEALED");
  assert.equal(result.run_record.identity_payload.invariant_result, "INVARIANTS_CLEAR");
  assert.equal(byClaim.get("CC-EVIDENCE-TRIAL-FORMATION"), "OBLIGATION_FAIL");
  assert.equal(byClaim.get("CC-SCOPE-TRIAL-USE"), "NOT_REACHED");
  assert.deepEqual(
    result.run_record.identity_payload.failure_findings.map((finding) => finding.rule_id),
    ["SCN001-SSFO-V0.2.0-OBL-EVID-004"]
  );
  assert.ok(result.run_record.identity_payload.failure_findings[0].observed_refs.length > 0);
});

function pipelineInput(setup, slot, artifactNamespace) {
  return {
    store: setup.store,
    authorization: setup.campaignAuthorization,
    authority_context: setup.authorityContext,
    authorizing_namespace: setup.namespace,
    anchor_receipt: setup.anchorReceipt,
    anchor_public_key: setup.anchorPublicKey,
    slot_id: slot.slot_id,
    fresh_start_attestor: async (request) => createFixtureFreshStartAttestationBytes({
      ...structuredClone(request),
      challenge: `challenge:pipeline:${slot.attempt_id}`,
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      start_event_id: `event:pipeline-start:${slot.attempt_id}`,
      producer_identity: "actor:external-start-platform",
      issued_at: "2026-07-22T15:59:00Z"
    }),
    qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts,
    artifact_namespace: artifactNamespace,
    evidence_producer_identity: "actor:formal-pipeline-recorder",
    evidence_validator_identity: "actor:formal-pipeline-evidence-validator",
    run_producer_identity: "actor:formal-pipeline-run-producer",
    run_validator_identity: "actor:formal-pipeline-run-validator",
    sealed_at: "2026-07-22T16:00:00Z"
  };
}
