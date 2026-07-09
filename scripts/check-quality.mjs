import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const roots = ["scripts", "scn001_sut_core", "scn001_eval", "tests"].map((path) => resolve(repositoryRoot, path));

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

const files = (await Promise.all(roots.map(collectJavaScriptFiles))).flat();
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`Syntax check failed for ${file}:\n${result.stderr}`);
  }
}

console.log(`Syntax checks passed for ${files.length} JavaScript files.`);
