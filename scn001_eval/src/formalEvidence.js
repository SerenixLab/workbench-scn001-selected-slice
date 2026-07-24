import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { constants, realpathSync } from "node:fs";
import { lstat, mkdir, open, readFile, readdir, realpath } from "node:fs/promises";
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
  assertUniqueArtifactReferenceIds,
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
  const root = realpathSync(resolve(rootDirectory));
  return Object.freeze({
    root,

    async writeRawBytes(bytes) {
      const buffer = toBuffer(bytes);
      const byteDigest = sha256Bytes(buffer);
      const relativePath = join("raw", `${byteDigest.slice("sha256:".length)}.bin`);
      await writeImmutable(root, join(root, relativePath), buffer);
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
      await claimArtifactIdentity(root, reference);
      const relativePath = artifactRelativePath(reference);
      const bytes = Buffer.from(`${canonicalizeJson(artifact)}\n`, "utf8");
      await writeImmutable(root, join(root, relativePath), bytes);
      return reference;
    },

    async writeConfigurationManifest(manifest, typedValidator) {
      await typedValidator(manifest);
      const reference = createConfigurationManifestReference(manifest);
      await claimArtifactIdentity(root, reference);
      const bytes = Buffer.from(`${canonicalizeJson(manifest)}\n`, "utf8");
      await writeImmutable(root, join(root, artifactRelativePath(reference)), bytes);
      return reference;
    },

    async readArtifact(reference, typedValidator) {
      validateExactArtifactReference(reference);
      await verifyArtifactIdentityClaim(root, reference);
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
      await verifyArtifactIdentityClaim(root, reference);
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
      const identities = new Map();
      for (const entry of entries) {
        if (!entry.isFile() || !/^[0-9a-f]{64}-[0-9a-f]{64}\.json$/.test(entry.name)) continue;
        const bytes = await readFile(join(directory, entry.name));
        const artifact = JSON.parse(bytes.toString("utf8"));
        if (!bytes.equals(Buffer.from(`${canonicalizeJson(artifact)}\n`, "utf8"))) {
          throw new Error("Indexed artifact bytes are not the exact canonical representation.");
        }
        validateCanonicalArtifact(artifact, { allowedKinds: [artifactKind] });
        const reference = createExactArtifactReference(artifact);
        const prior = identities.get(reference.artifact_id);
        if (prior !== undefined && prior !== reference.content_fingerprint) {
          throw new Error("Artifact store contains one artifact ID with conflicting fingerprints.");
        }
        identities.set(reference.artifact_id, reference.content_fingerprint);
        await verifyArtifactIdentityClaim(root, reference);
        references.push(reference);
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

export function anchorPublicKeyFingerprint(publicKey) {
  const key = publicKey?.type === "public" ? publicKey : createPublicKey(publicKey);
  const der = key.export({ type: "spki", format: "der" });
  return sha256Bytes(der);
}

export function anchorReceiptSigningBytes(receiptHeader) {
  assertExactKeys(receiptHeader, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload"
  ], [], "anchor receipt signed header");
  if (receiptHeader.schema_id !== "zoey.external-anchor-receipt"
    || receiptHeader.schema_revision !== 1 || receiptHeader.algorithm !== "Ed25519") {
    throw new Error("Anchor receipt signed header uses an unsupported schema or algorithm.");
  }
  assertOpaqueId(receiptHeader.key_id, "anchor receipt key_id");
  validateAnchorReceiptSignedPayload(receiptHeader.signed_payload);
  return Buffer.from(
    `zoey:external-anchor-receipt:v1\n${canonicalizeJson(receiptHeader)}`,
    "utf8"
  );
}

export function freshStartAttestationSigningBytes(attestationHeader) {
  assertExactKeys(attestationHeader, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload"
  ], [], "fresh-start attestation signed header");
  if (attestationHeader.schema_id !== "zoey.external-fresh-start-attestation"
    || attestationHeader.schema_revision !== 1
    || attestationHeader.algorithm !== "Ed25519") {
    throw new Error("Fresh-start attestation uses an unsupported schema or algorithm.");
  }
  assertOpaqueId(attestationHeader.key_id, "fresh-start attestation key_id");
  validateFreshStartSignedPayload(attestationHeader.signed_payload);
  return Buffer.from(
    `zoey:external-fresh-start-attestation:v1\n${canonicalizeJson(attestationHeader)}`,
    "utf8"
  );
}

export function qualificationStartAttestationSigningBytes(attestationHeader) {
  assertExactKeys(attestationHeader, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload"
  ], [], "qualification-start attestation signed header");
  if (attestationHeader.schema_id !== "zoey.external-qualification-start-attestation"
    || attestationHeader.schema_revision !== 1
    || attestationHeader.algorithm !== "Ed25519") {
    throw new Error("Qualification-start attestation uses an unsupported schema or algorithm.");
  }
  assertOpaqueId(attestationHeader.key_id, "qualification-start attestation key_id");
  validateQualificationStartSignedPayload(attestationHeader.signed_payload);
  return Buffer.from(
    `zoey:external-qualification-start-attestation:v1\n${canonicalizeJson(attestationHeader)}`,
    "utf8"
  );
}

export async function captureAuthenticatedAnchorReceipt(store, input) {
  assertExactKeys(input, [
    "artifact_id", "raw_receipt_bytes", "anchor_requirement", "public_key",
    "expected_authority_subject_ref", "expected_namespace_index_ref",
    "campaign_authorization_ref", "validator_identity", "sealed_at"
  ], [], "authenticated anchor receipt input");
  const parsed = parseAndAuthenticateAnchorReceipt(
    input.raw_receipt_bytes, input.anchor_requirement, input.public_key
  );
  const payload = parsed.signed_payload;
  if (canonicalizeJson(payload.authority_subject_ref)
      !== canonicalizeJson(input.expected_authority_subject_ref)
    || canonicalizeJson(payload.namespace_index_ref)
      !== canonicalizeJson(input.expected_namespace_index_ref)) {
    throw new Error("Authenticated anchor receipt names a different authority subject or namespace.");
  }
  return captureFormalEvidence(store, {
    artifact_id: input.artifact_id,
    evidence_kind: "ANCHOR_RECEIPT",
    authority_subject_ref: input.expected_authority_subject_ref,
    campaign_authorization_ref: input.campaign_authorization_ref,
    attempt_id: null,
    path_id: null,
    visibility: "AUTHORITY_EXTERNAL",
    media_type: input.anchor_requirement.receipt_media_type,
    encoding: input.anchor_requirement.receipt_encoding,
    raw_bytes: input.raw_receipt_bytes,
    semantic_envelope: anchorSemanticsFrom(payload, input.raw_receipt_bytes),
    created_order: null,
    delivered_order: null,
    producer_identity: payload.producer_identity,
    validator_identity: input.validator_identity,
    sealed_at: input.sealed_at
  });
}

export async function verifyAuthenticatedAnchorReceipt(
  store, artifact, anchorRequirement, publicKey
) {
  const stored = await verifyDurableEvidence(store, artifact);
  if (stored.identity_payload.evidence_kind !== "ANCHOR_RECEIPT") {
    throw new Error("Authenticated anchor replay requires anchor receipt evidence.");
  }
  const raw = await store.readRawBytes(stored.identity_payload.raw_custody);
  const parsed = parseAndAuthenticateAnchorReceipt(raw, anchorRequirement, publicKey);
  const expected = anchorSemanticsFrom(parsed.signed_payload, raw);
  if (canonicalizeJson(expected)
      !== canonicalizeJson(stored.identity_payload.semantic_envelope)
    || parsed.signed_payload.producer_identity !== stored.identity_payload.producer_identity) {
    throw new Error("Anchor receipt semantic envelope was not derived from its authenticated bytes.");
  }
  return stored;
}

export async function verifyAuthenticatedFreshStartProof(
  store, artifact, anchorRequirement, publicKey, expected
) {
  const stored = await verifyDurableEvidence(store, artifact);
  const raw = await store.readRawBytes(stored.identity_payload.raw_custody);
  const document = parseAndAuthenticateFreshStart(raw, anchorRequirement, publicKey);
  assertExactKeys(expected, [
    "authorization_ref", "namespace_index_ref", "anchor_receipt_ref", "slot_id",
    "attempt_id", "path_id", "run_scope_id"
  ], [], "authenticated fresh-start expectation");
  const signed = document.signed_payload;
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (canonicalizeJson(signed[field]) !== canonicalizeJson(expectedValue)) {
      throw new Error(`Authenticated fresh-start attestation conflicts on ${field}.`);
    }
  }
  const semantics = freshStartSemanticsFrom(signed, raw);
  if (canonicalizeJson(semantics) !== canonicalizeJson(stored.identity_payload.semantic_envelope)
    || signed.producer_identity !== stored.identity_payload.producer_identity) {
    throw new Error("Fresh-start proof semantics were not derived from authenticated bytes.");
  }
  return stored;
}

export async function verifyAuthenticatedQualificationStartProof(
  store, artifact, anchorRequirement, publicKey, expected
) {
  const stored = await verifyDurableEvidence(store, artifact);
  const raw = await store.readRawBytes(stored.identity_payload.raw_custody);
  const document = parseAndAuthenticateQualificationStart(raw, anchorRequirement, publicKey);
  assertExactKeys(expected, [
    "plan_ref", "namespace_index_ref", "anchor_receipt_ref", "execution_id", "path_id",
    "selection_basis_digest", "run_scope_id"
  ], [], "authenticated qualification-start expectation");
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (canonicalizeJson(document.signed_payload[field]) !== canonicalizeJson(expectedValue)) {
      throw new Error(`Authenticated qualification-start conflicts on ${field}.`);
    }
  }
  if (canonicalizeJson(qualificationStartSemanticsFrom(document.signed_payload, raw))
      !== canonicalizeJson(stored.identity_payload.semantic_envelope)) {
    throw new Error("Qualification-start semantics were not derived from authenticated bytes.");
  }
  return stored;
}

export function createFormalEvidenceRecorder(input) {
  assertExactKeys(input, [
    "store", "authority_subject_ref", "campaign_authorization_ref", "attempt_id",
    "path_id", "producer_identity", "validator_identity", "event_namespace"
  ], [], "formal evidence recorder input");
  validateExactArtifactReference(input.authority_subject_ref);
  if (input.campaign_authorization_ref !== null) {
    validateExactArtifactReference(input.campaign_authorization_ref, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
  }
  if ((input.attempt_id === null) !== (input.path_id === null)) {
    throw new Error("Recorder attempt/path identity must be populated together.");
  }
  if (input.attempt_id !== null) {
    assertOpaqueId(input.attempt_id, "formal recorder attempt_id");
    if (!REQUIRED_PATHS.includes(input.path_id)) throw new Error("Formal recorder path is unknown.");
  }
  validateDistinctActors(input.producer_identity, input.validator_identity);
  assertOpaqueId(input.event_namespace, "formal recorder event_namespace");
  let eventOrder = 0;
  let poisoned = false;
  let busy = false;
  let runtimeCaptureObserved = false;
  let materialOutputObserved = false;
  let initialInspectionCaptured = false;
  const proofRoles = [];

  return Object.freeze({
    async captureInitialInspection(evidenceInput) {
      if (poisoned) throw new Error("Formal evidence recorder is terminal after a failed capture.");
      if (busy) {
        poisoned = true;
        throw new Error("Formal evidence recorder rejects concurrent chronology mutation.");
      }
      busy = true;
      try {
        assertExactKeys(evidenceInput, [
          "artifact_id", "raw_bytes", "semantic_data", "sealed_at"
        ], [], "initial inspection capture input");
        if (input.attempt_id === null || initialInspectionCaptured
          || canonicalizeJson(proofRoles) !== canonicalizeJson(["FRESH_START_PROOF"])) {
          throw new Error("Initial inspection must be captured exactly once after fresh start.");
        }
        const createdOrder = eventOrder + 1;
        const eventId = `${input.event_namespace}:event:${String(createdOrder).padStart(6, "0")}`;
        const raw = toBuffer(evidenceInput.raw_bytes);
        const artifact = await captureFormalEvidence(input.store, {
          artifact_id: evidenceInput.artifact_id,
          evidence_kind: "SUT_INSPECTION_CAPTURE",
          authority_subject_ref: input.authority_subject_ref,
          campaign_authorization_ref: input.campaign_authorization_ref,
          attempt_id: input.attempt_id,
          path_id: input.path_id,
          visibility: "SUT_VISIBLE",
          media_type: "application/octet-stream",
          encoding: "binary",
          raw_bytes: raw,
          semantic_envelope: runtimeEvidenceSemantics(
            "SUT_INSPECTION_CAPTURE", evidenceInput.semantic_data, raw, eventId
          ),
          created_order: createdOrder,
          delivered_order: null,
          producer_identity: input.producer_identity,
          validator_identity: input.validator_identity,
          sealed_at: evidenceInput.sealed_at
        });
        eventOrder = createdOrder;
        initialInspectionCaptured = true;
        return artifact;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally {
        busy = false;
      }
    },

    async captureAuthenticatedQualificationStart(attestationInput) {
      if (poisoned) throw new Error("Formal evidence recorder is terminal after a failed capture.");
      if (busy) {
        poisoned = true;
        throw new Error("Formal evidence recorder rejects concurrent chronology mutation.");
      }
      busy = true;
      try {
        assertExactKeys(attestationInput, [
          "artifact_id", "raw_attestation_bytes", "anchor_requirement", "public_key",
          "namespace_index_ref", "anchor_receipt_ref", "execution_id", "path_id",
          "selection_basis_digest", "run_scope_id", "sealed_at"
        ], [], "authenticated qualification-start capture input");
        assertRecorderProofTransition(
          input.attempt_id, proofRoles, "QUALIFICATION_FRESH_START_PROOF",
          runtimeCaptureObserved, materialOutputObserved
        );
        if (input.attempt_id !== null || input.campaign_authorization_ref !== null
          || input.authority_subject_ref.artifact_kind !== "DETERMINISTIC_QUALIFICATION_PLAN") {
          throw new Error("Authenticated qualification start requires a plan-scoped recorder.");
        }
        const raw = toBuffer(attestationInput.raw_attestation_bytes);
        const document = parseAndAuthenticateQualificationStart(
          raw, attestationInput.anchor_requirement, attestationInput.public_key
        );
        const signed = document.signed_payload;
        const expectations = {
          plan_ref: input.authority_subject_ref,
          namespace_index_ref: attestationInput.namespace_index_ref,
          anchor_receipt_ref: attestationInput.anchor_receipt_ref,
          execution_id: attestationInput.execution_id,
          path_id: attestationInput.path_id,
          selection_basis_digest: attestationInput.selection_basis_digest,
          run_scope_id: attestationInput.run_scope_id
        };
        for (const [field, expected] of Object.entries(expectations)) {
          if (canonicalizeJson(signed[field]) !== canonicalizeJson(expected)) {
            throw new Error(`Qualification-start signed payload conflicts on ${field}.`);
          }
        }
        const artifact = await captureFormalEvidence(input.store, {
          artifact_id: attestationInput.artifact_id,
          evidence_kind: "EVALUATOR_PRIVATE_CAPTURE",
          authority_subject_ref: input.authority_subject_ref,
          campaign_authorization_ref: null,
          attempt_id: null,
          path_id: null,
          visibility: "EVALUATOR_PRIVATE",
          media_type: "application/json",
          encoding: "utf-8",
          raw_bytes: raw,
          semantic_envelope: qualificationStartSemanticsFrom(signed, raw),
          created_order: null,
          delivered_order: null,
          producer_identity: signed.producer_identity,
          validator_identity: input.validator_identity,
          sealed_at: attestationInput.sealed_at
        });
        proofRoles.push("QUALIFICATION_FRESH_START_PROOF");
        return artifact;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally {
        busy = false;
      }
    },

    async captureAuthenticatedFreshStart(attestationInput) {
      if (poisoned) throw new Error("Formal evidence recorder is terminal after a failed capture.");
      if (busy) {
        poisoned = true;
        throw new Error("Formal evidence recorder rejects concurrent chronology mutation.");
      }
      busy = true;
      try {
        assertExactKeys(attestationInput, [
          "artifact_id", "raw_attestation_bytes", "anchor_requirement", "public_key",
          "namespace_index_ref", "anchor_receipt_ref", "slot_id", "run_scope_id", "sealed_at"
        ], [], "authenticated fresh-start capture input");
        assertRecorderProofTransition(
          input.attempt_id, proofRoles, "FRESH_START_PROOF",
          runtimeCaptureObserved, materialOutputObserved
        );
        if (input.attempt_id === null || input.campaign_authorization_ref === null) {
          throw new Error("Authenticated fresh-start capture requires an attempt recorder.");
        }
        const raw = toBuffer(attestationInput.raw_attestation_bytes);
        const document = parseAndAuthenticateFreshStart(
          raw, attestationInput.anchor_requirement, attestationInput.public_key
        );
        const signed = document.signed_payload;
        const expectations = {
          authorization_ref: input.campaign_authorization_ref,
          namespace_index_ref: attestationInput.namespace_index_ref,
          anchor_receipt_ref: attestationInput.anchor_receipt_ref,
          slot_id: attestationInput.slot_id,
          attempt_id: input.attempt_id,
          path_id: input.path_id,
          run_scope_id: attestationInput.run_scope_id
        };
        for (const [field, expected] of Object.entries(expectations)) {
          if (canonicalizeJson(signed[field]) !== canonicalizeJson(expected)) {
            throw new Error(`Fresh-start signed payload conflicts on ${field}.`);
          }
        }
        const createdOrder = eventOrder + 1;
        const artifact = await captureFormalEvidence(input.store, {
          artifact_id: attestationInput.artifact_id,
          evidence_kind: "EVALUATOR_PRIVATE_CAPTURE",
          authority_subject_ref: input.authority_subject_ref,
          campaign_authorization_ref: input.campaign_authorization_ref,
          attempt_id: input.attempt_id,
          path_id: input.path_id,
          visibility: "EVALUATOR_PRIVATE",
          media_type: "application/json",
          encoding: "utf-8",
          raw_bytes: raw,
          semantic_envelope: freshStartSemanticsFrom(signed, raw),
          created_order: createdOrder,
          delivered_order: null,
          producer_identity: signed.producer_identity,
          validator_identity: input.validator_identity,
          sealed_at: attestationInput.sealed_at
        });
        eventOrder = createdOrder;
        proofRoles.push("FRESH_START_PROOF");
        return artifact;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally {
        busy = false;
      }
    },

    async captureControlProof(proofInput) {
      if (poisoned) throw new Error("Formal evidence recorder is terminal after a failed capture.");
      if (busy) {
        poisoned = true;
        throw new Error("Formal evidence recorder rejects concurrent chronology mutation.");
      }
      busy = true;
      try {
        assertExactKeys(proofInput, [
          "artifact_id", "proof_role", "proposition", "sealed_at"
        ], [], "typed control proof input");
        assertRecorderProofTransition(
          input.attempt_id, proofRoles, proofInput.proof_role,
          runtimeCaptureObserved, materialOutputObserved, initialInspectionCaptured
        );
        const createdOrder = eventOrder + 1;
        const eventId = `${input.event_namespace}:event:${String(createdOrder).padStart(6, "0")}`;
        const proof = buildControlProofDocument(input, proofInput, eventId);
        const raw = Buffer.from(`${canonicalizeJson(proof)}\n`, "utf8");
        const semantics = controlProofSemantics(proof, raw);
        const artifact = await captureFormalEvidence(input.store, {
          artifact_id: proofInput.artifact_id,
          evidence_kind: "EVALUATOR_PRIVATE_CAPTURE",
          authority_subject_ref: input.authority_subject_ref,
          campaign_authorization_ref: input.campaign_authorization_ref,
          attempt_id: input.attempt_id,
          path_id: input.path_id,
          visibility: "EVALUATOR_PRIVATE",
          media_type: "application/json",
          encoding: "utf-8",
          raw_bytes: raw,
          semantic_envelope: semantics,
          created_order: input.attempt_id === null ? null : createdOrder,
          delivered_order: null,
          producer_identity: input.producer_identity,
          validator_identity: input.validator_identity,
          sealed_at: proofInput.sealed_at
        });
        eventOrder = createdOrder;
        proofRoles.push(proofInput.proof_role);
        return artifact;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally {
        busy = false;
      }
    },

    async captureRuntimeEvidence(evidenceInput) {
      if (poisoned) throw new Error("Formal evidence recorder is terminal after a failed capture.");
      if (busy) {
        poisoned = true;
        throw new Error("Formal evidence recorder rejects concurrent chronology mutation.");
      }
      busy = true;
      try {
        assertExactKeys(evidenceInput, [
          "artifact_id", "evidence_kind", "raw_bytes", "semantic_data",
          "deliver_to_sut", "sealed_at"
        ], [], "recorded runtime evidence input");
        if (input.attempt_id === null) {
          throw new Error("Runtime evidence recording requires an attempt-bound recorder.");
        }
        if (canonicalizeJson(proofRoles) !== canonicalizeJson([
          "FRESH_START_PROOF", "INITIAL_STATE_PROOF", "RUN_ISOLATION_PROOF",
          "SELECTION_INDEPENDENCE"
        ])) {
          throw new Error("Runtime capture cannot start before the exact control-proof sequence.");
        }
        const createdOrder = eventOrder + 1;
        const deliveredOrder = evidenceInput.deliver_to_sut === true
          ? createdOrder + 1
          : null;
        if (evidenceInput.deliver_to_sut !== true && evidenceInput.deliver_to_sut !== false) {
          throw new Error("Runtime evidence delivery decision must be an exact boolean.");
        }
        const eventId = `${input.event_namespace}:event:${String(createdOrder).padStart(6, "0")}`;
        const raw = toBuffer(evidenceInput.raw_bytes);
        const semantics = runtimeEvidenceSemantics(
          evidenceInput.evidence_kind, evidenceInput.semantic_data, raw, eventId
        );
        const artifact = await captureFormalEvidence(input.store, {
          artifact_id: evidenceInput.artifact_id,
          evidence_kind: evidenceInput.evidence_kind,
          authority_subject_ref: input.authority_subject_ref,
          campaign_authorization_ref: input.campaign_authorization_ref,
          attempt_id: input.attempt_id,
          path_id: input.path_id,
          visibility: runtimeEvidenceVisibility(evidenceInput.evidence_kind),
          media_type: "application/octet-stream",
          encoding: "binary",
          raw_bytes: raw,
          semantic_envelope: semantics,
          created_order: createdOrder,
          delivered_order: deliveredOrder,
          producer_identity: input.producer_identity,
          validator_identity: input.validator_identity,
          sealed_at: evidenceInput.sealed_at
        });
        eventOrder = deliveredOrder ?? createdOrder;
        runtimeCaptureObserved = true;
        if (evidenceInput.evidence_kind === "SUT_OUTPUT_CAPTURE") {
          materialOutputObserved = true;
        }
        return artifact;
      } catch (error) {
        poisoned = true;
        throw error;
      } finally {
        busy = false;
      }
    }
  });
}

export async function verifyTypedControlProof(store, artifact) {
  return (await replayTypedControlProof(store, artifact)).artifact;
}

export async function replayTypedControlProof(store, artifact) {
  const stored = await verifyDurableEvidence(store, artifact);
  if (stored.identity_payload.evidence_kind !== "EVALUATOR_PRIVATE_CAPTURE") {
    throw new Error("Typed control-proof replay requires evaluator-private evidence.");
  }
  const raw = await store.readRawBytes(stored.identity_payload.raw_custody);
  const parsed = parseCanonicalJsonBytes(raw, "typed control proof");
  const proof = parsed.schema_id === "zoey.external-fresh-start-attestation"
    ? controlProofFromFreshStartAttestation(parsed, stored)
    : parsed.schema_id === "zoey.external-qualification-start-attestation"
      ? controlProofFromQualificationStartAttestation(parsed, stored)
      : parsed;
  validateControlProofDocument(proof);
  const payload = stored.identity_payload;
  if (canonicalizeJson(proof.authority_subject_ref)
      !== canonicalizeJson(payload.authority_subject_ref)
    || canonicalizeJson(proof.campaign_authorization_ref)
      !== canonicalizeJson(payload.campaign_authorization_ref)
    || proof.attempt_id !== payload.attempt_id || proof.path_id !== payload.path_id
    || canonicalizeJson(controlProofSemantics(proof, raw))
      !== canonicalizeJson(payload.semantic_envelope)) {
    throw new Error("Control-proof semantic envelope was not derived from its canonical raw bytes.");
  }
  return deepFreeze({ artifact: stored, proof });
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
    "prior_index", "prior_index_receipt_ref", "qualification_plan_refs", "qualification_result_refs",
    "campaign_authorization_refs", "campaign_index_refs", "bounded_result_refs",
    "decision_refs", "anchor_receipt_refs", "manifest_bindings",
    "anchor_declarations", "cutoff_label", "producer_identity",
    "validator_identity", "validation_result", "created_at", "created_by"
  ], [], "authority namespace index input");
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new Error("Authority namespace revision is invalid.");
  }
  if (input.revision === 1) {
    if (input.prior_index !== null || input.prior_index_receipt_ref !== null) {
      throw new Error("First namespace revision has no predecessor or predecessor receipt.");
    }
  } else {
    validateAuthorityNamespaceIndex(input.prior_index);
    if (input.revision !== input.prior_index.identity_payload.revision + 1
      || input.namespace_id !== input.prior_index.identity_payload.namespace_id) {
      throw new Error("Namespace revision/predecessor continuity is invalid.");
    }
    validateExactArtifactReference(input.prior_index_receipt_ref, {
      allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
    });
    if (!input.anchor_receipt_refs.some((reference) => canonicalizeJson(reference)
      === canonicalizeJson(input.prior_index_receipt_ref))) {
      throw new Error("Namespace successor omits its predecessor's exact external receipt.");
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
    prior_index_receipt_ref: input.prior_index_receipt_ref === null
      ? null : structuredClone(input.prior_index_receipt_ref),
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
    "prior_index_receipt_ref",
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
    validateExactArtifactReference(payload.prior_index_receipt_ref, {
      allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
    });
    if (!payload.anchor_receipt_refs.some((reference) => canonicalizeJson(reference)
      === canonicalizeJson(payload.prior_index_receipt_ref))) {
      throw new Error("Namespace successor omits its predecessor's exact external receipt.");
    }
  } else if (payload.revision !== 1 || payload.prior_index_receipt_ref !== null) {
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
  for (const index of indexes) {
    if (index.identity_payload.prior_index_ref === null) continue;
    const prior = byReference.get(canonicalizeJson(index.identity_payload.prior_index_ref));
    const receipt = await store.readArtifact(
      index.identity_payload.prior_index_receipt_ref, validateFormalEvidenceArtifact
    );
    await verifyDurableEvidence(store, receipt);
    const semantics = receipt.identity_payload.semantic_envelope;
    const subjectIdentity = canonicalizeJson(semantics.authority_subject_ref);
    const indexedSubjects = [
      ...prior.identity_payload.qualification_plan_refs,
      ...prior.identity_payload.campaign_authorization_refs
    ].map(canonicalizeJson);
    const declaration = prior.identity_payload.anchor_declarations.find(
      (entry) => canonicalizeJson(entry.subject_ref) === subjectIdentity
    );
    if (receipt.identity_payload.evidence_kind !== "ANCHOR_RECEIPT"
      || canonicalizeJson(semantics.namespace_index_ref)
        !== canonicalizeJson(index.identity_payload.prior_index_ref)
      || !indexedSubjects.includes(subjectIdentity) || !declaration
      || semantics.profile !== declaration.profile
      || semantics.authority_ref !== declaration.authority_ref
      || receipt.identity_payload.producer_identity === prior.identity_payload.producer_identity) {
      throw new Error("Namespace predecessor receipt does not attest the exact prior revision.");
    }
  }
  return heads[0];
}

export async function verifyAuthenticatedNamespaceHead(store, namespaceId, anchorVerifiers) {
  if (!Array.isArray(anchorVerifiers) || anchorVerifiers.length === 0) {
    throw new Error("Authenticated namespace replay requires owner-pinned anchor verifiers.");
  }
  const verifiers = new Map();
  for (const entry of anchorVerifiers) {
    assertExactKeys(entry, [
      "authority_subject_ref", "anchor_requirement", "public_key"
    ], [], "namespace anchor verifier");
    validateExactArtifactReference(entry.authority_subject_ref, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN", "CAMPAIGN_AUTHORIZATION"]
    });
    const identity = canonicalizeJson(entry.authority_subject_ref);
    if (verifiers.has(identity)) throw new Error("Namespace anchor verifier subject is duplicated.");
    verifiers.set(identity, entry);
  }
  const head = await verifySingleEffectiveNamespaceHead(store, namespaceId);
  let current = head;
  const visited = new Set();
  while (current.identity_payload.prior_index_ref !== null) {
    const identity = canonicalizeJson(createExactArtifactReference(current));
    if (visited.has(identity)) throw new Error("Authenticated namespace history has a cycle.");
    visited.add(identity);
    const receipt = await store.readArtifact(
      current.identity_payload.prior_index_receipt_ref, validateFormalEvidenceArtifact
    );
    const verifier = verifiers.get(canonicalizeJson(
      receipt.identity_payload.semantic_envelope.authority_subject_ref
    ));
    if (!verifier) {
      throw new Error("Namespace predecessor receipt lacks its owner-pinned verifier.");
    }
    await verifyAuthenticatedAnchorReceipt(
      store, receipt, verifier.anchor_requirement, verifier.public_key
    );
    current = await store.readArtifact(
      current.identity_payload.prior_index_ref, validateAuthorityNamespaceIndex
    );
  }
  return head;
}

export function createCampaignEvidenceIndex(input) {
  assertExactKeys(input, [
    "artifact_id", "campaign_authorization", "authorizing_namespace",
    "attempt_inventory", "evidence_refs", "run_record_refs", "decision_refs",
    "anchor_receipt_refs", "qualification_plan_ref", "qualification_result_ref",
    "prior_index", "campaign_lifecycle", "lifecycle_reason", "cutoff_label", "producer_identity",
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
  validateCampaignLifecycle(input.campaign_lifecycle, input.lifecycle_reason);
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
    lifecycle_reason: input.lifecycle_reason,
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
    "prior_index_ref", "campaign_lifecycle", "lifecycle_reason", "member_count", "cutoff_label",
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
  validateCampaignLifecycle(payload.campaign_lifecycle, payload.lifecycle_reason);
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

export async function verifyDurableCampaignIndexHistory(store, index, authorization) {
  const visited = new Set();
  let current = index;
  while (true) {
    validateCampaignEvidenceIndex(current, { authorization });
    const identity = canonicalizeJson(createExactArtifactReference(current));
    if (visited.has(identity)) throw new Error("Campaign index history has a cycle.");
    visited.add(identity);
    const payload = current.identity_payload;
    if (payload.prior_index_ref === null) return current;
    const prior = await store.readArtifact(
      payload.prior_index_ref,
      (artifact) => validateCampaignEvidenceIndex(artifact, { authorization })
    );
    assertCampaignIndexCumulative({
      campaign_authorization: authorization,
      attempt_inventory: payload.attempt_inventory,
      qualification_plan_ref: payload.qualification_plan_ref,
      qualification_result_ref: payload.qualification_result_ref,
      evidence_refs: payload.evidence_refs,
      run_record_refs: payload.run_record_refs,
      decision_refs: payload.decision_refs,
      anchor_receipt_refs: payload.anchor_receipt_refs
    }, prior.identity_payload);
    current = prior;
  }
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
    "anchor_receipt", "anchor_public_key", "fresh_start_capture",
    "qualification_evidence_artifacts"
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
    const qualificationResult = await input.store.readArtifact(
      input.authorization.identity_payload.qualification_result_ref,
      (artifact) => validateQualificationResult(artifact, {
        plan: input.authority_context.qualification_plan,
        behaviorManifest: input.authority_context.behavior_manifest,
        evaluationManifest: input.authority_context.evaluation_manifest
      })
    );
    await verifyDurableQualificationEvidence(
      input.store, input.authority_context.qualification_plan,
      qualificationResult, input.qualification_evidence_artifacts,
      input.namespace_index, input.anchor_public_key
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
  await verifyAuthenticatedAnchorReceipt(
    input.store, input.anchor_receipt, authorization.anchor_requirement,
    input.anchor_public_key
  );
  await verifyTypedControlProof(input.store, input.fresh_start_capture);
  await verifyAuthenticatedFreshStartProof(
    input.store,
    input.fresh_start_capture,
    authorization.anchor_requirement,
    input.anchor_public_key,
    {
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      anchor_receipt_ref: receiptRef,
      slot_id: input.preflight.slot.slot_id,
      attempt_id: input.preflight.slot.attempt_id,
      path_id: input.preflight.slot.path_id,
      run_scope_id: input.preflight.fresh_start_proof.run_scope_id
    }
  );
  const receiptSemantics = input.anchor_receipt.identity_payload.semantic_envelope;
  const startSemantics = input.fresh_start_capture.identity_payload.semantic_envelope;
  if (input.anchor_receipt.identity_payload.evidence_kind !== "ANCHOR_RECEIPT"
    || canonicalizeJson(receiptSemantics.authority_subject_ref) !== canonicalizeJson(authorizationRef)
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
    || input.anchor_receipt.identity_payload.producer_identity
      === input.authorization.identity_payload.producer_identity
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
    || startSemantics.run_scope_id !== input.preflight.fresh_start_proof.run_scope_id
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
  const anchorVerifiers = [{
    authority_subject_ref: authorizationRef,
    anchor_requirement: authorization.anchor_requirement,
    public_key: input.anchor_public_key
  }];
  if (input.authority_context.qualification_plan !== null) {
    anchorVerifiers.push({
      authority_subject_ref: createExactArtifactReference(
        input.authority_context.qualification_plan
      ),
      anchor_requirement: input.authority_context.qualification_plan.identity_payload
        .anchor_requirement,
      public_key: input.anchor_public_key
    });
  }
  const head = await verifyAuthenticatedNamespaceHead(
    input.store, input.namespace_index.identity_payload.namespace_id, anchorVerifiers
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

export async function verifyDurableQualificationEvidence(
  store, plan, result, artifacts, authorizingNamespace, anchorPublicKey
) {
  if (!Array.isArray(artifacts)) {
    throw new Error("Qualification evidence context must be an array.");
  }
  const payload = result.identity_payload;
  const expectedRefs = [
    payload.validation_attestation_ref,
    payload.anchor_receipt_ref,
    ...payload.fresh_start_proof_refs,
    ...payload.executions.flatMap((execution) => execution.capture_refs)
  ];
  const expected = new Set(expectedRefs.map(canonicalizeJson));
  const supplied = new Map(artifacts.map((artifact) => [
    canonicalizeJson(createExactArtifactReference(artifact)), artifact
  ]));
  if (expected.size !== expectedRefs.length || supplied.size !== artifacts.length
    || supplied.size !== expected.size
    || [...expected].some((identity) => !supplied.has(identity))) {
    throw new Error("Qualification evidence does not close every exact planned artifact.");
  }
  for (const artifact of artifacts) await verifyDurableEvidence(store, artifact);
  const planRef = createExactArtifactReference(plan);
  const receipt = supplied.get(canonicalizeJson(payload.anchor_receipt_ref));
  await verifyAuthenticatedAnchorReceipt(
    store, receipt, plan.identity_payload.anchor_requirement, anchorPublicKey
  );
  if (receipt.identity_payload.evidence_kind !== "ANCHOR_RECEIPT"
    || canonicalizeJson(receipt.identity_payload.authority_subject_ref)
      !== canonicalizeJson(planRef)
    || receipt.identity_payload.semantic_envelope.profile
      !== plan.identity_payload.anchor_requirement.profile
    || receipt.identity_payload.semantic_envelope.authority_ref
      !== plan.identity_payload.anchor_requirement.authority_ref
    || receipt.identity_payload.producer_identity === plan.identity_payload.producer_identity) {
    throw new Error("Qualification plan lacks its exact durable external anchor.");
  }
  const receiptNamespace = await store.readArtifact(
    receipt.identity_payload.semantic_envelope.namespace_index_ref,
    validateAuthorityNamespaceIndex
  );
  if (!await namespaceIsInEffectiveHistory(
    store, authorizingNamespace, receiptNamespace
  ) || !receiptNamespace.identity_payload.qualification_plan_refs.some(
    (reference) => canonicalizeJson(reference) === canonicalizeJson(planRef)
  )) throw new Error("Qualification plan anchor is outside effective namespace history.");
  const executionIds = new Set(plan.identity_payload.execution_slots.map(
    (slot) => slot.execution_id
  ));
  const fresh = payload.fresh_start_proof_refs.map(
    (reference) => supplied.get(canonicalizeJson(reference))
  );
  const slotById = new Map(plan.identity_payload.execution_slots.map(
    (slot) => [slot.execution_id, slot]
  ));
  const freshProofs = await Promise.all(fresh.map(async (artifact) => {
    const semantics = artifact.identity_payload.semantic_envelope;
    const slot = slotById.get(semantics.execution_id);
    if (!slot) throw new Error("Qualification start names an unplanned execution.");
    await verifyAuthenticatedQualificationStartProof(
      store, artifact, plan.identity_payload.anchor_requirement, anchorPublicKey, {
        plan_ref: planRef,
        namespace_index_ref: createExactArtifactReference(receiptNamespace),
        anchor_receipt_ref: payload.anchor_receipt_ref,
        execution_id: slot.execution_id,
        path_id: slot.path_id,
        selection_basis_digest: slot.selection_basis_digest,
        run_scope_id: semantics.run_scope_id
      }
    );
    return replayTypedControlProof(store, artifact);
  }));
  if (freshProofs.some(
    (replay) => replay.proof.proof_role !== "QUALIFICATION_FRESH_START_PROOF"
  )) throw new Error("Qualification fresh-start artifacts are not typed proposition proofs.");
  if (fresh.some((artifact) => (
    artifact.identity_payload.semantic_envelope.capture_role
      !== "QUALIFICATION_FRESH_START_PROOF"
    || !executionIds.has(artifact.identity_payload.semantic_envelope.execution_id)
    || artifact.identity_payload.semantic_envelope.profile
      !== plan.identity_payload.anchor_requirement.fresh_start_profile
    || artifact.identity_payload.semantic_envelope.path_id
      !== slotById.get(artifact.identity_payload.semantic_envelope.execution_id)?.path_id
    || artifact.identity_payload.semantic_envelope.selection_basis_digest
      !== slotById.get(artifact.identity_payload.semantic_envelope.execution_id)
        ?.selection_basis_digest
    || canonicalizeJson(artifact.identity_payload.semantic_envelope.plan_ref)
      !== canonicalizeJson(planRef)
    || canonicalizeJson(artifact.identity_payload.semantic_envelope.anchor_receipt_ref)
      !== canonicalizeJson(payload.anchor_receipt_ref)
    || artifact.identity_payload.producer_identity === plan.identity_payload.producer_identity
    || artifact.identity_payload.semantic_envelope.anchor_event_id
      !== receipt.identity_payload.semantic_envelope.external_event_id
  )) || new Set(fresh.map(
    (artifact) => artifact.identity_payload.semantic_envelope.execution_id
  )).size !== executionIds.size || new Set(fresh.map(
    (artifact) => artifact.identity_payload.semantic_envelope.start_event_id
  )).size !== executionIds.size) {
    throw new Error("Qualification fresh-start evidence does not close every planned execution.");
  }
  const validation = supplied.get(canonicalizeJson(payload.validation_attestation_ref));
  const validationProof = await replayTypedControlProof(store, validation);
  const validationBasis = qualificationValidationBasisFingerprint(plan, result);
  if (validation.identity_payload.semantic_envelope.capture_role !== "VALIDATION_ATTESTATION"
    || validation.identity_payload.producer_identity !== payload.validator_identity
    || validationProof.proof.proof_role !== "VALIDATION_ATTESTATION"
    || canonicalizeJson(validationProof.proof.proposition.validated_subject_ref)
      !== canonicalizeJson(planRef)
    || validationProof.proof.proposition.recomputed_result !== payload.result
    || validationProof.proof.proposition.evidence_basis_digest !== validationBasis) {
    throw new Error("Qualification result lacks its exact validation attestation.");
  }
  for (const execution of payload.executions) {
    for (const reference of execution.capture_refs) {
      const capture = supplied.get(canonicalizeJson(reference));
      const captureProof = await replayTypedControlProof(store, capture);
      const matchingFresh = fresh.find((artifact) => (
        artifact.identity_payload.semantic_envelope.execution_id === execution.execution_id
      ));
      if (capture.identity_payload.semantic_envelope.capture_role !== "ORACLE_CLASSIFICATION"
        || captureProof.proof.proof_role !== "QUALIFICATION_ORACLE_CLASSIFICATION"
        || capture.identity_payload.semantic_envelope.execution_id !== execution.execution_id
        || capture.identity_payload.semantic_envelope.path_id !== execution.path_id
        || capture.identity_payload.semantic_envelope.oracle_projection_digest
          !== execution.oracle_projection_digest
        || capture.identity_payload.semantic_envelope.comparator_input_digest
          !== execution.comparator_input_digest
        || captureProof.proof.proposition.execution_status !== execution.status
        || captureProof.proof.proposition.run_scope_id
          !== matchingFresh?.identity_payload.semantic_envelope.run_scope_id
        || canonicalizeJson(captureProof.proof.proposition.comparator_input)
          !== canonicalizeJson(
            captureProof.proof.proposition.execution_status === "COMPLETED"
              ? normalizeQualificationComparatorInput(
                captureProof.proof.proposition.oracle_projection
              )
              : null
          )
        || canonicalizeJson(capture.identity_payload.authority_subject_ref)
          !== canonicalizeJson(planRef)) {
        throw new Error("Qualification execution capture has the wrong role or plan subject.");
      }
    }
  }
  const recomputedComparisons = recomputeQualificationComparisons(
    plan.identity_payload.execution_slots, payload.executions
  );
  const recomputedResult = payload.executions.some(
    (execution) => execution.status !== "COMPLETED"
  ) ? "INCONCLUSIVE" : recomputedComparisons.every(
      (comparison) => comparison.equivalent === true
    ) ? "QUALIFIED" : "NOT_QUALIFIED";
  if (canonicalizeJson(recomputedComparisons) !== canonicalizeJson(payload.comparisons)
    || recomputedResult !== payload.result) {
    throw new Error("Qualification comparisons/result fail independent raw-material recomputation.");
  }
}

function recomputeQualificationComparisons(slots, executions) {
  const byId = new Map(executions.map((execution) => [execution.execution_id, execution]));
  const comparisons = [];
  for (const path of REQUIRED_PATHS) {
    const ids = slots.filter((slot) => slot.path_id === path).map((slot) => slot.execution_id);
    for (let leftIndex = 0; leftIndex < ids.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < ids.length; rightIndex += 1) {
        const left = byId.get(ids[leftIndex]);
        const right = byId.get(ids[rightIndex]);
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
        const equivalent = left.comparator_input_digest === right.comparator_input_digest;
        comparisons.push({
          left_execution_id: left.execution_id,
          right_execution_id: right.execution_id,
          equivalent,
          mismatch_class: equivalent ? null : "VALUE_MISMATCH",
          details_digest: equivalent ? null : fingerprintCanonicalJson(
            "zoey:qualification-comparison-mismatch:v1", {
              left_comparator_input_digest: left.comparator_input_digest,
              right_comparator_input_digest: right.comparator_input_digest
            }
          )
        });
      }
    }
  }
  return comparisons;
}

export function qualificationValidationBasisFingerprint(plan, result) {
  validateCanonicalArtifact(plan, { allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"] });
  validateCanonicalArtifact(result, { allowedKinds: ["DETERMINISTIC_QUALIFICATION_RESULT"] });
  const payload = result.identity_payload;
  if (canonicalizeJson(payload.qualification_plan_ref)
      !== canonicalizeJson(createExactArtifactReference(plan))) {
    throw new Error("Qualification validation basis names a different plan.");
  }
  return fingerprintCanonicalJson("zoey:qualification-validation-basis:v1", {
    qualification_plan_ref: payload.qualification_plan_ref,
    executions: payload.executions,
    comparisons: payload.comparisons,
    result: payload.result,
    anchor_receipt_ref: payload.anchor_receipt_ref,
    fresh_start_proof_refs: payload.fresh_start_proof_refs
  });
}

export function qualificationOracleProjectionFingerprint(value) {
  return fingerprintCanonicalJson("zoey:qualification-oracle-projection:v1", value);
}

export function qualificationComparatorInputFingerprint(value) {
  return fingerprintCanonicalJson("zoey:qualification-comparator-input:v1", value);
}

export function normalizeQualificationComparatorInput(value) {
  const identities = new Map();
  const nextByPrefix = new Map();
  const visit = (current) => {
    if (typeof current === "string") {
      const match = /^(run|actor|state|source|interaction|transition|simulator)_[0-9a-f-]{36}$/.exec(
        current
      );
      if (!match) return current;
      if (!identities.has(current)) {
        const next = (nextByPrefix.get(match[1]) ?? 0) + 1;
        nextByPrefix.set(match[1], next);
        identities.set(current, `${match[1]}#${String(next).padStart(6, "0")}`);
      }
      return identities.get(current);
    }
    if (Array.isArray(current)) return current.map(visit);
    if (current !== null && typeof current === "object") {
      return Object.fromEntries(Object.entries(current).map(([key, child]) => [key, visit(child)]));
    }
    return current;
  };
  return visit(value);
}

export function qualificationComparatorInputFromTranscript(transcript) {
  const oracleProjection = JSON.parse(JSON.stringify(transcript));
  delete oracleProjection.run_ref;
  return normalizeQualificationComparatorInput(oracleProjection);
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
    if (payload.visibility !== "AUTHORITY_EXTERNAL" || payload.attempt_id !== null) {
      throw new Error("Anchor receipt visibility/context is invalid.");
    }
    assertExactKeys(payload.semantic_envelope, [
      "profile", "authority_subject_ref", "namespace_index_ref", "external_commit_sha",
      "authority_ref", "external_event_id", "observed_predecessor", "raw_receipt_digest"
    ], [], "anchor receipt semantics");
    validateExactArtifactReference(payload.semantic_envelope.authority_subject_ref, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN", "CAMPAIGN_AUTHORIZATION"]
    });
    validateExactArtifactReference(payload.semantic_envelope.namespace_index_ref, {
      allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
    });
    if (canonicalizeJson(payload.authority_subject_ref)
        !== canonicalizeJson(payload.semantic_envelope.authority_subject_ref)
      || (payload.authority_subject_ref.artifact_kind === "CAMPAIGN_AUTHORIZATION"
        && canonicalizeJson(payload.campaign_authorization_ref)
          !== canonicalizeJson(payload.semantic_envelope.authority_subject_ref))
      || (payload.authority_subject_ref.artifact_kind === "DETERMINISTIC_QUALIFICATION_PLAN"
        && payload.campaign_authorization_ref !== null)) {
      throw new Error("Anchor receipt does not bind its exact authority subject.");
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
      "anchor_event_id", "start_event_id", "run_scope_id", "capture_binding_digest"
    ], [], "fresh-start capture semantics");
    assertNonemptyString(payload.semantic_envelope.profile, "fresh-start capture profile");
    for (const field of [
      "slot_id", "challenge", "issued_by", "observed_by", "anchor_event_id", "start_event_id",
      "run_scope_id"
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
  } else if (payload.evidence_kind === "EVALUATOR_PRIVATE_CAPTURE"
    && payload.semantic_envelope.capture_role === "QUALIFICATION_FRESH_START_PROOF") {
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "profile", "execution_id", "path_id", "plan_ref",
      "namespace_index_ref", "anchor_receipt_ref", "selection_basis_digest",
      "anchor_event_id", "start_event_id", "run_scope_id", "content_digest"
    ], [], "qualification fresh-start capture semantics");
    if (payload.visibility !== "EVALUATOR_PRIVATE" || payload.attempt_id !== null
      || payload.campaign_authorization_ref !== null) {
      throw new Error("Qualification fresh-start capture has invalid visibility/context.");
    }
    for (const field of [
      "profile", "execution_id", "path_id", "anchor_event_id", "start_event_id", "run_scope_id"
    ]) {
      assertOpaqueId(payload.semantic_envelope[field], `qualification fresh-start ${field}`);
    }
    validateExactArtifactReference(payload.semantic_envelope.plan_ref, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
    });
    validateExactArtifactReference(payload.semantic_envelope.anchor_receipt_ref, {
      allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
    });
    validateExactArtifactReference(payload.semantic_envelope.namespace_index_ref, {
      allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
    });
    assertSha256(
      payload.semantic_envelope.selection_basis_digest,
      "qualification fresh-start selection basis"
    );
    assertSha256(payload.semantic_envelope.content_digest, "qualification fresh-start digest");
    if (payload.semantic_envelope.content_digest !== payload.raw_byte_digest
      || payload.semantic_envelope.anchor_event_id === payload.semantic_envelope.start_event_id
      || canonicalizeJson(payload.authority_subject_ref)
        !== canonicalizeJson(payload.semantic_envelope.plan_ref)) {
      throw new Error("Qualification fresh-start causal/digest closure is invalid.");
    }
  } else if (payload.evidence_kind === "EVALUATOR_PRIVATE_CAPTURE"
    && payload.semantic_envelope.capture_role === "ORACLE_CLASSIFICATION"
    && payload.authority_subject_ref.artifact_kind === "DETERMINISTIC_QUALIFICATION_PLAN") {
    assertExactKeys(payload.semantic_envelope, [
      "capture_role", "execution_id", "path_id", "plan_ref",
      "oracle_projection_digest", "comparator_input_digest", "execution_status", "run_scope_id",
      "oracle_projection", "comparator_input", "content_digest", "event_id"
    ], [], "qualification oracle capture semantics");
    if (payload.visibility !== "EVALUATOR_PRIVATE" || payload.attempt_id !== null
      || payload.campaign_authorization_ref !== null || payload.path_id !== null) {
      throw new Error("Qualification oracle capture has invalid visibility/context.");
    }
    for (const field of ["execution_id", "path_id", "event_id"]) {
      assertOpaqueId(payload.semantic_envelope[field], `qualification oracle ${field}`);
    }
    validateExactArtifactReference(payload.semantic_envelope.plan_ref, {
      allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
    });
    for (const field of [
      "oracle_projection_digest", "comparator_input_digest", "content_digest"
    ]) assertSha256(payload.semantic_envelope[field], `qualification oracle ${field}`);
    if (payload.semantic_envelope.content_digest !== payload.raw_byte_digest
      || canonicalizeJson(payload.authority_subject_ref)
        !== canonicalizeJson(payload.semantic_envelope.plan_ref)) {
      throw new Error("Qualification oracle capture identity/digest closure is invalid.");
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

function parseAndAuthenticateAnchorReceipt(rawBytes, anchorRequirement, publicKey) {
  const raw = toBuffer(rawBytes);
  assertExactKeys(anchorRequirement, [
    "profile", "authority_ref", "receipt_media_type", "receipt_encoding",
    "receipt_digest_algorithm", "receipt_custody_target", "resolvability_policy",
    "fresh_start_profile", "receipt_authentication"
  ], [], "authenticated anchor requirement");
  assertExactKeys(anchorRequirement.receipt_authentication, [
    "algorithm", "key_id", "public_key_fingerprint"
  ], [], "authenticated anchor policy");
  const document = parseCanonicalJsonBytes(raw, "authenticated anchor receipt");
  assertExactKeys(document, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload", "signature"
  ], [], "authenticated anchor receipt");
  const header = {
    schema_id: document.schema_id,
    schema_revision: document.schema_revision,
    algorithm: document.algorithm,
    key_id: document.key_id,
    signed_payload: structuredClone(document.signed_payload)
  };
  const policy = anchorRequirement.receipt_authentication;
  if (document.algorithm !== policy.algorithm || document.key_id !== policy.key_id
    || anchorPublicKeyFingerprint(publicKey) !== policy.public_key_fingerprint) {
    throw new Error("Anchor receipt verifier does not match the owner-pinned authentication policy.");
  }
  if (typeof document.signature !== "string"
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(document.signature)) {
    throw new Error("Anchor receipt signature encoding is invalid.");
  }
  const signature = Buffer.from(document.signature, "base64");
  if (signature.toString("base64") !== document.signature
    || !verifySignature(null, anchorReceiptSigningBytes(header), publicKey, signature)) {
    throw new Error("Anchor receipt signature authentication failed.");
  }
  const payload = document.signed_payload;
  if (payload.profile !== anchorRequirement.profile
    || payload.authority_ref !== anchorRequirement.authority_ref) {
    throw new Error("Authenticated anchor receipt conflicts with its declared authority profile.");
  }
  return document;
}

function parseAndAuthenticateFreshStart(rawBytes, anchorRequirement, publicKey) {
  const raw = toBuffer(rawBytes);
  const document = parseCanonicalJsonBytes(raw, "authenticated fresh-start attestation");
  assertExactKeys(document, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload", "signature"
  ], [], "authenticated fresh-start attestation");
  const header = {
    schema_id: document.schema_id,
    schema_revision: document.schema_revision,
    algorithm: document.algorithm,
    key_id: document.key_id,
    signed_payload: structuredClone(document.signed_payload)
  };
  const policy = anchorRequirement.receipt_authentication;
  if (document.algorithm !== policy.algorithm || document.key_id !== policy.key_id
    || anchorPublicKeyFingerprint(publicKey) !== policy.public_key_fingerprint) {
    throw new Error("Fresh-start verifier does not match the owner-pinned authentication policy.");
  }
  if (typeof document.signature !== "string"
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(document.signature)) {
    throw new Error("Fresh-start attestation signature encoding is invalid.");
  }
  const signature = Buffer.from(document.signature, "base64");
  if (signature.toString("base64") !== document.signature
    || !verifySignature(null, freshStartAttestationSigningBytes(header), publicKey, signature)) {
    throw new Error("Fresh-start attestation signature authentication failed.");
  }
  if (document.signed_payload.profile !== anchorRequirement.fresh_start_profile) {
    throw new Error("Authenticated fresh-start profile conflicts with anchor policy.");
  }
  return document;
}

function parseAndAuthenticateQualificationStart(rawBytes, anchorRequirement, publicKey) {
  const document = parseCanonicalJsonBytes(
    toBuffer(rawBytes), "authenticated qualification-start attestation"
  );
  assertExactKeys(document, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload", "signature"
  ], [], "authenticated qualification-start attestation");
  const header = {
    schema_id: document.schema_id,
    schema_revision: document.schema_revision,
    algorithm: document.algorithm,
    key_id: document.key_id,
    signed_payload: structuredClone(document.signed_payload)
  };
  const policy = anchorRequirement.receipt_authentication;
  if (document.algorithm !== policy.algorithm || document.key_id !== policy.key_id
    || anchorPublicKeyFingerprint(publicKey) !== policy.public_key_fingerprint) {
    throw new Error("Qualification-start verifier conflicts with owner-pinned policy.");
  }
  if (typeof document.signature !== "string"
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(document.signature)) {
    throw new Error("Qualification-start signature encoding is invalid.");
  }
  const signature = Buffer.from(document.signature, "base64");
  if (signature.toString("base64") !== document.signature
    || !verifySignature(
      null, qualificationStartAttestationSigningBytes(header), publicKey, signature
    )) {
    throw new Error("Qualification-start signature authentication failed.");
  }
  if (document.signed_payload.profile !== anchorRequirement.fresh_start_profile) {
    throw new Error("Qualification-start profile conflicts with anchor policy.");
  }
  return document;
}

function validateFreshStartSignedPayload(payload) {
  assertExactKeys(payload, [
    "profile", "authorization_ref", "namespace_index_ref", "anchor_receipt_ref",
    "slot_id", "attempt_id", "path_id", "challenge", "issued_by", "observed_by",
    "anchor_event_id", "start_event_id", "run_scope_id", "producer_identity", "issued_at"
  ], [], "fresh-start signed payload");
  validateExactArtifactReference(payload.authorization_ref, {
    allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
  });
  validateExactArtifactReference(payload.namespace_index_ref, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  validateExactArtifactReference(payload.anchor_receipt_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  for (const field of [
    "profile", "slot_id", "attempt_id", "path_id", "challenge", "issued_by",
    "observed_by", "anchor_event_id", "start_event_id", "run_scope_id", "producer_identity"
  ]) assertOpaqueId(payload[field], `fresh-start signed payload.${field}`);
  if (!REQUIRED_PATHS.includes(payload.path_id)
    || payload.anchor_event_id === payload.start_event_id) {
    throw new Error("Fresh-start signed path or causal event closure is invalid.");
  }
  validateCreated(payload.issued_at, payload.producer_identity);
}

function validateQualificationStartSignedPayload(payload) {
  assertExactKeys(payload, [
    "profile", "plan_ref", "namespace_index_ref", "anchor_receipt_ref",
    "execution_id", "path_id", "selection_basis_digest", "challenge", "issued_by",
    "observed_by", "anchor_event_id", "start_event_id", "run_scope_id",
    "producer_identity", "issued_at"
  ], [], "qualification-start signed payload");
  validateExactArtifactReference(payload.plan_ref, {
    allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
  });
  validateExactArtifactReference(payload.namespace_index_ref, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  validateExactArtifactReference(payload.anchor_receipt_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  for (const field of [
    "profile", "execution_id", "path_id", "challenge", "issued_by", "observed_by",
    "anchor_event_id", "start_event_id", "run_scope_id", "producer_identity"
  ]) assertOpaqueId(payload[field], `qualification-start signed payload.${field}`);
  assertSha256(payload.selection_basis_digest, "qualification-start selection basis");
  if (!REQUIRED_PATHS.includes(payload.path_id)
    || payload.anchor_event_id === payload.start_event_id) {
    throw new Error("Qualification-start path or causal event closure is invalid.");
  }
  validateCreated(payload.issued_at, payload.producer_identity);
}

function freshStartSemanticsFrom(payload, rawBytes) {
  validateFreshStartSignedPayload(payload);
  return {
    capture_role: "FRESH_START_PROOF",
    profile: payload.profile,
    slot_id: payload.slot_id,
    challenge: payload.challenge,
    issued_by: payload.issued_by,
    observed_by: payload.observed_by,
    anchor_event_id: payload.anchor_event_id,
    start_event_id: payload.start_event_id,
    run_scope_id: payload.run_scope_id,
    capture_binding_digest: sha256Bytes(toBuffer(rawBytes))
  };
}

function qualificationStartSemanticsFrom(payload, rawBytes) {
  validateQualificationStartSignedPayload(payload);
  return {
    capture_role: "QUALIFICATION_FRESH_START_PROOF",
    profile: payload.profile,
    execution_id: payload.execution_id,
    path_id: payload.path_id,
    plan_ref: structuredClone(payload.plan_ref),
    namespace_index_ref: structuredClone(payload.namespace_index_ref),
    anchor_receipt_ref: structuredClone(payload.anchor_receipt_ref),
    selection_basis_digest: payload.selection_basis_digest,
    anchor_event_id: payload.anchor_event_id,
    start_event_id: payload.start_event_id,
    run_scope_id: payload.run_scope_id,
    content_digest: sha256Bytes(toBuffer(rawBytes))
  };
}

function validateAnchorReceiptSignedPayload(payload) {
  assertExactKeys(payload, [
    "profile", "authority_subject_ref", "namespace_index_ref", "external_commit_sha",
    "authority_ref", "external_event_id", "observed_predecessor", "producer_identity",
    "issued_at"
  ], [], "anchor receipt signed payload");
  validateExactArtifactReference(payload.authority_subject_ref, {
    allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN", "CAMPAIGN_AUTHORIZATION"]
  });
  validateExactArtifactReference(payload.namespace_index_ref, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  if (!/^[0-9a-f]{40}$/.test(payload.external_commit_sha)
    || !/^[0-9a-f]{40}$/.test(payload.observed_predecessor)
    || payload.external_commit_sha === payload.observed_predecessor) {
    throw new Error("Anchor receipt signed commit/predecessor closure is invalid.");
  }
  for (const field of ["profile", "authority_ref", "external_event_id", "producer_identity"]) {
    assertOpaqueId(payload[field], `anchor receipt signed payload.${field}`);
  }
  validateCreated(payload.issued_at, payload.producer_identity);
}

function anchorSemanticsFrom(payload, rawBytes) {
  validateAnchorReceiptSignedPayload(payload);
  return {
    profile: payload.profile,
    authority_subject_ref: structuredClone(payload.authority_subject_ref),
    namespace_index_ref: structuredClone(payload.namespace_index_ref),
    external_commit_sha: payload.external_commit_sha,
    authority_ref: payload.authority_ref,
    external_event_id: payload.external_event_id,
    observed_predecessor: payload.observed_predecessor,
    raw_receipt_digest: sha256Bytes(toBuffer(rawBytes))
  };
}

function buildControlProofDocument(recorder, input, eventId) {
  const proof = {
    schema_id: "zoey.formal-control-proof",
    schema_revision: 1,
    proof_role: input.proof_role,
    authority_subject_ref: structuredClone(recorder.authority_subject_ref),
    campaign_authorization_ref: recorder.campaign_authorization_ref === null
      ? null
      : structuredClone(recorder.campaign_authorization_ref),
    attempt_id: recorder.attempt_id,
    path_id: recorder.path_id,
    event_id: eventId,
    proposition: structuredClone(input.proposition)
  };
  validateControlProofDocument(proof);
  return proof;
}

function controlProofFromFreshStartAttestation(document, artifact) {
  assertExactKeys(document, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload", "signature"
  ], [], "external fresh-start proof document");
  validateFreshStartSignedPayload(document.signed_payload);
  const signed = document.signed_payload;
  return {
    schema_id: "zoey.formal-control-proof",
    schema_revision: 1,
    proof_role: "FRESH_START_PROOF",
    authority_subject_ref: structuredClone(artifact.identity_payload.authority_subject_ref),
    campaign_authorization_ref: structuredClone(signed.authorization_ref),
    attempt_id: signed.attempt_id,
    path_id: signed.path_id,
    event_id: signed.start_event_id,
    proposition: {
      profile: signed.profile,
      slot_id: signed.slot_id,
      challenge: signed.challenge,
      issued_by: signed.issued_by,
      observed_by: signed.observed_by,
      anchor_event_id: signed.anchor_event_id,
      start_event_id: signed.start_event_id,
      run_scope_id: signed.run_scope_id
    }
  };
}

function controlProofFromQualificationStartAttestation(document, artifact) {
  assertExactKeys(document, [
    "schema_id", "schema_revision", "algorithm", "key_id", "signed_payload", "signature"
  ], [], "external qualification-start proof document");
  validateQualificationStartSignedPayload(document.signed_payload);
  const signed = document.signed_payload;
  return {
    schema_id: "zoey.formal-control-proof",
    schema_revision: 1,
    proof_role: "QUALIFICATION_FRESH_START_PROOF",
    authority_subject_ref: structuredClone(artifact.identity_payload.authority_subject_ref),
    campaign_authorization_ref: null,
    attempt_id: null,
    path_id: null,
    event_id: signed.start_event_id,
    proposition: {
      profile: signed.profile,
      execution_id: signed.execution_id,
      path_id: signed.path_id,
      plan_ref: structuredClone(signed.plan_ref),
      namespace_index_ref: structuredClone(signed.namespace_index_ref),
      anchor_receipt_ref: structuredClone(signed.anchor_receipt_ref),
      selection_basis_digest: signed.selection_basis_digest,
      anchor_event_id: signed.anchor_event_id,
      start_event_id: signed.start_event_id,
      run_scope_id: signed.run_scope_id
    }
  };
}

function assertRecorderProofTransition(
  attemptId, priorRoles, nextRole, runtimeCaptureObserved, materialOutputObserved,
  initialInspectionCaptured = false
) {
  if (priorRoles.includes(nextRole)) {
    throw new Error("Formal evidence recorder cannot repeat a control-proof role.");
  }
  if (attemptId !== null) {
    const sequence = [
      "FRESH_START_PROOF", "INITIAL_STATE_PROOF", "RUN_ISOLATION_PROOF",
      "SELECTION_INDEPENDENCE"
    ];
    if (runtimeCaptureObserved || nextRole !== sequence[priorRoles.length]) {
      throw new Error("Attempt control proofs are outside the closed pre-output sequence.");
    }
    if (nextRole === "INITIAL_STATE_PROOF" && !initialInspectionCaptured) {
      throw new Error("Initial-state proof requires its preceding raw inspection capture.");
    }
    if (nextRole === "SELECTION_INDEPENDENCE" && materialOutputObserved) {
      throw new Error("Prospective selection proof cannot follow material output.");
    }
    return;
  }
  if (!["QUALIFICATION_FRESH_START_PROOF", "QUALIFICATION_ORACLE_CLASSIFICATION",
    "VALIDATION_ATTESTATION"].includes(nextRole)) {
    throw new Error("Non-attempt recorder proof role is outside qualification closure.");
  }
}

function validateControlProofDocument(proof) {
  assertExactKeys(proof, [
    "schema_id", "schema_revision", "proof_role", "authority_subject_ref",
    "campaign_authorization_ref", "attempt_id", "path_id", "event_id", "proposition"
  ], [], "typed control proof");
  if (proof.schema_id !== "zoey.formal-control-proof" || proof.schema_revision !== 1) {
    throw new Error("Typed control proof schema is invalid.");
  }
  validateExactArtifactReference(proof.authority_subject_ref);
  if (proof.campaign_authorization_ref !== null) {
    validateExactArtifactReference(proof.campaign_authorization_ref, {
      allowedKinds: ["CAMPAIGN_AUTHORIZATION"]
    });
  }
  if ((proof.attempt_id === null) !== (proof.path_id === null)) {
    throw new Error("Typed control proof attempt/path identity is incomplete.");
  }
  if (proof.attempt_id !== null) {
    assertOpaqueId(proof.attempt_id, "typed control proof attempt_id");
    if (!REQUIRED_PATHS.includes(proof.path_id)) throw new Error("Typed control proof path is unknown.");
  }
  assertOpaqueId(proof.event_id, "typed control proof event_id");
  assertPlainObject(proof.proposition, "typed control proof proposition");
  const validators = {
    INITIAL_STATE_PROOF: validateInitialStateProposition,
    RUN_ISOLATION_PROOF: validateRunIsolationProposition,
    SELECTION_INDEPENDENCE: validateSelectionIndependenceProposition,
    VALIDATION_ATTESTATION: validateValidationAttestationProposition,
    FRESH_START_PROOF: validateFreshStartProposition,
    QUALIFICATION_FRESH_START_PROOF: validateQualificationFreshStartProposition,
    QUALIFICATION_ORACLE_CLASSIFICATION: validateQualificationOracleProposition
  };
  const validator = validators[proof.proof_role];
  if (!validator) throw new Error("Typed control proof role is outside the closed catalogue.");
  validator(proof.proposition, proof);
}

function validateInitialStateProposition(value) {
  assertExactKeys(value, [
    "initial_snapshot_digest", "initial_record_count", "prior_material_output_count",
    "run_scope_id", "observation_source", "initial_snapshot_ref"
  ], [], "initial-state proposition");
  assertSha256(value.initial_snapshot_digest, "initial-state snapshot digest");
  if (value.initial_record_count !== 0 || value.prior_material_output_count !== 0
    || value.observation_source !== "FRESH_BOUNDARY_INSPECTION") {
    throw new Error("Initial-state proof does not establish an empty fresh boundary.");
  }
  assertOpaqueId(value.run_scope_id, "initial-state run_scope_id");
  validateExactArtifactReference(value.initial_snapshot_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
}

function validateRunIsolationProposition(value) {
  assertExactKeys(value, [
    "run_scope_id", "foreign_run_ids", "isolated", "inspection_snapshot_digest",
    "initial_snapshot_ref"
  ], [], "run-isolation proposition");
  assertOpaqueId(value.run_scope_id, "run-isolation run_scope_id");
  assertSortedUniqueStrings(value.foreign_run_ids, "run-isolation foreign_run_ids");
  assertSha256(value.inspection_snapshot_digest, "run-isolation inspection digest");
  validateExactArtifactReference(value.initial_snapshot_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  if (value.isolated !== true || value.foreign_run_ids.length !== 0) {
    throw new Error("Run-isolation proof reports foreign state or a non-isolated boundary.");
  }
}

function validateSelectionIndependenceProposition(value) {
  assertExactKeys(value, [
    "selection_basis_digest", "seed_commitment", "material_output_observed",
    "selection_event_id"
  ], [], "selection-independence proposition");
  assertSha256(value.selection_basis_digest, "selection basis digest");
  assertSha256(value.seed_commitment, "selection seed commitment");
  assertOpaqueId(value.selection_event_id, "selection event_id");
  if (value.material_output_observed !== false) {
    throw new Error("Selection-independence proof was created after material output observation.");
  }
}

function validateValidationAttestationProposition(value) {
  assertExactKeys(value, [
    "validated_subject_ref", "validation_profile", "evidence_basis_digest",
    "recomputed_result", "validation_result"
  ], [], "validation-attestation proposition");
  validateExactArtifactReference(value.validated_subject_ref);
  assertOpaqueId(value.validation_profile, "validation-attestation profile");
  assertSha256(value.evidence_basis_digest, "validation-attestation evidence basis");
  if (![
    "QUALIFIED", "NOT_QUALIFIED", "VALID", "INVALID_UNSCORABLE",
    "BOUNDED_PASS", "BOUNDED_FAIL", "NOT_YET_DETERMINABLE"
  ].includes(value.recomputed_result) || value.validation_result !== "VALID") {
    throw new Error("Validation attestation does not bind a successful independent recomputation.");
  }
}

function validateFreshStartProposition(value, proof) {
  assertExactKeys(value, [
    "profile", "slot_id", "challenge", "issued_by", "observed_by", "anchor_event_id",
    "start_event_id", "run_scope_id"
  ], [], "fresh-start proposition");
  if (proof.attempt_id === null) throw new Error("Fresh-start proof must be attempt-bound.");
  assertNonemptyString(value.profile, "fresh-start profile");
  for (const field of [
    "slot_id", "challenge", "issued_by", "observed_by", "anchor_event_id", "start_event_id",
    "run_scope_id"
  ]) assertOpaqueId(value[field], `fresh-start proposition.${field}`);
  if (value.anchor_event_id === value.start_event_id) {
    throw new Error("Fresh-start proof cannot reuse its anchor event as start.");
  }
}

function validateQualificationFreshStartProposition(value, proof) {
  assertExactKeys(value, [
    "profile", "execution_id", "path_id", "plan_ref", "namespace_index_ref",
    "anchor_receipt_ref", "selection_basis_digest", "anchor_event_id", "start_event_id",
    "run_scope_id"
  ], [], "qualification fresh-start proposition");
  if (proof.attempt_id !== null || proof.campaign_authorization_ref !== null) {
    throw new Error("Qualification fresh-start proof cannot be campaign-attempt bound.");
  }
  for (const field of [
    "profile", "execution_id", "path_id", "anchor_event_id", "start_event_id", "run_scope_id"
  ]) {
    assertOpaqueId(value[field], `qualification fresh-start proposition.${field}`);
  }
  validateExactArtifactReference(value.plan_ref, {
    allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
  });
  validateExactArtifactReference(value.anchor_receipt_ref, {
    allowedKinds: ["FORMAL_EVIDENCE_ARTIFACT"]
  });
  validateExactArtifactReference(value.namespace_index_ref, {
    allowedKinds: ["AUTHORITY_NAMESPACE_INDEX"]
  });
  assertSha256(value.selection_basis_digest, "qualification fresh-start selection basis");
  if (!REQUIRED_PATHS.includes(value.path_id) || value.anchor_event_id === value.start_event_id
    || canonicalizeJson(value.plan_ref) !== canonicalizeJson(proof.authority_subject_ref)) {
    throw new Error("Qualification fresh-start proof has invalid plan or causal closure.");
  }
}

function validateQualificationOracleProposition(value, proof) {
  assertExactKeys(value, [
    "execution_id", "path_id", "plan_ref", "oracle_projection_digest",
    "comparator_input_digest", "execution_status", "run_scope_id",
    "oracle_projection", "comparator_input"
  ], [], "qualification oracle proposition");
  if (proof.attempt_id !== null || proof.campaign_authorization_ref !== null) {
    throw new Error("Qualification oracle proof cannot be campaign-attempt bound.");
  }
  assertOpaqueId(value.execution_id, "qualification oracle execution_id");
  assertOpaqueId(value.path_id, "qualification oracle path_id");
  validateExactArtifactReference(value.plan_ref, {
    allowedKinds: ["DETERMINISTIC_QUALIFICATION_PLAN"]
  });
  for (const field of ["oracle_projection_digest", "comparator_input_digest"]) {
    assertSha256(value[field], `qualification oracle proposition.${field}`);
  }
  assertOpaqueId(value.run_scope_id, "qualification oracle run_scope_id");
  assertPlainObject(value.oracle_projection, "qualification oracle projection");
  if (!["COMPLETED", "INVALID"].includes(value.execution_status)) {
    throw new Error("Qualification oracle execution status is invalid.");
  }
  if (value.execution_status === "COMPLETED") {
    assertPlainObject(value.comparator_input, "qualification comparator input");
  } else if (value.comparator_input !== null) {
    throw new Error("Invalid qualification execution cannot fabricate comparator input.");
  }
  if (qualificationOracleProjectionFingerprint(value.oracle_projection)
      !== value.oracle_projection_digest
    || qualificationComparatorInputFingerprint(value.comparator_input)
      !== value.comparator_input_digest) {
    throw new Error("Qualification oracle digests were not derived from captured material.");
  }
  if (canonicalizeJson(value.plan_ref) !== canonicalizeJson(proof.authority_subject_ref)) {
    throw new Error("Qualification oracle proof names a different plan.");
  }
}

function controlProofSemantics(proof, rawBytes) {
  validateControlProofDocument(proof);
  const digest = sha256Bytes(toBuffer(rawBytes));
  if (proof.proof_role === "FRESH_START_PROOF") {
    return {
      capture_role: proof.proof_role,
      ...structuredClone(proof.proposition),
      capture_binding_digest: digest
    };
  }
  if (proof.proof_role === "QUALIFICATION_FRESH_START_PROOF") {
    return {
      capture_role: proof.proof_role,
      ...structuredClone(proof.proposition),
      content_digest: digest
    };
  }
  if (proof.proof_role === "QUALIFICATION_ORACLE_CLASSIFICATION") {
    return {
      capture_role: "ORACLE_CLASSIFICATION",
      ...structuredClone(proof.proposition),
      content_digest: digest,
      event_id: proof.event_id
    };
  }
  return {
    capture_role: proof.proof_role,
    subject_ref: structuredClone(proof.authority_subject_ref),
    content_digest: digest,
    event_id: proof.event_id
  };
}

function runtimeEvidenceVisibility(evidenceKind) {
  if (["SUT_INPUT_CAPTURE", "SUT_OUTPUT_CAPTURE", "SUT_INSPECTION_CAPTURE"].includes(
    evidenceKind
  )) return "SUT_VISIBLE";
  if (["SIMULATOR_REQUEST_CAPTURE", "SIMULATOR_REALIZATION_CAPTURE"].includes(
    evidenceKind
  )) return "EVALUATOR_PRIVATE";
  throw new Error("Recorder runtime evidence kind is outside the closed catalogue.");
}

function runtimeEvidenceSemantics(evidenceKind, data, rawBytes, eventId) {
  assertPlainObject(data, "recorded runtime evidence semantic_data");
  const digest = sha256Bytes(rawBytes);
  if (["SUT_INPUT_CAPTURE", "SUT_OUTPUT_CAPTURE", "SUT_INSPECTION_CAPTURE"].includes(
    evidenceKind
  )) {
    assertExactKeys(data, ["subject_identity", "contract_digest"], [], "SUT evidence data");
    const roles = {
      SUT_INPUT_CAPTURE: "EXACT_DELIVERED_INPUT",
      SUT_OUTPUT_CAPTURE: "EXACT_MATERIAL_OUTPUT",
      SUT_INSPECTION_CAPTURE: "EXACT_INSPECTION_PROJECTION"
    };
    return {
      capture_role: roles[evidenceKind],
      subject_identity: data.subject_identity,
      event_id: eventId,
      content_digest: digest,
      contract_digest: data.contract_digest
    };
  }
  if (evidenceKind === "SIMULATOR_REQUEST_CAPTURE") {
    assertExactKeys(data, [
      "requested_sut_output_ref", "simulator_configuration_fingerprint"
    ], [], "simulator request data");
    return {
      capture_role: "SIMULATOR_REQUEST",
      requested_sut_output_ref: structuredClone(data.requested_sut_output_ref),
      simulator_configuration_fingerprint: data.simulator_configuration_fingerprint,
      event_id: eventId,
      request_digest: digest
    };
  }
  if (evidenceKind === "SIMULATOR_REALIZATION_CAPTURE") {
    assertExactKeys(data, [
      "request_capture_ref", "evaluator_private_premise_ref",
      "simulator_configuration_fingerprint", "fidelity", "mismatch_digest", "origin"
    ], [], "simulator realization data");
    return {
      capture_role: "SIMULATOR_REALIZATION",
      request_capture_ref: structuredClone(data.request_capture_ref),
      delivered_projection_digest: digest,
      evaluator_private_premise_ref: data.evaluator_private_premise_ref === null
        ? null
        : structuredClone(data.evaluator_private_premise_ref),
      simulator_configuration_fingerprint: data.simulator_configuration_fingerprint,
      fidelity: data.fidelity,
      mismatch_digest: data.mismatch_digest,
      origin: data.origin,
      event_id: eventId
    };
  }
  throw new Error("Recorder runtime evidence kind is outside the closed catalogue.");
}

function parseCanonicalJsonBytes(rawBytes, label) {
  const raw = toBuffer(rawBytes);
  let value;
  try {
    value = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new Error(`${label} bytes are not valid JSON.`);
  }
  if (!raw.equals(Buffer.from(`${canonicalizeJson(value)}\n`, "utf8"))) {
    throw new Error(`${label} bytes are not the exact canonical representation.`);
  }
  return value;
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

function validateCampaignLifecycle(lifecycle, reason) {
  const reasons = {
    closed: ["planned_attempt_set_closed", "authoritative_global_hard_failure"],
    suspended: [
      "deterministic_qualification_invalidated", "invalid_attempt_limit_reached",
      "repeated_invalidity_root_cause", "authority_review_required"
    ],
    superseded: ["campaign_superseded"]
  };
  if (!Object.hasOwn(reasons, lifecycle) || !reasons[lifecycle].includes(reason)) {
    throw new Error("Campaign index lifecycle/reason is outside the closed authority catalogue.");
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
    if (entry.replacement_allocation !== null) {
      if (!decisions.has(canonicalizeJson(entry.replacement_allocation.invalidity_decision_ref))
        || !runs.has(canonicalizeJson(entry.replacement_allocation.predecessor_run_ref))) {
        throw new Error("Replacement allocation basis is omitted from campaign members.");
      }
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
  assertUniqueArtifactReferenceIds(references, label);
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

function identityClaimRelativePath(reference) {
  return join(
    "identity-claims",
    reference.artifact_kind,
    `${createHash("sha256").update(reference.artifact_id, "utf8").digest("hex")}.json`
  );
}

function identityClaimBytes(reference) {
  return Buffer.from(`${canonicalizeJson({
    artifact_kind: reference.artifact_kind,
    artifact_id: reference.artifact_id,
    content_fingerprint: reference.content_fingerprint
  })}\n`, "utf8");
}

async function claimArtifactIdentity(root, reference) {
  try {
    await writeImmutable(
      root,
      safeStorePath(root, identityClaimRelativePath(reference)),
      identityClaimBytes(reference)
    );
  } catch (error) {
    if (/collision or mutation/.test(error.message)) {
      throw new Error(
        `Artifact identity conflict for ${reference.artifact_kind}:${reference.artifact_id}.`
      );
    }
    throw error;
  }
}

async function verifyArtifactIdentityClaim(root, reference) {
  const claimPath = safeStorePath(root, identityClaimRelativePath(reference));
  const bytes = await readFile(claimPath);
  if (!bytes.equals(identityClaimBytes(reference))) {
    throw new Error(
      `Artifact identity conflict for ${reference.artifact_kind}:${reference.artifact_id}.`
    );
  }
}

function safeStorePath(root, relativePath) {
  const target = resolve(root, relativePath);
  const fromRoot = relative(root, target);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error("Artifact custody path escapes the evidence store.");
  }
  return target;
}

async function writeImmutable(root, path, bytes) {
  await ensureSafeStoreParent(root, path);
  let handle;
  let created = false;
  try {
    handle = await open(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o444
    );
    await handle.writeFile(bytes);
    await handle.sync();
    created = true;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const status = await lstat(path);
    if (!status.isFile() || status.isSymbolicLink()) {
      throw new Error("Content-addressed custody path is not an immutable regular file.");
    }
    const existing = await readFile(path);
    if (!existing.equals(bytes)) throw new Error("Content-addressed path collision or mutation detected.");
  } finally {
    await handle?.close();
  }
  if (created) {
    const directory = await open(dirname(path), constants.O_RDONLY);
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  }
}

async function ensureSafeStoreParent(root, path) {
  const parent = dirname(path);
  const fromRoot = relative(root, parent);
  if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    throw new Error("Artifact custody parent escapes the evidence store.");
  }
  const rootStatus = await lstat(root);
  if (!rootStatus.isDirectory() || rootStatus.isSymbolicLink()) {
    throw new Error("Artifact custody root must be a real directory, not a symlink.");
  }
  const segments = fromRoot === "" ? [] : fromRoot.split("/");
  let current = root;
  for (const segment of segments) {
    if (segment === "") continue;
    current = join(current, segment);
    try {
      await mkdir(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const status = await lstat(current);
    if (!status.isDirectory() || status.isSymbolicLink()) {
      throw new Error("Artifact custody parent must be a real directory, not a symlink.");
    }
  }
  const resolvedParent = await realpath(parent);
  if (resolvedParent !== parent) {
    throw new Error("Artifact custody parent resolves through a symlink.");
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
