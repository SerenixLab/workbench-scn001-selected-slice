# Zoey Repository Instructions

Template ID: `ZOEY-CODEX-AGENTS-BASE`

Template version: `V0.2.0`

Integration: `CODEX_INTEGRATION.md` `V0.1.0`

Instantiation: starting repo-local guidance. Local specialization is allowed; active engineering rules must not be weakened.

This repository contains governed non-throwaway Zoey implementation work.

Repository role: `workbench`.

Governance classification: `governed non-throwaway implementation`.

Permitted architecture claim: `SCN-001 selected-slice scenario-provisional under ADR-001 R1 and ADR-008 R2`.

Governance baseline: `governance/ZOEY_GOVERNANCE.lock`.

Do not treat this workbench as a durable Zoey system-project repository. Creation of, or extraction into, a durable `projects/` repository triggers `REPO-001`.

## Governance Router

Before editing governed code:

1. Read `governance/ZOEY_GOVERNANCE.lock`.
2. Read `governance/CONFORMANCE.md`.
3. Identify applicable `ENG-*` rules from changed paths and change type.
4. Read only the applicable rule entries in `governance/ENGINEERING_STANDARD.md`, `governance/ACTIVE_PROFILE.md`, or `governance/CODEX_INTEGRATION.md`.
5. Read cited source snapshots in `governance/sources/` when the change may alter a governed semantic contract or the rule is ambiguous.

Do not read the full standard/profile for every routine change. Use `CONFORMANCE.md` as the applicability index.

The local governance files are derived snapshots. If they conflict with cited ADRs or registers, stop and report the conflict. Do not silently choose a weaker rule.

## Repository Map

Required when instantiated:

- `governance/`: local governance snapshots, lock, conformance ledger, and source snapshots.
- `scn001_sut_core/`: SUT-owned public boundary, run-scoped state, transition evidence, local relations, and passive inspection.
- `scn001_eval/`: Evaluation-owned fixture projection and harness code that calls only the declared SUT public boundary.
- `tests/`: Repository-level conformance tests; package tests live with their owning package.
- `scripts/`: Dependency, governance, formatting, syntax, and aggregate local-gate checks.

## Commands

Required when instantiated:

- Format: `npm run check:format`
- Code quality: `npm run check:quality`
- Architecture/dependency conformance: `npm run check:deps`
- Boundary conformance: `npm run check:boundary`
- State integrity: `npm run check:state`
- Governance integrity: `npm run check:governance`
- Tests: `npm test`
- All required local gates: `npm run check`

Do not describe an unrun command as passing.

## Always Apply

- `[ENG-BASE-001]` Preserve accepted Zoey decisions over implementation convenience.
- `[ENG-BASE-PUBLISH-001]` Do not rely on a sibling `meta` checkout for routine governance discovery.
- `[ENG-BASE-CONFORMANCE-001]` Do not call a rule enforced unless local evidence resolves and the declared gate runs.
- `[ENG-AGENT-001]` Keep agent guidance routed through local governance and conformance evidence.
- `[ENG-HEALTH-CHANGE-001]` Keep changes focused and reviewable.
- `[ENG-HEALTH-TEST-001]` Add or update tests for behavior changes.
- `[ENG-HEALTH-API-001]` Keep public APIs minimal.
- `[ENG-CLAIM-001]` Separate engineering conformance, evaluated behavioral compatibility, and milestone acceptance.

## Boundary-Bearing Code

Boundary-bearing code includes SUT/evaluation boundaries, fixture projection, simulator routing, state mutation, references, inspection, capture, reporting, replay, restore, and claim artifacts.

Before editing it:

- identify applicable `ENG-CONF-*` rules through `governance/CONFORMANCE.md`;
- read the exact active rule entries;
- read cited source snapshots when the semantic contract may change;
- preserve or update local tests/gates that enforce the rule.

## Done Means

Before completing a governed task:

1. Review the final diff for unrelated or accidental changes.
2. Identify the `ENG-*` rules touched by the final diff.
3. Run the gates required by `governance/CONFORMANCE.md` for those rules.
4. Do not call an unrun check passing.
5. Report every required gate not run and why.
6. Report new residual risk.
7. Update `CONFORMANCE.md` only when enforcement coverage, evidence identity, rule revision, gate mapping, or residual risk changed.

## Instruction Changes

If a change modifies `AGENTS.md`, `AGENTS.override.md`, governance lock, active profile selection, Codex integration, or instruction routing, do not continue unrelated governed implementation under stale instructions without explicitly rereading guidance or starting a fresh Codex run.

Nested `AGENTS.md` files may specialize or strengthen inherited active rules. They must not weaken, negate, bypass, or silently reinterpret them.
