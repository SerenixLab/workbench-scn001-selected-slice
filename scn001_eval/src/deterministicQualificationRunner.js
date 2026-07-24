import {
  assertExactKeys,
  assertOpaqueId,
  canonicalizeJson,
  createExactArtifactReference,
  deepFreeze,
  fingerprintCanonicalJson
} from "./formalArtifactIdentity.js";
import {
  REQUIRED_PATHS,
  createQualificationResult,
  validateQualificationPlan,
  validateQualificationResult
} from "./formalAuthority.js";
import {
  createFormalEvidenceRecorder,
  normalizeQualificationComparatorInput,
  qualificationComparatorInputFingerprint,
  qualificationOracleProjectionFingerprint,
  qualificationValidationBasisFingerprint,
  validateAuthorityNamespaceIndex,
  validateFormalEvidenceArtifact,
  verifyAuthenticatedAnchorReceipt,
  verifyDurableQualificationEvidence
} from "./formalEvidence.js";
import {
  createSelectedSlicePathSession,
  createSelectedSlicePathSessionForMechanismTest
} from "./selectedSliceFormalRunner.js";

const COMPARATOR_DEFINITION = deepFreeze({
  profile_id: "DEQ-SCN001-V1",
  profile_revision: "1",
  implementation: "selected-slice-graph-alpha-renaming-and-exact-jcs-v1",
  normalization: "first-occurrence alpha-renaming of run-local UUID identities",
  exclusions: "none beyond declared run-local identity spelling"
});

export const SELECTED_SLICE_QUALIFICATION_EQUIVALENCE = deepFreeze({
  profile_id: COMPARATOR_DEFINITION.profile_id,
  profile_revision: COMPARATOR_DEFINITION.profile_revision,
  comparator_fingerprint: fingerprintCanonicalJson(
    "zoey:qualification-comparator-implementation:v1", COMPARATOR_DEFINITION
  ),
  normalization_rules_digest: fingerprintCanonicalJson(
    "zoey:qualification-normalization-rules:v1", {
      rule: COMPARATOR_DEFINITION.normalization
    }
  ),
  exclusion_rules_digest: fingerprintCanonicalJson(
    "zoey:qualification-exclusion-rules:v1", {
      rule: COMPARATOR_DEFINITION.exclusions
    }
  )
});

export async function executeDeterministicQualification(input) {
  return executeQualification(input, null);
}

export async function executeDeterministicQualificationForMechanismTest(
  input, sessionFactory
) {
  if (typeof sessionFactory !== "function") {
    throw new Error("Qualification mechanism test requires a session factory.");
  }
  return executeQualification(input, sessionFactory);
}

async function executeQualification(input, sessionFactory) {
  validateInput(input);
  const planRef = createExactArtifactReference(input.plan);
  const namespaceRef = createExactArtifactReference(input.authorizing_namespace);
  const receiptRef = createExactArtifactReference(input.anchor_receipt);
  await verifyPlanAuthority(input, planRef, namespaceRef);
  const executions = [];
  const evidenceArtifacts = [input.anchor_receipt];
  const freshStartProofRefs = [];
  for (const slot of input.plan.identity_payload.execution_slots) {
    const session = sessionFactory === null
      ? createSelectedSlicePathSession({ path_id: slot.path_id })
      : sessionFactory(slot, createSelectedSlicePathSessionForMechanismTest);
    try {
      const recorder = createFormalEvidenceRecorder({
        store: input.store,
        authority_subject_ref: planRef,
        campaign_authorization_ref: null,
        attempt_id: null,
        path_id: null,
        producer_identity: input.evidence_producer_identity,
        validator_identity: input.evidence_validator_identity,
        event_namespace: `${input.artifact_namespace}:${slot.execution_id}`
      });
      const attestationRequest = deepFreeze({
        profile: input.plan.identity_payload.anchor_requirement.fresh_start_profile,
        plan_ref: planRef,
        namespace_index_ref: namespaceRef,
        anchor_receipt_ref: receiptRef,
        execution_id: slot.execution_id,
        path_id: slot.path_id,
        selection_basis_digest: slot.selection_basis_digest,
        anchor_event_id: input.anchor_receipt.identity_payload.semantic_envelope.external_event_id,
        run_scope_id: session.run_ref
      });
      const rawStart = await input.fresh_start_attestor(attestationRequest);
      const start = await recorder.captureAuthenticatedQualificationStart({
        artifact_id: `${input.artifact_namespace}:start:${slot.execution_id}`,
        raw_attestation_bytes: rawStart,
        anchor_requirement: input.plan.identity_payload.anchor_requirement,
        public_key: input.anchor_public_key,
        namespace_index_ref: namespaceRef,
        anchor_receipt_ref: receiptRef,
        execution_id: slot.execution_id,
        path_id: slot.path_id,
        selection_basis_digest: slot.selection_basis_digest,
        run_scope_id: session.run_ref,
        sealed_at: input.sealed_at
      });
      evidenceArtifacts.push(start);
      freshStartProofRefs.push(createExactArtifactReference(start));
      const transcript = session.executeRetainingInterruption();
      const completed = transcript.execution_status === "COMPLETED";
      const oracleMaterial = qualificationOracleMaterial(transcript);
      const comparatorInput = completed
        ? normalizeQualificationComparatorInput(oracleMaterial)
        : null;
      const oracleProjectionDigest = qualificationOracleProjectionFingerprint(oracleMaterial);
      const comparatorInputDigest = qualificationComparatorInputFingerprint(comparatorInput);
      const capture = await recorder.captureControlProof({
        artifact_id: `${input.artifact_namespace}:oracle:${slot.execution_id}`,
        proof_role: "QUALIFICATION_ORACLE_CLASSIFICATION",
        proposition: {
          execution_id: slot.execution_id,
          path_id: slot.path_id,
          plan_ref: planRef,
          oracle_projection_digest: oracleProjectionDigest,
          comparator_input_digest: comparatorInputDigest,
          execution_status: completed ? "COMPLETED" : "INVALID",
          run_scope_id: session.run_ref,
          oracle_projection: oracleMaterial,
          comparator_input: comparatorInput
        },
        sealed_at: input.sealed_at
      });
      evidenceArtifacts.push(capture);
      executions.push({
        execution_id: slot.execution_id,
        path_id: slot.path_id,
        status: completed ? "COMPLETED" : "INVALID",
        capture_refs: [createExactArtifactReference(capture)],
        oracle_projection_digest: oracleProjectionDigest,
        comparator_input_digest: comparatorInputDigest
      });
    } finally {
      session.close();
    }
  }
  const comparisons = deriveComparisons(input.plan, executions, evidenceArtifacts);
  const resultClassification = deriveResult(executions, comparisons);
  const resultInput = {
    artifact_id: input.result_artifact_id,
    plan: input.plan,
    behavior_manifest: input.behavior_manifest,
    evaluation_manifest: input.evaluation_manifest,
    executions,
    comparisons,
    result: resultClassification,
    producer_identity: input.result_producer_identity,
    validator_identity: input.result_validator_identity,
    validation_result: "VALIDATED",
    validation_attestation_ref: placeholderEvidenceReference(
      `${input.artifact_namespace}:validation:placeholder`
    ),
    anchor_receipt_ref: receiptRef,
    fresh_start_proof_refs: freshStartProofRefs,
    supersedes_result_ref: null,
    correction_decision_ref: null,
    sealed_at: input.sealed_at,
    sealed_by: input.result_validator_identity
  };
  const provisional = createQualificationResult(resultInput);
  const validationRecorder = createFormalEvidenceRecorder({
    store: input.store,
    authority_subject_ref: planRef,
    campaign_authorization_ref: null,
    attempt_id: null,
    path_id: null,
    producer_identity: input.result_validator_identity,
    validator_identity: input.evidence_validator_identity,
    event_namespace: `${input.artifact_namespace}:validation`
  });
  const validation = await validationRecorder.captureControlProof({
    artifact_id: input.validation_artifact_id,
    proof_role: "VALIDATION_ATTESTATION",
    proposition: {
      validated_subject_ref: planRef,
      validation_profile: "qualification-comparison-v1",
      evidence_basis_digest: qualificationValidationBasisFingerprint(input.plan, provisional),
      recomputed_result: resultClassification,
      validation_result: "VALID"
    },
    sealed_at: input.sealed_at
  });
  evidenceArtifacts.push(validation);
  const result = createQualificationResult({
    ...resultInput,
    validation_attestation_ref: createExactArtifactReference(validation)
  });
  await input.store.writeArtifact(result, (artifact) => validateQualificationResult(artifact, {
    plan: input.plan,
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  }));
  await verifyDurableQualificationEvidence(
    input.store, input.plan, result, evidenceArtifacts, input.authorizing_namespace,
    input.anchor_public_key
  );
  return deepFreeze({
    result,
    executions,
    comparisons,
    evidence_artifacts: evidenceArtifacts,
    result_classification: resultClassification
  });
}

function qualificationOracleMaterial(transcript) {
  const copy = JSON.parse(JSON.stringify(transcript));
  delete copy.run_ref;
  return copy;
}

function deriveComparisons(plan, executions, evidenceArtifacts) {
  const captureByExecution = new Map();
  for (const artifact of evidenceArtifacts) {
    const semantics = artifact.identity_payload.semantic_envelope;
    if (semantics.capture_role === "ORACLE_CLASSIFICATION") {
      captureByExecution.set(semantics.execution_id, semantics);
    }
  }
  const comparisons = [];
  for (const path of REQUIRED_PATHS) {
    const ids = plan.identity_payload.execution_slots.filter(
      (slot) => slot.path_id === path
    ).map((slot) => slot.execution_id);
    for (let leftIndex = 0; leftIndex < ids.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < ids.length; rightIndex += 1) {
        const left = executions.find((execution) => execution.execution_id === ids[leftIndex]);
        const right = executions.find((execution) => execution.execution_id === ids[rightIndex]);
        if (left.status !== "COMPLETED" || right.status !== "COMPLETED") {
          comparisons.push({
            left_execution_id: left.execution_id,
            right_execution_id: right.execution_id,
            equivalent: null,
            mismatch_class: "COMPARATOR_ERROR",
            details_digest: fingerprintCanonicalJson("zoey:qualification-comparator-error:v1", {
              left_status: left.status,
              right_status: right.status
            })
          });
          continue;
        }
        const leftDigest = captureByExecution.get(left.execution_id).comparator_input_digest;
        const rightDigest = captureByExecution.get(right.execution_id).comparator_input_digest;
        const equivalent = leftDigest === rightDigest;
        comparisons.push({
          left_execution_id: left.execution_id,
          right_execution_id: right.execution_id,
          equivalent,
          mismatch_class: equivalent ? null : "VALUE_MISMATCH",
          details_digest: equivalent ? null : fingerprintCanonicalJson(
            "zoey:qualification-comparison-mismatch:v1", {
              left_comparator_input_digest: leftDigest,
              right_comparator_input_digest: rightDigest
            }
          )
        });
      }
    }
  }
  return comparisons;
}

function deriveResult(executions, comparisons) {
  if (executions.some((execution) => execution.status !== "COMPLETED")) return "INCONCLUSIVE";
  return comparisons.every((comparison) => comparison.equivalent === true)
    ? "QUALIFIED"
    : "NOT_QUALIFIED";
}

async function verifyPlanAuthority(input, planRef, namespaceRef) {
  await input.store.readArtifact(planRef, (artifact) => validateQualificationPlan(artifact, {
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  }));
  await input.store.readArtifact(namespaceRef, validateAuthorityNamespaceIndex);
  await verifyAuthenticatedAnchorReceipt(
    input.store, input.anchor_receipt, input.plan.identity_payload.anchor_requirement,
    input.anchor_public_key
  );
  const semantics = input.anchor_receipt.identity_payload.semantic_envelope;
  if (canonicalizeJson(semantics.authority_subject_ref) !== canonicalizeJson(planRef)
    || canonicalizeJson(semantics.namespace_index_ref) !== canonicalizeJson(namespaceRef)
    || semantics.profile !== input.plan.identity_payload.anchor_requirement.profile
    || semantics.authority_ref !== input.plan.identity_payload.anchor_requirement.authority_ref
    || input.anchor_receipt.identity_payload.producer_identity
      === input.plan.identity_payload.producer_identity
    || !input.authorizing_namespace.identity_payload.qualification_plan_refs.some(
      (reference) => canonicalizeJson(reference) === canonicalizeJson(planRef)
    )) {
    throw new Error("Qualification plan lacks exact effective namespace anchor authority.");
  }
}

function validateInput(input) {
  assertExactKeys(input, [
    "store", "plan", "behavior_manifest", "evaluation_manifest", "authorizing_namespace",
    "anchor_receipt", "anchor_public_key", "fresh_start_attestor", "artifact_namespace",
    "result_artifact_id", "validation_artifact_id", "evidence_producer_identity",
    "evidence_validator_identity", "result_producer_identity", "result_validator_identity",
    "sealed_at"
  ], [], "deterministic qualification execution input");
  validateQualificationPlan(input.plan, {
    behaviorManifest: input.behavior_manifest,
    evaluationManifest: input.evaluation_manifest
  });
  validateAuthorityNamespaceIndex(input.authorizing_namespace);
  validateFormalEvidenceArtifact(input.anchor_receipt);
  if (canonicalizeJson(input.plan.identity_payload.deterministic_equivalence)
      !== canonicalizeJson(SELECTED_SLICE_QUALIFICATION_EQUIVALENCE)) {
    throw new Error("Qualification plan does not bind the implemented comparator identity.");
  }
  if (typeof input.fresh_start_attestor !== "function") {
    throw new Error("Qualification execution requires an external fresh-start attestor.");
  }
  for (const field of [
    "artifact_namespace", "result_artifact_id", "validation_artifact_id",
    "evidence_producer_identity", "evidence_validator_identity", "result_producer_identity",
    "result_validator_identity"
  ]) assertOpaqueId(input[field], `qualification input ${field}`);
}

function placeholderEvidenceReference(artifactId) {
  return {
    artifact_id: artifactId,
    artifact_kind: "FORMAL_EVIDENCE_ARTIFACT",
    schema_id: "zoey.formal-evidence-artifact",
    schema_revision: 1,
    content_fingerprint: `sha256:${"0".repeat(64)}`
  };
}
