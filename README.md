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
```

The candidate remains immutable, `formed_non_active`, and distinct from the active trial. Proposal intent, SUT selection, simulated realization, raw user response, binding assessment, activation assessment, and active-trial state retain separate identities and exact typed local closure. Unsupported, equal, missing, invalid, or conflicting support/control states remain inspectable without silently creating an active trial. `scn001_eval` owns allowlist projection from evaluation records and a harness that calls only the declared public SUT boundary.

The implemented chain stops at `CP-PROD-ACTIVE`. It does not implement focused-drill behavior, direct correction, delayed-correction trials, later-use applicability, outcomes, explanations, formal evaluation, or scoring.

This is engineering conformance infrastructure. It is not a formal evaluation record, behavioral-compatibility claim, milestone acceptance, or `SCN-001` pass.

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

The boundary spine and production activation chain are implemented through `CP-PROD-ACTIVE`. The next bounded semantic frontier is focused-drill behavior from that retained active trial.

Future increments must continue from the existing exact candidate/proposal/binding/activation closure:

1. preserve the formed/non-active candidate as distinct from the active trial;
2. use the retained active production trial as the bounded basis for focused-drill behavior;
3. keep direct correction, delayed-correction trials, and later-use applicability as later, separate semantic families;
4. extend output and simulator seams only when the next concrete transition requires them.

Focused-drill behavior is not implemented by this README update. No current artifact establishes behavioral compatibility, formal evidence, scoring, milestone acceptance, broader `SCN-001` acceptance, or production readiness.
