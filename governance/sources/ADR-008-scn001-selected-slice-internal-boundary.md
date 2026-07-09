# ADR-008: SCN-001 Selected-Slice Internal Boundary

Status: `Accepted`

Date: 2026-07-09

Accepted: 2026-07-09

Record revision: `R2`

Decision authority: project owner

Resolved question IDs: `SLICE-003`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.16`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`
- `decisions/ADR-006-scn001-selected-slice-state-contract.md` `R2`
- `decisions/ADR-007-scn001-selected-slice-dependency-identity.md` `R3`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.17` records `SLICE-003` as resolved by this ADR, moves `SLICE-005` from `Blocked` to `Open`, keeps `DEP-003` `Open` and non-active, and leaves `EVAL-004` and `EVAL-005` deferred until their concrete triggers occur.

## Decision

For the first `SCN-001` selected slice, adopt a two-domain minimum internal boundary:

1. a selected-slice SUT core responsibility domain that owns the behavior-driving semantic transitions assigned to the SUT by `ADR-002` through `ADR-007`, run-scoped effective state, SUT-owned transition evidence, SUT-owned public input/output contracts, and public inspectability over selected-slice state and relations;
2. a selected-slice evaluation responsibility domain that owns the harness, fixture/oracle package, simulator, capture, oracle evaluation, and reporting/output seams.

The forced boundary is logical and directional: behavior-driving semantic ownership is separated from answer-bearing evaluation ownership. For the first implementation, this ADR recommends realizing that logical boundary as two code projects or packages because that is the smallest mechanically inspectable dependency direction that avoids services, processes, production storage, or product architecture. A single repository or workspace remains acceptable. A single deployable process remains acceptable. In-memory storage remains acceptable.

The required dependency direction is one-way:

```text
evaluation domain -> SUT core public boundary
SUT core -> no dependency on harness, fixture, oracle, simulator, capture, reporting, branch policy, scoring, or evaluation-owned record types
```

The SUT core owns the semantic input/output contract it accepts and emits. The evaluation domain adapts fixture/oracle records into SUT-accepted input contracts and adapts SUT outputs/projections into capture, oracle, and report records. Adaptation is representation and transport authority, not semantic transition authority. Fixture package record types, path IDs, bundle IDs, branch rules, oracle rule types, claim-class types, scoring labels, expected-transition identifiers, and answer-bearing package metadata are evaluation-owned and must not be imported by the SUT core or encoded in SUT-visible semantic input.

The evaluation side may control when fixture facts are delivered and what the synthetic world does next under the accepted pre-registered fixture, bundle, and branch policy, but it must not tell the SUT which semantic transition to perform, which retained SUT state is relevant, which competing SUT output should govern realization, or which realized behavior matches the expected answer.

Acceptance of this ADR would resolve `SLICE-003` for the first `SCN-001` selected-slice milestone only.

## Why This Boundary Is Forced

`ADR-002` keeps the central transition chain inside the SUT: stale-history handling, attribution, dimension comparison, trial formation, proposal binding, activation checks, direct correction, later-use applicability, outcome update, and explanation support.

`ADR-004` keeps context curated by the harness while requiring the SUT to perform semantic use of that context. The SUT therefore needs an input boundary for curated facts and an inspection/output boundary for effective state and transition evidence. This does not make the harness a production retrieval or active cognitive-frame assembly system.

`ADR-005` separates fixture inputs from oracle expectations. The implementation boundary must prevent oracle-only metadata, branch policy, expected outcomes, and answer-bearing fixture annotations from entering behavior-driving SUT state.

`ADR-006` requires run-scoped cross-transition SUT state and SUT transition evidence, but explicitly avoids a final storage schema. The boundary therefore surrounds semantic ownership and inspectability, not a database or production memory system.

`ADR-007` requires stable scoped references, effective endpoint identity, contemporaneous dependency-use evidence, and local relation semantics. The boundary therefore must preserve referenceability and relation inspection, but does not require a graph service or global dependency engine.

The minimum that satisfies these pressures is not a final Zoey core, final repository layout, service topology, storage engine, or production runtime. It is a selected-slice SUT responsibility domain with a narrow public boundary, driven by a separate evaluation responsibility domain that can hold answer-bearing fixture/oracle machinery without exposing it to SUT cognition.

## Alternatives Considered

| Option | Assessment | Decision |
| --- | --- | --- |
| Single selected-slice package with internal namespaces | Could be semantically sufficient if the language/build/test system mechanically prevents SUT imports of evaluation modules, prevents answer-bearing objects from crossing the SUT boundary, and provides inspectable SUT-visible projections. It is harder to audit casually and easier to regress through accidental imports or broad fixture DTOs. | Not the recommended first implementation shape, but not ruled out if it proves the same mechanical boundary. |
| Two code projects or packages: SUT core and evaluation | Gives the simplest inspectable dependency direction while avoiding services, processes, production adapters, or final architecture. The SUT can be tested through its public boundary; evaluation can hold fixture/oracle/simulator/capture machinery. | Recommended realization of the forced logical boundary for the first implementation. |
| Three-project split for SUT core, fixture/oracle package, and simulator/evaluation runner | May become useful if fixture/oracle visibility separation or simulator isolation is hard to enforce inside one evaluation project. Adds packaging overhead before proven necessary. | Deferred unless R2 constraints cannot be preserved with two projects. |
| Ports-and-adapters boundary around SUT transitions | Directionally compatible and may describe the implementation style inside the two-domain split. It should not expand into production adapters or a general runtime boundary. | Allowed as an internal design pattern, not required by this ADR. |
| Production-style services/stores/runtime adapters/product surfaces | Overbuilds the first selected slice and risks turning SCN-001-specific abstractions into general Zoey architecture before SCN-002 counter-pressure. | Rejected for this milestone. |

## Responsibility Map

| Responsibility area | Owner | Required responsibility | Must not own |
| --- | --- | --- | --- |
| SUT core | SUT core domain/project | Accept SUT-safe input records, classify attribution where assigned to the SUT, retain run-scoped semantic state, perform selected-slice transitions, produce proposal intents and behavior dispositions, record SUT transition evidence and local relations, expose passive inspection surfaces over retained state/evidence, and produce explanation support. | Fixture path selection, oracle scoring, branch policy, hidden ground truth, claim-class results, run acceptance, product UI, production memory, retrieval, simulator fidelity decisions, or evaluation-owned record types. |
| Harness | Evaluation domain/project | Drive fixture bundle delivery, enforce delivery order, call only SUT-safe public boundary operations, transport SUT-selected realization outputs to simulator, deliver permitted simulator projections back to SUT, collect passive inspection outputs, and keep SUT run isolation. | SUT semantic conclusions, expected-transition selection as SUT input, reconstruction of lost SUT state, activation checks, later-use applicability, explanation support, semantic arbitration among competing SUT outputs, or relevance selection over retained SUT state. |
| Fixture/oracle package | Evaluation domain/project, with mechanical SUT-visible/oracle-only separation | Define `SCN001-SSFO-V0.2.0`, SUT-visible payload projections, SUT-visible control facts, oracle-only expectations, rule IDs, claim classes, path pressure, branch policy, validity predicates, and scoring predicates. | Behavior-driving SUT state, semantic promotion of raw inputs into SUT-derived conclusions, SUT-derived temporal/staleness judgments, trial selection, applicability verdicts, causal conclusions, or broad fixture objects delivered directly to the SUT. |
| Simulator | Evaluation domain/project | Realize SUT proposal intents and behavior dispositions into synthetic interaction facts; emit realization facts and permitted fidelity/mismatch facts. | Choosing the policy being tested, correcting SUT intent, supplying trial applicability, proving semantic correctness, or owning outcome delivery gates. |
| Capture/reporting | Evaluation domain/project | Observe fixture deliveries, SUT outputs/projections, simulator facts, oracle results, invalidity reasons, failure artifacts, and bounded claim evidence with stable references. | SUT behavior-driving memory, post-hoc basis reconstruction as proof of SUT consumption, inspection-time repair of missing SUT state, or acceptance gate decisions not yet accepted under `SLICE-005`. |

## Public Boundary Rules

### No Expected-Transition Selectors

Harness decision-point identifiers, checkpoint identifiers, path-stage names, claim-class IDs, expected-transition IDs, canonical-pressure labels, and semantic operation selectors remain evaluation-side.

The SUT public boundary must not receive a call or payload whose meaning tells it which accepted semantic transition the oracle expects next. The harness may internally know that a bundle is associated with `DP-TRIAL-FORM`, `DP-LATER-USE`, or `DP-EXPLAIN`, but the SUT receives only permitted SUT-visible input facts, current interaction/control context, and opaque invocation/run references that do not encode the semantic answer.

Valid public-boundary shapes may look conceptually like:

```text
ingest_sut_visible_inputs(input_batch)
process_current_interaction()
emit_available_outputs()
capture_inspection_snapshot()
inspect_record(scoped_ref)
enumerate_local_relations(scoped_ref)
```

Invalid public-boundary shapes include:

```text
execute_decision_point("DP-TRIAL-FORM")
run_transition("FORM_DELAYED_CORRECTION_TRIAL")
execute_expected_transition("LATER_USE_APPLY_T12")
```

The SUT implementation may internally organize code around transition functions. The harness must not call those internal transition functions as the test answer.

### SUT-Owned State Access

The SUT owns access to its retained state. The harness must not choose, rank, filter, summarize, or semantically select among SUT-owned retained state in order to present the state most likely to produce the expected transition.

SUT ownership of retained-state access in this ADR means identity resolution, direct access to selected-slice state already active in the current run, and local relation traversal required by `ADR-006` and `ADR-007`. It does not authorize open memory search, broad relevance ranking, distractor filtering, active cognitive-frame assembly, or retrieval over a larger available-state universe.

Where `ADR-005` includes a SUT-state reference item such as `L-002` or `CF2-L-003`, those names are evaluation-side fixture item IDs naming `sut_state_reference` inputs. They are not themselves required SUT-visible state-handle values. The SUT-visible payload must contain an opaque or otherwise non-evaluation-bearing reference resolving to state already owned by the SUT under a pre-registered fixture delivery rule. Literal fixture, path, branch, or counterfactual-qualified item identity must remain evaluation-side where it would reveal evaluation context.

The delivered reference must not add applicability, relevance, trial choice, or policy meaning. The SUT remains responsible for resolving the handle, preserving identity, and deciding whether the referenced retained state is applicable to the supplied current context.

The harness may deliver an accepted fixture-declared opaque reference. It may not perform hidden SUT-memory retrieval such as:

```text
select most relevant active trial for this checkpoint
return delayed-correction trial because this is the later-use path
filter SUT state down to only the expected trial
```

### Formal SUT Input Visibility And State-Origin Barrier

The evaluation domain must construct SUT-visible input representations that are structurally incapable, under the formal-run delivery path, of carrying evaluation-only fields unless the boundary contract itself is violated.

Every evaluation-origin record crossing into the SUT, including fixture records, harness control projections, user-response wrappers, state-reference wrappers, and simulator realization records, must cross through the SUT-safe public input contract. Direct delivery of a full evaluation-owned record containing fields prohibited from SUT visibility is invalid even if application code claims to ignore those fields.

For this ADR, a SUT-safe input is:

```text
visibility-safe + state-origin-safe + role-preserving
```

Visibility-safe means the payload carries no oracle-only metadata, branch policy, path IDs, bundle IDs, claim-class labels, scoring labels, expected-transition identifiers, canonical-pressure labels, canonical-match results, run-validity classifications, or other evaluation-only metadata.

State-origin-safe means evaluation-side adaptation does not instantiate a SUT-owned semantic result before the SUT performs the accepted transition. Representation conversion may change serialization, field names, or transport shape, but it must not promote a raw communication, task observation, chronology fact, context label, affordance fact, user response, simulator fact, or state-reference wrapper into a SUT-owned semantic classification, assessment, applicability verdict, candidate, trial, control state, behavior disposition, outcome classification, or explanation support. Fixture-initialized semantic status or control facts explicitly declared SUT-visible by `ADR-005` are the only selected-slice exception.

Role-preserving means evidence remains evidence, communication remains communication, chronology remains chronology, affordance remains affordance, simulator realization remains realization, and state-reference wrappers remain references to already-owned SUT state.

Valid mechanisms include separate types, explicit allowlist projections, schema-restricted payloads, typed accessors, serializers that omit evaluation-only fields, or other inspectable representations. The formal run must capture the identity and content of the SUT-visible payload actually delivered so the oracle can distinguish package contents from delivered contents.

Examples:

```text
allowed:    V-003 raw communication -> SUT communication event
prohibited: V-003 raw communication -> current correction-control state

allowed:    C-005 and C-006 task observations -> SUT task observation records
prohibited: C-005 and C-006 task observations -> recognition/production split conclusion

allowed:    C-002 raw utterance -> SUT communication event
prohibited: C-002 raw utterance -> attributed user assertion

allowed:    L-002 fixture item -> opaque SUT-visible state handle
prohibited: L-002 or CF2-L-003 literal fixture/path ID -> SUT state handle
```

### SUT-Safe Boundary Contract Ownership

The SUT core owns the semantic input/output contracts accepted and emitted by its public boundary. The evaluation domain owns adaptation from fixture/oracle records into those SUT-safe contracts and adaptation from SUT outputs/projections into oracle/capture/reporting records.

A future shared `scn001_boundary_contracts` package is allowed only as a lower-level SUT-safe dependency of both projects. It must contain no oracle-only fields, answer-bearing fixture metadata, path IDs, bundle IDs, branch policy, claim-class guidance, scoring results, canonical-pressure labels, expected-transition identifiers, evaluation-owned record types, or pre-interpreted semantic result types that cause the SUT to depend transitively on evaluation packages or receive SUT-owned conclusions from evaluation.

### Passive Inspection

Inspection must be passive. An inspection call must not create, activate, narrow, repair, infer, or otherwise change behavior-driving semantic state or selected-slice transition evidence. Inspection projection generation must not run a cognitive reconstruction that writes missing lineage before returning the projection.

A projection may expose or structurally normalize contemporaneously retained state and transition evidence. Oracle conclusions about persistence, dependency use, lifecycle responsibility, or semantic distinguishability must be derived from exposed state, order, relation, consumer-history, and capture evidence, not solely from a SUT-authored compliance flag.

For example, this is insufficient by itself:

```text
retained_across_sessions = true
used_for_later_disposition = true
dependency_contemporaneous = true
```

Those labels may help readability only when backed by retained state, transition evidence, relation tuples, ordering, and consumer history required by `ADR-006` and `ADR-007`.

## What Crosses Each Boundary

### Harness To SUT Core

Allowed crossings:

- SUT-visible fixture facts with fixture provenance, roles, semantic source, chronology, context labels, task-mode labels, task observations, affordance facts, and selected SUT-visible fixture control facts.
- SUT-visible communication events and user responses.
- Declared SUT-visible simulator realization projections after the SUT has emitted a proposal intent or behavior disposition.
- Accepted opaque lineage-preserving references to SUT-owned state when explicitly required by `ADR-005`, subject to the SUT-owned state access rule above.

All allowed crossings must preserve fixture/input role and state origin. Evaluation adaptation may not pre-classify raw evidence into a SUT-owned semantic result.

Prohibited crossings:

- oracle-only metadata;
- hidden scenario ground truth;
- answer-bearing fixture annotations;
- claim-class IDs or pass/fail labels as behavior guidance;
- branch policy that reveals which proposal or behavior receives canonical continuation;
- decision-point, checkpoint, path-stage, expected-transition, canonical-pressure, or semantic-operation selectors;
- precomputed attribution, scoped correction/control, recognition/production split, stale/current, best-trial, active-trial, applicability, canonical-intervention-match, causal, preference, learning-style, or outcome conclusions.

### SUT Core To Harness

Allowed crossings:

- proposal intents and behavior dispositions;
- retained state anchors and transition evidence exposed through passive inspection surfaces or lineage-preserving projections;
- stable scoped references, effective endpoint identities, lifecycle/status/scope evidence, and local relation tuples required by `ADR-007`;
- explanation support records with state references, uncertainty, scope limits, causal limits, and unsupported generalization limits;
- non-activation dispositions such as withhold, defer, request more evidence, ask clarification, or retire a candidate where that selected-slice transition exists;
- lifecycle transition evidence such as retirement, narrowing, supersession, or conflict where that selected-slice transition exists;
- applicability assessment results such as applicable, not applicable, or unresolved for a declared use target.

These outputs are evidence from effective SUT state and SUT transition evidence. They are not final product telemetry, production audit records, a final state schema, or acceptance evidence by themselves.

### SUT Output Routed By Harness To Simulator

This is a data-flow relation through the evaluation domain, not a direct project dependency.

Where the simulator realizes a proposal or behavior, the SUT public output must identify the material intent or disposition selected by the SUT for realization. The harness transports that SUT-selected realization request. It must not choose among competing proposal intents, behavior dispositions, or candidate outputs based on fixture path, branch policy, oracle expectations, or expected outcome.

The harness may route only the SUT-selected proposal/disposition reference and material payload to the simulator:

- candidate-bound proposal intent;
- drill correction disposition;
- direct current-session correction disposition;
- later-use behavior disposition.

If the SUT exposes multiple materially competing outputs without identifying which one governs current realization, the harness must not select the canonical one on the SUT's behalf. The run follows the accepted ambiguity, obligation-failure, or invalidity policy rather than receiving evaluator-side policy arbitration.

The SUT core must not import, instantiate, call, configure, or depend on the evaluation simulator. The simulator must not call private SUT internals.

The simulator receives no oracle expectations and does not select the correction policy. It emits realization facts about what synthetic behavior was produced from the SUT's requested intent/disposition.

### Simulator Projection Back To SUT

Only the declared SUT-visible projection of a simulator realization fact may return to the SUT.

That projection may include:

- the prior SUT proposal/disposition reference;
- what was actually realized;
- simulator provenance;
- material mismatch or fidelity information required by a later SUT transition, where permitted by the fixture contract.

The following remain evaluation-side:

- canonical intervention-premise match;
- branch-gate outcomes;
- run-validity classifications;
- claim pressure;
- scoring labels;
- delivery decisions;
- oracle conclusions about whether the realized behavior satisfied the expected answer.

A full simulator evaluation record must not cross the SUT boundary merely because the SUT implementation promises to ignore prohibited fields. Simulator records are subject to the same formal SUT input visibility and state-origin barrier as fixture/oracle records.

### Fixture/Oracle To Harness

The fixture/oracle package may give the harness:

- full fixture manifests and bundle membership;
- SUT-visible payload projections;
- branch gates and delivery policy;
- oracle-only predicates, rule IDs, claim classes, expected pressure, validity criteria, and scoring logic.

The harness must preserve access separation when delivering inputs to the SUT. Holding both fixture and oracle material in the evaluation project is allowed only if the formal SUT delivery path uses the SUT-visible projection, not the answer-bearing package record.

### Capture/Reporting From SUT, Fixture, Simulator, And Oracle

Capture/reporting may collect:

- SUT projections and transition evidence;
- the SUT-visible fixture payloads actually delivered;
- fixture package records on the evaluation side;
- simulator realization facts and SUT-visible simulator projections;
- oracle-derived inspection facts;
- run-validity classifications, hard failures, obligation failures, and bounded claim evidence.

Capture/reporting may not become an alternate state source for later SUT transitions. A post-hoc report relation can support oracle inspection, but it cannot prove contemporaneous SUT dependency use unless the SUT transition record or effective state already preserved that use.

## Minimal Project And Module Shape

The recommended minimum first-implementation shape is:

```text
selected-slice-workspace/
  scn001_sut_core/
    boundary/
    state/
    transitions/
    relations/
    inspection/
  scn001_eval/
    harness/
    fixture/
    oracle/
    simulator/
    capture/
    reporting/
```

`scn001_sut_core/boundary` exports the callable SUT boundary and SUT-safe input/output contracts. The evaluation project may depend on these exports.

`scn001_sut_core/state`, `transitions`, `relations`, and `inspection` may be separate modules, namespaces, files, or internal packages. The split is responsibility guidance, not a final module API.

`scn001_eval/fixture` must produce SUT-visible payloads through the formal SUT input visibility and state-origin barrier above. The evaluation project may retain full answer-bearing fixture/oracle records internally, but those records must not cross into the SUT public boundary.

`scn001_eval/oracle` may depend on fixture, simulator output, capture, and SUT inspection projections. The SUT core must not depend on oracle.

No third shared package is required. If implementation friction makes shared types useful, a narrow `scn001_boundary_contracts` package is allowed only under the SUT-safe boundary contract ownership rule above.

## Boundary-Facing Contracts Before First Implementation

The first implementation should define these seams or equivalent contracts before behavior work begins:

| Seam | Owner | Minimum purpose |
| --- | --- | --- |
| SUT run lifecycle | SUT core | Start an isolated synthetic run with permitted SUT-visible run controls and retention-control facts while keeping campaign, path, and evaluation metadata outside behavior-driving SUT input. |
| SUT-safe input ingestion | SUT core public boundary | Accept declared SUT-visible fixture facts, communication events, user responses, opaque state handles, and permitted simulator projections while preserving provenance, role, state origin, and the distinction among delivered, ingested, retained, and used facts. |
| Current interaction processing | SUT core public boundary | Process currently available SUT-visible input and bounded retained SUT state access without receiving expected-transition selectors, oracle-only path expectations, retrieval tasks, or relevance-ranking tasks. |
| SUT output emission | SUT core public boundary | Emit proposal intents, behavior dispositions, applicability results, lifecycle transitions, non-activation dispositions, explanation support, and the SUT-selected realization request as applicable. |
| Harness simulator routing seam | Evaluation domain | Transport the SUT-selected proposal/disposition output to simulator without choosing among competing SUT outputs or creating a SUT dependency on simulator. |
| Simulator realization seam | Evaluation domain | Accept SUT proposal/disposition refs and emit realization facts plus permitted fidelity/mismatch facts; no outcome delivery gates. |
| Fixture/input visibility projection | Evaluation domain | Produce structurally SUT-safe, role-preserving, state-origin-safe payloads from evaluation-origin records while excluding evaluation-only fields and pre-interpreted SUT-owned semantic results. |
| Capture observation seam | Evaluation domain | Capture fixture deliveries, SUT projections, simulator facts, and oracle-derived inspection facts without modifying SUT state. |
| Passive inspection surface | SUT core public boundary | Expose lineage-preserving views over retained SUT state and transition evidence, including scoped references, effective endpoint identity, ordering, status, scope, and local relations. |
| Oracle evaluation seam | Evaluation domain | Evaluate captured effective state against accepted hard-invariant and positive-obligation predicates without becoming SUT input. This names a seam, not the final formal evaluation record. |
| Reporting/output seam | Evaluation domain | Produce bounded evidence reports and failure artifacts that cite stable refs without becoming SUT input. This names a seam, not the final acceptance report or scoreability contract. |

These seams may be plain in-memory interfaces, function signatures, files, structs, records, or test harness adapters. They need not be network APIs.

This ADR does not authorize the first formal evaluation record, behavior-configuration comparison, final scoreability criteria, or final acceptance report. Before implementation creates a formal evaluation record, comparison, or evaluated compatibility claim, `EVAL-004` must be re-triaged under the register. Before final scoring or scenario-scoreability criteria are defined, `EVAL-005` must be re-triaged. Before the final done gate is accepted, `SLICE-005` must resolve.

## Boundary Walkthroughs

These examples are illustrative boundary checks, not required API names.

### Production Candidate And Proposal

```text
evaluation fixture
  recognition observation facts
  production observation facts
  fixed affordance facts
        |
        | SUT-safe input projection
        v
SUT core
  ingests facts
  creates comparison transition evidence
  creates production-focused candidate
  creates candidate-bound proposal intent
  selects that proposal for realization
        |
        | SUT-selected proposal realization request
        v
evaluation harness
  transports selected proposal intent to simulator
        |
        v
simulator
  realizes surfaced proposal wording
        |
        | SUT-visible realization projection
        v
SUT core
  ingests realization fact
        |
        | evaluation branch policy remains evaluation-side
        v
evaluation harness
  delivers user response only if branch policy permits
        |
        | SUT-safe user-response event
        v
SUT core
  assesses response binding
  performs activation checks
```

Boundary checks:

- the harness never calls `form_production_trial` or `execute_decision_point("DP-TRIAL-FORM")`;
- the harness does not choose among competing SUT proposal intents;
- the SUT never receives the canonical candidate, claim class, path-stage, or expected transition;
- simulator realization does not prove semantic correctness;
- branch policy decides delivery evaluation-side, not inside the simulator or SUT.

### Direct Correction To Delayed-Correction Candidate

```text
evaluation harness
  delivers raw user correction communication and context facts
        |
        v
SUT core
  creates scoped correction/control state
  creates current-session behavior disposition
  selects that disposition for realization
        |
        | SUT-selected disposition realization request
        v
evaluation harness
  transports selected disposition to simulator
        |
        v
simulator
  produces realization fact
        |
        | SUT-visible realization projection
        v
SUT core
  consumes permitted realization fact
  uses retained drill evidence, scoped correction state, and current-session disposition
  creates delayed-correction candidate if supported
  records contemporaneous ancestry/support relations
```

Boundary checks:

- the harness does not tell the SUT to form a delayed-correction trial;
- the harness does not choose among competing current-session correction dispositions;
- capture cannot later add candidate ancestry as proof if the SUT did not preserve it contemporaneously;
- direct current-session correction remains distinct from future active trial state.

### Focused-Drill Counterfactual

```text
SUT core
  already owns retained active delayed-correction trial
        |
evaluation harness
  delivers focused drill context and explicit immediate-correction opt-in
        |
        | SUT-safe opaque state handle corresponding to CF2-L-003
        v
SUT core
  resolves its own retained state
  performs applicability assessment for current use target
  marks delayed-correction trial not applicable for this focused-drill use
  emits immediate-correction disposition where supported
```

Boundary checks:

- the harness does not send `applicable = false`;
- the harness does not select "the relevant delayed-correction trial" from SUT state based on oracle expectation;
- `CF2-L-003` remains the evaluation-side fixture item ID; the SUT-visible state handle is opaque and resolves to already-owned SUT state;
- applicability remains a SUT transition, not branch policy.

## Boundary Invariants

The internal boundary is acceptable only if all of the following remain true:

- The SUT core owns selected-slice semantic transitions required by `ADR-002`; the harness cannot satisfy them by fixture labels, expected-transition calls, or reconstruction.
- The harness supplies curated context under `ADR-004`; the SUT core does not claim retrieval, memory search, relevance ranking, or context assembly.
- SUT-safe inputs are visibility-safe, state-origin-safe, and role-preserving; evaluation adaptation cannot precompute SUT-owned semantic results.
- Fixture/oracle metadata remains separated under `ADR-005`; answer-bearing material cannot enter SUT behavior-driving state or SUT-visible semantic scope.
- Harness routing is protocol transport, not semantic arbitration among competing SUT outputs.
- SUT retained-state access is bounded to identity resolution, selected-slice active state, and local relation closure; it is not retrieval or context assembly.
- The SUT core preserves `ADR-006` state classifications and retention horizons; oracle-visible fields are not copied wholesale into SUT state.
- The SUT core preserves `ADR-007` stable scoped references, effective endpoint identity, contemporaneous dependency-use evidence, and local typed relation semantics.
- Simulator outputs are facts about realization, not evidence that the SUT selected a semantically correct policy.
- Capture/reporting can cite and score state, but cannot create the missing basis that the SUT failed to retain.
- Inspection is passive and cannot repair missing state, missing relations, or missing consumer history.

## Explicit Non-Decisions

This ADR does not decide:

- final services or service topology;
- storage engine, database, event store, graph store, schema, serialization format, or migration strategy;
- product UI, inspection UI, dashboard, voice UI, avatar UI, or user-facing memory controls;
- runtime adapters, model routing, provider sessions, prompt architecture, inference gateway, tool runtime, or production trust-boundary adapters;
- production memory, real personal-history custody, durable Zoey continuity, retention policy, summaries, embeddings, learned profiles, adapters, or training artifacts;
- retrieval, memory search, relevance ranking, active cognitive-frame assembly, distractors, or context discovery;
- maintenance triggers, expiry, revocation propagation, capability degradation, external refresh, manual review, background invalidation, or active-trial TTL;
- final acceptance gate for `SLICE-005`;
- first evaluation-record metadata, behavior-configuration comparison, or compatibility metadata for `EVAL-004`;
- scenario scoreability criteria for `EVAL-005`;
- production Japanese pedagogy, real proficiency assessment, real voice behavior, real calendar behavior, external operations, actor assurance, authorization, or provider reconciliation.

## Red-Team Assessment

| Risk | Boundary response |
| --- | --- |
| Overbuild into production architecture | The boundary is responsibility/project scoped only. It permits one repository, one process, in-memory state, no database, no services, no product UI, no runtime adapter architecture, and no final module split. |
| Unproven two-project necessity | The forced decision is the two-domain ownership boundary. Two projects/packages are the recommended first implementation realization because they make one-way dependency easiest to inspect; a single package is valid only if it mechanically proves the same import and visibility constraints. |
| Expected-transition leakage | Decision-point, checkpoint, path-stage, expected-transition, and semantic-operation selectors remain evaluation-side and cannot be SUT public behavior input. |
| Harness-selected memory | The harness cannot choose, rank, filter, or summarize SUT-owned retained state. Fixture-declared opaque refs expose state already owned by the SUT and do not decide applicability. |
| Semantic promotion by evaluation adapter | SUT-safe adaptation must be visibility-safe, state-origin-safe, and role-preserving. Raw communications, task observations, chronology, affordances, simulator facts, and state-reference wrappers cannot be promoted into SUT-owned semantic conclusions before crossing the boundary. |
| Harness arbitration among SUT outputs | The SUT identifies the proposal or disposition selected for realization. The harness transports it and cannot choose the canonical output among materially competing SUT outputs. |
| Answer leakage from fixture/oracle or simulator | The formal delivery path uses structurally SUT-visible payloads. Full answer-bearing fixture/oracle records or simulator evaluation records must not cross the SUT boundary, even if code promises to ignore hidden fields. |
| Retrospective dependency reconstruction | Capture/reporting may add oracle-derived inspection relations, but those cannot prove SUT consumption unless contemporaneous SUT transition records or effective state already preserved the dependency use and order required by `ADR-007`. |
| Direct simulator dependency | SUT outputs are routed by the harness; the SUT cannot import, call, configure, or depend on the simulator. |
| Simulator policy substitution | Simulator receives SUT intent/disposition and reports what was realized. It cannot choose correction policy, repair wrong SUT decisions, own outcome delivery gates, or report canonical intervention matches to the SUT. |
| Fixture-curated context becomes retrieval | Harness-curated bundle delivery is explicitly not retrieval, search, ranking, distractor filtering, or active context assembly. |
| Oracle-visible fields become SUT schema | SUT core must expose required semantic distinctions, but implementation representation remains open. Oracle score, validity, claim, and branch metadata stay evaluation-side. |
| Inspection becomes self-report | Inspection is passive. Compliance labels do not prove retention or dependency use without exposed retained state, transition evidence, ordering, relations, and consumer history. |

## Remaining Risks Before Acceptance

- The exact language, framework, and test runner are still undecided; this ADR only constrains ownership, dependency direction, and boundary semantics.
- The first implementation may discover that a shared boundary-contract package is useful. If introduced, it must be audited as a SUT-safe lower-level dependency before acceptance evidence is trusted.
- The evaluation domain must implement the SUT-visible representation barrier strongly enough that accidental full-record delivery or semantic promotion is invalid under formal runs.
- `EVAL-004` may later require richer behavior-configuration metadata for formal evaluation records; this ADR does not pre-solve that metadata.
- `SLICE-005` may require stricter report or claim evidence than this boundary alone provides.
- `DEP-003` remains open; if runtime maintenance semantics enter the first milestone, this boundary may need revision.

## Register Effect If Accepted

Upon acceptance, update `OPEN_QUESTIONS.md` as follows:

- move `SLICE-003` to `Resolved` with outcome `Decision`, resolved by this ADR for the first `SCN-001` selected-slice milestone;
- record that the accepted minimum internal boundary is a two-domain SUT core and evaluation split, recommended as two code projects/packages for the first implementation, with one-way evaluation-to-SUT dependency and strict SUT-visible versus oracle-only data separation;
- record that the boundary preserves transition-inside SUT responsibilities from `ADR-002`, curated fixture context from `ADR-004`, fixture/oracle separation from `ADR-005`, state/projection responsibilities from `ADR-006`, and dependency identity/effective endpoint rules from `ADR-007`;
- keep `DEP-003` `Open` and non-active unless runtime maintenance semantics block implementation;
- move `SLICE-005` from `Blocked` to at least `Open`, because the internal-boundary prerequisite has been resolved; activate it only if acceptance-gate drafting becomes the active frontier;
- re-triage `EVAL-004` and `EVAL-005` according to the exact next artifact rather than assuming a single next frontier;
- activate `EVAL-004` before any artifact prepares a first formal evaluation record, behavior-configuration comparison, or evaluated compatibility claim;
- activate or otherwise resolve `EVAL-005` before any artifact defines final scoring or scenario-scoreability criteria;
- activate or otherwise resolve `SLICE-005` before any artifact claims the first selected-slice milestone is done.

No other question automatically activates merely because this ADR is accepted.

## Reconsideration Triggers

Reconsider or supersede this ADR if:

- implementation cannot preserve fixture/oracle separation without a stronger physical package, process, or repository boundary;
- SUT-visible contracts accidentally encode branch, path, claim-class, scoring, canonical-pressure, expected-transition, checkpoint, decision-point, semantic-operation, or hidden answer metadata;
- SUT-visible input adaptation promotes raw evidence, communication, chronology, simulator facts, or state-reference wrappers into SUT-owned semantic conclusions before the SUT performs the transition;
- oracle inspection cannot verify SUT-owned state and dependency relations through the accepted public inspection boundary or lineage-preserving evaluation-side projections over that public surface;
- the harness must tell the SUT which semantic transition to perform for the path to pass;
- the harness must choose, rank, filter, or summarize retained SUT state for the SUT to complete later-use behavior;
- the harness must choose among competing SUT proposals or behavior dispositions for the path to pass;
- the simulator must choose behavior policy or own outcome delivery gates for the SUT to complete the path;
- capture/reporting becomes necessary input to later SUT transitions;
- the selected slice introduces real production memory, retrieval, model/runtime trust boundaries, maintenance triggers, external operations, product surfaces, or full `SCN-001` pass claims;
- `SLICE-005`, `EVAL-004`, `EVAL-005`, or `DEP-003` requires a broader boundary to make first-milestone claims scoreable.

## Non-Scope

This ADR answers only the minimum internal boundary forced by the first selected slice. It is not a general Zoey architecture, not a service design, not a persistence design, not an evaluation acceptance gate, and not a claim that the first milestone passes `SCN-001`.
