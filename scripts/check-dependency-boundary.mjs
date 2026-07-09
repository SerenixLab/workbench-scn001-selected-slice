import { readFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const sutRoot = resolve(repositoryRoot, "scn001_sut_core");
const evaluationRoot = resolve(repositoryRoot, "scn001_eval");

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules") {
      files.push(...await collectJavaScriptFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
}

function assertNoForbiddenSutDependency(file, contents) {
  const forbiddenPatterns = [
    /scn001_eval/,
    /@zoey\/scn001-eval/,
    /\bimport\s*\(/,
    /\brequire\s*\(/
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(contents)) {
      throw new Error(
        `ENG-CONF-IMPORT-001: ${relative(repositoryRoot, file)} matches forbidden pattern ${pattern}.`
      );
    }
  }
}

function assertEvaluationImportsPublicSutOnly(file, contents) {
  const imports = contents.matchAll(/(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g);

  for (const match of imports) {
    const specifier = match[1];
    if (specifier.includes("scn001_sut_core") || specifier.includes("@zoey/scn001-sut-core")) {
      if (specifier !== "@zoey/scn001-sut-core") {
        throw new Error(
          `ENG-CONF-IMPORT-002: ${relative(repositoryRoot, file)} reaches a non-public SUT path: ${specifier}.`
        );
      }
    }
  }
}

async function readPackage(packageRoot) {
  return JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
}

const [sutFiles, evaluationFiles, sutPackage, evaluationPackage] = await Promise.all([
  collectJavaScriptFiles(sutRoot),
  collectJavaScriptFiles(evaluationRoot),
  readPackage(sutRoot),
  readPackage(evaluationRoot)
]);

for (const file of sutFiles) {
  assertNoForbiddenSutDependency(file, await readFile(file, "utf8"));
}

for (const file of evaluationFiles) {
  assertEvaluationImportsPublicSutOnly(file, await readFile(file, "utf8"));
}

if (sutPackage.dependencies?.["@zoey/scn001-eval"] || sutPackage.devDependencies?.["@zoey/scn001-eval"]) {
  throw new Error("ENG-CONF-IMPORT-001: the SUT package declares an evaluation dependency.");
}

if (evaluationPackage.dependencies?.["@zoey/scn001-sut-core"] !== "file:../scn001_sut_core") {
  throw new Error("ENG-CONF-IMPORT-002: evaluation must declare only the public SUT package dependency.");
}

if (sutPackage.exports?.["."] !== "./index.js") {
  throw new Error("ENG-CONF-IMPORT-002: the SUT package must expose only its public index.");
}

console.log("Dependency boundary checks passed.");
