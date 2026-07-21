import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import {
  ARTIFACT_HASH_DOMAIN,
  ARTIFACT_KIND_SCHEMA,
  EVIDENCE_KINDS,
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
  createConfigurationManifestReference,
  resolveConfigurationManifestReference,
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest,
  validateConfigurationManifestReference
} from "./configurationIdentity.js";
import {
  REQUIRED_PATHS,
  validateAttemptAllocation,
  validateCampaignAuthorization,
  validateProspectiveExecutionStartPrerequisites,
  validateQualificationPlan,
  validateQualificationResult
} from "./formalAuthority.js";

const EVIDENCE_VISIBILITY = Object.freeze([
  "SUT_VISIBLE",
  "EVALUATOR_PRIVATE",
  "AUTHORITY_EXTERNAL"
]);
const ATTEMPT_DISPOSITIONS = Object.freeze([
  "UNSTARTED_NOT_ACTIVATED",
  "STARTED_EVIDENCE_PENDING",
  "SEALED_RECORD",
  "INVALID_RETAINED",
  "ABANDONED_RETAINED",
  "AUTHORITY_INVALIDATED_RETAINED",
  "SUPERSEDED_RETAINED",
  "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE",
  "NOT_STARTED_CAMPAIGN_SUPERSEDED",
  "ALLOCATION_AUTHORITY_INVALIDATED_BEFORE_START"
]);

export function createContentAddressedArtifactStore(rootDirectory) {
  const root = resolve(rootDirectory);
  return Object.freeze({
    root,

    async writeRawBytes(bytes) {
      const buffer = toBuffer(bytes);
      const byteDigest = sha256Bytes(buffer);
      const relativePath = join("raw", `${byteDigest.slice("sha256:".length)}.bin`);
      await writeImmutable(join(root, relativePath), buffer);
      return deepFreeze({
        custody_kind: "CONTENT_ADDRESSED_FILE",
        relative_path: relativePath,
        byte_length: buffer.byteLength,
        byte_digest: byteDigest
      });
    },

    async readRawBytes(custody) {
      validateRawCustody(custody);
      const expected = join("raw", `${custody.byte_digest.slice("sha256:".length)}.bin`);
      if (custody.relative_path !== expected) throw new Error("Raw custody path is not content-addressed.");
      const bytes = await readFile(safeStorePath(root, custody.relative_path));
      if (bytes.byteLength !== custody.byte_length || sha256Bytes(bytes) !== custody.byte_digest) {
        throw new Error("Durable raw evidence bytes fail length/digest closure.");
      }
      return bytes;
    },

    async writeArtifact(artifact, typedValidator) {
      await typedValidator(artifact);
      const reference = createExactArtifactReference(artifact);
      const relativePath = artifactRelativePath(reference);
      const bytes = Buffer.from(`${canonicalizeJson(artifact)}\n`, "utf8");
      await writeImmutable(join(root, relativePath), bytes);
      return reference;
    },

    async writeConfigurationManifest(manifest, typedValidator) {
      await typedValidator(manifest);
      const reference = createConfigurationManifestReference(manifest);
      const bytes = Buffer.from(`${canonicalizeJson(manifest)}\n`, "utf8");
      await writeImmutable(join(root, artifactRelativePath(reference)), bytes);
      return reference;
    },

    async readArtifact(reference, typedValidator) {
      validateExactArtifactReference(reference);
      const bytes = await readFile(safeStorePath(root, artifactRelativePath(reference)));
      const artifact = JSON.parse(bytes.toString("utf8"));
      if (!bytes.equals(Buffer.from(`${canonicalizeJson(artifact)}\n`, "utf8"))) {
        throw new Error("Stored artifact bytes are not the exact canonical representation.");
      }
      await typedValidator(artifact);
      resolveExactArtifactReference(reference, artifact);
      return deepFreeze(artifact);
    },

    async readConfigurationManifest(reference, typedValidator) {
      validateConfigurationManifestReference(reference);
      const bytes = await readFile(safeStorePath(root, artifactRelativePath(reference)));
      const manifest = JSON.parse(bytes.toString("utf8"));
      if (!bytes.equals(Buffer.from(`${canonicalizeJson(manifest)}\n`, "utf8"))) {
        throw new Error("Stored configuration manifest is not the exact canonical representation.");
      }
      await typedValidator(manifest);
      resolveConfigurationManifestReference(reference, manifest);
      return deepFreeze(manifest);
    },

    async listArtifactReferences(artifactKind) {
      const schema = ARTIFACT_KIND_SCHEMA[artifactKind];
      if (!schema) throw new Error("Cannot list an unknown artifact kind.");
      const directory = join(root, "artifacts", artifactKind);
      let entries;
      try {
        entries = await readdir(directory, { withFileTypes: true });
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
      const references = [];
      for (const entry of entries) {
        if (!entry.isFile() || !/^[0-9a-f]{64}-[0-9a-f]{64}\.json$/.test(entry.name)) continue;
        const bytes = await readFile(join(directory, entry.name));
        const artifact = JSON.parse(bytes.toString("utf8"));
        if (!bytes.equals(Buffer.from(`${canonicalizeJson(artifact)}\n`, "utf8"))) {
          throw new Error("Indexed artifact bytes are not the exact canonical representation.");
        }
        validateCanonicalArtifact(artifact, { allowedKinds: [artifactKind] });
        references.push(createExactArtifactReference(artifact));
      }
      references.sort((left, right) => left.content_fingerprint.localeCompare(right.content_fingerprint));
      return references;
    }
  });
}

export async function captureFormalEvidence(store, input) {
  assertExactKeys(input, [
    "artifact_id",
    "evidence_kind",
    "authority_subject_ref",
    "campaign_authorization_ref",
    "attempt_id",
    "path_id",
    "visibility",
    "media_type",
    "encoding",
    "raw_bytes",
    "semantic_envelope",
    "created_order",
    "delivered_order",
    "producer_identity",
    "validator_identity",
    "sealed_at"
  ], [], "formal evidence capture input");
  const rawBytes = toBuffer(input.raw_bytes);
  const rawDigest = sha256Bytes(rawBytes);
  const rawCustody = {
    custody_kind: "CONTENT_ADDRESSED_FILE",
    relative_path: join("raw", `${rawDigest.slice("sha256:".length)}.bin`),
    byte_length: rawBytes.byteLength,
    byte_digest: rawDigest
  };
  const payload = {
    artifact_kind: "FORMAL_EVIDENCE_ARTIFACT",
    schema_id: ARTIFACT_KIND_SCHEMA.FORMAL_EVIDENCE_ARTIFACT,
    schema_revision: 1,
    evidence_kind: input.evidence_kind,
    authority_subject_ref: structuredClone(input.authority_subject_ref),
    campaign_authorization_ref: input.campaign_authorization_ref === null
      ? null
      : structuredClone(input.campaign_authorization_ref),
    attempt_id: input.attempt_id,
    path_id: input.path_id,
    visibility: input.visibility,
    media_type: input.media_type,
    encoding: input.encoding,
    raw_byte_length: rawCustody.byte_length,
    raw_byte_digest: rawCustody.byte_digest,
    raw_custody: structuredClone(rawCustody),
    semantic_envelope: structuredClone(input.semantic_envelope),
    created_order: input.created_order,
    delivered_order: input.delivered_order,
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    validation_result: "SEALED",
    sealed_at: input.sealed_at
  };
  const artifact = buildTypedArtifact(
    input.artifact_id, "FORMAL_EVIDENCE_ARTIFACT", payload
  );
  validateFormalEvidenceArtifact(artifact);
  const storedCustody = await store.writeRawBytes(rawBytes);
  if (canonicalizeJson(storedCustody) !== canonicalizeJson(rawCustody)) {
    throw new Error("Evidence store returned custody that conflicts with exact raw bytes.");
  }
  await store.writeArtifact(artifact, validateFormalEvidenceArtifact);
  return artifact;
}

export function validateFormalEvidenceArtifact(artifact) {
  validateCanonicalArtifact(artifact, { allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"] });
  const payload = artifact.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "evidence_kind",
    "authority_subject_ref", "campaign_authorization_ref", "attempt_id", "path_id",
    "visibility", "media_type", "encoding", "raw_byte_length", "raw_byte_digest",
    "raw_custody", "semantic_envelope", "created_order", "delivered_order",
    "producer_identity", "validator_identity", "validation_result", "sealed_at"
  ], [], "formal evidence payload");
  if (!EVIDENCE_KINDS.includes(payload.evidence_kind)
    || !EVIDENCE_VISIBILITY.includes(payload.visibility)) {
    throw new Error("Formal evidence kind or visibility is invalid.");
  }
  validateExactArtifactReference(payload.authority_subject_ref);
  if (payload.campaign_authorization_ref !== null) {
    validateExactArtifactReference(payload.campaign_authorization_ref, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
  }
  if ((payload.attempt_id === null) !== (payload.path_id === null)) {
    throw new Error("Attempt/path evidence identity must be populated together.");
  }
  if (payload.attempt_id !== null) {
    assertOpaqueId(payload.attempt_id, "formal evidence attempt_id");
    if (!REQUIRED_PATHS.includes(payload.path_id)) throw new Error("Formal evidence path is unknown.");
    if (payload.campaign_authorization_ref === null) {
      throw new Error("Attempt-bound evidence requires its exact campaign authorization.");
    }
  }
  for (const field of ["media_type", "encoding"]) {
    assertNonemptyString(payload[field], `formal evidence ${field}`);
  }
  if (!Number.isSafeInteger(payload.raw_byte_length) || payload.raw_byte_length < 0) {
    throw new Error("Formal evidence raw byte length is invalid.");
  }
  assertSha256(payload.raw_byte_digest, "formal evidence raw_byte_digest");
  validateRawCustody(payload.raw_custody);
  if (payload.raw_custody.byte_length !== payload.raw_byte_length
    || payload.raw_custody.byte_digest !== payload.raw_byte_digest) {
    throw new Error("Formal evidence raw custody conflicts with its byte identity.");
  }
  assertPlainObject(payload.semantic_envelope, "formal evidence semantic_envelope");
  canonicalizeJson(payload.semantic_envelope);
  if (payload.visibility === "SUT_VISIBLE") assertNoEvaluatorPrivateKeys(payload.semantic_envelope);
  validateEvidenceSemantics(payload);
  for (const [field, value] of [
    ["created_order", payload.created_order], ["delivered_order", payload.delivered_order]
  ]) {
    if (value !== null && (!Number.isSafeInteger(value) || value < 1)) {
      throw new Error(`Formal evidence ${field} is invalid.`);
    }
  }
  if (payload.attempt_id !== null && payload.created_order === null) {
    throw new Error("Attempt-bound evidence requires a creation order.");
  }
  if (payload.delivered_order !== null && payload.created_order !== null
    && payload.delivered_order < payload.created_order) {
    throw new Error("Formal evidence delivery cannot precede creation.");
  }
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  if (payload.validation_result !== "SEALED") throw new Error("Formal evidence is not sealed.");
  validateCreated(payload.sealed_at, payload.validator_identity);
  return artifact;
}

export async function verifyDurableEvidence(store, artifact) {
  validateFormalEvidenceArtifact(artifact);
  const reference = createExactArtifactReference(artifact);
  const stored = await store.readArtifact(reference, validateFormalEvidenceArtifact);
  const raw = await store.readRawBytes(stored.identity_payload.raw_custody);
  if (sha256Bytes(raw) !== stored.identity_payload.raw_byte_digest) {
    throw new Error("Stored evidence raw bytes changed after sealing.");
  }
  return stored;
}

export function createAuthorityNamespaceIndex(input) {
  assertExactKeys(input, [
    "artifact_id", "namespace_id", "revision", "authority_identity",
    "prior_index", "qualification_plan_refs", "qualification_result_refs",
    "campaign_authorization_refs", "campaign_index_refs", "bounded_result_refs",
    "decision_refs", "anchor_receipt_refs", "manifest_bindings",
    "anchor_declarations", "cutoff_label", "producer_identity",
    "validator_identity", "validation_result", "created_at", "created_by"
  ], [], "authority namespace index input");
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new Error("Authority namespace revision is invalid.");
  }
  if (input.revision === 1) {
    if (input.prior_index !== null) throw new Error("First namespace revision has no predecessor.");
  } else {
    validateAuthorityNamespaceIndex(input.prior_index);
    if (input.revision !== input.prior_index.identity_payload.revision + 1
      || input.namespace_id !== input.prior_index.identity_payload.namespace_id) {
      throw new Error("Namespace revision/predecessor continuity is invalid.");
    }
  }
  const lists = namespaceReferenceLists(input);
  for (const [name, { references, kinds }] of Object.entries(lists)) {
    validateReferenceList(references, kinds, `namespace ${name}`);
  }
  validateManifestBindings(input.manifest_bindings);
  validateAnchorDeclarations(input.anchor_declarations);
  validateNamespaceCrossClosure(input);
  if (input.prior_index !== null) assertNamespaceCumulative(input, input.prior_index.identity_payload);
  assertOpaqueId(input.namespace_id, "authority namespace_id");
  assertOpaqueId(input.authority_identity, "authority namespace authority_identity");
  validateDistinctActors(input.producer_identity, input.validator_identity);
  if (input.validation_result !== "VALIDATED") {
    throw new Error("Authority namespace revision requires independent validation.");
  }
  assertNonemptyString(input.cutoff_label, "authority namespace cutoff_label");
  validateCreated(input.created_at, input.created_by);
  if (input.created_by !== input.authority_identity) {
    throw new Error("Effective namespace revision must be created by its declared owner authority.");
  }
  const entryCount = Object.values(lists).reduce(
    (total, entry) => total + entry.references.length, 0
  ) + input.manifest_bindings.length + input.anchor_declarations.length;
  const payload = {
    artifact_kind: "AUTHORITY_NAMESPACE_INDEX",
    schema_id: ARTIFACT_KIND_SCHEMA.AUTHORITY_NAMESPACE_INDEX,
    schema_revision: 1,
    namespace_id: input.namespace_id,
    revision: input.revision,
    authority_identity: input.authority_identity,
    prior_index_ref: input.prior_index === null
      ? null
      : createExactArtifactReference(input.prior_index),
    qualification_plan_refs: structuredClone(input.qualification_plan_refs),
    qualification_result_refs: structuredClone(input.qualification_result_refs),
    campaign_authorization_refs: structuredClone(input.campaign_authorization_refs),
    campaign_index_refs: structuredClone(input.campaign_index_refs),
    bounded_result_refs: structuredClone(input.bounded_result_refs),
    decision_refs: structuredClone(input.decision_refs),
    anchor_receipt_refs: structuredClone(input.anchor_receipt_refs),
    manifest_bindings: structuredClone(input.manifest_bindings),
    anchor_declarations: structuredClone(input.anchor_declarations),
    included_entry_count: entryCount,
    cutoff_label: input.cutoff_label,
    namespace_status: "DESIGNATED_EFFECTIVE",
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    validation_result: input.validation_result,
    created_at: input.created_at,
    created_by: input.created_by
  };
  const index = buildTypedArtifact(input.artifact_id, "AUTHORITY_NAMESPACE_INDEX", payload);
  validateAuthorityNamespaceIndex(index);
  return index;
}

export function validateAuthorityNamespaceIndex(index) {
  validateCanonicalArtifact(index, { allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"] });
  const payload = index.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "namespace_id", "revision",
    "authority_identity", "prior_index_ref", "qualification_plan_refs",
    "qualification_result_refs", "campaign_authorization_refs", "campaign_index_refs",
    "bounded_result_refs", "decision_refs", "anchor_receipt_refs", "manifest_bindings",
    "anchor_declarations", "included_entry_count", "cutoff_label", "namespace_status",
    "producer_identity", "validator_identity", "validation_result", "created_at", "created_by"
  ], [], "authority namespace index payload");
  assertOpaqueId(payload.namespace_id, "authority namespace_id");
  if (!Number.isSafeInteger(payload.revision) || payload.revision < 1) {
    throw new Error("Authority namespace revision is invalid.");
  }
  assertOpaqueId(payload.authority_identity, "authority namespace authority_identity");
  if (payload.prior_index_ref !== null) {
    validateExactArtifactReference(payload.prior_index_ref, {
      allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
    });
    if (payload.prior_index_ref.artifact_id === index.artifact_id) {
      throw new Error("Authority namespace revision cannot cite itself as predecessor.");
    }
  } else if (payload.revision !== 1) {
    throw new Error("Non-initial namespace revision requires one predecessor.");
  }
  const lists = namespaceReferenceLists(payload);
  for (const [name, { references, kinds }] of Object.entries(lists)) {
    validateReferenceList(references, kinds, `namespace ${name}`);
  }
  validateManifestBindings(payload.manifest_bindings);
  validateAnchorDeclarations(payload.anchor_declarations);
  validateNamespaceCrossClosure(payload);
  const entryCount = Object.values(lists).reduce(
    (total, entry) => total + entry.references.length, 0
  ) + payload.manifest_bindings.length + payload.anchor_declarations.length;
  if (payload.included_entry_count !== entryCount
    || payload.namespace_status !== "DESIGNATED_EFFECTIVE"
    || payload.validation_result !== "VALIDATED"
    || payload.created_by !== payload.authority_identity) {
    throw new Error("Authority namespace count/status/owner closure is invalid.");
  }
  assertNonemptyString(payload.cutoff_label, "authority namespace cutoff_label");
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  validateCreated(payload.created_at, payload.created_by);
  return index;
}

export async function verifySingleEffectiveNamespaceHead(store, namespaceId) {
  const references = await store.listArtifactReferences("AUTHORITY_NAMESPACE_INDEX");
  const indexes = [];
  for (const reference of references) {
    const index = await store.readArtifact(reference, validateAuthorityNamespaceIndex);
    if (index.identity_payload.namespace_id === namespaceId) indexes.push(index);
  }
  if (indexes.length === 0) throw new Error("Effective authority namespace has no durable revisions.");
  const byReference = new Map(indexes.map((index) => [
    canonicalizeJson(createExactArtifactReference(index)), index
  ]));
  const predecessorReferences = new Set();
  const revisions = new Set();
  for (const index of indexes) {
    if (revisions.has(index.identity_payload.revision)) {
      throw new Error("Authority namespace has competing revisions or a fork.");
    }
    revisions.add(index.identity_payload.revision);
    const prior = index.identity_payload.prior_index_ref;
    if (prior !== null) {
      const priorIdentity = canonicalizeJson(prior);
      const predecessor = byReference.get(priorIdentity);
      if (!predecessor) throw new Error("Authority namespace predecessor is not durably resolvable.");
      resolveExactArtifactReference(prior, predecessor, {
        allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
      });
      if (index.identity_payload.revision !== predecessor.identity_payload.revision + 1
        || index.identity_payload.namespace_id !== predecessor.identity_payload.namespace_id
        || index.identity_payload.authority_identity
          !== predecessor.identity_payload.authority_identity) {
        throw new Error("Authority namespace predecessor continuity is invalid.");
      }
      assertNamespaceCumulative(index.identity_payload, predecessor.identity_payload);
      predecessorReferences.add(priorIdentity);
    }
  }
  const heads = indexes.filter((index) => !predecessorReferences.has(
    canonicalizeJson(createExactArtifactReference(index))
  ));
  if (heads.length !== 1) throw new Error("Authority namespace does not have one effective head.");
  return heads[0];
}

export function createCampaignEvidenceIndex(input) {
  assertExactKeys(input, [
    "artifact_id", "campaign_authorization", "authorizing_namespace",
    "attempt_inventory", "evidence_refs", "run_record_refs", "decision_refs",
    "anchor_receipt_refs", "qualification_plan_ref", "qualification_result_ref",
    "prior_index", "campaign_lifecycle", "cutoff_label", "producer_identity",
    "validator_identity", "validation_result", "frozen_at", "frozen_by"
  ], [], "campaign evidence index input");
  validateCanonicalArtifact(input.campaign_authorization, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  validateAuthorityNamespaceIndex(input.authorizing_namespace);
  const authorizationRef = createExactArtifactReference(input.campaign_authorization);
  if (!input.authorizing_namespace.identity_payload.campaign_authorization_refs.some(
    (reference) => canonicalizeJson(reference) === canonicalizeJson(authorizationRef)
  ) || input.authorizing_namespace.identity_payload.namespace_id
      !== input.campaign_authorization.identity_payload.authority_namespace_id) {
    throw new Error("Campaign index authorizing namespace does not contain its exact authorization.");
  }
  validateAttemptInventory(input.attempt_inventory, input.campaign_authorization);
  validateReferenceList(input.evidence_refs, ["FORMAL_EVIDENCE_ARTIFACT"], "campaign evidence refs");
  validateReferenceList(input.run_record_refs, ["FORMAL_RUN_RECORD"], "campaign run refs");
  validateReferenceList(input.decision_refs, ["EVALUATION_DECISION"], "campaign decision refs");
  validateReferenceList(input.anchor_receipt_refs, ["FORMAL_EVIDENCE_ARTIFACT"], "campaign anchor refs");
  for (const [reference, kind] of [
    [input.qualification_plan_ref, "DETERMINISTIC_QUALIFICATION_PLAN"],
    [input.qualification_result_ref, "DETERMINISTIC_QUALIFICATION_RESULT"]
  ]) {
    if (reference !== null) validateExactArtifactReference(reference, { allowedKinds: [kind] });
  }
  if (canonicalizeJson(input.qualification_plan_ref)
      !== canonicalizeJson(input.campaign_authorization.identity_payload.qualification_plan_ref)
    || canonicalizeJson(input.qualification_result_ref)
      !== canonicalizeJson(input.campaign_authorization.identity_payload.qualification_result_ref)) {
    throw new Error("Campaign index qualification basis conflicts with authorization.");
  }
  if (input.anchor_receipt_refs.length === 0) {
    throw new Error("Campaign evidence index requires authorization/start anchor receipt evidence.");
  }
  if (input.prior_index !== null) {
    validateCampaignEvidenceIndex(input.prior_index);
    if (input.prior_index.artifact_id === input.artifact_id) {
      throw new Error("Campaign evidence index cannot cite itself as predecessor.");
    }
    assertCampaignIndexCumulative(input, input.prior_index.identity_payload);
  }
  if (!["suspended", "closed", "superseded"].includes(input.campaign_lifecycle)) {
    throw new Error("Campaign index can freeze only a closed reviewable lifecycle.");
  }
  validateDistinctActors(input.producer_identity, input.validator_identity);
  if (input.validation_result !== "VALIDATED" || input.frozen_by !== input.validator_identity) {
    throw new Error("Campaign index requires independent validation and validator sealing.");
  }
  validateCreated(input.frozen_at, input.frozen_by);
  const memberCount = input.attempt_inventory.length + input.evidence_refs.length
    + input.run_record_refs.length + input.decision_refs.length
    + input.anchor_receipt_refs.length
    + (input.qualification_plan_ref === null ? 0 : 1)
    + (input.qualification_result_ref === null ? 0 : 1);
  const payload = {
    artifact_kind: "CAMPAIGN_EVIDENCE_INDEX",
    schema_id: ARTIFACT_KIND_SCHEMA.CAMPAIGN_EVIDENCE_INDEX,
    schema_revision: 1,
    campaign_authorization_ref: authorizationRef,
    authorizing_namespace_ref: createExactArtifactReference(input.authorizing_namespace),
    behavior_manifest_ref: structuredClone(input.campaign_authorization.identity_payload.behavior_manifest_ref),
    evaluation_manifest_ref: structuredClone(input.campaign_authorization.identity_payload.evaluation_manifest_ref),
    attempt_inventory: structuredClone(input.attempt_inventory),
    evidence_refs: structuredClone(input.evidence_refs),
    run_record_refs: structuredClone(input.run_record_refs),
    decision_refs: structuredClone(input.decision_refs),
    anchor_receipt_refs: structuredClone(input.anchor_receipt_refs),
    qualification_plan_ref: input.qualification_plan_ref === null
      ? null : structuredClone(input.qualification_plan_ref),
    qualification_result_ref: input.qualification_result_ref === null
      ? null : structuredClone(input.qualification_result_ref),
    prior_index_ref: input.prior_index === null
      ? null : createExactArtifactReference(input.prior_index),
    campaign_lifecycle: input.campaign_lifecycle,
    member_count: memberCount,
    cutoff_label: input.cutoff_label,
    frozen: true,
    producer_identity: input.producer_identity,
    validator_identity: input.validator_identity,
    validation_result: input.validation_result,
    frozen_at: input.frozen_at,
    frozen_by: input.frozen_by
  };
  const index = buildTypedArtifact(input.artifact_id, "CAMPAIGN_EVIDENCE_INDEX", payload);
  validateCampaignEvidenceIndex(index, { authorization: input.campaign_authorization });
  return index;
}

export function validateCampaignEvidenceIndex(index, { authorization } = {}) {
  validateCanonicalArtifact(index, { allowedKinds: ["CAMPAIGN_EVIDENCE_INDEX"] });
  const payload = index.identity_payload;
  assertExactKeys(payload, [
    "artifact_kind", "schema_id", "schema_revision", "campaign_authorization_ref",
    "authorizing_namespace_ref", "behavior_manifest_ref", "evaluation_manifest_ref",
    "attempt_inventory", "evidence_refs", "run_record_refs", "decision_refs",
    "anchor_receipt_refs", "qualification_plan_ref", "qualification_result_ref",
    "prior_index_ref", "campaign_lifecycle", "member_count", "cutoff_label",
    "frozen", "producer_identity", "validator_identity", "validation_result",
    "frozen_at", "frozen_by"
  ], [], "campaign evidence index payload");
  validateExactArtifactReference(payload.campaign_authorization_ref, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  validateExactArtifactReference(payload.authorizing_namespace_ref, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  validateReferenceList(payload.evidence_refs, ["FORMAL_EVIDENCE_ARTIFACT"], "campaign evidence refs");
  validateReferenceList(payload.run_record_refs, ["FORMAL_RUN_RECORD"], "campaign run refs");
  validateReferenceList(payload.decision_refs, ["EVALUATION_DECISION"], "campaign decision refs");
  validateReferenceList(payload.anchor_receipt_refs, ["FORMAL_EVIDENCE_ARTIFACT"], "campaign anchor refs");
  for (const [reference, kind] of [
    [payload.qualification_plan_ref, "DETERMINISTIC_QUALIFICATION_PLAN"],
    [payload.qualification_result_ref, "DETERMINISTIC_QUALIFICATION_RESULT"],
    [payload.prior_index_ref, "CAMPAIGN_EVIDENCE_INDEX"]
  ]) if (reference !== null) validateExactArtifactReference(reference, { allowedKinds: [kind] });
  if (payload.prior_index_ref?.artifact_id === index.artifact_id) {
    throw new Error("Campaign evidence index cannot cite itself as predecessor.");
  }
  if (!Array.isArray(payload.attempt_inventory)
    || !["suspended", "closed", "superseded"].includes(payload.campaign_lifecycle)
    || payload.frozen !== true || payload.validation_result !== "VALIDATED"
    || payload.frozen_by !== payload.validator_identity) {
    throw new Error("Campaign evidence index lifecycle/freeze state is invalid.");
  }
  if (payload.anchor_receipt_refs.length === 0) {
    throw new Error("Campaign evidence index requires authorization/start anchor receipt evidence.");
  }
  const memberCount = payload.attempt_inventory.length + payload.evidence_refs.length
    + payload.run_record_refs.length + payload.decision_refs.length
    + payload.anchor_receipt_refs.length
    + (payload.qualification_plan_ref === null ? 0 : 1)
    + (payload.qualification_result_ref === null ? 0 : 1);
  if (payload.member_count !== memberCount) throw new Error("Campaign evidence member count is invalid.");
  validateAttemptInventoryShape(payload.attempt_inventory);
  validateAttemptInventoryMembership(payload);
  validateConfigurationManifestReference(payload.behavior_manifest_ref, {
    allowedKind: "BEHAVIOR_CONFIGURATION_MANIFEST"
  });
  validateConfigurationManifestReference(payload.evaluation_manifest_ref, {
    allowedKind: "EVALUATION_CONFIGURATION_MANIFEST"
  });
  if (authorization !== undefined) {
    resolveExactArtifactReference(payload.campaign_authorization_ref, authorization, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
    if (canonicalizeJson(payload.behavior_manifest_ref)
        !== canonicalizeJson(authorization.identity_payload.behavior_manifest_ref)
      || canonicalizeJson(payload.evaluation_manifest_ref)
        !== canonicalizeJson(authorization.identity_payload.evaluation_manifest_ref)) {
      throw new Error("Campaign index manifest identities conflict with authorization.");
    }
    validateAttemptInventory(payload.attempt_inventory, authorization);
  }
  assertNonemptyString(payload.cutoff_label, "campaign cutoff_label");
  validateDistinctActors(payload.producer_identity, payload.validator_identity);
  validateCreated(payload.frozen_at, payload.frozen_by);
  return index;
}

export async function resolveDurableExecutionAuthority(input) {
  return resolveDurableExecutionAuthorityInternal(input, true);
}

export async function replayDurableExecutionAuthority(input) {
  return resolveDurableExecutionAuthorityInternal(input, false);
}

async function resolveDurableExecutionAuthorityInternal(input, requireCurrentHead) {
  assertExactKeys(input, [
    "store", "authorization", "authority_context", "preflight", "namespace_index",
    "anchor_receipt", "fresh_start_capture"
  ], [], "durable execution authority input");
  validateCampaignAuthorization(input.authorization, input.authority_context);
  validateAuthorityNamespaceIndex(input.namespace_index);
  validateFormalEvidenceArtifact(input.anchor_receipt);
  validateFormalEvidenceArtifact(input.fresh_start_capture);
  const expectedPreflight = validateProspectiveExecutionStartPrerequisites({
    authorization: input.authorization,
    slot_id: input.preflight.slot?.slot_id,
    authorizing_namespace_ref: input.preflight.authorizing_namespace_ref,
    anchor_receipt_ref: input.preflight.anchor_receipt_ref,
    anchor_verification: input.preflight.anchor_verification,
    fresh_start_proof: input.preflight.fresh_start_proof
  });
  if (canonicalizeJson(input.preflight) !== canonicalizeJson(expectedPreflight)
    || input.preflight.execution_start_authorized !== false
    || input.preflight.authority_status !== "READY_FOR_DURABLE_AUTHORITY_RESOLUTION") {
    throw new Error("Durable resolution requires an ungranted Phase 7B preflight.");
  }
  const authorizationRef = createExactArtifactReference(input.authorization);
  const namespaceRef = createExactArtifactReference(input.namespace_index);
  const receiptRef = createExactArtifactReference(input.anchor_receipt);
  await input.store.readConfigurationManifest(
    input.authorization.identity_payload.behavior_manifest_ref,
    validateBehaviorConfigurationManifest
  );
  await input.store.readConfigurationManifest(
    input.authorization.identity_payload.evaluation_manifest_ref,
    validateEvaluationConfigurationManifest
  );
  await input.store.readArtifact(authorizationRef, (artifact) => validateCampaignAuthorization(
    artifact, input.authority_context
  ));
  if (input.authorization.identity_payload.qualification_plan_ref !== null) {
    await input.store.readArtifact(
      input.authorization.identity_payload.qualification_plan_ref,
      (artifact) => validateQualificationPlan(artifact, {
        behaviorManifest: input.authority_context.behavior_manifest,
        evaluationManifest: input.authority_context.evaluation_manifest
      })
    );
  }
  if (input.authorization.identity_payload.qualification_result_ref !== null) {
    await input.store.readArtifact(
      input.authorization.identity_payload.qualification_result_ref,
      (artifact) => validateQualificationResult(artifact, {
        plan: input.authority_context.qualification_plan,
        behaviorManifest: input.authority_context.behavior_manifest,
        evaluationManifest: input.authority_context.evaluation_manifest
      })
    );
  }
  if (!input.namespace_index.identity_payload.campaign_authorization_refs.some(
    (reference) => canonicalizeJson(reference) === canonicalizeJson(authorizationRef)
  ) || canonicalizeJson(input.preflight.authorizing_namespace_ref) !== canonicalizeJson(namespaceRef)
    || canonicalizeJson(input.preflight.anchor_receipt_ref) !== canonicalizeJson(receiptRef)) {
    throw new Error("Durable authority artifacts do not close the exact preflight references.");
  }
  const manifestBinding = input.namespace_index.identity_payload.manifest_bindings.find(
    (binding) => canonicalizeJson(binding.campaign_authorization_ref)
      === canonicalizeJson(authorizationRef)
  );
  const anchorDeclaration = input.namespace_index.identity_payload.anchor_declarations.find(
    (declaration) => canonicalizeJson(declaration.subject_ref)
      === canonicalizeJson(authorizationRef)
  );
  const authorization = input.authorization.identity_payload;
  if (!manifestBinding
    || canonicalizeJson(manifestBinding.behavior_manifest_ref)
      !== canonicalizeJson(authorization.behavior_manifest_ref)
    || canonicalizeJson(manifestBinding.evaluation_manifest_ref)
      !== canonicalizeJson(authorization.evaluation_manifest_ref)
    || !anchorDeclaration
    || anchorDeclaration.profile !== authorization.anchor_requirement.profile
    || anchorDeclaration.authority_ref !== authorization.anchor_requirement.authority_ref
    || anchorDeclaration.receipt_required !== true
    || (authorization.qualification_plan_ref !== null
      && !input.namespace_index.identity_payload.qualification_plan_refs.some(
        (reference) => canonicalizeJson(reference)
          === canonicalizeJson(authorization.qualification_plan_ref)
      ))
    || (authorization.qualification_result_ref !== null
      && !input.namespace_index.identity_payload.qualification_result_refs.some(
        (reference) => canonicalizeJson(reference)
          === canonicalizeJson(authorization.qualification_result_ref)
      ))) {
    throw new Error("Authorizing namespace does not close campaign configuration/qualification/anchor authority.");
  }
  const receiptSemantics = input.anchor_receipt.identity_payload.semantic_envelope;
  const startSemantics = input.fresh_start_capture.identity_payload.semantic_envelope;
  if (input.anchor_receipt.identity_payload.evidence_kind !== "ANCHOR_RECEIPT"
    || canonicalizeJson(receiptSemantics.authorization_ref) !== canonicalizeJson(authorizationRef)
    || canonicalizeJson(receiptSemantics.namespace_index_ref) !== canonicalizeJson(namespaceRef)
    || receiptSemantics.profile !== input.preflight.anchor_verification.profile
    || receiptSemantics.external_commit_sha
      !== input.preflight.anchor_verification.external_commit_sha
    || receiptSemantics.authority_ref !== input.preflight.anchor_verification.authority_ref
    || receiptSemantics.external_event_id !== input.preflight.anchor_verification.external_event_id
    || receiptSemantics.observed_predecessor
      !== input.preflight.anchor_verification.observed_predecessor
    || receiptSemantics.raw_receipt_digest
      !== input.preflight.anchor_verification.receipt_bytes_digest
    || input.anchor_receipt.identity_payload.producer_identity
      !== input.preflight.anchor_verification.producer_identity
    || input.anchor_receipt.identity_payload.validator_identity
      !== input.preflight.anchor_verification.validator_identity
    || input.fresh_start_capture.identity_payload.evidence_kind !== "EVALUATOR_PRIVATE_CAPTURE"
    || startSemantics.capture_role !== "FRESH_START_PROOF"
    || startSemantics.profile !== input.preflight.fresh_start_proof.profile
    || startSemantics.slot_id !== input.preflight.slot.slot_id
    || startSemantics.challenge !== input.preflight.fresh_start_proof.challenge
    || startSemantics.issued_by !== input.preflight.fresh_start_proof.issued_by
    || startSemantics.observed_by !== input.preflight.fresh_start_proof.observed_by
    || startSemantics.anchor_event_id !== receiptSemantics.external_event_id
    || startSemantics.start_event_id !== input.preflight.fresh_start_proof.start_event_id
    || startSemantics.capture_binding_digest
      !== input.preflight.fresh_start_proof.capture_binding_digest
    || input.fresh_start_capture.identity_payload.attempt_id
      !== input.preflight.slot.attempt_id
    || input.fresh_start_capture.identity_payload.path_id !== input.preflight.slot.path_id
    || canonicalizeJson(input.fresh_start_capture.identity_payload.authority_subject_ref)
      !== canonicalizeJson(authorizationRef)
    || canonicalizeJson(input.fresh_start_capture.identity_payload.campaign_authorization_ref)
      !== canonicalizeJson(authorizationRef)) {
    throw new Error("Durable receipt/fresh-start evidence does not close the preflight chain.");
  }
  await input.store.readArtifact(receiptRef, validateFormalEvidenceArtifact);
  await input.store.readArtifact(
    createExactArtifactReference(input.fresh_start_capture), validateFormalEvidenceArtifact
  );
  await input.store.readRawBytes(input.anchor_receipt.identity_payload.raw_custody);
  await input.store.readRawBytes(input.fresh_start_capture.identity_payload.raw_custody);
  const head = await verifySingleEffectiveNamespaceHead(
    input.store, input.namespace_index.identity_payload.namespace_id
  );
  if (requireCurrentHead
    && canonicalizeJson(createExactArtifactReference(head)) !== canonicalizeJson(namespaceRef)) {
    throw new Error("Execution cannot start from a non-head authority namespace revision.");
  }
  if (!requireCurrentHead && !await namespaceIsInEffectiveHistory(
    input.store, head, input.namespace_index
  )) throw new Error("Execution authority namespace is absent from effective durable history.");
  return deepFreeze({
    ...structuredClone(input.preflight),
    namespace_index_ref: namespaceRef,
    anchor_receipt_ref: receiptRef,
    fresh_start_capture_ref: createExactArtifactReference(input.fresh_start_capture),
    lifecycle: "started",
    authority_status: "AUTHORITY_PENDING_CAMPAIGN_INDEX_CLOSURE",
    execution_start_authorized: true
  });
}

async function namespaceIsInEffectiveHistory(store, head, target) {
  const targetIdentity = canonicalizeJson(createExactArtifactReference(target));
  let current = head;
  const visited = new Set();
  while (true) {
    const currentIdentity = canonicalizeJson(createExactArtifactReference(current));
    if (currentIdentity === targetIdentity) return true;
    if (visited.has(currentIdentity) || current.identity_payload.prior_index_ref === null) {
      return false;
    }
    visited.add(currentIdentity);
    current = await store.readArtifact(
      current.identity_payload.prior_index_ref, validateAuthorityNamespaceIndex
    );
  }
}

function buildTypedArtifact(artifactId, artifactKind, payload) {
  assertOpaqueId(artifactId, "typed artifact_id");
  const artifact = {
    artifact_id: artifactId,
    artifact_kind: artifactKind,
    schema_id: ARTIFACT_KIND_SCHEMA[artifactKind],
    schema_revision: 1,
    identity_payload: structuredClone(payload),
    canonicalization_scheme: "RFC8785-JCS",
    canonicalization_revision: 1,
    hash_algorithm: "sha-256",
    hash_domain: ARTIFACT_HASH_DOMAIN[artifactKind],
    content_fingerprint: fingerprintCanonicalJson(ARTIFACT_HASH_DOMAIN[artifactKind], payload)
  };
  return deepFreeze(artifact);
}

function validateEvidenceSemantics(payload) {
  const sutCaptureRoles = {
    SUT_INPUT_CAPTURE: "EXACT_DELIVERED_INPUT",
    SUT_OUTPUT_CAPTURE: "EXACT_MATERIAL_OUTPUT",
    SUT_INSPECTION_CAPTURE: "EXACT_INSPECTION_PROJECTION"
  };
  if (Object.hasOwn(sutCaptureRoles, payload.evidence_kind)) {
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "subject_identity", "event_id", "content_digest", "contract_digest"
    ], [], "SUT capture semantics");
    if (payload.semantic_envelope.capture_role !== sutCaptureRoles[payload.evidence_kind]
      || payload.visibility !== "SUT_VISIBLE" || payload.attempt_id === null
      || (payload.evidence_kind === "SUT_INPUT_CAPTURE" && payload.delivered_order === null)) {
      throw new Error("SUT capture role, visibility, or attempt context is invalid.");
    }
    for (const field of ["subject_identity", "event_id"]) {
      assertOpaqueId(payload.semantic_envelope[field], `SUT capture ${field}`);
    }
    for (const field of ["content_digest", "contract_digest"]) {
      assertSha256(payload.semantic_envelope[field], `SUT capture ${field}`);
    }
    if (payload.semantic_envelope.content_digest !== payload.raw_byte_digest) {
      throw new Error("SUT capture content digest does not bind exact raw bytes.");
    }
  } else if (payload.evidence_kind === "SIMULATOR_REQUEST_CAPTURE") {
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "requested_sut_output_ref", "simulator_configuration_fingerprint",
      "event_id", "request_digest"
    ], [], "simulator request semantics");
    if (payload.semantic_envelope.capture_role !== "SIMULATOR_REQUEST"
      || payload.visibility !== "EVALUATOR_PRIVATE" || payload.attempt_id === null) {
      throw new Error("Simulator request role, visibility, or attempt context is invalid.");
    }
    validateExactArtifactReference(payload.semantic_envelope.requested_sut_output_ref, {
      allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
    });
    assertOpaqueId(payload.semantic_envelope.event_id, "simulator request event_id");
    assertSha256(
      payload.semantic_envelope.simulator_configuration_fingerprint,
      "simulator request configuration fingerprint"
    );
    assertSha256(payload.semantic_envelope.request_digest, "simulator request digest");
    if (payload.semantic_envelope.request_digest !== payload.raw_byte_digest) {
      throw new Error("Simulator request digest does not bind exact raw bytes.");
    }
  } else if (payload.evidence_kind === "SIMULATOR_REALIZATION_CAPTURE") {
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "request_capture_ref", "delivered_projection_digest",
      "evaluator_private_premise_ref", "simulator_configuration_fingerprint",
      "fidelity", "mismatch_digest", "origin", "event_id"
    ], [], "simulator realization semantics");
    if (payload.semantic_envelope.capture_role !== "SIMULATOR_REALIZATION"
      || payload.visibility !== "EVALUATOR_PRIVATE" || payload.attempt_id === null
      || payload.delivered_order === null
      || !["EXACT", "MISMATCH"].includes(payload.semantic_envelope.fidelity)) {
      throw new Error("Simulator realization role, visibility, context, or fidelity is invalid.");
    }
    validateExactArtifactReference(payload.semantic_envelope.request_capture_ref, {
      allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
    });
    if (payload.semantic_envelope.evaluator_private_premise_ref !== null) {
      validateExactArtifactReference(payload.semantic_envelope.evaluator_private_premise_ref, {
        allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
      });
    }
    assertSha256(
      payload.semantic_envelope.simulator_configuration_fingerprint,
      "simulator realization configuration fingerprint"
    );
    assertSha256(
      payload.semantic_envelope.delivered_projection_digest,
      "simulator realization delivered projection digest"
    );
    for (const field of ["origin", "event_id"]) {
      assertOpaqueId(payload.semantic_envelope[field], `simulator realization ${field}`);
    }
    if (payload.semantic_envelope.delivered_projection_digest !== payload.raw_byte_digest
      || (payload.semantic_envelope.fidelity === "EXACT"
        && payload.semantic_envelope.mismatch_digest !== null)
      || (payload.semantic_envelope.fidelity === "MISMATCH"
        && (payload.semantic_envelope.mismatch_digest === null
          || !/^sha256:[0-9a-f]{64}$/.test(payload.semantic_envelope.mismatch_digest)))) {
      throw new Error("Simulator realization digest/fidelity closure is invalid.");
    }
  }
  if (payload.evidence_kind === "ANCHOR_RECEIPT") {
    if (payload.visibility !== "AUTHORITY_EXTERNAL" || payload.attempt_id !== null
      || payload.campaign_authorization_ref === null) {
      throw new Error("Anchor receipt visibility/context is invalid.");
    }
    assertExactKeys(payload.semantic_envelope, [
      "profile", "authorization_ref", "namespace_index_ref", "external_commit_sha",
      "authority_ref", "external_event_id", "observed_predecessor", "raw_receipt_digest"
    ], [], "anchor receipt semantics");
    validateExactArtifactReference(payload.semantic_envelope.authorization_ref, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
    validateExactArtifactReference(payload.semantic_envelope.namespace_index_ref, {
      allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
    });
    if (canonicalizeJson(payload.authority_subject_ref)
        !== canonicalizeJson(payload.semantic_envelope.authorization_ref)
      || canonicalizeJson(payload.campaign_authorization_ref)
        !== canonicalizeJson(payload.semantic_envelope.authorization_ref)) {
      throw new Error("Anchor receipt does not bind its exact campaign authorization.");
    }
    if (!/^[0-9a-f]{40}$/.test(payload.semantic_envelope.external_commit_sha)
      || !/^[0-9a-f]{40}$/.test(payload.semantic_envelope.observed_predecessor)
      || payload.semantic_envelope.external_commit_sha
        === payload.semantic_envelope.observed_predecessor) {
      throw new Error("Anchor receipt commit/predecessor closure is invalid.");
    }
    for (const field of ["profile", "authority_ref", "external_event_id"]) {
      assertNonemptyString(payload.semantic_envelope[field], `anchor receipt ${field}`);
    }
    assertSha256(payload.semantic_envelope.raw_receipt_digest, "anchor receipt raw_receipt_digest");
    if (payload.semantic_envelope.raw_receipt_digest !== payload.raw_byte_digest) {
      throw new Error("Anchor receipt semantic digest does not bind exact raw bytes.");
    }
  }
  if (payload.evidence_kind === "EVALUATOR_PRIVATE_CAPTURE"
    && payload.semantic_envelope.capture_role === "FRESH_START_PROOF") {
    if (payload.visibility !== "EVALUATOR_PRIVATE" || payload.attempt_id === null) {
      throw new Error("Fresh-start capture must remain evaluator-private and attempt-bound.");
    }
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "profile", "slot_id", "challenge", "issued_by", "observed_by",
      "anchor_event_id", "start_event_id", "capture_binding_digest"
    ], [], "fresh-start capture semantics");
    assertNonemptyString(payload.semantic_envelope.profile, "fresh-start capture profile");
    for (const field of [
      "slot_id", "challenge", "issued_by", "observed_by", "anchor_event_id", "start_event_id"
    ]) assertOpaqueId(payload.semantic_envelope[field], `fresh-start capture ${field}`);
    assertSha256(
      payload.semantic_envelope.capture_binding_digest,
      "fresh-start capture capture_binding_digest"
    );
    if (payload.semantic_envelope.capture_binding_digest !== payload.raw_byte_digest) {
      throw new Error("Fresh-start proof binding digest does not bind its exact raw bytes.");
    }
    if (payload.semantic_envelope.anchor_event_id === payload.semantic_envelope.start_event_id) {
      throw new Error("Fresh-start capture cannot reuse the anchor event as its start event.");
    }
  } else if (payload.evidence_kind === "EVALUATOR_PRIVATE_CAPTURE") {
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "subject_ref", "content_digest", "event_id"
    ], [], "evaluator-private capture semantics");
    if (!["ORACLE_PREMISE", "ORACLE_CLASSIFICATION", "VALIDATION_ATTESTATION",
      "SELECTION_INDEPENDENCE", "INITIAL_STATE_PROOF",
      "RUN_ISOLATION_PROOF"].includes(payload.semantic_envelope.capture_role)
      || payload.visibility !== "EVALUATOR_PRIVATE") {
      throw new Error("Evaluator-private capture role or visibility is invalid.");
    }
    validateExactArtifactReference(payload.semantic_envelope.subject_ref);
    assertSha256(payload.semantic_envelope.content_digest, "private capture content_digest");
    assertOpaqueId(payload.semantic_envelope.event_id, "private capture event_id");
    if (payload.semantic_envelope.content_digest !== payload.raw_byte_digest) {
      throw new Error("Evaluator-private capture digest does not bind exact raw bytes.");
    }
  } else if (payload.evidence_kind === "RAW_BINARY_ATTACHMENT") {
    assertExactKeys(payload.semantic_envelope, [
      "attachment_role", "parent_ref", "content_digest"
    ], [], "raw attachment semantics");
    assertOpaqueId(payload.semantic_envelope.attachment_role, "raw attachment role");
    validateExactArtifactReference(payload.semantic_envelope.parent_ref);
    assertSha256(payload.semantic_envelope.content_digest, "raw attachment content_digest");
    if (payload.visibility === "SUT_VISIBLE"
      || payload.semantic_envelope.content_digest !== payload.raw_byte_digest) {
      throw new Error("Raw attachment privacy/digest closure is invalid.");
    }
  }
}

function validateRawCustody(value) {
  assertExactKeys(value, [
    "custody_kind", "relative_path", "byte_length", "byte_digest"
  ], [], "raw custody");
  if (value.custody_kind !== "CONTENT_ADDRESSED_FILE"
    || typeof value.relative_path !== "string"
    || value.relative_path.startsWith("/") || value.relative_path.includes("..")) {
    throw new Error("Raw custody must be a normalized content-addressed relative path.");
  }
  if (!Number.isSafeInteger(value.byte_length) || value.byte_length < 0) {
    throw new Error("Raw custody byte length is invalid.");
  }
  assertSha256(value.byte_digest, "raw custody byte_digest");
}

function validateAttemptInventory(inventory, authorization) {
  validateAttemptInventoryShape(inventory);
  const authorized = [
    ...authorization.identity_payload.attempt_slots,
    ...authorization.identity_payload.contingency_slots
  ];
  const ids = [];
  const authorizationRef = createExactArtifactReference(authorization);
  for (const entry of inventory) {
    const slot = authorized.find((candidate) => candidate.slot_id === entry.slot_id);
    const replacement = entry.replacement_allocation;
    if (slot) {
      if (slot.attempt_id !== entry.attempt_id || slot.path_id !== entry.path_id
        || replacement !== null) throw new Error("Attempt inventory conflicts with authorization slot.");
    } else if (replacement === null || replacement.attempt_id !== entry.attempt_id
      || replacement.path_id !== entry.path_id) {
      throw new Error("Unplanned attempt lacks exact replacement allocation.");
    }
    if (replacement !== null) validateAttemptAllocation(replacement, authorization);
    if (entry.unused_slot_disposition !== null
      && canonicalizeJson(entry.unused_slot_disposition.campaign_authorization_ref)
        !== canonicalizeJson(authorizationRef)) {
      throw new Error("Unused-slot disposition cites a different campaign authorization.");
    }
    ids.push(entry.attempt_id, entry.slot_id);
  }
  if (new Set(ids).size !== ids.length) throw new Error("Attempt inventory identities are duplicated.");
  for (const slot of authorized) {
    if (!inventory.some((entry) => entry.slot_id === slot.slot_id)) {
      throw new Error("Campaign index omits an authorized attempt slot.");
    }
  }
}

function validateAttemptInventoryShape(inventory) {
  if (!Array.isArray(inventory)) throw new Error("Attempt inventory must be an array.");
  for (const entry of inventory) {
    assertExactKeys(entry, [
      "slot_id", "attempt_id", "path_id", "disposition", "run_record_ref",
      "evidence_refs", "invalidity_decision_ref", "replacement_allocation",
      "unused_slot_disposition"
    ], [], "attempt inventory entry");
    assertOpaqueId(entry.slot_id, "attempt inventory slot_id");
    assertOpaqueId(entry.attempt_id, "attempt inventory attempt_id");
    if (!REQUIRED_PATHS.includes(entry.path_id)
      || !ATTEMPT_DISPOSITIONS.includes(entry.disposition)) {
      throw new Error("Attempt inventory path or disposition is invalid.");
    }
    if (entry.run_record_ref !== null) {
      validateExactArtifactReference(entry.run_record_ref, { allowedKinds: ["FORMAL_RUN_RECORD"] });
    }
    validateReferenceList(entry.evidence_refs, ["FORMAL_EVIDENCE_ARTIFACT"], "attempt evidence refs");
    if (entry.invalidity_decision_ref !== null) {
      validateExactArtifactReference(entry.invalidity_decision_ref, {
        allowedKinds: ["EVALUATION_DECISION"]
      });
    }
    if (entry.replacement_allocation !== null) {
      assertPlainObject(entry.replacement_allocation, "attempt replacement allocation");
      canonicalizeJson(entry.replacement_allocation);
    }
    validateUnusedSlotDisposition(entry);
    if (entry.disposition === "SEALED_RECORD" && entry.run_record_ref === null) {
      throw new Error("A sealed attempt disposition requires its run record.");
    }
    if (["INVALID_RETAINED", "AUTHORITY_INVALIDATED_RETAINED"].includes(entry.disposition)
      && entry.invalidity_decision_ref === null) {
      throw new Error("An invalid attempt disposition requires its decision.");
    }
  }
}

function validateUnusedSlotDisposition(entry) {
  const unusedKinds = [
    "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE",
    "NOT_STARTED_CAMPAIGN_SUPERSEDED",
    "ALLOCATION_AUTHORITY_INVALIDATED_BEFORE_START"
  ];
  if (!unusedKinds.includes(entry.disposition)) {
    if (entry.unused_slot_disposition !== null) {
      throw new Error("A started/ordinary attempt cannot carry an unused-slot disposition.");
    }
    return;
  }
  const detail = entry.unused_slot_disposition;
  assertExactKeys(detail, [
    "disposition_kind", "campaign_authorization_ref", "decisive_run_ref",
    "basis_decision_ref", "decisive_failure_digest", "actor_identity",
    "recorded_at", "material_output_observed"
  ], [], "unused-slot disposition");
  if (detail.disposition_kind !== entry.disposition || detail.material_output_observed !== false) {
    throw new Error("Unused-slot disposition kind/output closure is invalid.");
  }
  validateExactArtifactReference(detail.campaign_authorization_ref, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  if (detail.decisive_run_ref !== null) {
    validateExactArtifactReference(detail.decisive_run_ref, {
      allowedKinds: ["FORMAL_RUN_RECORD"]
    });
  }
  if (detail.basis_decision_ref !== null) {
    validateExactArtifactReference(detail.basis_decision_ref, {
      allowedKinds: ["EVALUATION_DECISION"]
    });
  }
  if (entry.disposition === "CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE") {
    if (detail.decisive_run_ref === null || detail.decisive_failure_digest === null) {
      throw new Error("Global hard-failure cancellation requires its decisive run and finding.");
    }
    assertSha256(detail.decisive_failure_digest, "unused-slot decisive_failure_digest");
  } else if (detail.decisive_run_ref !== null || detail.decisive_failure_digest !== null
    || detail.basis_decision_ref === null) {
    throw new Error("Non-hard unused-slot disposition requires only its basis decision.");
  }
  validateCreated(detail.recorded_at, detail.actor_identity);
  if (entry.run_record_ref !== null || entry.evidence_refs.length !== 0
    || entry.invalidity_decision_ref !== null) {
    throw new Error("Unused slot cannot hide a started attempt or material evidence.");
  }
}

function validateAttemptInventoryMembership(payload) {
  const evidence = new Set(payload.evidence_refs.map(canonicalizeJson));
  const runs = new Set(payload.run_record_refs.map(canonicalizeJson));
  const decisions = new Set(payload.decision_refs.map(canonicalizeJson));
  const mappedRuns = [];
  const mappedInvalidityDecisions = [];
  for (const entry of payload.attempt_inventory) {
    if (entry.run_record_ref !== null && !runs.has(canonicalizeJson(entry.run_record_ref))) {
      throw new Error("Attempt run record is omitted from the campaign member list.");
    }
    if (entry.run_record_ref !== null) mappedRuns.push(canonicalizeJson(entry.run_record_ref));
    if (entry.invalidity_decision_ref !== null
      && !decisions.has(canonicalizeJson(entry.invalidity_decision_ref))) {
      throw new Error("Attempt invalidity decision is omitted from the campaign member list.");
    }
    if (entry.invalidity_decision_ref !== null) {
      mappedInvalidityDecisions.push(canonicalizeJson(entry.invalidity_decision_ref));
    }
    if (entry.unused_slot_disposition !== null
      && entry.unused_slot_disposition.decisive_run_ref !== null
      && !runs.has(canonicalizeJson(entry.unused_slot_disposition.decisive_run_ref))) {
      throw new Error("Unused-slot decisive run is omitted from the campaign member list.");
    }
    if (entry.unused_slot_disposition !== null
      && entry.unused_slot_disposition.basis_decision_ref !== null
      && !decisions.has(canonicalizeJson(entry.unused_slot_disposition.basis_decision_ref))) {
      throw new Error("Unused-slot basis decision is omitted from the campaign member list.");
    }
    if (entry.evidence_refs.some((reference) => !evidence.has(canonicalizeJson(reference)))) {
      throw new Error("Attempt evidence is omitted from the campaign member list.");
    }
  }
  if (payload.anchor_receipt_refs.some(
    (reference) => !evidence.has(canonicalizeJson(reference))
  )) throw new Error("Anchor receipt is omitted from the campaign evidence member list.");
  if (new Set(mappedRuns).size !== mappedRuns.length
    || mappedRuns.length !== payload.run_record_refs.length) {
    throw new Error("Every campaign run record must map to exactly one attempt.");
  }
  if (new Set(mappedInvalidityDecisions).size !== mappedInvalidityDecisions.length) {
    throw new Error("An invalidity decision cannot classify multiple attempts.");
  }
}

function assertCampaignIndexCumulative(current, prior) {
  const authorizationRef = createExactArtifactReference(current.campaign_authorization);
  if (canonicalizeJson(authorizationRef) !== canonicalizeJson(prior.campaign_authorization_ref)
    || canonicalizeJson(current.qualification_plan_ref)
      !== canonicalizeJson(prior.qualification_plan_ref)
    || canonicalizeJson(current.qualification_result_ref)
      !== canonicalizeJson(prior.qualification_result_ref)) {
    throw new Error("Campaign index predecessor belongs to a different authority basis.");
  }
  const currentAttempts = new Set(current.attempt_inventory.map((entry) => entry.attempt_id));
  if (prior.attempt_inventory.some((entry) => !currentAttempts.has(entry.attempt_id))) {
    throw new Error("Campaign index revision dropped prior attempt history.");
  }
  for (const name of [
    "evidence_refs", "run_record_refs", "decision_refs", "anchor_receipt_refs"
  ]) {
    const currentReferences = new Set(current[name].map(canonicalizeJson));
    if (prior[name].some((reference) => !currentReferences.has(canonicalizeJson(reference)))) {
      throw new Error(`Campaign index revision dropped prior ${name} history.`);
    }
  }
}

function namespaceReferenceLists(value) {
  return {
    qualification_plan_refs: {
      references: value.qualification_plan_refs,
      kinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
    },
    qualification_result_refs: {
      references: value.qualification_result_refs,
      kinds: ["DETERMINISTIC_QUALIFICATION_RESULT"]
    },
    campaign_authorization_refs: {
      references: value.campaign_authorization_refs,
      kinds: ["CAMPAIGN_AUTHORIZATION"]
    },
    campaign_index_refs: {
      references: value.campaign_index_refs,
      kinds: ["CAMPAIGN_EVIDENCE_INDEX"]
    },
    bounded_result_refs: {
      references: value.bounded_result_refs,
      kinds: ["BOUNDED_CAMPAIGN_RESULT"]
    },
    decision_refs: { references: value.decision_refs, kinds: ["EVALUATION_DECISION"] },
    anchor_receipt_refs: {
      references: value.anchor_receipt_refs,
      kinds: ["FORMAL_EVIDENCE_ARTIFACT"]
    }
  };
}

function validateReferenceList(references, allowedKinds, label) {
  if (!Array.isArray(references)) throw new Error(`${label} must be an array.`);
  const identities = [];
  for (const reference of references) {
    validateExactArtifactReference(reference, { allowedKinds });
    identities.push(`${reference.artifact_kind}:${reference.artifact_id}:${reference.content_fingerprint}`);
  }
  assertSortedUniqueStrings(identities, label);
}

function validateManifestBindings(bindings) {
  if (!Array.isArray(bindings)) throw new Error("Namespace manifest bindings must be an array.");
  const campaigns = [];
  for (const binding of bindings) {
    assertExactKeys(binding, [
      "campaign_authorization_ref", "behavior_manifest_ref", "evaluation_manifest_ref"
    ], [], "namespace manifest binding");
    validateExactArtifactReference(binding.campaign_authorization_ref, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
    validateConfigurationManifestReference(binding.behavior_manifest_ref, {
      allowedKind: "BEHAVIOR_CONFIGURATION_MANIFEST"
    });
    validateConfigurationManifestReference(binding.evaluation_manifest_ref, {
      allowedKind: "EVALUATION_CONFIGURATION_MANIFEST"
    });
    campaigns.push(canonicalizeJson(binding.campaign_authorization_ref));
  }
  assertSortedUniqueStrings(campaigns, "namespace manifest binding campaigns");
}

function validateAnchorDeclarations(declarations) {
  if (!Array.isArray(declarations)) throw new Error("Namespace anchor declarations must be an array.");
  const subjects = [];
  for (const declaration of declarations) {
    assertExactKeys(declaration, [
      "subject_ref", "profile", "authority_ref", "receipt_required"
    ], [], "namespace anchor declaration");
    validateExactArtifactReference(declaration.subject_ref, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN", "CAMPAIGN_AUTHORIZATION"]
    });
    assertNonemptyString(declaration.profile, "namespace anchor profile");
    assertNonemptyString(declaration.authority_ref, "namespace anchor authority_ref");
    if (declaration.receipt_required !== true) throw new Error("Namespace anchor receipt is mandatory.");
    subjects.push(declaration.subject_ref.artifact_id);
  }
  assertSortedUniqueStrings(subjects, "namespace anchor declaration subjects");
}

function validateNamespaceCrossClosure(value) {
  const authorizationRefs = new Set(value.campaign_authorization_refs.map(canonicalizeJson));
  const planRefs = new Set(value.qualification_plan_refs.map(canonicalizeJson));
  const bindingSubjects = new Set(
    value.manifest_bindings.map((binding) => canonicalizeJson(binding.campaign_authorization_ref))
  );
  if (authorizationRefs.size !== bindingSubjects.size
    || [...authorizationRefs].some((reference) => !bindingSubjects.has(reference))) {
    throw new Error("Every indexed campaign requires exactly one exact manifest binding.");
  }
  const anchorSubjects = new Set(
    value.anchor_declarations.map((declaration) => canonicalizeJson(declaration.subject_ref))
  );
  const requiredAnchorSubjects = new Set([...authorizationRefs, ...planRefs]);
  if (anchorSubjects.size !== requiredAnchorSubjects.size
    || [...anchorSubjects].some((reference) => !requiredAnchorSubjects.has(reference))) {
    throw new Error("Anchor declarations must close every and only indexed plan/authorization.");
  }
}

function assertNamespaceCumulative(current, prior) {
  for (const name of Object.keys(namespaceReferenceLists(prior))) {
    const currentIdentities = new Set(current[name].map(canonicalizeJson));
    if (prior[name].some((reference) => !currentIdentities.has(canonicalizeJson(reference)))) {
      throw new Error(`Namespace revision dropped prior ${name} history.`);
    }
  }
  const currentBindings = new Set(current.manifest_bindings.map(canonicalizeJson));
  if (prior.manifest_bindings.some((binding) => !currentBindings.has(canonicalizeJson(binding)))) {
    throw new Error("Namespace revision dropped prior manifest binding history.");
  }
  const currentAnchors = new Set(current.anchor_declarations.map(canonicalizeJson));
  if (prior.anchor_declarations.some((entry) => !currentAnchors.has(canonicalizeJson(entry)))) {
    throw new Error("Namespace revision dropped prior anchor history.");
  }
}

function assertNoEvaluatorPrivateKeys(value) {
  const forbidden = /(?:oracle|answer|expected|canonical|premise|evaluation[_-]?private)/i;
  const visit = (entry) => {
    if (Array.isArray(entry)) return entry.forEach(visit);
    if (!entry || typeof entry !== "object") return;
    for (const [key, child] of Object.entries(entry)) {
      if (forbidden.test(key)) throw new Error("SUT-visible evidence contains evaluator-private fields.");
      visit(child);
    }
  };
  visit(value);
}

function artifactRelativePath(reference) {
  return join(
    "artifacts",
    reference.artifact_kind,
    `${createHash("sha256").update(reference.artifact_id, "utf8").digest("hex")}`
      + `-${reference.content_fingerprint.slice("sha256:".length)}.json`
  );
}

function safeStorePath(root, relativePath) {
  const target = resolve(root, relativePath);
  const fromRoot = relative(root, target);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error("Artifact custody path escapes the evidence store.");
  }
  return target;
}

async function writeImmutable(path, bytes) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, bytes, { flag: "wx", mode: 0o444 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const status = await lstat(path);
    if (!status.isFile() || status.isSymbolicLink()) {
      throw new Error("Content-addressed custody path is not an immutable regular file.");
    }
    const existing = await readFile(path);
    if (!existing.equals(bytes)) throw new Error("Content-addressed path collision or mutation detected.");
  }
}

function toBuffer(bytes) {
  if (Buffer.isBuffer(bytes)) return Buffer.from(bytes);
  if (bytes instanceof Uint8Array) return Buffer.from(bytes);
  throw new Error("Raw evidence must be exact bytes, not a reconstructed string/object.");
}

function sha256Bytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function validateDistinctActors(producer, validator) {
  assertOpaqueId(producer, "evidence producer identity");
  assertOpaqueId(validator, "evidence validator identity");
  if (producer === validator) throw new Error("Evidence producer and validator must be distinct.");
}

function validateCreated(createdAt, createdBy) {
  if (typeof createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(createdAt)
    || new Date(createdAt).toISOString().replace(".000Z", "Z") !== createdAt) {
    throw new Error("Evidence artifact time must be an RFC3339 UTC second.");
  }
  assertOpaqueId(createdBy, "evidence artifact actor");
}
