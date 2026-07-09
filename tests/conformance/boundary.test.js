import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { resolve } from "node:path";

import { assertEvaluationImportsPublicSutOnly } from "../../scripts/check-dependency-boundary.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");

test("static dependency boundary gate passes", () => {
  const result = spawnSync(process.execPath, ["scripts/check-dependency-boundary.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
});

test("governance lock gate passes", () => {
  const result = spawnSync(process.execPath, ["scripts/check-governance-lock.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
});

test("evaluation production code rejects dynamic module loaders", () => {
  assert.throws(
    () => assertEvaluationImportsPublicSutOnly(
      "scn001_eval/src/unsafe-loader.js",
      "const privateModule = import('../../scn001_sut_core/src/runState.js');",
      { forbidDynamicLoaders: true }
    ),
    /forbidden dynamic module loader/
  );
});
