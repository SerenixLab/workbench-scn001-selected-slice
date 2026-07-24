import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, mkdtemp, symlink } from "node:fs/promises";
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
  canonicalizeJson,
  createCanonicalArtifact,
  createExactArtifactReference,
  fingerprintCanonicalJson
} from "../src/formalArtifactIdentity.js";
import {
  attemptStartAllocationBindingFingerprint,
  validateCampaignAuthorization,
  validateProspectiveExecutionStartPrerequisites,
  validateQualificationPlan,
  validateQualificationResult
} from "../src/formalAuthority.js";
import {
  captureAuthenticatedAnchorReceipt,
  captureFormalEvidence,
  createAuthorityNamespaceIndex,
  createCampaignEvidenceIndex,
  createContentAddressedArtifactStore,
  createFormalEvidenceRecorder,
  resolveDurableExecutionAuthority,
  validateAuthorityNamespaceIndex,
  validateCampaignEvidenceIndex,
  validateFormalEvidenceArtifact,
  verifyAuthenticatedAnchorReceipt,
  verifyDurableEvidence,
  verifyTypedControlProof,
  verifySingleEffectiveNamespaceHead
} from "../src/formalEvidence.js";
import {
  createFormalAuthorityFixture,
  decisionReference,
  digest,
  evidenceReference,
  runRecordReference
} from "../test_support/formalFixtures.js";
import { createFormalCampaignFixture } from "../test_support/formalCampaignFixtures.js";
import { createFixtureFreshStartAttestationBytes } from "../test_support/anchorFixture.js";

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

test("custody rejects symlinked parents and conflicting global artifact identities", async () => {
  const parent = await mkdtemp(join(tmpdir(), "zoey-formal-evidence-hostile-"));
  const root = join(parent, "store");
  const outside = join(parent, "outside");
  await mkdir(root);
  await mkdir(outside);
  await symlink(outside, join(root, "raw"), "dir");
  const hostileStore = createContentAddressedArtifactStore(root);
  await assert.rejects(
    () => hostileStore.writeRawBytes(Buffer.from("must remain inside custody")),
    /real directory|symlink/
  );

  const store = await temporaryStore();
  const fixture = createFormalAuthorityFixture();
  const original = fixture.qualificationPlan;
  const conflictingPayload = structuredClone(original.identity_payload);
  conflictingPayload.created_at = "2026-07-21T12:00:01Z";
  const conflicting = createCanonicalArtifact({
    artifact_id: original.artifact_id,
    artifact_kind: original.artifact_kind,
    identity_payload: conflictingPayload
  });
  const validator = (artifact) => validateQualificationPlan(artifact, {
    behaviorManifest: fixture.behaviorManifest,
    evaluationManifest: fixture.evaluationManifest
  });
  await store.writeArtifact(original, validator);
  await assert.rejects(
    () => store.writeArtifact(conflicting, validator),
    /Artifact identity conflict/
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

test("signed anchor receipts derive semantics from owner-pinned canonical bytes", async () => {
  const setup = await createFormalCampaignFixture();
  assert.equal((await verifyAuthenticatedAnchorReceipt(
    setup.store,
    setup.anchorReceipt,
    setup.campaignAuthorization.identity_payload.anchor_requirement,
    setup.anchorPublicKey
  )).content_fingerprint, setup.anchorReceipt.content_fingerprint);

  const wrongKey = generateKeyPairSync("ed25519").publicKey;
  await assert.rejects(
    () => verifyAuthenticatedAnchorReceipt(
      setup.store,
      setup.anchorReceipt,
      setup.campaignAuthorization.identity_payload.anchor_requirement,
      wrongKey
    ),
    /owner-pinned authentication policy/
  );

  const document = JSON.parse(setup.receiptBytes.toString("utf8"));
  document.signed_payload.external_event_id = "event:forged-after-signing";
  const forgedBytes = Buffer.from(`${canonicalizeJson(document)}\n`, "utf8");
  await assert.rejects(
    () => captureAuthenticatedAnchorReceipt(setup.store, {
      artifact_id: "artifact:anchor-receipt:forged",
      raw_receipt_bytes: forgedBytes,
      anchor_requirement: setup.campaignAuthorization.identity_payload.anchor_requirement,
      public_key: setup.anchorPublicKey,
      expected_authority_subject_ref: createExactArtifactReference(setup.campaignAuthorization),
      expected_namespace_index_ref: createExactArtifactReference(setup.namespace),
      campaign_authorization_ref: createExactArtifactReference(setup.campaignAuthorization),
      validator_identity: "actor:external-gate-validator",
      sealed_at: "2026-07-21T13:21:00Z"
    }),
    /signature authentication failed/
  );
});

test("recorder owns chronology and typed proof replay rejects label-only assertions", async () => {
  const setup = await createFormalCampaignFixture();
  const authorizationRef = createExactArtifactReference(setup.campaignAuthorization);
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  const recorder = createFormalEvidenceRecorder({
    store: setup.store,
    authority_subject_ref: authorizationRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    producer_identity: "actor:chronology-recorder",
    validator_identity: "actor:chronology-validator",
    event_namespace: "recorder:chronology-test"
  });
  const fresh = await recorder.captureControlProof({
    artifact_id: "artifact:proof:fresh:chronology-test",
    proof_role: "FRESH_START_PROOF",
    proposition: {
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: slot.slot_id,
      challenge: "challenge:chronology-test",
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:formal-campaign-fixture",
      start_event_id: "event:start:chronology-test",
      run_scope_id: "run-scope:chronology-test",
      allocation_binding_digest: attemptStartAllocationBindingFingerprint(slot)
    },
    sealed_at: "2026-07-21T13:29:00Z"
  });
  const initialSnapshot = {
    runRef: "run-scope:chronology-test",
    records: [],
    relations: []
  };
  const initialInspection = await recorder.captureInitialInspection({
    artifact_id: "artifact:inspection:initial:chronology-test",
    raw_bytes: Buffer.from(`${canonicalizeJson(initialSnapshot)}\n`, "utf8"),
    semantic_data: {
      subject_identity: "inspection:initial:chronology-test",
      contract_digest: digest("2")
    },
    sealed_at: "2026-07-21T13:29:30Z"
  });
  const initialInspectionRef = createExactArtifactReference(initialInspection);
  const initial = await recorder.captureControlProof({
    artifact_id: "artifact:proof:initial:chronology-test",
    proof_role: "INITIAL_STATE_PROOF",
    proposition: {
      initial_snapshot_digest: fingerprintCanonicalJson(
        "zoey:formal-initial-inspection:v1", initialSnapshot
      ),
      initial_record_count: 0,
      prior_material_output_count: 0,
      run_scope_id: "run-scope:chronology-test",
      observation_source: "FRESH_BOUNDARY_INSPECTION",
      initial_snapshot_ref: initialInspectionRef
    },
    sealed_at: "2026-07-21T13:30:00Z"
  });
  const isolation = await recorder.captureControlProof({
    artifact_id: "artifact:proof:isolation:chronology-test",
    proof_role: "RUN_ISOLATION_PROOF",
    proposition: {
      run_scope_id: "run-scope:chronology-test",
      foreign_run_ids: [],
      isolated: true,
      inspection_snapshot_digest: fingerprintCanonicalJson(
        "zoey:formal-initial-inspection:v1", initialSnapshot
      ),
      initial_snapshot_ref: initialInspectionRef
    },
    sealed_at: "2026-07-21T13:32:00Z"
  });
  const selection = await recorder.captureControlProof({
    artifact_id: "artifact:proof:selection:chronology-test",
    proof_role: "SELECTION_INDEPENDENCE",
    proposition: {
      selection_basis_digest: slot.selection_basis_digest,
      seed_commitment: slot.seed_commitment,
      material_output_observed: false,
      selection_event_id: "event:selection:chronology-test"
    },
    sealed_at: "2026-07-21T13:33:00Z"
  });
  const inputCapture = await recorder.captureRuntimeEvidence({
    artifact_id: "artifact:sut-input:chronology-test",
    evidence_kind: "SUT_INPUT_CAPTURE",
    raw_bytes: Buffer.from("{\"input\":\"chronology\"}\n"),
    semantic_data: {
      subject_identity: "sut-input:chronology-test",
      contract_digest: digest("2")
    },
    deliver_to_sut: true,
    sealed_at: "2026-07-21T13:34:00Z"
  });
  assert.deepEqual([
    fresh.identity_payload.created_order,
    initialInspection.identity_payload.created_order,
    initial.identity_payload.created_order,
    isolation.identity_payload.created_order,
    selection.identity_payload.created_order,
    inputCapture.identity_payload.created_order,
    inputCapture.identity_payload.delivered_order
  ], [1, 2, 3, 4, 5, 6, 7]);
  assert.equal((await verifyTypedControlProof(setup.store, initial)).content_fingerprint,
    initial.content_fingerprint);

  await assert.rejects(
    () => recorder.captureControlProof({
      artifact_id: "artifact:proof:caller-order",
      proof_role: "RUN_ISOLATION_PROOF",
      proposition: {
        run_scope_id: "run-scope:chronology-test",
        foreign_run_ids: [],
        isolated: true,
        inspection_snapshot_digest: digest("3")
      },
      created_order: 99,
      sealed_at: "2026-07-21T13:33:00Z"
    }),
    /invalid fields/
  );

  const labelBytes = Buffer.from("initial-state:true\n");
  const labelOnly = await captureFormalEvidence(setup.store, evidenceInput({
    artifactId: "artifact:proof:label-only",
    evidenceKind: "EVALUATOR_PRIVATE_CAPTURE",
    authorityRef: authorizationRef,
    authorizationRef,
    slot,
    visibility: "EVALUATOR_PRIVATE",
    bytes: labelBytes,
    semantics: {
      capture_role: "INITIAL_STATE_PROOF",
      subject_ref: authorizationRef,
      content_digest: sha256(labelBytes),
      event_id: "event:label-only"
    }
  }));
  await assert.rejects(
    () => verifyTypedControlProof(setup.store, labelOnly),
    /not valid JSON/
  );
});

test("recorder rejects concurrent capture before chronology can fork", async () => {
  const setup = await createFormalCampaignFixture();
  const authorizationRef = createExactArtifactReference(setup.campaignAuthorization);
  const slot = setup.campaignAuthorization.identity_payload.attempt_slots[0];
  const recorder = createFormalEvidenceRecorder({
    store: setup.store,
    authority_subject_ref: authorizationRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    producer_identity: "actor:concurrency-recorder",
    validator_identity: "actor:concurrency-validator",
    event_namespace: "recorder:concurrency-test"
  });
  const proposition = {
    profile: "GATE_LAUNCHED_ATTEMPT",
    slot_id: slot.slot_id,
    challenge: "challenge:concurrency-test",
    issued_by: "actor:external-gate",
    observed_by: "actor:external-gate",
    anchor_event_id: "event:protected-gate:formal-campaign-fixture",
    start_event_id: "event:start:concurrency-test",
    run_scope_id: "run-scope:concurrency-test",
    allocation_binding_digest: attemptStartAllocationBindingFingerprint(slot)
  };
  const results = await Promise.allSettled([
    recorder.captureControlProof({
      artifact_id: "artifact:proof:fresh:concurrency-a",
      proof_role: "FRESH_START_PROOF",
      proposition,
      sealed_at: "2026-07-21T13:29:00Z"
    }),
    recorder.captureControlProof({
      artifact_id: "artifact:proof:fresh:concurrency-b",
      proof_role: "FRESH_START_PROOF",
      proposition,
      sealed_at: "2026-07-21T13:29:00Z"
    })
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.match(results.find((result) => result.status === "rejected").reason.message,
    /concurrent chronology mutation/);
  await assert.rejects(
    () => recorder.captureControlProof({
      artifact_id: "artifact:proof:after-concurrency",
      proof_role: "INITIAL_STATE_PROOF",
      proposition: {
        initial_snapshot_digest: digest("1"),
        initial_record_count: 0,
        prior_material_output_count: 0,
        run_scope_id: "run-scope:concurrency-test",
        observation_source: "FRESH_BOUNDARY_INSPECTION"
      },
      sealed_at: "2026-07-21T13:30:00Z"
    }),
    /terminal after a failed capture/
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
    anchor_public_key: setup.anchorPublicKey,
    fresh_start_capture: setup.freshStart,
    qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts
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
      anchor_public_key: setup.anchorPublicKey,
      fresh_start_capture: setup.freshStart,
      qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts
    }),
    /exact preflight|receipt\/fresh-start evidence/
  );

  await assert.rejects(
    () => resolveDurableExecutionAuthority({
      store: setup.store,
      authorization: setup.fixture.campaignAuthorization,
      authority_context: setup.fixture.authorityContext,
      preflight: setup.preflight,
      namespace_index: setup.namespace,
      anchor_receipt: setup.receipt,
      anchor_public_key: setup.anchorPublicKey,
      fresh_start_capture: setup.freshStart,
      qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts.slice(1)
    }),
    /Qualification evidence does not close every exact planned artifact/
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
      anchor_public_key: setup.anchorPublicKey,
      fresh_start_capture: setup.freshStart,
      qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts
    }),
    /ENOENT/
  );

  const successor = namespaceIndex(setup.fixture, {
    artifact_id: "artifact:namespace-index:002",
    revision: 3,
    prior_index: setup.namespace,
    prior_index_receipt_ref: createExactArtifactReference(setup.receipt),
    anchor_receipt_refs: [
      ...setup.namespace.identity_payload.anchor_receipt_refs,
      createExactArtifactReference(setup.receipt)
    ].sort((left, right) => left.artifact_id.localeCompare(right.artifact_id)),
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
      anchor_public_key: setup.anchorPublicKey,
      fresh_start_capture: setup.freshStart,
      qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts
    }),
    /non-head authority namespace revision/
  );
});

test("namespace history is cumulative and competing revisions are quarantined", async () => {
  const fixture = createFormalAuthorityFixture();
  const store = await temporaryStore();
  const first = namespaceIndex(fixture);
  await store.writeArtifact(first, validateAuthorityNamespaceIndex);
  const priorReceiptRef = evidenceReference("artifact:namespace-receipt:prior");
  const dropped = namespaceInput(fixture, {
    artifact_id: "artifact:namespace-index:dropped",
    revision: 2,
    prior_index: first,
    prior_index_receipt_ref: priorReceiptRef,
    anchor_receipt_refs: [priorReceiptRef],
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
    prior_index_receipt_ref: priorReceiptRef,
    anchor_receipt_refs: [priorReceiptRef],
    cutoff_label: "namespace:left"
  });
  const right = namespaceIndex(fixture, {
    artifact_id: "artifact:namespace-index:right",
    revision: 2,
    prior_index: first,
    prior_index_receipt_ref: priorReceiptRef,
    anchor_receipt_refs: [priorReceiptRef],
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
    lifecycle_reason: "authority_review_required",
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
      lifecycle_reason: "planned_attempt_set_closed",
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
      lifecycle_reason: "planned_attempt_set_closed",
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
  const campaign = await createFormalCampaignFixture();
  const fixture = campaign;
  const { store, namespace } = campaign;
  const namespaceRef = createExactArtifactReference(namespace);
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const receiptBytes = campaign.receiptBytes;
  const receipt = campaign.anchorReceipt;
  const slot = fixture.campaignAuthorization.identity_payload.attempt_slots[0];
  const allocationBindingDigest = attemptStartAllocationBindingFingerprint(slot);
  const recorder = createFormalEvidenceRecorder({
    store,
    authority_subject_ref: authorizationRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    producer_identity: "actor:formal-evidence-recorder",
    validator_identity: "actor:formal-evidence-validator",
    event_namespace: `recorder:${slot.attempt_id}`
  });
  const freshAttestationBytes = createFixtureFreshStartAttestationBytes({
    profile: "GATE_LAUNCHED_ATTEMPT",
    authorization_ref: authorizationRef,
    namespace_index_ref: namespaceRef,
    anchor_receipt_ref: createExactArtifactReference(receipt),
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    challenge: "challenge:post-anchor:001",
    issued_by: "actor:external-gate",
    observed_by: "actor:external-gate",
    anchor_event_id: "event:protected-gate:formal-campaign-fixture",
    start_event_id: "event:attempt-start:001",
    run_scope_id: "run-scope:attempt-start:001",
    allocation_binding_digest: allocationBindingDigest,
    producer_identity: "actor:external-start-platform",
    issued_at: "2026-07-21T13:29:00Z"
  });
  const freshStart = await recorder.captureAuthenticatedFreshStart({
    artifact_id: "artifact:fresh-start:campaign:001",
    raw_attestation_bytes: freshAttestationBytes,
    anchor_requirement: fixture.campaignAuthorization.identity_payload.anchor_requirement,
    public_key: campaign.anchorPublicKey,
    namespace_index_ref: namespaceRef,
    anchor_receipt_ref: createExactArtifactReference(receipt),
    slot_id: slot.slot_id,
    run_scope_id: "run-scope:attempt-start:001",
    allocation_binding_digest: allocationBindingDigest,
    sealed_at: "2026-07-21T13:30:00Z"
  });
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
      external_event_id: "event:protected-gate:formal-campaign-fixture",
      observed_predecessor: "b".repeat(40),
      receipt_bytes_digest: sha256(receiptBytes),
      validator_identity: "actor:external-gate-validator",
      producer_identity: "actor:external-anchor-platform",
      source: "EXTERNAL_PLATFORM",
      verification_result: "VERIFIED"
    },
    fresh_start_proof: {
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: slot.slot_id,
      challenge: "challenge:post-anchor:001",
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:formal-campaign-fixture",
      start_event_id: "event:attempt-start:001",
      run_scope_id: "run-scope:attempt-start:001",
      allocation_binding_digest: allocationBindingDigest,
      capture_binding_digest: freshStart.identity_payload.semantic_envelope.capture_binding_digest,
      verification_result: "VERIFIED"
    }
  };
  const preflight = validateProspectiveExecutionStartPrerequisites(startInput);
  return {
    fixture, store, namespace, receipt, freshStart, preflight,
    qualificationEvidenceArtifacts: campaign.qualificationEvidenceArtifacts,
    anchorPublicKey: campaign.anchorPublicKey
  };
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
    prior_index_receipt_ref: null,
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
