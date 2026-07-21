import assert from "node:assert/strict";
import test from "node:test";

import {
  BEHAVIOR_COMPARISON,
  EVALUATION_COMPARISON,
  compareBehaviorConfigurationManifests,
  compareEvaluationConfigurationManifests,
  createBehaviorConfigurationManifest,
  createConfigurationManifestReference,
  createEvaluationConfigurationManifest,
  resolveConfigurationManifestReference,
  validateBehaviorConfigurationManifest,
  validateConfigurationManifestReference,
  validateEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import {
  ARTIFACT_KIND_SCHEMA,
  canonicalizeJson,
  fingerprintCanonicalJson,
  validateArtifactKindSchema,
  validateExactArtifactReference
} from "../src/formalArtifactIdentity.js";

const digest = (character) => `sha256:${character.repeat(64)}`;

test("RFC8785 canonicalization is stable, domain-separated, and rejects non-JSON inputs", () => {
  const left = { z: -0, a: { y: true, x: "value" }, list: [3, 2, 1] };
  const right = { list: [3, 2, 1], a: { x: "value", y: true }, z: 0 };
  assert.equal(
    canonicalizeJson(left),
    '{"a":{"x":"value","y":true},"list":[3,2,1],"z":0}'
  );
  assert.equal(canonicalizeJson(left), canonicalizeJson(right));
  assert.notEqual(
    fingerprintCanonicalJson("zoey:one:v1", left),
    fingerprintCanonicalJson("zoey:two:v1", left)
  );
  assert.throws(() => canonicalizeJson({ number: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalizeJson({ missing: undefined }), /outside the RFC8785/);
  assert.throws(() => canonicalizeJson({ text: "\ud800" }), /unpaired Unicode/);
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => canonicalizeJson(sparse), /sparse array/);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalizeJson(cyclic), /cycle/);
  const accessor = {};
  Object.defineProperty(accessor, "unstable", { enumerable: true, get: () => "value" });
  assert.throws(() => canonicalizeJson(accessor), /enumerable data property/);
  const decoratedArray = [1];
  decoratedArray.alias = 1;
  assert.throws(() => canonicalizeJson(decoratedArray), /non-index array properties/);
});

test("artifact vocabulary and generic references are exact and closed", () => {
  assert.equal(
    ARTIFACT_KIND_SCHEMA.BEHAVIOR_CONFIGURATION_MANIFEST,
    "zoey.behavior-configuration-manifest"
  );
  assert.doesNotThrow(() => validateArtifactKindSchema(
    "CAMPAIGN_AUTHORIZATION", "zoey.campaign-authorization"
  ));
  assert.throws(
    () => validateArtifactKindSchema("CAMPAIGN_AUTHORIZATION", "zoey.formal-run-record"),
    /mapping is invalid/
  );
  assert.throws(
    () => validateArtifactKindSchema("FAVORABLE_ALIAS", "zoey.campaign-authorization"),
    /Unknown artifact_kind/
  );
  const reference = {
    artifact_id: "artifact:qualification-plan:001",
    artifact_kind: "DETERMINISTIC_QUALIFICATION_PLAN",
    schema_id: "zoey.deterministic-qualification-plan",
    schema_revision: 1,
    content_fingerprint: digest("a")
  };
  assert.equal(validateExactArtifactReference(reference), reference);
  assert.throws(
    () => validateExactArtifactReference({ ...reference, schema_revision: 2 }),
    /schema_revision must be 1/
  );
  const { schema_id: omitted, ...idOnly } = reference;
  assert.equal(omitted, "zoey.deterministic-qualification-plan");
  assert.throws(() => validateExactArtifactReference(idOnly), /missing=\[schema_id\]/);
});

test("behavior manifest closes payload, provenance, fingerprints, and exact reference", () => {
  const manifest = createBehaviorConfigurationManifest(behaviorManifestInput());
  assert.equal(validateBehaviorConfigurationManifest(manifest), manifest);
  assert.equal(manifest.artifact_kind, "BEHAVIOR_CONFIGURATION_MANIFEST");
  assert.match(manifest.behavior_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.match(manifest.manifest_artifact_fingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(manifest.behavior_fingerprint, manifest.manifest_artifact_fingerprint);
  assert(Object.isFrozen(manifest));
  assert(Object.isFrozen(manifest.identity_payload));

  const reference = createConfigurationManifestReference(manifest);
  assert.equal(validateConfigurationManifestReference(reference), reference);
  assert.deepEqual(reference, {
    artifact_id: manifest.manifest_id,
    artifact_kind: manifest.artifact_kind,
    schema_id: manifest.schema_id,
    schema_revision: 1,
    content_fingerprint: manifest.manifest_artifact_fingerprint,
    behavior_fingerprint: manifest.behavior_fingerprint,
    manifest_artifact_fingerprint: manifest.manifest_artifact_fingerprint
  });
  assert(Object.isFrozen(reference));
  assert.equal(resolveConfigurationManifestReference(reference, manifest), manifest);
});

test("evaluation manifest has independent identity and the closed evaluation schema", () => {
  const manifest = createEvaluationConfigurationManifest(evaluationManifestInput());
  assert.equal(validateEvaluationConfigurationManifest(manifest), manifest);
  assert.equal(manifest.artifact_kind, "EVALUATION_CONFIGURATION_MANIFEST");
  assert.equal(manifest.schema_id, "zoey.evaluation-configuration-manifest");
  assert.notEqual(manifest.evaluation_fingerprint, manifest.manifest_artifact_fingerprint);
  const reference = createConfigurationManifestReference(manifest);
  assert.deepEqual(Object.keys(reference), [
    "artifact_id",
    "artifact_kind",
    "schema_id",
    "schema_revision",
    "content_fingerprint",
    "evaluation_fingerprint",
    "manifest_artifact_fingerprint"
  ]);
  assert.equal(reference.content_fingerprint, reference.manifest_artifact_fingerprint);
  const changedInput = evaluationManifestInput();
  changedInput.manifest_id = "manifest:evaluation:002";
  changedInput.identity_payload.simulator.configuration_digest = digest("0");
  const changed = createEvaluationConfigurationManifest(changedInput);
  assert.equal(
    compareEvaluationConfigurationManifests(manifest, changed),
    EVALUATION_COMPARISON.EVALUATION_CONFIGURATION_CHANGED
  );
});

test("canonical fingerprints ignore property insertion order but bind every identity field", () => {
  const input = behaviorManifestInput();
  const reordered = {
    ...input,
    identity_payload: Object.fromEntries(Object.entries(input.identity_payload).reverse())
  };
  const first = createBehaviorConfigurationManifest(input);
  const second = createBehaviorConfigurationManifest({
    ...reordered,
    manifest_id: "manifest:behavior:002"
  });
  assert.equal(first.behavior_fingerprint, second.behavior_fingerprint);
  assert.notEqual(first.manifest_artifact_fingerprint, second.manifest_artifact_fingerprint);

  const changedInput = behaviorManifestInput();
  changedInput.identity_payload.sut_source_build.members[0].byte_digest = digest("f");
  const changed = createBehaviorConfigurationManifest({
    ...changedInput,
    manifest_id: "manifest:behavior:003"
  });
  assert.notEqual(first.behavior_fingerprint, changed.behavior_fingerprint);
  assert.equal(
    compareBehaviorConfigurationManifests(first, changed),
    BEHAVIOR_COMPARISON.BEHAVIOR_CONFIGURATION_CHANGED
  );
});

test("manifest comparison separates identity, metadata-only differences, and unresolved input", () => {
  const first = createBehaviorConfigurationManifest(behaviorManifestInput());
  assert.equal(
    compareBehaviorConfigurationManifests(first, first),
    BEHAVIOR_COMPARISON.IDENTICAL
  );
  const secondInput = behaviorManifestInput();
  secondInput.manifest_id = "manifest:behavior:metadata-correction";
  secondInput.created_at = "2026-07-21T10:01:00Z";
  secondInput.provenance.source_commit = "b".repeat(40);
  const second = createBehaviorConfigurationManifest(secondInput);
  assert.equal(first.behavior_fingerprint, second.behavior_fingerprint);
  assert.equal(
    compareBehaviorConfigurationManifests(first, second),
    BEHAVIOR_COMPARISON.METADATA_ONLY_DIFFERENCE
  );
  const conflictingAliasInput = behaviorManifestInput();
  conflictingAliasInput.created_at = "2026-07-21T10:02:00Z";
  conflictingAliasInput.provenance.source_commit = "c".repeat(40);
  const conflictingAlias = createBehaviorConfigurationManifest(conflictingAliasInput);
  assert.equal(first.manifest_id, conflictingAlias.manifest_id);
  assert.equal(
    compareBehaviorConfigurationManifests(first, conflictingAlias),
    BEHAVIOR_COMPARISON.COMPARABILITY_UNRESOLVED
  );
  const malformed = structuredClone(first);
  malformed.behavior_fingerprint = digest("0");
  assert.equal(
    compareBehaviorConfigurationManifests(first, malformed),
    BEHAVIOR_COMPARISON.COMPARABILITY_UNRESOLVED
  );
});

test("manifest correction requires a new ID and exact immutable predecessor reference", () => {
  const predecessor = createBehaviorConfigurationManifest(behaviorManifestInput());
  const predecessorReference = createConfigurationManifestReference(predecessor);
  const correctionInput = behaviorManifestInput();
  correctionInput.manifest_id = "manifest:behavior:correction:001";
  correctionInput.supersedes_manifest_ref = predecessorReference;
  const correction = createBehaviorConfigurationManifest(correctionInput);
  assert.equal(correction.behavior_fingerprint, predecessor.behavior_fingerprint);
  assert.notEqual(
    correction.manifest_artifact_fingerprint,
    predecessor.manifest_artifact_fingerprint
  );
  assert.deepEqual(correction.supersedes_manifest_ref, predecessorReference);

  const selfCorrection = behaviorManifestInput();
  selfCorrection.supersedes_manifest_ref = predecessorReference;
  assert.throws(
    () => createBehaviorConfigurationManifest(selfCorrection),
    /must use a new manifest_id/
  );
  const idOnly = { artifact_id: predecessor.manifest_id };
  const malformedCorrection = behaviorManifestInput();
  malformedCorrection.manifest_id = "manifest:behavior:correction:002";
  malformedCorrection.supersedes_manifest_ref = idOnly;
  assert.throws(
    () => createBehaviorConfigurationManifest(malformedCorrection),
    /invalid artifact_kind|plain object/
  );
});

test("tampering with payload, provenance, hash metadata, or lineage fails closed", () => {
  const manifest = createBehaviorConfigurationManifest(behaviorManifestInput());
  for (const mutate of [
    (copy) => { copy.identity_payload.public_boundary.entry_point = "other/index.js"; },
    (copy) => { copy.provenance.source_commit = "c".repeat(40); },
    (copy) => { copy.hash_domain = "zoey:other:v1"; },
    (copy) => { copy.created_by = "actor:other"; },
    (copy) => { copy.manifest_artifact_fingerprint = digest("d"); }
  ]) {
    const copy = structuredClone(manifest);
    mutate(copy);
    assert.throws(() => validateBehaviorConfigurationManifest(copy));
  }
  const annotationOnly = structuredClone(manifest);
  annotationOnly.annotations = { reviewer_note: "non-semantic" };
  assert.equal(validateBehaviorConfigurationManifest(annotationOnly), annotationOnly);
});

test("formal configuration validation rejects unknown, hidden, unordered, and mutable identities", () => {
  const unknown = behaviorManifestInput();
  unknown.identity_payload.model = {
    applicability: "unknown",
    reason_code: "identity_not_obtainable",
    identity_fields: {},
    custody_ref: null,
    content_digest: null,
    unknown_fields: ["stable_revision"]
  };
  assert.throws(
    () => createBehaviorConfigurationManifest(unknown),
    /cannot be unknown/
  );

  const hidden = behaviorManifestInput();
  hidden.identity_payload.behavior_affecting_secret = digest("a");
  assert.throws(
    () => createBehaviorConfigurationManifest(hidden),
    /extra=\[behavior_affecting_secret\]/
  );

  const unordered = behaviorManifestInput();
  unordered.identity_payload.sut_source_build.members.reverse();
  assert.throws(
    () => createBehaviorConfigurationManifest(unordered),
    /sorted unique string array/
  );

  const mutableAlias = behaviorManifestInput();
  mutableAlias.identity_payload.model = {
    applicability: "applicable",
    reason_code: null,
    identity_fields: {
      provider_runtime: "provider:runtime",
      model_id: "model:mutable-latest",
      stable_revision: "latest",
      decoding_parameters: {},
      adapters: [],
      serving_configuration: {}
    },
    custody_ref: null,
    content_digest: null,
    unknown_fields: []
  };
  assert.throws(
    () => createBehaviorConfigurationManifest(mutableAlias),
    /cannot be a mutable alias/
  );

  const evaluatorLeak = behaviorManifestInput();
  evaluatorLeak.identity_payload.sut_source_build.members[0].logical_path =
    "scn001_eval/src/harness.js";
  assert.throws(
    () => createBehaviorConfigurationManifest(evaluatorLeak),
    /escapes its owned source root/
  );

  const wrongProjection = behaviorManifestInput();
  wrongProjection.identity_payload.sut_source_build.package_projection.field_paths = [
    "dependencies", "name", "type", "version"
  ];
  assert.throws(
    () => createBehaviorConfigurationManifest(wrongProjection),
    /does not match its closed source scope/
  );
});

test("configuration references reject aliases, wrong domains, and favorable retargeting", () => {
  const behavior = createBehaviorConfigurationManifest(behaviorManifestInput());
  const reference = structuredClone(createConfigurationManifestReference(behavior));
  reference.schema_id = "zoey.evaluation-configuration-manifest";
  assert.throws(
    () => validateConfigurationManifestReference(reference),
    /mapping is invalid/
  );

  const wrongContent = structuredClone(createConfigurationManifestReference(behavior));
  wrongContent.content_fingerprint = digest("e");
  assert.throws(
    () => validateConfigurationManifestReference(wrongContent),
    /must equal manifest identity/
  );

  const evaluation = createEvaluationConfigurationManifest(evaluationManifestInput());
  assert.throws(
    () => validateConfigurationManifestReference(
      createConfigurationManifestReference(evaluation),
      { allowedKind: "BEHAVIOR_CONFIGURATION_MANIFEST" }
    ),
    /invalid artifact_kind/
  );
  const otherInput = behaviorManifestInput();
  otherInput.manifest_id = "manifest:behavior:other";
  const other = createBehaviorConfigurationManifest(otherInput);
  assert.throws(
    () => resolveConfigurationManifestReference(
      createConfigurationManifestReference(behavior), other
    ),
    /does not resolve to the exact artifact/
  );
});

function behaviorManifestInput() {
  return {
    manifest_id: "manifest:behavior:001",
    identity_payload: {
      sut_source_build: sourceBuild("SUT_SOURCE", [
        member("scn001_sut_core/index.js", "1"),
        member("scn001_sut_core/src/publicBoundary.js", "2")
      ]),
      public_boundary: {
      package_name: "@zoey/scn001-sut-core",
        entry_point: "scn001_sut_core/index.js",
        exports: ["createSutBoundary"],
        input_contract_digest: digest("3"),
        output_contract_digest: digest("4"),
        lifecycle_contract_digest: digest("5"),
        inspection_contract_digest: digest("6"),
        feature_flags: {}
      },
      dependencies_runtime: runtimeIdentity(),
      behavior_policy: {
        policy_id: "policy:scn001-selected-slice",
        policy_revision: "R1",
        policy_digest: digest("7"),
        external_configurations: []
      },
      model: notApplicable("deterministic_non_model_sut"),
      prompt: notApplicable("deterministic_non_model_sut"),
      tool: notApplicable("no_behavior_affecting_tool"),
      provider: notApplicable("no_external_provider"),
      randomness: notApplicable("no_runtime_randomness"),
      artifact_custody: []
    },
    provenance: provenance(),
    created_at: "2026-07-21T10:00:00Z",
    created_by: "actor:zoey-evaluation-builder",
    annotations: { purpose: "configuration identity contract test" }
  };
}

function evaluationManifestInput() {
  return {
    manifest_id: "manifest:evaluation:001",
    identity_payload: {
      evaluator_source_build: sourceBuild("EVALUATOR_SOURCE", [
        member("scn001_eval/src/configurationIdentity.js", "8"),
        member("scn001_eval/src/harness.js", "9")
      ]),
      dependencies_runtime: runtimeIdentity(),
      fixture_oracle: {
        package_id: "SCN001-SSFO-V0.2.0",
        package_revision: "V0.2.0",
        required_paths: [
          "SCN001-SSFO-V0.2.0-CANONICAL-THIN",
          "SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT",
          "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN",
          "SCN001-SSFO-V0.2.0-CF-RECENT-BASIS"
        ],
        claim_classes: [
          "CC-EVIDENCE-TRIAL-FORMATION",
          "CC-EXPLANATION-PROVENANCE",
          "CC-OUTCOME-SEMANTICS",
          "CC-SCOPE-TRIAL-USE",
          "CC-TIME-STALE-BASIS"
        ],
        bundle_digest: digest("a"),
        branch_policy_digest: digest("b"),
        completeness_declaration_digest: digest("c"),
        checkpoint_contract_digest: digest("d"),
        oracle_rule_catalogue_digest: digest("e"),
        claim_obligation_map_digest: digest("f")
      },
      simulator: {
        source_digest: digest("1"),
        configuration_digest: digest("2"),
        realization_grammar_digest: digest("3")
      },
      artifact_schemas: {
        behavior_configuration_manifest: 1,
        evaluation_configuration_manifest: 1,
        deterministic_qualification_plan: 1,
        deterministic_qualification_result: 1,
        campaign_authorization: 1,
        formal_run_record: 1,
        formal_evidence_artifact: 1,
        evaluation_decision: 1,
        bounded_campaign_result: 1,
        campaign_evidence_index: 1,
        authority_namespace_index: 1
      },
      run_validity: {
        criteria_digest: digest("4"),
        invalidity_reason_catalogue_digest: digest("5")
      },
      replacement_policy: {
        invalid_attempt_limit_per_path: 2,
        replacement_rule_digest: digest("6"),
        stop_review_policy_digest: digest("7")
      },
      selection_policy: {
        method_id: "selection:outcome-independent-v1",
        method_revision: "1",
        method_digest: digest("8")
      },
      deterministic_replay: {
        mode: "QUALIFICATION_SUPPORTED",
        profile_id: "DEQ-SCN001-V1",
        profile_revision: "1",
        comparator_fingerprint: digest("9"),
        normalization_rules_digest: digest("a"),
        exclusion_rules_digest: digest("b")
      },
      run_count_policy: {
        qualified_runs_per_path: 1,
        not_qualified_runs_per_path: 3,
        inconclusive_runs_per_path: 3,
        nondeterministic_runs_per_path: 3,
        divergence_contingency: "PREALLOCATE_OR_SUPERSEDE"
      },
      governing_basis: {
        documents: [
          governingDocument("ADR-002", "R2", "b"),
          governingDocument("ADR-004", "R3", "c"),
          governingDocument("ADR-005", "R2", "d"),
          governingDocument("ADR-007", "R3", "d"),
          governingDocument("ADR-009", "R4", "d"),
          governingDocument("ADR-010", "R3", "e"),
          governingDocument("ADR-011", "R3", "f"),
          governingDocument("ADR-012", "R3", "1"),
          governingDocument("CANONICAL_SCENARIOS", "V0.2.2", "2"),
          governingDocument("ENGINEERING_STANDARD", "V0.6.4", "2"),
          governingDocument("OPEN_QUESTIONS", "V0.2.23", "2"),
          governingDocument("SCN001-SSFO-V0.2.0", "V0.2.0", "2"),
          governingDocument("SCN001_SELECTED_SLICE", "V0.5.0", "2"),
          governingDocument("STATE_AND_CONTROL_MODEL", "V0.4.1", "2"),
          governingDocument("SYSTEM_THESIS", "V0.3.1", "2")
        ]
      },
      behavior_affecting_environment: [],
      artifact_custody: []
    },
    provenance: provenance(),
    created_at: "2026-07-21T10:00:00Z",
    created_by: "actor:zoey-evaluation-builder"
  };
}

function sourceBuild(scope, members) {
  return {
    closure_schema: "zoey.closed-source-build-identity",
    closure_revision: 1,
    scope,
    inclusion_rule: `closure:${scope.toLowerCase()}:v1`,
    exclusion_rule: `exclusion:${scope.toLowerCase()}:v1`,
    members,
    shared_inputs: [],
    package_projection: {
      package_name: scope === "SUT_SOURCE" ? "@zoey/scn001-sut-core" : "@zoey/scn001-eval",
      package_version: "0.1.0",
      manifest_projection_digest: digest("a"),
      field_paths: scope === "SUT_SOURCE"
        ? ["exports", "name", "type", "version"]
        : ["dependencies", "name", "type", "version"]
    },
    dependency_closure: {
      graph_digest: digest("b"),
      members: []
    },
    build: {
      build_kind: "DIRECT_EXECUTION",
      artifact_set_digest: digest("c"),
      recipe_identity: "recipe:node-direct-execution:v1",
      generated_assets: []
    },
    coverage: {
      method: "CLOSED_MEMBER_INDEX_AND_DEPENDENCY_GRAPH",
      status: "COMPLETE",
      external_inputs: []
    }
  };
}

function runtimeIdentity() {
  return {
    runtime_name: "node",
    runtime_version: "24.4.1",
    implementation: "v8",
    operating_system: "darwin",
    architecture: "arm64",
    toolchain_identity: "node:24.4.1",
    environment: [],
    locale: "en-US",
    timezone: "UTC",
    clock_mode: "fixture-controlled",
    numeric_mode: "ecmascript-number"
  };
}

function provenance() {
  return {
    repository_identity: "repository:zoey-scn001-selected-slice",
    repository_role: "governed_workbench",
    source_commit: "a".repeat(40),
    root_package_digest: digest("d"),
    root_lock_digest: digest("e"),
    worktree_state: "clean",
    reconstruction: {
      method: "command",
      command: "git checkout --detach aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      source_bundle_digest: null
    }
  };
}

function member(logicalPath, character) {
  return { logical_path: logicalPath, file_mode: "100644", byte_digest: digest(character) };
}

function notApplicable(reasonCode) {
  return {
    applicability: "not_applicable",
    reason_code: reasonCode,
    identity_fields: {},
    custody_ref: null,
    content_digest: null,
    unknown_fields: []
  };
}

function governingDocument(documentId, revision, character) {
  return { document_id: documentId, revision, content_digest: digest(character) };
}
