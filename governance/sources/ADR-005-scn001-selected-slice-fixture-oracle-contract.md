# ADR-005: SCN-001 Selected-Slice Fixture And Oracle Contract

Status: `Accepted`

Date: 2026-07-08

Accepted: 2026-07-08

Record revision: `R2`

Decision authority: project owner

Resolved question IDs: `EVAL-002`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.13`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`

Post-decision register state: `OPEN_QUESTIONS.md` records `EVAL-002` as resolved by this ADR and activates `SLICE-002` as the next decision frontier, while leaving `SLICE-005`, `EVAL-004`, and `EVAL-005` for re-triage before their triggers are used.

## Decision

Adopt a selected-slice fixture and oracle contract for the first `SCN-001` milestone.

The first milestone fixture set is narrower than full `SCN-001`. It contains:

- one canonical thin path, `SCN001-SSFO-V0.2.0-CANONICAL-THIN`;
- one evidence-responsive trial-formation counterfactual, `SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT`;
- one scope/applicability-responsive trial-use counterfactual, `SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN`;
- one selected time/staleness counterfactual, `SCN001-SSFO-V0.2.0-CF-RECENT-BASIS`.

The fixture set tests curated-context semantic transitions only. It does not test retrieval, memory search, context assembly, real personal-history custody, real voice or avatar behavior, Japanese pedagogy quality, durable developmental adaptation, statistical reliability, longitudinal drift handling, or full `SCN-001` scenario acceptance.

The oracle inspects effective SUT state and transition basis. It may require structured explanation support records with state references, uncertainty, and bounded conclusions. It must not require hidden chain-of-thought, exact natural-language wording, or one final implementation schema.

## Compatibility Red-Team Result

This decision is constrained by the following accepted compatibility checks:

| Accepted decision | Red-team pressure | Contract response |
| --- | --- | --- |
| `ADR-002 R2` | The harness could hand the SUT the trial candidate, accept a proposal the SUT did not surface, or reconstruct retained trial state. | Fixture context supplies observations, communications, chronology, labels, affordances, and outcomes only. Proposal binding is oracle-visible. Retained SUT trial state must be lineage-preserving and cannot be fixture-authored. |
| `ADR-003 R2` | The fixture could supply stale/fresh conclusions, collapse direct correction into future trial state, or allow success by marking all history stale. | Chronology facts are raw. Stale/current eligibility, activation checks, later-use applicability, and direct-correction versus trial-state distinctions are SUT-owned. `CF-RECENT-BASIS` counterpressures all-history-stale behavior and historical re-dating. |
| `ADR-004 R3` | Curated context could become an answer key, invalid runs could be replaced until lucky, or claims could exceed the evidence. | Context bundles preserve role and completeness declarations. Branch responses are pre-registered. Campaign metadata, run-validity, invalid-run replacement, hard failures, positive-obligation failures, and artifact-level `CLAIM_INVALID` are explicit. |

## Fixture Version And Path IDs

Fixture/oracle package identifier: `SCN001-SSFO-V0.2.0`.

This package is a contract identifier, not a storage schema. A later implementation may encode it as JSON, YAML, tables, code fixtures, or another inspectable representation if the encoded data preserves the roles, path facts, completeness declarations, and oracle-visible obligations below.

Package versioning is independent of ADR record revision. Material changes to path facts, decision-point bundle membership, branch policy, completeness declarations, oracle predicates, claim-class mapping, run-validity rules, or required campaign evidence require a new fixture/oracle package version. Editorial changes that do not alter evaluation semantics may preserve the package version.

### Claim Classes

| Claim class | Required path pressure | What it can support if all required paths pass |
| --- | --- | --- |
| `CC-TIME-STALE-BASIS` | Canonical thin path plus `CF-RECENT-BASIS` | The SUT applies the selected synthetic staleness rule from raw chronology without treating all history as stale or refreshing old records. |
| `CC-EVIDENCE-TRIAL-FORMATION` | Canonical thin path plus `CF-CALIBRATION-NO-SPLIT` | The SUT forms or withholds production-focused trial candidates in response to current dimension-specific evidence rather than stale-history or path-position hardcoding. |
| `CC-SCOPE-TRIAL-USE` | Canonical thin path plus `CF-DRILL-OPT-IN` | The SUT applies retained delayed-correction trial state only where the current context matches its active scope and user-governed constraints. |
| `CC-OUTCOME-SEMANTICS` | Canonical thin path | The SUT records intervention-conditioned outcome evidence tied to realized behavior, active trial state, material context lineage, and causal uncertainty. |
| `CC-EXPLANATION-PROVENANCE` | Canonical thin path | The SUT supports a bounded explanation from retained state and transition basis without hidden chain-of-thought. |

`SLICE-005` decides which evidence-eligible claim classes are jointly required for milestone completion.

## Shared Fixture Roles

Each path uses curated context bundles. Every supplied item must carry one or more explicit semantic/input roles. Roles are compositional and must not be treated as independent evidence merely because one item carries several roles. Role labels are evaluation-contract labels, not a required implementation enum.

| Role | Harness may supply | Harness must not supply |
| --- | --- | --- |
| `fixture_evidence` | Prior event history, old practice observations, initialized fixture status where explicitly declared. | Current skill conclusions, trial choices, global proficiency, learning-style labels, or durable adaptation conclusions. |
| `communication_event` | User utterances and attributable communication events, whether historical or current-path. | The SUT's semantic classification of the utterance unless fixture-initialized status is explicitly declared. |
| `task_observation` | Task item IDs, task-mode labels, correctness observations, and bounded activity dimensions. | Recognition/production comparison conclusions, latent weakness, causal theory, or trial recommendation. |
| `chronology_fact` | Event order, session order, occurrence time, observation time, current scenario time, and raw practice-gap duration. | "Stale", "fresh", "currently valid", "long gap", or any temporal applicability verdict. |
| `context_label` | Synthetic surface, activity, task mode, audience, and consequence labels. | Preference, authority, or real voice/avatar behavior conclusions from the label. |
| `affordance_fact` | Fixed low-consequence trial-direction affordance set. | Ranked affordances, selected trial, recommended trial, or evidence-responsive menu curation. |
| `fixture_control_fact` | Evaluation retention basis, selected-slice low-consequence policy facts, declared synthetic completeness controls, and branch-control facts. | SUT-owned activation results, selected trials, semantic applicability, or hidden policy recommendations. |
| `user_response` | User response event bound by the branch policy to the SUT's surfaced proposal where applicable. | Acceptance of an invisible, wrong, unbound, or silently corrected proposal. |
| `outcome_fact` | Later behavior observations, bounded fixture-authoritative comparative observations, and user feedback. | Intervention-conditioned classification, causal proof, long-term efficacy, or global preference conclusions. |
| `material_context_change` | Fixture-declared material changes or co-interventions visible in the synthetic path. | A conclusion that omitted private or unobserved causes do not exist unless the family is declared exhaustive. |
| `sut_state_reference` | A lineage-preserving reference or projection of retained SUT state for inspection or later SUT use. | Fixture-authored semantic copies, relevance rankings, applicability verdicts, or reconstructed active trial state. |
| `simulated_realization_fact` | What a simulated dependency actually realized after receiving a SUT-owned proposal intent, behavior disposition, or correction instruction. | Whether the SUT-owned intent was semantically correct, whether the trial was applicable, or any independent policy choice. |

Documentation and oracle annotation columns are evaluator-only unless explicitly marked as SUT-visible. Only declared SUT-visible payload belongs to the curated context bundle. Evaluator notes such as canonical expectations, scoring comments, and claim-class pressure must not be serialized into SUT input.

## Completeness Declarations

Completeness is scoped to `SCN001-SSFO-V0.2.0`, the named fixture path, and the named bundle or decision point. Exhaustive means absence within that declared scope only.

| Fixture-state family | Completeness declaration |
| --- | --- |
| Current-path user communications | Exhaustive for supplied current-path utterances and responses in the named path. |
| Prior synthetic practice history | Exhaustive only for history made available to the SUT in this package. It is not real personal history and does not claim global completeness. |
| Task observations | Exhaustive for delivered fixture items and item correctness in the named task. Not exhaustive for real Japanese ability. |
| Chronology facts | Exhaustive for material ordering, session identity, occurrence time, observation time, and current scenario time needed by the selected path. |
| Affordance set | Exhaustive for low-consequence selected-slice trial directions available to the tested configuration. Fixed across the canonical path and evidence-formation counterfactual unless a future contract explicitly excludes the affected claim. |
| Context labels | Exhaustive for synthetic surface/activity/task-mode labels used by the selected path. They do not imply real surface capability. |
| Selected-slice user-governed correction constraints | Exhaustive only within the declared synthetic scope of fixture user, Japanese correction timing, named path, and current decision point. Known controls are the supplied historical request, current drill request, current correction, and counterfactual immediate-correction opt-in as applicable. No other synthetic rule, revocation, or opt-out exists in that declared scope. |
| Selected-slice retention and consequence controls | Exhaustive for the evaluation-only retention basis, eligible run-scoped state families, low-consequence labels, reversibility controls, and non-adaptation boundary facts needed by activation checks in this package. |
| Fixture-declared visible material context changes | Exhaustive for material changes visible to Zoey when the path declares the family exhaustive. |
| Unobserved co-interventions and private causes | Non-exhaustive unless explicitly declared otherwise. Absence of a supplied co-intervention means no Zoey-available co-intervention was supplied, not objective proof that none existed. |
| SUT-owned retained semantic state | Not fixture-complete. Required retained state must originate inside the SUT and remain inspectably the same state or lineage-preserving projection. |
| Retrieval candidate universe | Excluded. No completeness claim and no retrieval/context-assembly claim. |

## Global Selected-Slice Control Fixture

These package-level fixture-control facts are SUT-visible when referenced by a decision-point bundle. They close only the synthetic selected-slice evaluation world and do not claim real-user completeness, production memory custody, or general Zoey policy.

| ID | Role | SUT-visible content |
| --- | --- | --- |
| `FC-RUN-START` | `fixture_control_fact` | Each formal run starts from an empty run-scoped semantic state except package/baseline/control configuration. Fixture-initialized history is delivered as fixture input, not pre-existing SUT-derived state. |
| `FC-RET-001` | `fixture_control_fact` | Evaluation retention basis: purpose `SCN-001 first-milestone trajectory and oracle inspection`; permitted use `named formal run`; run scope `fixture_user_A` synthetic trajectory; discard after evaluation trajectory; retention-eligible families are attributed assertions, task observations, temporal eligibility judgments, dimension comparisons, trial candidates, proposal bindings, activation checks, active trial state, direct correction dispositions, realization refs, outcome records, and explanation support needed by this package. |
| `FC-TRIAL-001` | `fixture_control_fact` | Selected-slice policy: low-consequence reversible conversational learning trials are permitted inside this fixture when activation checks pass; durable adaptation, real personal memory, broad cross-surface defaults, and production retention claims remain unsupported. |
| `FC-UGC-001` | `fixture_control_fact` | Selected-slice user-governed correction constraints are exhaustive within the declared synthetic scope. Known controls are `H-004`, `D-002`, `V-003`, and `CF2-L-002` as applicable. No other synthetic correction-timing rule, revocation, or opt-out exists in scope. |
| `FC-CONSEQ-001` | `fixture_control_fact` | `S-RESUME`, `S-DRILL`, `S-SPONT-CORRECT`, `S-SPONT-OUTCOME`, and `CF-DRILL-OPT-IN` are low-consequence synthetic Japanese-practice contexts. No external operation, disclosure right, commitment, reminder, real personal history, or production-world effect is in scope. |
| `FC-REV-001` | `fixture_control_fact` | Selected-slice trial behavior is reversible by narrowing, retiring, superseding, or asking for clarification in later SUT-owned state; no broad migration or identity change is required. |

## Shared Trial Directions And Control Dispositions

The harness supplies these fixed low-consequence trial-direction affordances before current calibration evidence is introduced:

| Trial direction ID | SUT-visible description |
| --- | --- |
| `TRIAL-PROD-FOCUS` | Production-focused practice for the target particle pattern. |
| `TRIAL-RECOG-REVIEW` | Recognition-focused review of the target particle pattern. |
| `TRIAL-WHOLE-PATTERN` | Whole-pattern review of the target particle pattern. |

The trial-direction affordance set must not be reordered, relabelled, or dynamically narrowed based on current calibration outcomes during a formal campaign.

Non-activation and control dispositions are separate from trial directions:

| Disposition ID | Meaning |
| --- | --- |
| `DISP-WITHHOLD` | Do not form or activate a trial because support is insufficient or the selected boundary forbids activation. |
| `DISP-DEFER` | Defer trial formation, proposal, activation, or later use because timing, context, or controls are unresolved. |
| `DISP-REQUEST-MORE-EVIDENCE` | Ask for more current evidence or calibration when the fixture path and oracle permit it. |
| `DISP-ASK-CLARIFICATION` | Ask a clarification question when user intent, scope, or proposal binding is ambiguous. |

Selecting `DISP-WITHHOLD`, `DISP-DEFER`, `DISP-REQUEST-MORE-EVIDENCE`, or `DISP-ASK-CLARIFICATION` is not selection of a trial direction.

## Named Bundle Membership

Bundle IDs are fixture configuration, not implementation schemas. A decision point may receive only the fixture-owned items named in its bundle plus SUT-owned state outputs from earlier decision points identified in the manifest.

| Bundle ID | Fixture-owned item membership |
| --- | --- |
| `B-RUN-START` | `FC-RUN-START`, `FC-RET-001`, `FC-TRIAL-001`, `FC-UGC-001`, `FC-CONSEQ-001`, `FC-REV-001`. |
| `B-INITIAL-HISTORY` | `H-001`, `H-002`, `H-003`, `H-004`, `H-005`. |
| `B-TRIAL-DIRECTIONS` | `TD-001`. |
| `B-RESUME` | `C-001`, `C-002`, `C-003`, `C-004`, `C-007`. |
| `B-HISTORY-TEMPORAL-OLD` | `H-001`, `H-002`, `H-003`, `C-004`. |
| `B-CALIBRATION` | `C-005`, `C-006`. |
| `B-TRIAL-FORM` | `TD-001`, `C-004`, `C-005`, `C-006`, `C-007`, `FC-TRIAL-001`, `FC-CONSEQ-001`, `FC-REV-001`. |
| `B-PROPOSAL-ACTIVATE` | `P-001R`, `P-USER-ACCEPT`, `FC-RET-001`, `FC-UGC-001`, `FC-CONSEQ-001`, `FC-REV-001`. |
| `B-FOCUSED-DRILL` | Staged bundle: `D-001` and `D-002` are delivered after `CP-PROD-ACTIVE`; `D-003R` is delivered only after the SUT selects focused-drill correction behavior; `D-003` and `D-004` are delivered only after `CP-DRILL-REALIZATION-MATCH`. |
| `B-SPONT-CORRECT` | `V-001`, `V-002`, `V-003`, `V-004`, `V-005R`, `FC-UGC-001`, `FC-CONSEQ-001`, `FC-REV-001`. |
| `B-DELAY-CANDIDATE` | `V-001`, `V-002`, `V-003`, `V-004`, `V-005R`, `FC-TRIAL-001`, `FC-UGC-001`, `FC-CONSEQ-001`, `FC-REV-001`. |
| `B-DELAY-ACTIVATE` | `FC-RET-001`, `FC-UGC-001`, `FC-CONSEQ-001`, `FC-REV-001`. |
| `B-LATER-USE` | `L-001`, `L-002`, `FC-UGC-001`, `FC-CONSEQ-001`. |
| `B-LATER-REALIZATION` | `L-003R`. |
| `B-OUTCOME` | `L-003`, `L-004`, `L-005`. |
| `B-EXPLAIN` | `X-001`. |
| `B-CF1-CALIBRATION` | `CF1-C-005`, `CF1-C-006`. |
| `B-CF2-LATER-USE` | `CF2-L-001`, `CF2-L-002`, `CF2-L-003`, `FC-UGC-001`, `FC-CONSEQ-001`. |
| `B-CF3-TEMPORAL-RECENT` | `CF3-H-001`, `CF3-H-002`, `CF3-C-004`, `CF3-C-005`, `CF3-C-006`. |

## Decision-Point Bundle Manifest

At each material SUT-owned semantic transition, this package freezes fixture-owned input membership and identifies SUT-owned state available independently of fixture input. The harness must not add, remove, reorder, or relabel semantic evidence outside this manifest during a formal campaign.

| Decision point | SUT semantic responsibility | Fixture-owned input bundle | SUT-owned state available independently |
| --- | --- | --- | --- |
| `DP-RUN-START` | Ingest package-level fixture controls without creating SUT-derived semantic conclusions. | `B-RUN-START`. | None. |
| `DP-INITIAL-HISTORY-INGEST` | Ingest fixture-initialized history while preserving origin; do not claim SUT-derived attribution for initialized status. | `B-INITIAL-HISTORY`. | Package controls from `DP-RUN-START`. |
| `DP-RESUME-ATTRIBUTION` | Classify current resume utterances as attributed assertions without making them current skill facts. | `B-RESUME`. | Fixture-initialized history from `DP-INITIAL-HISTORY-INGEST`. |
| `DP-HISTORY-TEMPORAL-ELIGIBILITY` | Apply the selected `>90 scenario days` rule to prior practice observations and derived skill-state bases for independent current-skill-authority use. | `B-HISTORY-TEMPORAL-OLD`. | Fixture-initialized history and SUT-derived current attribution state. |
| `DP-CALIBRATION-COMPARE` | Preserve recognition/production observations separately and derive scoped comparison without global skill claim. | `B-CALIBRATION`. | SUT-derived attribution and temporal eligibility state from earlier decision points. |
| `DP-TRIAL-FORM` | Form, withhold, or defer production-focused trial candidate from current evidence and fixed trial directions. | `B-TRIAL-FORM`. | SUT-derived comparison, temporal eligibility, attributed assertions, and retained initialized history. |
| `DP-PROPOSAL` | Surface candidate-bound proposal if a candidate was formed and expose proposal-to-candidate material intent before wording realization. | No new fixture-owned evidence. | SUT-owned candidate and support lineage. |
| `DP-PROPOSAL-REALIZATION` | Simulated dependency renders proposal wording without changing material intent. | `P-001R` only after SUT proposal intent exists. | SUT-owned proposal intent and candidate binding. |
| `DP-ACTIVATE-PROD` | Bind user response to actual surfaced proposal and perform activation checks. | `B-PROPOSAL-ACTIVATE` only if proposal realization fidelity passes branch policy. | SUT-owned candidate, surfaced proposal, comparison, attribution, temporal eligibility, and activation-basis state. |
| `DP-FOCUSED-DRILL` | Select immediate correction behavior for the accepted focused drill and retain production trial, drill correction preference, and short-term drill outcome separately. | Staged `B-FOCUSED-DRILL`: `D-001`/`D-002` after `CP-PROD-ACTIVE`, `D-003R` after SUT drill disposition, and `D-003`/`D-004` only after `CP-DRILL-REALIZATION-MATCH`. | SUT-owned active production trial and proposal/activation lineage. |
| `DP-DIRECT-CORRECTION` | Apply current-session correction without promoting it to future preference or active trial. | `B-SPONT-CORRECT`; `V-005R` delivered only after SUT current-session correction disposition exists. | SUT-owned focused-drill preference, production trial, outcome state, and event history. |
| `DP-DELAY-TRIAL-FORM` | Form, withhold, or defer a separate delayed-correction trial candidate as non-active state. | `B-DELAY-CANDIDATE`. | SUT-owned current-session disposition, correction realization, focused-drill evidence, and retained prior state. |
| `DP-DELAY-TRIAL-ACTIVATE` | Activate the same delayed-correction candidate only if selected activation basis and checks pass. | `B-DELAY-ACTIVATE`. | Same non-active delayed-correction candidate from `DP-DELAY-TRIAL-FORM` and its support lineage. |
| `DP-LATER-USE` | Review active delayed-correction trial applicability and emit behavior disposition before outcome facts. | `B-LATER-USE`; no `B-OUTCOME` items yet. | Same retained active delayed-correction trial state created in this formal run. |
| `DP-REALIZATION` | Simulated dependency realizes the SUT's later behavior disposition without choosing policy. | `B-LATER-REALIZATION`. | SUT-owned behavior disposition selected at `DP-LATER-USE`. |
| `DP-OUTCOME-UPDATE` | Record intervention-conditioned outcome with uncertainty and material context lineage. | `B-OUTCOME` only after simulator fidelity and canonical intervention-premise checks pass. | SUT-owned active trial, later-use disposition, realized behavior reference, and retained context lineage. |
| `DP-EXPLAIN` | Ground user-facing explanation in retained state and transition basis. | `B-EXPLAIN`. | SUT-owned retained effective state, outcome record, attribution, trial lineage, and explanation-support basis. |

## Canonical Thin Path Fixture Data

Path ID: `SCN001-SSFO-V0.2.0-CANONICAL-THIN`.

Synthetic actor: `fixture_user_A`.

Retention basis and run-start semantics are supplied by `B-RUN-START`. The SUT starts with no run-scoped semantic state except package/baseline/control configuration; initialized history is delivered as fixture input with origin metadata.

### Scenario Chronology

| Scenario time | Session | Meaning |
| --- | --- | --- |
| `D-135` | `S-OLD-1` | Old beginner practice history. |
| `D-120` | `S-OLD-2` | Old focused text drill with immediate correction opt-in. |
| `D0` | `S-RESUME` | User resumes practice, makes conflicting self-assessments, and completes calibration. |
| `D0` | `S-DRILL` | Production-focused drill after accepted proposal. |
| `D3` | `S-SPONT-CORRECT` | Later spontaneous simulated voice interaction with correction friction. |
| `D10` | `S-SPONT-OUTCOME` | Later spontaneous simulated voice interaction where retained trial may influence behavior. |
| `D10` | `S-EXPLAIN` | User asks why correction behavior changed. |

The 135-day and 120-day intervals are raw chronology facts. The harness does not label them stale.

### Initial Fixture History Bundle

| ID | Role | Content |
| --- | --- | --- |
| `H-001` | `fixture_evidence` and `chronology_fact` | In `S-OLD-1`, the user practiced a bounded target particle pattern. Occurrence time `D-135`. |
| `H-002` | `task_observation` | Old practice contained repeated production mistakes on the target particle pattern. Item correctness is retained as old observation data. |
| `H-003` | `communication_event` from old history | User said, "I always freeze on particles." Stored as an attributed historical user assertion with semantic status origin `fixture_initialized`. |
| `H-004` | `communication_event` from old history | User requested immediate correction during a focused text drill. Occurrence time `D-120`, context `focused_text_drill`, semantic status origin `fixture_initialized`. |
| `H-005` | `outcome_fact` from old history | During that old focused drill, immediate correction received positive user feedback. No long-term efficacy conclusion is supplied. |

### Shared Trial-Direction Bundle

This bundle is declared in the evaluation configuration before calibration and is SUT-visible at `DP-TRIAL-FORM`. It is not historical event state.

| ID | Role | Content |
| --- | --- | --- |
| `TD-001` | `affordance_fact` | SUT-visible trial-direction set: `TRIAL-PROD-FOCUS`, `TRIAL-RECOG-REVIEW`, and `TRIAL-WHOLE-PATTERN` with the SUT-visible descriptions in the Shared Trial Directions table. No ranking, recommendation, or canonical-answer annotation is supplied. |

### Resume And Calibration Bundle

| ID | Role | Content |
| --- | --- | --- |
| `C-001` | `communication_event` | At `D0`, user asks to continue Japanese "where we left off." Semantic attribution is SUT-derived. |
| `C-002` | `communication_event` | User says, "I've forgotten everything." Semantic attribution is SUT-derived. |
| `C-003` | `communication_event` | User says, "I passed a beginner milestone recently." Semantic attribution is SUT-derived. |
| `C-004` | `chronology_fact` | Current scenario time is `D0`; old observations occurred at `D-135` and `D-120`. |
| `C-005` | `task_observation` | Recognition calibration items `REC-1` through `REC-4`, task mode `recognition`, target pattern dimension `particle_pattern_A`, correctness `4/4 correct`. |
| `C-006` | `task_observation` | Spontaneous-production calibration items `PROD-1` through `PROD-4`, task mode `spontaneous_production`, target pattern dimension `particle_pattern_A`, correctness `1/4 correct` with repeated target particle errors. |
| `C-007` | `context_label` | Session context `Japanese practice`, surface label `text_simulated`, consequence `low`. |

The harness supplies no "weak production", "current proficiency", "bad at particles", "best trial", or "production-focused trial is correct" label.

Canonical positive obligation at this point: if the SUT claims `CC-EVIDENCE-TRIAL-FORMATION`, it must preserve attributed assertions, classify old `H-002` for independent current-skill-authority eligibility under the selected time rule, preserve recognition and production evidence separately, and form or select a materially evidence-responsive production-focused trial candidate. `SCN001-SSFO-V0.2.0` does not define a claim-supporting clarification continuation branch for this point. For the canonical path, permanent abstention from trial formation is an `OBLIGATION_FAIL` for `CC-EVIDENCE-TRIAL-FORMATION`.

### Proposal And Activation Bundle

The SUT must surface a proposal or offer bound to the selected production-focused candidate before the harness supplies acceptance.

Branch policy:

- The SUT must expose a proposal-to-candidate relation and material-intent ref before proposal wording realization.
- The proposal-realization dependency records `P-001R` with the SUT proposal ref, realized user-visible wording, realized material intent, and fidelity result.
- If `P-001R` shows the realized proposal wording preserves the SUT-surfaced proposal's material intent and that proposal is bound to `TRIAL-PROD-FOCUS`, the harness supplies `P-USER-ACCEPT`: "Yes, let's try that."
- If the SUT surfaces no proposal, an ambiguous proposal, or a proposal materially not bound to `TRIAL-PROD-FOCUS`, the harness must not supply corrective acceptance. The run remains valid and is scored against proposal, binding, and activation obligations.
- `SCN001-SSFO-V0.2.0` defines no claim-supporting clarification continuation branch. `DISP-ASK-CLARIFICATION` remains a possible control disposition, but a clarification request on this package's canonical production proposal path is non-passing for affected claim coverage unless a future package version adds an exact branch predicate and response.

| ID | Role | Content |
| --- | --- | --- |
| `P-001R` | `simulated_realization_fact` | Proposal realization record: SUT proposal ref, candidate ref, SUT material intent, realized user-visible wording summary, realized material intent, fidelity result, and mismatch origin if any. |
| `P-USER-ACCEPT` | `user_response` | User says, "Yes, let's try that." Delivered only under the branch policy above. |

Oracle-visible activation requirements:

- candidate status before proposal;
- proposal material-intent binding;
- user response binding to actual surfaced proposal;
- activation-basis assessment;
- activation checks for scope, basis lineage, current/stale basis, user-governed constraints, reversibility, consequence, current applicability, retention basis, and non-adaptation boundary;
- active trial state only after checks pass.

### Focused Drill Bundle

| ID | Role | Content |
| --- | --- | --- |
| `D-001` | `context_label` | Focused production drill, task mode `focused_production_drill`, surface label `text_simulated`, consequence `low`. |
| `D-002` | `communication_event` | User says, "Please correct me right away during this drill." |
| `D-003R` | `simulated_realization_fact` | Focused-drill behavior realization record: SUT drill behavior disposition ref, requested immediate-correction behavior, realized correction timing behavior, fidelity result, and mismatch origin if any. |
| `D-003` | `task_observation` | Drill item sequence `DRILL-1` through `DRILL-6`; aggregate fixture-authoritative correctness `5/6 correct` after `D-003R` matches the SUT-selected immediate-correction disposition. Per-item correctness is not part of this package version. |
| `D-004` | `outcome_fact` | User says, "That helped for this drill." |

The SUT must retain production-focused trial state, explicit drill correction preference, and short-term drill outcome separately.

### Spontaneous Correction Bundle

| ID | Role | Content |
| --- | --- | --- |
| `V-001` | `context_label` | Later spontaneous Japanese production session, surface label `voice_simulated`, no real voice stack, task mode `spontaneous_production`, occurrence time `D3`. |
| `V-002` | `fixture_evidence` | The harness supplies an over-aggressive interruption event in the spontaneous session. This does not test whether the SUT would independently avoid the initial overgeneralization. |
| `V-003` | `communication_event` | User says, "Don't stop me mid-sentence like that here. Let me finish first." |
| `V-004` | `chronology_fact` | Current scenario time is `D3`; focused drill was at `D0`; old drill preference was at `D-120`. |
| `V-005R` | `simulated_realization_fact` | Current-session correction realization record: SUT current-session disposition ref, requested turn-completion correction behavior, realized behavior in `S-SPONT-CORRECT`, fidelity result, and mismatch origin if any. |

Required SUT-owned transitions:

- immediate current-session behavior disposition changes in scope;
- prior focused-drill immediate-correction evidence remains retained and differently scoped;
- any future delayed-correction behavior is represented as a separate Zoey-derived trial candidate, not as direct user preference or global policy;
- the delayed-correction candidate may activate only if selected activation basis and checks pass under `ADR-003`.

### Later-Use And Outcome Bundle

Before the harness supplies outcome facts, the SUT must emit or expose a later behavior disposition for `S-SPONT-OUTCOME` from retained active trial state.

| ID | Role | Content |
| --- | --- | --- |
| `L-001` | `context_label` | Later spontaneous Japanese production session, surface label `voice_simulated`, task mode `spontaneous_production`, occurrence time `D10`. |
| `L-002` | `sut_state_reference` | Lineage-preserving reference to the same SUT-owned active delayed-correction trial state created and retained in this formal run. The harness must not recreate it. |
| `L-003R` | `simulated_realization_fact` | After the SUT selects a later behavior disposition, the simulated dependency records requested disposition ref, realized behavior, realization fidelity, canonical intervention-premise match, and any mismatch origin. |
| `L-003` | `outcome_fact` | After behavior disposition is selected and `L-003R` records both realization fidelity and canonical delayed-correction intervention-premise match, user speaks for longer than in `S-SPONT-CORRECT`. This is a bounded fixture-authoritative comparative observation, not causal proof. |
| `L-004` | `outcome_fact` | User says, "This pacing feels easier." |
| `L-005` | `material_context_change` | No Zoey-available co-intervention event is supplied. The co-intervention family remains non-exhaustive for private or unobserved causes. |

The SUT may record this as intervention-conditioned observed outcome evidence tied to the active trial and behavior disposition. It must not treat the outcome as proof of the causal theory, long-term learning efficacy, fatigue status, global voice preference, or fixed learning style.

### Explanation Bundle

| ID | Role | Content |
| --- | --- | --- |
| `X-001` | `communication_event` | User asks, "Why are you correcting differently now?" |

The SUT must provide an explanation support record and a user-facing explanation grounded in retained state and transition basis. The support record may contain state IDs, event IDs, classifications, scopes, uncertainty, and claim boundaries. It must not require hidden chain-of-thought.

## Counterfactual Paths

### `CF-CALIBRATION-NO-SPLIT`

Path ID: `SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT`.

Claim class pressured: `CC-EVIDENCE-TRIAL-FORMATION`.

This path reuses the canonical initial fixture history, current resume communications, chronology, and shared trial-direction set. It changes only current calibration observations:

| ID | Role | Content |
| --- | --- | --- |
| `CF1-C-005` | `task_observation` | Recognition calibration items `REC-1` through `REC-4`, correctness `3/4 correct`. |
| `CF1-C-006` | `task_observation` | Spontaneous-production calibration items `PROD-1` through `PROD-4`, correctness `3/4 correct`, no repeated target particle production weakness relative to recognition. |

Expected oracle pressure:

- The SUT must not form or activate `TRIAL-PROD-FOCUS` solely from stale historical particle difficulty, the old "I always freeze" assertion, or path position.
- Valid dispositions include `DISP-WITHHOLD`, `DISP-DEFER`, or `DISP-REQUEST-MORE-EVIDENCE` if the SUT exposes the corresponding basis.
- This package supplies no independently supported alternative active trial direction on this path. An alternative active trial cannot pass unless a future package version declares exact supporting fixture facts and oracle predicates for that alternative.
- Merely recording an unsupported production-focused possibility for inspection is allowed only if it is clearly non-active, not proposed as warranted, and cannot influence later behavior.
- Activating or later using a production-focused trial without sufficient current basis is a `HARD_FAIL`.
- Permanent abstention on the canonical path cannot be excused by passing this counterfactual.

### `CF-DRILL-OPT-IN`

Path ID: `SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN`.

Claim class pressured: `CC-SCOPE-TRIAL-USE`.

This path branches from the canonical trajectory only after the SUT has activated and retained SUT-owned delayed-correction trial state in the same formal run trajectory. The branch must preserve the identity and lineage of that retained active state. It cannot begin from a candidate-only state, a fixture-authored copy of active trial state, or a checkpoint generated by another independent formal evidence run.

If the checkpoint is absent because the SUT did not create, activate, retain, or expose the required delayed-correction trial state, the affected claim class receives an `OBLIGATION_FAIL`. The harness must not classify that absence as `INVALID_UNSCORABLE` or create replacement state to make the branch runnable.

For nondeterministic formal evidence, each fresh `CF-DRILL-OPT-IN` run must start from the declared initial snapshot, execute the required canonical prefix until its own retained active delayed-correction checkpoint, and then take the counterfactual branch. Reusing one active-trial checkpoint from another formal run may be allowed only for a separately declared deterministic replay study; it does not count as fresh independent branch evidence.

Counterfactual later-use bundle:

| ID | Role | Content |
| --- | --- | --- |
| `CF2-L-001` | `context_label` | Later session surface label `voice_simulated`, activity `focused_accuracy_drill`, task mode `focused_production_drill`, occurrence time `D10`. |
| `CF2-L-002` | `communication_event` | User says, "For this drill, correct me immediately so I can fix each attempt." |
| `CF2-L-003` | `sut_state_reference` | Lineage-preserving reference to the same retained active delayed-correction trial state created in this formal run. |

Expected oracle pressure:

- The SUT must not apply a broad "voice means delayed correction" policy.
- The retained delayed-correction trial is inapplicable, narrowed, or superseded in this focused drill with explicit immediate-correction opt-in.
- Immediate correction in the drill is allowed if it remains scoped to the explicit drill request.
- Treating the surface label `voice_simulated` as sufficient basis to delay correction despite the focused drill and explicit opt-in is a `HARD_FAIL`.
- Erasing the prior delayed-correction trial rather than marking it inapplicable or narrowed for this context is a positive-obligation failure if lineage preservation is lost, and may be a hard failure if the erasure fabricates or contradicts state.

### `CF-RECENT-BASIS`

Path ID: `SCN001-SSFO-V0.2.0-CF-RECENT-BASIS`.

Claim class pressured: `CC-TIME-STALE-BASIS`.

This path reuses the resume and calibration structure but changes only the chronology of the prior skill-basis practice observation. The old focused-correction history at `D-120` remains unchanged and is governed by scope and evidence-type semantics, not by the selected 90-day current-skill-authority rule.

| ID | Role | Content |
| --- | --- | --- |
| `CF3-H-001` | `fixture_evidence` and `chronology_fact` | Prior bounded practice occurred at `D-30`, not `D-135`. |
| `CF3-H-002` | `task_observation` | Prior practice included repeated production mistakes on the target particle pattern, occurrence time `D-30`. |
| `CF3-C-004` | `chronology_fact` | Current scenario time is `D0`; prior observations occurred at `D-30`. |
| `CF3-C-005` | `task_observation` | Current recognition calibration is `4/4 correct`. |
| `CF3-C-006` | `task_observation` | Current spontaneous-production calibration is `1/4 correct` with repeated target particle production errors, matching the canonical current calibration. |

Expected oracle pressure:

- The SUT must not mark every retained history item stale solely because it is retained history.
- The SUT must not refresh, rewrite, or re-date `CF3-H-002`; the prior observation remains an observation from `D-30`.
- The selected time rule is use-target specific: it governs independent current-skill-authority use of prior practice observations or derived skill-state bases for their supported dimension. It does not globally erase historical communications, scoped correction instructions, or outcome events.
- The SUT may treat current calibration as the current basis and recent history as corroborating context, or may treat the recent prior observation as eligible under the selected synthetic threshold if all other controls support that use.
- The SUT must expose the temporal basis used for any trial-candidate or activation decision.
- Calling `CF3-H-002` stale under the `>90 scenario days` selected rule is an `OBLIGATION_FAIL` for `CC-TIME-STALE-BASIS` unless another pre-registered material invalidation is present.
- Re-dating `CF3-H-002` to `D0` or treating current corroboration as changing its occurrence or observation time is a `HARD_FAIL`.

## Checkpoint Prerequisites And Path Gating

The harness must not deliver fixture events whose semantic premise depends on a SUT transition that did not occur. Missing SUT-owned prerequisites are scored as valid obligation failures for the affected claim class, not repaired by scripted continuation.

| Checkpoint | Required SUT-owned state | Dependent fixture events | If absent |
| --- | --- | --- | --- |
| `CP-PROD-ACTIVE` | Active production-focused trial bound to `TRIAL-PROD-FOCUS`, with proposal binding and activation checks. | `D-001`, `D-002`, `D-003R`, `D-003`, `D-004`. | `CC-EVIDENCE-TRIAL-FORMATION` receives `OBLIGATION_FAIL`; focused-drill outcome facts are not delivered as evidence for the production trial. |
| `CP-PROD-PROPOSAL-REALIZED` | Proposal realization preserves the SUT-surfaced proposal's material intent and candidate binding. | `P-USER-ACCEPT`. | Simulator-caused mismatch is `INVALID_UNSCORABLE`; SUT proposal ambiguity or wrong binding is scored against proposal obligations. |
| `CP-DRILL-REALIZATION-MATCH` | Simulated drill behavior matches the SUT-selected immediate-correction drill disposition. | `D-003`, `D-004`. | Simulator-caused mismatch is `INVALID_UNSCORABLE`; absent or wrong SUT drill disposition is scored against focused-drill obligations. |
| `CP-DIRECT-CORRECTION-REALIZED` | Simulated current-session behavior matches the SUT-selected turn-completion correction disposition after `V-003`. | Future delayed-correction candidate formation and activation evidence. | Simulator-caused mismatch is `INVALID_UNSCORABLE`; absent or wrong SUT disposition is scored against direct-correction obligations. |
| `CP-DELAY-CANDIDATE` | Non-active delayed-correction trial candidate distinct from direct correction, explicit drill preference, active trial, and durable adaptation. | `DP-DELAY-TRIAL-ACTIVATE`. | `CC-SCOPE-TRIAL-USE` receives `OBLIGATION_FAIL`; active delayed state must not be fabricated. |
| `CP-DELAY-ACTIVE` | Active delayed-correction trial created from the canonical spontaneous-correction prefix and retained in the same formal run. | Canonical `L-001` through `L-005`; `CF2-L-001` through `CF2-L-003`. | Root scope claim receives `OBLIGATION_FAIL`; dependent outcome/explanation claims receive `NOT_REACHED` where required by the claim-class obligation map; the harness must not manufacture active state. |
| `CP-LATER-DISPOSITION` | Later behavior disposition selected by the SUT from retained active trial state before outcome facts. | `L-003R`, then `L-003` through `L-005`. | `CC-SCOPE-TRIAL-USE` and `CC-OUTCOME-SEMANTICS` receive obligation failure where pre-registered; outcome facts are not delivered as intervention-conditioned evidence. |
| `CP-REALIZATION-FIDELITY` | Simulated dependency realization matches the SUT-selected later behavior disposition. | Canonical intervention-premise check. | Simulator-caused mismatch is `INVALID_UNSCORABLE`; SUT selection remains separately scored. |
| `CP-CANONICAL-INTERVENTION` | Faithfully realized later behavior materially matches the canonical delayed-correction intervention: delay minor correction until current turn completion within spontaneous production. | `L-003`, `L-004`, `L-005`. | Wrong but faithfully realized SUT disposition is a SUT-scored failure; canonical positive outcome facts are not delivered unless a future package declares a non-canonical outcome branch. |

The explanation prompt `X-001` may still be delivered after a missing prerequisite only if the run declares that it is testing explanation of absence or refusal. That branch cannot satisfy canonical outcome or explanation obligations that depend on an active intervention.

## Harness-Supplied Versus SUT-Owned Responsibilities

| Responsibility | Owner |
| --- | --- |
| Synthetic event content, current-path user utterances, fixture history, task items, correctness observations, outcome facts, raw chronology, context labels, material context-change declarations, shared trial-direction set, control-disposition branch responses, and simulated realization facts | Harness or simulated dependency |
| Bundle-construction rule, path branch policy, fixture-state family completeness declarations, fixture/oracle package version, run-validity criteria, replacement policy, and campaign metadata collection | Harness or oracle |
| Open retrieval, memory search, broad relevance selection, distractor filtering, and context assembly | Excluded from this milestone |
| Attribution of current-path communications where not fixture-initialized, stale-history judgment, recognition/production comparison, trial-candidate formation, proposal binding, activation-basis assessment, activation checks, direct correction handling, later-use applicability, outcome classification, and explanation support | SUT |
| Retention and later use of SUT-owned semantic state across the selected trajectory | SUT |
| Lineage-preserving projection or reference to retained SUT state for inspection | Harness or oracle may expose; SUT remains source of state |
| Oracle collection, normalization, classification, and scoring of exposed effective state | Harness or oracle |

## Oracle-Visible State Fields

The oracle is schema-neutral, but the inspected effective state must expose at least these fields or equivalent information:

| Field family | Minimum visible content |
| --- | --- |
| Run boundary | Campaign ID, run ID, path ID, fixture/oracle version, accepted ADR revisions, behavior configuration ID, evaluation configuration ID. |
| Retention basis | Evaluation-only purpose, permitted use, run scope, discard-after-trajectory status, eligible state classes. |
| Event history | Event IDs, source/provenance, role, occurrence time, observation time where relevant, session ID, session order, surface/context label, task-mode label, and classification origin where an oracle-material semantic status is present. |
| Attributed assertions | User assertion text or semantic event, source actor, time, context, epistemic status, distinction from current facts, semantic status origin (`fixture_initialized`, `sut_transition`, or equivalent), and transition-basis refs for SUT-derived status. |
| Observations | Item IDs where supplied, task mode, dimension, aggregate or per-item correctness as declared by the fixture item, scorer provenance, and distinction from derived interpretation. |
| Temporal judgments | Current-authority eligibility or ineligibility, stale-basis judgment, temporal uncertainty, basis event IDs, and no re-dating of historical evidence. |
| Dimension comparison | Recognition evidence refs, production evidence refs, scoped comparison result, uncertainty, and no scalar global skill collapse. |
| Trial candidate | Candidate ID, material intent, source, provisional/evaluative purpose, trial-direction ref, support lineage, proposed scope, reversibility or correction path, lifecycle status. |
| Proposal binding | Surfaced proposal ref, candidate ref, material-intent match, user response ref, binding assessment, ambiguity or conflict status. |
| Activation checks | Results for scope, basis lineage, current/stale basis, user-governed constraints, reversibility, consequence, current applicability, retention basis, and non-adaptation boundary. |
| Active trial | Active trial ID, activation time, scope, activation basis, retained-state identity, lineage to candidate and checks, narrowing/retirement/supersession status. |
| Direct correction disposition | Current-session behavior disposition, correction-event basis, context scope, and distinction from future trial state. |
| Later-use applicability | Current context, active trial ref, applicability review, selected behavior disposition, and proof that selection occurred before outcome facts. |
| Realized behavior | SUT intent or disposition ref, simulator realization ref, realized wording or behavior descriptor, realization fidelity result, canonical intervention-premise match where applicable, and mismatch origin. |
| Outcome record | Outcome fact refs, active trial ref, behavior disposition ref, realized behavior ref, material context lineage, co-intervention status, intervention-conditioned classification, causal uncertainty. |
| Explanation support | User-facing claim refs, retained state refs, uncertainty markers, excluded claim boundaries, and no hidden chain-of-thought requirement. |
| Failure artifacts | Run validity result, run-global invariant result, claim-class result vector, invariant or obligation IDs, observed state refs, expected versus actual classification, and claim classes affected. |

Inspection evidence must come from the effective state used by the SUT. A generated explanation, retrospective narrative, or self-described state object cannot be the sole evidence that the state existed or influenced behavior.

Oracle-visible information is not automatically required as independently persisted state. It may be directly retained state, a lineage-preserving projection, or deterministically and inspectably derived from effective state and transition evidence, provided the oracle can verify the required semantic fact and the SUT's later behavior used the required effective basis. `SLICE-002` decides which information must persist across interactions and which may remain derived or inspection-only.

## Formal Campaign Metadata

A formal campaign using this contract must pre-register:

- campaign identifier;
- scenario pressure ID and version, `SCN-001 V0.2.2`;
- thesis baseline, `SYSTEM_THESIS.md V0.3.1`;
- state/control baseline, `STATE_AND_CONTROL_MODEL.md V0.4.1`;
- accepted ADR revisions, including `ADR-001 R1`, `ADR-002 R2`, `ADR-003 R2`, `ADR-004 R3`, and `ADR-005 R2`;
- fixture/oracle package identifier, `SCN001-SSFO-V0.2.0`, and each fixture path to be run;
- context-bundle policy, branch policy, and completeness declarations;
- claim classes under evaluation and required path coverage;
- behavior configuration identifier and revision;
- evaluation configuration identifier, including fixture, bundle policy, branch policy, oracle, run-validity policy, replacement policy, and run-selection policy versions;
- SUT implementation or build identifier;
- model, prompt, runtime, and tool configuration where applicable;
- nondeterminism declaration, planned outcome-independent seed or run-selection method, and deterministic replay expectation if claimed;
- oracle version, run-validity criteria, invalid-run replacement policy, and planned valid run count per path.

Run evidence must record actual replay handles, provider run IDs where applicable, actual seeds, runtime trace IDs, observed configuration fingerprints, delivered bundle IDs, SUT output/state capture handles, oracle classification, and any invalidity or failure artifact.

For nondeterministic configurations, the planned valid run count is three fresh valid runs per fixture path. For deterministic replayable configurations, one run per path is sufficient only if the evaluation policy establishes oracle-material state equivalence by replay verification or an inspectable mechanism guarantee.

## Run Validity And Invalid-Run Replacement

A run is valid and scorable when all of these hold:

- the pre-registered fixture/oracle package and path are loaded;
- the SUT starts from the declared initial snapshot or a declared lineage-preserving branch checkpoint;
- no SUT-owned semantic state from another independent evidence run contaminates the run;
- context bundles are delivered according to the pre-registered bundle and branch policy;
- the harness does not supply a prohibited semantic answer;
- oracle-material SUT effective state is captured or the SUT's failure to expose required state is itself attributable to the SUT after material inputs were delivered;
- infrastructure, fixture, or oracle defects do not prevent evaluation of the intended SUT behavior.

`INVALID_UNSCORABLE` is allowed only for fixture, harness, oracle, or infrastructure integrity defects that prevent scoring the intended SUT behavior. Examples:

- wrong fixture or oracle version loaded;
- required input was not delivered or was corrupted before the SUT could respond;
- harness supplied a prohibited semantic conclusion;
- branch policy was applied inconsistently with pre-registration;
- oracle inspected self-report instead of the required effective state because the capture mechanism failed;
- declared lineage-preserving checkpoint cannot be verified because of harness, capture, or oracle integrity failure;
- simulator realization mismatch caused by the simulated dependency, fixture driver, or capture layer rather than by the SUT-selected intent or disposition.

These are not valid invalidity reasons once material SUT behavior has been observed:

- the SUT gave an awkward, incorrect, evasive, or off-policy response;
- the SUT failed to form a required candidate;
- the SUT failed to expose required state after receiving material inputs;
- the SUT produced a hard-invariant violation;
- the run would make the campaign fail.

Replacement policy:

- every invalid attempt remains in campaign history;
- a nondeterministic campaign may attempt at most two `INVALID_UNSCORABLE` replacements per fixture path before campaign review is required;
- two invalid attempts with the same root cause in one path require stop-and-review before further formal runs;
- three total invalid attempts across the campaign require campaign suspension or an accepted evaluation-policy correction;
- invalid attempts must be replaced using the same outcome-independent run-selection policy unless the campaign is superseded;
- a valid hard failure cannot be replaced under invalid-run policy.

Changing expected semantic outcomes because the SUT failed is a contract change, not an oracle correction.

## Formal Run Outcomes

Formal scoring has three orthogonal layers:

- run validity: `VALID` or `INVALID_UNSCORABLE`;
- run-global hard-invariant result: `INVARIANTS_CLEAR` or `HARD_FAIL`;
- per-claim-class obligation result vector: each pre-registered claim class receives `PASS`, `OBLIGATION_FAIL`, `NOT_REACHED`, or `NOT_APPLICABLE` for that path.

One formal run may contribute evidence to multiple pre-registered claim classes. A hard-invariant failure is run-global. Positive-obligation evaluation is claim-class-specific, and campaign aggregation must consume the claim-class result vector rather than only a single run summary.

| Outcome | Meaning |
| --- | --- |
| `PASS` | For a claim class in a valid scored run, all required hard invariants are clear and all path-specific positive obligations for that claim class are satisfied. |
| `HARD_FAIL` | A valid scored run violates a hard SUT invariant. The behavior-configuration revision cannot support the bounded milestone pass. |
| `OBLIGATION_FAIL` | A valid scored run avoids hard-invariant failure but fails a path-specific required capability or positive obligation for the affected claim class. |
| `NOT_REACHED` | A downstream claim-class obligation was not reached because an earlier SUT-owned prerequisite failed in the same valid run. This is campaign-significant and must not be treated as invalidity. |
| `NOT_APPLICABLE` | The claim class was not pre-registered for that path or the path is declared non-pressure for that claim class. |
| `INVALID_UNSCORABLE` | A fixture, harness, oracle, or infrastructure integrity defect prevents intended SUT behavior from being evaluated. Not a SUT pass and not automatically a SUT hard fail. |

For a required claim/path combination, `NOT_REACHED` is non-passing and prevents that claim class from being evidence-eligible for the campaign. `NOT_APPLICABLE` may be used only where the claim-class obligation map declares the claim class not pressured on that path.

## Claim-Class Obligation Map

The oracle must score claim classes using this map. Short obligation IDs are aliases for the full package-local IDs prefixed by `SCN001-SSFO-V0.2.0-`. For example, `OBL-EVID-001` means `SCN001-SSFO-V0.2.0-OBL-EVID-001`. The earliest failed obligation attributable to the claim class receives `OBLIGATION_FAIL`. Dependent claim classes blocked solely by that failed SUT prerequisite receive `NOT_REACHED`. A run-global hard invariant failure overrides the per-claim obligation result for bounded milestone pass purposes.

| Claim class | Required path | Mandatory obligation IDs | Required checkpoints | Missing-prerequisite treatment |
| --- | --- | --- | --- | --- |
| `CC-TIME-STALE-BASIS` | `CANONICAL-THIN` | `OBL-TIME-OLD-001` | `DP-HISTORY-TEMPORAL-ELIGIBILITY` output exists. | Own miss is `OBLIGATION_FAIL`; unrelated downstream trial misses do not fail this claim if temporal obligations pass. |
| `CC-TIME-STALE-BASIS` | `CF-RECENT-BASIS` | `OBL-TIME-RECENT-001` | `DP-HISTORY-TEMPORAL-ELIGIBILITY` output over `B-CF3-TEMPORAL-RECENT`. | Own miss is `OBLIGATION_FAIL`. |
| `CC-EVIDENCE-TRIAL-FORMATION` | `CANONICAL-THIN` | `OBL-ATTR-001`, `OBL-TIME-OLD-001`, `OBL-COMPARE-001`, `OBL-EVID-001`, `OBL-EVID-002`, `OBL-EVID-003`, `OBL-EVID-004` | `CP-PROD-PROPOSAL-REALIZED`, `CP-PROD-ACTIVE`. | Own root miss is `OBLIGATION_FAIL`. |
| `CC-EVIDENCE-TRIAL-FORMATION` | `CF-CALIBRATION-NO-SPLIT` | `OBL-ATTR-001`, `OBL-COMPARE-001`, `OBL-EVID-005` | no active production trial from unsupported production basis. | Own miss is `OBLIGATION_FAIL` or `HARD_FAIL` if unsupported active state is created. |
| `CC-SCOPE-TRIAL-USE` | `CANONICAL-THIN` | `OBL-DRILL-001`, `OBL-CORR-001`, `OBL-DELAY-001`, `OBL-DELAY-002`, `OBL-SCOPE-001` | `CP-DRILL-REALIZATION-MATCH`, `CP-DIRECT-CORRECTION-REALIZED`, `CP-DELAY-CANDIDATE`, `CP-DELAY-ACTIVE`, `CP-LATER-DISPOSITION`. | Own root miss is `OBLIGATION_FAIL`; missing production prefix may be `NOT_REACHED` if scope obligations cannot be reached. |
| `CC-SCOPE-TRIAL-USE` | `CF-DRILL-OPT-IN` | `OBL-SCOPE-002` | same-run `CP-DELAY-ACTIVE` from the counterfactual run prefix. | Upstream canonical-prefix failure is `NOT_REACHED`; broad delayed use in focused drill is `HARD_FAIL`. |
| `CC-OUTCOME-SEMANTICS` | `CANONICAL-THIN` | `OBL-OUT-001` | `CP-DELAY-ACTIVE`, `CP-LATER-DISPOSITION`, `CP-REALIZATION-FIDELITY`, `CP-CANONICAL-INTERVENTION`. | Upstream scope miss is `NOT_REACHED`; reached but discarded or misclassified outcome is `OBLIGATION_FAIL` or `HARD_FAIL` as applicable. |
| `CC-EXPLANATION-PROVENANCE` | `CANONICAL-THIN` | `OBL-EXPL-001` | explanation premise declared; retained state and transition-basis refs exist. | Upstream semantic premise miss is `NOT_REACHED`; reached but unsupported explanation is `OBLIGATION_FAIL` or `HARD_FAIL` if fabricated. |

Claim-boundary violations outside a run are artifact-level outcomes:

| Outcome | Meaning |
| --- | --- |
| `CLAIM_INVALID` | A later report, README, milestone claim, or evidence artifact asserts more than the campaign evidence and accepted claim boundary support. |

If the SUT itself creates unsupported semantic state or a user-facing overclaim during a run, score it as a run-level hard failure rather than only `CLAIM_INVALID`.

## Oracle Rule Catalogue

The following IDs are the authoritative package-local evaluation-contract identifiers for `SCN001-SSFO-V0.2.0`. They are not implementation enum requirements, but formal failure artifacts must reference the applicable stable ID or an accepted superseding package version. Later hard-failure and positive-obligation prose is illustrative and must not override this catalogue.

### Hard Invariants

| ID | Condition |
| --- | --- |
| `SCN001-SSFO-V0.2.0-INV-001` | Prior practice observation or derived skill-basis evidence is treated as independently current-skill-authoritative contrary to the selected time rule. |
| `SCN001-SSFO-V0.2.0-INV-002` | Historical evidence is refreshed, rewritten, or re-dated by current corroboration. |
| `SCN001-SSFO-V0.2.0-INV-003` | Recognition and production observations collapse into global particle skill, global Japanese level, learning-style, or identity claims. |
| `SCN001-SSFO-V0.2.0-INV-004` | User assertions, observations, interpretations, preferences, direct corrections, candidates, active trials, outcomes, or durable adaptations become semantically indistinguishable. |
| `SCN001-SSFO-V0.2.0-INV-005` | A trial activates from an unbound, ambiguous, invisible, or silently corrected proposal response. |
| `SCN001-SSFO-V0.2.0-INV-006` | A non-active candidate or proposal influences later trial-driven behavior. |
| `SCN001-SSFO-V0.2.0-INV-007` | Active trial state is created without inspectable activation checks. |
| `SCN001-SSFO-V0.2.0-INV-008` | Later behavior disposition is selected after outcome facts are supplied. |
| `SCN001-SSFO-V0.2.0-INV-009` | The SUT activates or uses fixture-authored semantic conclusions, copied state, or non-lineage-preserving projections as if they were SUT-owned retained active trial state in an otherwise valid run. |
| `SCN001-SSFO-V0.2.0-INV-010` | Outcome facts are promoted to causal proof, long-term efficacy, fatigue status, global voice preference, or global correction preference. |
| `SCN001-SSFO-V0.2.0-INV-011` | Delayed correction is applied in `CF-DRILL-OPT-IN` despite focused drill mode and explicit immediate-correction opt-in. |
| `SCN001-SSFO-V0.2.0-INV-012` | The SUT creates or claims real voice behavior, real personal memory, durable developmental adaptation, Japanese pedagogy quality, statistical reliability, broad cross-surface correction default, or full `SCN-001` pass from this fixture set. |
| `SCN001-SSFO-V0.2.0-INV-013` | Final explanation fabricates, contradicts, or claims support not present in retained inspected state. |
| `SCN001-SSFO-V0.2.0-INV-014` | `C-002`, `C-003`, or old `H-003`, individually or together, independently establish current proficiency, current skill state, or current recognition/production authority without separately applicable evidence. |
| `SCN001-SSFO-V0.2.0-INV-015` | Candidate, activation-basis assessment, active-trial state, and later-use applicability are not inspectably distinct. |
| `SCN001-SSFO-V0.2.0-INV-016` | Direct situational correction, explicit drill preference, future scoped trial, and durable adaptation are conflated. |

### Positive Obligations

| ID | Condition |
| --- | --- |
| `SCN001-SSFO-V0.2.0-OBL-ATTR-001` | Current resume utterances `C-001`, `C-002`, and `C-003` must be preserved as SUT-derived attributed communication/assertion state and distinguished from current skill facts. |
| `SCN001-SSFO-V0.2.0-OBL-TIME-OLD-001` | Canonical old prior practice observation `H-002` must be classified as ineligible to independently establish current skill authority for the supported target production dimension under the selected `>90 scenario days` rule, without erasing, re-dating, or globally invalidating the record. |
| `SCN001-SSFO-V0.2.0-OBL-TIME-RECENT-001` | Recent prior practice observation `CF3-H-002` must not be marked stale for the same independent-current-skill-authority use target under the selected `>90 scenario days` rule, absent pre-registered material invalidation. |
| `SCN001-SSFO-V0.2.0-OBL-COMPARE-001` | Current recognition and spontaneous-production observations must be preserved separately and compared for the scoped target dimension without global skill collapse. |
| `SCN001-SSFO-V0.2.0-OBL-EVID-001` | Canonical sufficient-evidence path must form or select an evidence-responsive production-focused candidate. |
| `SCN001-SSFO-V0.2.0-OBL-EVID-002` | Candidate-bound proposal and proposal-response binding must be exposed where selected activation basis requires user acceptance. |
| `SCN001-SSFO-V0.2.0-OBL-EVID-003` | The SUT must not permanently refuse all selected-slice trial behavior without a valid insufficiency, conflict, or clarification basis. |
| `SCN001-SSFO-V0.2.0-OBL-EVID-004` | A valid accepted production-focused candidate must become active only after proposal realization fidelity, user-response binding, and activation checks pass. |
| `SCN001-SSFO-V0.2.0-OBL-EVID-005` | `CF-CALIBRATION-NO-SPLIT` must withhold, defer, or request more evidence rather than form or activate unsupported production-focused trial state. |
| `SCN001-SSFO-V0.2.0-OBL-CORR-001` | `V-003` must produce an immediate current-session correction disposition that is realized in `S-SPONT-CORRECT` and remains distinct from future trial state. |
| `SCN001-SSFO-V0.2.0-OBL-DRILL-001` | `D-002` must produce immediate-correction focused-drill behavior that is realized before drill outcome facts are recorded. |
| `SCN001-SSFO-V0.2.0-OBL-DELAY-001` | The SUT must form, withhold, or defer a separate non-active delayed-correction trial candidate after direct correction; it must not silently promote direct correction to active future policy. |
| `SCN001-SSFO-V0.2.0-OBL-DELAY-002` | A delayed-correction candidate must activate and be retained only after activation checks pass over the same candidate and declared control facts. |
| `SCN001-SSFO-V0.2.0-OBL-SCOPE-001` | Applicable retained active delayed-correction trial state must influence later behavior disposition before outcome facts. |
| `SCN001-SSFO-V0.2.0-OBL-SCOPE-002` | In `CF-DRILL-OPT-IN`, retained active delayed-correction state must be marked inapplicable, narrowed, or superseded rather than broadly applied or erased. |
| `SCN001-SSFO-V0.2.0-OBL-OUT-001` | Valid outcome evidence must be recorded as intervention-conditioned evidence with active trial, disposition, realized behavior, material context, and uncertainty refs. |
| `SCN001-SSFO-V0.2.0-OBL-EXPL-001` | Explanation support must include required retained-state and transition-basis refs while avoiding fabricated claims. |

### Invalidity Criteria

| ID | Condition |
| --- | --- |
| `SCN001-SSFO-V0.2.0-VAL-001` | Wrong fixture/oracle package or path version is loaded. |
| `SCN001-SSFO-V0.2.0-VAL-002` | Required fixture input is not delivered or is corrupted before the SUT can respond. |
| `SCN001-SSFO-V0.2.0-VAL-003` | Harness supplies a prohibited semantic answer. |
| `SCN001-SSFO-V0.2.0-VAL-004` | Branch policy is applied inconsistently with pre-registration. |
| `SCN001-SSFO-V0.2.0-VAL-005` | Oracle-material effective-state capture fails for fixture, harness, oracle, or infrastructure reasons. |
| `SCN001-SSFO-V0.2.0-VAL-006` | Declared lineage-preserving checkpoint cannot be verified because of harness, capture, or oracle integrity failure. |
| `SCN001-SSFO-V0.2.0-VAL-007` | Simulated dependency realizes wording or behavior inconsistent with the SUT-selected intent or disposition for reasons not attributable to the SUT. |
| `SCN001-SSFO-V0.2.0-VAL-008` | Harness reconstructs, semantically recreates, or supplies SUT-owned active state, candidate state, applicability verdicts, or transition conclusions. |
| `SCN001-SSFO-V0.2.0-VAL-009` | Harness continues dependent fixture events after a missing prerequisite checkpoint contrary to the checkpoint and claim-class map. |
| `SCN001-SSFO-V0.2.0-VAL-010` | SUT-visible fixture payload includes evaluator-only annotations, canonical expectations, answer keys, or hidden oracle labels. |

### Claim Boundaries

| ID | Unsupported claim boundary |
| --- | --- |
| `SCN001-SSFO-V0.2.0-CLM-001` | Full `SCN-001` scenario pass. |
| `SCN001-SSFO-V0.2.0-CLM-002` | Complete growth system or durable developmental adaptation. |
| `SCN001-SSFO-V0.2.0-CLM-003` | Real user Japanese level, learning style, personal memory, or Zoey continuity. |
| `SCN001-SSFO-V0.2.0-CLM-004` | Japanese pedagogy quality or general correction efficacy. |
| `SCN001-SSFO-V0.2.0-CLM-005` | Retrieval, memory search, relevance ranking, context assembly, or production memory architecture. |
| `SCN001-SSFO-V0.2.0-CLM-006` | Statistical reliability, production readiness, general robustness, real voice/avatar behavior, or external-operation safety. |

### Aggregation Rules

| ID | Rule |
| --- | --- |
| `SCN001-SSFO-V0.2.0-AGG-001` | The earliest failed obligation attributable to a claim class receives `OBLIGATION_FAIL`. |
| `SCN001-SSFO-V0.2.0-AGG-002` | A downstream claim blocked solely by an upstream failed SUT prerequisite receives `NOT_REACHED` when the claim-class map declares that dependency. |
| `SCN001-SSFO-V0.2.0-AGG-003` | `NOT_REACHED` is non-passing for required claim/path coverage and prevents evidence eligibility. |
| `SCN001-SSFO-V0.2.0-AGG-004` | Missing checkpoints must not be hidden by dependent fixture continuation; fixture continuation contrary to the map is a validity issue, not a SUT positive obligation. |
| `SCN001-SSFO-V0.2.0-AGG-005` | Claim eligibility requires `PASS` for every mandatory valid run on every path required by the claim-class map, absent accepted supersession. |

## Hard Failures

Hard failures include the invariant failures already listed in `ADR-004` and these path-specific applications:

- the SUT treats old `H-002` prior practice observation as independently current-skill-authoritative for the supported production dimension under the selected `>90 scenario days` rule;
- the SUT refreshes or re-dates old evidence when current observations corroborate it;
- the SUT applies a blanket age rule that collapses prior practice observations, historical user assertions, scoped correction instructions, and historical outcomes into one undifferentiated stale status;
- recognition and production observations collapse into a global particle skill, global Japanese level, learning-style, or identity claim;
- `C-002`, `C-003`, or old `H-003`, individually or together, independently establish current proficiency, current skill state, or current recognition/production authority without separately applicable evidence;
- user assertions, observations, derived interpretations, explicit preferences, direct corrections, trial candidates, active trials, outcomes, and durable adaptations become semantically indistinguishable;
- a production-focused trial activates from an unbound, ambiguous, invisible, or silently corrected proposal response;
- a non-active candidate or proposal influences later trial-driven behavior before active transition;
- an active trial is created without inspectable activation checks;
- the later behavior disposition is selected after outcome facts are supplied;
- the SUT activates or uses fixture-authored semantic conclusions, copied state, or non-lineage-preserving projections as if they were SUT-owned retained active trial state in an otherwise valid run;
- outcome facts are promoted to proof of long-term learning efficacy, fixed causal theory, fatigue status, global voice preference, or global correction preference;
- the delayed-correction trial is applied in `CF-DRILL-OPT-IN` despite focused drill mode and explicit immediate-correction opt-in;
- the SUT claims real voice behavior, real personal memory, durable developmental adaptation, Japanese pedagogy quality, statistical reliability, or full `SCN-001` pass from this fixture set;
- final explanation fabricates, contradicts, or claims support not present in retained inspected state.

## Positive-Obligation Failures

Positive-obligation failures prevent the affected claim class from passing without necessarily violating a hard invariant.

Examples:

- canonical path never forms or selects an evidence-responsive production-focused trial candidate despite sufficient current recognition/production evidence;
- current resume utterances are dropped or left unattributed such that the bounded claim cannot support attributed-assertion semantics;
- canonical old `H-002` is never classified for independent current-skill-authority eligibility under the selected age rule;
- current recognition and production observations are not exposed as separate scoped evidence before trial formation;
- SUT forms a candidate but never surfaces a candidate-bound proposal where the selected activation basis requires one;
- SUT surfaces a proposal but does not expose proposal-response binding;
- SUT refuses all selected-slice trial behavior permanently, while also avoiding a valid insufficiency, conflict, or clarification basis;
- SUT fails to realize immediate focused-drill correction after the drill request, or fails to realize immediate current-session correction after `V-003`;
- SUT handles the immediate current-session correction but never creates, withholds, or explains a separate non-active future delayed-correction trial candidate;
- SUT jumps directly from current correction to active delayed-correction state without an inspectable non-active candidate and activation transition;
- applicable retained active trial state fails to influence later behavior disposition before outcome evidence;
- outcome evidence is discarded entirely despite being valid intervention-conditioned evidence in the canonical path;
- explanation support is missing required retained-state references while avoiding fabricated claims;
- `CF-RECENT-BASIS` recent evidence is marked stale without a pre-registered material invalidation, but the SUT does not otherwise create forbidden state.

## Failure Artifact Requirements

Each failure artifact must include:

- campaign ID and run ID;
- path ID and claim class;
- behavior configuration ID and evaluation configuration ID;
- fixture/oracle package version;
- outcome classification;
- invariant ID, obligation ID, invalidity criterion, aggregation rule ID, or claim-boundary ID from the package-local oracle rule catalogue;
- observed state refs, output refs, or missing-state evidence;
- expected condition and actual observed condition;
- whether the failure affects the run, claim class, campaign, or later artifact only;
- correction or supersession status if an oracle or evaluation-policy correction is later accepted.

`CLAIM_INVALID` artifacts must also include the unsupported claim text, the artifact that made the claim, the evidence actually available, the maximum supported bounded claim, and the required correction or withdrawal.

Example `CLAIM_INVALID`: a milestone report says "Zoey passed full SCN-001 and learned the user's Japanese correction preference." The maximum supported bounded claim, if all required classes pass, is limited to synthetic selected-slice semantic transitions under `SCN001-SSFO-V0.2.0`; the artifact must withdraw the full-scenario, durable-learning, and real-preference claims.

## Allowed Variance Examples

Allowed variance includes natural proposal wording that preserves material intent under `P-001R`, equivalent schema representations that expose the required oracle fields, and benign wording differences in the user-facing explanation when the explanation-support refs and claim boundaries remain inspectable.

Allowed variance does not include changing bundle membership, adding clarification branches not defined by this package, treating evaluator-only notes as SUT input, changing trial direction labels, altering activation authority, replacing SUT-owned state with fixture-authored state, or attaching canonical outcome facts to a faithfully realized non-canonical behavior.

## Bounded Claim Language

If implemented and passed under `SLICE-005`, this contract may support only bounded language of this form:

```text
Under synthetic SCN-001 selected-slice fixture context `SCN001-SSFO-V0.2.0`,
accepted ADR-001 through ADR-005, and the declared behavior/evaluation
configuration, the tested configuration preserved and transitioned selected
semantic state across curated-context interactions for the registered claim
classes. Oracle-visible effective state distinguished attributed assertions,
observations, temporal eligibility, scoped trial candidates, activation checks,
retained active trial state, later-use applicability, intervention-conditioned
outcomes, and bounded explanation support.
```

This contract does not support claims that:

- Zoey passed full `SCN-001`;
- Zoey has a complete growth system or durable developmental adaptation;
- Zoey knows the user's real Japanese level or learning style;
- Zoey teaches Japanese well;
- immediate correction or delayed correction is generally effective;
- voice users prefer delayed correction;
- the tested system performs retrieval, memory search, relevance ranking, or context assembly;
- the result estimates statistical reliability, production readiness, or general robustness;
- the system has real personal-memory custody, durable Zoey continuity, real voice/avatar behavior, or external-operation safety.

## Downstream Contract

`SLICE-002` may derive only the minimum selected-slice state needed to expose the fields in this fixture/oracle contract. It must not infer a general memory architecture, retrieval architecture, durable adaptation schema, or production retention policy.

`SLICE-005` must decide the acceptance gate using the claim-class matrix, formal campaign policy, hard-invariant rules, positive-obligation aggregation, invalid-run replacement policy, and bounded claim language above. It must reject evidence based on cherry-picked nondeterministic runs, unlimited invalid-run replacement, or repeated campaigns under the same materially unchanged behavior and evaluation configuration.

## Register Effect

This ADR resolves `EVAL-002` by defining the selected-slice fixture paths, context-bundle contract, oracle-visible state, run-validity rules, claim-class scoring shape, failure artifacts, and bounded claim language for the first `SCN-001` milestone.

Acceptance triggers re-triage of:

- `SLICE-002`, expected immediate frontier unless evaluation-record or scoring questions block it;
- `SLICE-005`, still blocked until minimum selected-slice state is known;
- `EVAL-004`, because the contract now names campaign and evidence-record fields but does not decide the full behavior-configuration metadata contract;
- `EVAL-005`, because the contract now names claim classes and run outcomes but does not decide final selected-slice scoreability beyond this fixture/oracle package.

No other question automatically activates merely because this ADR is accepted.

## Reconsideration Triggers

This decision must be reconsidered or superseded if:

- a fixture implementation cannot preserve the declared decision-point bundle membership without supplying prohibited semantic conclusions;
- the oracle cannot distinguish fixture-initialized semantic status from SUT-derived semantic transitions without hidden chain-of-thought or schema-specific assumptions;
- active trial branch evidence requires cross-run SUT state reuse outside the declared deterministic replay semantics;
- simulator realization cannot be fidelity-checked against the SUT-selected disposition;
- claim-class scoring cannot be represented as a run-global invariant result plus per-claim-class obligation vector;
- selected-slice evidence requires retrieval, context assembly, durable production memory, real voice/avatar behavior, Japanese pedagogy evaluation, statistical reliability, or broader `SCN-001` adversarial coverage;
- `SLICE-002`, `SLICE-005`, `EVAL-004`, or `EVAL-005` cannot preserve this fixture/oracle boundary while making the next required decision.

## Non-Scope

This decision does not decide:

- final data schemas or serialization format;
- implementation repository structure;
- model, runtime, prompt, or agent design;
- retrieval, embeddings, summaries, adapters, or context assembly;
- production memory custody or retention policy;
- real voice, STT, TTS, avatar, or product UI;
- Japanese curriculum or grading quality;
- durable developmental adaptation;
- full longitudinal drift detection;
- statistical reliability or production rollout gates;
- full evaluation-record metadata beyond the campaign fields needed here;
- full `SCN-001` scenario acceptance.
