# SCN-001 Workbench Conformance Ledger

This ledger records local enforcement status for governed non-throwaway work in this workbench.

The initial two-package boundary spine and first semantic segment exist. The SUT can derive attributed current-user assertions and selected temporal eligibility from raw input, but it does not create current-skill facts, trial candidates, active trials, behavior dispositions, or outcomes. No formal evaluation record, behavioral-compatibility claim, scoreability claim, or milestone-acceptance claim exists yet.

Entries remain `review-only` until a human or project-owner-authorized reviewer records the required manual controls and repository branch protection confirms any required CI gate. Local automated mechanisms and commands are identified below.

## Repository Claim Boundary

Rule ID: `ENG-BASE-REPO-001`
Rule revision: `R1`
Governing source revisions: `ENGINEERING_STANDARD.md V0.4.1`; `OPEN_QUESTIONS.md V0.2.18`
Applies To: workbench repository role and architecture claim
Actual mechanisms: structural declaration; `scripts/check-governance-lock.mjs`; manual-review
Actual test modes: contract
Promotion integration: local `npm run check:governance`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: promotion-blocking; claim-blocking
Local evidence: `README.md`; `governance/ZOEY_GOVERNANCE.lock`; `scripts/check-governance-lock.mjs`; `tests/conformance/boundary.test.js`
Residual risk: protected-branch required-check configuration and human review are not verified locally
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CLAIM-WORKBENCH-001`
Rule revision: `R1`
Governing source revisions: `ADR-001 R1`; `ADR-008 R2`; `OPEN_QUESTIONS.md V0.2.18`; `ENG-BASE-REPO-001 R1`
Applies To: workbench placement, README claims, extraction boundary
Actual mechanisms: structural declaration; manual-review
Actual test modes: contract
Promotion integration: local `npm run check`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: promotion-blocking; claim-blocking
Local evidence: `README.md`; `governance/ZOEY_GOVERNANCE.lock`
Residual risk: `projects/` extraction has no automated trigger check yet; protected-branch review is not verified locally
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

## Boundary-Critical Rules

These rules must be upgraded before claim-bearing selected-slice behavior work.

Rule ID: `ENG-CONF-IMPORT-001`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`
Applies To: `scn001_sut_core`
Actual mechanisms: package exports; `scripts/check-dependency-boundary.mjs`; manual-review
Actual test modes: contract
Promotion integration: local `npm run check:deps`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/package.json`; `scn001_sut_core/index.js`; `scripts/check-dependency-boundary.mjs`; `tests/conformance/boundary.test.js`
Residual risk: checker covers local ESM source and declared dependencies only; required-CI and human review are not verified locally
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-IMPORT-002`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`; `ENG-HEALTH-API-001 R1`
Applies To: `scn001_eval`
Actual mechanisms: SUT package export map; evaluation public-package import; static dependency checker that forbids production dynamic loaders; negative import test; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:deps`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/package.json`; `scn001_eval/src/harness.js`; `scripts/check-dependency-boundary.mjs`; `scn001_eval/test/harness.test.js`; `tests/conformance/boundary.test.js`
Residual risk: only the boundary spine exists; later behavior-evidence tests must remain public-boundary driven
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-PAYLOAD-001`
Rule revision: `R1`
Governing source revisions: `ADR-005 R2`; `ADR-008 R2`
Applies To: future SUT ingress and evaluation-origin payload projection
Actual mechanisms: exact-key runtime validation; evaluation allowlist projection; atomic validation and run-local reference resolution before run-state mutation; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:boundary`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/inputValidation.js`; `scn001_eval/src/fixtureProjection.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/test/harness.test.js`
Residual risk: later input roles and serializers require new negative cases before use
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-PUBLIC-001`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`; `ENG-HEALTH-API-001 R1`
Applies To: future SUT public boundary
Actual mechanisms: narrow boundary-method object; exact arity validation; public API contract test; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:boundary`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/public-boundary.test.js`
Residual risk: future public API additions require source and consumer review
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-RUN-001`
Rule revision: `R1`
Governing source revisions: `ADR-004 R3`; `ADR-008 R2`
Applies To: future run lifecycle and run-scoped state
Actual mechanisms: closure-owned run map; run disposal; opaque run references; independent-run test; manual-review
Actual test modes: negative; replay
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: no provider, cache, replay, or simulator integration exists yet; each requires its own isolation coverage
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

## Additional Boundary-Spine Rules

Rule ID: `ENG-CONF-PAYLOAD-002`
Rule revision: `R1`
Governing source revisions: `ADR-005 R2`; `ADR-006 R2`; `ADR-008 R2`
Applies To: SUT public input validation and ingestion
Actual mechanisms: validation and run-local reference resolution complete before run-state mutation; rejected input cannot consume semantic order; manual-review
Actual test modes: negative; contract
Promotion integration: local `npm run check:boundary`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: later deserializers and telemetry paths do not exist and must preserve atomic rejection
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-ROLE-001`
Rule revision: `R1`
Governing source revisions: `ADR-005 R2`; `ADR-006 R2`
Applies To: evaluation fixture projection
Actual mechanisms: role-specific allowlist projection with exact input keys; adapter negative test; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:boundary`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_eval/src/fixtureProjection.js`; `scn001_eval/test/harness.test.js`
Residual risk: simulator and fuller fixture role projections are not implemented yet
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-HARNESS-001`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`
Applies To: evaluation harness delivery and output routing
Actual mechanisms: harness transports projected inputs through the public boundary and has no semantic-output selection; manual-review
Actual test modes: contract
Promotion integration: local `npm run check:boundary`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_eval/src/harness.js`; `scn001_eval/test/harness.test.js`
Residual risk: no simulator or competing SUT output exists yet; non-arbitration requires negative tests when those paths are added
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-STATE-001`
Rule revision: `R1`
Governing source revisions: `ADR-004 R3`; `ADR-006 R2`; `ADR-007 R3`
Applies To: current SUT run-scoped state access
Actual mechanisms: run-local record map and direct reference lookup only; no retrieval/ranking API; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/runState.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: later-use applicability behavior is not implemented and must remain locally bounded
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-STATE-002`
Rule revision: `R1`
Governing source revisions: `ADR-003 R2`; `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2`
Applies To: SUT-owned input ingestion and transition evidence
Actual mechanisms: ingestion, attribution, and temporal-assessment transitions record contemporaneous inputs, outputs, relations, and order; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: no behavior-driving trial mutation exists yet; each future transition requires its own mutation-provenance tests
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-DEP-001`
Rule revision: `R1`
Governing source revisions: `ADR-003 R2`; `ADR-007 R3`; `ADR-008 R2`
Applies To: source and basis relation capture
Actual mechanisms: source and basis relations are created inside each ingestion, attribution, and temporal-assessment transition; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: trial, activation, and outcome dependency consumers do not exist yet and require their own no-post-hoc-repair tests
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-INSPECT-001`
Rule revision: `R1`
Governing source revisions: `ADR-006 R2`; `ADR-008 R2`
Applies To: public SUT inspection surfaces
Actual mechanisms: inspection returns cloned state/relations and never calls mutation paths; invariance test; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: inspection coverage must expand with lifecycle and derived projections
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-INSPECT-002`
Rule revision: `R1`
Governing source revisions: `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2`
Applies To: inspection interleaved with current attribution and temporal-eligibility processing/output paths
Actual mechanisms: inspection does not alter records, relation sets, or order; interleaving tests compare later attribution and temporal-assessment output; manual-review
Actual test modes: interleaving; replay; negative
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: equivalence must be re-proven for candidate, activation, correction, and outcome transitions
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-CAPTURE-001`
Rule revision: `R1`
Governing source revisions: `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2`
Applies To: harness capture of SUT inspection snapshots
Actual mechanisms: capture calls passive inspection only; closed ingress rejects captured snapshots as input; manual-review
Actual test modes: contract; negative; replay
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_eval/src/harness.js`; `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: reporting, snapshot restore, and replay features are not implemented yet
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-REF-001`
Rule revision: `R1`
Governing source revisions: `ADR-005 R2`; `ADR-007 R3`; `ADR-008 R2`
Applies To: SUT run, state, transition, actor, and relation references
Actual mechanisms: generated opaque SUT references; exact state-handle validation; same-run resolution before ingress; evaluation-context identifier rejection; manual-review
Actual test modes: contract; negative
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: merge-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/runState.js`; `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: lifecycle effective-endpoint versioning is not needed until mutable selected-slice state exists
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-BASE-001`
Rule revision: `R1`
Governing source revisions: `ADR-003 R2`; `ADR-005 R2`; `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2`; `ENGINEERING_STANDARD.md V0.4.1`
Applies To: current attribution and temporal-eligibility implementation segment
Actual mechanisms: raw chronology-only ingress; SUT-owned attribution and `>90`-day eligibility transitions; source/basis relation inspection; manual-review
Actual test modes: contract; negative; regression
Promotion integration: local `npm run check:state`; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: promotion-blocking; claim-blocking
Local evidence: `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`
Residual risk: fixture-initialized historical semantic status, recognition/production comparison, trial formation, and behavioral transitions remain unimplemented
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

Rule ID: `ENG-CONF-CLAIM-001`
Rule revision: `R1`
Governing source revisions: `OPEN_QUESTIONS.md V0.2.18`; `ADR-004 R3`; `ADR-005 R2`; `ENG-CLAIM-001 R1`
Applies To: current README, tests, and conformance ledger
Actual mechanisms: bounded engineering-conformance language; manual-review
Actual test modes: contract
Promotion integration: local review; CI workflow `.github/workflows/ci.yml`
Status: review-only
Failure consequences: claim-blocking
Local evidence: `README.md`; `governance/CONFORMANCE.md`; `governance/sources/OPEN_QUESTIONS.md`
Residual risk: first evaluation-record, scoreability, and acceptance claims must re-triage `EVAL-004`, `EVAL-005`, and `SLICE-005`
Reviewer/Owner: implementation maintainer
Verified at: local `npm run check` on 2026-07-10; commit pending

## Applicability Index Migration

This generated migration section completes lock coverage. Each row remains `revalidation-required` until the repository owner maps legacy evidence to the current rule revision.

| Rule ID | Revision | Rule source artifact | Applicability | Rationale / applies to paths and change types | Status | Local evidence | Actual promotion mechanism |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ENG-AGENT-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-AGENT-CODEX-001` | `R2` | `integrations/CODEX_INTEGRATION.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-AGENT-CODEX-002` | `R2` | `integrations/CODEX_INTEGRATION.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-AGENT-CODEX-003` | `R2` | `integrations/CODEX_INTEGRATION.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-AGENT-CODEX-004` | `R1` | `integrations/CODEX_INTEGRATION.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-002` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-CONFORMANCE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-CONFORMANCE-002` | `R1` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-EXCEPTION-001` | `R1` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-PROFILE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-PUBLISH-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-BASE-REPO-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CHANGE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CLAIM-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CLAIM-002` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CLAIM-WORKBENCH-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-CAPTURE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-CLAIM-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-DEP-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-DEP-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-EVIDENCE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-HARNESS-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-IMPORT-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-IMPORT-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-INSPECT-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-INSPECT-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-PAYLOAD-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-PAYLOAD-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-PUBLIC-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-REF-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-ROLE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-RUN-001` | `R3` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-SIM-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-STATE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-CONF-STATE-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-ABSTRACTION-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-API-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-CHANGE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-COMMENT-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-DEAD-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-DEPENDENCY-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-FAILURE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-GEN-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-REPRO-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-STRUCTURE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-TEST-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-TEST-002` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
| `ENG-HEALTH-TODO-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Seeded during governance migration; owner must confirm scope. | revalidation-required | Legacy evidence requires rule-revision remapping. | TBD |
