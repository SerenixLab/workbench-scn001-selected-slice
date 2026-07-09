# SCN-001 Workbench Conformance Ledger

This ledger records local enforcement status for governed non-throwaway work in this workbench.

No implementation code exists yet. Entries start as `uncovered` or `review-only` until local mechanisms are added.

## Repository Claim Boundary

Rule ID: `ENG-BASE-REPO-001`
Rule revision: `R1`
Governing source revisions: `ENGINEERING_STANDARD.md V0.4.1`; `OPEN_QUESTIONS.md V0.2.18`
Applies To: workbench repository role and architecture claim
Actual mechanisms: structural; manual-review
Actual test modes: contract
Promotion integration: local
Status: review-only
Failure consequences: promotion-blocking; claim-blocking
Local evidence: `README.md`; `governance/ZOEY_GOVERNANCE.lock`
Residual risk: no automated lock validation yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold

Rule ID: `ENG-CLAIM-WORKBENCH-001`
Rule revision: `R1`
Governing source revisions: `ADR-001 R1`; `ADR-008 R2`; `OPEN_QUESTIONS.md V0.2.18`; `ENG-BASE-REPO-001 R1`
Applies To: workbench placement, README claims, extraction boundary
Actual mechanisms: structural; manual-review
Actual test modes: contract
Promotion integration: local
Status: review-only
Failure consequences: promotion-blocking; claim-blocking
Local evidence: `README.md`; `governance/ZOEY_GOVERNANCE.lock`
Residual risk: `projects/` extraction has no automated trigger check yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold

## Boundary-Critical Rules

These rules must be upgraded before claim-bearing selected-slice behavior work.

Rule ID: `ENG-CONF-IMPORT-001`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`
Applies To: `scn001_sut_core`
Actual mechanisms: none yet
Actual test modes: none yet
Promotion integration: none yet
Status: uncovered
Failure consequences: merge-blocking; claim-blocking
Local evidence: none yet
Residual risk: dependency direction not mechanically enforced yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold

Rule ID: `ENG-CONF-IMPORT-002`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`; `ENG-HEALTH-API-001 R1`
Applies To: `scn001_eval`
Actual mechanisms: none yet
Actual test modes: none yet
Promotion integration: none yet
Status: uncovered
Failure consequences: merge-blocking; claim-blocking
Local evidence: none yet
Residual risk: public SUT boundary does not exist yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold

Rule ID: `ENG-CONF-PAYLOAD-001`
Rule revision: `R1`
Governing source revisions: `ADR-005 R2`; `ADR-008 R2`
Applies To: future SUT ingress and evaluation-origin payload projection
Actual mechanisms: none yet
Actual test modes: none yet
Promotion integration: none yet
Status: uncovered
Failure consequences: merge-blocking; claim-blocking
Local evidence: none yet
Residual risk: closed ingress does not exist yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold

Rule ID: `ENG-CONF-PUBLIC-001`
Rule revision: `R1`
Governing source revisions: `ADR-008 R2`; `ENG-HEALTH-API-001 R1`
Applies To: future SUT public boundary
Actual mechanisms: none yet
Actual test modes: none yet
Promotion integration: none yet
Status: uncovered
Failure consequences: merge-blocking; claim-blocking
Local evidence: none yet
Residual risk: public SUT boundary does not exist yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold

Rule ID: `ENG-CONF-RUN-001`
Rule revision: `R1`
Governing source revisions: `ADR-004 R3`; `ADR-008 R2`
Applies To: future run lifecycle and run-scoped state
Actual mechanisms: none yet
Actual test modes: none yet
Promotion integration: none yet
Status: uncovered
Failure consequences: merge-blocking; claim-blocking
Local evidence: none yet
Residual risk: run lifecycle does not exist yet
Reviewer/Owner: implementation maintainer
Verified at: initial scaffold
