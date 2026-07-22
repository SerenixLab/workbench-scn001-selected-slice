import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createConfigurationManifestReference,
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import { createExactArtifactReference } from "../src/formalArtifactIdentity.js";
import {
  REQUIRED_CLAIM_CLASSES,
  validateCampaignAuthorization,
  validateProspectiveExecutionStartPrerequisites,
  validateQualificationPlan,
  validateQualificationResult
} from "../src/formalAuthority.js";
import {
  captureAuthenticatedAnchorReceipt,
  createAuthorityNamespaceIndex,
  createContentAddressedArtifactStore,
  createFormalEvidenceRecorder,
  qualificationValidationBasisFingerprint,
  resolveDurableExecutionAuthority,
  validateAuthorityNamespaceIndex
} from "../src/formalEvidence.js";
import {
  CLAIM_OBLIGATION_MAP,
  createFormalRunRecord
} from "../src/formalRunRecord.js";
import {
  createFormalAuthorityFixture,
  digest,
  evidenceReference,
  rebuildFormalAuthorityFixture
} from "./formalFixtures.js";
import {
  FIXTURE_ANCHOR_PUBLIC_KEY,
  createFixtureAnchorReceiptBytes,
  createFixtureFreshStartAttestationBytes
} from "./anchorFixture.js";

export const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export async function createFormalCampaignFixture(options = {}) {
  const baseFixture = createFormalAuthorityFixture(options);
  const root = await mkdtemp(join(tmpdir(), "zoey-formal-campaign-"));
  const store = createContentAddressedArtifactStore(root);
  await store.writeConfigurationManifest(baseFixture.behaviorManifest, validateBehaviorConfigurationManifest);
  await store.writeConfigurationManifest(baseFixture.evaluationManifest, validateEvaluationConfigurationManifest);
  await store.writeArtifact(baseFixture.qualificationPlan, (artifact) => validateQualificationPlan(
    artifact, {
      behaviorManifest: baseFixture.behaviorManifest,
      evaluationManifest: baseFixture.evaluationManifest
    }
  ));
  const qualificationNamespace = createAuthorityNamespaceIndex(
    qualificationNamespaceInput(baseFixture)
  );
  await store.writeArtifact(qualificationNamespace, validateAuthorityNamespaceIndex);
  const qualificationReceipt = await qualificationAnchorReceipt(
    store, baseFixture.qualificationPlan, qualificationNamespace
  );
  const qualificationCaptures = [];
  const qualificationFreshStarts = [];
  for (const slot of baseFixture.qualificationPlan.identity_payload.execution_slots) {
    qualificationFreshStarts.push(await qualificationPrivateEvidence(
      store, baseFixture.qualificationPlan, slot.execution_id,
      "QUALIFICATION_FRESH_START_PROOF", qualificationReceipt
    ));
    qualificationCaptures.push(await qualificationPrivateEvidence(
      store, baseFixture.qualificationPlan, slot.execution_id,
      "ORACLE_CLASSIFICATION", null, slot
    ));
  }
  const evidenceBasis = {
    execution_capture_refs: qualificationCaptures.map(createExactArtifactReference),
    validation_attestation_ref: evidenceReference("artifact:qualification-validation:provisional"),
    anchor_receipt_ref: createExactArtifactReference(qualificationReceipt),
    fresh_start_proof_refs: qualificationFreshStarts.map(createExactArtifactReference)
  };
  const provisional = rebuildFormalAuthorityFixture(
    baseFixture, evidenceBasis, options.qualification ?? "QUALIFIED"
  );
  const qualificationValidation = await qualificationPrivateEvidence(
    store, baseFixture.qualificationPlan, "qualification:validation:fixture",
    "VALIDATION_ATTESTATION", null, null,
    options.qualification ?? "QUALIFIED",
    qualificationValidationBasisFingerprint(
      baseFixture.qualificationPlan, provisional.qualificationResult
    )
  );
  const qualificationEvidenceArtifacts = [
    qualificationReceipt, qualificationValidation,
    ...qualificationFreshStarts, ...qualificationCaptures
  ];
  const fixture = rebuildFormalAuthorityFixture(baseFixture, {
    ...evidenceBasis,
    validation_attestation_ref: createExactArtifactReference(qualificationValidation)
  }, options.qualification ?? "QUALIFIED");
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
  const namespace = createAuthorityNamespaceIndex(campaignNamespaceInput(
    fixture, qualificationNamespace, qualificationReceipt
  ));
  await store.writeArtifact(namespace, validateAuthorityNamespaceIndex);
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const namespaceRef = createExactArtifactReference(namespace);
  const receiptBytes = createFixtureAnchorReceiptBytes({
    profile: "PROTECTED_REMOTE_GATE",
    authority_subject_ref: authorizationRef,
    namespace_index_ref: namespaceRef,
    external_commit_sha: "a".repeat(40),
    authority_ref: "refs/heads/formal-authority",
    external_event_id: "event:protected-gate:formal-campaign-fixture",
    observed_predecessor: "b".repeat(40),
    producer_identity: "actor:external-anchor-platform",
    issued_at: "2026-07-21T13:19:00Z"
  });
  const anchorReceipt = await captureAuthenticatedAnchorReceipt(store, {
    artifact_id: "artifact:anchor-receipt:formal-campaign-fixture",
    raw_receipt_bytes: receiptBytes,
    anchor_requirement: fixture.campaignAuthorization.identity_payload.anchor_requirement,
    public_key: FIXTURE_ANCHOR_PUBLIC_KEY,
    expected_authority_subject_ref: authorizationRef,
    expected_namespace_index_ref: namespaceRef,
    campaign_authorization_ref: authorizationRef,
    validator_identity: "actor:external-gate-validator",
    sealed_at: "2026-07-21T13:20:00Z"
  });
  return {
    ...fixture, store, namespace, anchorReceipt, receiptBytes,
    qualificationNamespace, qualificationReceipt, qualificationEvidenceArtifacts,
    anchorPublicKey: FIXTURE_ANCHOR_PUBLIC_KEY
  };
}

export async function createAuthorizedAttempt(setup, slot) {
  const authorization = setup.campaignAuthorization;
  const authorizationRef = createExactArtifactReference(authorization);
  const namespaceRef = createExactArtifactReference(setup.namespace);
  const receiptRef = createExactArtifactReference(setup.anchorReceipt);
  const recorder = createFormalEvidenceRecorder({
    store: setup.store,
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
    anchor_receipt_ref: receiptRef,
    slot_id: slot.slot_id,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    challenge: `challenge:${slot.attempt_id}`,
    issued_by: "actor:external-gate",
    observed_by: "actor:external-gate",
    anchor_event_id: "event:protected-gate:formal-campaign-fixture",
    start_event_id: `event:start:${slot.attempt_id}`,
    run_scope_id: `run-scope:${slot.attempt_id}`,
    producer_identity: "actor:external-start-platform",
    issued_at: "2026-07-21T13:24:00Z"
  });
  const freshStart = await recorder.captureAuthenticatedFreshStart({
    artifact_id: `artifact:fresh-start:${slot.attempt_id}`,
    raw_attestation_bytes: freshAttestationBytes,
    anchor_requirement: authorization.identity_payload.anchor_requirement,
    public_key: setup.anchorPublicKey,
    namespace_index_ref: namespaceRef,
    anchor_receipt_ref: receiptRef,
    slot_id: slot.slot_id,
    run_scope_id: `run-scope:${slot.attempt_id}`,
    sealed_at: "2026-07-21T13:25:00Z"
  });
  const freshSemantics = freshStart.identity_payload.semantic_envelope;
  const startInput = {
    authorization,
    slot_id: slot.slot_id,
    authorizing_namespace_ref: namespaceRef,
    anchor_receipt_ref: receiptRef,
    anchor_verification: {
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      anchor_receipt_ref: receiptRef,
      profile: "PROTECTED_REMOTE_GATE",
      external_commit_sha: "a".repeat(40),
      authority_ref: "refs/heads/formal-authority",
      external_event_id: "event:protected-gate:formal-campaign-fixture",
      observed_predecessor: "b".repeat(40),
      receipt_bytes_digest: sha256(setup.receiptBytes),
      validator_identity: "actor:external-gate-validator",
      producer_identity: "actor:external-anchor-platform",
      source: "EXTERNAL_PLATFORM",
      verification_result: "VERIFIED"
    },
    fresh_start_proof: {
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: slot.slot_id,
      challenge: `challenge:${slot.attempt_id}`,
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:formal-campaign-fixture",
      start_event_id: `event:start:${slot.attempt_id}`,
      run_scope_id: `run-scope:${slot.attempt_id}`,
      capture_binding_digest: freshSemantics.capture_binding_digest,
      verification_result: "VERIFIED"
    }
  };
  const preflight = validateProspectiveExecutionStartPrerequisites(startInput);
  const startGrant = await resolveDurableExecutionAuthority({
    store: setup.store,
    authorization,
    authority_context: setup.authorityContext,
    preflight,
    namespace_index: setup.namespace,
    anchor_receipt: setup.anchorReceipt,
    anchor_public_key: setup.anchorPublicKey,
    fresh_start_capture: freshStart,
    qualification_evidence_artifacts: setup.qualificationEvidenceArtifacts
  });
  const initialState = await recorder.captureControlProof({
    artifact_id: `artifact:initial-state-proof:${slot.attempt_id}`,
    proof_role: "INITIAL_STATE_PROOF",
    proposition: {
      initial_snapshot_digest: digest("1"),
      initial_record_count: 0,
      prior_material_output_count: 0,
      run_scope_id: `run-scope:${slot.attempt_id}`,
      observation_source: "FRESH_BOUNDARY_INSPECTION"
    },
    sealed_at: "2026-07-21T13:26:00Z"
  });
  const isolation = await recorder.captureControlProof({
    artifact_id: `artifact:run-isolation-proof:${slot.attempt_id}`,
    proof_role: "RUN_ISOLATION_PROOF",
    proposition: {
      run_scope_id: `run-scope:${slot.attempt_id}`,
      foreign_run_ids: [],
      isolated: true,
      inspection_snapshot_digest: digest("2")
    },
    sealed_at: "2026-07-21T13:27:00Z"
  });
  const selectionIndependence = await recorder.captureControlProof({
    artifact_id: `artifact:selection-independence:${slot.attempt_id}`,
    proof_role: "SELECTION_INDEPENDENCE",
    proposition: {
      selection_basis_digest: slot.selection_basis_digest,
      seed_commitment: slot.seed_commitment,
      material_output_observed: false,
      selection_event_id: `event:selection:${slot.attempt_id}`
    },
    sealed_at: "2026-07-21T13:28:00Z"
  });
  const inputBytes = Buffer.from(`{\"input\":\"${slot.attempt_id}\"}\n`);
  const sutInput = await recorder.captureRuntimeEvidence({
    artifact_id: `artifact:sut-input:${slot.attempt_id}`,
    evidence_kind: "SUT_INPUT_CAPTURE",
    raw_bytes: inputBytes,
    semantic_data: {
      subject_identity: `sut-input:${slot.attempt_id}`,
      contract_digest: digest("2")
    },
    deliver_to_sut: true,
    sealed_at: "2026-07-21T13:30:00Z"
  });
  const outputBytes = Buffer.from(`{\"output\":\"${slot.attempt_id}\"}\n`);
  const sutOutput = await recorder.captureRuntimeEvidence({
    artifact_id: `artifact:sut-output:${slot.attempt_id}`,
    evidence_kind: "SUT_OUTPUT_CAPTURE",
    raw_bytes: outputBytes,
    semantic_data: {
      subject_identity: `sut-output:${slot.attempt_id}`,
      contract_digest: digest("3")
    },
    deliver_to_sut: false,
    sealed_at: "2026-07-21T13:31:00Z"
  });
  const inspectionBytes = Buffer.from(`{\"inspection\":\"${slot.attempt_id}\"}\n`);
  const inspection = await recorder.captureRuntimeEvidence({
    artifact_id: `artifact:sut-inspection:${slot.attempt_id}`,
    evidence_kind: "SUT_INSPECTION_CAPTURE",
    raw_bytes: inspectionBytes,
    semantic_data: {
      subject_identity: `sut-inspection:${slot.attempt_id}`,
      contract_digest: digest("5")
    },
    deliver_to_sut: false,
    sealed_at: "2026-07-21T13:32:00Z"
  });
  const requestBytes = Buffer.from(`{\"request\":\"${slot.attempt_id}\"}\n`);
  const simulatorRequest = await recorder.captureRuntimeEvidence({
    artifact_id: `artifact:simulator-request:${slot.attempt_id}`,
    evidence_kind: "SIMULATOR_REQUEST_CAPTURE",
    raw_bytes: requestBytes,
    semantic_data: {
      requested_sut_output_ref: createExactArtifactReference(sutOutput),
      simulator_configuration_fingerprint: digest("a")
    },
    deliver_to_sut: false,
    sealed_at: "2026-07-21T13:33:00Z"
  });
  const realizationBytes = Buffer.from(`{\"realization\":\"${slot.attempt_id}\"}\n`);
  const simulatorRealization = await recorder.captureRuntimeEvidence({
    artifact_id: `artifact:simulator-realization:${slot.attempt_id}`,
    evidence_kind: "SIMULATOR_REALIZATION_CAPTURE",
    raw_bytes: realizationBytes,
    semantic_data: {
      request_capture_ref: createExactArtifactReference(simulatorRequest),
      evaluator_private_premise_ref: null,
      simulator_configuration_fingerprint: digest("a"),
      fidelity: "EXACT",
      mismatch_digest: null,
      origin: "simulator:fixture-realizer"
    },
    deliver_to_sut: true,
    sealed_at: "2026-07-21T13:34:00Z"
  });
  const evidenceArtifacts = [
    freshStart, initialState, isolation, selectionIndependence, sutInput, sutOutput, inspection,
    simulatorRequest, simulatorRealization
  ];
  return {
    slot,
    startGrant,
    evidenceArtifacts,
    initialState,
    isolation,
    selectionIndependence,
    orderedDeliveryRefs: [
      createExactArtifactReference(sutInput),
      createExactArtifactReference(simulatorRealization)
    ],
    attemptAllocation: {
      allocation_kind: "PROSPECTIVE_SLOT",
      authorization_ref: authorizationRef,
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      selection_basis_digest: slot.selection_basis_digest,
      lifecycle: "authorized",
      outcome_independent: true
    }
  };
}

export async function createSealedRun(setup, slot, outcomeFactory = () => ({})) {
  const attempt = await createAuthorizedAttempt(setup, slot);
  const outcomes = outcomeFactory(attempt);
  const input = {
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
    ...outcomes
  };
  const record = await createFormalRunRecord(input);
  return { record, context: input, attempt };
}

export function passObligations(pathId) {
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

function qualificationNamespaceInput(fixture) {
  return {
    artifact_id: "artifact:namespace-index:qualification-fixture:001",
    namespace_id: fixture.qualificationPlan.identity_payload.authority_namespace_id,
    revision: 1,
    authority_identity: "actor:zoey-project-owner",
    prior_index: null,
    prior_index_receipt_ref: null,
    qualification_plan_refs: [createExactArtifactReference(fixture.qualificationPlan)],
    qualification_result_refs: [],
    campaign_authorization_refs: [],
    campaign_index_refs: [],
    bounded_result_refs: [],
    decision_refs: [],
    anchor_receipt_refs: [],
    manifest_bindings: [],
    anchor_declarations: [anchorDeclaration(fixture.qualificationPlan)],
    cutoff_label: "namespace:qualification-fixture:001",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T11:50:00Z",
    created_by: "actor:zoey-project-owner"
  };
}

function campaignNamespaceInput(fixture, qualificationNamespace, qualificationReceipt) {
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  return {
    artifact_id: "artifact:namespace-index:formal-campaign-fixture:002",
    namespace_id: fixture.campaignAuthorization.identity_payload.authority_namespace_id,
    revision: 2,
    authority_identity: "actor:zoey-project-owner",
    prior_index: qualificationNamespace,
    prior_index_receipt_ref: createExactArtifactReference(qualificationReceipt),
    qualification_plan_refs: [createExactArtifactReference(fixture.qualificationPlan)],
    qualification_result_refs: [createExactArtifactReference(fixture.qualificationResult)],
    campaign_authorization_refs: [authorizationRef],
    campaign_index_refs: [],
    bounded_result_refs: [],
    decision_refs: [],
    anchor_receipt_refs: [createExactArtifactReference(qualificationReceipt)],
    manifest_bindings: [{
      campaign_authorization_ref: authorizationRef,
      behavior_manifest_ref: createConfigurationManifestReference(fixture.behaviorManifest),
      evaluation_manifest_ref: createConfigurationManifestReference(fixture.evaluationManifest)
    }],
    anchor_declarations: [
      anchorDeclaration(fixture.campaignAuthorization),
      anchorDeclaration(fixture.qualificationPlan)
    ],
    cutoff_label: "namespace:formal-campaign-fixture:002",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T13:15:00Z",
    created_by: "actor:zoey-project-owner"
  };
}

async function qualificationAnchorReceipt(store, plan, namespace) {
  const planRef = createExactArtifactReference(plan);
  const namespaceRef = createExactArtifactReference(namespace);
  const bytes = createFixtureAnchorReceiptBytes({
    profile: "PROTECTED_REMOTE_GATE",
    authority_subject_ref: planRef,
    namespace_index_ref: namespaceRef,
    external_commit_sha: "8".repeat(40),
    authority_ref: "refs/heads/formal-authority",
    external_event_id: "event:protected-gate:qualification-fixture",
    observed_predecessor: "9".repeat(40),
    producer_identity: "actor:external-anchor-platform",
    issued_at: "2026-07-21T11:54:00Z"
  });
  return captureAuthenticatedAnchorReceipt(store, {
    artifact_id: "artifact:anchor-receipt:qualification-fixture",
    raw_receipt_bytes: bytes,
    anchor_requirement: plan.identity_payload.anchor_requirement,
    public_key: FIXTURE_ANCHOR_PUBLIC_KEY,
    expected_authority_subject_ref: planRef,
    expected_namespace_index_ref: namespaceRef,
    campaign_authorization_ref: null,
    validator_identity: "actor:external-gate-validator",
    sealed_at: "2026-07-21T11:55:00Z"
  });
}

async function qualificationPrivateEvidence(
  store, plan, subjectId, role, anchorReceipt = null, slot = null,
  qualificationResult = "QUALIFIED", validationBasis = digest("d")
) {
  const planRef = createExactArtifactReference(plan);
  const producer = role === "QUALIFICATION_FRESH_START_PROOF"
    ? "actor:external-start-observer"
    : role === "VALIDATION_ATTESTATION"
      ? "actor:qualification-result-validator"
      : "actor:qualification-producer";
  const recorder = createFormalEvidenceRecorder({
    store,
    authority_subject_ref: planRef,
    campaign_authorization_ref: null,
    attempt_id: null,
    path_id: null,
    producer_identity: producer,
    validator_identity: "actor:qualification-evidence-validator",
    event_namespace: `recorder:${subjectId.replaceAll(":", "-")}`
  });
  const proofRole = role === "ORACLE_CLASSIFICATION"
    ? "QUALIFICATION_ORACLE_CLASSIFICATION"
    : role;
  const proposition = role === "QUALIFICATION_FRESH_START_PROOF" ? {
      profile: "GATE_LAUNCHED_ATTEMPT",
      execution_id: subjectId,
      plan_ref: planRef,
      anchor_receipt_ref: createExactArtifactReference(anchorReceipt),
      anchor_event_id: anchorReceipt.identity_payload.semantic_envelope.external_event_id,
      start_event_id: `event:start:${subjectId}`
    } : role === "ORACLE_CLASSIFICATION" ? {
      execution_id: subjectId,
      path_id: slot.path_id,
      plan_ref: planRef,
      oracle_projection_digest: digest("b"),
      comparator_input_digest: digest("c")
    } : {
      validated_subject_ref: planRef,
      validation_profile: "qualification-comparison-v1",
      evidence_basis_digest: validationBasis,
      recomputed_result: qualificationResult,
      validation_result: "VALID"
    };
  return recorder.captureControlProof({
    artifact_id: `artifact:${role.toLowerCase()}:${subjectId.replaceAll(":", "-")}`,
    proof_role: proofRole,
    proposition,
    sealed_at: "2026-07-21T12:20:00Z"
  });
}

function anchorDeclaration(artifact) {
  return {
    subject_ref: createExactArtifactReference(artifact),
    profile: "PROTECTED_REMOTE_GATE",
    authority_ref: "refs/heads/formal-authority",
    receipt_required: true
  };
}
