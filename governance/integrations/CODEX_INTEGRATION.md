# Codex Integration Contract

Integration version: `V0.2.0`

Status: `Draft`

Date: 2026-07-10

Base standard: `ENGINEERING_STANDARD.md` `V0.5.0`

Verified external behavior assumptions:

- OpenAI Codex `AGENTS.md` guidance checked on 2026-07-09.
- Codex reads `AGENTS.md` guidance before work and builds an instruction chain once per run/session.
- Codex checks `AGENTS.override.md` before `AGENTS.md` in each directory and includes at most one instruction file per directory.
- Interactive Codex walks from project root toward the current working directory; it does not discover descendant guidance merely because a later edit targets that descendant.
- Later, closer instruction files override earlier guidance on conflict.
- Codex stops adding project instruction content at `project_doc_max_bytes`, default `32 KiB`.

These are external behavior assumptions, not Zoey semantic authority. If Codex behavior changes materially, this integration contract becomes `revalidation-required`.

## Purpose

This integration defines how Codex consumes Zoey governance in implementation repositories.

It does not make Codex an enforcement authority. Durable enforcement remains in local conformance ledgers, structural design, static checks, automated tests, qualifying review, CI, and promotion controls.

## Template Ownership

The templates in this directory seed repo-local `AGENTS.md` files.

```text
canonical template -> initial repo-local AGENTS.md
repo-local AGENTS.md -> locally maintained guidance
```

An instantiated file must say which template ID/version seeded it and that canonical-template equality is not claimed. Routine projection initializes missing files only; it never overwrites repo-owned `AGENTS.md` files. Repo-local guidance may add repository map, commands, repeated local feedback, and directory-specific conventions, but it must not remove or weaken required governance routing, active rule references, claim separation, or conformance gate expectations.

## Codex Rule Catalogue

### ENG-AGENT-CODEX-001 - Codex Guidance Projection

Rule revision: `R2`

Governing sources:

- `ENG-AGENT-001 R2`
- `ENG-BASE-CONFORMANCE-002 R1`

External behavior assumptions:

- Codex `AGENTS.md` discovery behavior verified 2026-07-09
- Codex instruction budget defaults to `32 KiB`

Scope: governed repositories using Codex.

Applies when: repo-local `AGENTS.md`, governance routing, rule-source paths, or Codex instruction size changes.

Rule: Codex guidance routes work through the local governance lock and complete conformance index before reading full governance documents. Rule entries are resolved in the source artifact identified by the index, not through a singular active-profile filename.

Forbidden shapes:

- requiring Codex to read the full standard and every active profile before every routine change;
- requiring prompts to restate active Zoey rules;
- omitting `CONFORMANCE.md` as the complete applicability router;
- routing to a singular `ACTIVE_PROFILE.md` when multiple profiles are supported;
- depending on a personal increase to `project_doc_max_bytes`.

Required checks:

- root `AGENTS.md` first reads `governance/ZOEY_GOVERNANCE.lock` and its declared `CONFORMANCE.md` path;
- guidance resolves applicable entries through `governance/ENGINEERING_STANDARD.md`, `governance/profiles/`, or `governance/integrations/` as identified by the index;
- conformance audit verifies complete applicability coverage before guidance is used as a router;
- conformance audit calculates the required automatic instruction chain for every governed Codex working-directory path and verifies it fits the effective configured budget.

Eligible protection mechanisms:

- structural
- static
- manual-review

Allowed review actors:

- human-review

Minimum promotion enforcement: complete applicability index, valid source-artifact routing, and instruction-budget audit.

Minimum promotion integration: `CI-required`.

Failure consequences:

- promotion-blocking

Review question: does Codex have a short, complete path from changed files to applicable rule IDs, source entries, and local gates?

### ENG-AGENT-CODEX-002 - Monotonic Instruction Specialization

Rule revision: `R2`

Governing sources:

- `ENG-AGENT-001 R2`
- `ENG-BASE-EXCEPTION-001 R1`

External behavior assumptions:

- Codex closer-directory guidance overrides earlier guidance on conflict

Scope: root and nested Codex instruction files.

Applies when: any root, nested, or tracked override Codex guidance file is added or changed.

Rule: nested Codex guidance may specialize or strengthen inherited active engineering rules. It must not weaken, negate, bypass, or silently reinterpret inherited rules.

Forbidden shapes:

- nested SUT guidance allowing public internal transitions when root guidance forbids public API widening;
- nested evaluation guidance bypassing closed SUT ingress;
- tracked `AGENTS.override.md` without an active scoped engineering exception;
- alternate instruction filenames hiding required Zoey guidance;
- treating untracked or personal overrides as conformance evidence.

Required checks:

- guidance review compares nested rule references against inherited rule references;
- tracked `AGENTS.override.md` resolves to an active exception with scope, reason, compensating control, expiry, and non-weakening constraints;
- conformance audit checks tracked instruction paths. Untracked user-local overrides remain outside repository evidence and cannot establish enforcement.

Eligible protection mechanisms:

- static
- manual-review

Allowed review actors:

- human-review

Minimum promotion enforcement: monotonic-specialization audit and valid exception evidence for every tracked override.

Minimum promotion integration: `CI-required`.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: does this instruction file only specialize inherited rules, or does it weaken them?

### ENG-AGENT-CODEX-003 - Instruction Refresh After Governance Changes

Rule revision: `R2`

Governing sources:

- `ENG-AGENT-001 R2`

External behavior assumptions:

- Codex builds the instruction chain once per run/session

Scope: active Codex sessions and governance/instruction changes.

Applies when: a governed change modifies `AGENTS.md`, `AGENTS.override.md`, governance lock baseline fields, active profile/integration selection, or instruction routing configuration.

Rule: do not continue unrelated governed implementation under an old instruction chain without explicitly reloading/verifying guidance or starting a fresh Codex run.

Forbidden shapes:

- updating governance routing then continuing unrelated implementation as if Codex reloaded automatically;
- relying on stale prompt context after a canonical baseline change.

Required checks:

- final report for governance/instruction changes says whether further implementation must start from a fresh run or after explicit guidance reread.

Eligible protection mechanisms:

- manual-review

Allowed review actors:

- human-review

Minimum promotion enforcement: recorded refresh decision before further governed implementation.

Minimum promotion integration: `local-recorded`.

Failure consequences:

- advisory: the session ends or refreshes before further governed implementation;
- promotion-blocking: unrelated governed implementation continues under stale instructions.

Review question: does this session need fresh instruction discovery before further governed implementation?

### ENG-AGENT-CODEX-004 - Path-Scoped Guidance Routing

Rule revision: `R1`

Governing sources:

- `ENG-AGENT-CODEX-001 R2`

External behavior assumptions:

- interactive Codex discovery ends at the current working directory

Scope: governed paths with nested Codex instruction files.

Applies when: Codex edits a governed path below its current working directory, or one task changes paths governed by different nested instruction files.

Rule: before editing a governed target path, Codex applies every more-specific instruction file on the path from its current working directory to the target directory that was not automatically discovered. Per directory, `AGENTS.override.md` takes precedence over `AGENTS.md`. A task spanning differently governed paths reads each applicable path-specific chain before changing that path.

Forbidden shapes:

- assuming descendant `AGENTS.md` files load automatically because Codex later edits a descendant file;
- reading only the closest descendant instruction file when intermediate specialized guidance also applies;
- editing SUT and evaluation paths under different nested guides without reading both guides.

Required checks:

- root guidance directs Codex to discover and read non-discovered path-specific guidance before edits;
- conformance audit exercises representative SUT, evaluation, and nested governed paths against the routing rule.

Eligible protection mechanisms:

- structural
- manual-review

Allowed review actors:

- human-review

Minimum promotion enforcement: path-scoped routing check resolves for every governed path changed by the task.

Minimum promotion integration: `CI-required`.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: did Codex apply every path-specific instruction layer that governs the files it changed?

## Future Skill

A future `zoey-conformance-review` skill may automate rule discovery, diff-to-rule mapping, conformance gate execution, and residual-risk reporting. Such a skill is a reusable review workflow, not an enforcement authority.
