import {
  ARTIFACT_KIND_SCHEMA,
  assertExactKeys,
  assertNonemptyString,
  assertOpaqueId,
  assertPlainObject,
  assertSha256,
  assertSortedUniqueStrings,
  canonicalizeJson,
  deepFreeze,
  fingerprintCanonicalJson,
  validateArtifactKindSchema
} from "./formalArtifactIdentity.js";

const BEHAVIOR_KIND = "BEHAVIOR_CONFIGURATION_MANIFEST";
const EVALUATION_KIND = "EVALUATION_CONFIGURATION_MANIFEST";
const CONFIGURATION_KINDS = Object.freeze([BEHAVIOR_KIND, EVALUATION_KIND]);
const PAYLOAD_DOMAIN = Object.freeze({
  [BEHAVIOR_KIND]: "zoey:behavior-configuration:v1",
  [EVALUATION_KIND]: "zoey:evaluation-configuration:v1"
});
const MANIFEST_DOMAIN = Object.freeze({
  [BEHAVIOR_KIND]: "zoey:behavior-configuration-manifest:v1",
  [EVALUATION_KIND]: "zoey:evaluation-configuration-manifest:v1"
});
const PAYLOAD_FINGERPRINT_FIELD = Object.freeze({
  [BEHAVIOR_KIND]: "behavior_fingerprint",
  [EVALUATION_KIND]: "evaluation_fingerprint"
});
const REQUIRED_MANIFEST_FIELDS = Object.freeze([
  "artifact_kind",
  "schema_id",
  "schema_revision",
  "manifest_id",
  "identity_payload",
  "provenance",
  "canonicalization_scheme",
  "canonicalization_revision",
  "hash_algorithm",
  "hash_domain",
  "manifest_hash_domain",
  "created_at",
  "created_by",
  "supersedes_manifest_ref",
  "manifest_artifact_fingerprint"
]);
const NOT_APPLICABLE_REASONS = Object.freeze({
  model: ["deterministic_non_model_sut"],
  prompt: ["deterministic_non_model_sut"],
  tool: ["no_behavior_affecting_tool"],
  provider: ["no_external_provider"],
  randomness: ["no_runtime_randomness"]
});
const CUSTODY_KINDS = Object.freeze([
  "EMBEDDED",
  "GOVERNED_FILE",
  "ACCESS_CONTROLLED_ARTIFACT"
]);
const REQUIRED_FIXTURE_PATHS = Object.freeze([
  "SCN001-SSFO-V0.2.0-CANONICAL-THIN",
  "SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT",
  "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN",
  "SCN001-SSFO-V0.2.0-CF-RECENT-BASIS"
]);
const REQUIRED_CLAIM_CLASSES = Object.freeze([
  "CC-EVIDENCE-TRIAL-FORMATION",
  "CC-EXPLANATION-PROVENANCE",
  "CC-OUTCOME-SEMANTICS",
  "CC-SCOPE-TRIAL-USE",
  "CC-TIME-STALE-BASIS"
]);
const REQUIRED_GOVERNING_DOCUMENTS = Object.freeze([
  "ADR-002",
  "ADR-004",
  "ADR-005",
  "ADR-007",
  "ADR-009",
  "ADR-010",
  "ADR-011",
  "ADR-012",
  "CANONICAL_SCENARIOS",
  "ENGINEERING_STANDARD",
  "OPEN_QUESTIONS",
  "SCN001-SSFO-V0.2.0",
  "SCN001_SELECTED_SLICE",
  "STATE_AND_CONTROL_MODEL",
  "SYSTEM_THESIS"
]);

export const BEHAVIOR_COMPARISON = Object.freeze({
  IDENTICAL: "IDENTICAL",
  METADATA_ONLY_DIFFERENCE: "METADATA_ONLY_DIFFERENCE",
  BEHAVIOR_CONFIGURATION_CHANGED: "BEHAVIOR_CONFIGURATION_CHANGED",
  COMPARABILITY_UNRESOLVED: "COMPARABILITY_UNRESOLVED"
});
export const EVALUATION_COMPARISON = Object.freeze({
  IDENTICAL: "IDENTICAL",
  METADATA_ONLY_DIFFERENCE: "METADATA_ONLY_DIFFERENCE",
  EVALUATION_CONFIGURATION_CHANGED: "EVALUATION_CONFIGURATION_CHANGED",
  COMPARABILITY_UNRESOLVED: "COMPARABILITY_UNRESOLVED"
});

export function createBehaviorConfigurationManifest(input) {
  return createConfigurationManifest(BEHAVIOR_KIND, input);
}

export function createEvaluationConfigurationManifest(input) {
  return createConfigurationManifest(EVALUATION_KIND, input);
}

export function validateBehaviorConfigurationManifest(manifest) {
  return validateConfigurationManifest(manifest, BEHAVIOR_KIND);
}

export function validateEvaluationConfigurationManifest(manifest) {
  return validateConfigurationManifest(manifest, EVALUATION_KIND);
}

export function createConfigurationManifestReference(manifest) {
  const kind = manifest?.artifact_kind;
  validateConfigurationManifest(manifest, kind);
  const payloadField = PAYLOAD_FINGERPRINT_FIELD[kind];
  const reference = {
    artifact_id: manifest.manifest_id,
    artifact_kind: kind,
    schema_id: manifest.schema_id,
    schema_revision: manifest.schema_revision,
    content_fingerprint: manifest.manifest_artifact_fingerprint,
    [payloadField]: manifest[payloadField],
    manifest_artifact_fingerprint: manifest.manifest_artifact_fingerprint
  };
  validateConfigurationManifestReference(reference, { allowedKind: kind });
  return deepFreeze(reference);
}

export function validateConfigurationManifestReference(reference, { allowedKind } = {}) {
  assertPlainObject(reference, "configuration manifest reference");
  const kind = reference.artifact_kind;
  if (!CONFIGURATION_KINDS.includes(kind) || (allowedKind && kind !== allowedKind)) {
    throw new Error("Configuration manifest reference has an invalid artifact_kind.");
  }
  const payloadField = PAYLOAD_FINGERPRINT_FIELD[kind];
  assertExactKeys(reference, [
    "artifact_id",
    "artifact_kind",
    "schema_id",
    "schema_revision",
    "content_fingerprint",
    payloadField,
    "manifest_artifact_fingerprint"
  ], [], "configuration manifest reference");
  assertOpaqueId(reference.artifact_id, "configuration manifest reference.artifact_id");
  validateArtifactKindSchema(kind, reference.schema_id);
  if (reference.schema_revision !== 1) {
    throw new Error("Configuration manifest reference schema_revision must be 1.");
  }
  assertSha256(reference.content_fingerprint, "configuration manifest reference.content_fingerprint");
  assertSha256(reference[payloadField], `configuration manifest reference.${payloadField}`);
  assertSha256(
    reference.manifest_artifact_fingerprint,
    "configuration manifest reference.manifest_artifact_fingerprint"
  );
  if (reference.content_fingerprint !== reference.manifest_artifact_fingerprint) {
    throw new Error("Configuration reference content_fingerprint must equal manifest identity.");
  }
  return reference;
}

export function resolveConfigurationManifestReference(reference, manifest) {
  validateConfigurationManifestReference(reference);
  validateConfigurationManifest(manifest, reference.artifact_kind);
  const expected = createConfigurationManifestReference(manifest);
  if (canonicalizeJson(reference) !== canonicalizeJson(expected)) {
    throw new Error("Configuration manifest reference does not resolve to the exact artifact.");
  }
  return manifest;
}

export function compareBehaviorConfigurationManifests(left, right) {
  return compareConfigurationManifests(
    left,
    right,
    BEHAVIOR_KIND,
    "behavior_fingerprint",
    BEHAVIOR_COMPARISON
  );
}

export function compareEvaluationConfigurationManifests(left, right) {
  return compareConfigurationManifests(
    left,
    right,
    EVALUATION_KIND,
    "evaluation_fingerprint",
    EVALUATION_COMPARISON
  );
}

function compareConfigurationManifests(left, right, kind, payloadField, outcomes) {
  try {
    validateConfigurationManifest(left, kind);
    validateConfigurationManifest(right, kind);
  } catch {
    return outcomes.COMPARABILITY_UNRESOLVED;
  }
  if (left.schema_revision !== right.schema_revision
    || left.hash_domain !== right.hash_domain
    || left.manifest_hash_domain !== right.manifest_hash_domain) {
    return outcomes.COMPARABILITY_UNRESOLVED;
  }
  if (left[payloadField] !== right[payloadField]) {
    return kind === BEHAVIOR_KIND
      ? outcomes.BEHAVIOR_CONFIGURATION_CHANGED
      : outcomes.EVALUATION_CONFIGURATION_CHANGED;
  }
  if (left.manifest_artifact_fingerprint === right.manifest_artifact_fingerprint) {
    return outcomes.IDENTICAL;
  }
  return outcomes.METADATA_ONLY_DIFFERENCE;
}

function createConfigurationManifest(kind, input) {
  assertExactKeys(input, [
    "manifest_id",
    "identity_payload",
    "provenance",
    "created_at",
    "created_by"
  ], ["supersedes_manifest_ref", "annotations"], "configuration manifest input");
  validateIdentityPayload(kind, input.identity_payload);
  validateProvenance(input.provenance);
  assertOpaqueId(input.manifest_id, "configuration manifest input.manifest_id");
  validateCreatedAt(input.created_at);
  assertOpaqueId(input.created_by, "configuration manifest input.created_by");
  const supersedes = input.supersedes_manifest_ref ?? null;
  if (supersedes !== null) {
    validateConfigurationManifestReference(supersedes, { allowedKind: kind });
    if (supersedes.artifact_id === input.manifest_id) {
      throw new Error("A corrected manifest must use a new manifest_id.");
    }
  }
  if (Object.hasOwn(input, "annotations")) validateAnnotations(input.annotations);

  const payloadField = PAYLOAD_FINGERPRINT_FIELD[kind];
  const payloadFingerprint = fingerprintCanonicalJson(PAYLOAD_DOMAIN[kind], input.identity_payload);
  const assertion = {
    artifact_kind: kind,
    schema_id: ARTIFACT_KIND_SCHEMA[kind],
    schema_revision: 1,
    manifest_id: input.manifest_id,
    identity_payload: structuredClone(input.identity_payload),
    provenance: structuredClone(input.provenance),
    canonicalization_scheme: "RFC8785-JCS",
    canonicalization_revision: 1,
    hash_algorithm: "sha-256",
    hash_domain: PAYLOAD_DOMAIN[kind],
    [payloadField]: payloadFingerprint,
    manifest_hash_domain: MANIFEST_DOMAIN[kind],
    created_at: input.created_at,
    created_by: input.created_by,
    supersedes_manifest_ref: supersedes === null ? null : structuredClone(supersedes)
  };
  const manifest = {
    ...assertion,
    manifest_artifact_fingerprint: fingerprintCanonicalJson(MANIFEST_DOMAIN[kind], assertion)
  };
  if (Object.hasOwn(input, "annotations")) {
    manifest.annotations = structuredClone(input.annotations);
  }
  validateConfigurationManifest(manifest, kind);
  return deepFreeze(manifest);
}

function validateConfigurationManifest(manifest, expectedKind) {
  if (!CONFIGURATION_KINDS.includes(expectedKind)) {
    throw new Error("Configuration manifest expected kind is invalid.");
  }
  const payloadField = PAYLOAD_FINGERPRINT_FIELD[expectedKind];
  assertExactKeys(
    manifest,
    [...REQUIRED_MANIFEST_FIELDS, payloadField],
    ["annotations"],
    "configuration manifest"
  );
  if (manifest.artifact_kind !== expectedKind) {
    throw new Error(`Expected ${expectedKind} configuration manifest.`);
  }
  validateArtifactKindSchema(manifest.artifact_kind, manifest.schema_id);
  if (manifest.schema_revision !== 1 || manifest.canonicalization_scheme !== "RFC8785-JCS"
    || manifest.canonicalization_revision !== 1 || manifest.hash_algorithm !== "sha-256"
    || manifest.hash_domain !== PAYLOAD_DOMAIN[expectedKind]
    || manifest.manifest_hash_domain !== MANIFEST_DOMAIN[expectedKind]) {
    throw new Error("Configuration manifest hash/schema contract is invalid.");
  }
  assertOpaqueId(manifest.manifest_id, "configuration manifest.manifest_id");
  validateIdentityPayload(expectedKind, manifest.identity_payload);
  validateProvenance(manifest.provenance);
  validateCreatedAt(manifest.created_at);
  assertOpaqueId(manifest.created_by, "configuration manifest.created_by");
  assertSha256(manifest[payloadField], `configuration manifest.${payloadField}`);
  assertSha256(
    manifest.manifest_artifact_fingerprint,
    "configuration manifest.manifest_artifact_fingerprint"
  );
  if (manifest.supersedes_manifest_ref !== null) {
    validateConfigurationManifestReference(
      manifest.supersedes_manifest_ref,
      { allowedKind: expectedKind }
    );
    if (manifest.supersedes_manifest_ref.artifact_id === manifest.manifest_id) {
      throw new Error("Configuration manifest cannot supersede itself.");
    }
  }
  if (Object.hasOwn(manifest, "annotations")) validateAnnotations(manifest.annotations);

  const recomputedPayload = fingerprintCanonicalJson(
    PAYLOAD_DOMAIN[expectedKind], manifest.identity_payload
  );
  if (recomputedPayload !== manifest[payloadField]) {
    throw new Error("Configuration payload fingerprint mismatch.");
  }
  const assertion = {};
  for (const field of [...REQUIRED_MANIFEST_FIELDS, payloadField]) {
    if (field !== "manifest_artifact_fingerprint") assertion[field] = manifest[field];
  }
  const recomputedArtifact = fingerprintCanonicalJson(MANIFEST_DOMAIN[expectedKind], assertion);
  if (recomputedArtifact !== manifest.manifest_artifact_fingerprint) {
    throw new Error("Configuration manifest artifact fingerprint mismatch.");
  }
  return manifest;
}

function validateIdentityPayload(kind, payload) {
  if (kind === BEHAVIOR_KIND) return validateBehaviorIdentityPayload(payload);
  if (kind === EVALUATION_KIND) return validateEvaluationIdentityPayload(payload);
  throw new Error("Unsupported configuration identity payload kind.");
}

function validateBehaviorIdentityPayload(payload) {
  assertExactKeys(payload, [
    "sut_source_build",
    "public_boundary",
    "dependencies_runtime",
    "behavior_policy",
    "model",
    "prompt",
    "tool",
    "provider",
    "randomness",
    "artifact_custody"
  ], [], "behavior identity payload");
  validateSourceBuild(payload.sut_source_build, "SUT_SOURCE");
  validatePublicBoundary(payload.public_boundary);
  validateRuntime(payload.dependencies_runtime);
  validateBehaviorPolicy(payload.behavior_policy);
  for (const category of ["model", "prompt", "tool", "provider", "randomness"]) {
    validateApplicability(category, payload[category]);
  }
  validateCustodyList(payload.artifact_custody, "behavior identity payload.artifact_custody");
}

function validateEvaluationIdentityPayload(payload) {
  assertExactKeys(payload, [
    "evaluator_source_build",
    "dependencies_runtime",
    "fixture_oracle",
    "simulator",
    "artifact_schemas",
    "run_validity",
    "replacement_policy",
    "selection_policy",
    "deterministic_replay",
    "run_count_policy",
    "governing_basis",
    "behavior_affecting_environment",
    "artifact_custody"
  ], [], "evaluation identity payload");
  validateSourceBuild(payload.evaluator_source_build, "EVALUATOR_SOURCE");
  validateRuntime(payload.dependencies_runtime);
  validateFixtureOracle(payload.fixture_oracle);
  validateSimulator(payload.simulator);
  validateArtifactSchemas(payload.artifact_schemas);
  validateRunValidity(payload.run_validity);
  validateReplacementPolicy(payload.replacement_policy);
  validateSelectionPolicy(payload.selection_policy);
  validateDeterministicReplay(payload.deterministic_replay);
  validateRunCountPolicy(payload.run_count_policy);
  validateGoverningBasis(payload.governing_basis);
  validateEnvironmentEntries(payload.behavior_affecting_environment);
  validateCustodyList(payload.artifact_custody, "evaluation identity payload.artifact_custody");
}

function validateSourceBuild(value, expectedScope) {
  assertExactKeys(value, [
    "closure_schema",
    "closure_revision",
    "scope",
    "inclusion_rule",
    "exclusion_rule",
    "members",
    "shared_inputs",
    "package_projection",
    "dependency_closure",
    "build",
    "coverage"
  ], [], "source/build identity");
  if (value.closure_schema !== "zoey.closed-source-build-identity"
    || value.closure_revision !== 1 || value.scope !== expectedScope) {
    throw new Error("Source/build closure schema or scope is invalid.");
  }
  assertOpaqueId(value.inclusion_rule, "source/build inclusion_rule");
  assertOpaqueId(value.exclusion_rule, "source/build exclusion_rule");
  validateMemberIndex(value.members, "source/build members", { allowEmpty: false });
  validateMemberIndex(value.shared_inputs, "source/build shared_inputs", { allowEmpty: true });
  validateSourceScope(value.members, value.shared_inputs, expectedScope);
  validatePackageProjection(value.package_projection, expectedScope);
  validateDependencyClosure(value.dependency_closure, expectedScope);
  validateBuild(value.build);
  validateCoverage(value.coverage);
}

function validateMemberIndex(value, label, { allowEmpty }) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be a non-empty member index.`);
  }
  const paths = [];
  for (const member of value) {
    assertExactKeys(member, ["logical_path", "file_mode", "byte_digest"], [], label);
    validateLogicalPath(member.logical_path, `${label}.logical_path`);
    if (!/^[0-7]{6}$/.test(member.file_mode)) throw new Error(`${label}.file_mode is invalid.`);
    assertSha256(member.byte_digest, `${label}.byte_digest`);
    paths.push(member.logical_path);
  }
  assertSortedUniqueStrings(paths, `${label} logical paths`, { allowEmpty });
}

function validatePackageProjection(value, scope) {
  assertExactKeys(value, [
    "package_name",
    "package_version",
    "manifest_projection_digest",
    "field_paths"
  ], [], "package projection");
  assertPackageName(value.package_name, "package projection.package_name");
  assertStableRevision(value.package_version, "package projection.package_version");
  assertSha256(value.manifest_projection_digest, "package projection.manifest_projection_digest");
  assertSortedUniqueStrings(value.field_paths, "package projection.field_paths", { allowEmpty: false });
  const expectedPackage = scope === "SUT_SOURCE"
    ? "@zoey/scn001-sut-core"
    : "@zoey/scn001-eval";
  const expectedFields = scope === "SUT_SOURCE"
    ? ["exports", "name", "type", "version"]
    : ["dependencies", "name", "type", "version"];
  if (value.package_name !== expectedPackage
    || canonicalizeJson(value.field_paths) !== canonicalizeJson(expectedFields)) {
    throw new Error("Package projection does not match its closed source scope.");
  }
}

function validateDependencyClosure(value, scope) {
  assertExactKeys(value, ["graph_digest", "members"], [], "dependency closure");
  assertSha256(value.graph_digest, "dependency closure.graph_digest");
  if (!Array.isArray(value.members)) throw new Error("Dependency closure members must be an array.");
  const identities = [];
  for (const member of value.members) {
    assertExactKeys(member, [
      "package_name",
      "package_version",
      "source_identity",
      "artifact_digest",
      "dependencies"
    ], [], "dependency closure member");
    assertPackageName(member.package_name, "dependency member.package_name");
    assertStableRevision(member.package_version, "dependency member.package_version");
    assertOpaqueId(member.source_identity, "dependency member.source_identity");
    assertSha256(member.artifact_digest, "dependency member.artifact_digest");
    assertSortedUniqueStrings(member.dependencies, "dependency member.dependencies");
    identities.push(`${member.package_name}@${member.package_version}`);
  }
  assertSortedUniqueStrings(identities, "dependency closure member identities");
  if (scope === "SUT_SOURCE"
    && value.members.some((member) => member.package_name === "@zoey/scn001-eval")) {
    throw new Error("SUT dependency closure cannot depend on the evaluator package.");
  }
}

function validateBuild(value) {
  assertExactKeys(value, [
    "build_kind",
    "artifact_set_digest",
    "recipe_identity",
    "generated_assets"
  ], [], "build identity");
  if (!["DIRECT_EXECUTION", "BUILT_ARTIFACT"].includes(value.build_kind)) {
    throw new Error("build identity.build_kind is invalid.");
  }
  assertSha256(value.artifact_set_digest, "build identity.artifact_set_digest");
  assertOpaqueId(value.recipe_identity, "build identity.recipe_identity");
  validateMemberIndex(value.generated_assets, "build generated_assets", { allowEmpty: true });
}

function validateCoverage(value) {
  assertExactKeys(value, ["method", "status", "external_inputs"], [], "coverage declaration");
  if (value.method !== "CLOSED_MEMBER_INDEX_AND_DEPENDENCY_GRAPH" || value.status !== "COMPLETE") {
    throw new Error("Source/build coverage must be complete under the closed method.");
  }
  validateCustodyList(value.external_inputs, "coverage external_inputs");
}

function validatePublicBoundary(value) {
  assertExactKeys(value, [
    "package_name",
    "entry_point",
    "exports",
    "input_contract_digest",
    "output_contract_digest",
    "lifecycle_contract_digest",
    "inspection_contract_digest",
    "feature_flags"
  ], [], "public boundary identity");
  assertPackageName(value.package_name, "public boundary.package_name");
  validateLogicalPath(value.entry_point, "public boundary.entry_point");
  assertSortedUniqueStrings(value.exports, "public boundary.exports", { allowEmpty: false });
  for (const field of [
    "input_contract_digest",
    "output_contract_digest",
    "lifecycle_contract_digest",
    "inspection_contract_digest"
  ]) assertSha256(value[field], `public boundary.${field}`);
  assertPlainObject(value.feature_flags, "public boundary.feature_flags");
  canonicalizeJson(value.feature_flags);
}

function validateRuntime(value) {
  assertExactKeys(value, [
    "runtime_name",
    "runtime_version",
    "implementation",
    "operating_system",
    "architecture",
    "toolchain_identity",
    "environment",
    "locale",
    "timezone",
    "clock_mode",
    "numeric_mode"
  ], [], "dependency/runtime identity");
  for (const field of [
    "runtime_name",
    "runtime_version",
    "implementation",
    "operating_system",
    "architecture",
    "toolchain_identity",
    "locale",
    "timezone",
    "clock_mode",
    "numeric_mode"
  ]) assertNonemptyString(value[field], `dependency/runtime identity.${field}`);
  assertStableRevision(value.runtime_version, "dependency/runtime identity.runtime_version");
  validateEnvironmentEntries(value.environment);
}

function validateEnvironmentEntries(value) {
  if (!Array.isArray(value)) throw new Error("Environment identity must be an array.");
  const names = [];
  for (const entry of value) {
    assertExactKeys(entry, ["name", "value_kind", "canonical_value", "content_digest"], [], "environment entry");
    assertOpaqueId(entry.name, "environment entry.name");
    if (entry.value_kind === "PUBLIC_VALUE") {
      assertNonemptyString(entry.canonical_value, "environment entry.canonical_value");
      if (entry.content_digest !== null) throw new Error("Public environment value cannot duplicate a digest.");
    } else if (entry.value_kind === "CONTENT_DIGEST") {
      if (entry.canonical_value !== null) throw new Error("Digested environment value cannot be embedded.");
      assertSha256(entry.content_digest, "environment entry.content_digest");
    } else {
      throw new Error("Environment entry.value_kind is invalid.");
    }
    names.push(entry.name);
  }
  assertSortedUniqueStrings(names, "environment entry names");
}

function validateBehaviorPolicy(value) {
  assertExactKeys(value, [
    "policy_id",
    "policy_revision",
    "policy_digest",
    "external_configurations"
  ], [], "behavior policy identity");
  assertOpaqueId(value.policy_id, "behavior policy.policy_id");
  assertStableRevision(value.policy_revision, "behavior policy.policy_revision");
  assertSha256(value.policy_digest, "behavior policy.policy_digest");
  validateCustodyList(value.external_configurations, "behavior policy.external_configurations");
}

function validateApplicability(category, value) {
  assertExactKeys(value, [
    "applicability",
    "reason_code",
    "identity_fields",
    "custody_ref",
    "content_digest",
    "unknown_fields"
  ], [], `${category} applicability`);
  assertPlainObject(value.identity_fields, `${category} applicability.identity_fields`);
  assertSortedUniqueStrings(value.unknown_fields, `${category} applicability.unknown_fields`);
  if (value.applicability === "not_applicable") {
    if (!NOT_APPLICABLE_REASONS[category].includes(value.reason_code)
      || Object.keys(value.identity_fields).length !== 0 || value.custody_ref !== null
      || value.content_digest !== null || value.unknown_fields.length !== 0) {
      throw new Error(`${category} not_applicable declaration is invalid.`);
    }
    return;
  }
  if (value.applicability === "unknown") {
    throw new Error(`${category} identity cannot be unknown in an authorizable manifest.`);
  }
  if (value.applicability !== "applicable" || value.reason_code !== null
    || value.unknown_fields.length !== 0) {
    throw new Error(`${category} applicability declaration is invalid.`);
  }
  validateApplicableIdentity(category, value.identity_fields);
  if (category === "prompt" && value.custody_ref === null) {
    throw new Error("Applicable prompt content requires an exact custody reference and digest.");
  }
  if ((value.custody_ref === null) !== (value.content_digest === null)) {
    throw new Error(`${category} custody_ref and content_digest must be populated together.`);
  }
  if (value.custody_ref !== null) {
    validateCustodyReference(value.custody_ref, `${category} applicability.custody_ref`);
    assertSha256(value.content_digest, `${category} applicability.content_digest`);
  }
}

function validateApplicableIdentity(category, value) {
  const validators = {
    model: () => {
      assertExactKeys(value, [
        "provider_runtime",
        "model_id",
        "stable_revision",
        "decoding_parameters",
        "adapters",
        "serving_configuration"
      ], [], "model identity_fields");
      for (const field of ["provider_runtime", "model_id", "stable_revision"]) {
        assertNonemptyString(value[field], `model identity_fields.${field}`);
      }
      assertStableRevision(value.stable_revision, "model identity_fields.stable_revision");
      canonicalizeJson(value.decoding_parameters);
      validateCustodyList(value.adapters, "model identity_fields.adapters");
      canonicalizeJson(value.serving_configuration);
    },
    prompt: () => {
      assertExactKeys(value, [
        "template_id",
        "content_fingerprint",
        "composition_order",
        "variable_binding_policy"
      ], [], "prompt identity_fields");
      assertOpaqueId(value.template_id, "prompt identity_fields.template_id");
      assertSha256(value.content_fingerprint, "prompt identity_fields.content_fingerprint");
      assertUniqueStrings(value.composition_order, "prompt identity_fields.composition_order", { allowEmpty: false });
      assertOpaqueId(value.variable_binding_policy, "prompt identity_fields.variable_binding_policy");
    },
    tool: () => validateNamedRevisionEntries(value, "tools", "tool identity_fields"),
    provider: () => validateNamedRevisionEntries(value, "providers", "provider identity_fields"),
    randomness: () => {
      assertExactKeys(value, ["mode", "seed_policy", "generator", "generator_revision"], [], "randomness identity_fields");
      for (const field of ["mode", "seed_policy", "generator", "generator_revision"]) {
        assertNonemptyString(value[field], `randomness identity_fields.${field}`);
      }
    }
  };
  validators[category]();
}

function validateNamedRevisionEntries(value, collectionField, label) {
  assertExactKeys(value, [collectionField], [], label);
  if (!Array.isArray(value[collectionField]) || value[collectionField].length === 0) {
    throw new Error(`${label}.${collectionField} must be non-empty.`);
  }
  const ids = [];
  for (const entry of value[collectionField]) {
    assertExactKeys(entry, ["id", "revision", "configuration_digest"], [], `${label} entry`);
    assertOpaqueId(entry.id, `${label} entry.id`);
    assertStableRevision(entry.revision, `${label} entry.revision`);
    assertSha256(entry.configuration_digest, `${label} entry.configuration_digest`);
    ids.push(entry.id);
  }
  assertSortedUniqueStrings(ids, `${label} entry ids`, { allowEmpty: false });
}

function validateFixtureOracle(value) {
  assertExactKeys(value, [
    "package_id",
    "package_revision",
    "required_paths",
    "claim_classes",
    "bundle_digest",
    "branch_policy_digest",
    "completeness_declaration_digest",
    "checkpoint_contract_digest",
    "oracle_rule_catalogue_digest",
    "claim_obligation_map_digest"
  ], [], "fixture/oracle identity");
  if (value.package_id !== "SCN001-SSFO-V0.2.0" || value.package_revision !== "V0.2.0") {
    throw new Error("Fixture/oracle identity must use the accepted V0.2.0 package.");
  }
  assertSortedUniqueStrings(value.required_paths, "fixture/oracle.required_paths", { allowEmpty: false });
  assertSortedUniqueStrings(value.claim_classes, "fixture/oracle.claim_classes", { allowEmpty: false });
  if (canonicalizeJson(value.required_paths) !== canonicalizeJson(REQUIRED_FIXTURE_PATHS)
    || canonicalizeJson(value.claim_classes) !== canonicalizeJson(REQUIRED_CLAIM_CLASSES)) {
    throw new Error("Fixture/oracle required path or claim-class closure is incomplete.");
  }
  for (const field of [
    "bundle_digest",
    "branch_policy_digest",
    "completeness_declaration_digest",
    "checkpoint_contract_digest",
    "oracle_rule_catalogue_digest",
    "claim_obligation_map_digest"
  ]) assertSha256(value[field], `fixture/oracle.${field}`);
}

function validateSimulator(value) {
  assertExactKeys(value, [
    "source_digest",
    "configuration_digest",
    "realization_grammar_digest"
  ], [], "simulator identity");
  for (const field of Object.keys(value)) assertSha256(value[field], `simulator.${field}`);
}

function validateArtifactSchemas(value) {
  const fields = [
    "behavior_configuration_manifest",
    "evaluation_configuration_manifest",
    "deterministic_qualification_plan",
    "deterministic_qualification_result",
    "campaign_authorization",
    "formal_run_record",
    "formal_evidence_artifact",
    "evaluation_decision",
    "bounded_campaign_result",
    "campaign_evidence_index",
    "authority_namespace_index"
  ];
  assertExactKeys(value, fields, [], "artifact schema revisions");
  if (fields.some((field) => value[field] !== 1)) {
    throw new Error("All V1 formal artifact schema revisions must be 1.");
  }
}

function validateRunValidity(value) {
  assertExactKeys(value, ["criteria_digest", "invalidity_reason_catalogue_digest"], [], "run validity policy");
  assertSha256(value.criteria_digest, "run validity.criteria_digest");
  assertSha256(value.invalidity_reason_catalogue_digest, "run validity.invalidity_reason_catalogue_digest");
}

function validateReplacementPolicy(value) {
  assertExactKeys(value, [
    "invalid_attempt_limit_per_path",
    "replacement_rule_digest",
    "stop_review_policy_digest"
  ], [], "replacement policy");
  if (value.invalid_attempt_limit_per_path !== 2) {
    throw new Error("Replacement limit must be the accepted two-per-path cap.");
  }
  assertSha256(value.replacement_rule_digest, "replacement policy.replacement_rule_digest");
  assertSha256(value.stop_review_policy_digest, "replacement policy.stop_review_policy_digest");
}

function validateSelectionPolicy(value) {
  assertExactKeys(value, ["method_id", "method_revision", "method_digest"], [], "selection policy");
  assertOpaqueId(value.method_id, "selection policy.method_id");
  assertNonemptyString(value.method_revision, "selection policy.method_revision");
  assertSha256(value.method_digest, "selection policy.method_digest");
}

function validateDeterministicReplay(value) {
  assertExactKeys(value, [
    "mode",
    "profile_id",
    "profile_revision",
    "comparator_fingerprint",
    "normalization_rules_digest",
    "exclusion_rules_digest"
  ], [], "deterministic replay policy");
  if (value.mode === "QUALIFICATION_SUPPORTED") {
    if (value.profile_id !== "DEQ-SCN001-V1" || value.profile_revision !== "1") {
      throw new Error("Deterministic replay must use the accepted DEQ-SCN001-V1 profile.");
    }
    for (const field of [
      "comparator_fingerprint",
      "normalization_rules_digest",
      "exclusion_rules_digest"
    ]) assertSha256(value[field], `deterministic replay.${field}`);
    return;
  }
  if (value.mode !== "EXPLICITLY_NONDETERMINISTIC"
    || [
      value.profile_id,
      value.profile_revision,
      value.comparator_fingerprint,
      value.normalization_rules_digest,
      value.exclusion_rules_digest
    ].some((entry) => entry !== null)) {
    throw new Error("Deterministic replay declaration is invalid.");
  }
}

function validateRunCountPolicy(value) {
  assertExactKeys(value, [
    "qualified_runs_per_path",
    "not_qualified_runs_per_path",
    "inconclusive_runs_per_path",
    "nondeterministic_runs_per_path",
    "divergence_contingency"
  ], [], "run-count policy");
  if (value.qualified_runs_per_path !== 1 || value.not_qualified_runs_per_path !== 3
    || value.inconclusive_runs_per_path !== 3 || value.nondeterministic_runs_per_path !== 3
    || value.divergence_contingency !== "PREALLOCATE_OR_SUPERSEDE") {
    throw new Error("Run-count policy does not match the accepted V1 policy.");
  }
}

function validateGoverningBasis(value) {
  assertExactKeys(value, ["documents"], [], "governing basis");
  if (!Array.isArray(value.documents) || value.documents.length === 0) {
    throw new Error("Governing basis documents must be non-empty.");
  }
  const ids = [];
  for (const document of value.documents) {
    assertExactKeys(document, ["document_id", "revision", "content_digest"], [], "governing basis document");
    assertOpaqueId(document.document_id, "governing basis.document_id");
    assertNonemptyString(document.revision, "governing basis.revision");
    assertSha256(document.content_digest, "governing basis.content_digest");
    ids.push(document.document_id);
  }
  assertSortedUniqueStrings(ids, "governing basis document ids", { allowEmpty: false });
  if (canonicalizeJson(ids) !== canonicalizeJson(REQUIRED_GOVERNING_DOCUMENTS)) {
    throw new Error("Governing basis does not close every required V1 document family.");
  }
}

function validateCustodyList(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  const ids = [];
  for (const reference of value) {
    validateCustodyReference(reference, `${label} reference`);
    ids.push(reference.custody_id);
  }
  assertSortedUniqueStrings(ids, `${label} custody ids`);
}

function validateCustodyReference(value, label) {
  assertExactKeys(value, ["custody_kind", "custody_id", "content_digest"], [], label);
  if (!CUSTODY_KINDS.includes(value.custody_kind)) throw new Error(`${label}.custody_kind is invalid.`);
  assertOpaqueId(value.custody_id, `${label}.custody_id`);
  assertSha256(value.content_digest, `${label}.content_digest`);
}

function validateProvenance(value) {
  assertExactKeys(value, [
    "repository_identity",
    "repository_role",
    "source_commit",
    "root_package_digest",
    "root_lock_digest",
    "worktree_state",
    "reconstruction"
  ], [], "manifest provenance");
  assertOpaqueId(value.repository_identity, "manifest provenance.repository_identity");
  if (value.repository_role !== "governed_workbench") {
    throw new Error("Manifest provenance.repository_role is invalid.");
  }
  if (!/^[0-9a-f]{40}$/.test(value.source_commit)) {
    throw new Error("Manifest provenance.source_commit must be a full commit ID.");
  }
  assertSha256(value.root_package_digest, "manifest provenance.root_package_digest");
  assertSha256(value.root_lock_digest, "manifest provenance.root_lock_digest");
  assertExactKeys(value.reconstruction, [
    "method",
    "command",
    "source_bundle_digest"
  ], [], "manifest provenance.reconstruction");
  if (value.worktree_state === "clean") {
    if (value.reconstruction.method !== "command" || value.reconstruction.command === null
      || value.reconstruction.source_bundle_digest !== null) {
      throw new Error("Clean provenance requires a reconstruction command and no patch bundle.");
    }
    assertNonemptyString(value.reconstruction.command, "manifest provenance.reconstruction.command");
    return;
  }
  if (value.worktree_state !== "reconstructable_patch"
    || value.reconstruction.method !== "source_bundle"
    || value.reconstruction.command !== null) {
    throw new Error("Dirty provenance requires an immutable source bundle.");
  }
  assertSha256(
    value.reconstruction.source_bundle_digest,
    "manifest provenance.reconstruction.source_bundle_digest"
  );
}

function validateCreatedAt(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw new Error("created_at must be an RFC3339 UTC instant with second precision.");
  }
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()) || date.toISOString().replace(".000Z", "Z") !== value) {
    throw new Error("created_at is not a valid UTC instant.");
  }
}

function validateLogicalPath(value, label) {
  assertNonemptyString(value, label);
  if (value.startsWith("/") || value.includes("\\")
    || value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`${label} must be a repository-relative normalized logical path.`);
  }
}

function validateSourceScope(members, sharedInputs, scope) {
  const memberPaths = members.map((member) => member.logical_path);
  const sharedPaths = sharedInputs.map((member) => member.logical_path);
  if (sharedPaths.some((path) => memberPaths.includes(path))) {
    throw new Error("Source members and shared inputs cannot overlap.");
  }
  const root = scope === "SUT_SOURCE" ? "scn001_sut_core/" : "scn001_eval/";
  if (memberPaths.some((path) => !path.startsWith(root))) {
    throw new Error(`${scope} member index escapes its owned source root.`);
  }
  if (scope === "SUT_SOURCE" && sharedPaths.some((path) => (
    path.startsWith("scn001_eval/") || path.startsWith("governance/")
      || path.startsWith("tests/") || path.startsWith(".github/")
  ))) {
    throw new Error("SUT shared identity cannot absorb evaluator or governance-only material.");
  }
}

function validateAnnotations(value) {
  assertPlainObject(value, "configuration manifest.annotations");
  canonicalizeJson(value);
}

function assertPackageName(value, label) {
  assertNonemptyString(value, label);
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw new Error(`${label} must be an exact package name.`);
  }
}

function assertStableRevision(value, label) {
  assertNonemptyString(value, label);
  if (/^(?:latest|current|default|stable|main|master|head)$/i.test(value)) {
    throw new Error(`${label} cannot be a mutable alias.`);
  }
}

function assertUniqueStrings(values, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)
    || values.some((value) => typeof value !== "string" || value.length === 0
      || !value.isWellFormed())
    || new Set(values).size !== values.length) {
    throw new Error(`${label} must be an ordered unique string array.`);
  }
}
