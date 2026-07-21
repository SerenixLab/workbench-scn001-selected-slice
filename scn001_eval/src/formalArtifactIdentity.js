import { createHash } from "node:crypto";

export const ARTIFACT_KIND_SCHEMA = Object.freeze({
  BEHAVIOR_CONFIGURATION_MANIFEST: "zoey.behavior-configuration-manifest",
  EVALUATION_CONFIGURATION_MANIFEST: "zoey.evaluation-configuration-manifest",
  DETERMINISTIC_QUALIFICATION_PLAN: "zoey.deterministic-qualification-plan",
  DETERMINISTIC_QUALIFICATION_RESULT: "zoey.deterministic-qualification-result",
  CAMPAIGN_AUTHORIZATION: "zoey.campaign-authorization",
  FORMAL_RUN_RECORD: "zoey.formal-run-record",
  FORMAL_EVIDENCE_ARTIFACT: "zoey.formal-evidence-artifact",
  EVALUATION_DECISION: "zoey.evaluation-decision",
  BOUNDED_CAMPAIGN_RESULT: "zoey.bounded-campaign-result",
  CAMPAIGN_EVIDENCE_INDEX: "zoey.campaign-evidence-index",
  AUTHORITY_NAMESPACE_INDEX: "zoey.authority-namespace-index"
});

export const ARTIFACT_HASH_DOMAIN = Object.freeze({
  BEHAVIOR_CONFIGURATION_MANIFEST: "zoey:behavior-configuration-manifest:v1",
  EVALUATION_CONFIGURATION_MANIFEST: "zoey:evaluation-configuration-manifest:v1",
  DETERMINISTIC_QUALIFICATION_PLAN: "zoey:deterministic-qualification-plan:v1",
  DETERMINISTIC_QUALIFICATION_RESULT: "zoey:deterministic-qualification-result:v1",
  CAMPAIGN_AUTHORIZATION: "zoey:campaign-authorization:v1",
  FORMAL_RUN_RECORD: "zoey:formal-run-record:v1",
  FORMAL_EVIDENCE_ARTIFACT: "zoey:formal-evidence-artifact:v1",
  EVALUATION_DECISION: "zoey:evaluation-decision:v1",
  BOUNDED_CAMPAIGN_RESULT: "zoey:bounded-campaign-result:v1",
  CAMPAIGN_EVIDENCE_INDEX: "zoey:campaign-evidence-index:v1",
  AUTHORITY_NAMESPACE_INDEX: "zoey:authority-namespace-index:v1"
});

export const DECISION_KINDS = Object.freeze([
  "RUN_INVALIDITY",
  "AUTHORITY_INVALIDATION",
  "RECORD_CORRECTION",
  "ORACLE_POLICY_RECLASSIFICATION",
  "QUALIFICATION_RESULT_CORRECTION",
  "CAMPAIGN_SUPERSESSION",
  "BOUNDED_RESULT_SUPERSESSION",
  "BOUNDED_RESULT_STANDING",
  "CLAIM_INVALIDATION",
  "NAMESPACE_RECONCILIATION"
]);

export const EVIDENCE_KINDS = Object.freeze([
  "SUT_INPUT_CAPTURE",
  "SUT_OUTPUT_CAPTURE",
  "SUT_INSPECTION_CAPTURE",
  "SIMULATOR_REQUEST_CAPTURE",
  "SIMULATOR_REALIZATION_CAPTURE",
  "EVALUATOR_PRIVATE_CAPTURE",
  "ANCHOR_RECEIPT",
  "RAW_BINARY_ATTACHMENT"
]);

export const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function canonicalizeJson(value) {
  return canonicalize(value, "$", new Set());
}

export function fingerprintCanonicalJson(hashDomain, value) {
  assertNonemptyString(hashDomain, "hashDomain");
  const canonical = canonicalizeJson(value);
  const digest = createHash("sha256")
    .update(`${hashDomain}\n`, "utf8")
    .update(canonical, "utf8")
    .digest("hex");
  return `sha256:${digest}`;
}

export function validateArtifactKindSchema(artifactKind, schemaId) {
  if (!Object.hasOwn(ARTIFACT_KIND_SCHEMA, artifactKind)) {
    throw new Error(`Unknown artifact_kind: ${String(artifactKind)}.`);
  }
  if (ARTIFACT_KIND_SCHEMA[artifactKind] !== schemaId) {
    throw new Error(`artifact_kind/schema_id mapping is invalid for ${artifactKind}.`);
  }
}

export function validateExactArtifactReference(reference, { allowedKinds } = {}) {
  assertExactKeys(reference, [
    "artifact_id",
    "artifact_kind",
    "schema_id",
    "schema_revision",
    "content_fingerprint"
  ], [], "exact artifact reference");
  assertOpaqueId(reference.artifact_id, "exact artifact reference.artifact_id");
  validateArtifactKindSchema(reference.artifact_kind, reference.schema_id);
  if (allowedKinds && !allowedKinds.includes(reference.artifact_kind)) {
    throw new Error(`Artifact kind ${reference.artifact_kind} is not allowed by this reference.`);
  }
  if (reference.schema_revision !== 1) {
    throw new Error("Exact artifact reference schema_revision must be 1.");
  }
  assertSha256(reference.content_fingerprint, "exact artifact reference.content_fingerprint");
  return reference;
}

export function createExactArtifactReference(artifact) {
  assertExactKeys(artifact, [
    "artifact_id",
    "artifact_kind",
    "schema_id",
    "schema_revision",
    "content_fingerprint"
  ], [], "referenceable artifact identity");
  validateExactArtifactReference(artifact);
  return deepFreeze(structuredClone(artifact));
}

export function assertExactKeys(value, required, optional, label) {
  assertPlainObject(value, label);
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(value);
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  const extra = keys.filter((key) => !allowed.has(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} has invalid fields; missing=[${missing.join(",")}], extra=[${extra.join(",")}].`
    );
  }
}

export function assertPlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)) {
    throw new Error(`${label} must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error(`${label} cannot contain symbol keys.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
      throw new Error(`${label}.${key} must be an enumerable data property.`);
    }
  }
}

export function assertNonemptyString(value, label) {
  if (typeof value !== "string" || value.length === 0 || !value.isWellFormed()) {
    throw new Error(`${label} must be a non-empty well-formed string.`);
  }
}

export function assertOpaqueId(value, label) {
  assertNonemptyString(value, label);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,127}$/.test(value)) {
    throw new Error(`${label} must be an opaque stable identifier.`);
  }
}

export function assertSha256(value, label) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase sha256 fingerprint.`);
  }
}

export function assertSortedUniqueStrings(values, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)
    || values.some((value) => typeof value !== "string" || value.length === 0
      || !value.isWellFormed())
    || new Set(values).size !== values.length
    || values.some((value, index) => index > 0 && values[index - 1] >= value)) {
    throw new Error(`${label} must be a sorted unique string array.`);
  }
}

export function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function canonicalize(value, path, ancestors) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") {
    if (!value.isWellFormed()) throw new Error(`${path} contains an unpaired Unicode surrogate.`);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} contains a non-finite number.`);
    return JSON.stringify(value);
  }
  if (typeof value !== "object" || value === undefined) {
    throw new Error(`${path} contains a value outside the RFC8785 JSON domain.`);
  }
  if (ancestors.has(value)) throw new Error(`${path} contains a cycle.`);
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length > 0
        || Object.keys(value).some((key) => !/^(0|[1-9][0-9]*)$/.test(key))) {
        throw new Error(`${path} contains non-index array properties.`);
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) throw new Error(`${path} contains a sparse array.`);
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
          throw new Error(`${path}[${index}] must be an enumerable data property.`);
        }
      }
      return `[${value.map((entry, index) => canonicalize(
        entry, `${path}[${index}]`, ancestors
      )).join(",")}]`;
    }
    assertPlainObject(value, path);
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => {
      if (!key.isWellFormed()) throw new Error(`${path} contains an invalid Unicode key.`);
      return `${JSON.stringify(key)}:${canonicalize(value[key], `${path}.${key}`, ancestors)}`;
    }).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}
