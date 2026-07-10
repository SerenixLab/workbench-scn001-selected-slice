#!/usr/bin/env python3
"""Project and verify pinned Zoey engineering governance snapshots."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


class GovernanceError(RuntimeError):
    """Raised when a governance set is incomplete or internally inconsistent."""


@dataclass(frozen=True)
class Rule:
    rule_id: str
    revision: str
    sources: tuple[str, ...]


@dataclass(frozen=True)
class Artifact:
    source_path: Path
    target_path: Path
    version: str
    rules: tuple[Rule, ...]


RULE_HEADING = re.compile(r"^### (ENG-[A-Z-]+-[0-9]+) - .+$", re.MULTILINE)
RULE_REVISION = re.compile(r"^Rule revision: `(?P<revision>R[0-9]+)`$", re.MULTILINE)
ARTIFACT_VERSION = re.compile(
    r"^(?:Document|Profile|Integration) version: `(?P<version>[^`]+)`$", re.MULTILINE
)
ADR_SOURCE = re.compile(r"\b(?P<id>ADR-[0-9]{3})\s+(?P<revision>R[0-9]+)\b")
OPEN_QUESTIONS_SOURCE = re.compile(r"\bOPEN_QUESTIONS\.md\s+(?P<version>V[0-9.]+)\b")
RULE_SOURCE = re.compile(r"\bENG-[A-Z-]+-[0-9]+\s+R[0-9]+\b")
NON_SNAPSHOT_BASE_SOURCES = {
    "canonical governance lock.",
}


def normalized_bytes(path: Path) -> bytes:
    text = path.read_text(encoding="utf-8")
    return text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(normalized_bytes(path)).hexdigest()


def parse_rules(path: Path) -> tuple[Rule, ...]:
    text = path.read_text(encoding="utf-8")
    headings = list(RULE_HEADING.finditer(text))
    rules: list[Rule] = []

    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        block = text[heading.start() : end]
        revision_match = RULE_REVISION.search(block)
        if revision_match is None:
            raise GovernanceError(f"{path}: {heading.group(1)} has no rule revision.")
        rules.append(
            Rule(
                rule_id=heading.group(1),
                revision=revision_match.group("revision"),
                sources=tuple(parse_governing_sources(path, heading.group(1), block)),
            )
        )

    if not rules:
        raise GovernanceError(f"{path}: no canonical ENG-* rules found.")
    return tuple(rules)


def parse_governing_sources(path: Path, rule_id: str, block: str) -> list[str]:
    match = re.search(r"^Governing sources:(?P<inline>.*)$", block, re.MULTILINE)
    if match is None:
        raise GovernanceError(f"{path}: {rule_id} has no governing sources field.")

    inline = match.group("inline").strip()
    if inline:
        return [inline]

    sources: list[str] = []
    for line in block[match.end() :].splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("- "):
            sources.append(stripped[2:].strip().strip("`"))
            continue
        break

    if not sources:
        raise GovernanceError(f"{path}: {rule_id} has an empty governing sources field.")
    return sources


def artifact_version(path: Path) -> str:
    match = ARTIFACT_VERSION.search(path.read_text(encoding="utf-8"))
    if match is None:
        raise GovernanceError(f"{path}: no document, profile, or integration version found.")
    return match.group("version")


def load_artifact(meta_root: Path, relative_path: Path) -> Artifact:
    source_path = meta_root / relative_path
    return Artifact(
        source_path=source_path,
        target_path=projected_artifact_path(relative_path),
        version=artifact_version(source_path),
        rules=parse_rules(source_path),
    )


def projected_artifact_path(canonical_path: Path) -> Path:
    if canonical_path == Path("ENGINEERING_STANDARD.md"):
        return canonical_path
    if canonical_path.parts[:2] == ("engineering", "profiles"):
        return Path("profiles") / canonical_path.name
    if canonical_path.parts[:2] == ("engineering", "integrations"):
        return Path("integrations") / canonical_path.name
    raise GovernanceError(f"unsupported canonical artifact path: {canonical_path}")


def resolve_source_snapshots(meta_root: Path, artifacts: Iterable[Artifact]) -> list[dict[str, str]]:
    snapshots: dict[Path, dict[str, str]] = {}

    for artifact in artifacts:
        for rule in artifact.rules:
            for source in rule.sources:
                if source.lower().startswith("none;") or source.lower() in NON_SNAPSHOT_BASE_SOURCES:
                    continue
                if RULE_SOURCE.search(source):
                    continue

                adr_match = ADR_SOURCE.search(source)
                if adr_match:
                    matches = sorted((meta_root / "decisions").glob(f"{adr_match.group('id')}-*.md"))
                    if len(matches) != 1:
                        raise GovernanceError(
                            f"{artifact.source_path}: cannot resolve {source} for {rule.rule_id}."
                        )
                    source_path = matches[0]
                    snapshots[source_path] = {
                        "id": adr_match.group("id"),
                        "path": f"governance/sources/{source_path.name}",
                        "version_or_revision": adr_match.group("revision"),
                        "canonical_path": source_path.relative_to(meta_root).as_posix(),
                        "content_digest": sha256(source_path),
                    }
                    continue

                open_questions_match = OPEN_QUESTIONS_SOURCE.search(source)
                if open_questions_match:
                    source_path = meta_root / "OPEN_QUESTIONS.md"
                    snapshots[source_path] = {
                        "id": "OPEN_QUESTIONS",
                        "path": "governance/sources/OPEN_QUESTIONS.md",
                        "version_or_revision": open_questions_match.group("version"),
                        "canonical_path": "OPEN_QUESTIONS.md",
                        "content_digest": sha256(source_path),
                    }
                    continue

                raise GovernanceError(
                    f"{artifact.source_path}: unsupported governing source {source!r} for {rule.rule_id}."
                )

    return sorted(snapshots.values(), key=lambda snapshot: snapshot["canonical_path"])


def git_value(meta_root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=meta_root, text=True, capture_output=True, check=False
    )
    return result.stdout.strip() if result.returncode == 0 else "unavailable"


def meta_worktree_state(meta_root: Path) -> str:
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=meta_root,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        return "unavailable"
    return "dirty" if result.stdout.strip() else "clean"


def build_lock(
    meta_root: Path,
    standard: Artifact,
    profiles: list[Artifact],
    integrations: list[Artifact],
    canonical_meta_source: str,
) -> dict[str, object]:
    artifacts = [standard, *profiles, *integrations]
    all_rules: dict[str, tuple[Rule, Artifact]] = {}
    for artifact in artifacts:
        for rule in artifact.rules:
            if rule.rule_id in all_rules:
                raise GovernanceError(f"duplicate canonical rule ID: {rule.rule_id}.")
            all_rules[rule.rule_id] = (rule, artifact)

    return {
        "lock_version": "V0.2.0",
        "serialization": "json",
        "content_digest_algorithm": "sha256",
        "content_digest_canonicalization": "utf-8-lf",
        "generated_at": "generated-by-zoey-governance",
        "canonical_meta_source": canonical_meta_source,
        "canonical_meta_commit": git_value(meta_root, "rev-parse", "HEAD"),
        "canonical_meta_worktree_state": meta_worktree_state(meta_root),
        "standard": artifact_record(standard),
        "profiles": [artifact_record(profile) for profile in profiles],
        "integrations": [artifact_record(integration) for integration in integrations],
        "governing_source_snapshots": resolve_source_snapshots(meta_root, artifacts),
        "rule_revisions": [
            {
                "rule_id": rule_id,
                "revision": rule.revision,
                "source_artifact": artifact.target_path.as_posix(),
            }
            for rule_id, (rule, artifact) in sorted(all_rules.items())
        ],
        "conformance_index": {"path": "governance/CONFORMANCE.md"},
    }


def artifact_record(artifact: Artifact) -> dict[str, str]:
    return {
        "path": f"governance/{artifact.target_path.as_posix()}",
        "version": artifact.version,
        "content_digest": sha256(artifact.source_path),
    }


def write_json(path: Path, value: dict[str, object]) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def copy_artifact(stage_root: Path, artifact: Artifact) -> None:
    destination = stage_root / "governance" / artifact.target_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(artifact.source_path, destination)


def copy_source_snapshots(stage_root: Path, meta_root: Path, snapshots: list[dict[str, str]]) -> None:
    for snapshot in snapshots:
        destination = stage_root / snapshot["path"]
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(meta_root / snapshot["canonical_path"], destination)


def validate_projection(repository_root: Path, require_conformance: bool = True) -> list[str]:
    governance = repository_root / "governance"
    lock_path = governance / "ZOEY_GOVERNANCE.lock"
    if not lock_path.exists():
        return ["missing governance/ZOEY_GOVERNANCE.lock"]

    try:
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        return [f"invalid JSON lock: {error}"]

    errors: list[str] = []
    if lock.get("serialization") != "json":
        errors.append("lock serialization must be json")
    if lock.get("content_digest_algorithm") != "sha256":
        errors.append("lock digest algorithm must be sha256")
    if lock.get("content_digest_canonicalization") != "utf-8-lf":
        errors.append("lock canonicalization must be utf-8-lf")

    records: list[dict[str, str]] = [lock.get("standard", {})]
    records.extend(lock.get("profiles", []))
    records.extend(lock.get("integrations", []))
    records.extend(lock.get("governing_source_snapshots", []))
    for record in records:
        path = record.get("path")
        expected_digest = record.get("content_digest")
        if not path or not expected_digest:
            errors.append(f"lock record missing path or content digest: {record}")
            continue
        snapshot_path = repository_root / path
        if not snapshot_path.exists():
            errors.append(f"missing locked snapshot: {path}")
            continue
        actual_digest = sha256(snapshot_path)
        if actual_digest != expected_digest:
            errors.append(f"digest mismatch: {path}")

    try:
        projected_artifacts = [
            parse_projected_artifact(repository_root, lock["standard"]),
            *[parse_projected_artifact(repository_root, record) for record in lock.get("profiles", [])],
            *[
                parse_projected_artifact(repository_root, record)
                for record in lock.get("integrations", [])
            ],
        ]
    except (KeyError, GovernanceError) as error:
        errors.append(str(error))
        return errors

    actual_rules: dict[str, tuple[str, str]] = {}
    for artifact in projected_artifacts:
        for rule in artifact.rules:
            if rule.rule_id in actual_rules:
                errors.append(f"duplicate projected rule: {rule.rule_id}")
            actual_rules[rule.rule_id] = (rule.revision, artifact.target_path.as_posix())

    locked_rules = {
        record["rule_id"]: (record["revision"], record["source_artifact"])
        for record in lock.get("rule_revisions", [])
    }
    if actual_rules != locked_rules:
        errors.append("locked rule revisions do not exactly match projected rule catalogues")

    conformance_path = repository_root / lock.get("conformance_index", {}).get("path", "")
    if require_conformance and not conformance_path.exists():
        errors.append("missing lock-declared conformance index")
    return errors


def parse_projected_artifact(repository_root: Path, record: dict[str, str]) -> Artifact:
    relative_path = Path(record["path"])
    source_path = repository_root / relative_path
    return Artifact(
        source_path=source_path,
        target_path=relative_path.relative_to("governance"),
        version=record["version"],
        rules=parse_rules(source_path),
    )


def extract_index_rows(path: Path) -> dict[str, list[str]]:
    rows: dict[str, list[str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if not cells:
            continue
        match = re.fullmatch(r"`?(ENG-[A-Z-]+-[0-9]+)`?", cells[0])
        if match:
            rows[match.group(1)] = cells
    return rows


def conformance_errors(repository_root: Path) -> list[str]:
    lock = json.loads((repository_root / "governance/ZOEY_GOVERNANCE.lock").read_text(encoding="utf-8"))
    conformance_path = repository_root / lock["conformance_index"]["path"]
    rows = extract_index_rows(conformance_path)
    expected = {record["rule_id"] for record in lock["rule_revisions"]}
    missing = sorted(expected - rows.keys())
    unexpected = sorted(rows.keys() - expected)
    errors = [f"conformance index missing {rule_id}" for rule_id in missing]
    errors.extend(f"conformance index has unknown {rule_id}" for rule_id in unexpected)
    for rule_id, cells in rows.items():
        if len(cells) < 5:
            errors.append(f"conformance index row is incomplete: {rule_id}")
            continue
        if cells[3] == "not-applicable" and not cells[4]:
            errors.append(f"not-applicable rule has no rationale: {rule_id}")
    return errors


def agent_routing_errors(repository_root: Path) -> list[str]:
    lock = json.loads((repository_root / "governance/ZOEY_GOVERNANCE.lock").read_text(encoding="utf-8"))
    uses_codex = any(
        record.get("path", "").endswith("CODEX_INTEGRATION.md")
        for record in lock.get("integrations", [])
    )
    if not uses_codex:
        return []

    root_agents = repository_root / "AGENTS.md"
    if not root_agents.exists():
        return ["missing root AGENTS.md for active Codex integration"]
    root_text = root_agents.read_text(encoding="utf-8")
    required_root_terms = (
        "governance/ZOEY_GOVERNANCE.lock",
        "governance/profiles/",
        "governance/integrations/",
        "more-specific",
    )
    errors = [
        f"root AGENTS.md missing required routing term: {term}"
        for term in required_root_terms
        if term not in root_text
    ]

    for agents_path in repository_root.rglob("AGENTS.md"):
        if "node_modules" in agents_path.parts:
            continue
        text = agents_path.read_text(encoding="utf-8")
        if "ACTIVE_PROFILE.md" in text or "governance/CODEX_INTEGRATION.md" in text:
            errors.append(f"stale singular governance routing in {agents_path.relative_to(repository_root)}")
    return errors


def render_index_rows(lock: dict[str, object], rule_ids: Iterable[str]) -> str:
    records = {record["rule_id"]: record for record in lock["rule_revisions"]}
    rows = []
    for rule_id in sorted(rule_ids):
        record = records[rule_id]
        rows.append(
            "| `{rule_id}` | `{revision}` | `{source}` | applicable | "
            "Seeded during governance migration; owner must confirm scope. | "
            "revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |".format(
                rule_id=rule_id,
                revision=record["revision"],
                source=record["source_artifact"],
            )
        )
    return "\n".join(rows)


def ensure_conformance_index(repository_root: Path, lock: dict[str, object]) -> None:
    conformance_path = repository_root / lock["conformance_index"]["path"]
    conformance_path.parent.mkdir(parents=True, exist_ok=True)
    expected = {record["rule_id"] for record in lock["rule_revisions"]}
    if conformance_path.exists():
        existing = conformance_path.read_text(encoding="utf-8")
        existing_rows = extract_index_rows(conformance_path)
        missing = expected - existing_rows.keys()
        if not missing:
            return
        addition = (
            "\n\n## Applicability Index Migration\n\n"
            "This generated migration section completes lock coverage. Each row remains "
            "`revalidation-required` until the repository owner maps legacy evidence "
            "to the current rule revision.\n\n"
            "| Rule ID | Revision | Rule source artifact | Applicability | "
            "Rationale / applies to paths and change types | Status | Local evidence | "
            "Actual promotion mechanism |\n"
            "| --- | --- | --- | --- | --- | --- | --- | --- |\n"
            f"{render_index_rows(lock, missing)}\n"
        )
        conformance_path.write_text(existing.rstrip() + addition, encoding="utf-8")
        return

    conformance_path.write_text(
        "# Zoey Conformance Ledger\n\n"
        "## Governance Baseline\n\n"
        "Authoritative local governance set: `governance/ZOEY_GOVERNANCE.lock`\n\n"
        "## Applicability Index\n\n"
        "| Rule ID | Revision | Rule source artifact | Applicability | "
        "Rationale / applies to paths and change types | Status | Local evidence | "
        "Actual promotion mechanism |\n"
        "| --- | --- | --- | --- | --- | --- | --- | --- |\n"
        f"{render_index_rows(lock, expected)}\n",
        encoding="utf-8",
    )


def render_agent_template(template_path: Path) -> str:
    text = template_path.read_text(encoding="utf-8")
    template_id = re.search(r"^Template ID: `([^`]+)`$", text, re.MULTILINE)
    template_version = re.search(r"^Template version: `([^`]+)`$", text, re.MULTILINE)
    if template_id is None or template_version is None:
        raise GovernanceError(f"{template_path}: template provenance metadata is incomplete.")

    text = re.sub(r"^Template version: `[^`]+`\n\n", "", text, count=1, flags=re.MULTILINE)
    text = re.sub(r"^Integration: .+\n\n", "", text, count=1, flags=re.MULTILINE)
    text = re.sub(r"^Instantiation: .+\n\n", "", text, count=1, flags=re.MULTILINE)
    provenance = (
        f"Seeded from template: `{template_id.group(1)}` `{template_version.group(1)}`\n\n"
        "Repo-local guidance: `yes`\n\n"
        "Canonical template equality: `not claimed`\n\n"
    )
    return text.replace("\n\n", f"\n\n{provenance}", 1)


def initialize_missing_agents(meta_root: Path, target_root: Path) -> None:
    templates = [
        (target_root / "AGENTS.md", meta_root / "engineering/integrations/codex/AGENTS_BASE_TEMPLATE.md"),
        (
            target_root / "scn001_sut_core/AGENTS.md",
            meta_root / "engineering/integrations/codex/AGENTS_SUT_TEMPLATE.md",
        ),
        (
            target_root / "scn001_eval/AGENTS.md",
            meta_root / "engineering/integrations/codex/AGENTS_EVAL_TEMPLATE.md",
        ),
    ]
    for destination, template in templates:
        if destination.parent.exists() and not destination.exists():
            destination.write_text(render_agent_template(template), encoding="utf-8")


def replace_derived_directory(source: Path, destination: Path) -> None:
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)


def project(args: argparse.Namespace) -> None:
    meta_root = Path(args.meta_root).resolve()
    target_root = Path(args.target).resolve()
    if not target_root.is_dir():
        raise GovernanceError(f"target repository does not exist: {target_root}")

    standard = load_artifact(meta_root, Path("ENGINEERING_STANDARD.md"))
    profiles = [load_artifact(meta_root, Path(profile)) for profile in args.profile]
    integrations = [load_artifact(meta_root, Path(integration)) for integration in args.integration]
    lock = build_lock(meta_root, standard, profiles, integrations, args.canonical_meta_source)

    with tempfile.TemporaryDirectory(prefix=".zoey-governance-stage-", dir=target_root) as stage:
        stage_root = Path(stage)
        for artifact in [standard, *profiles, *integrations]:
            copy_artifact(stage_root, artifact)
        copy_source_snapshots(stage_root, meta_root, lock["governing_source_snapshots"])
        shutil.copy2(Path(__file__).resolve(), stage_root / "governance/zoey_governance.py")
        write_json(stage_root / "governance/ZOEY_GOVERNANCE.lock", lock)

        staged_errors = validate_projection(stage_root, require_conformance=False)
        if staged_errors:
            raise GovernanceError("staged projection failed:\n" + "\n".join(staged_errors))

        live_governance = target_root / "governance"
        live_governance.mkdir(parents=True, exist_ok=True)
        shutil.copy2(stage_root / "governance/ENGINEERING_STANDARD.md", live_governance)
        replace_derived_directory(stage_root / "governance/profiles", live_governance / "profiles")
        replace_derived_directory(stage_root / "governance/integrations", live_governance / "integrations")
        replace_derived_directory(stage_root / "governance/sources", live_governance / "sources")
        shutil.copy2(stage_root / "governance/zoey_governance.py", live_governance)
        for stale_path in (live_governance / "ACTIVE_PROFILE.md", live_governance / "CODEX_INTEGRATION.md"):
            if stale_path.exists():
                stale_path.unlink()

        # The lock is the published baseline marker, so it is copied last.
        shutil.copy2(stage_root / "governance/ZOEY_GOVERNANCE.lock", live_governance)

    ensure_conformance_index(target_root, lock)
    initialize_missing_agents(meta_root, target_root)
    errors = validate_projection(target_root)
    if errors:
        raise GovernanceError("published projection failed:\n" + "\n".join(errors))

    print(f"Projected {len(lock['rule_revisions'])} rules into {target_root}.")
    if lock["canonical_meta_worktree_state"] != "clean":
        print("Warning: canonical meta worktree is dirty; snapshot digests define this baseline.")
    conformance = conformance_errors(target_root)
    if conformance:
        print("Conformance migration still needs attention:")
        print("\n".join(f"- {error}" for error in conformance))


def check(args: argparse.Namespace) -> None:
    target_root = Path(args.target).resolve()
    errors = validate_projection(target_root)
    if args.conformance and not errors:
        errors.extend(conformance_errors(target_root))
        errors.extend(agent_routing_errors(target_root))
    if errors:
        raise GovernanceError("governance check failed:\n" + "\n".join(errors))
    print(f"Governance projection checks passed for {target_root}.")
    if args.conformance:
        print("Conformance index coverage checks passed.")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    project_parser = subparsers.add_parser("project", help="project canonical governance into a repo")
    project_parser.add_argument("--target", required=True, help="governed implementation repository")
    project_parser.add_argument(
        "--meta-root", default=Path(__file__).resolve().parents[2], help="canonical Zoey/meta root"
    )
    project_parser.add_argument(
        "--profile",
        action="append",
        required=True,
        default=[],
        help="canonical profile path relative to meta root; repeat for multiple profiles",
    )
    project_parser.add_argument(
        "--integration",
        action="append",
        default=[],
        help="canonical integration path relative to meta root; repeat for multiple integrations",
    )
    project_parser.add_argument(
        "--canonical-meta-source", default="Zoey/meta", help="stable label for the canonical source"
    )
    project_parser.set_defaults(handler=project)

    check_parser = subparsers.add_parser("check", help="check a projected governance set")
    check_parser.add_argument("--target", required=True, help="governed implementation repository")
    check_parser.add_argument(
        "--conformance", action="store_true", help="also require complete conformance-index coverage"
    )
    check_parser.set_defaults(handler=check)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        args.handler(args)
    except GovernanceError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
