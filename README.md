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
```

The candidate remains immutable, `formed_non_active`, and distinct from the active trial. Proposal intent, SUT selection, simulated proposal realization, raw user response, binding assessment, activation assessment, active-trial state, explicit drill instruction, behavior disposition, simulated behavior realization, and short-term outcome retain separate identities and exact typed local closure. The focused-drill outcome establishes only the supplied `5/6` observation and positive current feedback after matched immediate-correction behavior in that exact intervention-conditioned drill. It establishes no long-term efficacy, global preference, spontaneous-production applicability, or future applicability. Unsupported, equal, missing, invalid, or conflicting support/control states remain inspectable without silent selection or semantic promotion. `scn001_eval` owns allowlist projection, exact passive checkpoint gating, and harness transport through only the declared public SUT boundary.

The implemented chain now passes `CP-PROD-ACTIVE` and the bounded `DP-FOCUSED-DRILL` trajectory through `CP-DRILL-REALIZATION-MATCH` to its separate short-term drill outcome. It does not implement direct correction, delayed-correction trials, later-use applicability, later outcomes, explanations, formal evaluation, or scoring.

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

The boundary spine, production activation chain, and current focused-drill trajectory are implemented through the short-term focused-drill outcome. The next bounded semantic frontier is direct current-session correction after that retained focused-drill evidence.

Future increments must continue from the existing exact candidate/proposal/binding/activation closure:

1. preserve the formed/non-active candidate as distinct from the active trial;
2. preserve the focused-drill instruction, behavior disposition, simulated realization, and short-term outcome as distinct exact retained objects;
3. implement direct correction, delayed-correction trials, and later-use applicability only as later, separate semantic families;
4. extend output and simulator seams only when the next concrete transition requires them.

Direct correction and every later semantic family remain unimplemented. No current artifact establishes behavioral compatibility, formal evidence, scoring, milestone acceptance, broader `SCN-001` acceptance, or production readiness.
