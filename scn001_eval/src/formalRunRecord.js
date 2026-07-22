import {
  ARTIFACT_HASH_DOMAIN,
  ARTIFACT_KIND_SCHEMA,
  assertExactKeys,
  assertNonemptyString,
  assertOpaqueId,
  assertPlainObject,
  assertSha256,
  assertSortedUniqueStrings,
  canonicalizeJson,
  createExactArtifactReference,
  deepFreeze,
  fingerprintCanonicalJson,
  resolveExactArtifactReference,
  validateCanonicalArtifact,
  validateExactArtifactReference
} from "./formalArtifactIdentity.js";
import {
  REQUIRED_CLAIM_CLASSES,
  REQUIRED_PATHS,
  validateAttemptAllocation,
  validateCampaignAuthorization
} from "./formalAuthority.js";
import {
  validateAuthorityNamespaceIndex,
  validateFormalEvidenceArtifact,
  replayTypedControlProof,
  resolveDurableExecutionAuthority,
  replayDurableExecutionAuthority,
  verifyDurableEvidence
} from "./formalEvidence.js";

export const CLAIM_OBLIGATION_MAP = deepFreeze({
  "SCN001-SSFO-V0.2.0-CANONICAL-THIN": {
    "CC-TIME-STALE-BASIS": {
      obligation_ids: ["SCN001-SSFO-V0.2.0-OBL-TIME-OLD-001"],
      checkpoint_ids: ["DP-HISTORY-TEMPORAL-ELIGIBILITY"]
    },
    "CC-EVIDENCE-TRIAL-FORMATION": {
      obligation_ids: [
        "SCN001-SSFO-V0.2.0-OBL-ATTR-001",
        "SCN001-SSFO-V0.2.0-OBL-COMPARE-001",
        "SCN001-SSFO-V0.2.0-OBL-EVID-001",
        "SCN001-SSFO-V0.2.0-OBL-EVID-002",
        "SCN001-SSFO-V0.2.0-OBL-EVID-003",
        "SCN001-SSFO-V0.2.0-OBL-EVID-004",
        "SCN001-SSFO-V0.2.0-OBL-TIME-OLD-001"
      ],
      checkpoint_ids: ["CP-PROD-ACTIVE", "CP-PROD-PROPOSAL-REALIZED"]
    },
    "CC-SCOPE-TRIAL-USE": {
      obligation_ids: [
        "SCN001-SSFO-V0.2.0-OBL-CORR-001",
        "SCN001-SSFO-V0.2.0-OBL-DELAY-001",
        "SCN001-SSFO-V0.2.0-OBL-DELAY-002",
        "SCN001-SSFO-V0.2.0-OBL-DRILL-001",
        "SCN001-SSFO-V0.2.0-OBL-SCOPE-001"
      ],
      checkpoint_ids: [
        "CP-DELAY-ACTIVE", "CP-DELAY-CANDIDATE", "CP-DIRECT-CORRECTION-REALIZED",
        "CP-DRILL-REALIZATION-MATCH", "CP-LATER-DISPOSITION"
      ]
    },
    "CC-OUTCOME-SEMANTICS": {
      obligation_ids: ["SCN001-SSFO-V0.2.0-OBL-OUT-001"],
      checkpoint_ids: [
        "CP-CANONICAL-INTERVENTION", "CP-DELAY-ACTIVE", "CP-LATER-DISPOSITION",
        "CP-REALIZATION-FIDELITY"
      ]
    },
    "CC-EXPLANATION-PROVENANCE": {
      obligation_ids: ["SCN001-SSFO-V0.2.0-OBL-EXPL-001"],
      checkpoint_ids: ["CP-EXPLANATION"]
    }
  },
  "SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT": {
    "CC-EVIDENCE-TRIAL-FORMATION": {
      obligation_ids: [
        "SCN001-SSFO-V0.2.0-OBL-ATTR-001",
        "SCN001-SSFO-V0.2.0-OBL-COMPARE-001",
        "SCN001-SSFO-V0.2.0-OBL-EVID-005"
      ],
      checkpoint_ids: ["CF-CALIBRATION-NO-SPLIT"]
    }
  },
  "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN": {
    "CC-SCOPE-TRIAL-USE": {
      obligation_ids: ["SCN001-SSFO-V0.2.0-OBL-SCOPE-002"],
      checkpoint_ids: ["CF-DRILL-OPT-IN", "CP-DELAY-ACTIVE"]
    }
  },
  "SCN001-SSFO-V0.2.0-CF-RECENT-BASIS": {
    "CC-TIME-STALE-BASIS": {
      obligation_ids: ["SCN001-SSFO-V0.2.0-OBL-TIME-RECENT-001"],
      checkpoint_ids: ["DP-HISTORY-TEMPORAL-ELIGIBILITY"]
    }
  }
});

const VALIDITY_RESULTS = Object.freeze(["VALID", "INVALID_UNSCORABLE"]);
const INVARIANT_RESULTS = Object.freeze(["INVARIANTS_CLEAR", "HARD_FAIL"]);
const OBLIGATION_RESULTS = Object.freeze([
  "PASS", "OBLIGATION_FAIL", "NOT_REACHED", "NOT_APPLICABLE"
]);
const REQUIRED_EVIDENCE_KINDS = Object.freeze([
  "SUT_INPUT_CAPTURE", "SUT_OUTPUT_CAPTURE", "SUT_INSPECTION_CAPTURE",
  "SIMULATOR_REQUEST_CAPTURE", "SIMULATOR_REALIZATION_CAPTURE",
  "EVALUATOR_PRIVATE_CAPTURE"
]);
const HARD_RULE_IDS = new Set(Array.from(
  { length: 16 }, (_, index) => `SCN001-SSFO-V0.2.0-INV-${String(index + 1).padStart(3, "0")}`
));
const OBLIGATION_RULE_IDS = new Set(Object.values(CLAIM_OBLIGATION_MAP).flatMap(
  (claims) => Object.values(claims).flatMap((entry) => entry.obligation_ids)
));

export function createFailureFinding(input) {
  assertExactKeys(input, [
    "finding_id", "failure_kind", "rule_id", "observed_refs",
    "expected_classification", "actual_classification", "affected_claim_classes"
  ], [], "formal failure finding input");
  const assertion = structuredClone(input);
  const finding = {
    ...assertion,
    finding_digest: fingerprintCanonicalJson("zoey:formal-failure-finding:v1", assertion)
  };
  validateFailureFinding(finding);
  return deepFreeze(finding);
}

export async function createFormalRunRecord(input) {
  assertExactKeys(input, [
    "store", "artifact_id", "record_id", "authorization", "authority_context",
    "authorizing_namespace", "anchor_receipt", "anchor_public_key", "start_grant", "attempt_allocation",
    "evidence_artifacts", "initial_state_evidence_ref", "isolation_evidence_ref",
    "selection_independence_evidence_ref",
    "qualification_evidence_artifacts",
    "delivered_bundle_ids", "ordered_delivery_refs", "provider_handles",
    "actual_seed_commitment", "run_validity", "invariant_result",
    "obligation_results", "failure_findings", "predecessor_run_ref",
    "producer_identity", "validator_identity", "seal_result", "sealed_at", "sealed_by"
  ], [], "formal run record input");
  const context = await validateRunInputs(input);
  const payload = {
    artifact_kind: "FORMAL_RUN_RECORD",
    schema_id: ARTIFACT_KIND_SCHEMA.FORMAL_RUN_RECORD,
    schema_revision: 1,
    record_id: input.record_id,
    authority_namespace_id: input.authorizing_namespace.identity_payload.namespace_id,
    authorizing_namespace_ref: createExactArtifactReference(input.authorizing_namespace),
    campaign_id: input.authorization.identity_payload.campaign_id,
    campaign_authorization_ref: createExactArtifactReference(input.authorization),
    behavior_manifest_ref: structuredClone(input.authorization.identity_payload.behavior_manifest_ref),
    evaluation_manifest_ref: structuredClone(input.authorization.identity_payload.evaluation_manifest_ref),
    anchor_receipt_ref: createExactArtifactReference(input.anchor_receipt),
    anchor_verification: structuredClone(input.start_grant.anchor_verification),
    fresh_start_capture_ref: structuredClone(input.start_grant.fresh_start_capture_ref),
    fresh_start_proof: structuredClone(input.start_grant.fresh_start_proof),
    attempt_allocation: structuredClone(input.attempt_allocation),
    attempt_id: context.slot.attempt_id,
    slot_id: context.slot.slot_id,
    path_id: context.slot.path_id,
    claim_classes_pressured: Object.keys(CLAIM_OBLIGATION_MAP[context.slot.path_id]).sort(),
    actual_seed_commitment: input.actual_seed_commitment,
    provider_handles: structuredClone(input.provider_handles),
    initial_state_evidence_ref: structuredClone(input.initial_state_evidence_ref),
    isolation_evidence_ref: structuredClone(input.isolation_evidence_ref),
    selection_independence_evidence_ref: structuredClone(
      input.selection_independence_evidence_ref
    ),
    delivered_bundle_ids: structuredClone(input.delivered_bundle_ids),
    ordered_delivery_refs: structuredClone(input.ordered_delivery_refs),
    evidence_refs: context.evidenceRefs,
    raw_capture_refs_by_kind: context.refsByKind,
    raw_capture_digests_by_kind: context.digestsByKind,
    lifecycle_facts: {
      authorized: true,
      started: true,
      evidence_captured: true,
      sealed: true
    },
    run_validity: input.run_validity,
    invariant_result: input.invariant_result,
    obligation_results: structuredClone(input.obligation_results),
    failure_findings: structuredClone(input.failure_findings),
    initial_invalidity_decision_ref: null,
    predecessor_run_ref: input.predecessor_run_ref === null
      ? null : structuredClone(input.predecessor_run_ref),
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    seal_result: input.seal_result,
    sealed_at: input.sealed_at,
    sealed_by: input.sealed_by,
    authority_status: "AUTHORITY_PENDING_CAMPAIGN_INDEX_CLOSURE"
  };
  const record = buildRunArtifact(input.artifact_id, payload);
  validateFormalRunRecord(record, {
    ...input,
    evidenceArtifacts: input.evidence_artifacts
  });
  await input.store.writeArtifact(record, (artifact) => validateFormalRunRecord(artifact, {
    ...input,
    evidenceArtifacts: input.evidence_artifacts
  }));
  return record;
}

export function validateFormalRunRecord(record, context) {
  validateCanonicalArtifact(record, { allowedKinds: ["FORMAL_RUN_RECORD"] });
  validateCampaignAuthorization(context.authorization, context.authority_context);
  validateAuthorityNamespaceIndex(context.authorizing_namespace);
  validateFormalEvidenceArtifact(context.anchor_receipt);
  const payload = record.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "record_id",
    "authority_namespace_id", "authorizing_namespace_ref", "campaign_id",
    "campaign_authorization_ref", "behavior_manifest_ref", "evaluation_manifest_ref",
    "anchor_receipt_ref", "anchor_verification", "fresh_start_capture_ref",
    "fresh_start_proof", "attempt_allocation", "attempt_id", "slot_id", "path_id",
    "claim_classes_pressured", "actual_seed_commitment", "provider_handles",
    "initial_state_evidence_ref", "isolation_evidence_ref", "delivered_bundle_ids",
    "selection_independence_evidence_ref",
    "ordered_delivery_refs", "evidence_refs", "raw_capture_refs_by_kind",
    "raw_capture_digests_by_kind",
    "lifecycle_facts", "run_validity", "invariant_result", "obligation_results",
    "failure_findings", "initial_invalidity_decision_ref", "predecessor_run_ref",
    "producer_identity", "validator_identity", "seal_result", "sealed_at", "sealed_by",
    "authority_status"
  ], [], "formal run record payload");
  assertOpaqueId(payload.record_id, "formal run record_id");
  const authorizationRef = createExactArtifactReference(context.authorization);
  resolveExactArtifactReference(payload.authorizing_namespace_ref, context.authorizing_namespace, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  resolveExactArtifactReference(payload.campaign_authorization_ref, context.authorization, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  resolveExactArtifactReference(payload.anchor_receipt_ref, context.anchor_receipt, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  if (payload.authority_namespace_id !== context.authorization.identity_payload.authority_namespace_id
    || payload.campaign_id !== context.authorization.identity_payload.campaign_id
    || canonicalizeJson(payload.behavior_manifest_ref)
      !== canonicalizeJson(context.authorization.identity_payload.behavior_manifest_ref)
    || canonicalizeJson(payload.evaluation_manifest_ref)
      !== canonicalizeJson(context.authorization.identity_payload.evaluation_manifest_ref)
    || canonicalizeJson(payload.anchor_verification) !== canonicalizeJson(context.start_grant.anchor_verification)
    || canonicalizeJson(payload.fresh_start_capture_ref)
      !== canonicalizeJson(context.start_grant.fresh_start_capture_ref)
    || canonicalizeJson(payload.fresh_start_proof) !== canonicalizeJson(context.start_grant.fresh_start_proof)) {
    throw new Error("Formal run authority/configuration/start closure is inconsistent.");
  }
  validateAttemptAllocation(payload.attempt_allocation, context.authorization);
  const slot = findAllocationSlot(payload.attempt_allocation, context.authorization);
  if (payload.attempt_id !== slot.attempt_id || payload.slot_id !== slot.slot_id
    || payload.path_id !== slot.path_id
    || canonicalizeJson(payload.attempt_allocation) !== canonicalizeJson(context.attempt_allocation)
    || payload.actual_seed_commitment !== slot.seed_commitment) {
    throw new Error("Formal run attempt allocation/seed closure is inconsistent.");
  }
  const expectedPressuredClaims = Object.keys(CLAIM_OBLIGATION_MAP[payload.path_id]).sort();
  if (canonicalizeJson(payload.claim_classes_pressured)
    !== canonicalizeJson(expectedPressuredClaims)) {
    throw new Error("Formal run pressured-claim set conflicts with the obligation map.");
  }
  if (canonicalizeJson(payload.campaign_authorization_ref) !== canonicalizeJson(authorizationRef)) {
    throw new Error("Formal run does not bind the exact campaign authorization.");
  }
  validateProviderHandles(payload.provider_handles);
  assertSortedUniqueStrings(payload.delivered_bundle_ids, "formal run delivered bundle IDs");
  if (payload.delivered_bundle_ids.length === 0) {
    throw new Error("Formal run requires at least one delivered bundle identity.");
  }
  validateRunEvidencePayload(payload, context.evidenceArtifacts);
  validateOutcomes(payload);
  assertExactKeys(payload.lifecycle_facts, [
    "authorized", "started", "evidence_captured", "sealed"
  ], [], "formal run lifecycle facts");
  if (Object.values(payload.lifecycle_facts).some((value) => value !== true)
    || payload.initial_invalidity_decision_ref !== null
    || payload.authority_status !== "AUTHORITY_PENDING_CAMPAIGN_INDEX_CLOSURE") {
    throw new Error("Formal run lifecycle/initial authority state is invalid.");
  }
  if (payload.predecessor_run_ref !== null) {
    validateExactArtifactReference(payload.predecessor_run_ref, {
      allowedKinds: ["FORMAL_RUN_RECORD"]
    });
    if (payload.attempt_allocation.allocation_kind !== "INVALIDITY_DERIVED_REPLACEMENT"
      || canonicalizeJson(payload.predecessor_run_ref)
        !== canonicalizeJson(payload.attempt_allocation.predecessor_run_ref)) {
      throw new Error("Formal replacement run predecessor closure is invalid.");
    }
  } else if (payload.attempt_allocation.allocation_kind === "INVALIDITY_DERIVED_REPLACEMENT") {
    throw new Error("Formal replacement run requires its exact predecessor record.");
  }
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  validateCreated(payload.sealed_at, payload.sealed_by);
  if (payload.seal_result !== "VALIDATED_AND_SEALED" || payload.sealed_by !== payload.validator_identity) {
    throw new Error("Formal run requires independent validator sealing.");
  }
  return record;
}

export async function verifyDurableFormalRunRecord(store, record, context) {
  const evidenceArtifacts = context.evidenceArtifacts ?? context.evidence_artifacts;
  const normalizedContext = { ...context, evidenceArtifacts };
  validateFormalRunRecord(record, normalizedContext);
  await store.readArtifact(
    createExactArtifactReference(record),
    (artifact) => validateFormalRunRecord(artifact, normalizedContext)
  );
  await validateRunInputs({
    store,
    authorization: context.authorization,
    authority_context: context.authority_context,
    authorizing_namespace: context.authorizing_namespace,
    anchor_receipt: context.anchor_receipt,
    anchor_public_key: context.anchor_public_key,
    start_grant: context.start_grant,
    attempt_allocation: record.identity_payload.attempt_allocation,
    evidence_artifacts: evidenceArtifacts,
    qualification_evidence_artifacts: context.qualification_evidence_artifacts,
    replay_authority: true
  });
  return record;
}

async function validateRunInputs(input) {
  validateCampaignAuthorization(input.authorization, input.authority_context);
  validateAuthorityNamespaceIndex(input.authorizing_namespace);
  validateFormalEvidenceArtifact(input.anchor_receipt);
  validateAttemptAllocation(input.attempt_allocation, input.authorization);
  const slot = findAllocationSlot(input.attempt_allocation, input.authorization);
  if (input.start_grant.execution_start_authorized !== true
    || input.start_grant.slot.attempt_id !== slot.attempt_id
    || input.start_grant.slot.path_id !== slot.path_id
    || canonicalizeJson(input.start_grant.authorization_ref)
      !== canonicalizeJson(createExactArtifactReference(input.authorization))) {
    throw new Error("Formal run lacks its exact durable execution-start grant.");
  }
  const artifacts = input.evidence_artifacts;
  if (!Array.isArray(artifacts)) throw new Error("Formal run evidence must be an array.");
  await verifyDurableEvidence(input.store, input.anchor_receipt);
  const controlProofs = new Map();
  for (const artifact of artifacts) {
    await verifyDurableEvidence(input.store, artifact);
    if (artifact.identity_payload.evidence_kind === "EVALUATOR_PRIVATE_CAPTURE") {
      const replay = await replayTypedControlProof(input.store, artifact);
      if (controlProofs.has(replay.proof.proof_role)) {
        throw new Error("Formal run repeats one typed control-proof role.");
      }
      controlProofs.set(replay.proof.proof_role, replay.proof);
    }
  }
  const requiredProofRoles = [
    "FRESH_START_PROOF", "INITIAL_STATE_PROOF", "RUN_ISOLATION_PROOF",
    "SELECTION_INDEPENDENCE"
  ];
  if (requiredProofRoles.some((role) => !controlProofs.has(role))
    || controlProofs.size !== requiredProofRoles.length) {
    throw new Error("Formal run does not close the exact typed control-proof set.");
  }
  const initialProof = controlProofs.get("INITIAL_STATE_PROOF");
  const isolationProof = controlProofs.get("RUN_ISOLATION_PROOF");
  const selectionProof = controlProofs.get("SELECTION_INDEPENDENCE");
  if (initialProof.proposition.run_scope_id !== isolationProof.proposition.run_scope_id
    || selectionProof.proposition.selection_basis_digest !== slot.selection_basis_digest
    || selectionProof.proposition.seed_commitment !== slot.seed_commitment) {
    throw new Error("Formal run typed proofs conflict with run isolation or prospective selection.");
  }
  const refs = artifacts.map(createExactArtifactReference);
  if (new Set(refs.map(canonicalizeJson)).size !== refs.length) {
    throw new Error("Formal run evidence references must be unique.");
  }
  const freshStart = artifacts.find((artifact) => canonicalizeJson(
    createExactArtifactReference(artifact)
  ) === canonicalizeJson(input.start_grant.fresh_start_capture_ref));
  if (!freshStart) throw new Error("Formal run is missing its durable fresh-start capture.");
  const reconstructedPreflight = {
    authorization_ref: structuredClone(input.start_grant.authorization_ref),
    slot: structuredClone(input.start_grant.slot),
    authorizing_namespace_ref: structuredClone(input.start_grant.authorizing_namespace_ref),
    anchor_receipt_ref: structuredClone(input.start_grant.anchor_receipt_ref),
    anchor_verification: structuredClone(input.start_grant.anchor_verification),
    fresh_start_proof: structuredClone(input.start_grant.fresh_start_proof),
    lifecycle: "authorized",
    authority_status: "READY_FOR_DURABLE_AUTHORITY_RESOLUTION",
    execution_start_authorized: false
  };
  const authorityResolver = input.replay_authority === true
    ? replayDurableExecutionAuthority : resolveDurableExecutionAuthority;
  const reconstructedGrant = await authorityResolver({
    store: input.store,
    authorization: input.authorization,
    authority_context: input.authority_context,
    preflight: reconstructedPreflight,
    namespace_index: input.authorizing_namespace,
    anchor_receipt: input.anchor_receipt,
    anchor_public_key: input.anchor_public_key,
    fresh_start_capture: freshStart,
    qualification_evidence_artifacts: input.qualification_evidence_artifacts
  });
  if (canonicalizeJson(reconstructedGrant) !== canonicalizeJson(input.start_grant)) {
    throw new Error("Formal run execution-start grant cannot be independently reconstructed.");
  }
  const ordered = [...artifacts].sort(
    (left, right) => left.identity_payload.created_order - right.identity_payload.created_order
  );
  if (ordered.some((artifact, index) => artifact !== artifacts[index])
    || new Set(ordered.map((artifact) => artifact.identity_payload.created_order)).size
      !== ordered.length) {
    throw new Error("Formal run evidence must have one strict creation order.");
  }
  const refsByKind = {};
  const digestsByKind = {};
  for (const kind of REQUIRED_EVIDENCE_KINDS) {
    const matching = artifacts.filter(
      (artifact) => artifact.identity_payload.evidence_kind === kind
    );
    refsByKind[kind] = matching.map(createExactArtifactReference);
    digestsByKind[kind] = matching.map((artifact) => ({
      evidence_ref: createExactArtifactReference(artifact),
      raw_byte_digest: artifact.identity_payload.raw_byte_digest
    }));
    if (refsByKind[kind].length === 0) {
      throw new Error(`Formal run is missing required ${kind} evidence.`);
    }
  }
  return { slot, evidenceRefs: refs, refsByKind, digestsByKind };
}

function validateRunEvidencePayload(payload, artifacts) {
  if (!Array.isArray(artifacts)) throw new Error("Formal run validation requires evidence artifacts.");
  const refs = artifacts.map(createExactArtifactReference);
  if (canonicalizeJson(payload.evidence_refs) !== canonicalizeJson(refs)) {
    throw new Error("Formal run evidence list does not resolve exactly.");
  }
  const byKind = {};
  for (const kind of REQUIRED_EVIDENCE_KINDS) {
    byKind[kind] = artifacts.filter(
      (artifact) => artifact.identity_payload.evidence_kind === kind
    ).map(createExactArtifactReference);
  }
  if (canonicalizeJson(payload.raw_capture_refs_by_kind) !== canonicalizeJson(byKind)) {
    throw new Error("Formal run evidence kind partition is incomplete.");
  }
  const digestsByKind = Object.fromEntries(Object.entries(byKind).map(([kind, references]) => [
    kind,
    references.map((reference) => {
      const artifact = artifacts.find((candidate) => canonicalizeJson(
        createExactArtifactReference(candidate)
      ) === canonicalizeJson(reference));
      return { evidence_ref: reference, raw_byte_digest: artifact.identity_payload.raw_byte_digest };
    })
  ]));
  if (canonicalizeJson(payload.raw_capture_digests_by_kind)
    !== canonicalizeJson(digestsByKind)) {
    throw new Error("Formal run raw-capture digest closure is incomplete.");
  }
  const authorizationRef = payload.campaign_authorization_ref;
  for (const artifact of artifacts) {
    const evidence = artifact.identity_payload;
    if (evidence.attempt_id !== payload.attempt_id || evidence.path_id !== payload.path_id
      || canonicalizeJson(evidence.campaign_authorization_ref)
        !== canonicalizeJson(authorizationRef)) {
      throw new Error("Formal run evidence crosses campaign, attempt, or path boundaries.");
    }
  }
  const deliveryRefs = artifacts.filter(
    (artifact) => artifact.identity_payload.delivered_order !== null
  ).sort((left, right) => (
    left.identity_payload.delivered_order - right.identity_payload.delivered_order
  )).map(createExactArtifactReference);
  const deliveryOrders = artifacts.filter(
    (artifact) => artifact.identity_payload.delivered_order !== null
  ).map((artifact) => artifact.identity_payload.delivered_order);
  if (new Set(deliveryOrders).size !== deliveryOrders.length) {
    throw new Error("Formal run delivery order is ambiguous.");
  }
  if (canonicalizeJson(payload.ordered_delivery_refs) !== canonicalizeJson(deliveryRefs)) {
    throw new Error("Formal run ordered delivery closure is incomplete.");
  }
  const evidenceIdentities = new Set(refs.map(canonicalizeJson));
  for (const reference of [
    payload.initial_state_evidence_ref, payload.isolation_evidence_ref,
    payload.selection_independence_evidence_ref, payload.fresh_start_capture_ref
  ]) {
    validateExactArtifactReference(reference, { allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"] });
    if (!evidenceIdentities.has(canonicalizeJson(reference))) {
      throw new Error("Formal run control evidence is absent from its sealed evidence set.");
    }
  }
  if (canonicalizeJson(payload.initial_state_evidence_ref)
    === canonicalizeJson(payload.isolation_evidence_ref)) {
    throw new Error("Initial-state and run-isolation proofs must be distinct evidence.");
  }
  const initialState = artifacts.find((artifact) => canonicalizeJson(
    createExactArtifactReference(artifact)
  ) === canonicalizeJson(payload.initial_state_evidence_ref));
  const isolation = artifacts.find((artifact) => canonicalizeJson(
    createExactArtifactReference(artifact)
  ) === canonicalizeJson(payload.isolation_evidence_ref));
  const selection = artifacts.find((artifact) => canonicalizeJson(
    createExactArtifactReference(artifact)
  ) === canonicalizeJson(payload.selection_independence_evidence_ref));
  if (initialState?.identity_payload.semantic_envelope.capture_role !== "INITIAL_STATE_PROOF"
    || isolation?.identity_payload.semantic_envelope.capture_role !== "RUN_ISOLATION_PROOF"
    || selection?.identity_payload.semantic_envelope.capture_role !== "SELECTION_INDEPENDENCE") {
    throw new Error("Formal run control evidence has the wrong semantic role.");
  }
  const evidenceRefs = new Set(refs.map(canonicalizeJson));
  for (const finding of payload.failure_findings) {
    if (finding.observed_refs.some((reference) => !evidenceRefs.has(canonicalizeJson(reference)))) {
      throw new Error("Formal run failure finding cites evidence outside the sealed run.");
    }
  }
  const artifactsByReference = new Map(artifacts.map((artifact) => [
    canonicalizeJson(createExactArtifactReference(artifact)), artifact
  ]));
  for (const artifact of artifacts) {
    const semantics = artifact.identity_payload.semantic_envelope;
    if (artifact.identity_payload.evidence_kind === "SIMULATOR_REQUEST_CAPTURE") {
      const output = artifactsByReference.get(canonicalizeJson(semantics.requested_sut_output_ref));
      if (output?.identity_payload.evidence_kind !== "SUT_OUTPUT_CAPTURE") {
        throw new Error("Simulator request does not bind this run's exact SUT output capture.");
      }
    }
    if (artifact.identity_payload.evidence_kind === "SIMULATOR_REALIZATION_CAPTURE") {
      const request = artifactsByReference.get(canonicalizeJson(semantics.request_capture_ref));
      const premise = semantics.evaluator_private_premise_ref === null
        ? null : artifactsByReference.get(canonicalizeJson(semantics.evaluator_private_premise_ref));
      if (request?.identity_payload.evidence_kind !== "SIMULATOR_REQUEST_CAPTURE"
        || (semantics.evaluator_private_premise_ref !== null
          && premise?.identity_payload.visibility !== "EVALUATOR_PRIVATE")) {
        throw new Error("Simulator realization does not bind this run's request/private premise.");
      }
    }
  }
}

function validateOutcomes(payload) {
  if (!VALIDITY_RESULTS.includes(payload.run_validity)) {
    throw new Error("Formal run validity is outside the accepted domain.");
  }
  if (payload.run_validity === "INVALID_UNSCORABLE") {
    if (payload.invariant_result !== null || payload.obligation_results.length !== 0
      || payload.failure_findings.length !== 0) {
      throw new Error("An invalid/unscorable run cannot fabricate scored outcomes.");
    }
    return;
  }
  if (!INVARIANT_RESULTS.includes(payload.invariant_result)) {
    throw new Error("Valid formal run requires the accepted invariant domain.");
  }
  for (const finding of payload.failure_findings) validateFailureFinding(finding);
  const findingIds = payload.failure_findings.map((finding) => finding.finding_id);
  assertSortedUniqueStrings(findingIds, "formal run failure finding IDs");
  const hardFindings = payload.failure_findings.filter(
    (finding) => finding.failure_kind === "HARD_INVARIANT"
  );
  if ((payload.invariant_result === "HARD_FAIL") !== (hardFindings.length > 0)) {
    throw new Error("Formal run hard-invariant result conflicts with failure findings.");
  }
  validateObligationVector(payload.path_id, payload.obligation_results, payload.failure_findings);
}

function validateObligationVector(pathId, results, findings) {
  if (!Array.isArray(results) || results.length !== REQUIRED_CLAIM_CLASSES.length) {
    throw new Error("Formal run requires all five orthogonal claim results.");
  }
  const claims = results.map((entry) => entry.claim_class);
  assertSortedUniqueStrings(claims, "formal run obligation claim classes");
  if (canonicalizeJson(claims) !== canonicalizeJson([...REQUIRED_CLAIM_CLASSES].sort())) {
    throw new Error("Formal run obligation vector does not close the exact claim set.");
  }
  const pressure = CLAIM_OBLIGATION_MAP[pathId];
  for (const entry of results) {
    assertExactKeys(entry, [
      "claim_class", "pressure", "result", "obligation_ids", "checkpoint_ids",
      "finding_ids"
    ], [], "formal run obligation result");
    if (!OBLIGATION_RESULTS.includes(entry.result)) {
      throw new Error("Formal run obligation result is outside the accepted domain.");
    }
    const expected = pressure[entry.claim_class];
    if (!expected) {
      if (entry.pressure !== "NON_PRESSURE" || entry.result !== "NOT_APPLICABLE"
        || entry.obligation_ids.length !== 0 || entry.checkpoint_ids.length !== 0
        || entry.finding_ids.length !== 0) {
        throw new Error("Non-pressure claim/path must be exactly NOT_APPLICABLE.");
      }
      continue;
    }
    if (entry.pressure !== "REQUIRED"
      || canonicalizeJson(entry.obligation_ids) !== canonicalizeJson(expected.obligation_ids)
      || canonicalizeJson(entry.checkpoint_ids) !== canonicalizeJson(expected.checkpoint_ids)
      || entry.result === "NOT_APPLICABLE") {
      throw new Error("Required claim/path obligation mapping is incomplete or weakened.");
    }
    assertSortedUniqueStrings(entry.finding_ids, "obligation finding IDs");
    const expectedFindingIds = findings.filter(
      (finding) => finding.failure_kind === "OBLIGATION"
        && finding.affected_claim_classes.includes(entry.claim_class)
    ).map((finding) => finding.finding_id).sort();
    if (canonicalizeJson(entry.finding_ids) !== canonicalizeJson(expectedFindingIds)) {
      throw new Error("Obligation result omits or imports a failure finding.");
    }
    const relevant = findings.filter((finding) => entry.finding_ids.includes(finding.finding_id));
    if ((entry.result === "PASS") !== (relevant.length === 0)
      || relevant.some((finding) => !finding.affected_claim_classes.includes(entry.claim_class)
        || !expected.obligation_ids.includes(finding.rule_id))) {
      throw new Error("Obligation result does not close its exact failure findings.");
    }
  }
}

function validateFailureFinding(finding) {
  assertExactKeys(finding, [
    "finding_id", "failure_kind", "rule_id", "observed_refs",
    "expected_classification", "actual_classification", "affected_claim_classes",
    "finding_digest"
  ], [], "formal failure finding");
  assertOpaqueId(finding.finding_id, "failure finding_id");
  if (!["HARD_INVARIANT", "OBLIGATION"].includes(finding.failure_kind)
    || (finding.failure_kind === "HARD_INVARIANT" && !HARD_RULE_IDS.has(finding.rule_id))
    || (finding.failure_kind === "OBLIGATION" && !OBLIGATION_RULE_IDS.has(finding.rule_id))) {
    throw new Error("Formal failure finding kind/rule is invalid.");
  }
  if (!Array.isArray(finding.observed_refs) || finding.observed_refs.length === 0) {
    throw new Error("Formal failure finding requires observed evidence.");
  }
  for (const reference of finding.observed_refs) validateExactArtifactReference(reference);
  assertSortedUniqueStrings(
    finding.observed_refs.map(canonicalizeJson), "failure observed references"
  );
  assertNonemptyString(finding.expected_classification, "failure expected classification");
  assertNonemptyString(finding.actual_classification, "failure actual classification");
  if (finding.expected_classification === finding.actual_classification) {
    throw new Error("Formal failure finding must describe an actual classification mismatch.");
  }
  assertSortedUniqueStrings(finding.affected_claim_classes, "failure affected claim classes");
  if (finding.affected_claim_classes.length === 0 || finding.affected_claim_classes.some(
    (claim) => !REQUIRED_CLAIM_CLASSES.includes(claim)
  )) throw new Error("Formal failure finding names an invalid claim class.");
  const { finding_digest: digest, ...assertion } = finding;
  assertSha256(digest, "failure finding_digest");
  if (digest !== fingerprintCanonicalJson("zoey:formal-failure-finding:v1", assertion)) {
    throw new Error("Formal failure finding digest mismatch.");
  }
}

function findAllocationSlot(allocation, authorization) {
  if (allocation.allocation_kind === "PROSPECTIVE_SLOT") {
    const slot = [
      ...authorization.identity_payload.attempt_slots,
      ...authorization.identity_payload.contingency_slots
    ].find((candidate) => candidate.slot_id === allocation.slot_id);
    if (!slot) throw new Error("Formal run allocation slot is not authorized.");
    return slot;
  }
  return {
    slot_id: allocation.slot_id,
    attempt_id: allocation.attempt_id,
    path_id: allocation.path_id,
    seed_commitment: allocation.seed_commitment
  };
}

function validateProviderHandles(value) {
  assertExactKeys(value, ["applicability", "reason_code", "handles"], [], "provider handles");
  if (!["applicable", "not_applicable"].includes(value.applicability)) {
    throw new Error("Provider-handle applicability is invalid.");
  }
  assertOpaqueId(value.reason_code, "provider-handle reason_code");
  assertPlainObject(value.handles, "provider handles");
  canonicalizeJson(value.handles);
  if (value.applicability === "not_applicable" && Object.keys(value.handles).length !== 0) {
    throw new Error("Non-applicable provider handles must be empty.");
  }
  if (value.applicability === "applicable" && Object.keys(value.handles).length === 0) {
    throw new Error("Applicable provider handles must identify the exact provider execution.");
  }
}

function buildRunArtifact(artifactId, payload) {
  assertOpaqueId(artifactId, "formal run artifact_id");
  return deepFreeze({
    artifact_id: artifactId,
    artifact_kind: "FORMAL_RUN_RECORD",
    schema_id: ARTIFACT_KIND_SCHEMA.FORMAL_RUN_RECORD,
    schema_revision: 1,
    identity_payload: structuredClone(payload),
    canonicalization_scheme: "RFC8785-JCS",
    canonicalization_revision: 1,
    hash_algorithm: "sha-256",
    hash_domain: ARTIFACT_HASH_DOMAIN.FORMAL_RUN_RECORD,
    content_fingerprint: fingerprintCanonicalJson(
      ARTIFACT_HASH_DOMAIN.FORMAL_RUN_RECORD, payload
    )
  });
}

function validateDistinctActors(left, right) {
  assertOpaqueId(left, "formal run producer identity");
  assertOpaqueId(right, "formal run validator identity");
  if (left === right) throw new Error("Formal run producer and validator must be distinct.");
}

function validateCreated(createdAt, createdBy) {
  if (typeof createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(createdAt)
    || new Date(createdAt).toISOString().replace(".000Z", "Z") !== createdAt) {
    throw new Error("Formal run seal time must be an RFC3339 UTC second.");
  }
  assertOpaqueId(createdBy, "formal run sealing actor");
}
