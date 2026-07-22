import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  createEvaluationConfigurationManifest,
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import {
  buildBehaviorConfigurationManifestFromCommit,
  buildEvaluationConfigurationManifestFromCommit,
  createMeasuredCampaignAuthorization,
  verifyConfigurationManifestsFromCommit
} from "../src/configurationMeasurement.js";
import { REQUIRED_PATHS } from "../src/formalAuthority.js";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("trusted builders measure clean immutable source without sibling-layout assumptions", async (t) => {
  const base = await portableRepositoryFixture(t);
  const behavior = await buildBehaviorConfigurationManifestFromCommit({
    ...base,
    manifest_id: "manifest:measured-behavior:test"
  });
  const evaluation = await buildEvaluationConfigurationManifestFromCommit({
    ...base,
    manifest_id: "manifest:measured-evaluation:test"
  });

  assert.equal(validateBehaviorConfigurationManifest(behavior), behavior);
  assert.equal(validateEvaluationConfigurationManifest(evaluation), evaluation);
  assert.match(behavior.provenance.source_commit, /^[0-9a-f]{40}$/);
  assert.ok(behavior.identity_payload.sut_source_build.members.length > 10);
  assert.deepEqual(behavior.identity_payload.public_boundary.exports, [
    "SUT_PUBLIC_BOUNDARY_METHODS", "createSutBoundary"
  ]);
  assert.ok(evaluation.identity_payload.evaluator_source_build.members.length > 10);
  assert.equal(
    evaluation.identity_payload.deterministic_replay.mode,
    "EXPLICITLY_NONDETERMINISTIC"
  );
  assert.deepEqual(
    evaluation.identity_payload.behavior_affecting_environment.map((entry) => entry.name),
    ["LANG", "LC_ALL", "NODE_OPTIONS", "TZ"]
  );
});

test("trusted builders reject dirty, historical, and unavailable source revisions", async (t) => {
  const dirty = await portableRepositoryFixture(t);
  await writeFile(join(dirty.repository_root, "untracked-runtime-input.txt"), "dirty\n");
  await assert.rejects(
    () => buildBehaviorConfigurationManifestFromCommit({
      ...dirty,
      manifest_id: "manifest:measured-behavior:dirty"
    }),
    /clean exact-HEAD worktree/
  );

  const historical = await portableRepositoryFixture(t);
  await assert.rejects(
    () => buildBehaviorConfigurationManifestFromCommit({
      ...historical,
      manifest_id: "manifest:measured-behavior:historical",
      source_commit: "HEAD^"
    }),
    /must equal the checked-out HEAD/
  );
  await assert.rejects(
    () => buildBehaviorConfigurationManifestFromCommit({
      ...historical,
      manifest_id: "manifest:measured-behavior:missing",
      source_commit: "not-a-commit"
    }),
    /not-a-commit|unknown revision|ambiguous argument/
  );
});

test("trusted builders close nested source, environment, and file-mode attacks", async (t) => {
  const nested = await portableRepositoryFixture(t);
  const nestedDirectory = join(nested.repository_root, "scn001_sut_core", "src", "nested");
  await mkdir(nestedDirectory);
  await writeFile(join(nestedDirectory, "runtime.js"), "export const nestedRuntime = true;\n");
  await commitAll(nested.repository_root, "add nested measured source");
  const nestedManifest = await buildBehaviorConfigurationManifestFromCommit({
    ...nested,
    manifest_id: "manifest:measured-behavior:nested"
  });
  assert.ok(nestedManifest.identity_payload.sut_source_build.members.some(
    (member) => member.logical_path === "scn001_sut_core/src/nested/runtime.js"
  ));

  const unclassified = await portableRepositoryFixture(t);
  await writeFile(join(unclassified.repository_root, "scn001_eval", "runtime-plugin.cjs"), "module.exports = {};\n");
  await commitAll(unclassified.repository_root, "add unclassified runtime file");
  await assert.rejects(
    () => buildEvaluationConfigurationManifestFromCommit({
      ...unclassified,
      manifest_id: "manifest:measured-evaluation:unclassified"
    }),
    /unclassified members/
  );

  const escape = await portableRepositoryFixture(t);
  await writeFile(
    join(escape.repository_root, "scn001_eval", "src", "escape.js"),
    "import \"../../outside.js\";\n"
  );
  await commitAll(escape.repository_root, "add escaping import");
  await assert.rejects(
    () => buildEvaluationConfigurationManifestFromCommit({
      ...escape,
      manifest_id: "manifest:measured-evaluation:escape"
    }),
    /import escapes closure/
  );

  const environmentEscape = await portableRepositoryFixture(t);
  await writeFile(
    join(environmentEscape.repository_root, "scn001_eval", "src", "environmentEscape.js"),
    "export const unmeasured = process.env.UNMEASURED_RUNTIME_INPUT;\n"
  );
  await commitAll(environmentEscape.repository_root, "add unmeasured environment input");
  await assert.rejects(
    () => buildEvaluationConfigurationManifestFromCommit({
      ...environmentEscape,
      manifest_id: "manifest:measured-evaluation:environment-escape"
    }),
    /environment catalogue does not match source access/
  );

  const linkedSource = await portableRepositoryFixture(t);
  await symlink(
    "formalAuthority.js",
    join(linkedSource.repository_root, "scn001_eval", "src", "linkedAuthority.js")
  );
  await commitAll(linkedSource.repository_root, "add linked runtime source");
  await assert.rejects(
    () => buildEvaluationConfigurationManifestFromCommit({
      ...linkedSource,
      manifest_id: "manifest:measured-evaluation:linked-source"
    }),
    /non-regular runtime member/
  );
});

test("trusted authorization reconstructs manifests and forces conservative three-run policy", async (t) => {
  const base = await portableRepositoryFixture(t);
  const behavior = await buildBehaviorConfigurationManifestFromCommit({
    ...base,
    manifest_id: "manifest:measured-behavior:authorization"
  });
  const evaluation = await buildEvaluationConfigurationManifestFromCommit({
    ...base,
    manifest_id: "manifest:measured-evaluation:authorization"
  });
  const verified = await verifyConfigurationManifestsFromCommit({
    repository_root: base.repository_root,
    canonical_meta_root: base.canonical_meta_root,
    behavior_manifest: behavior,
    evaluation_manifest: evaluation
  });
  assert.equal(verified.run_count_policy, "CONSERVATIVE_THREE_RUN");

  const authorizationInput = measuredAuthorizationInput(behavior, evaluation);
  const authorizationPromise = createMeasuredCampaignAuthorization({
    repository_root: base.repository_root,
    canonical_meta_root: base.canonical_meta_root,
    authorization_input: authorizationInput
  });
  authorizationInput.evaluation_manifest = null;
  const authorization = await authorizationPromise;
  assert.equal(authorization.identity_payload.run_count_branch, "NONDETERMINISTIC_THREE");
  assert.equal(authorization.identity_payload.planned_valid_runs_per_path, 3);
  assert.equal(authorization.identity_payload.qualification_plan_ref, null);
});

test("trusted authorization rejects a valid caller-invented manifest", async (t) => {
  const base = await portableRepositoryFixture(t);
  const behavior = await buildBehaviorConfigurationManifestFromCommit({
    ...base,
    manifest_id: "manifest:measured-behavior:bypass"
  });
  const measuredEvaluation = await buildEvaluationConfigurationManifestFromCommit({
    ...base,
    manifest_id: "manifest:measured-evaluation:bypass"
  });
  const inventedPayload = structuredClone(measuredEvaluation.identity_payload);
  inventedPayload.selection_policy.method_digest = digest("f");
  const inventedEvaluation = createEvaluationConfigurationManifest({
    manifest_id: measuredEvaluation.manifest_id,
    identity_payload: inventedPayload,
    provenance: measuredEvaluation.provenance,
    created_at: measuredEvaluation.created_at,
    created_by: measuredEvaluation.created_by
  });

  await assert.rejects(
    () => createMeasuredCampaignAuthorization({
      repository_root: base.repository_root,
      canonical_meta_root: base.canonical_meta_root,
      authorization_input: measuredAuthorizationInput(behavior, inventedEvaluation)
    }),
    /do not equal independent commit reconstruction/
  );

  const conflictingProvenance = createEvaluationConfigurationManifest({
    manifest_id: measuredEvaluation.manifest_id,
    identity_payload: measuredEvaluation.identity_payload,
    provenance: {
      ...measuredEvaluation.provenance,
      source_commit: "a".repeat(40)
    },
    created_at: measuredEvaluation.created_at,
    created_by: measuredEvaluation.created_by
  });
  await assert.rejects(
    () => verifyConfigurationManifestsFromCommit({
      repository_root: base.repository_root,
      canonical_meta_root: base.canonical_meta_root,
      behavior_manifest: behavior,
      evaluation_manifest: conflictingProvenance
    }),
    /must identify one exact source commit/
  );
});

async function portableRepositoryFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "zoey-config-measurement-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workbench = join(root, "workbench");
  const meta = join(root, "meta");
  await execFileAsync("git", ["clone", "--quiet", "--no-local", repositoryRoot, workbench]);
  await execFileAsync("git", ["init", "--quiet", meta]);
  await configureGit(meta);
  for (const [path, version] of [
    ["CANONICAL_SCENARIOS.md", "V0.2.2"],
    ["STATE_AND_CONTROL_MODEL.md", "V0.4.1"],
    ["SYSTEM_THESIS.md", "V0.3.1"]
  ]) await writeFile(join(meta, path), `# Fixture ${path}\n\nDocument version: \`${version}\`\n`);
  await commitAll(meta, "create canonical meta fixture");
  const metaCommit = (await execFileAsync(
    "git", ["rev-parse", "HEAD"], { cwd: meta, encoding: "utf8" }
  )).stdout.trim();

  await configureGit(workbench);
  const lockPath = join(workbench, "governance", "ZOEY_GOVERNANCE.lock");
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  lock.canonical_meta_commit = metaCommit;
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  const currentBuilder = await readFile(
    join(repositoryRoot, "scn001_eval", "src", "configurationMeasurement.js")
  );
  await writeFile(
    join(workbench, "scn001_eval", "src", "configurationMeasurement.js"),
    currentBuilder
  );
  await commitAll(workbench, "prepare portable measurement fixture");
  return {
    repository_root: workbench,
    canonical_meta_root: meta,
    created_at: "2026-07-22T12:00:00Z",
    created_by: "actor:trusted-manifest-builder"
  };
}

async function configureGit(repository) {
  await execFileAsync("git", ["config", "user.name", "Zoey Test"], { cwd: repository });
  await execFileAsync("git", ["config", "user.email", "zoey-test@example.invalid"], {
    cwd: repository
  });
}

async function commitAll(repository, message) {
  await execFileAsync("git", ["add", "--all"], { cwd: repository });
  await execFileAsync("git", ["commit", "--quiet", "-m", message], { cwd: repository });
}

function measuredAuthorizationInput(behaviorManifest, evaluationManifest) {
  return {
    artifact_id: "artifact:campaign-authorization:measured",
    campaign_id: "campaign:scn001:measured",
    authority_namespace_id: "namespace:scn001:measured",
    behavior_manifest: behaviorManifest,
    evaluation_manifest: evaluationManifest,
    qualification_plan: null,
    qualification_result: null,
    attempt_slots: attemptSlots(),
    contingency_mode: "NOT_APPLICABLE",
    contingency_slots: [],
    campaign_authority_identity: "actor:zoey-project-owner",
    producer_identity: "actor:campaign-producer",
    custody_plan: {
      custody_id: "custody:formal-evaluation:measured",
      access_policy_digest: digest("6")
    },
    anchor_requirement: {
      profile: "PROTECTED_REMOTE_GATE",
      authority_ref: "refs/heads/formal-authority",
      receipt_media_type: "application/json",
      receipt_encoding: "utf-8",
      receipt_digest_algorithm: "sha-256",
      receipt_custody_target: "custody:formal-evaluation:anchor-receipts",
      resolvability_policy: "REQUIRED_AT_USE",
      fresh_start_profile: "GATE_LAUNCHED_ATTEMPT"
    },
    authorized_at: "2026-07-22T13:00:00Z",
    authorized_by: "actor:zoey-project-owner"
  };
}

function attemptSlots() {
  return REQUIRED_PATHS.flatMap((path, pathIndex) => Array.from(
    { length: 3 }, (_, index) => ({
      slot_id: `slot:primary:measured:${pathIndex + 1}:${index + 1}`,
      attempt_id: `attempt:primary:measured:${pathIndex + 1}:${index + 1}`,
      path_id: path,
      ordinal: index + 1,
      slot_kind: "PRIMARY",
      selection_basis_digest: digest("d"),
      seed_commitment: digest("e")
    }))
  );
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
}
