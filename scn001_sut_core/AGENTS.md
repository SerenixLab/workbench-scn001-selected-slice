# Zoey SUT Core Instructions

Template ID: `ZOEY-CODEX-AGENTS-SUT`

Template version: `V0.2.0`

Integration: `CODEX_INTEGRATION.md` `V0.1.0`

Instantiation: starting nested SUT guidance. Local specialization is allowed; inherited active rules must not be weakened.

This directory is SUT-owned implementation code.

Apply the root repository instructions first, then this SUT-specific guidance.

## Boundary Rules

- `[ENG-CONF-IMPORT-001]` SUT code must not import, reflect into, configure, or depend on evaluation code.
- `[ENG-CONF-PAYLOAD-001]` SUT public ingress must be closed against evaluation-only and undeclared evaluation-origin material.
- `[ENG-CONF-PAYLOAD-002]` Rejected ingress must have no selected-slice semantic side effects.
- `[ENG-CONF-PUBLIC-001]` SUT public boundary must not expose answer selectors or internal transition commands.
- `[ENG-HEALTH-API-001]` Do not expose internals just to simplify tests or evaluation setup.
- `[ENG-CONF-REF-001]` SUT-visible references and handles must not encode evaluation context.

## State And Inspection Rules

- `[ENG-CONF-RUN-001]` Do not introduce mutable global, singleton, cache, or provider/session state that can carry selected-slice semantic state across independent runs.
- `[ENG-CONF-STATE-001]` Do not introduce retrieval, relevance ranking, distractor filtering, broad memory search, or context assembly.
- `[ENG-CONF-STATE-002]` Behavior-driving semantic mutations must be attributable to SUT-owned transition responsibilities.
- `[ENG-CONF-DEP-001]` Do not backfill basis-use or dependency evidence after a transition as proof that the transition consumed it.
- `[ENG-CONF-DEP-002]` Later narrowing, retirement, or mutation must not rewrite the state/status/scope seen by an earlier material relation.
- `[ENG-CONF-INSPECT-001]` Inspection must not mutate, repair, activate, retire, narrow, or create behavior-driving state or relation evidence.
- `[ENG-CONF-INSPECT-002]` Inspection must be interleaving-safe.

## Review Focus

Before completing a SUT change, check whether it affects:

- SUT public input/output contracts;
- selected-slice state mutation;
- relation or reference identity;
- transition evidence;
- inspection surfaces;
- run lifecycle state;
- logs, snapshots, replay, or restore behavior;
- claim labels or report text.

If yes, update tests or the conformance ledger for the applicable `ENG-CONF-*` rules.

