# SCN-001 Selected-Slice Workbench

Repository role: `workbench`

Governance classification: `governed non-throwaway implementation`

Permitted architecture claim: `SCN-001 selected-slice scenario-provisional under ADR-001 R1 and ADR-008 R2`

Governance baseline: `governance/ZOEY_GOVERNANCE.lock`

## Purpose

This workbench exists to execute the first `SCN-001` selected-slice implementation pressure without claiming a durable Zoey system-project repository boundary.

It may realize the accepted ADR-008 two-domain split as code projects or packages:

```text
scn001_eval -> declared scn001_sut_core public boundary
scn001_sut_core -> no dependency on scn001_eval
```

The package split is a selected-slice responsibility boundary. It is not a final Zoey repository map.

## Implemented Boundary Spine

The first implementation increment creates two Node.js workspace packages without external runtime dependencies:

```text
scn001_eval -> @zoey/scn001-sut-core public package export
scn001_sut_core -> no evaluation dependency
```

`scn001_sut_core` provides the minimum run lifecycle, closed SUT-visible input ingress, run-scoped fact/transition/relation retention, and passive inspection surfaces. Its implemented bounded chain is:

```text
raw run-local facts
-> attribution and temporal assessment
-> dimension comparison
-> formed/non-active production candidate
-> candidate-bound proposal
-> proposal realization
-> exact proposal-response binding
-> nine-check activation assessment
-> separate active production trial
-> explicit current focused-drill correction instruction
-> focused-drill behavior disposition
-> exact simulated behavior realization
-> separate short-term focused-drill outcome
-> scoped current spontaneous-session correction/control state
-> direct turn-completion behavior disposition
-> exact direct simulator realization
-> separate formed/non-active delayed-correction candidate
-> separate nine-check delayed activation assessment
-> separate active delayed-correction trial
-> later-use applicability assessment over that same active trial
-> exact-context later behavior disposition
-> exact simulated later-behavior realization
-> intervention-conditioned later outcome plus explicit uncertainty
-> grounded user-facing explanation plus typed retained-state support
```

The candidate remains immutable, `formed_non_active`, and distinct from the active trial. Proposal intent, SUT selection, simulated proposal realization, raw user response, binding assessment, activation assessment, active-trial state, explicit drill instruction, behavior disposition, simulated behavior realization, and short-term outcome retain separate identities and exact typed local closure. The focused-drill outcome establishes only the supplied `5/6` observation and positive current feedback after matched immediate-correction behavior in that exact intervention-conditioned drill. It establishes no long-term efficacy, global preference, spontaneous-production applicability, or future applicability. Unsupported, equal, missing, invalid, or conflicting support/control states remain inspectable without silent selection or semantic promotion. `scn001_eval` owns allowlist projection, exact passive checkpoint gating, and harness transport through only the declared public SUT boundary.

The implemented chain now passes `CP-PROD-ACTIVE`, the bounded `DP-FOCUSED-DRILL` trajectory through `CP-DRILL-REALIZATION-MATCH`, the bounded `DP-DIRECT-CORRECTION` trajectory through `CP-DIRECT-CORRECTION-REALIZED`, and `DP-LATER-USE` plus `DP-REALIZATION` through `CP-CANONICAL-INTERVENTION`. It also implements the bounded SUT engineering closures for `DP-OUTCOME-UPDATE` and `DP-EXPLAIN`. The current user correction changes behavior immediately in the exact current spontaneous session by selecting turn-completion correction timing; it does not request immediate linguistic correction. The prior focused-drill immediate-correction instruction remains valid historical evidence for its different exact scope. Neither instruction is global or cross-surface.

The direct path retains the raw current communication, SUT-derived scoped correction/control state, direct current-session disposition, and exact simulator realization as separate objects. After exact matched realization, the SUT forms one separate Zoey-derived delayed-correction candidate from the current correction, retained focused-drill evidence, spontaneous-production context, and bounded-trial controls. A separate activation assessment revalidates that exact candidate and records all nine required checks from retained basis; it does not use a second user-acceptance event or reinterpret V-003 as approval. Only a sufficient exact assessment creates a separate active delayed-correction trial. The candidate itself remains `formed_non_active`, `not_assessed`, and prohibited from behavior influence; neither record establishes a user preference, global policy, or durable adaptation.

At D10, the SUT rechecks that same active trial against exact current context, same-run state reference, and user-governed/consequence controls. The canonical spontaneous-production branch creates a separate applicable assessment and bounded disposition, then records an exact matched simulator realization without changing the active trial or establishing a global policy. The SUT-visible realization carries only the requested/realized behavior and fidelity. The simulator's full evaluation-side record separately carries the canonical-intervention premise and its derived match result; those evaluator-owned fields are stripped at projection and never control SUT outcome creation. The passive checkpoint reconstructs the premise from retained SUT state and compares it with that private record, so `L-003` through `L-005` remain gated until both behavior fidelity and the independently checked premise close. `CF-DRILL-OPT-IN` instead records explicit `not_applicable` for the focused drill with immediate-correction opt-in; it creates no delayed disposition and does not fabricate narrowing, supersession, or retirement.

The later outcome records only that the exact delayed-correction intervention was followed in the tested spontaneous-production context by longer speaking and positive pacing feedback. It explicitly retains the lack of a Zoey-visible co-intervention as non-exhaustive: private or unobserved causes are not excluded. Causality, long-term efficacy, global preference, fixed learning style, and fatigue remain `not_established`. The explanation consumes typed retained lineage spanning stale-history assessment, current calibration, production trial, focused instruction and outcome, direct correction, delayed candidate and activation, later applicability and realization, outcome, and uncertainty. Its support record explicitly says hidden chain-of-thought is neither required nor retained; evaluation checks support closure plus a closed bounded sentence grammar that permits declared benign wording variance and rejects every unrecognized or appended clause.

This is engineering conformance infrastructure. It is not a formal evaluation record, behavioral-compatibility claim, milestone acceptance, or `SCN-001` pass.

## Corrective Review Status

A broader review of complete Phase 5–6 range `7cff4e0..4376bcc` invalidated the
current standing of the earlier change-specific passing reviews. Those reviews
remain historical evidence, but they did not cover creator-pointer parity,
processing rollback, output multiplicity, mixed-claim explanation text, or
global terminal-family ambiguity completely.

Corrective implementation commits `f3af30c`, `6dc45b8`, and `15d5ab4`
strengthen those boundaries with symmetric hostile coverage; the accompanying
review package adds a complete parity inventory, and the latest follow-up
replaces open-ended explanation denylisting with a closed bounded grammar while
closing the remaining transition, ingestion, attribution, and failure-state
parity gaps. Fresh independent review passed exact corrective range
`4376bcc..6e57840` with no blocking finding. The corrected head's engineering
status is therefore **implemented, locally green, and independently reviewed**.
Targeted pre-formal hardening `a7d787f` additionally requires every newly
retained fixture-initialized communication to contribute exactly one initialized
assertion result on both SUT and evaluator ingress. Fresh independent review of
the complete initialization-hardening range `6e57840..6d8b41d` passed with no
blocking finding, so the current implementation may serve as a prospective
Phase 7 code baseline. That review cannot promote any existing run, capture,
trace, checkpoint, or artifact into formal evidence. `ADR-010 R3`, `ADR-011
R3`, and `ADR-012 R3` are accepted; their projection and start-readiness
reviews closed at `e6e1dc1`. Phase 7 implementation may now proceed in the
accepted prospective authority order. No formal campaign authorization, formal
evaluation evidence, compatibility result, bounded campaign result, completion
artifact, or extraction work has started.

## Local Commands

Requires Node.js `>=22 <27` and Python `>=3.11` for the portable governance checker; no external runtime dependencies are used.

- Format: `npm run check:format`
- Code quality: `npm run check:quality`
- Architecture/dependency conformance: `npm run check:deps`
- Boundary conformance: `npm run check:boundary`
- State integrity: `npm run check:state`
- Governance integrity: `npm run check:governance`
- Tests: `npm test`
- All required local gates: `npm run check`

The GitHub Actions workflow runs `npm run check` for pull requests and pushes to `main`. Repository branch-protection configuration remains an external review responsibility.

## Not Claimed

This workbench does not claim:

- durable Zoey system-project boundary;
- final Zoey module split;
- general Zoey core;
- general memory architecture;
- general growth architecture;
- permanent evaluation architecture;
- full `SCN-001` pass;
- milestone acceptance;
- broader `SCN-001` acceptance;
- production readiness.

## Extraction Rule

Milestone success, code maturity, age, reuse, or repository renaming does not independently justify placement under `projects/`.

Durable system-project extraction is blocked pending `REPO-001` or an equivalent accepted responsibility-boundary decision.

## Current Semantic Frontier

The selected engineering chain is implemented through `DP-OUTCOME-UPDATE` and
`DP-EXPLAIN`, including exact `CP-CANONICAL-INTERVENTION` gating and the
mandatory `CF-DRILL-OPT-IN` counterpressure. Accepted `ADR-010 R3`, `ADR-011
R3`, and `ADR-012 R3` now govern the next phase's behavior/evaluation manifests,
prospective campaign authority, durable formal records/evidence, campaign and
namespace indexes, bounded aggregation, result standing, and claim ceiling.

Phase 7 start review is complete. Section 7A implements configuration identity,
canonical fingerprints, exact references, and fail-closed comparisons; it does
not authorize or execute a campaign. Every eventual formal artifact must still
be created prospectively under the accepted anchor/fresh-start chain; no current
or historical development artifact is eligible for promotion. No current
artifact establishes behavioral compatibility, formal evidence, scoreability,
bounded pass/fail, milestone acceptance, broader `SCN-001` acceptance, or
production readiness. Durable repository extraction remains blocked by
`REPO-001`.

`PHASE7_READINESS.md` records the completed start approval and the strict
boundary between implementation readiness and formal campaign authority.
