# SCN-001 Workbench Conformance Ledger

This ledger is the complete applicability router for the 49 rules pinned by `governance/ZOEY_GOVERNANCE.lock`. The ADR-009 governance revalidation and its historical verification basis are preserved below against workbench `HEAD` `9e8197e` plus the canonical projection from `zoey-meta` commit `6726ebef553b38db1d860ab207b4549db0dd57a0`.

Later change-specific addenda and independent-review closures record subsequent selected-slice semantic increments without rewriting that historical verification basis. The projected lock and snapshot digests identify the exact canonical governance basis; each change-specific record identifies its own starting commit, scope, and review disposition.

The workbench contains a two-package boundary spine and a stabilized semantic segment. The SUT derives attributed current-user assertions, selected temporal eligibility, scoped recognition/spontaneous-production comparisons, immutable non-active trial candidates, distinct candidate-bound proposal intents, and separate non-activation dispositions from raw run-local source facts and exact typed local relation closure.
It does not create current-skill facts, surfaced proposal wording, public realization output, simulator realization, response binding, activation assessment, active trials, behavior outputs, or outcomes.
There is no formal evaluation record, behavioral-compatibility claim, scoreability claim, milestone-acceptance claim, replay/restore path, or durable repository extraction.

## Ledger Conventions

The table below is the sole authoritative applicability disposition. 
A rule is `not-applicable` only when its canonical trigger is absent from the current repository. Adding the named surface or artifact invalidates that disposition and requires a ledger update.

Repository-owner-authorized human review confirmed the R2/R3 applicability remapping on 2026-07-10 for the historical pre-ADR-009 governance basis. 
That review remains a historical fact and is not represented as a new human review of this projection. 
Status follows the canonical status model:

- `review-only`: the applicable rule's canonical minimum is a qualifying recorded review, and that review is recorded below;
- `uncovered`: an applicable rule lacks a required check or its required promotion integration, including every `CI-required` rule while protected required-check configuration remains unverified;
- `revalidation-required`: the governing source, rule, profile, or integration basis changed and the required revalidation has not yet been completed;
- `N/A`: the rule is `not-applicable`; this is not an enforcement claim and must be revisited when its stated future trigger occurs.

Unless a row says otherwise:

- **Reviewer/Owner:** the repository owner supplied the historical review and ADR-009 projection review recorded below. Changed rows identify the applicable owner or independent-agent review closure where revalidation was completed.
- **Active exception:** none; `governance/EXCEPTIONS.md` does not exist.
- **Actual promotion mechanism:** local `npm run check`; GitHub Actions `.github/workflows/ci.yml` runs the same command for pull requests and pushes to `main`; required-check/branch-protection configuration is not verified locally.
- **Verified at:** evidence resolved against base `HEAD` `9e8197e`, canonical meta commit `6726ebef553b38db1d860ab207b4549db0dd57a0`, the exact projected digests in `governance/ZOEY_GOVERNANCE.lock`, and this ledger working tree; command results are recorded after the table.

## Complete Applicability And Evidence Index

| Rule ID | Revision | Rule source artifact | Applicability | Rationale / applies to paths and change types | Governing source revisions | Actual mechanisms and test modes | Local evidence | Actual promotion mechanism | Status | Failure consequences | Residual risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ENG-AGENT-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Coding agents perform governed work; applies to repository guidance and every governed agent change. | Rule entry; `ENG-BASE-PUBLISH-001 R2`; `ENG-BASE-CONFORMANCE-002 R1` | Structural guidance; governance audit; manual review. Contract mode. | `AGENTS.md`; nested package `AGENTS.md` files; `governance/ZOEY_GOVERNANCE.lock`; `governance/CONFORMANCE.md`; `scripts/check-governance-lock.mjs` | Repository-owner-authorized review recorded below; local guidance reread required before governed edits. | review-only | promotion-blocking | Review is recorded for this baseline; future guidance changes require a new qualifying review. |
| `ENG-AGENT-CODEX-001` | `R2` | `integrations/CODEX_INTEGRATION.md` | applicable | Codex is active and this index is its rule router; applies to guidance, routing paths, and instruction-budget changes. | `ENG-AGENT-001 R2`; `ENG-BASE-CONFORMANCE-002 R1` | Structural routing; static governance audit. Contract mode. | `AGENTS.md`; `governance/zoey_governance.py`; `scripts/check-governance-lock.mjs`; nested package `AGENTS.md` files | Default | uncovered | promotion-blocking | The audit checks routing terms and stale paths but does not calculate every automatic instruction chain against the configured byte budget. |
| `ENG-AGENT-CODEX-002` | `R2` | `integrations/CODEX_INTEGRATION.md` | applicable | Root and nested Codex guidance exist; applies whenever any such file or tracked override changes. | `ENG-AGENT-001 R2`; `ENG-BASE-EXCEPTION-001 R1` | Structural inherited guidance; partial static audit; manual review. Contract mode. | `AGENTS.md`; `scn001_sut_core/AGENTS.md`; `scn001_eval/AGENTS.md`; `governance/zoey_governance.py` | Default | uncovered | merge-blocking; promotion-blocking | No automated monotonic-specialization comparison or tracked-override-to-exception validation exists. |
| `ENG-AGENT-CODEX-003` | `R2` | `integrations/CODEX_INTEGRATION.md` | applicable | The lock, profile, integration metadata, and source closure changed in this task. | `ENG-AGENT-001 R2` | Codex explicitly reread root guidance and the new lock after projection; qualifying owner review is recorded in `ADR-009 Projection Owner And Independent Review Closure`. | `AGENTS.md`; `governance/ZOEY_GOVERNANCE.lock`; `governance/integrations/CODEX_INTEGRATION.md` | Local refresh performed; qualifying owner review recorded below. | review-only | advisory or promotion-blocking by condition | The instruction chain and projected lock were reviewed for this baseline; future qualifying routing or governance changes require a new human refresh review. |
| `ENG-AGENT-CODEX-004` | `R1` | `integrations/CODEX_INTEGRATION.md` | applicable | Nested SUT and evaluation guidance exists below the repository working directory; applies to edits under either package. | `ENG-AGENT-CODEX-001 R2` | Root routing instruction; manual path-chain review. | `AGENTS.md`; `scn001_sut_core/AGENTS.md`; `scn001_eval/AGENTS.md` | Default | uncovered | promotion-blocking; claim-blocking | The governance audit does not exercise representative SUT/evaluation paths or prove every changed-path chain resolved. |
| `ENG-BASE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | All implementation, tests, docs, and governance artifacts depend on accepted Zoey decisions; this projection adds the accepted ADR-009 completion basis. | `OPEN_QUESTIONS.md V0.2.20`; pinned ADR snapshots through `ADR-009 R4` | Local pinned sources; governance digest audit; source-authority comparison against canonical meta. Contract mode. | `governance/ZOEY_GOVERNANCE.lock`; `governance/sources/`; `scripts/check-governance-lock.mjs`; `README.md` | Automated projection checks plus agent source review; qualifying owner source-authority review recorded below. | uncovered | promotion-blocking; claim-blocking | The canonical source worktree is clean, projection integrity resolves, and owner source-authority review is recorded for this basis; CI-required promotion integration remains unverified. |
| `ENG-BASE-002` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Standard `V0.6.0`, profile `V0.4.0`, integration `V0.2.1`, source closure, digests, and four rule revisions changed; this ledger explicitly remaps affected rules. | Rule entry | Lock-to-index structural mapping; source-bound affected-rule audit. Contract mode. | `governance/ZOEY_GOVERNANCE.lock`; this complete ledger; canonical revalidation record in meta commit `6726ebe` | Local governance audit and agent revalidation; qualifying owner confirmation recorded below. | uncovered | claim-blocking | The changed basis and rule-level remapping received owner confirmation; CI-required promotion integration remains unverified. |
| `ENG-BASE-CONFORMANCE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | This ledger is being audited and cites gates, evidence paths, revisions, and statuses. | Rule entry | Evidence-path review; partial static conformance audit; aggregate local gate. Contract mode. | `governance/CONFORMANCE.md`; `governance/zoey_governance.py`; `scripts/run-gates.mjs`; `.github/workflows/ci.yml` | Default | uncovered | promotion-blocking; claim-blocking | The checker validates coverage and non-applicable rationales but not revisions, evidence existence, gate names, promotion integration, or status consistency. |
| `ENG-BASE-CONFORMANCE-002` | `R1` | `ENGINEERING_STANDARD.md` | applicable | The active governance set changed and this index must disposition all 49 locked rules exactly once. | Canonical governance lock | Complete table; lock coverage audit; repository-specific rationales. Contract mode. | `governance/ZOEY_GOVERNANCE.lock`; this table; `governance/zoey_governance.py` | Default | uncovered | promotion-blocking; claim-blocking | Agent exactness review and the recorded owner review found complete coverage; the checker still does not detect duplicate ledger rows or ledger-to-lock revision mismatch. |
| `ENG-BASE-EXCEPTION-001` | `R1` | `ENGINEERING_STANDARD.md` | not-applicable | No exception, compensating-control proposal, or tracked `AGENTS.override.md` exists. Future trigger: creation of any such artifact or proposed deviation. | Rule entry | Repository inventory and governance audit. | No `governance/EXCEPTIONS.md` or tracked `AGENTS.override.md`; `rg --files` inventory | Not applicable until trigger. | N/A | promotion-blocking; claim-blocking | Applicability must be revisited before any deviation is proposed. |
| `ENG-BASE-PROFILE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The active selected-slice profile changed from `V0.3.1` to `V0.4.0`; only one profile remains active. | Rule entry | Lock structure and digest validation; agent composition review. Contract mode. | `governance/ZOEY_GOVERNANCE.lock`; `governance/profiles/SCN001_SELECTED_SLICE.md`; `scripts/check-governance-lock.mjs` | Automated projection checks; qualifying owner profile-conflict review recorded below. | uncovered | promotion-blocking; claim-blocking | Structural composition resolves, there is no second active profile, and owner semantic non-conflict review is recorded for this profile basis; future profile composition changes require fresh review. |
| `ENG-BASE-PUBLISH-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | This governed workbench consumes a pinned local projection synchronized transactionally from clean canonical meta commit `6726ebe`. | Rule entry | Local snapshot/digest validation and completeness audit. Contract mode. | `governance/`; `governance/ZOEY_GOVERNANCE.lock`; `governance/zoey_governance.py`; `scripts/check-governance-lock.mjs` | Default | uncovered | promotion-blocking; claim-blocking | Projection integrity resolves and canonical worktree state is clean; protected required-check configuration remains unverified. |
| `ENG-BASE-REPO-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The repository remains a governed workbench used for claim-bearing non-throwaway implementation; `REPO-001` is unchanged in the new register. | `OPEN_QUESTIONS.md V0.2.20` | Structural declarations; governance and boundary contract checks; source comparison. | `README.md`; `AGENTS.md`; `governance/ZOEY_GOVERNANCE.lock`; `tests/conformance/boundary.test.js` | Historical owner review preserved; qualifying owner review of the V0.2.20 register basis recorded below. | review-only | promotion-blocking; claim-blocking | The repository-role obligation remains unchanged and the new register basis received owner review; future extraction or promotion still requires a fresh `REPO-001` trigger review. |
| `ENG-CHANGE-001` | `R3` | `ENGINEERING_STANDARD.md` | applicable | The workbench remains bounded by unresolved evaluation, maintenance, repository, memory, trust, product, surface, continuity, and legacy frontiers; resolved `SLICE-005` is governed by ADR-009 compliance instead of an unresolved trigger. | `OPEN_QUESTIONS.md V0.2.20`; `ADR-009 R4` | README claim boundary; local source snapshots; explicit trigger/accepted-contract audit. | `README.md`; `AGENTS.md`; `governance/sources/OPEN_QUESTIONS.md`; `governance/sources/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md`; `governance/CONFORMANCE.md` | Agent mapping complete; qualifying owner trigger review recorded below. | review-only | promotion-blocking; claim-blocking | The materially revised trigger/accepted-contract check received owner review; trigger detection remains manual and future capability work can still silently cross a frontier without a dedicated check. |
| `ENG-CLAIM-001` | `R3` | `ENGINEERING_STANDARD.md` | applicable | README, tests, ledger, and review language describe engineering capability and conformance under the new completion-claim separation rules. | `OPEN_QUESTIONS.md V0.2.20`; `ADR-009 R4` | Bounded claim text; ADR-009 completion-state audit; governance/boundary tests. Contract mode. | `README.md`; `governance/CONFORMANCE.md`; `governance/sources/OPEN_QUESTIONS.md`; `governance/sources/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md`; `tests/conformance/boundary.test.js` | Agent mapping complete; qualifying owner claim-boundary review recorded below. | uncovered | claim-blocking; promotion-blocking | Qualifying owner review confirms the R3 claim boundary for this basis; no dedicated lexical/semantic claim-language checker exists and CI-required promotion integration remains unverified. |
| `ENG-CLAIM-002` | `R3` | `ENGINEERING_STANDARD.md` | applicable | Repository artifacts explicitly discuss and deny formal evaluation, scoreability, completion eligibility, and acceptance status; no reserved formal artifact exists. | `OPEN_QUESTIONS.md V0.2.20`; `ADR-004 R3`; `ADR-005 R2`; `ADR-009 R4` | Reserved-language and `P -> D -> A` boundary in README and ledger; artifact inventory. Contract mode. | `README.md`; `governance/CONFORMANCE.md`; `governance/sources/OPEN_QUESTIONS.md`; `governance/sources/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md` | Historical owner review preserved; qualifying owner review of the R3 reserved-formal-artifact boundary recorded below. | review-only | claim-blocking | Qualifying owner review confirms the R3 reserved-formal-artifact boundary; no automated reserved-formal-artifact scan exists, and `EVAL-004` and `EVAL-005` remain unresolved. |
| `ENG-CLAIM-WORKBENCH-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | This remains the first selected-slice scenario-provisional workbench; placement, denied claims, and `REPO-001` trigger are unchanged. | `ADR-001 R1`; `ADR-008 R2`; `OPEN_QUESTIONS.md V0.2.20`; `ENG-BASE-REPO-001 R2` | Structural declarations; source comparison. Contract mode. | `README.md`; `AGENTS.md`; `governance/ZOEY_GOVERNANCE.lock`; `governance/CONFORMANCE.md` | Historical owner review preserved; qualifying owner review of the V0.2.20 workbench-claim basis recorded below. | review-only | promotion-blocking; claim-blocking | The rule revision and obligation remain unchanged and the new register basis received owner review; the extraction trigger remains manual and must be repeated before any durable-project claim. |
| `ENG-CONF-CAPTURE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Public inspection captures proposal selection, simulator input, and SUT realization evidence without driving or repairing them. | `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2` | Passive cloned snapshots before and after output emission, harness routing, and realization processing. Contract, negative, replay-limited modes. | `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/src/harness.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | Current in-memory realization capture is passive; no replay/restore implementation or formal evaluation capture exists. |
| `ENG-CONF-CLAIM-001` | `R3` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | README and ledger describe selected-slice conformance and deny formal evidence, scoreability, completion eligibility, milestone acceptance, and broader claims. | `OPEN_QUESTIONS.md V0.2.20`; `ADR-004 R3`; `ADR-005 R2`; `ADR-009 R4`; `ENG-CLAIM-001 R3` | Bounded claim and `P -> D -> A` review against projected sources. Contract mode. | `README.md`; `governance/CONFORMANCE.md`; `governance/sources/OPEN_QUESTIONS.md`; `governance/sources/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md` | Agent mapping complete; qualifying owner selected-slice claim review recorded below. | uncovered | claim-blocking | Qualifying owner review confirms the materially revised selected-slice claim checks; no dedicated reserved-status checker exists and required promotion integration remains incomplete. |
| `ENG-CONF-DEP-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Proposal ancestry and the exact realization P/S/F/R/E closure require contemporaneous typed transition, basis, and realization evidence. | `ADR-007 R3`; `ADR-008 R2` | Exact candidate ancestry; exact selection/fact/recording-transition participants; contemporaneous fact/selection basis and realization relation role, orientation, assertion, and order attacks. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | The bounded proposal-realization closure is covered; generic future lineage and lifecycle attacks remain incomplete. |
| `ENG-CONF-DEP-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Immutable formed-non-active trial candidates are now relation endpoints for distinct proposal intents without candidate lifecycle or material-payload mutation. | `ADR-007 R3` | Append-only record identity; explicit lifecycle version/status; structural candidate-before/after proposal regression; copied immutable proposal scope. Contract and negative-limited modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `README.md` | Default | uncovered | merge-blocking; claim-blocking | No later lifecycle transition exists yet, so the required supersession/retirement historical-endpoint test cannot yet be completed; future lifecycle change must create a new versioned record rather than mutate this endpoint. |
| `ENG-CONF-EVIDENCE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | not-applicable | Current tests remain implementation/conformance evidence only; no artifact claims selected-slice behavioral compatibility or evaluated SUT behavior. Future trigger: first such trace, demo, report, or claim-supporting test. | `ADR-008 R2`; `ENG-CLAIM-001 R3` | Claim-boundary inventory and explicit README denial rechecked under the R3 dependency. | `README.md`; `governance/CONFORMANCE.md`; current tests | Not applicable until trigger; future rule requires local-recorded plus CI-required. | N/A | claim-blocking | Applicability was revalidated under `ENG-CLAIM-001 R3`; tests must be relabeled/reviewed if reused as behavior evidence. |
| `ENG-CONF-HARNESS-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | The formal one-argument harness transports one exact SUT-selected request through the governed renderer/projector and exposes no replacement seam. | `ADR-008 R2` | Zero/one/multiple output attacks; override rejection; package-root export contraction; unchanged material transport; successful-ingress commit point; internal-only failure injection. Contract and negative modes. | `scn001_eval/src/harness.js`; `scn001_eval/src/simulator.js`; `scn001_eval/src/simulatorProjection.js`; `scn001_eval/index.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | Non-arbitration and governed transport are covered for the proposal seam; future simulator families require new accepted contracts. |
| `ENG-CONF-IMPORT-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | SUT source, dependencies, imports, and public package boundary exist. | `ADR-008 R2` | Static source/dependency scan forbids evaluation paths and dynamic loaders; manual transitive review. Contract mode. | `scn001_sut_core/package.json`; `scn001_sut_core/index.js`; `scripts/check-dependency-boundary.mjs`; `tests/conformance/boundary.test.js` | Default | uncovered | merge-blocking; claim-blocking | Scanner covers local ESM and declared dependencies only; transitive/generated/plugin surfaces remain review risks. |
| `ENG-CONF-IMPORT-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Evaluation harness, fixture projection, and tests call SUT code. | `ADR-008 R2`; `ENG-HEALTH-API-001 R2` | Package export map; static import checker; dynamic-loader negative test; private import negative test. Contract and negative modes. | `scn001_sut_core/package.json`; `scn001_eval/src/harness.js`; `scripts/check-dependency-boundary.mjs`; `scn001_eval/test/harness.test.js`; `tests/conformance/boundary.test.js` | Default | uncovered | merge-blocking; claim-blocking | Static checker is regex-based and production-source scoped; behavior-evidence use remains future-triggered. |
| `ENG-CONF-INSPECT-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Inspection passively exposes the proposal, candidate ancestry, selection, simulator fact, recording transition, basis, and realization relation closure. | `ADR-006 R2`; `ADR-008 R2` | Clone-only inspection; emission invariance; complete malformed-closure attacks never repair state. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | Bounded proposal realization inspection is covered; active-trial, outcome, and lifecycle history remain absent. |
| `ENG-CONF-INSPECT-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Inspection can run between ingestion, same-batch canonical normalization, redelivery, exact-basis reuse, candidate/proposal formation, and semantic processing. | `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2` | Automated interleaving equivalence for source identity, attribution, temporal assessment, comparison, candidate, and proposal identity/replay; repeated passive inspection. Interleaving, replay, negative modes. | `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | No RNG, model, tool, provider, or lazy cache exists; each future surface requires expanded interleaving coverage. |
| `ENG-CONF-PAYLOAD-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Closed SUT output is emitted only from intact candidate-bound state; the projector validates the complete closed simulator record before producing the unchanged narrow ingress shape. | `ADR-005 R2`; `ADR-008 R2` | Proposal material/ancestry attacks; exact full-record keys/types/refs/material/fidelity checks; evaluation-only stripping; exact-key ingress. Contract and negative modes. | `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/src/runState.js`; `scn001_eval/src/simulator.js`; `scn001_eval/src/simulatorProjection.js`; package tests | Default | uncovered | merge-blocking; claim-blocking | Current shapes are closed and attacked; future simulator roles and serializers require equivalent full-record negatives. |
| `ENG-CONF-PAYLOAD-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Boundary and retained-state validation complete before outward emission, simulator invocation, projection, or realization mutation. | `ADR-005 R2`; `ADR-006 R2`; `ADR-008 R2` | Pre-emission proposal closure; closed full-record projection; existing atomic ingress checks; malformed state fails before outward behavior. Negative and contract modes. | `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; package tests | Default | uncovered | merge-blocking; claim-blocking | No deserializer or telemetry path exists; future rejection paths need equivalent atomicity checks. |
| `ENG-CONF-PUBLIC-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | The unchanged SUT method set emits only from an exact valid selection, candidate-bound proposal closure, and zero valid realization closures. | `ADR-008 R2`; `ENG-HEALTH-API-001 R2` | Frozen unchanged method object; exact output keys; malformed proposal/realization attacks; no selector or transition command. | `scn001_sut_core/index.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; SUT tests | Default | uncovered | merge-blocking; claim-blocking | Output cardinality and payload are covered; semantic answer-selector review remains manual for future outputs. |
| `ENG-CONF-REF-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Candidate, proposal, selection, simulator fact, recording transition, and typed relation identities are resolved exactly; equal-payload candidate rebinding fails. | `ADR-005 R2`; `ADR-007 R3`; `ADR-008 R2` | UUID-backed opaque refs; exact P/S/F/R/E participants; full-record reference-shape checks; equal-payload rebinding and cross-run attacks. | `scn001_sut_core/src/runState.js`; `scn001_eval/src/simulatorProjection.js`; package tests | Default | uncovered | merge-blocking; claim-blocking | Proposal and realization identity are exact and run-scoped; later-use references remain future work. |
| `ENG-CONF-ROLE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Evaluation adapters validate fixture/simulator roles and origins, then project only the narrow declared SUT-visible role without semantic correctness promotion. | `ADR-005 R2`; `ADR-006 R2` | Full simulator role/source validation; per-run opaque identity; narrow projection and prohibited expectation-field attacks. | `scn001_eval/src/fixtureProjection.js`; `scn001_eval/src/simulatorProjection.js`; package tests | Default | uncovered | merge-blocking; claim-blocking | Current projection preserves role, origin, and identity; future roles require equivalent attacks. |
| `ENG-CONF-RUN-001` | `R3` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Public run lifecycle, closure-owned SUT state/source/proposal identities, harness-owned per-run fixture mappings, and cross-run tests exist. | `ADR-003 R2`; `ADR-004 R3`; `ADR-008 R2` | Closure-owned run map; independent-run source, candidate, and proposal-state isolation; proposal refs become unresolvable after termination. Negative and replay-limited modes. | `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/src/harness.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | Proposal isolation is covered; R3 also requires active-trial and outcome state in run A and proof that none affects run B, but those later state families do not exist. |
| `ENG-CONF-SIM-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | The formal harness always uses the narrow deterministic simulator/projector; full records are closed and fidelity is validated from request/realization meaning only. | `ADR-002 R2`; `ADR-005 R2`; `ADR-008 R2` | Override rejection; exact request/full-record validation; deterministic wording; fidelity/mismatch consistency; no oracle/path/branch input; narrow projection. | `scn001_eval/src/simulator.js`; `scn001_eval/src/simulatorProjection.js`; `scn001_eval/src/harness.js`; package tests | Default | uncovered | merge-blocking; claim-blocking | One supported renderer is covered; no general simulator framework, mismatch campaign, or formal evidence exists. |
| `ENG-CONF-STATE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Selection and output availability resolve exact candidate-bound proposal state and zero-or-one exact realization closure without ranking, arbitration, or loose relation predicates. | `ADR-004 R3`; `ADR-006 R2`; `ADR-007 R3` | Exact proposal/selection/realization resolution; equal-payload rebinding, ancestry multiplicity, malformed evidence, and order-reversal attacks. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Proposal realization access is narrow and exact; later-use applicability and other state families remain unimplemented. |
| `ENG-CONF-STATE-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Selection and realization recording consume revalidated proposal closure and preserve exact P/S/F/R/E inputs, order, typed bases, and relation evidence. | `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2` | Transition/ref/order/role assertions; missing/duplicate basis and transition attacks; exact valid replay; distinct-realization failure. Contract and negative modes. | `scn001_sut_core/src/runState.js`; package tests | Default | uncovered | merge-blocking; claim-blocking | Proposal realization mutation provenance is covered; response binding, activation, lifecycle, and outcome mutations remain absent. |
| `ENG-HEALTH-ABSTRACTION-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Public boundary, harness, validation, fixture-projection, and run-state abstractions are non-throwaway. | `ADR-001 R1` | Bounded package/module responsibilities; manual justification review. | `README.md`; `scn001_sut_core/src/`; `scn001_eval/src/`; package `AGENTS.md` files | Local-recorded review | review-only | advisory or merge-blocking by condition | Abstraction justification is not captured by an automated check; future generalization could outrun concrete pressure. |
| `ENG-HEALTH-API-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The SUT surface is unchanged; evaluation package root now exports only the formal one-argument harness constructor, with renderer/projector helpers and failure injection internal. | Rule entry | Exact package-root export test; constructor override rejection; internal-only SUT resolvers and evaluation mechanism-test seam. | `scn001_sut_core/index.js`; `scn001_eval/index.js`; package tests; `scripts/check-dependency-boundary.mjs` | Default | uncovered | merge-blocking; claim-blocking | Governing consumer/need review for future API additions remains manual. |
| `ENG-HEALTH-CHANGE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The current correction closes binding-ingestion causal and input-basis closure plus exhaustive proposal-formation basis integrity without activation. | Rule entry | Focused-diff inspection against starting `HEAD` `6d81e43`; one primary purpose: close the remaining provenance exactness defects before activation. | Current working-tree diff; package tests; corrective record below | Fresh independent ChatGPT review of the corrected pushed diff is pending. | uncovered | advisory or merge-blocking by condition | The implementing task cannot independently review its own diff. |
| `ENG-HEALTH-COMMENT-001` | `R2` | `ENGINEERING_STANDARD.md` | not-applicable | No JavaScript implementation/test comment is present or used to justify behavior. Future trigger: adding, generating, or relying on a code comment. | Rule entry | Source inventory. | `rg` over `scn001_sut_core`, `scn001_eval`, `tests`, and `scripts` returned no JavaScript comment lines | Not applicable until trigger. | N/A | advisory or merge-blocking by condition | Governance prose is controlled as documentation/claims; code comments require review when introduced. |
| `ENG-HEALTH-DEAD-001` | `R2` | `ENGINEERING_STANDARD.md` | not-applicable | No dead, commented-out, prototype, experiment, or throwaway implementation artifact is present. Future trigger: introducing or promoting one. | Rule entry | Repository and source inventory; manual review. | Current package/source tree; no throwaway directory or commented-out implementation | Not applicable until trigger. | N/A | merge-blocking; promotion-blocking | Static gate does not comprehensively prove reachability; disposition must change if a prototype appears. |
| `ENG-HEALTH-DEPENDENCY-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Evaluation declares a runtime dependency on the local SUT package and CI installs the workspace lock. | Rule entry | Local file dependency; lockfile; dependency-boundary static check; no external runtime dependency. | `package-lock.json`; `scn001_eval/package.json`; `scn001_sut_core/package.json`; `scripts/check-dependency-boundary.mjs`; `README.md` | Default | uncovered | merge-blocking; promotion-blocking | Dependency rationale/maintenance review is manual; future external dependencies require a new review record. |
| `ENG-HEALTH-FAILURE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Malformed proposal, realization, full simulator record, constructor override, reference, and multiplicity states fail closed rather than suppressing output or satisfying replay. | Rule entry | Typed SUT integrity errors; exact-key/type/reference errors; override/cardinality rejection; negative regression attacks. | SUT/evaluation source and package tests; repository gates | Default | uncovered | merge-blocking; claim-blocking | Failure transparency is covered for the bounded seam; no operational reporting layer exists. |
| `ENG-HEALTH-GEN-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The projector generated new canonical snapshots, lock metadata, source closure, and checker content. | Rule entry | Transactional projector validation; local tests/gates; digest verification. Contract mode. | Projected `governance/` tree; `npm run check`; `governance/ZOEY_GOVERNANCE.lock` | Automated checks complete; qualifying independent ChatGPT generated-artifact review recorded below. | review-only | merge-blocking; promotion-blocking | Independent review found no manual divergence from the intended canonical projection; future generated-artifact changes require fresh independent review. |
| `ENG-HEALTH-REPRO-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The repository defines local/CI quality, test, boundary, state, dependency, and governance gates. | Rule entry | Documented npm scripts; aggregate runner; CI invokes clean-install and aggregate gate. Contract mode. | `README.md`; `AGENTS.md`; `package.json`; `scripts/run-gates.mjs`; `.github/workflows/ci.yml`; `package-lock.json` | Default | uncovered | promotion-blocking; claim-blocking | Python availability is documented but not installed by CI explicitly; branch protection is unverified. |
| `ENG-HEALTH-STRUCTURE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Top-level SUT/evaluation packages, governance, tests, and scripts have declared responsibilities. | Rule entry | Repository map and package guidance; manual ownership review. | `AGENTS.md`; `README.md`; `scn001_sut_core/AGENTS.md`; `scn001_eval/AGENTS.md`; package manifests | Local-recorded review | review-only | advisory or merge-blocking by condition | Responsibility review is manual; future shared/top-level areas require an index and guidance update. |
| `ENG-HEALTH-TEST-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Regressions cover branch-controlled response delivery, stable combined ingress, exact current-participant binding, negative/ambiguous binding, replay identity, and preserved non-activation behavior. | Rule entry | Positive formal-harness, negative direct-ingress, contract, replay, ambiguity, passivity, identity, and non-scope modes cover the bounded binding seam. | SUT/evaluation tests; conformance tests; `package.json` | Default | uncovered | merge-blocking; promotion-blocking | The bounded binding path is covered; activation, lifecycle, later use, outcome, and formal evaluation remain future-triggered. |
| `ENG-HEALTH-TEST-002` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The canonical proposal/realization/branch/binding path uses the formal harness and declared SUT boundary; direct `RunState` use is limited to unreachable malformed-state and narrow participant/replay attacks. | Rule entry | End-to-end formal harness tests; package-root API tests; direct internal integrity and negative-participant tests. | `scn001_sut_core/test/`; `scn001_eval/test/`; `tests/conformance/` | Default | uncovered | merge-blocking; claim-blocking | Fresh independent test-validity review is pending; these remain engineering tests, not formal behavioral evidence. |
| `ENG-HEALTH-TODO-001` | `R2` | `ENGINEERING_STANDARD.md` | not-applicable | No TODO, FIXME, temporary-workaround, or deferred-work marker exists in non-throwaway implementation. Future trigger: adding any such marker. | Rule entry | Source inventory. | `rg` over implementation, tests, and scripts returned no marker | Not applicable until trigger. | N/A | merge-blocking; promotion-blocking | No dedicated TODO gate exists; the disposition must change when a marker is introduced. |

## ADR-009 R4 Revalidation Record

The exact locally affected set was:

- integration-basis refresh: `ENG-AGENT-CODEX-001` through `ENG-AGENT-CODEX-004`;
- projection, source-authority, rule-revalidation, profile-composition, and ledger-integrity controls: `ENG-BASE-001`, `ENG-BASE-002`, `ENG-BASE-CONFORMANCE-001`, `ENG-BASE-CONFORMANCE-002`, `ENG-BASE-PROFILE-001`, and `ENG-BASE-PUBLISH-001`;
- changed register/rule closure: `ENG-BASE-REPO-001`, `ENG-CHANGE-001`, `ENG-CLAIM-001`, `ENG-CLAIM-002`, `ENG-CLAIM-WORKBENCH-001`, `ENG-CONF-EVIDENCE-001`, and `ENG-CONF-CLAIM-001`;
- change-driven review controls: `ENG-HEALTH-CHANGE-001` and `ENG-HEALTH-GEN-001`.

Applicability did not change. Source, rule, evidence-path, and promotion mapping were reviewed for every rule above. Unchanged integration rules and uncovered governance controls retained their statuses only after that explicit review; `ENG-CONF-EVIDENCE-001` remains `not-applicable` after its dependency update to `ENG-CLAIM-001 R3` was checked against the current artifact inventory.

The twelve rules made `revalidation-required` by the ADR-009 projection received the qualifying owner or independent-agent review outcomes recorded below. No rule remained `revalidation-required` at completion of that revalidation.

At completion of the ADR-009 projection revalidation, status counts were:

* 44 rules `applicable` and 5 `not-applicable`;
* 10 applicable rules `review-only`;
* 34 applicable rules `uncovered`;
* no applicable rule `revalidation-required`;
* no rule claimed `enforced`.

Later change-specific review outcomes are recorded separately below and do not rewrite this historical projection-revalidation disposition.

No formal evaluation record, formal campaign record, scoreability predicate, completion evidence package, completion-eligibility determination, owner disposition, milestone-completion claim, or broader `SCN-001` claim was created.

## Historical Human Review Record

On 2026-07-10, before this ADR-009 projection, the repository owner accepted the independently reviewed applicability and then-current status disposition for all 49 rules in the `OPEN_QUESTIONS V0.2.18` / profile `V0.3.1` basis. 
That review covered the combined working tree based on `HEAD` `4eb2287`, whose implementation changes were later committed as `9e8197e`:

- 44 rules are `applicable` and 5 are `not-applicable`;
- 10 applicable rules are `review-only`;
- 34 applicable rules are `uncovered`;
- no rule remains `revalidation-required` and no rule is claimed `enforced`.

The historical review confirms only that prior basis and its ten local-recorded outcomes. It does not attest this projection, unverified protected-branch configuration, missing automated checks, or any stronger engineering, behavior, evaluation, scoreability, eligibility, or milestone claim.

## ADR-009 Projection Owner And Independent Review Closure

On 2026-07-10, the repository owner reviewed the ADR-009 R4 governance projection and affected-rule remapping against:

* canonical meta commit `6726ebef553b38db1d860ab207b4549db0dd57a0`;
* `OPEN_QUESTIONS.md V0.2.20`;
* `ENGINEERING_STANDARD.md V0.6.0`;
* `SCN001_SELECTED_SLICE.md V0.4.0`;
* accepted `ADR-009 R4`;
* the projected `governance/ZOEY_GOVERNANCE.lock`;
* the current repository role and bounded claim language;
* the affected-rule mapping and residual risks recorded in this ledger.

The repository-owner review confirms for the changed basis that:

* accepted governing sources remain authoritative over local convenience;
* the rule-level source/revision remapping is accepted;
* the active selected-slice profile does not conflict with another active profile;
* the repository remains a scenario-provisional governed workbench and does not gain a durable Zoey system-project claim;
* resolved `SLICE-005` is governed through accepted `ADR-009 R4` rather than treated as an unresolved trigger;
* engineering conformance, development tests, formal evidence, completion evidence package `P`, completion-eligibility determination `D`, and project-owner disposition `A` remain distinct;
* owner disposition cannot waive failed completion-eligibility conjuncts;
* `EVAL-004` and `EVAL-005` remain separately triggered unresolved decisions;
* no current repository artifact establishes behavioral compatibility, formal evaluation-record sufficiency, scoreability, completion eligibility, milestone completion, full `SCN-001` pass, or production readiness;
* the Codex instruction chain was refreshed against the projected lock and remains governed by the repository guidance.

This is the qualifying human-review outcome for:

* `ENG-AGENT-CODEX-003 R2`;
* `ENG-BASE-001 R2`;
* `ENG-BASE-002 R2`;
* `ENG-BASE-PROFILE-001 R2`;
* `ENG-BASE-REPO-001 R2`;
* `ENG-CHANGE-001 R3`;
* `ENG-CLAIM-001 R3`;
* `ENG-CLAIM-002 R3`;
* `ENG-CLAIM-WORKBENCH-001 R2`;
* `ENG-CONF-CLAIM-001 R3`.

An independent ChatGPT review of the governance-only projection change also confirmed that the diff has one bounded primary purpose and does not mix semantic implementation behavior into the governance projection. The same independent review checked the generated governance artifacts against the canonical source/projection basis and found no manual divergence from the intended generated projection.

This is the qualifying independent-agent review outcome for:

* `ENG-HEALTH-CHANGE-001 R2`;
* `ENG-HEALTH-GEN-001 R2`.

These review outcomes close source-change revalidation only. They do not establish enforcement where required automated checks or promotion integration remain absent. Existing residual risks and `uncovered` dispositions remain applicable.

## Verification Record

The verified working tree starts from workbench commit `9e8197e` and adds only the canonical governance projection from clean meta commit `6726ebe` plus this affected-rule ledger revalidation. It does not alter SUT code, evaluation code, tests, package manifests, dependency direction, public methods, or semantic implementation behavior.

Verification against that exact basis on 2026-07-10:

- `python3 governance/zoey_governance.py check --target . --conformance`: passed; projection and conformance-index coverage checks passed;
- manual lock-to-ledger rule/revision comparison: passed; 49 exact rule rows, no duplicates, no missing/extra IDs, and every revision matches the lock;
- `npm run check`: passed; governance, formatting, syntax for 12 JavaScript files, dependency-boundary, and all 37 tests passed;
- `git diff --check`: passed;
- targeted stale-control searches: no active projected rule or ledger mapping treats `SLICE-005` as unresolved, and no active rule/profile metadata retains `OPEN_QUESTIONS V0.2.18`.

## Source-Fact Identity Stabilization Addendum

The implementation change based on starting `HEAD` `3c3bcde` has one primary purpose: stabilize selected-slice source-fact identity and SUT-owned exact retained-state resolution. It does not implement proposal, activation, later-use applicability, behavior output, formal evaluation, or milestone completion artifacts.

The change-specific review covered `ENG-BASE-001`, `ENG-CHANGE-001`, `ENG-CONF-DEP-001`, `ENG-CONF-DEP-002`, `ENG-CONF-HARNESS-001`, `ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-001`, `ENG-CONF-PAYLOAD-002`, `ENG-CONF-PUBLIC-001`, `ENG-CONF-REF-001`, `ENG-CONF-ROLE-001`, `ENG-CONF-RUN-001`, `ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`, `ENG-HEALTH-API-001`, `ENG-HEALTH-CHANGE-001`, and `ENG-HEALTH-TEST-001`. `ENG-CONF-DEP-002` remains unchanged: candidate endpoints are still immutable, versioned, and formed-non-active, and this stabilization introduces no later lifecycle mutation. `ENG-BASE-001` and `ENG-CHANGE-001` remain unchanged because the accepted local sources expressly permit conformance or semantic stabilization before proposal/activation and no open-question trigger is crossed.

Mechanism changes are limited to:

- evaluation-owned per-run fixture-record-to-opaque-source mapping;
- SUT-owned run-local source-to-canonical-input binding with complete structural meaning collision rejection before mutation;
- canonical redelivery with new interaction and ingestion/processing evidence;
- exact-basis reuse for initialized/current attribution, temporal assessment, dimension comparison, production candidate, and comparison-backed non-activation disposition;
- exact role-qualified incoming comparison-basis relation intersection from current observation refs, with complete-basis verification and ambiguity failure;
- removal of evaluation-authored `state_reference.purpose` selectors while retaining SUT-owned temporal `useTarget` evidence.

The stabilization did not change applicability, rule revision, promotion mapping, or active exceptions. Its completion report retained `ENG-HEALTH-CHANGE-001` as `review-only` while stating that no independent review of the implementation diff was recorded. 
The corrective record below supersedes that current status and records the subsequent independent result.
The prior residual risks for lost fixture identity, evaluation-authored retained-state use selection, and `state_reference.purpose` leakage remain resolved. Other residual risks remain in the affected table rows.

Change-specific command results are recorded in the implementation completion report and must not be inferred from the historical verification record above.

External controls not verifiable from this checkout:

- GitHub required-check and protected-branch configuration;
- future change-specific qualifying reviews that have not yet occurred.

No new semantic-contract exception is introduced. The `uncovered` rules and residual risks above block stronger enforcement or claim assertions; they do not waive accepted selected-slice obligations.

## Exact-Basis Corrective Increment And Blocking Review Record

An independent ChatGPT review of the pushed source-fact identity stabilization found two blocking defects:

1. `RunState.ingest()` resolved canonical input-fact identity but appended the same canonical fact once per submitted occurrence, allowing duplicate interaction and transition basis participation, repeated attribution or temporal work, and distorted observation aggregation in one processing pass.
2. `deriveTrialCandidateDecisions()` and `findExistingTrialDecision()` matched a no-comparison non-activation disposition by affordances, reason, disposition, optional comparison, and optional dimension without preserving the exact current observation basis, allowing materially different incomplete evidence to reuse an older disposition.

That independent review outcome is **blocking/failed** for the reviewed stabilization diff. It is not a passing review and does not attest that this corrective implementation fixes the findings.

The corrective increment based on starting `HEAD` `b096885` has one primary purpose: close exact-basis multiplicity and incomplete-evidence reuse defects in the source-fact identity stabilization. It preserves positional `acceptedInputRefs` for submitted-input correlation while unique-normalizing the semantic interaction and transition basis by canonical fact identity in first-occurrence order. Redelivery in later interactions remains separately inspectable, and distinct source identities with equal payload remain distinct.

No-comparison non-activation dispositions now preserve their exact current calibration observation refs alongside the existing exact affordance basis. Reuse requires exact observation and affordance reference sets. 
Newly created dispositions receive contemporaneous typed `basis` relations with target role `candidate_formation_observation`, and their creating transition includes those observation refs. Exact replay creates neither a second disposition nor new basis relations; materially changed incomplete evidence creates a distinct disposition. The same rule covers the complete-group/zero-comparison branch.

The directly affected rules are `ENG-CONF-DEP-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-REF-001`, `ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`, `ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-TEST-001`, and `ENG-HEALTH-TEST-002`. 
Applicable rules reviewed without changed ledger mechanisms include `ENG-CONF-ROLE-001`, `ENG-HEALTH-API-001`, `ENG-BASE-001`, and `ENG-CLAIM-001`.

At completion of the corrective implementation task, `ENG-HEALTH-CHANGE-001` was left `uncovered`: the implementing Codex agent could not self-attest the rule's manual-review control, and the corrected diff had not yet received a fresh qualifying independent review.

At that point, status counts were 44 applicable and 5 not applicable; 9 applicable rules were `review-only`, 35 were `uncovered`, none was `revalidation-required`, and no rule was claimed `enforced`.

The subsequent independent review outcome is recorded separately below. It does not rewrite the prior blocking review or the implementing task's honest pending-review disposition.


The narrow implementation and regression mechanisms address the two blocking residual risks identified by the prior independent review. The subsequent independent review of the corrected diff is recorded below. 
Remaining risks include the absent later semantic families, incomplete generic post-hoc-lineage attacks, manual semantic-selector and test-validity review, and unverified protected required-check configuration. No proposal, activation, later-use, behavior output, outcome, explanation, formal evaluation, scoring, or milestone artifact is added.

## Exact-Basis Corrective Increment Independent Review Closure

On 2026-07-10, an independent ChatGPT review examined the corrected implementation at workbench commit `dffafa3ddd4cbc9f158669e67a8c9e1f27ff5fb8` against the two blocking findings recorded in `Exact-Basis Corrective Increment And Blocking Review Record`, the existing source-fact identity stabilization boundary, and the applicable conformance obligations.

The independent review inspected the current pushed implementation and tests for:

* canonical source-fact ingestion and same-batch semantic-basis multiplicity;
* interaction and ingestion-transition input references;
* processing-transition basis use;
* attributed-assertion derivation;
* temporal-assessment exact-basis reuse;
* recognition/spontaneous-production aggregation and comparison basis;
* incomplete-evidence no-comparison disposition identity;
* complete-group zero-comparison disposition identity;
* contemporaneous observation-basis lineage;
* exact replay and changed-basis behavior;
* retained selector-removal protections;
* run-local evaluation source-identity mapping;
* state-reference input shape;
* public SUT boundary stability;
* output and proposal/activation non-scope.

The review confirms that the first blocking defect is closed:

* positional `acceptedInputRefs` may preserve one result per submitted input occurrence;
* semantic interaction input references are unique by canonical retained fact identity in first-occurrence order;
* ingestion-transition semantic input references and `ingested_input` basis relations use that unique canonical basis;
* processing consumes the interaction's unique canonical input references;
* one canonical source fact therefore participates at most once in one semantic interaction basis;
* duplicate same-source communication cannot create two attributed assertions in one processing pass;
* duplicate same-source task observations cannot be double-counted in recognition/spontaneous-production performance or comparison basis;
* duplicate same-source historical observations cannot create duplicate same-basis temporal assessments in one processing pass;
* distinct source identities with structurally equal payload remain distinct semantic facts and basis participants.

The review confirms that the second blocking defect is closed:

* no-comparison non-activation dispositions preserve exact current calibration `observationBasisRefs`;
* exact-result reuse requires exact observation-reference-set equality together with the existing affordance, reason, disposition, optional comparison, and dimension basis;
* exact incomplete-evidence replay reuses the same disposition;
* materially changed incomplete evidence creates a distinct disposition;
* distinct equal-payload observation sources remain distinct material decision bases;
* complete-group zero-comparison decisions preserve and distinguish their exact observation bases;
* newly created no-comparison dispositions receive contemporaneous typed `basis` relations with target role `candidate_formation_observation`;
* exact replay does not create a second disposition or new relations that imply stronger independent support.

The review also confirms that the corrective increment did not reintroduce the previously rejected retained-state selector pattern:

* evaluation cannot select the retained comparison used for candidate formation;
* `candidate_support` is not an accepted SUT-visible state-reference purpose;
* evaluation-origin `independent_current_skill_authority` state-reference selection is absent;
* state-reference projection carries no semantic purpose, applicability, relevance, or trial-choice selector;
* candidate support continues to use exact SUT-owned typed local relation traversal from current canonical observation facts;
* no first/latest/best/relevance selection policy, generic retrieval mechanism, graph-query API, or context-assembly mechanism was introduced;
* no new SUT public method was added;
* `emitAvailableOutputs()` remains empty;
* proposal and activation remain unimplemented;
* no formal evaluation, scoreability, completion-eligibility, milestone-completion, or broader `SCN-001` claim was created.

Independent review outcome: **pass for the bounded corrective change under `ENG-HEALTH-CHANGE-001 R2`**.

This passing review supersedes only the pending manual-review status of the corrected implementation diff. It does not rewrite the earlier blocking review as passing, does not establish automated enforcement, does not satisfy `ENG-HEALTH-TEST-002` test-validity review, and does not remove unrelated residual risks or unverified required-check/branch-protection integration.

With this recorded review outcome, the current applicability/status counts are:

* 44 rules `applicable` and 5 `not-applicable`;
* 10 applicable rules `review-only`;
* 34 applicable rules `uncovered`;
* no applicable rule `revalidation-required`;
* no rule claimed `enforced`.

## Complete Branch And Binding Closure Corrective Increment

An independent review of pushed commit
`c3985aa8a309f0368fd6b1e1205a43f06eb9ac22` found two remaining blocking
integrity defects: the evaluation acceptance branch validated only a partial
proposal/selection checkpoint, and SUT binding replay lacked exact response
source, interaction, assessment-order, participant-first multiplicity, and
complete classification closure. Independent review outcome for that commit:
**blocking / failed**. This record preserves all earlier passing and failed
review history and does not rewrite any prior result.

The corrective increment based on that exact commit has one bounded purpose:

```text
complete evaluation-side C/A/P/S/F/R/E checkpoint validation
and exact source/interaction/order/multiplicity binding closure
```

Before evaluation-owned acceptance ingress, the branch now resolves and checks
the exact routed candidate, retained selected affordance, candidate-bound
proposal, proposal selection, retained simulator fact, realization-recording
transition, and realization relation. It validates supported candidate and
proposal material, exact scope preservation, candidate/proposal creation
transitions, exact candidate ancestry, selected-direction lineage including
created order, selection family/results/interaction/order/basis, simulator-fact
interaction participation, and the complete existing realization closure.
Zero recording transition and zero realization relation remain retryable; any
partial, malformed, duplicate, or competing closure fails before response
projection or SUT ingress.

Canonical positive response attribution now requires the retained raw fixture
user-response fact, its exact synthetic-user semantic-source record, and exactly
one correctly oriented, typed, SUT-asserted source relation with valid fact and
ingestion order. Malformed attribution remains raw evidence and is classified
non-positive.

Binding replay now validates the exact interaction and all represented F/U
participants, requires the assessment itself to follow every response and
realization-recording transition, detects assessment multiplicity by exact F/U
sets before proposal or status filtering, validates every accepted status class
against exact realization and response content, and rejects unexpected proposal,
realization, or response binding relations. Canonical replay therefore requires
the complete strengthened closure.

The affected rules are `ENG-BASE-001`, `ENG-CHANGE-001`,
`ENG-CONF-CAPTURE-001`, `ENG-CONF-DEP-001`, `ENG-CONF-HARNESS-001`,
`ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-002`,
`ENG-CONF-REF-001`, `ENG-CONF-ROLE-001`, `ENG-CONF-RUN-001`,
`ENG-CONF-SIM-001`, `ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`,
`ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-FAILURE-001`, `ENG-HEALTH-TEST-001`,
and `ENG-HEALTH-TEST-002`. Claim-boundary rules were reviewed without changed
applicability or status. Applicability, revisions, promotion mapping, and active
exceptions do not change.

At completion, `ENG-HEALTH-CHANGE-001 = uncovered`. Fresh independent ChatGPT
review of the corrected pushed diff is pending; this implementing task does not
self-attest a passing review. No activation assessment, activation check, active
trial, focused-drill behavior, later-use behavior, outcome, formal evaluation,
scoreability, completion eligibility, milestone completion, broader SCN-001
success, or production-readiness claim is introduced. The candidate remains
formed and non-active at lifecycle version 1, and activation remains absent.

## Temporal And Interaction Provenance Corrective Increment

An independent review of pushed commit
`796f2a36fc3db27775a66c85f0a82e0a2bdf726f` found that the complete branch and
binding correction still allowed proposal identity to predate candidate
formation, allowed B/T to be retargeted to a later replay interaction containing
the same F/U participants, and accepted duplicate binding-transition input refs
through set-only equality. Independent review outcome: **blocking / failed**.
This record preserves and does not rewrite any earlier passing or failed review.

The corrective increment based on that exact commit has one bounded purpose:

```text
close candidate-to-proposal temporal ordering,
proposal-transition candidate basis,
and exact binding interaction/ingestion provenance
before activation
```

The shared SUT candidate-bound proposal validator and evaluation acceptance
checkpoint now require exact `C < CT < P < PT` ordering and one contemporaneous
SUT-asserted `PT --basis[proposal_candidate]--> C` relation. Selection remains
strictly after PT, and existing later realization ordering remains intact.
Missing, duplicate, competing, malformed, or backdated proposal-candidate basis
evidence fails closed, including before evaluation acceptance response projection
or SUT ingress.

Binding replay now requires `I < B < T` and resolves I's exact SUT ingestion
transition. The ingestion transition must identify I, close over the exact unique
interaction input set, contain every represented F/U participant, and preserve
the required family, origin, kind, result, result reference, interaction identity,
and order. B/T therefore cannot be retargeted to an earlier, unrelated, malformed,
or later replay interaction. Binding-transition inputs require set equality,
exact cardinality, and unique references, so duplicated F, U, P, or realization
transition participants fail closed.

The directly affected rules are `ENG-BASE-001`, `ENG-CHANGE-001`,
`ENG-CONF-CAPTURE-001`, `ENG-CONF-DEP-001`, `ENG-CONF-HARNESS-001`,
`ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-002`,
`ENG-CONF-REF-001`, `ENG-CONF-RUN-001`, `ENG-CONF-STATE-001`,
`ENG-CONF-STATE-002`, `ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-FAILURE-001`,
`ENG-HEALTH-TEST-001`, and `ENG-HEALTH-TEST-002`. Applicability, rule revisions,
promotion mapping, active exceptions, and claim-boundary dispositions do not
change.

At completion, `ENG-HEALTH-CHANGE-001 = uncovered`. Fresh independent ChatGPT
review of the corrected pushed diff is pending, and this implementing task does
not self-attest a passing review. The candidate remains formed/non-active at
lifecycle version 1. No activation assessment, activation check, active trial,
focused-drill or later-use behavior, outcome, formal evaluation, scoring,
milestone artifact, broader SCN-001 claim, or production-readiness claim is added.

## Binding Ingestion And Exhaustive Proposal Basis Corrective Increment

An independent review of pushed commit
`6d81e4335422f9093dd6906bd266301420c343fb` confirmed the preceding proposal
ordering, proposal-candidate basis presence, replay-interaction retargeting, and
binding-transition input-uniqueness fixes, but found three remaining provenance
exactness gaps: IT did not have to precede B/T; IT's typed input-basis closure was
not validated; and PT could retain a valid proposal-candidate basis plus an
unexpected basis. Independent review outcome: **blocking / failed**. This record
preserves and does not rewrite any earlier passing or failed review.

The corrective increment based on that exact commit has one bounded purpose:

```text
close binding-ingestion causal order,
exact ingestion input-basis closure,
and exhaustive proposal-formation candidate basis
before activation
```

Binding replay now requires exact `I < IT < B < T` causal order. Every unique
accepted interaction input, including controls and non-F/U facts, must have
exactly one contemporaneous SUT-asserted `IT --basis[ingested_input]--> input`
relation. The complete basis target set must exactly equal both IT and I input
sets, and missing, duplicate, competing, wrong-role, wrong-assertion, backdated,
postdated, or extra basis evidence fails closed. Postdating IT together with a
response source relation cannot bypass the IT-before-B requirement.

The shared proposal validator now validates all PT basis relations rather than
only locating one valid edge for the current proposal. Every PT basis must be a
contemporaneous SUT-asserted `basis[proposal_candidate]`, its unique targets must
exactly equal PT's unique candidate inputs, and there must be exactly one relation
per input. The validator supports both one-candidate and multi-candidate proposal
formation. The evaluation acceptance branch retains its exact single selected
proposal checkpoint and rejects any additional PT basis before response
projection or SUT ingress.

The directly affected rules are `ENG-BASE-001`, `ENG-CHANGE-001`,
`ENG-CONF-CAPTURE-001`, `ENG-CONF-DEP-001`, `ENG-CONF-HARNESS-001`,
`ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-002`,
`ENG-CONF-REF-001`, `ENG-CONF-RUN-001`, `ENG-CONF-STATE-001`,
`ENG-CONF-STATE-002`, `ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-FAILURE-001`,
`ENG-HEALTH-TEST-001`, and `ENG-HEALTH-TEST-002`. Applicability, rule revisions,
promotion mapping, active exceptions, and claim-boundary dispositions do not
change.

At completion, `ENG-HEALTH-CHANGE-001 = uncovered`. Fresh independent ChatGPT
review of the corrected pushed diff is pending, and this implementing task does
not self-attest a passing review. The candidate remains formed/non-active at
lifecycle version 1. No activation assessment, activation check, active trial,
focused-drill or later-use behavior, outcome, formal evaluation, scoring,
milestone artifact, broader SCN-001 claim, or production-readiness claim is added.

## Binding-Integrity Corrective Increment And Blocking Review Record

An independent ChatGPT review of binding commit
`4ca47df70f71ac91466860b630e17cf2a1eafbeb` found three blocking defects:

1. evaluation branch eligibility recovered a simulator fact by equal payload and
   accepted an incomplete realization checkpoint instead of retaining the exact
   originally accepted fact and validating complete P/S/F/R/E closure;
2. the formal acceptance package and SUT classifier did not require raw-response
   attribution to the canonical synthetic user and proposal-response context;
3. assessment replay matched fields without validating exact B/T/P/F/U/R closure,
   and ambiguous assessments could label unprocessed realization facts as actual
   surfaced realizations.

Independent review outcome for `4ca47df70f71ac91466860b630e17cf2a1eafbeb`:
**blocking / failed**. This historical failed review is preserved and is not
rewritten as passing by the correction.

The corrective implementation has one bounded purpose:

```text
close exact branch checkpoint identity,
user-response attribution,
and binding-assessment closure integrity
before activation
```

The harness transport now retains `{ record, simulatorFactRef }` only after
simulator ingress returns exactly one accepted reference. Branch policy resolves
that exact fact and requires exact proposal, selection, simulator fact,
recording transition, realization relation, both transition bases, and the
candidate-to-production-affordance lineage. Zero R/E remains retryable; partial,
malformed, duplicate, mismatched, or ambiguous evidence fails closed.

The exact five-record acceptance contract now validates the package-local actor
and occurrence order for the response and all controls before source mapping,
projection, ingress, or transport mutation. The SUT independently resolves the
raw response's semantic source actor and ordinary proposal-response context.
Acceptance-shaped content from another actor remains raw evidence but receives
an unbound, non-positive assessment and cannot produce the activation-positive
triple.

One internal binding resolver validates assessment family/origin/type/status
origin and the exact assessment transition, participants, result, ordering,
proposal-realization and user-response bases, and proposal/realization/response
binding relations. Exact replay reuses only a complete closure. Duplicate or
malformed closure evidence fails closed. Every ambiguous realization participant
must first resolve its own complete realization closure; an unprocessed fact is
never labeled `actual_surfaced_realization`. Distinct response identity still
creates a distinct assessment, while multiple responses are preserved without
first/latest selection.

Affected evidence/residual-risk rows reviewed for this correction are
`ENG-CONF-CAPTURE-001`, `ENG-CONF-DEP-001`, `ENG-CONF-HARNESS-001`,
`ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-001`,
`ENG-CONF-PAYLOAD-002`, `ENG-CONF-PUBLIC-001`, `ENG-CONF-REF-001`,
`ENG-CONF-ROLE-001`, `ENG-CONF-RUN-001`, `ENG-CONF-SIM-001`,
`ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`, `ENG-HEALTH-API-001`,
`ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-FAILURE-001`, `ENG-HEALTH-TEST-001`,
and `ENG-HEALTH-TEST-002`. Applicable claim-boundary rules were reviewed without
changed applicability or broader claim.

At completion, `ENG-HEALTH-CHANGE-001` is **uncovered** because the implementing
Codex task cannot independently review its own corrected diff. A fresh independent
ChatGPT review of the corrected pushed diff is pending. Current counts remain 44
applicable and 5 not applicable; 9 applicable rules are `review-only`, 35 are
`uncovered`, none is `revalidation-required`, and no rule is claimed `enforced`.

Residual risks remain: fresh independent change and test-validity review,
unverified protected required-check configuration, incomplete generic future-
family lineage attacks, and all intentionally absent activation, active-trial,
later-use, outcome, formal-evaluation, scoring, and milestone semantics. No
passing independent review of the corrected diff is claimed.

## Branch-Controlled Proposal Acceptance And Binding Increment

The implementation change based on starting `HEAD`
`08eebefa9530a6e9320e39a13a03a2e3266437c4` has one primary purpose:

```text
valid realized proposal
    -> branch-controlled raw response delivery
    -> exact SUT-owned binding assessment
```

The formal generic fixture path now rejects every `user_response` before fixture
projection, source-reference allocation, or SUT ingress. A dedicated evaluation
harness method accepts only the exact closed `P-USER-ACCEPT`, `FC-RET-001`,
`FC-UGC-001`, `FC-CONSEQ-001`, and `FC-REV-001` record set. It delivers only
when exactly one routed output has a full retained evaluation simulator record,
matching requested and realized production-proposal material, the exact
production-focused candidate and `TRIAL-PROD-FOCUS` affordance, and passive SUT
inspection proves that the same simulator fact participates in the exact
processed P/S/F/R/E realization closure. Zero eligible realizations deliver
nothing and remain retryable; more than one fails closed without selection.

Successful delivery reprojects the retained simulator record through the same
run projector, preserving its opaque source identity, and ingests one batch with
the canonical simulator fact, raw six-field user response, and four exact control
facts. Existing fixture mappings preserve control identity. Delivery success is
recorded by exact output/selection ref only after SUT ingress succeeds; replay is
a stable frozen no-op, end-run clears transport state, and independent runs share
none. Branch predicates and conclusions are not projected into SUT input.

Normal SUT interaction processing now creates immutable `binding_assessment`
records through `assess_proposal_response_binding`. Assessment identity uses the
exact optional proposal ref, current realization-fact set, current user-response
set, and separate binding, response, and material-fidelity statuses. The canonical
path is `bound / accepted / match`. One response without a current realization is
`unbound / accepted / unknown`; participant multiplicity creates one ambiguous
assessment without first/latest selection; unsupported response text remains
`ambiguous_or_non_accepting`; and realization fidelity mismatch cannot produce
material `match`.

Canonical binding begins only from the current interaction's redelivered F and U,
uses F's `requestedRef`, revalidates the candidate-bound proposal, and requires
the complete existing P/S/F/R/E closure with the exact current fact identity. The
transition consumes exact P/F/U/R participants and contemporaneously relates to
the realization evidence and raw response as narrow `basis` roles. Each bound
assessment creates SUT-asserted contemporaneous binding relations to the exact
proposal, actual surfaced realization, and actual user response. No response-to-
candidate relation is created; candidate identity remains recoverable through
proposal ancestry. Exact F/U replay creates neither a second assessment nor new
binding relations, while a distinct equal-content U remains a distinct event and
assessment.

The four controls are retained interaction facts for later activation work but
are not binding evidence. Candidate and proposal records remain unchanged; the
candidate remains `trial_candidate / formed_non_active / lifecycleVersion 1`.
No activation assessment, activation check, active trial, lifecycle transition,
focused-drill behavior, outcome, formal evaluation record, scoring artifact,
obligation classification, completion artifact, or broader claim is introduced.

Rows reviewed for this increment are `ENG-BASE-001`, `ENG-CHANGE-001`,
`ENG-CONF-CAPTURE-001`, `ENG-CONF-DEP-001`, `ENG-CONF-DEP-002`,
`ENG-CONF-HARNESS-001`, `ENG-CONF-IMPORT-001`, `ENG-CONF-IMPORT-002`,
`ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-001`,
`ENG-CONF-PAYLOAD-002`, `ENG-CONF-PUBLIC-001`, `ENG-CONF-REF-001`,
`ENG-CONF-ROLE-001`, `ENG-CONF-RUN-001`, `ENG-CONF-SIM-001`,
`ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`, `ENG-HEALTH-API-001`,
`ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-FAILURE-001`, `ENG-HEALTH-TEST-001`,
`ENG-HEALTH-TEST-002`, `ENG-CLAIM-001`, `ENG-CLAIM-002`,
`ENG-CLAIM-WORKBENCH-001`, and `ENG-CONF-CLAIM-001`.

Actual changed mechanisms and evidence affect the capture, dependency, harness,
inspection, payload, reference, role, run, simulator, state, failure, and test
rows named above. Applicability, rule revisions, promotion mapping, and active
exceptions do not change. `ENG-HEALTH-CHANGE-001` changes from the prior
change-specific `review-only` disposition to `uncovered`: the implementing Codex
task cannot independently attest its own diff, and fresh independent ChatGPT
review of the pushed binding diff is pending. The prior realization-seam review
is not reused.

At completion of this implementing task the current counts are 44 applicable and
5 not applicable; 9 applicable rules are `review-only`, 35 are `uncovered`, none
is `revalidation-required`, and no rule is claimed `enforced`.

Residual risks include pending independent change and test-validity review,
unverified protected required-check configuration, incomplete generic malformed-
lineage attack coverage beyond this bounded closure, and all intentionally absent
activation/later-use/outcome/formal-evaluation semantics. This record does not
claim `DP-ACTIVATE-PROD`, `OBL-EVID-002`, `OBL-EVID-004`, formal campaign
evidence, scoreability, completion eligibility, milestone completion, full
`SCN-001`, or production readiness.

## Realization-Seam Integrity Corrective Increment And Blocking Review Record

An independent ChatGPT review of realization-seam commit
`c4697980f83b16426c81c23221b12fc612e39950` found three blocking defects:

1. `emitAvailableOutputs()` validated selection structure but did not re-establish the selected proposal's complete candidate material, creation-transition, and exact ancestry closure before outward realization. Corrupted scope/material or equal-payload candidate rebinding could therefore reach the public output boundary.
2. output availability and exact replay recognized realization evidence through insufficient relation predicates. They did not require the exact simulator fact, proposal, prior selection, SUT realization-recording transition, contemporaneous fact/selection bases, and typed realization relation closure.
3. package-root `createEvaluationHarness(sutBoundary, dependencies)` accepted arbitrary renderer/projector replacement, while the projector checked only simulator role and record-ID presence. This exposed an undeclared simulator/projection extension seam and allowed malformed full records to reach projection.

Independent review outcome for `c4697980f83b16426c81c23221b12fc612e39950`:
**blocking / failed**. The earlier passing candidate-bound proposal-intent review is not reused and this record does not represent the realization-seam diff as passing.

The corrective implementation based on that starting commit has one bounded purpose:
**close pre-emission candidate-bound proposal integrity, exact proposal-realization closure validation, and the ungoverned harness simulator/projector override seam**. Its primary change purpose is to close realization-seam integrity and simulator-boundary bypasses before response binding.

The correction introduces one shared SUT candidate-bound proposal validator used before selection creation/reuse, public emission, and realization recording. It verifies exact supported proposal and candidate material, structural material/scope equality, candidate creation, proposal creation inputs/results/order, exact SUT-asserted contemporaneous candidate ancestry, and absence of copied candidate evidence. Equal-payload candidate rebinding, missing/competing ancestry, transition corruption, and retained candidate corruption fail closed before outward output.

One exact realization resolver now distinguishes zero valid closures, one exact P/S/F/R/E closure, and malformed or ambiguous evidence. It validates exact proposal and selection, retained simulator fact role/origin/request/order, recording transition family/kind/origin/interaction/result/participants/order, contemporaneous fact and selection bases, and the realization relation's orientation, target role, assertion role, and order. Only a complete same-fact closure is reusable; malformed same-fact evidence fails and a distinct second fact remains rejected.

The package-root evaluation API now exports only `createEvaluationHarness(sutBoundary)`, rejects extra arguments, and always constructs the governed renderer/projector path. Renderer/projector failure injection remains available only through a package-internal mechanism-test constructor. The full-record projector validates the exact closed key set, material types, opaque reference shapes, requested and realized material shapes, and fidelity/mismatch consistency before retaining the same narrow SUT-visible projection. It does not use fixture path, branch, oracle, canonical expectation, claim, or score guidance.

Affected rows updated by this correction are `ENG-CONF-DEP-001`, `ENG-CONF-HARNESS-001`, `ENG-CONF-INSPECT-001`, `ENG-CONF-PAYLOAD-001`, `ENG-CONF-PAYLOAD-002`, `ENG-CONF-PUBLIC-001`, `ENG-CONF-REF-001`, `ENG-CONF-ROLE-001`, `ENG-CONF-SIM-001`, `ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`, `ENG-HEALTH-API-001`, `ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-FAILURE-001`, `ENG-HEALTH-TEST-001`, and `ENG-HEALTH-TEST-002`. `ENG-CONF-CAPTURE-001`, `ENG-CONF-IMPORT-002`, `ENG-CONF-INSPECT-002`, `ENG-CONF-CLAIM-001`, `ENG-CLAIM-001`, and `ENG-CLAIM-002` were reviewed without changed applicability or status.

At completion of this implementing task, `ENG-HEALTH-CHANGE-001` was left `uncovered`: the implementing Codex task could not independently review its own corrected diff, and the corrected realization-seam change had not yet received a fresh qualifying independent review. No passing independent review of the corrected diff was claimed by the implementing task.

At that point, status counts were 44 applicable and 5 not applicable; 9 applicable rules were `review-only`, 35 were `uncovered`, none was `revalidation-required`, and no rule was claimed `enforced`.

The subsequent independent review outcome is recorded separately below. It does not rewrite the prior blocking review of `c4697980f83b16426c81c23221b12fc612e39950` or the corrective implementing task's honest pending-review disposition.

At completion of the implementing task, the three blocking realization-seam risks had been addressed by implementation and regression mechanisms but remained pending independent review of the corrected diff. Remaining risks included absent response binding, activation, active-trial, later-use, outcome, replay/restore, operational reporting, formal evaluation and scoring contracts; manual semantic-selector and test-validity review; and unverified protected required-check configuration.

The subsequent review closes only the change-specific review condition for the bounded realization-seam correction. No `P-USER-ACCEPT`, response binding, activation assessment, active trial, outcome, formal evaluation record, scoreability predicate, completion evidence package, completion-eligibility determination, owner disposition, milestone completion, broader `SCN-001`, or production-readiness claim is created.

## Realization-Seam Integrity Corrective Independent Review Closure

On 2026-07-10, an independent ChatGPT review examined realization-seam corrective commit `21186e5f3f683aa3e20e5f88576b5b6e936f59f7` against the three blocking findings recorded for realization-seam commit `c4697980f83b16426c81c23221b12fc612e39950`, the accepted candidate/proposal and simulator boundaries, and the applicable conformance obligations.

The independent review inspected:

* candidate-bound proposal integrity at later consumption points;
* selected proposal material and exact candidate identity preservation;
* candidate and proposal creation-transition participants and ordering;
* proposal-to-candidate ancestry orientation, multiplicity, assertion role, and contemporaneous order;
* public output emission from retained proposal-selection evidence;
* proposal realization recording from simulator input;
* exact proposal/selection/simulator-fact/recording-transition/realization-relation closure;
* malformed and ambiguous retained realization evidence;
* exact simulator-fact replay and distinct-second-realization behavior;
* formal evaluation-harness constructor shape;
* package-root evaluation exports;
* mechanism-test failure injection isolation;
* full evaluation-side simulator-record validation;
* requested-versus-realized material fidelity consistency;
* narrow SUT-visible simulator projection;
* retained non-arbitration, deterministic-rendering, response-binding, activation, and formal-evaluation boundaries.

The review confirms that complete candidate-bound proposal integrity is revalidated before proposal selection is created or reused, before a retained selection can produce public realization output, and before simulator realization can be recorded. The shared proposal validator resolves the exact candidate identity and verifies the supported candidate and proposal material contracts, structural candidate-intent and proposed-scope preservation, candidate creation evidence, proposal creation-transition inputs/results/order, exact SUT-asserted candidate ancestry, and absence of copied candidate evidence relations.

A selected proposal whose scope or material intent diverges from its candidate fails closed before public emission. Rebinding a proposal's `candidateRef` to a different candidate with structurally equal payload also fails because the proposal creation transition and exact candidate ancestry must still close over the same candidate identity. Missing or competing ancestry, corrupted proposal-formation participants, and malformed retained candidate state likewise fail before outward realization.

The review confirms that proposal realization is no longer recognized through a loose realization-edge predicate. One exact proposal realization requires the complete local closure:

```text
P = exact candidate-bound proposal intent
S = exact prior SUT proposal-realization selection
F = exact retained simulator-realization input fact
R = exact SUT record_proposal_realization transition
E = exact typed realization relation
```

The realization resolver requires one exact valid selection; a simulator-origin retained fact whose `requestedRef` identifies the exact proposal and whose order follows selection; one SUT realization-recording transition with exact `[F, S, P]` participants and the required result/order contract; contemporaneous SUT-asserted `basis[simulator_realization_fact]` and `basis[proposal_realization_selection]` relations; and one SUT-asserted `F --realization[proposal_intent]--> P` relation with exact orientation and transition-consistent created/effective order.

Zero realization relations and zero realization-recording transitions represent an unrealized selected proposal. Any partial, malformed, duplicate, or ambiguous realization evidence fails closed rather than silently suppressing public output or satisfying exact replay reuse. A valid exact canonical simulator-fact replay reuses the already validated closure without creating a second transition or realization relation. A second distinct simulator fact for the same already-realized proposal remains rejected rather than replacing, merging with, or strengthening the first realization.

The review confirms that the formal package-root evaluation API exports only `createEvaluationHarness`. The formal harness constructor accepts only the SUT public boundary and rejects additional renderer/projector override arguments. Formal harness construction therefore uses the governed deterministic proposal renderer and simulator projector rather than an arbitrary caller-supplied replacement. Renderer/projector failure injection remains confined to the package-internal mechanism-test construction path and is not exposed from `scn001_eval/index.js`.

The review confirms that the dedicated simulator projector validates the complete current evaluation-side simulator-record contract before SUT projection. It enforces the exact full-record key set, exact nested requested/realized material shapes, selection/proposal/candidate reference shapes, supported production-proposal material, simulator role and source actor, positive occurrence order, nonempty realized behavior, and fidelity/mismatch consistency. `fidelity = match` is accepted only when requested material meaning structurally equals declared realized material meaning and mismatch origin is absent; mismatch requires materially unequal meaning and a nonempty mismatch origin.

The simulator-record validator does not use fixture path, branch policy, oracle annotation, canonical expectation, claim class, or score to derive fidelity. After validation, the SUT-visible projection remains limited to opaque run-local source identity, simulator-realization kind, source actor, occurrence order, requested proposal ref, realized behavior, and fidelity.

The review also confirms that the corrected seam preserves the prior accepted boundaries:

* the harness does not choose among competing proposal intents;
* the simulator does not choose the proposal;
* one exact current proposal receives SUT selection before public output;
* multiple current proposal intents receive no selection;
* no first/latest/best/relevance policy exists;
* no lifecycle-bearing selected-proposal state was added;
* public output identifies the exact SUT selection and proposal and contains no surfaced wording;
* caller mutation cannot modify retained SUT proposal/candidate state;
* multiple competing outstanding selections are not emitted for harness arbitration;
* repeated successful routing does not duplicate simulator delivery;
* the governed simulator preserves deterministic wording and derives fidelity from request/realization material preservation rather than canonical expectation;
* `processCurrentInteraction()` remains an empty-output public operation;
* no new SUT public method was added;
* `P-USER-ACCEPT` remains absent;
* response binding remains absent;
* activation assessment and active-trial creation remain absent;
* no formal evaluation, scoreability, completion-eligibility, milestone-completion, broader `SCN-001`, or production-readiness claim was created.

Independent review outcome: **pass for realization-seam corrective commit `21186e5f3f683aa3e20e5f88576b5b6e936f59f7` under `ENG-HEALTH-CHANGE-001 R2`**.

This passing review closes only the change-specific manual-review condition for the bounded realization-seam correction. It does not rewrite the failed review of `c4697980f83b16426c81c23221b12fc612e39950` as passing, does not establish automated enforcement, does not satisfy `ENG-HEALTH-TEST-002` test-validity review, and does not remove unrelated residual risks or unverified required-check/branch-protection integration.

With this recorded review outcome, the current applicability/status counts are:

* 44 rules `applicable` and 5 `not-applicable`;
* 10 applicable rules `review-only`;
* 34 applicable rules `uncovered`;
* no applicable rule `revalidation-required`;
* no rule claimed `enforced`.

## Candidate-Bound Proposal-Intent Formation Increment

The implementation change based on starting `HEAD` `ee97252` has one primary purpose:

```text
formed non-active production candidate
    -> distinct immutable candidate-bound proposal intent
```

Normal SUT processing now derives proposal intent only from the exact candidate-formation transition created in the same processing pass. It resolves that transition's result refs directly, accepts only newly formed `production_focused_practice` candidates in the required formed/non-active shape, preserves one distinct proposal identity per exact candidate identity, and preserves multiplicity without selecting a proposal for realization. It does not scan retained candidates or apply first, latest, best, relevance, dimension, or fixture-context selection.

Each proposal is separate from its candidate and preserves the candidate reference, material trial intent, and structurally copied exact proposed scope. The candidate remains `formed_non_active` at lifecycle version `1` and is structurally unchanged. Proposal formation creates contemporaneous `transition_ancestry` from proposal to candidate with target role `candidate`, plus transition-level `basis` from the proposal-intent transition to the exact candidate with target role `proposal_candidate`. The proposal does not copy the candidate's comparison, observation, or affordance basis/support relations.

The proposal is inspectable SUT-owned cross-transition state before wording realization. No surfaced wording, public realization selection, simulator realization, user-response binding, activation assessment, active trial, proposal-specific negative state, or lifecycle/surface-status mechanism is created. `processCurrentInteraction()` and `emitAvailableOutputs()` remain empty-output public operations, and the SUT public method set and evaluation production code are unchanged.

This increment does not claim `DP-PROPOSAL` complete, does not satisfy `SCN001-SSFO-V0.2.0-OBL-EVID-002`, and does not establish behavioral compatibility, formal evaluation-record sufficiency, scoreability, completion eligibility, milestone completion, full `SCN-001` pass, or production readiness.

Rows reviewed for this increment were `ENG-BASE-001`, `ENG-CHANGE-001`, `ENG-CLAIM-001`, `ENG-CLAIM-002`, `ENG-CONF-CAPTURE-001`, `ENG-CONF-CLAIM-001`, `ENG-CONF-DEP-001`, `ENG-CONF-DEP-002`, `ENG-CONF-HARNESS-001`, `ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PUBLIC-001`, `ENG-CONF-REF-001`, `ENG-CONF-RUN-001`, `ENG-CONF-SIM-001`, `ENG-CONF-STATE-001`, `ENG-CONF-STATE-002`, `ENG-HEALTH-API-001`, `ENG-HEALTH-CHANGE-001`, `ENG-HEALTH-TEST-001`, and `ENG-HEALTH-TEST-002`. Applicability, rule revisions, promotion mappings, and active exceptions did not change. Evidence/mechanism and residual-risk text changed only for proposal-affected rows. `ENG-BASE-001`, `ENG-CHANGE-001`, the claim-boundary rows, `ENG-CONF-PUBLIC-001`, and `ENG-HEALTH-API-001` remain unchanged after explicit review because the increment follows accepted sources, crosses no unresolved trigger, creates no broader claim, and adds no public method.

At completion of the implementing task, `ENG-HEALTH-CHANGE-001` was left `uncovered`. The implementing Codex task could not self-attest the rule's manual-review control, the new proposal-intent diff had not yet received a fresh qualifying independent review, and the previous passing exact-basis corrective review was correctly preserved as historical rather than reused for this change.

At that point, status counts were:

* 44 rules `applicable` and 5 `not-applicable`;
* 9 applicable rules `review-only`;
* 35 applicable rules `uncovered`;
* no applicable rule `revalidation-required`;
* no rule claimed `enforced`.

The subsequent independent review outcome is recorded separately below. It does not rewrite the implementing task's honest pending-review disposition.

At completion of the implementing task, residual risk included the then-unreviewed proposal-intent diff and the intentionally absent later realization-selection, simulator realization, response-binding, activation, and lifecycle semantics. The subsequent review closes only the proposal-intent change-review condition. Existing residual risks remain preserved, including incomplete generic post-hoc-lineage attacks, absent later state families, manual semantic-selector/test-validity review, and unverified protected required-check configuration.

## Candidate-Bound Proposal-Intent Independent Review Closure

On 2026-07-10, an independent ChatGPT review examined the proposal-intent implementation at workbench commit `77250a0789f2bf980b4d4d4cc371e9dacfd2682d` against the accepted proposal/candidate boundary, the previously reviewed retained-state and exact-basis stabilization, and the applicable conformance obligations.

The independent review inspected:

* integration of proposal-intent formation into normal SUT interaction processing;
* the exact current candidate-formation transition anchor;
* candidate-transition result-reference resolution;
* production-candidate eligibility checks;
* candidate/proposal identity separation;
* candidate structural invariance;
* proposal material intent and exact proposed-scope preservation;
* candidate-identity proposal reuse;
* equal-payload distinct-candidate behavior;
* multiple-proposal integrity failure;
* proposal-to-candidate transition ancestry;
* proposal-transition candidate basis;
* absence of copied candidate evidence/support relations on the proposal;
* multiple-current-candidate behavior;
* absence of proposal realization selection or order-based preference;
* passive inspection and replay behavior;
* independent-run proposal isolation;
* public SUT boundary stability;
* output, simulator-realization, response-binding, activation, and formal-evaluation non-scope.

The review confirms that proposal intent is a distinct SUT-owned semantic record rather than a mutation of candidate state. An eligible newly formed `production_focused_practice` candidate remains `formed_non_active` at lifecycle version `1`, retains its identity and material state, and is represented by a separate `proposal_intent` identity.

Proposal-intent formation is anchored to the exact candidate-formation transition created during the current processing pass and resolves that transition's result references directly. It does not scan retained candidates, rank candidates, choose first/latest/best/relevant state, or accept a harness-provided candidate selector.

Each proposal intent:

* references the exact candidate identity;
* represents offering that scoped trial for later user decision;
* preserves the candidate's material trial intent;
* preserves a structurally separate copy of the candidate's exact proposed scope;
* contains no surfaced proposal wording or simulator realization payload;
* contains no fixture, path, checkpoint, claim-class, expected-transition, or scoring selector;
* remains inspectable SUT-owned state before realization.

Each newly formed proposal has contemporaneous `transition_ancestry` to its exact candidate with target role `candidate`. The proposal-intent transition consumes the exact candidate as `basis` with target role `proposal_candidate` and records the newly created proposal as a transition result. Candidate evidence lineage remains on the candidate: proposal records do not copy direct comparison support, observation basis, or selected-affordance basis relations.

Proposal identity is bound to candidate identity. Exact replay does not create a duplicate candidate or proposal. Distinct candidate identities with structurally identical material intent and scope receive distinct proposal identities. Multiple materially distinct proposal intents resolving for one exact candidate fail closed rather than being selected by order, and materially conflicting existing proposal state fails closed.

When one current candidate-formation transition produces multiple eligible production candidates, proposal formation preserves the multiplicity by creating one proposal intent per exact candidate. It does not select a proposal for realization and creates no `selectedForRealization`, preferred, primary, or equivalent arbitration state. The evaluation harness does not participate in proposal-intent construction or candidate selection.

The review confirms that the increment does not create surfaced wording, public realization output, simulator realization, user-response binding, activation assessment, active-trial state, proposal-specific negative state, or proposal lifecycle/surface-status machinery. The SUT public method set remains unchanged, `processCurrentInteraction()` remains an empty-output public operation, and `emitAvailableOutputs()` remains empty.

The review also confirms that this increment does not claim `DP-PROPOSAL` complete, does not satisfy `SCN001-SSFO-V0.2.0-OBL-EVID-002`, and creates no formal evaluation record, scoreability predicate, completion evidence package, completion-eligibility determination, owner disposition, milestone-completion claim, broader `SCN-001` pass claim, or production-readiness claim.

Independent review outcome: **pass for the bounded candidate-bound proposal-intent change under `ENG-HEALTH-CHANGE-001 R2`**.

This passing review closes only the change-specific manual-review condition for proposal-intent commit `77250a0789f2bf980b4d4d4cc371e9dacfd2682d`. It does not establish automated enforcement, does not satisfy `ENG-HEALTH-TEST-002` test-validity review, does not establish proposal realization or actual surfacing, and does not remove unrelated residual risks or unverified required-check/branch-protection integration.

With this recorded review outcome, the current applicability/status counts are:

* 44 rules `applicable` and 5 `not-applicable`;
* 10 applicable rules `review-only`;
* 34 applicable rules `uncovered`;
* no applicable rule `revalidation-required`;
* no rule claimed `enforced`.
