import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const gates = [
  ["governance", ["scripts/check-governance-lock.mjs"]],
  ["format", ["scripts/check-format.mjs"]],
  ["quality", ["scripts/check-quality.mjs"]],
  ["dependency boundary", ["scripts/check-dependency-boundary.mjs"]],
  ["tests", ["--test"]]
];

for (const [name, args] of gates) {
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`Required ${name} gate failed.`);
  }
}

console.log("All local gates passed.");
