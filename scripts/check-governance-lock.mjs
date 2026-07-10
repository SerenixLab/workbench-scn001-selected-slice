import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const result = spawnSync(
  "python3",
  ["governance/zoey_governance.py", "check", "--target", repositoryRoot, "--conformance"],
  { cwd: repositoryRoot, stdio: "inherit" }
);

if (result.error) {
  throw new Error(`ENG-BASE-PUBLISH-001: unable to start governance checker: ${result.error.message}`);
}
if (result.status !== 0) {
  throw new Error("ENG-BASE-PUBLISH-001: governance checker failed.");
}
