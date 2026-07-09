import { readFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const roots = [
  ".github",
  "scripts",
  "scn001_sut_core",
  "scn001_eval",
  "tests"
].map((path) => resolve(repositoryRoot, path));

const checkedExtensions = new Set([".js", ".json", ".yml"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if ([...checkedExtensions].some((extension) => entry.name.endsWith(extension))) {
      files.push(entryPath);
    }
  }

  return files;
}

const files = (await Promise.all(roots.map(collectFiles))).flat();
files.push(resolve(repositoryRoot, "package.json"));

const failures = [];
for (const file of files) {
  const contents = await readFile(file, "utf8");
  if (!contents.endsWith("\n")) {
    failures.push(`${relative(repositoryRoot, file)} must end with a newline.`);
  }
  if (/\t/.test(contents)) {
    failures.push(`${relative(repositoryRoot, file)} contains a tab character.`);
  }
  if (/[ \t]+$/m.test(contents)) {
    failures.push(`${relative(repositoryRoot, file)} contains trailing whitespace.`);
  }
}

if (failures.length > 0) {
  throw new Error(`Formatting check failed:\n${failures.join("\n")}`);
}

console.log("Formatting checks passed.");
