import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const lockPath = resolve(repositoryRoot, "governance/ZOEY_GOVERNANCE.lock");
const lockText = await readFile(lockPath, "utf8");
const rows = [...lockText.matchAll(/\|\s*[^|]+\|\s*[^|]+\|\s*`([^`]+)`\s*\|\s*`([a-f0-9]{64})`\s*\|/g)];

if (rows.length === 0) {
  throw new Error("ENG-BASE-PUBLISH-001: no hash-locked governance artifacts were found.");
}

const failures = [];
for (const [, artifactPath, expectedDigest] of rows) {
  const absolutePath = resolve(repositoryRoot, artifactPath);
  const contents = await readFile(absolutePath);
  const actualDigest = createHash("sha256").update(contents).digest("hex");
  if (actualDigest !== expectedDigest) {
    failures.push(
      `${relative(repositoryRoot, absolutePath)} expected ${expectedDigest}, received ${actualDigest}.`
    );
  }
}

if (failures.length > 0) {
  throw new Error(`Governance lock check failed:\n${failures.join("\n")}`);
}

console.log(`Governance lock checks passed for ${rows.length} artifacts.`);
