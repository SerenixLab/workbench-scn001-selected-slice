# SCN-001 Workbench Conformance Ledger

This ledger is the complete applicability router for the 49 rules pinned by
`governance/ZOEY_GOVERNANCE.lock`. This governance revalidation resolves the
repository state at `HEAD` `9e8197e` plus the canonical projection from
`zoey-meta` commit `6726ebef553b38db1d860ab207b4549db0dd57a0` and this local
ledger update. The projected lock and snapshot digests identify the exact
canonical basis; the verification record below identifies the commands run
against the resulting working tree.

The workbench contains a two-package boundary spine and a stabilized semantic
segment. The SUT derives attributed current-user assertions, selected temporal
eligibility, scoped recognition/spontaneous-production comparisons, immutable
non-active trial candidates, and separate non-activation dispositions from raw
run-local source facts and exact typed local relation closure. It does not create current-skill
facts, proposals, active trials, behavior outputs, or outcomes. There is
no formal evaluation record, behavioral-compatibility claim, scoreability
claim, milestone-acceptance claim, replay/restore path, or durable repository
extraction.

## Ledger Conventions

The table below is the sole authoritative applicability disposition. A rule is
`not-applicable` only when its canonical trigger is absent from the current
repository. Adding the named surface or artifact invalidates that disposition
and requires a ledger update.

Repository-owner-authorized human review confirmed the R2/R3 applicability
remapping on 2026-07-10 for the historical pre-ADR-009 governance basis. That
review remains a historical fact and is not represented as a new human review
of this projection. Status follows the canonical status model:

- `review-only`: the applicable rule's canonical minimum is a qualifying
  recorded review, and that review is recorded below;
- `uncovered`: an applicable rule lacks a required check or its required
  promotion integration, including every `CI-required` rule while protected
  required-check configuration remains unverified;
- `revalidation-required`: the governing source, rule, profile, or integration
  basis changed and the required revalidation has not yet been completed;
- `N/A`: the rule is `not-applicable`; this is not an enforcement claim and
  must be revisited when its stated future trigger occurs.

Unless a row says otherwise:

- **Reviewer/Owner:** the repository owner supplied the historical review and
  ADR-009 projection review recorded below. Changed rows identify the applicable
  owner or independent-agent review closure where revalidation was completed.
- **Active exception:** none; `governance/EXCEPTIONS.md` does not exist.
- **Actual promotion mechanism:** local `npm run check`; GitHub Actions
  `.github/workflows/ci.yml` runs the same command for pull requests and pushes
  to `main`; required-check/branch-protection configuration is not verified
  locally.
- **Verified at:** evidence resolved against base `HEAD` `9e8197e`, canonical
  meta commit `6726ebef553b38db1d860ab207b4549db0dd57a0`, the exact projected
  digests in `governance/ZOEY_GOVERNANCE.lock`, and this ledger working tree;
  command results are recorded after the table.

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
| `ENG-CONF-CAPTURE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Public inspection capture exists and its snapshots are used by tests; applies to capture, logs, reports, replay, or restore. | `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2` | Closed ingress; passive cloned snapshot; negative non-reingestion test. Contract, negative, replay-limited modes. | `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/src/harness.js` | Default | uncovered | merge-blocking; claim-blocking | No replay/restore implementation exists; capture non-repair is tested only for current in-memory paths. |
| `ENG-CONF-CLAIM-001` | `R3` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | README and ledger describe selected-slice conformance and deny formal evidence, scoreability, completion eligibility, milestone acceptance, and broader claims. | `OPEN_QUESTIONS.md V0.2.20`; `ADR-004 R3`; `ADR-005 R2`; `ADR-009 R4`; `ENG-CLAIM-001 R3` | Bounded claim and `P -> D -> A` review against projected sources. Contract mode. | `README.md`; `governance/CONFORMANCE.md`; `governance/sources/OPEN_QUESTIONS.md`; `governance/sources/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md` | Agent mapping complete; qualifying owner selected-slice claim review recorded below. | uncovered | claim-blocking | Qualifying owner review confirms the materially revised selected-slice claim checks; no dedicated reserved-status checker exists and required promotion integration remains incomplete. |
| `ENG-CONF-DEP-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Current SUT transitions create source, basis, and support relations consumed by inspection snapshots; exact candidate support now resolves through contemporaneous role-qualified comparison relations. | `ADR-007 R3`; `ADR-008 R2` | Contemporaneous relation creation, canonical source-fact reuse, exact complete comparison-basis verification, candidate affordance/comparison basis and support lineage, and passive inspection tests. Contract and negative-limited modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Exact-basis subset, shared-observation, ambiguity, replay, and contemporaneous candidate-lineage attacks are covered; generic missing-lineage, backdated-reporting, post-hoc-basis, and later-snapshot attacks remain incomplete. |
| `ENG-CONF-DEP-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Trial candidates now carry an immutable lifecycle version and non-active status and are relation endpoints. | `ADR-007 R3` | Append-only record identity; explicit lifecycle version/status; unchanged-endpoint regression after a later transition. Contract and negative-limited modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `README.md` | Default | uncovered | merge-blocking; claim-blocking | No later lifecycle transition exists yet, so the required supersession/retirement historical-endpoint test cannot yet be completed; future lifecycle change must create a new versioned record rather than mutate this endpoint. |
| `ENG-CONF-EVIDENCE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | not-applicable | Current tests remain implementation/conformance evidence only; no artifact claims selected-slice behavioral compatibility or evaluated SUT behavior. Future trigger: first such trace, demo, report, or claim-supporting test. | `ADR-008 R2`; `ENG-CLAIM-001 R3` | Claim-boundary inventory and explicit README denial rechecked under the R3 dependency. | `README.md`; `governance/CONFORMANCE.md`; current tests | Not applicable until trigger; future rule requires local-recorded plus CI-required. | N/A | claim-blocking | Applicability was revalidated under `ENG-CLAIM-001 R3`; tests must be relabeled/reviewed if reused as behavior evidence. |
| `ENG-CONF-HARNESS-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Evaluation harness delivery, run-local source-fact projection, output forwarding, and inspection capture exist. | `ADR-008 R2` | Thin public-boundary transport; per-run fixture-record-to-opaque-source mapping; raw affordance and inert opaque state-reference projection; output forwarding; projection and independent-run tests. Contract mode. | `scn001_eval/src/harness.js`; `scn001_eval/src/fixtureProjection.js`; `scn001_eval/test/harness.test.js`; `scn001_sut_core/src/publicBoundary.js` | Default | uncovered | merge-blocking; claim-blocking | No competing candidate outputs or SUT-selected realization exist, so the required non-arbitration negative trace remains absent. |
| `ENG-CONF-IMPORT-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | SUT source, dependencies, imports, and public package boundary exist. | `ADR-008 R2` | Static source/dependency scan forbids evaluation paths and dynamic loaders; manual transitive review. Contract mode. | `scn001_sut_core/package.json`; `scn001_sut_core/index.js`; `scripts/check-dependency-boundary.mjs`; `tests/conformance/boundary.test.js` | Default | uncovered | merge-blocking; claim-blocking | Scanner covers local ESM and declared dependencies only; transitive/generated/plugin surfaces remain review risks. |
| `ENG-CONF-IMPORT-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Evaluation harness, fixture projection, and tests call SUT code. | `ADR-008 R2`; `ENG-HEALTH-API-001 R2` | Package export map; static import checker; dynamic-loader negative test; private import negative test. Contract and negative modes. | `scn001_sut_core/package.json`; `scn001_eval/src/harness.js`; `scripts/check-dependency-boundary.mjs`; `scn001_eval/test/harness.test.js`; `tests/conformance/boundary.test.js` | Default | uncovered | merge-blocking; claim-blocking | Static checker is regex-based and production-source scoped; behavior-evidence use remains future-triggered. |
| `ENG-CONF-INSPECT-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Public snapshots, record inspection, and relation enumeration expose source-fact identity, retained state, provenance, exact basis, and candidate lifecycle status. | `ADR-006 R2`; `ADR-008 R2` | Clone-only inspection; before/after state equality; inspection-between-redeliveries; immutable candidate and exact-basis reuse tests. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Proposal, active-trial, outcome, and lifecycle-history inspection remain absent and require new coverage when introduced. |
| `ENG-CONF-INSPECT-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Inspection can run between ingestion, canonical redelivery, exact-basis reuse, and semantic processing. | `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2` | Automated interleaving equivalence for source identity resolution, attribution, temporal assessment, comparison reuse, and candidate formation; repeated passive inspection. Interleaving, replay, negative modes. | `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | No RNG, model, tool, provider, or lazy cache exists; each future surface requires expanded interleaving coverage. |
| `ENG-CONF-PAYLOAD-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | SUT ingress and evaluation fixture/simulator projection exist, and every accepted evaluation-origin input now carries a closed opaque source-fact reference. | `ADR-005 R2`; `ADR-008 R2` | Exact-key SUT validation; opaque source-reference validation; role allowlist projection; closed binary/aggregate performance shapes; answer-bearing-field and semantic-purpose negative tests. Contract and negative modes. | `scn001_sut_core/src/inputValidation.js`; `scn001_eval/src/fixtureProjection.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | New roles, serializers, and simulator record shapes require new full-record negative cases. |
| `ENG-CONF-PAYLOAD-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Validation, reference resolution, complete source-identity/content consistency, ingestion ordering, and rejection handling exist. | `ADR-005 R2`; `ADR-006 R2`; `ADR-008 R2` | Closed validation, same-run reference resolution, and structural source-meaning collision checks precede mutation; complete-snapshot before/after attacks cover rejected rebinding. Negative and contract modes. | `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | No deserializer or telemetry path exists; future rejection paths need equivalent atomicity checks. |
| `ENG-CONF-PUBLIC-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | A declared SUT public boundary is used by evaluation; retained-state source resolution remains internal. | `ADR-008 R2`; `ENG-HEALTH-API-001 R2` | Frozen unchanged method object; exact arity checks; closed state-reference shape without purpose; no source lookup, relation-search, or transition-selection method. Contract and negative modes. | `scn001_sut_core/index.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/test/public-boundary.test.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Semantic answer-selector review remains partly manual; future outputs may widen risk. |
| `ENG-CONF-REF-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Run, source-fact, actor, state, transition, interaction, and relation references cross public and inspection surfaces. | `ADR-005 R2`; `ADR-007 R3`; `ADR-008 R2` | UUID-backed opaque source/state references; evaluation-owned per-run fixture mapping; separate SUT source-to-input binding; literal evaluation-ID, collision, and cross-run negative tests. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/src/fixtureProjection.js`; `scn001_eval/src/harness.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | Source identity and SUT state identity are now separate and purpose-free; future accepted later-use state references still require change-specific semantic-leakage review. |
| `ENG-CONF-ROLE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Evaluation adapters project fixture and simulator records into SUT-visible inputs while separately preserving opaque source identity. | `ADR-005 R2`; `ADR-006 R2` | Role-specific allowlist; raw binary/aggregate task performance; explicit semantic-origin field; per-run opaque source mapping; semantic-purpose and pre-promotion rejection tests. Contract and negative modes. | `scn001_eval/src/fixtureProjection.js`; `scn001_eval/src/harness.js`; `scn001_eval/test/harness.test.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Current projection preserves role, origin, and source identity without selecting retained-state use; future roles and later-use paths require equivalent change-specific attacks. |
| `ENG-CONF-RUN-001` | `R3` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Public run lifecycle, closure-owned SUT state/source bindings, harness-owned per-run fixture mappings, and cross-run tests exist. | `ADR-003 R2`; `ADR-004 R3`; `ADR-008 R2` | Closure-owned run map and source bindings; harness per-run identity map disposal; opaque refs; independent-run source/state separation tests. Negative and replay-limited modes. | `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js`; `scn001_eval/src/harness.js`; `scn001_eval/test/harness.test.js` | Default | uncovered | merge-blocking; claim-blocking | R3 also requires active-trial and outcome state in run A and proof that none affects run B; those later state families do not exist. |
| `ENG-CONF-SIM-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Simulator-realization fixture projection and SUT ingress roles already exist even though no simulator service exists. | `ADR-002 R2`; `ADR-005 R2`; `ADR-008 R2` | Shared closed ingress; simulator role/origin preservation; answer-bearing-field negative test; dependency scan. Contract and negative modes. | `scn001_eval/src/fixtureProjection.js`; `scn001_eval/test/harness.test.js`; `scn001_sut_core/src/inputValidation.js`; `scn001_sut_core/test/run-state.test.js`; `scripts/check-dependency-boundary.mjs` | Default | uncovered | merge-blocking; claim-blocking | No simulator implementation or SUT-selected proposal exists, so realization non-arbitration is not yet exercised end to end. |
| `ENG-CONF-STATE-001` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Current processing resolves canonical run-local source facts and exact dimension comparisons through narrow typed local relations. | `ADR-004 R3`; `ADR-006 R2`; `ADR-007 R3` | Run-local source-to-input map; incoming role-qualified basis-relation intersection; complete exact basis equality; zero-match withholding; multiple-match integrity failure; no retrieval/ranking API. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/src/publicBoundary.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Current comparison resolution is selected-slice-specific and exact; later-use applicability and other state families remain unimplemented and require their own bounded access review. |
| `ENG-CONF-STATE-002` | `R2` | `profiles/SCN001_SELECTED_SLICE.md` | applicable | Canonical ingestion, attribution, temporal assessment, dimension comparison, candidate formation, and non-activation disposition mutate selected-slice state. | `ADR-006 R2`; `ADR-007 R3`; `ADR-008 R2` | SUT transition records preserve order, canonical input refs, repeated interaction/ingestion evidence, semantic results, origin, exact comparison support, selected-affordance basis, and exact decision-basis reuse; provenance tests. Contract and negative modes. | `scn001_sut_core/src/runState.js`; `scn001_sut_core/test/run-state.test.js` | Default | uncovered | merge-blocking; claim-blocking | Proposal, activation, retirement/supersession, and outcome mutations do not exist and require their own provenance coverage. |
| `ENG-HEALTH-ABSTRACTION-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Public boundary, harness, validation, fixture-projection, and run-state abstractions are non-throwaway. | `ADR-001 R1` | Bounded package/module responsibilities; manual justification review. | `README.md`; `scn001_sut_core/src/`; `scn001_eval/src/`; package `AGENTS.md` files | Local-recorded review | review-only | advisory or merge-blocking by condition | Abstraction justification is not captured by an automated check; future generalization could outrun concrete pressure. |
| `ENG-HEALTH-API-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Both packages expose public exports and the harness consumes the unchanged SUT public surface. | Rule entry | Export map; frozen exact SUT public surface; internal-only source lookup and exact relation resolver; static and contract checks. | `scn001_sut_core/package.json`; `scn001_sut_core/index.js`; `scn001_eval/index.js`; `scn001_sut_core/test/public-boundary.test.js`; `scn001_sut_core/test/run-state.test.js`; `scripts/check-dependency-boundary.mjs` | Default | uncovered | merge-blocking; claim-blocking | Governing consumer/need review for future API additions remains manual. |
| `ENG-HEALTH-CHANGE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | This bounded semantic stabilization changes source identity, canonical reuse, exact retained-state resolution, tests, and the directly affected ledger evidence. | Rule entry | Focused-diff inspection against starting `HEAD` `3c3bcde`; one primary purpose: stabilize selected-slice source-fact identity and SUT-owned exact retained-state resolution. | Current working-tree diff; changed SUT/evaluation tests; this affected-row ledger update | Change-specific agent diff review recorded in the verification addendum below; historical independent review remains limited to the earlier governance projection. | review-only | advisory or merge-blocking by condition | This change is bounded to the requested stabilization; no independent review of the new implementation diff is recorded. |
| `ENG-HEALTH-COMMENT-001` | `R2` | `ENGINEERING_STANDARD.md` | not-applicable | No JavaScript implementation/test comment is present or used to justify behavior. Future trigger: adding, generating, or relying on a code comment. | Rule entry | Source inventory. | `rg` over `scn001_sut_core`, `scn001_eval`, `tests`, and `scripts` returned no JavaScript comment lines | Not applicable until trigger. | N/A | advisory or merge-blocking by condition | Governance prose is controlled as documentation/claims; code comments require review when introduced. |
| `ENG-HEALTH-DEAD-001` | `R2` | `ENGINEERING_STANDARD.md` | not-applicable | No dead, commented-out, prototype, experiment, or throwaway implementation artifact is present. Future trigger: introducing or promoting one. | Rule entry | Repository and source inventory; manual review. | Current package/source tree; no throwaway directory or commented-out implementation | Not applicable until trigger. | N/A | merge-blocking; promotion-blocking | Static gate does not comprehensively prove reachability; disposition must change if a prototype appears. |
| `ENG-HEALTH-DEPENDENCY-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Evaluation declares a runtime dependency on the local SUT package and CI installs the workspace lock. | Rule entry | Local file dependency; lockfile; dependency-boundary static check; no external runtime dependency. | `package-lock.json`; `scn001_eval/package.json`; `scn001_sut_core/package.json`; `scripts/check-dependency-boundary.mjs`; `README.md` | Default | uncovered | merge-blocking; promotion-blocking | Dependency rationale/maintenance review is manual; future external dependencies require a new review record. |
| `ENG-HEALTH-FAILURE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Boundary code rejects invalid input/references and gates report contract failures. | Rule entry | Typed errors; fail-closed validation; negative tests; gate failures include rule IDs. Negative and regression modes. | `scn001_sut_core/src/errors.js`; `scn001_sut_core/src/inputValidation.js`; `scripts/check-dependency-boundary.mjs`; `scripts/check-governance-lock.mjs`; package tests | Default | uncovered | merge-blocking; claim-blocking | No operational fallback/reporting layer exists; unexpected-error transparency review remains manual. |
| `ENG-HEALTH-GEN-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The projector generated new canonical snapshots, lock metadata, source closure, and checker content. | Rule entry | Transactional projector validation; local tests/gates; digest verification. Contract mode. | Projected `governance/` tree; `npm run check`; `governance/ZOEY_GOVERNANCE.lock` | Automated checks complete; qualifying independent ChatGPT generated-artifact review recorded below. | review-only | merge-blocking; promotion-blocking | Independent review found no manual divergence from the intended canonical projection; future generated-artifact changes require fresh independent review. |
| `ENG-HEALTH-REPRO-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | The repository defines local/CI quality, test, boundary, state, dependency, and governance gates. | Rule entry | Documented npm scripts; aggregate runner; CI invokes clean-install and aggregate gate. Contract mode. | `README.md`; `AGENTS.md`; `package.json`; `scripts/run-gates.mjs`; `.github/workflows/ci.yml`; `package-lock.json` | Default | uncovered | promotion-blocking; claim-blocking | Python availability is documented but not installed by CI explicitly; branch protection is unverified. |
| `ENG-HEALTH-STRUCTURE-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Top-level SUT/evaluation packages, governance, tests, and scripts have declared responsibilities. | Rule entry | Repository map and package guidance; manual ownership review. | `AGENTS.md`; `README.md`; `scn001_sut_core/AGENTS.md`; `scn001_eval/AGENTS.md`; package manifests | Local-recorded review | review-only | advisory or merge-blocking by condition | Responsibility review is manual; future shared/top-level areas require an index and guidance update. |
| `ENG-HEALTH-TEST-001` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Source identity, canonical retention, attribution, temporal, comparison, candidate, boundary, and failure behavior changed with fail-without-it attacks. | Rule entry | Positive, negative, contract, regression, replay, ambiguity, atomicity, interleaving, and run-isolation tests cover the stabilization categories. | `scn001_sut_core/test/run-state.test.js`; `scn001_eval/test/harness.test.js`; `scn001_sut_core/test/public-boundary.test.js`; `tests/conformance/`; `package.json` | Default | uncovered | merge-blocking; promotion-blocking | Current tests cover the implemented stabilization; future behavior changes still require change-specific fail-without-it evidence. |
| `ENG-HEALTH-TEST-002` | `R2` | `ENGINEERING_STANDARD.md` | applicable | Tests are used throughout this ledger as implementation and conformance evidence. | Rule entry | Public-boundary, state, negative, interleaving, and static contract tests; manual validity review. | `scn001_sut_core/test/`; `scn001_eval/test/`; `tests/conformance/` | Default | uncovered | merge-blocking; claim-blocking | Test-validity review is not independently recorded; tests are not behavioral-compatibility evidence. |
| `ENG-HEALTH-TODO-001` | `R2` | `ENGINEERING_STANDARD.md` | not-applicable | No TODO, FIXME, temporary-workaround, or deferred-work marker exists in non-throwaway implementation. Future trigger: adding any such marker. | Rule entry | Source inventory. | `rg` over implementation, tests, and scripts returned no marker | Not applicable until trigger. | N/A | merge-blocking; promotion-blocking | No dedicated TODO gate exists; the disposition must change when a marker is introduced. |

## ADR-009 R4 Revalidation Record

The exact locally affected set was:

- integration-basis refresh: `ENG-AGENT-CODEX-001` through
  `ENG-AGENT-CODEX-004`;
- projection, source-authority, rule-revalidation, profile-composition, and
  ledger-integrity controls: `ENG-BASE-001`, `ENG-BASE-002`,
  `ENG-BASE-CONFORMANCE-001`, `ENG-BASE-CONFORMANCE-002`,
  `ENG-BASE-PROFILE-001`, and `ENG-BASE-PUBLISH-001`;
- changed register/rule closure: `ENG-BASE-REPO-001`, `ENG-CHANGE-001`,
  `ENG-CLAIM-001`, `ENG-CLAIM-002`, `ENG-CLAIM-WORKBENCH-001`,
  `ENG-CONF-EVIDENCE-001`, and `ENG-CONF-CLAIM-001`;
- change-driven review controls: `ENG-HEALTH-CHANGE-001` and
  `ENG-HEALTH-GEN-001`.

Applicability did not change. Source, rule, evidence-path, and promotion mapping
were reviewed for every rule above. Unchanged integration rules and uncovered
governance controls retained their statuses only after that explicit review;
`ENG-CONF-EVIDENCE-001` remains `not-applicable` after its dependency update to
`ENG-CLAIM-001 R3` was checked against the current artifact inventory.

The twelve rules made `revalidation-required` by the ADR-009 projection have now received the qualifying owner or independent-agent review outcomes recorded below. No rule remains `revalidation-required`.

Current status counts:

* 44 rules are `applicable` and 5 are `not-applicable`;
* 10 applicable rules are `review-only`;
* 34 applicable rules are `uncovered`;
* no applicable rule is `revalidation-required`;
* no rule is claimed `enforced`.

No formal evaluation record, formal campaign record, scoreability predicate, completion evidence package, completion-eligibility determination, owner disposition, milestone-completion claim, or broader `SCN-001` claim was created.

## Historical Human Review Record

On 2026-07-10, before this ADR-009 projection, the repository owner accepted the
independently reviewed applicability and then-current status disposition for all
49 rules in the `OPEN_QUESTIONS V0.2.18` / profile `V0.3.1` basis. That review
covered the combined working tree based on `HEAD` `4eb2287`, whose implementation
changes were later committed as `9e8197e`:

- 44 rules are `applicable` and 5 are `not-applicable`;
- 10 applicable rules are `review-only`;
- 34 applicable rules are `uncovered`;
- no rule remains `revalidation-required` and no rule is claimed `enforced`.

The historical review confirms only that prior basis and its ten local-recorded
outcomes. It does not attest this projection, unverified protected-branch
configuration, missing automated checks, or any stronger engineering, behavior,
evaluation, scoreability, eligibility, or milestone claim.

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

The verified working tree starts from workbench commit `9e8197e` and adds only
the canonical governance projection from clean meta commit `6726ebe` plus this
affected-rule ledger revalidation. It does not alter SUT code, evaluation code,
tests, package manifests, dependency direction, public methods, or semantic
implementation behavior.

Verification against that exact basis on 2026-07-10:

- `python3 governance/zoey_governance.py check --target . --conformance`:
  passed; projection and conformance-index coverage checks passed;
- manual lock-to-ledger rule/revision comparison: passed; 49 exact rule rows,
  no duplicates, no missing/extra IDs, and every revision matches the lock;
- `npm run check`: passed; governance, formatting, syntax for 12 JavaScript
  files, dependency-boundary, and all 37 tests passed;
- `git diff --check`: passed;
- targeted stale-control searches: no active projected rule or ledger mapping
  treats `SLICE-005` as unresolved, and no active rule/profile metadata retains
  `OPEN_QUESTIONS V0.2.18`.

## Source-Fact Identity Stabilization Addendum

The implementation change based on starting `HEAD` `3c3bcde` has one primary
purpose: stabilize selected-slice source-fact identity and SUT-owned exact
retained-state resolution. It does not implement proposal, activation,
later-use applicability, behavior output, formal evaluation, or milestone
completion artifacts.

The change-specific review covered `ENG-BASE-001`, `ENG-CHANGE-001`,
`ENG-CONF-DEP-001`, `ENG-CONF-DEP-002`, `ENG-CONF-HARNESS-001`,
`ENG-CONF-INSPECT-001`, `ENG-CONF-INSPECT-002`, `ENG-CONF-PAYLOAD-001`,
`ENG-CONF-PAYLOAD-002`, `ENG-CONF-PUBLIC-001`, `ENG-CONF-REF-001`,
`ENG-CONF-ROLE-001`, `ENG-CONF-RUN-001`, `ENG-CONF-STATE-001`,
`ENG-CONF-STATE-002`, `ENG-HEALTH-API-001`, `ENG-HEALTH-CHANGE-001`, and
`ENG-HEALTH-TEST-001`. `ENG-CONF-DEP-002` remains unchanged: candidate
endpoints are still immutable, versioned, and formed-non-active, and this
stabilization introduces no later lifecycle mutation. `ENG-BASE-001` and
`ENG-CHANGE-001` remain unchanged because the accepted local sources expressly
permit conformance or semantic stabilization before proposal/activation and no
open-question trigger is crossed.

Mechanism changes are limited to:

- evaluation-owned per-run fixture-record-to-opaque-source mapping;
- SUT-owned run-local source-to-canonical-input binding with complete
  structural meaning collision rejection before mutation;
- canonical redelivery with new interaction and ingestion/processing evidence;
- exact-basis reuse for initialized/current attribution, temporal assessment,
  dimension comparison, production candidate, and non-activation disposition;
- exact role-qualified incoming comparison-basis relation intersection from
  current observation refs, with complete-basis verification and ambiguity
  failure;
- removal of evaluation-authored `state_reference.purpose` selectors while
  retaining SUT-owned temporal `useTarget` evidence.

No applicability, rule revision, status, promotion mapping, or active exception
changed. Status counts therefore remain 44 applicable and 5 not applicable;
10 applicable rules are `review-only`, 34 are `uncovered`, none is
`revalidation-required`, and no rule is claimed `enforced`. The prior residual
risks for lost fixture identity, evaluation-authored retained-state use
selection, and `state_reference.purpose` leakage are resolved by the mechanisms
above. Remaining residual risks are recorded in the affected table rows,
including absent later semantic families, incomplete generic post-hoc-lineage
attacks, manual semantic-selector review, and unverified protected required-
check configuration.

Change-specific command results are recorded in the implementation completion
report and must not be inferred from the historical verification record above.

External controls not verifiable from this checkout:

- GitHub required-check and protected-branch configuration;
- future change-specific qualifying reviews that have not yet occurred.

No new semantic-contract exception is introduced. The `uncovered` rules
and residual risks above block stronger enforcement or claim assertions; they
do not waive accepted selected-slice obligations.
