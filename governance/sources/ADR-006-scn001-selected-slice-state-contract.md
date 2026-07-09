# ADR-006: SCN-001 Selected-Slice State Contract

Status: `Accepted`

Date: 2026-07-08

Accepted: 2026-07-09

Record revision: `R2`

Decision authority: project owner

Resolved question IDs: `SLICE-002`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.14`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.15` records `SLICE-002` as resolved by this ADR, activates `DEP-001` as the next immediate frontier, leaves `SLICE-003` blocked until dependency identity metadata is known, and re-triages `SLICE-005`, `EVAL-004`, and `EVAL-005` without automatically activating them.

## Decision

Adopt a minimum selected-slice state contract for `SCN001-SSFO-V0.2.0`.

The first selected slice uses run-scoped cross-transition semantic state, SUT-owned transition evidence, and lineage-preserving projections. It must not turn every oracle-visible field from `ADR-005` into persisted database state.

For this ADR, "persisted" means retained inside the evaluated synthetic run long enough to drive the last required SUT consumer or the last required explanation-support use for that information. Oracle capture may preserve SUT-owned transition evidence after that last consumer. Persisted does not mean production memory custody, durable Zoey continuity, real personal history, or a final storage schema.

The selected slice classifies oracle-visible information into five categories:

1. `cross_transition_sut_state`: SUT-owned semantic state whose identity, lifecycle, or later behavior-driving use must survive at least one selected-slice transition boundary.
2. `sut_transition_evidence`: SUT-owned semantic transition result, assessment, or control decision that must be inspectable and ordered, but need not remain behavior-driving after its last required SUT consumer.
3. `lineage_preserving_projection`: a view or reference over the same retained SUT state, retained SUT transition evidence, or retained input facts, adding no new fixture-authored semantic conclusion.
4. `derived_inspection_fact`: an oracle-computed fact used to validate, score, or compare exposed state without becoming behavior-driving SUT state.
5. `fixture_or_oracle_only`: fixture setup, evaluator annotation, branch policy, score, claim-class mapping, or hidden ground truth that must not become SUT-owned semantic state.

These categories classify oracle-material semantic state, SUT-owned semantic transition evidence, and evaluation-facing facts. They are not an exhaustive taxonomy of runtime artifacts. Purely computational or transient working artifacts remain outside this selected-slice semantic taxonomy unless a governed transition makes them semantic state or they become separately control-relevant derived artifacts.

The implementation may use event-sourced records, mutable semantic records with transition logs, tables, documents, in-memory objects observed by the harness, or another inspectable representation. The representation passes this contract only if the required identities, lineage, ordering, scopes, lifecycle distinctions, and claim-support limits below are preserved.

Harness capture, inspection, serialization, or snapshotting may observe SUT-owned state. It must not satisfy cross-interaction retention by restoring, reinjecting, or recreating required SUT state after the SUT has lost it, except under a separately classified deterministic replay or fixture-start semantics that does not count as fresh persistence evidence.

## Mechanism And Topology Non-Assumptions

This ADR does not select or require a single-model, multi-model, local, hosted, hybrid, agentic, deterministic, or provider-session topology.

The contract specifically avoids assumptions about several future pressure areas: active cognitive-frame/context construction, inference lifecycle, routing and fallback among cognitive mechanisms, and provider/session-side persistence. These names are descriptive future pressure areas, not registered open-question IDs, active frontier items, compatibility claims, or decisions resolved by this ADR. `OPEN_QUESTIONS.md` remains authoritative for question status and activation order.

This ADR makes no evaluated compatibility claim about any future inference architecture. Any such claim remains subject to `EVAL-004` and the relevant trust, runtime, memory, and derived-artifact questions.

The selected-slice state contract must not derive the identity, lifecycle, authority, or persistence requirement of a semantic state role from one particular model, runtime, agent, provider, process, module, or orchestration topology unless an accepted selected-slice contract requires that topology. A trial candidate, active trial, behavior disposition, outcome record, or explanation support record is a semantic role with lineage and lifecycle; it is not defined by whether it was produced by a local model, hosted model, deterministic rule, prompt, agent, service, or future cognitive mechanism.

Mechanism neutrality does not erase provenance. Where consequence or inspection requires lineage, retained state may identify a candidate source, basis references, or producing-mechanism reference without making that mechanism part of the state's semantic identity. A model/runtime reference may explain how a candidate was generated; it must not by itself make the candidate true, active, authoritative, durable, or valid evidence.

Producing a semantic candidate does not establish activation authority. This applies to large models, small models, deterministic classifiers, rule engines, retrieval systems, summaries, agents, tools, and future cognitive services. Candidate generation, proposal binding, activation checks, later-use applicability, outcome classification, and explanation support remain distinct selected-slice responsibilities under the accepted ADRs.

Computational artifacts are not automatically selected-slice semantic state. The term is intentionally broad and includes, without limitation, prompts, model requests, model responses, provider or agent threads, runtime caches, agent scratchpads, inference traces, tool traces, checkpoints, and provider/session state. This is a semantic-state classification rule, not a prohibition on retaining such artifacts for evaluation, debugging, replay, observability, or infrastructure purposes. Retention of such an artifact does not by itself make it SUT-owned semantic state, valid evidence, transition authority, or a valid substitute for the selected-slice state anchors required by this ADR. Required semantic lineage must not be interpreted as a requirement to retain entire computational artifacts where stable basis references, transition records, or later `EVAL-004`/dependency metadata would preserve the selected-slice obligation. Separate controls may apply to retained computational artifacts under later evaluation, retention, permitted-use, derived-artifact, or trust-boundary decisions; non-semantic does not mean ungoverned.

Opaque mechanism-local memory cannot satisfy selected-slice persistence obligations. If a model, agent, provider session, local cache, or runtime checkpoint happens to remember a prior interaction, that memory does not count as retained active trial state, proposal binding, later-use applicability state, or explanation basis unless the required semantic state is inspectably available as SUT-owned effective state with preserved identity and lineage.

Derived selected-slice state must not erase its basis. A retained interpretation, comparison, candidate, or explanation support record must remain distinguishable from the observations, assertions, chronology, correction events, and transition checks on which it depends. A compressed inference must not replace the source-bearing evidence when later selected-slice behavior, inspection, or explanation requires that basis.

## Classification Rule

An oracle-visible fact requires `cross_transition_sut_state` when any of these are true:

- a later behavior disposition, activation, outcome update, or explanation must use the same SUT-owned object or transition basis;
- the fact's identity must survive a selected-slice interaction boundary;
- the fact is the retained object whose lineage anchors candidate -> proposal -> response -> activation -> active trial -> later use -> outcome -> explanation support.

The categories describe an item's current selected-slice retention responsibility, not an immutable semantic type. A SUT-owned result is `cross_transition_sut_state` while a future required SUT consumer or selected simulated dependency must access that same state identity, semantic result, or transition basis. After its last required consumer, the same historical transition may remain only as `sut_transition_evidence` for oracle inspection or later lineage, provided no future behavior-driving transition requires the original live state. Reclassification from cross-transition state to transition evidence must not rewrite the historical transition or sever required lineage.

An oracle-visible fact requires `sut_transition_evidence` when any of these are true:

- the SUT owns the semantic transition result or control decision, but no later behavior needs the same object after the last consumer;
- ordering, basis, scope, status origin, or transition result must be inspectable to score an `ADR-005` obligation;
- loss or conflation of the fact would be a hard invariant or positive-obligation failure, but oracle capture after the last consumer is enough to preserve scoreability;
- the fact records a SUT-produced assessment such as temporal eligibility, comparison, proposal binding, activation assessment, applicability assessment, non-activation disposition, or explanation-support output.

An oracle-visible fact may be a lineage-preserving projection when:

- it only exposes the same retained state in an oracle-friendly shape;
- it can be regenerated from retained input facts, retained transition records, and stable state references;
- it does not add relevance rankings, applicability verdicts, trial choices, temporal conclusions, or support claims that the SUT was responsible for producing.

An oracle-visible fact may be a derived inspection fact when:

- it exists only to validate ordering, equivalence, distinguishability, eligibility, claim support, or failure classification;
- it is not consulted by the SUT as behavior-driving state;
- it can be recomputed by the oracle from exposed effective state, fixture facts, and accepted rule IDs.

A fact is fixture/oracle-only when it is an answer key, path-pressure label, claim-class result, campaign score, branch-control rule, evaluator note, hidden scenario ground truth, or canonical expectation. These facts must not be represented as SUT semantic memory.

For any path that reaches `DP-EXPLAIN`, retention horizon is determined by the accepted explanation premise and the actual behavior-change lineage, not by whichever facts the generated explanation happens to cite. Any retained state or SUT transition evidence materially required to explain the selected behavior-change lineage must remain SUT-accessible through `DP-EXPLAIN`, either directly or through a lineage-preserving descendant transition record that preserves the relevant basis. Oracle-only capture cannot substitute for SUT-accessible explanation basis. The SUT may omit incidental control mechanics from user-facing wording, but omission from wording does not retroactively make material behavior-change basis disposable.

## Actual Cross-Transition Core

The selected-slice minimum is easiest to read as this lifecycle core:

- cross-transition while live: source-bearing input facts needed by later SUT transitions, SUT-derived attributed/control state needed later, candidates until proposal/activation, proposal intent until binding/activation, active scoped trials, direct correction disposition until realization and delayed-candidate formation, behavior disposition until realization/outcome, and intervention-conditioned outcome until explanation;
- transition evidence after last SUT consumer: temporal assessments, comparisons, proposal binding, activation assessments, applicability reviews, non-activation dispositions, and explanation support;
- lineage-preserving projection: oracle-friendly views over retained state, retained transition evidence, or retained input facts;
- oracle-derived or oracle-only: ordering correctness, lineage validity, semantic distinguishability, failure classification, claim classification, scoring, branch policy, and hidden ground truth.

## Minimum State And Transition Evidence Contract

The selected slice requires these state anchors, transition evidence records, or equivalent lineage. Applicability is path-conditional; "required" means required only on paths and checkpoints that reach the relevant transition under `ADR-005`.

| Anchor | Classification | Applicability | Minimum content | Retention horizon |
| --- | --- | --- | --- | --- |
| Run-scoped SUT state boundary | `cross_transition_sut_state` | All evaluated paths. | Opaque run-state identity, synthetic actor/scope identity where required, retention-basis relation, permitted-use/run-scope/discard status, and delivered SUT-visible control fact relations. Fixture package, path, accepted ADR baselines, campaign IDs, and evaluation config remain harness/oracle metadata unless represented only as an opaque SUT-visible control reference. | Through the formal run; external campaign metadata may persist only in harness/oracle records. |
| Delivered, ingested, and used input-fact relations | `cross_transition_sut_state` where later used; `sut_transition_evidence` for ingestion/use transitions; harness metadata for delivery. | All paths that deliver fixture facts. | Distinguish harness-delivered facts, SUT-retained/ingested facts, and transition-basis use relations. Preserve fixture item identity, role/provenance, occurrence/observation time, session order, context labels, task-mode labels, and copied value fields needed for later SUT use. | Source-bearing facts that support later behavior or explanation survive to that consumer; ingestion/use evidence may be oracle-captured after last consumer. |
| Attributed communication/assertion state | `cross_transition_sut_state` | Current-path resume and any path using `C-001`, `C-002`, or `C-003`. | Current-path utterance refs, source actor, time/context, attributed status, epistemic status, status origin, and SUT transition-basis relations for SUT-derived attribution. | Through any candidate, outcome, or explanation that cites those assertions; otherwise after oracle capture of attribution evidence. |
| Observation evidence state | `cross_transition_sut_state` where later used. | Recognition/production, drill, and outcome paths that use observations. | Recognition, production, drill, and outcome observation refs with task mode, dimension, correctness, scorer provenance, and separation from interpretation. | Through the last comparison, candidate, outcome, or explanation that cites the observation. |
| Temporal eligibility assessment | `cross_transition_sut_state` while a candidate or activation transition still consumes it; then `sut_transition_evidence`. | Paths that use historical or recent evidence as current-authority basis. | Assessed evidence/basis relation, use target, scenario time, selected `>90 scenario days` rule result where applicable, temporal uncertainty, and no re-dating of historical facts. | Through every candidate or activation transition that consumes the assessment. After the last such consumer, oracle capture is sufficient unless actual explanation lineage requires SUT-accessible support. |
| Dimension comparison state | `cross_transition_sut_state` until candidate formation consumes it; then `sut_transition_evidence`, with cited observations retained as state where later needed. | Calibration and production-candidate paths. | Recognition evidence relation, production evidence relation, target dimension, scoped comparison result, uncertainty, and no global skill/proficiency claim. | Through candidate formation. A later retained candidate may preserve its support relation to the comparison and source observations, but a generic affirmative support summary is not a substitute for the original SUT-owned comparison transition. |
| Optional scoped interpretation or hypothesis | `sut_transition_evidence` or `cross_transition_sut_state` if later used. | Optional; required only if explicitly formed as SUT semantic state or materially used as candidate/activation basis. | Scope, epistemic status/uncertainty, evidence lineage, revision/supersession relation, and distinction from assertions, observations, candidates, trials, outcomes, and adaptations. | Same as its last candidate, activation, behavior, outcome, or explanation consumer. No record is required if the candidate is directly derived from comparison/evidence without an intervening hypothesis. |
| Trial candidate state | `cross_transition_sut_state` when a candidate is formed. | Required on paths that form a candidate; absent on paths that withhold before candidate formation. | Candidate ID, material trial intent, trial-direction relation, source, provisional/evaluative purpose, support lineage, proposed scope, reversibility/correction path, lifecycle status, and relation to applicable activation assessment if one exists. Non-activation disposition, generic candidate stale/current status, and intrinsic activation-basis status are excluded. | Through proposal, activation, withholding/retirement, or last explanation-support use that references the candidate. |
| Proposal intent and binding evidence | Proposal intent and binding are `cross_transition_sut_state` until activation consumes them; then `sut_transition_evidence`. | Paths that surface a proposal. | Surfaced proposal relation, candidate relation, SUT material intent, user response relation, binding assessment, ambiguity/conflict status, relation to applicable activation assessment if one exists, and ordering. Simulator realization metadata is not sole evidence that the proposal existed. Overall activation-basis status belongs to activation assessment evidence. | Proposal and binding survive until activation or retirement; binding evidence may be oracle-captured after activation. |
| Activation assessment evidence | `cross_transition_sut_state` until active-trial creation consumes it; then `sut_transition_evidence`. | Paths that attempt activation. | Candidate relation, activation basis type, check results for scope, basis lineage, temporal/basis eligibility, user-governed constraints, reversibility, consequence, current applicability, retention basis, and non-adaptation boundary. | Until active-trial creation or non-activation disposition is recorded; oracle capture is sufficient afterward unless actual explanation lineage requires SUT-accessible support. |
| Active scoped trial state | `cross_transition_sut_state` | Paths with activated production-focused or delayed-correction trials. | Active trial ID, activation time/order, preserved lineage to candidate and activation assessment, active scope, retained-state identity, current status, narrowing/retirement/supersession/conflict relations, and correction path. | Through later-use applicability, behavior disposition, outcome, and explanation-support uses that depend on the trial. |
| Scoped user-governed correction/control event state | `cross_transition_sut_state` while later behavior, candidate formation, or explanation needs the scoped control meaning; then `sut_transition_evidence`. | `H-004`, `D-002`, `V-003`, and counterfactual drill-opt-in control/correction events. | Communicative act relation, interpreted target, scope, status/authority origin, current applicability, supersession/conflict relation where applicable, relation to direct correction or drill behavior, and distinction from active trials, global preferences, and outcomes. | `D-002` survives through drill disposition, drill outcome, delayed-candidate basis, and explanation basis where used. `V-003` survives through direct disposition, realization, delayed-candidate formation, delayed activation, and explanation basis where used. |
| Direct correction disposition evidence | `cross_transition_sut_state` until realization and delayed-candidate formation consume it; then `sut_transition_evidence`. | `V-003` / `S-SPONT-CORRECT` direct current-session correction path. | Current-session behavior disposition ID, correction-event basis, context scope, timing/order, and explicit distinction from future trial state. | Until immediate behavior realization and delayed-correction candidate formation that uses it; oracle capture is sufficient afterward unless actual explanation lineage requires SUT-accessible support. |
| Later-use applicability evidence | `cross_transition_sut_state` until behavior disposition consumes it; then `sut_transition_evidence`. | Paths that later reuse an active trial. | Active trial relation, later context relations, applicability review result, narrowing/supersession/conflict result where applicable, selected behavior disposition relation, and pre-outcome ordering. | Until behavior disposition and outcome update; oracle capture is sufficient afterward unless actual explanation lineage requires SUT-accessible support. |
| Behavior disposition state | `cross_transition_sut_state` until simulator realization and outcome update consume it; then `sut_transition_evidence`. | Drill, current-session correction, and later-use behavior paths. | SUT-selected behavior disposition ID, material intent, selected timing behavior, basis relations, and ordering before simulator realization. Simulator realization refs are not fields that prove the original disposition existed. | Until simulator realization and outcome update; oracle capture is sufficient afterward unless actual explanation lineage requires SUT-accessible support. |
| Realization relation and retained simulator fact | SUT side: projection/relation over disposition; simulator side: fixture input/projection. | Paths where simulator realizes SUT proposal or disposition. | SUT proposal/disposition relation, simulator realization fact relation, fidelity/mismatch origin where delivered, and realized behavior descriptor only where later used by the SUT. | Until outcome update or explanation-support use. No independent `RealizationLinkState` object is required. |
| Intervention-conditioned outcome state | `cross_transition_sut_state` | Paths that observe outcome after intervention. | Outcome record ID, outcome fact relations, active trial relation, behavior disposition relation, realized behavior relation, material context relations, co-intervention status, intervention-conditioned classification, and causal uncertainty. | Through final explanation-support use; oracle capture is sufficient afterward. |
| Explanation support output | `sut_transition_evidence` generated at `DP-EXPLAIN`. | Canonical path and any path that reaches explanation. | Explanation support ID, user-facing claim relations, retained state relations, transition-basis relations, uncertainty markers, epistemic limitations, scope limitations, unsupported causal/generalization limits, and no hidden chain-of-thought dependency. | Until oracle capture completes. |
| Non-activation disposition evidence | `sut_transition_evidence`; `cross_transition_sut_state` only if a later SUT transition consumes it. | Paths that withhold, defer, request more evidence, ask clarification, retire, or narrow instead of forming or activating a candidate. | Disposition, affected candidate/proposed effect if any, basis relations, timing/order, and distinction from candidate state. | Until oracle capture or later candidate formation that uses the disposition. |
| Unsupported durable-adaptation boundary evidence | `sut_transition_evidence` | Conditional; required only where a proposed or explained semantic effect would otherwise imply unsupported durable adaptation. | Proposed broader effect, supported selected-slice effect, unsupported boundary reason, scope limits, and relation to retained evidence. | Until oracle capture or explanation-support use. Absence of prohibited durable-adaptation state may be sufficient when no broader effect is proposed. |

The minimum contract does not require each row above to be a separate table, class, document, or database collection. It requires that the effective SUT representation preserve the listed semantic identity and lineage.

Run-level retention basis may govern multiple state items through an unambiguous namespace or membership relation. Each record does not need to duplicate purpose, permitted-use, or discard fields if the relationship remains inspectable and cannot be confused with durable production memory.

Later relations may reference earlier state objects, but later realization or response metadata must not be the sole evidence that the earlier SUT disposition or proposal already existed. Final aggregate object shape is insufficient without transition ordering, version history, or equivalent transition evidence.

## Path Applicability

The state contract is conditional on the path and checkpoint reached:

| Requirement family | Canonical path | `CF-CALIBRATION-NO-SPLIT` | `CF-DRILL-OPT-IN` | `CF-RECENT-BASIS` |
| --- | --- | --- | --- | --- |
| Attribution and retained source facts | Required. | Required for reused current-path communications and source facts in the counterfactual prefix. | Required for prefix facts needed to reach active delayed trial. | Required for reused resume communications and recent-basis source facts. |
| Temporal eligibility | Required for historical/current-authority distinction. | Required where old history is presented. | Prefix-dependent. | Required for recent basis; recent practice must not be stale by blanket retention age. |
| Recognition/production comparison | Required. | Required, but supports non-activation rather than production candidate. | Prefix-dependent. | Required only if the path continues to comparison pressure. |
| Production-focused candidate/proposal/activation | Required. | Absent or non-activated with disposition evidence. | Prefix-dependent. | Conditional on path continuation. |
| Active delayed-correction trial | Required after the `D3` direct current-session correction, delayed-candidate formation, and delayed-candidate activation. | Not reached. | Required as prefix state for opt-in/narrowing pressure. | Not pressured unless path continues. |
| Later-use behavior and outcome | Required. | Not reached. | Not required except for narrowing/inapplicability evidence. | Not pressured unless path continues. |
| Explanation support | Required if the path reaches `DP-EXPLAIN`. | Not required unless the path includes an explanation checkpoint. | Not required unless the path includes an explanation checkpoint. | Not required unless the path includes an explanation checkpoint. |

## ADR-005 Oracle Field Mapping

| `ADR-005` field family | SLICE-002 classification | Minimum contract |
| --- | --- | --- |
| Run boundary | `cross_transition_sut_state` for opaque SUT state boundary; harness/oracle metadata for campaign identity | Campaign/run/path/evaluation identifiers are mainly harness/oracle metadata. The SUT must maintain a run-scoped state boundary and any SUT-visible control relations it uses without receiving answer-key package identity as semantic evidence. |
| Retention basis | Retained input/control fact plus `cross_transition_sut_state` application state | `FC-RET-001` remains fixture-supplied, but the SUT must retain enough to show selected state is run-scoped, permitted for evaluation use, and discardable after trajectory. |
| Event history | Retained input-fact relations; projected event history view | Fixture event facts keep fixture provenance. SUT projections must not turn them into derived semantic conclusions, and must distinguish delivered, ingested, and used facts. |
| Attributed assertions | `cross_transition_sut_state` for current-path attribution; retained fixture-origin state for initialized history | Current resume utterances require SUT-derived attribution. Fixture-initialized historical status remains marked as fixture-origin. |
| Observations | Retained input-fact relations plus SUT-owned transition evidence for comparisons/outcomes where used | Raw item/correctness facts are fixture-origin; SUT-owned comparisons and outcome classifications are separate. |
| Temporal judgments | `cross_transition_sut_state` while consumed by candidate/activation; then `sut_transition_evidence` | The SUT owns current-authority eligibility and stale-basis assessment for a use target. Oracle may derive correctness from chronology and rule IDs. |
| Dimension comparison | `cross_transition_sut_state` until candidate formation; then `sut_transition_evidence` | The scoped recognition/production comparison must be inspectable before candidate formation without becoming a global skill/proficiency state. |
| Optional interpretation/hypothesis | Conditional `sut_transition_evidence` or `cross_transition_sut_state` | Required only if formed as SUT semantic state or materially used as explicit candidate/activation basis. It must expose scope, uncertainty, and evidence lineage. |
| Trial candidate | `cross_transition_sut_state` when formed | Candidate identity, material intent, source, scope, support lineage, and lifecycle status persist through the last proposal, activation, retirement, or explanation-support consumer. Non-activation dispositions and activation-basis status are separate. |
| Proposal binding | Proposal intent and binding as `cross_transition_sut_state` until activation consumes them; then `sut_transition_evidence` | Proposal intent, surfaced proposal, user response, and binding assessment remain distinct from candidate and activation. Realization/response metadata cannot be the only proof the earlier proposal existed, and activation-basis status belongs to activation assessment. |
| Activation checks | `cross_transition_sut_state` until active-trial creation; then `sut_transition_evidence` | Activation-check result sets must be retained or reconstructable from retained transition records without oracle-added conclusions until active trial creation or non-activation disposition. |
| Active trial | `cross_transition_sut_state` | Active trial identity must persist across the synthetic interaction boundary and through canonical and counterfactual later-use checks that depend on it. |
| Scoped correction/control events | `cross_transition_sut_state` while later behavior, candidate formation, or explanation needs them; then `sut_transition_evidence` | `D-002` and `V-003` must preserve interpreted target, scope, status origin, and conflict/supersession relations without becoming global preferences. |
| Direct correction disposition | `cross_transition_sut_state` until realization and delayed-candidate formation; then `sut_transition_evidence` | Current-session correction behavior must be inspectable and distinct from future trial state. |
| Later-use applicability | `cross_transition_sut_state` until behavior disposition; then `sut_transition_evidence` | Later behavior selection must record active trial relation, applicability review, disposition relation, and pre-outcome ordering. |
| Realized behavior | SUT disposition as cross-transition state until realization/outcome; simulator realization fact as fixture input/projection | The SUT owns the intent or disposition. The simulator owns fidelity and realized-behavior facts. The realization relation may be derived from preserved disposition and simulator fact references. |
| Outcome record | `cross_transition_sut_state` | Intervention-conditioned classification and uncertainty must be retained with active trial, disposition, realization, outcome, and material-context relations until explanation-support use. |
| Explanation support | `sut_transition_evidence` generated at `DP-EXPLAIN` | It must cite retained state/evidence relations and expose epistemic, scope, causal, and generalization limits without requiring hidden chain-of-thought. |
| Failure artifacts | Oracle-only | Validity, hard-failure, obligation, aggregation, and claim-boundary classifications are not SUT semantic state. |
| Claim-class result vector | Oracle-only | `PASS`, `OBLIGATION_FAIL`, `NOT_REACHED`, `HARD_FAIL`, and campaign aggregation are scoring artifacts. |
| Completeness declarations | Fixture/oracle-only, except SUT-visible control facts may be retained as input facts | Exhaustiveness rules guide fixture/oracle interpretation; they must not become hidden SUT knowledge beyond declared SUT-visible controls. |
| Branch policy and path gating | Fixture/oracle-only | The SUT may observe delivered facts and simulator results, not the canonical answer path. |
| Bounded claim language | Oracle/reporting boundary | The SUT must avoid overclaims, but campaign claim text is not behavior-driving semantic state. |

## Lineage-Preserving Projection Rules

Lineage-preserving projections are allowed and expected. They are how this state contract avoids becoming a final schema.

A projection is valid only if it:

- points to retained state, retained transition evidence, or retained input facts by stable reference;
- preserves source provenance, chronology, semantic status origin, scope, lifecycle, and transition basis;
- can be regenerated without changing the underlying semantic meaning;
- does not add fixture-authored stale/current labels, trial recommendations, applicability verdicts, relevance rankings, or causal conclusions;
- does not replace a lost candidate, proposal, active trial, behavior disposition, or outcome record.

The `sut_state_reference` items in `ADR-005`, including `L-002` and `CF2-L-003`, are projections to retained SUT state. They are valid only if they reference the same active delayed-correction trial state created and retained earlier in the same formal run trajectory.

## Derived Inspection Facts

The oracle may derive these facts from effective state and transition evidence without requiring them as cross-transition SUT state:

- whether historical evidence was re-dated, refreshed, or rewritten;
- whether a later behavior disposition was recorded before outcome facts;
- whether proposal, response, activation, active trial, later use, outcome, and explanation refs preserve the required binding, dependency, and lineage relations;
- whether recognition and production evidence remained separate;
- whether a projection is identity-preserving or a semantic copy;
- whether a candidate, direct correction, active trial, durable adaptation, and explicit preference remained distinguishable;
- whether hard invariant, positive obligation, invalidity, claim-class, or aggregation rules passed or failed;
- whether an artifact-level claim exceeds the bounded claim language.

These derived facts may appear in oracle reports and failure artifacts. They must not be used to make the SUT behave correctly during the evaluated run.

## Fixture And Oracle Facts That Must Not Become SUT State

The SUT may retain SUT-visible fixture payloads as input facts with fixture provenance. It must not retain evaluator-only or oracle-only material as semantic state.

Prohibited SUT-owned semantic state includes:

- evaluator ground truth such as fatigue contribution, canonical causal explanation, or absence of a real cross-surface preference;
- canonical expectation labels, scoring comments, answer keys, and path-pressure labels;
- claim classes, obligation IDs, invariant IDs, invalidity IDs, aggregation rules, and pass/fail results;
- branch policy that tells the SUT which proposal or behavior will receive canonical continuation;
- fixture- or oracle-authored hidden verdict labels supplied as semantic answers, such as precomputed "weak production", "best trial", "current proficiency", "stale", "fresh", "active trial is correct", or "voice preference" conclusions. This does not prohibit the SUT from creating its own temporal-eligibility, comparison, trial, or applicability state through selected SUT-owned transitions;
- campaign aggregation results, run-validity classifications, replacement-policy decisions, and failure artifacts;
- global user/profile conclusions such as real Japanese level, learning style, real personal memory, durable Zoey continuity, real voice behavior, or general correction efficacy.

## Required Identity, Binding, And Lineage Relations

The selected canonical trajectory requires several relation types, not one giant trajectory object:

- A trial candidate has its own identity before it is proposed or activated.
- A candidate-bound proposal references the candidate; it does not replace the candidate.
- A user response binds to the surfaced proposal, not directly to a hidden candidate.
- Active trial state has its own retained identity and lineage to the candidate and activation checks.
- Focused-drill immediate correction, direct current-session correction, and delayed-correction trial state are separate objects or equivalent distinguishable records.
- Direct correction may support a later candidate, but it is not itself future active trial state.
- Later-use applicability reviews reference retained active trial state; they do not recreate it.
- Outcome records reference the active trial, behavior disposition, realization, and material context under which the outcome was observed.
- Explanation support cites retained identities rather than a retrospective narrative.

The required relation families are:

- dependency: candidate, activation, and outcome bases preserve relations to the evidence and transition results they depend on;
- support lineage: comparison and optional hypothesis evidence can support a candidate without becoming the candidate;
- proposal binding: user response binds to the surfaced proposal and candidate-specific intent;
- transition ancestry: active trial state descends from candidate plus activation evidence;
- applicability: later-use review evaluates the retained active trial in the later context;
- intervention lineage: outcome state relates the active trial, SUT behavior disposition, simulator realization, and observed outcome;
- explanation support: user-facing claims cite retained state or transition evidence and expose limits.

For counterfactual paths:

- `CF-CALIBRATION-NO-SPLIT` must expose and preserve through oracle capture a SUT-owned withhold/defer/request-more-evidence disposition and its basis if no production-focused candidate is active; it becomes cross-transition state only if a later SUT transition consumes it.
- `CF-DRILL-OPT-IN` must branch from the same-run active delayed-correction state and mark it inapplicable, narrowed, or superseded for the focused drill with explicit immediate-correction opt-in.
- `CF-RECENT-BASIS` must expose a temporal eligibility assessment that does not classify `D-30` prior practice as stale under the selected `>90 scenario days` rule unless a pre-registered material invalidation exists.

## Explicit Non-Scope

This state contract does not support or require:

- retrieval, memory search, relevance ranking, distractor filtering, or production context assembly;
- final database schema, storage engine, serialization format, repository split, or runtime architecture;
- final "Zoey Core" module boundary, inference gateway, model-routing policy, provider-selection policy, provider-side persistent inference policy, fallback policy, or external inference lifecycle contract;
- real personal-memory custody, production retention policy, or durable Zoey continuity;
- durable developmental adaptation, learned profile, adapter, embedding, summary store, or training artifact;
- real voice, STT, TTS, avatar, Live2D, or embodied-presence behavior;
- Japanese pedagogy quality, curriculum quality, or real proficiency assessment;
- scheduler, reminder, due-state, expiry, background maintenance, active-trial TTL, or full governed-clock semantics;
- statistical reliability, production readiness, general robustness, or full `SCN-001` pass;
- external operations, actor assurance, authorization, provider reconciliation, or `SCN-002` operation safety.

## Boundary Red-Team

| Accepted decision | Red-team pressure | State-contract response |
| --- | --- | --- |
| `ADR-001 R1` | The state contract could become a general Zoey memory architecture derived from one Japanese slice. | State is explicitly run-scoped, synthetic, fixture-bound, and non-durable. It preserves first-slice pressure without claiming full `SCN-001`, real continuity, Japanese pedagogy, or architecture generality. |
| `ADR-002 R2` | The harness could satisfy transition-inside obligations by reconstructing retained trial state or handing the SUT a semantic copy. | Harness capture may observe state but cannot restore, reinject, or recreate required retained state. Active trials, candidates, proposal bindings, activation checks, direct correction, later-use applicability, outcomes, and explanations require SUT-owned state or transition evidence. |
| `ADR-003 R2` | Direct correction, explicit drill preference, active scoped trial, stale history, and durable adaptation could collapse into one lifecycle enum. | The contract requires orthogonal state anchors for attribution, temporal eligibility, comparison, candidate, proposal, activation, active trial, direct correction, later-use applicability, outcome, and unsupported adaptation boundary. |
| `ADR-004 R3` | Curated context and oracle fields could become the SUT's database schema or hidden answer key. | SUT-visible fixture facts may be retained only with fixture provenance. Answer keys, claim classes, branch policy, failure artifacts, campaign scores, and evaluator-only notes are fixture/oracle-only. |
| `ADR-005 R2` | The oracle-visible checklist could be copied wholesale into cross-transition state, or under-persisted so later behavior is narrative-only. | The mapping separates cross-transition state, transition evidence, projections, derived inspection facts, and oracle-only facts. Behavior-driving transitions retain identity only to their required horizon; scoring, validity, aggregation, and claim-boundary facts remain oracle-only. |
| Mechanism and topology non-assumptions | The state contract could define candidates, retained trial state, or explanation support as outputs of a specific local model chain, hosted model, provider session, prompt artifact, or future "Zoey Core" module. | Semantic roles are mechanism-neutral while preserving lineage. Candidate-producing mechanisms do not gain activation authority, computational artifacts are not automatically semantic state, and opaque mechanism-local memory cannot satisfy selected-slice persistence obligations. This is not an `EVAL-004` compatibility claim. |

## Register Effect

Upon acceptance, update `OPEN_QUESTIONS.md` as follows:

- move `SLICE-002` to `Resolved` with outcome `Decision`, resolved by this ADR for the first `SCN-001` selected-slice milestone;
- record that the selected state contract uses minimum run-scoped cross-transition state, SUT-owned transition evidence, and lineage-preserving projections, not a final schema or production memory architecture;
- activate `DEP-001` as the next immediate decision frontier because the selected state/transitions are now known and dependency identity metadata is needed before the internal boundary can be finalized;
- keep `SLICE-003` blocked until `DEP-001` resolves;
- re-triage `SLICE-005`, `EVAL-004`, and `EVAL-005` under their registered triggers; this ADR does not decide whether either evaluation question becomes a formal dependency of `SLICE-005`;
- keep `EVAL-004` deferred unless a later artifact prepares a first evaluation record, comparison, or evaluated compatibility claim;
- keep `EVAL-005` deferred unless a later artifact prepares final scoring or scenario-scoreability criteria;
- keep `MEM-004` deferred only while implementation does not create or reuse a control-relevant derived artifact materially derived from selected-slice semantic state; retaining or reusing such an artifact triggers re-triage under the registered `MEM-004` condition;
- keep `TRUST-001` deferred only while selected-slice personal or retained semantic state is not sent to an inference runtime, model, service, or process across a materially different trust boundary; direct transmission of retained semantic state may trigger `TRUST-001` even when no control-relevant computational artifact is retained;
- keep `MEM-001`, `TIME-001`, `GROW-005`, `SURF`, `PROD`, `CONT`, and `AUTH` questions deferred unless a later artifact introduces their trigger conditions.

## Next Frontier

The recommended next frontier is `DEP-001`: minimum dependency identity metadata for the selected state and transitions.

This ADR decides which semantic relationships must remain referentially reconstructable. It does not decide the common metadata shape of those references, whether relations are direct IDs, event ancestry, typed edges, composite keys, or another dependency representation.

`DEP-001` should decide what stable reference metadata and relation semantics are required to connect input facts, transition evidence, candidates, active trials, behavior dispositions, outcomes, projections, and explanation support without building a full dependency graph, workflow engine, or production memory system.

## Reconsideration Triggers

Reconsider or supersede this ADR if:

- implementation cannot expose the required retained identities without adopting a materially broader architecture;
- oracle inspection cannot distinguish retained SUT state from fixture-authored projections;
- later behavior cannot be shown to use retained active trial state rather than a generated explanation;
- the selected slice needs retrieval, context assembly, durable adaptation, real memory custody, real voice/avatar, Japanese pedagogy assessment, statistical reliability, or broader `SCN-001` coverage;
- `DEP-001`, `SLICE-003`, `SLICE-005`, `EVAL-004`, or `EVAL-005` cannot preserve this state/projection boundary.

## Non-Decisions

This ADR does not decide:

- internal module or repository boundaries;
- dependency identity metadata beyond naming it as the next frontier;
- implementation storage format;
- evaluation-record metadata;
- final acceptance gate;
- scoreability criteria;
- production memory policy;
- product inspection UI;
- model, prompt, runtime, or dependency choices.
