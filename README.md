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

`scn001_sut_core` currently provides only the minimum run lifecycle, closed SUT-visible input ingress, run-scoped fact/transition/relation retention, and passive inspection surfaces. `scn001_eval` owns allowlist projection from evaluation records and a harness that calls only that public SUT boundary.

This is engineering conformance infrastructure. It is not a formal evaluation record, behavioral-compatibility claim, milestone acceptance, or `SCN-001` pass.

## Local Commands

Requires Node.js `>=22 <27`; no external runtime dependencies are used.

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
- production readiness.

## Extraction Rule

Milestone success, code maturity, age, reuse, or repository renaming does not independently justify placement under `projects/`.

Durable system-project extraction is blocked pending `REPO-001` or an equivalent accepted responsibility-boundary decision.

## Initial Implementation Order

Build the minimum boundary spine together with concrete selected-slice pressure. Do not build a generic Zoey platform first.

Initial sequence:

1. mechanically enforce `scn001_eval -> scn001_sut_core` only;
2. create the smallest closed SUT ingress needed by the first fixture facts;
3. create run-scoped state identity, ordering, and reference primitives required by accepted selected-slice decisions;
4. implement the first concrete transition segment;
5. add passive inspection for state and evidence actually produced;
6. extend output and simulator seams only when the next concrete transition requires them.
