import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createConfigurationManifestReference,
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import {
  ARTIFACT_HASH_DOMAIN,
  createExactArtifactReference,
  fingerprintCanonicalJson
} from "../src/formalArtifactIdentity.js";
import {
  validateCampaignAuthorization,
  validateProspectiveExecutionStartPrerequisites,
  validateQualificationPlan,
  validateQualificationResult
} from "../src/formalAuthority.js";
import {
  captureFormalEvidence,
  createAuthorityNamespaceIndex,
  createCampaignEvidenceIndex,
  createContentAddressedArtifactStore,
  resolveDurableExecutionAuthority,
  validateAuthorityNamespaceIndex,
  validateCampaignEvidenceIndex,
  validateFormalEvidenceArtifact,
  verifyDurableEvidence,
  verifySingleEffectiveNamespaceHead
} from "../src/formalEvidence.js";
import {
  createFormalAuthorityFixture,
  decisionReference,
  digest,
  evidenceReference,
  runRecordReference
} from "../test_support/formalFixtures.js";

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

test("content-addressed custody preserves exact bytes and rejects reconstructed values", async () => {
  const store = await temporaryStore();
  const bytes = Buffer.from([0x00, 0xff, 0x0a, 0x0d, 0x7b, 0x7d]);
  const custody = await store.writeRawBytes(bytes);
  assert.equal(custody.byte_digest, sha256(bytes));
  assert.deepEqual(await store.readRawBytes(custody), bytes);
  assert.deepEqual(await store.writeRawBytes(bytes), custody);
  await assert.rejects(() => store.writeRawBytes("normalized text"), /exact bytes/);
  await assert.rejects(
    () => store.readRawBytes({ ...custody, relative_path: "../escaped.bin" }),
    /normalized content-addressed relative path/
  );
});

test("typed evidence is durably replayable and preserves evaluator privacy", async () => {
  const store = await temporaryStore();
  const fixture = createFormalAuthorityFixture();
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const slot = fixture.campaignAuthorization.identity_payload.attempt_slots[0];
  const bytes = Buffer.from("{\"surface\":\"chat\",\"message\":\"fixture input\"}\n");
  const evidence = await captureFormalEvidence(store, evidenceInput({
    artifactId: "artifact:evidence:sut-input:001",
    evidenceKind: "SUT_INPUT_CAPTURE",
    authorityRef: authorizationRef,
    authorizationRef,
    slot,
    visibility: "SUT_VISIBLE",
    bytes,
    semantics: {
      capture_role: "EXACT_DELIVERED_INPUT",
      subject_identity: "fixture-input:scn001:001",
      event_id: "event:sut-ingress:001",
      content_digest: sha256(bytes),
      contract_digest: digest("2")
    }
  }));
  assert.equal(validateFormalEvidenceArtifact(evidence), evidence);
  assert.equal((await verifyDurableEvidence(store, evidence)).content_fingerprint,
    evidence.content_fingerprint);

  await assert.rejects(
    () => captureFormalEvidence(store, evidenceInput({
      artifactId: "artifact:evidence:privacy-leak:001",
      evidenceKind: "SUT_INPUT_CAPTURE",
      authorityRef: authorizationRef,
      authorizationRef,
      slot,
      visibility: "SUT_VISIBLE",
      bytes: Buffer.from("privacy attack"),
      semantics: {
        capture_role: "EXACT_DELIVERED_INPUT",
        subject_identity: "fixture-input:scn001:privacy-attack",
        event_id: "event:sut-ingress:privacy-attack",
        content_digest: sha256(Buffer.from("privacy attack")),
        contract_digest: digest("2"),
        expected_answer: "evaluator-only oracle"
      }
    })),
    /evaluator-private fields/
  );
});

test("simulator custody binds request, delivered projection, configuration, and fidelity", async () => {
  const store = await temporaryStore();
  const fixture = createFormalAuthorityFixture();
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const slot = fixture.campaignAuthorization.identity_payload.attempt_slots[0];
  const outputBytes = Buffer.from("{\"intent\":\"deliver_focused_drill\"}\n");
  const output = await captureFormalEvidence(store, evidenceInput({
    artifactId: "artifact:evidence:sut-output:001",
    evidenceKind: "SUT_OUTPUT_CAPTURE",
    authorityRef: authorizationRef,
    authorizationRef,
    slot,
    visibility: "SUT_VISIBLE",
    bytes: outputBytes,
    semantics: {
      capture_role: "EXACT_MATERIAL_OUTPUT",
      subject_identity: "sut-output:scn001:001",
      event_id: "event:sut-output:001",
      content_digest: sha256(outputBytes),
      contract_digest: digest("3")
    }
  }));
  const requestBytes = Buffer.from("{\"request\":\"realize exact SUT intent\"}\n");
  const request = await captureFormalEvidence(store, evidenceInput({
    artifactId: "artifact:evidence:simulator-request:001",
    evidenceKind: "SIMULATOR_REQUEST_CAPTURE",
    authorityRef: authorizationRef,
    authorizationRef,
    slot,
    visibility: "EVALUATOR_PRIVATE",
    bytes: requestBytes,
    semantics: {
      capture_role: "SIMULATOR_REQUEST",
      requested_sut_output_ref: createExactArtifactReference(output),
      simulator_configuration_fingerprint: digest("a"),
      event_id: "event:simulator-request:001",
      request_digest: sha256(requestBytes)
    }
  }));
  const realizationBytes = Buffer.from("{\"message\":\"try this focused drill\"}\n");
  const realization = await captureFormalEvidence(store, evidenceInput({
    artifactId: "artifact:evidence:simulator-realization:001",
    evidenceKind: "SIMULATOR_REALIZATION_CAPTURE",
    authorityRef: authorizationRef,
    authorizationRef,
    slot,
    visibility: "EVALUATOR_PRIVATE",
    bytes: realizationBytes,
    semantics: {
      capture_role: "SIMULATOR_REALIZATION",
      request_capture_ref: createExactArtifactReference(request),
      delivered_projection_digest: sha256(realizationBytes),
      evaluator_private_premise_ref: null,
      simulator_configuration_fingerprint: digest("a"),
      fidelity: "EXACT",
      mismatch_digest: null,
      origin: "simulator:fixture-realizer",
      event_id: "event:simulator-realization:001"
    }
  }));
  assert.equal((await verifyDurableEvidence(store, realization)).content_fingerprint,
    realization.content_fingerprint);

  const contradictory = structuredClone(realization);
  contradictory.identity_payload.semantic_envelope.mismatch_digest = digest("f");
  resign(contradictory);
  assert.throws(() => validateFormalEvidenceArtifact(contradictory), /fidelity closure/);
});

test("durable resolution is the sole transition from preflight to execution authority", async () => {
  const setup = await durableStartSetup();
  const grant = await resolveDurableExecutionAuthority({
    store: setup.store,
    authorization: setup.fixture.campaignAuthorization,
    authority_context: setup.fixture.authorityContext,
    preflight: setup.preflight,
    namespace_index: setup.namespace,
    anchor_receipt: setup.receipt,
    fresh_start_capture: setup.freshStart
  });
  assert.equal(grant.execution_start_authorized, true);
  assert.equal(grant.lifecycle, "started");
  assert.equal(grant.authority_status, "AUTHORITY_PENDING_CAMPAIGN_INDEX_CLOSURE");
  assert(Object.isFrozen(grant));

  const forged = structuredClone(setup.preflight);
  forged.fresh_start_proof.challenge = "challenge:forged-after-validation";
  await assert.rejects(
    () => resolveDurableExecutionAuthority({
      store: setup.store,
      authorization: setup.fixture.campaignAuthorization,
      authority_context: setup.fixture.authorityContext,
      preflight: forged,
      namespace_index: setup.namespace,
      anchor_receipt: setup.receipt,
      fresh_start_capture: setup.freshStart
    }),
    /exact preflight|receipt\/fresh-start evidence/
  );
});

test("durable authority fails closed on missing custody and a non-head namespace", async () => {
  const setup = await durableStartSetup();
  const absentStore = await temporaryStore();
  await assert.rejects(
    () => resolveDurableExecutionAuthority({
      store: absentStore,
      authorization: setup.fixture.campaignAuthorization,
      authority_context: setup.fixture.authorityContext,
      preflight: setup.preflight,
      namespace_index: setup.namespace,
      anchor_receipt: setup.receipt,
      fresh_start_capture: setup.freshStart
    }),
    /ENOENT/
  );

  const successor = namespaceIndex(setup.fixture, {
    artifact_id: "artifact:namespace-index:002",
    revision: 2,
    prior_index: setup.namespace,
    cutoff_label: "namespace:revision:002"
  });
  await setup.store.writeArtifact(successor, validateAuthorityNamespaceIndex);
  assert.equal((await verifySingleEffectiveNamespaceHead(
    setup.store, setup.namespace.identity_payload.namespace_id
  )).content_fingerprint, successor.content_fingerprint);
  await assert.rejects(
    () => resolveDurableExecutionAuthority({
      store: setup.store,
      authorization: setup.fixture.campaignAuthorization,
      authority_context: setup.fixture.authorityContext,
      preflight: setup.preflight,
      namespace_index: setup.namespace,
      anchor_receipt: setup.receipt,
      fresh_start_capture: setup.freshStart
    }),
    /non-head authority namespace revision/
  );
});

test("namespace history is cumulative and competing revisions are quarantined", async () => {
  const fixture = createFormalAuthorityFixture();
  const store = await temporaryStore();
  const first = namespaceIndex(fixture);
  await store.writeArtifact(first, validateAuthorityNamespaceIndex);
  const dropped = namespaceInput(fixture, {
    artifact_id: "artifact:namespace-index:dropped",
    revision: 2,
    prior_index: first,
    campaign_authorization_refs: [],
    manifest_bindings: [],
    anchor_declarations: [anchorDeclaration(fixture.qualificationPlan)],
    cutoff_label: "namespace:dropped"
  });
  assert.throws(() => createAuthorityNamespaceIndex(dropped), /dropped prior|close every/);

  const left = namespaceIndex(fixture, {
    artifact_id: "artifact:namespace-index:left",
    revision: 2,
    prior_index: first,
    cutoff_label: "namespace:left"
  });
  const right = namespaceIndex(fixture, {
    artifact_id: "artifact:namespace-index:right",
    revision: 2,
    prior_index: first,
    cutoff_label: "namespace:right"
  });
  await store.writeArtifact(left, validateAuthorityNamespaceIndex);
  await store.writeArtifact(right, validateAuthorityNamespaceIndex);
  await assert.rejects(
    () => verifySingleEffectiveNamespaceHead(store, first.identity_payload.namespace_id),
    /competing revisions or a fork/
  );
});

test("campaign index retains every authorized slot and closes local members globally", () => {
  const fixture = createFormalAuthorityFixture();
  const namespace = namespaceIndex(fixture);
  const evidenceRef = evidenceReference("artifact:evidence:attempt:001");
  const runRef = runRecordReference("artifact:run:attempt:001");
  const decisionRef = decisionReference("artifact:decision:attempt:001");
  const inventory = completeAttemptInventory(fixture.campaignAuthorization);
  inventory[0] = {
    ...inventory[0],
    disposition: "INVALID_RETAINED",
    run_record_ref: runRef,
    evidence_refs: [evidenceRef],
    invalidity_decision_ref: decisionRef
  };
  const index = createCampaignEvidenceIndex({
    artifact_id: "artifact:campaign-index:001",
    campaign_authorization: fixture.campaignAuthorization,
    authorizing_namespace: namespace,
    attempt_inventory: inventory,
    evidence_refs: [evidenceRef],
    run_record_refs: [runRef],
    decision_refs: [decisionRef],
    anchor_receipt_refs: [evidenceRef],
    qualification_plan_ref: createExactArtifactReference(fixture.qualificationPlan),
    qualification_result_ref: createExactArtifactReference(fixture.qualificationResult),
    prior_index: null,
    campaign_lifecycle: "suspended",
    cutoff_label: "campaign:suspended:001",
    producer_identity: "actor:campaign-index-producer",
    validator_identity: "actor:campaign-index-validator",
    validation_result: "VALIDATED",
    frozen_at: "2026-07-21T16:00:00Z",
    frozen_by: "actor:campaign-index-validator"
  });
  assert.equal(validateCampaignEvidenceIndex(index, {
    authorization: fixture.campaignAuthorization
  }), index);

  const omission = completeAttemptInventory(fixture.campaignAuthorization);
  omission.pop();
  assert.throws(
    () => createCampaignEvidenceIndex({
      artifact_id: "artifact:campaign-index:omission",
      campaign_authorization: fixture.campaignAuthorization,
      authorizing_namespace: namespace,
      attempt_inventory: omission,
      evidence_refs: [],
      run_record_refs: [],
      decision_refs: [],
      anchor_receipt_refs: [evidenceReference("artifact:anchor-receipt:omission")],
      qualification_plan_ref: createExactArtifactReference(fixture.qualificationPlan),
      qualification_result_ref: createExactArtifactReference(fixture.qualificationResult),
      prior_index: null,
      campaign_lifecycle: "closed",
      cutoff_label: "campaign:omission",
      producer_identity: "actor:campaign-index-producer",
      validator_identity: "actor:campaign-index-validator",
      validation_result: "VALIDATED",
      frozen_at: "2026-07-21T16:00:00Z",
      frozen_by: "actor:campaign-index-validator"
    }),
    /omits an authorized attempt slot/
  );

  const missingGlobalMember = structuredClone(index);
  missingGlobalMember.identity_payload.evidence_refs = [];
  missingGlobalMember.identity_payload.member_count -= 1;
  resign(missingGlobalMember);
  assert.throws(
    () => validateCampaignEvidenceIndex(missingGlobalMember, {
      authorization: fixture.campaignAuthorization
    }),
    /omitted from the campaign member list/
  );

  const reusedRun = structuredClone(index);
  reusedRun.identity_payload.attempt_inventory[1].disposition = "SEALED_RECORD";
  reusedRun.identity_payload.attempt_inventory[1].run_record_ref = runRef;
  resign(reusedRun);
  assert.throws(
    () => validateCampaignEvidenceIndex(reusedRun, {
      authorization: fixture.campaignAuthorization
    }),
    /map to exactly one attempt/
  );

  const wrongUnusedAuthority = structuredClone(index);
  const wrongAuthorizationRef = structuredClone(
    createExactArtifactReference(fixture.campaignAuthorization)
  );
  wrongAuthorizationRef.artifact_id = "artifact:campaign-authorization:different";
  wrongUnusedAuthority.identity_payload.attempt_inventory[1].disposition =
    "NOT_STARTED_CAMPAIGN_SUPERSEDED";
  wrongUnusedAuthority.identity_payload.attempt_inventory[1].unused_slot_disposition = {
    disposition_kind: "NOT_STARTED_CAMPAIGN_SUPERSEDED",
    campaign_authorization_ref: wrongAuthorizationRef,
    decisive_run_ref: null,
    basis_decision_ref: decisionRef,
    decisive_failure_digest: null,
    actor_identity: "actor:campaign-evaluator",
    recorded_at: "2026-07-21T16:01:00Z",
    material_output_observed: false
  };
  resign(wrongUnusedAuthority);
  assert.throws(
    () => validateCampaignEvidenceIndex(wrongUnusedAuthority, {
      authorization: fixture.campaignAuthorization
    }),
    /different campaign authorization/
  );

  const replacementAnchor = evidenceReference("artifact:anchor-receipt:replacement", "8");
  assert.throws(
    () => createCampaignEvidenceIndex({
      artifact_id: "artifact:campaign-index:dropped-history",
      campaign_authorization: fixture.campaignAuthorization,
      authorizing_namespace: namespace,
      attempt_inventory: completeAttemptInventory(fixture.campaignAuthorization),
      evidence_refs: [replacementAnchor],
      run_record_refs: [],
      decision_refs: [],
      anchor_receipt_refs: [replacementAnchor],
      qualification_plan_ref: createExactArtifactReference(fixture.qualificationPlan),
      qualification_result_ref: createExactArtifactReference(fixture.qualificationResult),
      prior_index: index,
      campaign_lifecycle: "closed",
      cutoff_label: "campaign:dropped-history",
      producer_identity: "actor:campaign-index-producer",
      validator_identity: "actor:campaign-index-validator",
      validation_result: "VALIDATED",
      frozen_at: "2026-07-21T16:30:00Z",
      frozen_by: "actor:campaign-index-validator"
    }),
    /dropped prior .* history/
  );
});

async function durableStartSetup() {
  const fixture = createFormalAuthorityFixture();
  const store = await temporaryStore();
  await store.writeConfigurationManifest(fixture.behaviorManifest, validateBehaviorConfigurationManifest);
  await store.writeConfigurationManifest(fixture.evaluationManifest, validateEvaluationConfigurationManifest);
  await store.writeArtifact(fixture.qualificationPlan, (artifact) => validateQualificationPlan(
    artifact, {
      behaviorManifest: fixture.behaviorManifest,
      evaluationManifest: fixture.evaluationManifest
    }
  ));
  await store.writeArtifact(fixture.qualificationResult, (artifact) => validateQualificationResult(
    artifact, {
      plan: fixture.qualificationPlan,
      behaviorManifest: fixture.behaviorManifest,
      evaluationManifest: fixture.evaluationManifest
    }
  ));
  await store.writeArtifact(fixture.campaignAuthorization, (artifact) => validateCampaignAuthorization(
    artifact, fixture.authorityContext
  ));
  const namespace = namespaceIndex(fixture);
  await store.writeArtifact(namespace, validateAuthorityNamespaceIndex);
  const namespaceRef = createExactArtifactReference(namespace);
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const receiptBytes = Buffer.from("{\"gate\":\"accepted\",\"event\":\"001\"}\n");
  const receipt = await captureFormalEvidence(store, evidenceInput({
    artifactId: "artifact:anchor-receipt:campaign:001",
    evidenceKind: "ANCHOR_RECEIPT",
    authorityRef: authorizationRef,
    authorizationRef,
    slot: null,
    visibility: "AUTHORITY_EXTERNAL",
    bytes: receiptBytes,
    semantics: {
      profile: "PROTECTED_REMOTE_GATE",
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      external_commit_sha: "a".repeat(40),
      authority_ref: "refs/heads/formal-authority",
      external_event_id: "event:protected-gate:001",
      observed_predecessor: "b".repeat(40),
      raw_receipt_digest: sha256(receiptBytes)
    },
    producer: "actor:campaign-producer",
    validator: "actor:external-gate-validator"
  }));
  const slot = fixture.campaignAuthorization.identity_payload.attempt_slots[0];
  const freshBytes = Buffer.from("fresh-start:challenge:001\n");
  const startInput = {
    authorization: fixture.campaignAuthorization,
    slot_id: slot.slot_id,
    authorizing_namespace_ref: namespaceRef,
    anchor_receipt_ref: createExactArtifactReference(receipt),
    anchor_verification: {
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      anchor_receipt_ref: createExactArtifactReference(receipt),
      profile: "PROTECTED_REMOTE_GATE",
      external_commit_sha: "a".repeat(40),
      authority_ref: "refs/heads/formal-authority",
      external_event_id: "event:protected-gate:001",
      observed_predecessor: "b".repeat(40),
      receipt_bytes_digest: sha256(receiptBytes),
      validator_identity: "actor:external-gate-validator",
      producer_identity: "actor:campaign-producer",
      source: "EXTERNAL_PLATFORM",
      verification_result: "VERIFIED"
    },
    fresh_start_proof: {
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: slot.slot_id,
      challenge: "challenge:post-anchor:001",
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:001",
      start_event_id: "event:attempt-start:001",
      capture_binding_digest: sha256(freshBytes),
      verification_result: "VERIFIED"
    }
  };
  const preflight = validateProspectiveExecutionStartPrerequisites(startInput);
  const freshStart = await captureFormalEvidence(store, evidenceInput({
    artifactId: "artifact:fresh-start:campaign:001",
    evidenceKind: "EVALUATOR_PRIVATE_CAPTURE",
    authorityRef: authorizationRef,
    authorizationRef,
    slot,
    visibility: "EVALUATOR_PRIVATE",
    bytes: freshBytes,
    semantics: {
      capture_role: "FRESH_START_PROOF",
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: slot.slot_id,
      challenge: "challenge:post-anchor:001",
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:001",
      start_event_id: "event:attempt-start:001",
      capture_binding_digest: sha256(freshBytes)
    },
    producer: "actor:external-gate",
    validator: "actor:fresh-start-validator"
  }));
  return { fixture, store, namespace, receipt, freshStart, preflight };
}

function namespaceIndex(fixture, overrides = {}) {
  return createAuthorityNamespaceIndex(namespaceInput(fixture, overrides));
}

function namespaceInput(fixture, overrides = {}) {
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const planRef = createExactArtifactReference(fixture.qualificationPlan);
  return {
    artifact_id: "artifact:namespace-index:001",
    namespace_id: fixture.campaignAuthorization.identity_payload.authority_namespace_id,
    revision: 1,
    authority_identity: "actor:zoey-project-owner",
    prior_index: null,
    qualification_plan_refs: [planRef],
    qualification_result_refs: [createExactArtifactReference(fixture.qualificationResult)],
    campaign_authorization_refs: [authorizationRef],
    campaign_index_refs: [],
    bounded_result_refs: [],
    decision_refs: [],
    anchor_receipt_refs: [],
    manifest_bindings: [{
      campaign_authorization_ref: authorizationRef,
      behavior_manifest_ref: createConfigurationManifestReference(fixture.behaviorManifest),
      evaluation_manifest_ref: createConfigurationManifestReference(fixture.evaluationManifest)
    }],
    anchor_declarations: [
      anchorDeclaration(fixture.campaignAuthorization),
      anchorDeclaration(fixture.qualificationPlan)
    ],
    cutoff_label: "namespace:revision:001",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T13:15:00Z",
    created_by: "actor:zoey-project-owner",
    ...overrides
  };
}

function anchorDeclaration(artifact) {
  return {
    subject_ref: createExactArtifactReference(artifact),
    profile: "PROTECTED_REMOTE_GATE",
    authority_ref: "refs/heads/formal-authority",
    receipt_required: true
  };
}

function evidenceInput({
  artifactId,
  evidenceKind,
  authorityRef,
  authorizationRef,
  slot,
  visibility,
  bytes,
  semantics,
  producer = "actor:evidence-producer",
  validator = "actor:evidence-validator"
}) {
  return {
    artifact_id: artifactId,
    evidence_kind: evidenceKind,
    authority_subject_ref: authorityRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: slot?.attempt_id ?? null,
    path_id: slot?.path_id ?? null,
    visibility,
    media_type: "application/octet-stream",
    encoding: "binary",
    raw_bytes: bytes,
    semantic_envelope: semantics,
    created_order: slot === null ? null : 1,
    delivered_order: slot === null ? null : 2,
    producer_identity: producer,
    validator_identity: validator,
    sealed_at: "2026-07-21T13:30:00Z"
  };
}

function completeAttemptInventory(authorization) {
  return [
    ...authorization.identity_payload.attempt_slots,
    ...authorization.identity_payload.contingency_slots
  ].map((slot) => ({
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    disposition: "UNSTARTED_NOT_ACTIVATED",
    run_record_ref: null,
    evidence_refs: [],
    invalidity_decision_ref: null,
    replacement_allocation: null,
    unused_slot_disposition: null
  }));
}

async function temporaryStore() {
  const root = await mkdtemp(join(tmpdir(), "zoey-formal-evidence-"));
  return createContentAddressedArtifactStore(root);
}

function resign(artifact) {
  artifact.content_fingerprint = fingerprintCanonicalJson(
    ARTIFACT_HASH_DOMAIN[artifact.artifact_kind], artifact.identity_payload
  );
}
