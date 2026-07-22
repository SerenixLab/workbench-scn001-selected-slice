import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

import {
  validateBehaviorConfigurationManifest,
  validateEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import {
  buildBehaviorConfigurationManifestFromCommit,
  buildEvaluationConfigurationManifestFromCommit
} from "../src/configurationMeasurement.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const canonicalMetaRoot = resolve(repositoryRoot, "../../meta");
const base = {
  repository_root: repositoryRoot,
  canonical_meta_root: canonicalMetaRoot,
  created_at: "2026-07-22T12:00:00Z",
  created_by: "actor:trusted-manifest-builder"
};

test("trusted builders measure immutable commit source and runtime identities", async () => {
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
  assert.notEqual(
    behavior.identity_payload.sut_source_build.members[0].byte_digest,
    "sha256:" + "1".repeat(64)
  );
});

test("trusted builders reject mutable or unavailable source revisions", async () => {
  await assert.rejects(
    () => buildBehaviorConfigurationManifestFromCommit({
      ...base,
      manifest_id: "manifest:measured-behavior:missing",
      source_commit: "not-a-commit"
    }),
    /not-a-commit|unknown revision|ambiguous argument/
  );
});
