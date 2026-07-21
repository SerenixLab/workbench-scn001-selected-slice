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
  captureFormalEvidence,
  createAuthorityNamespaceIndex,
  createContentAddressedArtifactStore,
  resolveDurableExecutionAuthority,
  validateAuthorityNamespaceIndex
} from "../src/formalEvidence.js";
import {
  CLAIM_OBLIGATION_MAP,
  createFormalRunRecord
} from "../src/formalRunRecord.js";
import { createFormalAuthorityFixture, digest } from "./formalFixtures.js";

export const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export async function createFormalCampaignFixture(options = {}) {
  const fixture = createFormalAuthorityFixture(options);
  const root = await mkdtemp(join(tmpdir(), "zoey-formal-campaign-"));
  const store = createContentAddressedArtifactStore(root);
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
  const namespace = createAuthorityNamespaceIndex(namespaceInput(fixture));
  await store.writeArtifact(namespace, validateAuthorityNamespaceIndex);
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  const namespaceRef = createExactArtifactReference(namespace);
  const receiptBytes = Buffer.from("{\"gate\":\"accepted\",\"event\":\"campaign-fixture\"}\n");
  const anchorReceipt = await captureFormalEvidence(store, {
    artifact_id: "artifact:anchor-receipt:formal-campaign-fixture",
    evidence_kind: "ANCHOR_RECEIPT",
    authority_subject_ref: authorizationRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: null,
    path_id: null,
    visibility: "AUTHORITY_EXTERNAL",
    media_type: "application/json",
    encoding: "utf-8",
    raw_bytes: receiptBytes,
    semantic_envelope: {
      profile: "PROTECTED_REMOTE_GATE",
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      external_commit_sha: "a".repeat(40),
      authority_ref: "refs/heads/formal-authority",
      external_event_id: "event:protected-gate:formal-campaign-fixture",
      observed_predecessor: "b".repeat(40),
      raw_receipt_digest: sha256(receiptBytes)
    },
    created_order: null,
    delivered_order: null,
    producer_identity: "actor:campaign-producer",
    validator_identity: "actor:external-gate-validator",
    sealed_at: "2026-07-21T13:20:00Z"
  });
  return { ...fixture, store, namespace, anchorReceipt, receiptBytes };
}

export async function createAuthorizedAttempt(setup, slot) {
  const authorization = setup.campaignAuthorization;
  const authorizationRef = createExactArtifactReference(authorization);
  const namespaceRef = createExactArtifactReference(setup.namespace);
  const receiptRef = createExactArtifactReference(setup.anchorReceipt);
  const freshBytes = Buffer.from(`fresh-start:${slot.attempt_id}\n`);
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
      producer_identity: "actor:campaign-producer",
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
      capture_binding_digest: sha256(freshBytes),
      verification_result: "VERIFIED"
    }
  };
  const preflight = validateProspectiveExecutionStartPrerequisites(startInput);
  const freshStart = await captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:fresh-start:${slot.attempt_id}`,
    evidenceKind: "EVALUATOR_PRIVATE_CAPTURE",
    bytes: freshBytes,
    semantics: {
      capture_role: "FRESH_START_PROOF",
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: slot.slot_id,
      challenge: `challenge:${slot.attempt_id}`,
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:formal-campaign-fixture",
      start_event_id: `event:start:${slot.attempt_id}`,
      capture_binding_digest: sha256(freshBytes)
    },
    visibility: "EVALUATOR_PRIVATE",
    createdOrder: 1,
    deliveredOrder: null,
    producer: "actor:external-gate",
    validator: "actor:fresh-start-validator"
  });
  const startGrant = await resolveDurableExecutionAuthority({
    store: setup.store,
    authorization,
    authority_context: setup.authorityContext,
    preflight,
    namespace_index: setup.namespace,
    anchor_receipt: setup.anchorReceipt,
    fresh_start_capture: freshStart
  });
  const initialBytes = Buffer.from(`initial-state:${slot.attempt_id}\n`);
  const initialState = await privateControlEvidence(
    setup, slot, "INITIAL_STATE_PROOF", 2, initialBytes
  );
  const isolationBytes = Buffer.from(`run-isolation:${slot.attempt_id}\n`);
  const isolation = await privateControlEvidence(
    setup, slot, "RUN_ISOLATION_PROOF", 3, isolationBytes
  );
  const inputBytes = Buffer.from(`{\"input\":\"${slot.attempt_id}\"}\n`);
  const sutInput = await captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:sut-input:${slot.attempt_id}`,
    evidenceKind: "SUT_INPUT_CAPTURE",
    bytes: inputBytes,
    semantics: {
      capture_role: "EXACT_DELIVERED_INPUT",
      subject_identity: `sut-input:${slot.attempt_id}`,
      event_id: `event:input:${slot.attempt_id}`,
      content_digest: sha256(inputBytes),
      contract_digest: digest("2")
    },
    visibility: "SUT_VISIBLE",
    createdOrder: 4,
    deliveredOrder: 4
  });
  const outputBytes = Buffer.from(`{\"output\":\"${slot.attempt_id}\"}\n`);
  const sutOutput = await captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:sut-output:${slot.attempt_id}`,
    evidenceKind: "SUT_OUTPUT_CAPTURE",
    bytes: outputBytes,
    semantics: {
      capture_role: "EXACT_MATERIAL_OUTPUT",
      subject_identity: `sut-output:${slot.attempt_id}`,
      event_id: `event:output:${slot.attempt_id}`,
      content_digest: sha256(outputBytes),
      contract_digest: digest("3")
    },
    visibility: "SUT_VISIBLE",
    createdOrder: 5,
    deliveredOrder: null
  });
  const inspectionBytes = Buffer.from(`{\"inspection\":\"${slot.attempt_id}\"}\n`);
  const inspection = await captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:sut-inspection:${slot.attempt_id}`,
    evidenceKind: "SUT_INSPECTION_CAPTURE",
    bytes: inspectionBytes,
    semantics: {
      capture_role: "EXACT_INSPECTION_PROJECTION",
      subject_identity: `sut-inspection:${slot.attempt_id}`,
      event_id: `event:inspection:${slot.attempt_id}`,
      content_digest: sha256(inspectionBytes),
      contract_digest: digest("5")
    },
    visibility: "SUT_VISIBLE",
    createdOrder: 6,
    deliveredOrder: null
  });
  const requestBytes = Buffer.from(`{\"request\":\"${slot.attempt_id}\"}\n`);
  const simulatorRequest = await captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:simulator-request:${slot.attempt_id}`,
    evidenceKind: "SIMULATOR_REQUEST_CAPTURE",
    bytes: requestBytes,
    semantics: {
      capture_role: "SIMULATOR_REQUEST",
      requested_sut_output_ref: createExactArtifactReference(sutOutput),
      simulator_configuration_fingerprint: digest("a"),
      event_id: `event:simulator-request:${slot.attempt_id}`,
      request_digest: sha256(requestBytes)
    },
    visibility: "EVALUATOR_PRIVATE",
    createdOrder: 7,
    deliveredOrder: null
  });
  const realizationBytes = Buffer.from(`{\"realization\":\"${slot.attempt_id}\"}\n`);
  const simulatorRealization = await captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:simulator-realization:${slot.attempt_id}`,
    evidenceKind: "SIMULATOR_REALIZATION_CAPTURE",
    bytes: realizationBytes,
    semantics: {
      capture_role: "SIMULATOR_REALIZATION",
      request_capture_ref: createExactArtifactReference(simulatorRequest),
      delivered_projection_digest: sha256(realizationBytes),
      evaluator_private_premise_ref: null,
      simulator_configuration_fingerprint: digest("a"),
      fidelity: "EXACT",
      mismatch_digest: null,
      origin: "simulator:fixture-realizer",
      event_id: `event:simulator-realization:${slot.attempt_id}`
    },
    visibility: "EVALUATOR_PRIVATE",
    createdOrder: 8,
    deliveredOrder: 8
  });
  const evidenceArtifacts = [
    freshStart, initialState, isolation, sutInput, sutOutput, inspection,
    simulatorRequest, simulatorRealization
  ];
  return {
    slot,
    startGrant,
    evidenceArtifacts,
    initialState,
    isolation,
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
    start_grant: attempt.startGrant,
    attempt_allocation: attempt.attemptAllocation,
    evidence_artifacts: attempt.evidenceArtifacts,
    initial_state_evidence_ref: createExactArtifactReference(attempt.initialState),
    isolation_evidence_ref: createExactArtifactReference(attempt.isolation),
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

function namespaceInput(fixture) {
  const authorizationRef = createExactArtifactReference(fixture.campaignAuthorization);
  return {
    artifact_id: "artifact:namespace-index:formal-campaign-fixture:001",
    namespace_id: fixture.campaignAuthorization.identity_payload.authority_namespace_id,
    revision: 1,
    authority_identity: "actor:zoey-project-owner",
    prior_index: null,
    qualification_plan_refs: [createExactArtifactReference(fixture.qualificationPlan)],
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
    cutoff_label: "namespace:formal-campaign-fixture:001",
    producer_identity: "actor:zoey-project-owner",
    validator_identity: "actor:namespace-index-validator",
    validation_result: "VALIDATED",
    created_at: "2026-07-21T13:15:00Z",
    created_by: "actor:zoey-project-owner"
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

async function privateControlEvidence(setup, slot, role, order, bytes) {
  return captureAttemptEvidence(setup, slot, {
    artifactId: `artifact:${role.toLowerCase()}:${slot.attempt_id}`,
    evidenceKind: "EVALUATOR_PRIVATE_CAPTURE",
    bytes,
    semantics: {
      capture_role: role,
      subject_ref: createExactArtifactReference(setup.campaignAuthorization),
      content_digest: sha256(bytes),
      event_id: `event:${role.toLowerCase()}:${slot.attempt_id}`
    },
    visibility: "EVALUATOR_PRIVATE",
    createdOrder: order,
    deliveredOrder: null
  });
}

async function captureAttemptEvidence(setup, slot, input) {
  const authorizationRef = createExactArtifactReference(setup.campaignAuthorization);
  return captureFormalEvidence(setup.store, {
    artifact_id: input.artifactId,
    evidence_kind: input.evidenceKind,
    authority_subject_ref: authorizationRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    visibility: input.visibility,
    media_type: "application/octet-stream",
    encoding: "binary",
    raw_bytes: input.bytes,
    semantic_envelope: input.semantics,
    created_order: input.createdOrder,
    delivered_order: input.deliveredOrder,
    producer_identity: input.producer ?? "actor:evidence-producer",
    validator_identity: input.validator ?? "actor:evidence-validator",
    sealed_at: "2026-07-21T13:30:00Z"
  });
}
