import {
  assertExactKeys,
  assertOpaqueId,
  canonicalizeJson,
  createExactArtifactReference,
  deepFreeze,
  fingerprintCanonicalJson
} from "./formalArtifactIdentity.js";
import {
  validateCampaignAuthorization,
  validateProspectiveExecutionStartPrerequisites
} from "./formalAuthority.js";
import {
  createFormalEvidenceRecorder,
  resolveDurableExecutionAuthority,
  validateAuthorityNamespaceIndex,
  validateFormalEvidenceArtifact
} from "./formalEvidence.js";
import {
  createFailureFinding,
  createFormalRunRecord
} from "./formalRunRecord.js";
import {
  createSelectedSlicePathSession,
  createSelectedSlicePathSessionForMechanismTest
} from "./selectedSliceFormalRunner.js";

export async function executeFormalSelectedSliceAttempt(input) {
  return executeFormalAttempt(input, null);
}

export async function executeFormalSelectedSliceAttemptForMechanismTest(input, sutBoundary) {
  return executeFormalAttempt(input, sutBoundary);
}

async function executeFormalAttempt(input, sutBoundary) {
  validatePipelineInput(input);
  const authorizationRef = createExactArtifactReference(input.authorization);
  const namespaceRef = createExactArtifactReference(input.authorizing_namespace);
  const receiptRef = createExactArtifactReference(input.anchor_receipt);
  const slot = input.authorization.identity_payload.attempt_slots.find(
    (candidate) => candidate.slot_id === input.slot_id
  );
  if (!slot) throw new Error("Formal pipeline slot is not a primary authorized attempt.");
  const sessionInput = { path_id: slot.path_id };
  const session = sutBoundary === null
    ? createSelectedSlicePathSession(sessionInput)
    : createSelectedSlicePathSessionForMechanismTest(sessionInput, sutBoundary);
  const recorder = createFormalEvidenceRecorder({
    store: input.store,
    authority_subject_ref: authorizationRef,
    campaign_authorization_ref: authorizationRef,
    attempt_id: slot.attempt_id,
    path_id: slot.path_id,
    producer_identity: input.evidence_producer_identity,
    validator_identity: input.evidence_validator_identity,
    event_namespace: `${input.artifact_namespace}:recorder`
  });
  const evidenceArtifacts = [];
  try {
    const attestationRequest = deepFreeze({
      profile: input.authorization.identity_payload.anchor_requirement.fresh_start_profile,
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      anchor_receipt_ref: receiptRef,
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      anchor_event_id: input.anchor_receipt.identity_payload.semantic_envelope.external_event_id,
      run_scope_id: session.run_ref
    });
    const freshAttestationBytes = await input.fresh_start_attestor(attestationRequest);
    const freshStart = await recorder.captureAuthenticatedFreshStart({
      artifact_id: `${input.artifact_namespace}:fresh-start`,
      raw_attestation_bytes: freshAttestationBytes,
      anchor_requirement: input.authorization.identity_payload.anchor_requirement,
      public_key: input.anchor_public_key,
      namespace_index_ref: namespaceRef,
      anchor_receipt_ref: receiptRef,
      slot_id: slot.slot_id,
      run_scope_id: session.run_ref,
      sealed_at: input.sealed_at
    });
    evidenceArtifacts.push(freshStart);
    const {
      capture_role: ignoredCaptureRole,
      ...freshStartProof
    } = freshStart.identity_payload.semantic_envelope;
    void ignoredCaptureRole;
    const preflight = validateProspectiveExecutionStartPrerequisites({
      authorization: input.authorization,
      slot_id: slot.slot_id,
      authorizing_namespace_ref: namespaceRef,
      anchor_receipt_ref: receiptRef,
      anchor_verification: deriveAnchorVerification(
        input.authorization, input.authorizing_namespace, input.anchor_receipt
      ),
      fresh_start_proof: {
        ...structuredClone(freshStartProof),
        verification_result: "VERIFIED"
      }
    });
    const initialInspection = await recorder.captureInitialInspection({
      artifact_id: `${input.artifact_namespace}:initial-inspection`,
      raw_bytes: canonicalBytes(session.initial_inspection),
      semantic_data: {
        subject_identity: `${input.artifact_namespace}:initial-inspection`,
        contract_digest: input.authority_context.behavior_manifest.identity_payload
          .public_boundary.inspection_contract_digest
      },
      sealed_at: input.sealed_at
    });
    evidenceArtifacts.push(initialInspection);
    const initialInspectionRef = createExactArtifactReference(initialInspection);
    const initialDigest = fingerprintCanonicalJson(
      "zoey:formal-initial-inspection:v1", session.initial_inspection
    );
    const initialState = await recorder.captureControlProof({
      artifact_id: `${input.artifact_namespace}:initial-state`,
      proof_role: "INITIAL_STATE_PROOF",
      proposition: {
        initial_snapshot_digest: initialDigest,
        initial_record_count: session.initial_inspection.records.length,
        prior_material_output_count: 0,
        run_scope_id: session.run_ref,
        observation_source: "FRESH_BOUNDARY_INSPECTION",
        initial_snapshot_ref: initialInspectionRef
      },
      sealed_at: input.sealed_at
    });
    evidenceArtifacts.push(initialState);
    const isolation = await recorder.captureControlProof({
      artifact_id: `${input.artifact_namespace}:run-isolation`,
      proof_role: "RUN_ISOLATION_PROOF",
      proposition: {
        run_scope_id: session.run_ref,
        foreign_run_ids: [],
        isolated: true,
        inspection_snapshot_digest: initialDigest,
        initial_snapshot_ref: initialInspectionRef
      },
      sealed_at: input.sealed_at
    });
    evidenceArtifacts.push(isolation);
    const selection = await recorder.captureControlProof({
      artifact_id: `${input.artifact_namespace}:selection-independence`,
      proof_role: "SELECTION_INDEPENDENCE",
      proposition: {
        selection_basis_digest: slot.selection_basis_digest,
        seed_commitment: slot.seed_commitment,
        material_output_observed: false,
        selection_event_id: `${input.artifact_namespace}:selection-event`
      },
      sealed_at: input.sealed_at
    });
    evidenceArtifacts.push(selection);
    const startGrant = await resolveDurableExecutionAuthority({
      store: input.store,
      authorization: input.authorization,
      authority_context: input.authority_context,
      preflight,
      namespace_index: input.authorizing_namespace,
      anchor_receipt: input.anchor_receipt,
      anchor_public_key: input.anchor_public_key,
      fresh_start_capture: freshStart,
      qualification_evidence_artifacts: input.qualification_evidence_artifacts
    });
    const transcript = session.executeRetainingInterruption();
    const captured = await captureTranscript(
      recorder, transcript, input.authorization, input.authority_context,
      input.artifact_namespace, input.sealed_at
    );
    evidenceArtifacts.push(...captured.evidenceArtifacts);
    if (transcript.execution_status === "INTERRUPTED") {
      return deepFreeze({
        execution_status: "INTERRUPTED_RETAINED",
        slot: structuredClone(slot),
        start_grant: startGrant,
        evidence_artifacts: evidenceArtifacts,
        evidence_refs: evidenceArtifacts.map(createExactArtifactReference),
        run_record: null,
        attempt_disposition: "ABANDONED_RETAINED",
        invalidity: structuredClone(transcript.interruption)
      });
    }
    const inspectionRefs = captured.inspectionArtifacts.map(createExactArtifactReference);
    const findings = transcript.failure_assertions.map((assertion) => createFailureFinding({
      ...structuredClone(assertion),
      observed_refs: inspectionRefs
    }));
    const attemptAllocation = {
      allocation_kind: "PROSPECTIVE_SLOT",
      authorization_ref: authorizationRef,
      slot_id: slot.slot_id,
      attempt_id: slot.attempt_id,
      path_id: slot.path_id,
      selection_basis_digest: slot.selection_basis_digest,
      lifecycle: "authorized",
      outcome_independent: true
    };
    const runInput = {
      store: input.store,
      artifact_id: `${input.artifact_namespace}:formal-run`,
      record_id: `${input.artifact_namespace}:record`,
      authorization: input.authorization,
      authority_context: input.authority_context,
      authorizing_namespace: input.authorizing_namespace,
      anchor_receipt: input.anchor_receipt,
      anchor_public_key: input.anchor_public_key,
      start_grant: startGrant,
      attempt_allocation: attemptAllocation,
      evidence_artifacts: evidenceArtifacts,
      qualification_evidence_artifacts: input.qualification_evidence_artifacts,
      initial_state_evidence_ref: createExactArtifactReference(initialState),
      isolation_evidence_ref: createExactArtifactReference(isolation),
      selection_independence_evidence_ref: createExactArtifactReference(selection),
      delivered_bundle_ids: transcript.events.filter(
        (event) => event.event_kind === "DELIVERED"
      ).map((event) => event.bundle_id).sort(),
      ordered_delivery_refs: captured.deliveredArtifacts.map(createExactArtifactReference),
      provider_handles: {
        applicability: "not_applicable",
        reason_code: "deterministic_non_provider_sut",
        handles: {}
      },
      actual_seed_commitment: slot.seed_commitment,
      run_validity: transcript.run_validity,
      invariant_result: transcript.invariant_result,
      obligation_results: transcript.obligation_results,
      failure_findings: findings,
      predecessor_run_ref: null,
      producer_identity: input.run_producer_identity,
      validator_identity: input.run_validator_identity,
      seal_result: "VALIDATED_AND_SEALED",
      sealed_at: input.sealed_at,
      sealed_by: input.run_validator_identity
    };
    const runRecord = await createFormalRunRecord(runInput);
    return deepFreeze({
      execution_status: "SEALED",
      slot: structuredClone(slot),
      start_grant: startGrant,
      transcript,
      evidence_artifacts: evidenceArtifacts,
      evidence_refs: evidenceArtifacts.map(createExactArtifactReference),
      run_record: runRecord,
      run_record_context: runInput,
      attempt_disposition: "SEALED_RECORD",
      invalidity: null
    });
  } finally {
    session.close();
  }
}

async function captureTranscript(
  recorder, transcript, authorization, authorityContext, namespace, sealedAt
) {
  const evidenceArtifacts = [];
  const inspectionArtifacts = [];
  const deliveredArtifacts = [];
  const boundary = authorityContext.behavior_manifest.identity_payload.public_boundary;
  const inputContractDigest = boundary.input_contract_digest;
  const outputContractDigest = boundary.output_contract_digest;
  const inspectionContractDigest = boundary.inspection_contract_digest;
  const simulatorFingerprint = authorization.identity_payload.evaluation_manifest_ref
    .manifest_artifact_fingerprint;
  let latestOutput = null;
  for (const event of transcript.events) {
    const suffix = String(event.event_order).padStart(4, "0");
    if (event.event_kind === "DELIVERED") {
      const inputArtifact = await recorder.captureRuntimeEvidence({
        artifact_id: `${namespace}:sut-input:${suffix}`,
        evidence_kind: "SUT_INPUT_CAPTURE",
        raw_bytes: canonicalBytes(event.source_material),
        semantic_data: {
          subject_identity: `${namespace}:bundle:${event.bundle_id}`,
          contract_digest: inputContractDigest
        },
        deliver_to_sut: true,
        sealed_at: sealedAt
      });
      evidenceArtifacts.push(inputArtifact);
      deliveredArtifacts.push(inputArtifact);
    }
    if (event.event_kind === "PROCESSED") {
      latestOutput = await recorder.captureRuntimeEvidence({
        artifact_id: `${namespace}:sut-output:${suffix}`,
        evidence_kind: "SUT_OUTPUT_CAPTURE",
        raw_bytes: canonicalBytes({
          result: event.result,
          output_state: event.inspection_after_event.records.filter(
            (record) => record.origin === "sut"
          )
        }),
        semantic_data: {
          subject_identity: `${namespace}:processed-output:${suffix}`,
          contract_digest: outputContractDigest
        },
        deliver_to_sut: false,
        sealed_at: sealedAt
      });
      evidenceArtifacts.push(latestOutput);
    }
    if (event.event_kind === "REALIZED") {
      if (latestOutput === null) {
        throw new Error("Simulator realization has no preceding exact SUT output capture.");
      }
      const request = await recorder.captureRuntimeEvidence({
        artifact_id: `${namespace}:simulator-request:${suffix}`,
        evidence_kind: "SIMULATOR_REQUEST_CAPTURE",
        raw_bytes: canonicalBytes({
          requested_sut_output_ref: createExactArtifactReference(latestOutput),
          bundle_id: event.bundle_id,
          transcript_event_order: event.event_order
        }),
        semantic_data: {
          requested_sut_output_ref: createExactArtifactReference(latestOutput),
          simulator_configuration_fingerprint: simulatorFingerprint
        },
        deliver_to_sut: false,
        sealed_at: sealedAt
      });
      evidenceArtifacts.push(request);
      const mismatches = event.result.filter((entry) => entry.fidelity !== "match");
      const realization = await recorder.captureRuntimeEvidence({
        artifact_id: `${namespace}:simulator-realization:${suffix}`,
        evidence_kind: "SIMULATOR_REALIZATION_CAPTURE",
        raw_bytes: canonicalBytes(event.result),
        semantic_data: {
          request_capture_ref: createExactArtifactReference(request),
          evaluator_private_premise_ref: null,
          simulator_configuration_fingerprint: simulatorFingerprint,
          fidelity: mismatches.length === 0 ? "EXACT" : "MISMATCH",
          mismatch_digest: mismatches.length === 0 ? null : fingerprintCanonicalJson(
            "zoey:simulator-mismatch:v1", mismatches
          ),
          origin: "simulator:selected-slice-fixture"
        },
        deliver_to_sut: true,
        sealed_at: sealedAt
      });
      evidenceArtifacts.push(realization);
      deliveredArtifacts.push(realization);
    }
    const inspection = await recorder.captureRuntimeEvidence({
      artifact_id: `${namespace}:sut-inspection:${suffix}`,
      evidence_kind: "SUT_INSPECTION_CAPTURE",
      raw_bytes: canonicalBytes(event.inspection_after_event),
      semantic_data: {
        subject_identity: `${namespace}:inspection:${suffix}`,
        contract_digest: inspectionContractDigest
      },
      deliver_to_sut: false,
      sealed_at: sealedAt
    });
    evidenceArtifacts.push(inspection);
    inspectionArtifacts.push(inspection);
  }
  return { evidenceArtifacts, inspectionArtifacts, deliveredArtifacts };
}

function deriveAnchorVerification(authorization, namespace, receipt) {
  validateFormalEvidenceArtifact(receipt);
  const semantics = receipt.identity_payload.semantic_envelope;
  return {
    authorization_ref: createExactArtifactReference(authorization),
    namespace_index_ref: createExactArtifactReference(namespace),
    anchor_receipt_ref: createExactArtifactReference(receipt),
    profile: semantics.profile,
    external_commit_sha: semantics.external_commit_sha,
    authority_ref: semantics.authority_ref,
    external_event_id: semantics.external_event_id,
    observed_predecessor: semantics.observed_predecessor,
    receipt_bytes_digest: semantics.raw_receipt_digest,
    validator_identity: receipt.identity_payload.validator_identity,
    producer_identity: receipt.identity_payload.producer_identity,
    source: semantics.profile === "PROTECTED_REMOTE_GATE"
      ? "EXTERNAL_PLATFORM"
      : "INDEPENDENT_ATTESTOR",
    verification_result: "VERIFIED"
  };
}

function validatePipelineInput(input) {
  assertExactKeys(input, [
    "store", "authorization", "authority_context", "authorizing_namespace",
    "anchor_receipt", "anchor_public_key", "slot_id", "fresh_start_attestor",
    "qualification_evidence_artifacts", "artifact_namespace",
    "evidence_producer_identity", "evidence_validator_identity",
    "run_producer_identity", "run_validator_identity", "sealed_at"
  ], [], "formal selected-slice pipeline input");
  validateCampaignAuthorization(input.authorization, input.authority_context);
  validateAuthorityNamespaceIndex(input.authorizing_namespace);
  validateFormalEvidenceArtifact(input.anchor_receipt);
  assertOpaqueId(input.slot_id, "formal pipeline slot_id");
  assertOpaqueId(input.artifact_namespace, "formal pipeline artifact_namespace");
  for (const field of [
    "evidence_producer_identity", "evidence_validator_identity",
    "run_producer_identity", "run_validator_identity"
  ]) assertOpaqueId(input[field], `formal pipeline ${field}`);
  if (typeof input.fresh_start_attestor !== "function") {
    throw new Error("Formal pipeline requires an external fresh-start attestor adapter.");
  }
  if (!Array.isArray(input.qualification_evidence_artifacts)) {
    throw new Error("Formal pipeline qualification evidence must be an array.");
  }
}

function canonicalBytes(value) {
  const jsonValue = JSON.parse(JSON.stringify(value));
  return Buffer.from(`${canonicalizeJson(jsonValue)}\n`, "utf8");
}
