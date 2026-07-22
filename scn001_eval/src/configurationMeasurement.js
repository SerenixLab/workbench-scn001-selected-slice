import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  canonicalizeJson
} from "./formalArtifactIdentity.js";
import {
  createBehaviorConfigurationManifest,
  createEvaluationConfigurationManifest
} from "./configurationIdentity.js";

const execFileAsync = promisify(execFile);
const REQUIRED_PATHS = Object.freeze([
  "SCN001-SSFO-V0.2.0-CANONICAL-THIN",
  "SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT",
  "SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN",
  "SCN001-SSFO-V0.2.0-CF-RECENT-BASIS"
]);
const REQUIRED_CLAIMS = Object.freeze([
  "CC-EVIDENCE-TRIAL-FORMATION",
  "CC-EXPLANATION-PROVENANCE",
  "CC-OUTCOME-SEMANTICS",
  "CC-SCOPE-TRIAL-USE",
  "CC-TIME-STALE-BASIS"
]);
const LOCAL_GOVERNING_DOCUMENTS = Object.freeze([
  ["ADR-002", "R2", "governance/sources/ADR-002-scn001-system-under-test-boundary.md"],
  ["ADR-004", "R3", "governance/sources/ADR-004-scn001-first-milestone-evaluation-policy.md"],
  ["ADR-005", "R2", "governance/sources/ADR-005-scn001-selected-slice-fixture-oracle-contract.md"],
  ["ADR-007", "R3", "governance/sources/ADR-007-scn001-selected-slice-dependency-identity.md"],
  ["ADR-009", "R4", "governance/sources/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md"],
  ["ADR-010", "R3", "governance/sources/ADR-010-scn001-behavior-configuration-identity.md"],
  ["ADR-011", "R3", "governance/sources/ADR-011-scn001-formal-evaluation-record-authority.md"],
  ["ADR-012", "R3", "governance/sources/ADR-012-scn001-selected-slice-scoreability.md"],
  ["ENGINEERING_STANDARD", "V0.6.4", "governance/ENGINEERING_STANDARD.md"],
  ["OPEN_QUESTIONS", "V0.2.23", "governance/sources/OPEN_QUESTIONS.md"],
  ["SCN001-SSFO-V0.2.0", "V0.2.0", "governance/sources/ADR-005-scn001-selected-slice-fixture-oracle-contract.md"],
  ["SCN001_SELECTED_SLICE", "V0.5.0", "governance/profiles/SCN001_SELECTED_SLICE.md"]
]);
const META_GOVERNING_DOCUMENTS = Object.freeze([
  ["CANONICAL_SCENARIOS", "V0.2.2", "CANONICAL_SCENARIOS.md"],
  ["STATE_AND_CONTROL_MODEL", "V0.4.1", "STATE_AND_CONTROL_MODEL.md"],
  ["SYSTEM_THESIS", "V0.3.1", "SYSTEM_THESIS.md"]
]);

export async function buildBehaviorConfigurationManifestFromCommit(input) {
  validateMeasurementInput(input);
  const context = await measurementContext(input);
  const sourceBuild = await measureSourceBuild(
    context, "SUT_SOURCE", "scn001_sut_core", behaviorSourcePath
  );
  const publicSource = await committedBytes(
    context.repositoryRoot, context.sourceCommit, "scn001_sut_core/src/publicBoundary.js"
  );
  const publicIndex = await committedBytes(
    context.repositoryRoot, context.sourceCommit, "scn001_sut_core/index.js"
  );
  const stateSource = await committedBytes(
    context.repositoryRoot, context.sourceCommit, "scn001_sut_core/src/runState.js"
  );
  const policyDigest = digestCanonical(sourceBuild.members.map((member) => member.byte_digest));
  return createBehaviorConfigurationManifest({
    manifest_id: input.manifest_id,
    identity_payload: {
      sut_source_build: sourceBuild,
      public_boundary: {
        package_name: "@zoey/scn001-sut-core",
        entry_point: "scn001_sut_core/index.js",
        exports: deriveStaticExports(publicIndex),
        input_contract_digest: sha256(publicSource),
        output_contract_digest: sha256(publicSource),
        lifecycle_contract_digest: sha256(stateSource),
        inspection_contract_digest: digestCanonical([sha256(publicSource), sha256(stateSource)]),
        feature_flags: {}
      },
      dependencies_runtime: measuredRuntime(),
      behavior_policy: {
        policy_id: "policy:scn001-selected-slice",
        policy_revision: "R1",
        policy_digest: policyDigest,
        external_configurations: []
      },
      model: notApplicable("deterministic_non_model_sut"),
      prompt: notApplicable("deterministic_non_model_sut"),
      tool: notApplicable("no_behavior_affecting_tool"),
      provider: notApplicable("no_external_provider"),
      randomness: notApplicable("no_runtime_randomness"),
      artifact_custody: []
    },
    provenance: await measuredProvenance(context),
    created_at: input.created_at,
    created_by: input.created_by
  });
}

export async function buildEvaluationConfigurationManifestFromCommit(input) {
  validateMeasurementInput(input);
  const context = await measurementContext(input);
  const sourceBuild = await measureSourceBuild(
    context, "EVALUATOR_SOURCE", "scn001_eval", evaluationSourcePath
  );
  const documents = await measureGoverningDocuments(context);
  const byId = new Map(documents.map((document) => [document.document_id, document]));
  const checkpointDigests = sourceBuild.members.filter((member) => (
    /Checkpoint\.js$/.test(member.logical_path)
  )).map((member) => member.byte_digest);
  const formalRunDigest = sourceBuild.members.find((member) => (
    member.logical_path === "scn001_eval/src/formalRunRecord.js"
  ))?.byte_digest;
  const simulatorDigests = sourceBuild.members.filter((member) => (
    /\/simulator(?:Projection)?\.js$/.test(member.logical_path)
  )).map((member) => member.byte_digest);
  const authorityDigest = sourceBuild.members.find((member) => (
    member.logical_path === "scn001_eval/src/formalAuthority.js"
  ))?.byte_digest;
  if (!formalRunDigest || !authorityDigest || simulatorDigests.length !== 2
    || checkpointDigests.length === 0) {
    throw new Error("Measured evaluator source lacks required formal/oracle components.");
  }
  const oracleContract = byId.get("ADR-005").content_digest;
  return createEvaluationConfigurationManifest({
    manifest_id: input.manifest_id,
    identity_payload: {
      evaluator_source_build: sourceBuild,
      dependencies_runtime: measuredRuntime(),
      fixture_oracle: {
        package_id: "SCN001-SSFO-V0.2.0",
        package_revision: "V0.2.0",
        required_paths: [...REQUIRED_PATHS],
        claim_classes: [...REQUIRED_CLAIMS],
        bundle_digest: oracleContract,
        branch_policy_digest: digestCanonical([oracleContract, authorityDigest]),
        completeness_declaration_digest: digestCanonical(sourceBuild.members),
        checkpoint_contract_digest: digestCanonical(checkpointDigests),
        oracle_rule_catalogue_digest: digestCanonical([oracleContract, formalRunDigest]),
        claim_obligation_map_digest: formalRunDigest
      },
      simulator: {
        source_digest: digestCanonical(simulatorDigests),
        configuration_digest: digestCanonical([oracleContract, ...simulatorDigests]),
        realization_grammar_digest: simulatorDigests[1]
      },
      artifact_schemas: artifactSchemaRevisions(),
      run_validity: {
        criteria_digest: oracleContract,
        invalidity_reason_catalogue_digest: oracleContract
      },
      replacement_policy: {
        invalid_attempt_limit_per_path: 2,
        replacement_rule_digest: digestCanonical([
          byId.get("ADR-004").content_digest, oracleContract
        ]),
        stop_review_policy_digest: byId.get("ADR-011").content_digest
      },
      selection_policy: {
        method_id: "selection:outcome-independent-v1",
        method_revision: "1",
        method_digest: authorityDigest
      },
      deterministic_replay: {
        mode: "EXPLICITLY_NONDETERMINISTIC",
        profile_id: null,
        profile_revision: null,
        comparator_fingerprint: null,
        normalization_rules_digest: null,
        exclusion_rules_digest: null
      },
      run_count_policy: {
        qualified_runs_per_path: 1,
        not_qualified_runs_per_path: 3,
        inconclusive_runs_per_path: 3,
        nondeterministic_runs_per_path: 3,
        divergence_contingency: "PREALLOCATE_OR_SUPERSEDE"
      },
      governing_basis: { documents },
      behavior_affecting_environment: measuredEnvironment(),
      artifact_custody: []
    },
    provenance: await measuredProvenance(context),
    created_at: input.created_at,
    created_by: input.created_by
  });
}

function validateMeasurementInput(input) {
  const keys = Object.keys(input).sort();
  const required = [
    "canonical_meta_root", "created_at", "created_by", "manifest_id", "repository_root"
  ].sort();
  const optional = new Set(["source_commit"]);
  if (required.some((key) => !Object.hasOwn(input, key))
    || keys.some((key) => !required.includes(key) && !optional.has(key))) {
    throw new Error("Configuration measurement input is not the closed V1 shape.");
  }
}

async function measurementContext(input) {
  const sourceCommit = await resolveCommit(input.repository_root, input.source_commit ?? "HEAD");
  const lock = JSON.parse((await committedBytes(
    input.repository_root, sourceCommit, "governance/ZOEY_GOVERNANCE.lock"
  )).toString("utf8"));
  const metaCommit = await resolveCommit(input.canonical_meta_root, lock.canonical_meta_commit);
  if (metaCommit !== lock.canonical_meta_commit) {
    throw new Error("Canonical meta checkout does not resolve the lock-pinned commit.");
  }
  await verifyLockProjection(input.repository_root, sourceCommit, lock);
  return {
    repositoryRoot: input.repository_root,
    canonicalMetaRoot: input.canonical_meta_root,
    sourceCommit,
    metaCommit
  };
}

async function measureSourceBuild(context, scope, packageDirectory, includePath) {
  const entries = (await committedTree(
    context.repositoryRoot, context.sourceCommit, packageDirectory
  )).filter((entry) => includePath(entry.path));
  if (entries.length === 0) throw new Error(`${scope} measured source closure is empty.`);
  const members = await Promise.all(entries.map(async (entry) => ({
    logical_path: entry.path,
    file_mode: entry.mode,
    byte_digest: sha256(await committedBytes(
      context.repositoryRoot, context.sourceCommit, entry.path
    ))
  })));
  members.sort((left, right) => left.logical_path.localeCompare(right.logical_path));
  const packagePath = `${packageDirectory}/package.json`;
  const packageManifest = JSON.parse((await committedBytes(
    context.repositoryRoot, context.sourceCommit, packagePath
  )).toString("utf8"));
  const fieldPaths = scope === "SUT_SOURCE"
    ? ["exports", "name", "type", "version"]
    : ["dependencies", "name", "type", "version"];
  const projection = Object.fromEntries(fieldPaths.map((field) => [
    field, packageManifest[field] ?? null
  ]));
  const dependencies = await measureDependencyClosure(
    context, scope, packageDirectory, packageManifest
  );
  return {
    closure_schema: "zoey.closed-source-build-identity",
    closure_revision: 1,
    scope,
    inclusion_rule: `git-commit-runtime-source:${scope.toLowerCase()}:v1`,
    exclusion_rule: "exclude-tests-docs-and-development-fixtures:v1",
    members,
    shared_inputs: [],
    package_projection: {
      package_name: packageManifest.name,
      package_version: packageManifest.version,
      manifest_projection_digest: digestCanonical(projection),
      field_paths: fieldPaths
    },
    dependency_closure: {
      graph_digest: digestCanonical(dependencies),
      members: dependencies
    },
    build: {
      build_kind: "DIRECT_EXECUTION",
      artifact_set_digest: digestCanonical(members),
      recipe_identity: `recipe:node-direct:${process.versions.node}`,
      generated_assets: []
    },
    coverage: {
      method: "CLOSED_MEMBER_INDEX_AND_DEPENDENCY_GRAPH",
      status: "COMPLETE",
      external_inputs: []
    }
  };
}

async function measureDependencyClosure(context, scope, packageDirectory, packageManifest) {
  if (scope === "SUT_SOURCE") {
    if (Object.keys(packageManifest.dependencies ?? {}).length !== 0) {
      throw new Error("Measured SUT package has undeclared dependency-closure handling.");
    }
    return [];
  }
  const lock = JSON.parse((await committedBytes(
    context.repositoryRoot, context.sourceCommit, "package-lock.json"
  )).toString("utf8"));
  const lockedPackage = lock.packages?.[packageDirectory];
  if (canonicalizeJson(lockedPackage?.dependencies ?? {})
      !== canonicalizeJson(packageManifest.dependencies ?? {})) {
    throw new Error("Package dependency declarations conflict with the committed lock projection.");
  }
  const members = [];
  for (const packageName of Object.keys(packageManifest.dependencies ?? {}).sort()) {
    if (packageName !== "@zoey/scn001-sut-core") {
      throw new Error(`Unsupported measured evaluator dependency ${packageName}.`);
    }
    const dependencyManifest = JSON.parse((await committedBytes(
      context.repositoryRoot, context.sourceCommit, "scn001_sut_core/package.json"
    )).toString("utf8"));
    const link = lock.packages?.[`node_modules/${packageName}`];
    if (link?.link !== true || link.resolved !== "scn001_sut_core") {
      throw new Error("Committed lock does not resolve the exact evaluator workspace dependency.");
    }
    const dependencyMembers = await Promise.all((await committedTree(
      context.repositoryRoot, context.sourceCommit, "scn001_sut_core"
    )).filter((entry) => behaviorSourcePath(entry.path)).map(async (entry) => ({
      logical_path: entry.path,
      file_mode: entry.mode,
      byte_digest: sha256(await committedBytes(
        context.repositoryRoot, context.sourceCommit, entry.path
      ))
    })));
    dependencyMembers.sort((left, right) => left.logical_path.localeCompare(right.logical_path));
    members.push({
      package_name: packageName,
      package_version: dependencyManifest.version,
      source_identity: `workspace:scn001_sut_core:${context.sourceCommit}`,
      artifact_digest: digestCanonical(dependencyMembers),
      dependencies: Object.keys(dependencyManifest.dependencies ?? {}).sort()
    });
  }
  return members;
}

async function verifyLockProjection(repositoryRoot, commit, lock) {
  if (lock.content_digest_algorithm !== "sha256"
    || lock.canonical_meta_worktree_state !== "clean") {
    throw new Error("Governance lock hash/worktree contract is unsupported.");
  }
  const entries = [
    ...(lock.governing_source_snapshots ?? []),
    ...(lock.profiles ?? []),
    ...(lock.integrations ?? []),
    lock.standard
  ];
  for (const entry of entries) {
    if (!entry?.path || !/^[0-9a-f]{64}$/.test(entry.content_digest)) {
      throw new Error("Governance lock contains an invalid source projection.");
    }
    const digest = sha256(await committedBytes(repositoryRoot, commit, entry.path));
    if (digest !== `sha256:${entry.content_digest}`) {
      throw new Error(`Governance lock digest mismatch for ${entry.path}.`);
    }
  }
}

async function measureGoverningDocuments(context) {
  const local = await Promise.all(LOCAL_GOVERNING_DOCUMENTS.map(
    async ([document_id, revision, path]) => ({
      document_id,
      revision,
      content_digest: sha256(await committedBytes(
        context.repositoryRoot, context.sourceCommit, path
      ))
    })
  ));
  const meta = await Promise.all(META_GOVERNING_DOCUMENTS.map(
    async ([document_id, revision, path]) => ({
      document_id,
      revision,
      content_digest: sha256(await committedBytes(
        context.canonicalMetaRoot, context.metaCommit, path
      ))
    })
  ));
  return [...local, ...meta].sort((left, right) => (
    left.document_id < right.document_id ? -1 : left.document_id > right.document_id ? 1 : 0
  ));
}

async function measuredProvenance(context) {
  return {
    repository_identity: "repository:zoey-scn001-selected-slice",
    repository_role: "governed_workbench",
    source_commit: context.sourceCommit,
    root_package_digest: sha256(await committedBytes(
      context.repositoryRoot, context.sourceCommit, "package.json"
    )),
    root_lock_digest: sha256(await committedBytes(
      context.repositoryRoot, context.sourceCommit, "package-lock.json"
    )),
    worktree_state: "clean",
    reconstruction: {
      method: "command",
      command: `git checkout --detach ${context.sourceCommit}`,
      source_bundle_digest: null
    }
  };
}

function measuredRuntime() {
  return {
    runtime_name: "node",
    runtime_version: process.versions.node,
    implementation: `v8:${process.versions.v8}`,
    operating_system: process.platform,
    architecture: process.arch,
    toolchain_identity: `node:${process.versions.node}`,
    environment: measuredEnvironment(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    clock_mode: "system-clock-recorded-at-manifest-build",
    numeric_mode: "ecmascript-number"
  };
}

function measuredEnvironment() {
  return ["LANG", "LC_ALL", "NODE_OPTIONS", "TZ"].filter(
    (name) => typeof process.env[name] === "string" && process.env[name].length > 0
  ).sort().map((name) => ({
    name,
    value_kind: "CONTENT_DIGEST",
    canonical_value: null,
    content_digest: sha256(Buffer.from(process.env[name], "utf8"))
  }));
}

function artifactSchemaRevisions() {
  return Object.fromEntries([
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
  ].map((name) => [name, 1]));
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

function behaviorSourcePath(path) {
  return path === "scn001_sut_core/index.js"
    || /^scn001_sut_core\/src\/[^/]+\.js$/.test(path);
}

function evaluationSourcePath(path) {
  return path === "scn001_eval/index.js" || /^scn001_eval\/src\/[^/]+\.js$/.test(path);
}

function deriveStaticExports(indexBytes) {
  const source = indexBytes.toString("utf8");
  const match = /^export\s*\{([^}]+)\}\s*from\s*["'][^"']+["'];?\s*$/m.exec(source);
  if (!match) throw new Error("SUT package entry point is not one closed static export declaration.");
  const names = match[1].split(",").map((name) => name.trim()).filter(Boolean).sort();
  if (names.length === 0 || new Set(names).size !== names.length
    || names.some((name) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))) {
    throw new Error("SUT public exports cannot be derived unambiguously.");
  }
  return names;
}

async function resolveCommit(repositoryRoot, revision) {
  const { stdout } = await execFileAsync(
    "git", ["rev-parse", `${revision}^{commit}`], { cwd: repositoryRoot, encoding: "utf8" }
  );
  return stdout.trim();
}

async function committedTree(repositoryRoot, commit, path) {
  const { stdout } = await execFileAsync(
    "git", ["ls-tree", "-r", "-z", "--full-tree", commit, "--", path],
    { cwd: repositoryRoot, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 }
  );
  return stdout.toString("utf8").split("\0").filter(Boolean).map((record) => {
    const match = /^(\d+) blob [0-9a-f]+\t(.+)$/.exec(record);
    if (!match) throw new Error("Git tree contains an unsupported non-blob source member.");
    return { mode: match[1], path: match[2] };
  });
}

async function committedBytes(repositoryRoot, commit, path) {
  const { stdout } = await execFileAsync(
    "git", ["show", `${commit}:${path}`],
    { cwd: repositoryRoot, encoding: "buffer", maxBuffer: 32 * 1024 * 1024 }
  );
  return Buffer.from(stdout);
}

function digestCanonical(value) {
  return sha256(Buffer.from(canonicalizeJson(value), "utf8"));
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
