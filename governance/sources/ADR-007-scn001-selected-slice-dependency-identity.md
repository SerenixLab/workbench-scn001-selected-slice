# ADR-007: SCN-001 Selected-Slice Dependency Identity Contract

Status: `Accepted`

Date: 2026-07-09

Accepted: 2026-07-09

Record revision: `R3`

Decision authority: project owner

Resolved question IDs: `DEP-001`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.15`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`
- `decisions/ADR-006-scn001-selected-slice-state-contract.md` `R2`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.16` records `DEP-001` as resolved by this ADR, activates `SLICE-003` as the recommended next frontier, moves `DEP-003` from `Blocked` to `Open`, and re-triages `SLICE-005`, `EVAL-004`, and `EVAL-005` without automatically resolving or expanding them.

## Decision

Adopt a minimum dependency identity and relation contract for the first `SCN-001` selected slice.

The selected slice requires stable references and typed local relations sufficient to preserve the state/evidence relationships accepted by `ADR-006`. It does not require a general dependency graph, graph query engine, workflow engine, production memory schema, retrieval/context-assembly system, or final internal module boundary.

The minimum contract is:

1. every selected-slice fact, SUT-owned transition evidence record, retained state anchor, lineage-preserving projection, and oracle-visible record that must be related, cited, compared, captured, projected, or reported must have an inspectable stable scoped reference;
2. any relation to mutable or lifecycle-bearing semantic state must resolve the effective semantic state, status, and scope consumed or asserted at the relation's material order; a pointer to the current mutable record alone is insufficient when later transitions can materially change meaning;
3. references and relations must carry the minimum conditional metadata needed to distinguish fixture facts, SUT-owned semantic state, SUT-owned transition evidence, projections, derived inspection facts, and oracle-only records without requiring one universal record header for all record families;
4. core required relationships must be represented as typed local relation semantics: `source`, `basis`, `support`, `binding`, `transition_ancestry`, `applicability`, `projection_of`, `realization`, `outcome`, and `explanation_support`;
5. conditional lifecycle relationships must be represented when the selected-slice transition exists: `supersession`, `retirement`, `narrowing`, and `conflict`;
6. the relation set may be represented as fields, event records, append-only transition records, tables, documents, object links, logs, or another inspectable representation, provided the oracle can enumerate the required local relations, effective endpoint meanings, dependency-use evidence/order, and participant roles for each inspected record;
7. oracle-only rule IDs, claim-class outcomes, branch policy, scoring labels, answer keys, and hidden expected answers must not be embedded in SUT-owned semantic state or SUT-visible semantic scope.

For this ADR, "dependency identity" means minimum referenceability and relation semantics for selected-slice evidence. It does not mean dependency injection, package management, runtime component wiring, build dependencies, graph database design, task orchestration, or production memory architecture.

## Reference Scope

References need only be stable within the scope where they are inspected.

| Scope | Minimum stability requirement | Not required |
| --- | --- | --- |
| Fixture/oracle package scope | Fixture item IDs, oracle rule IDs, path IDs, bundle IDs, and claim-class IDs remain stable within `SCN001-SSFO-V0.2.0` or its accepted superseding package. | Global permanence across unrelated scenarios or future packages. |
| Formal run scope | SUT state anchors, transition evidence, projections, simulator realization facts, and oracle capture records remain stable for the run and any declared lineage-preserving branch checkpoint. | Production durable identity, cross-campaign identity, or real user identity. |
| Transition scope | A transition record has stable references to its basis, result, created order, and produced/updated state anchors. | Workflow-step identity, retry orchestration, locks, queues, or scheduler state. |
| Reporting scope | Failure artifacts and bounded milestone claims can reference observed state/evidence, rule IDs, and claim classes. | General analytics schema or reusable reporting platform. |

Run-local identifiers are acceptable, but a non-global reference must resolve to the specific scope instance in which its local identifier is unique. A scope class such as `run`, `package`, or `checkpoint` is insufficient by itself.

The minimum scoped identity rule is:

```text
scoped reference = scope instance identity + local reference identity
```

An implementation may encode this as a composite key, opaque scoped reference, event ancestry, document-relative pointer, or another inspectable representation. Path-qualified references are valid for oracle/reporting records, but SUT-visible reference identities, namespace qualifiers, and resolvable reference metadata must not expose evaluation-context semantics including campaign, fixture package/version where answer-bearing, bundle, branch, path, checkpoint, claim-class, scoring, canonical-pressure, or expected-transition identifiers unless a separate accepted selected-slice contract explicitly delivers that exact fact to the SUT as permitted fixture/control input. SUT-visible semantic references may use opaque run-local or opaque namespace identity while oracle/harness records externally map those references to evaluation context. References must not silently reuse identifiers in a way that causes two distinct semantic records in the same scope instance to appear identical.

A reference scope must remain resolvable for at least the complete lifetime of every required relation, oracle capture, projection, branch checkpoint, and reporting reference that cites it.

## Reference Core and Conditional Metadata

The universal dependency-identity floor is a resolvable scoped identity for every independent relation endpoint. Names are illustrative; equivalent representations are allowed.

| Element | Required meaning | Notes |
| --- | --- | --- |
| `scoped_ref` | Resolvable stable reference for this endpoint. | May be globally opaque or composed from a scope instance plus a local identifier. |
| `scope_instance_ref` or resolver equivalent | Specific package, run, bundle, checkpoint, report, or composite scope instance in which the endpoint resolves. | Required when the scoped reference is not globally self-describing. May be inherited from an enclosing record or resolver. |
| `created_order_marker` or ordering evidence | Inspectable creation/effective order where ordering is material and not inherent in the representation. | Must identify an ordering domain and value or an explicit predecessor/happens-before relation. |

Other metadata is conditional. It is required only when material to relation interpretation, oracle inspection, boundary enforcement, or scoring:

| Conditional metadata | Required when material | Notes |
| --- | --- | --- |
| `local_ref_id` | Needed to expose or compare a local identity separately from the scoped reference. | Not required when `scoped_ref` is globally opaque and sufficient by itself. |
| `ref_kind` or record family | Needed for routing, inspection, or report readability. | A reference/inspection family, not a complete or exclusive semantic-state classification. It must not replace compositional role, provenance, lifecycle, scope, or relation semantics. |
| `record_origin_role` | Needed to distinguish who created the record, semantic classification, transition result, projection, or oracle record. | Must distinguish fixture, SUT, simulator, harness, and oracle where material. Not the same as semantic source actor. |
| exposure/access metadata | Needed when parties differ in what they may inspect or use. | May be record-level, field-level, projection-level, inherited, or guaranteed by storage/projection boundaries. "Accessible to both" does not imply both parties see the same metadata fields. |
| `adr006_responsibility` evidence | Needed to prove `ADR-006` responsibility classification at a material order point or interval. | May be an explicit class, interval, transition history, consumer history, or reconstructable evidence. A SUT-produced label is not sufficient by itself to prove cross-transition retention. |
| semantic scope | Needed when applicability, target, or use scope is material. | Behavior-driving scope such as actor, domain/activity, task mode, behavior dimension, consequence/context dimension, trial scope, and use target. |
| evaluation context | Needed for oracle/reporting/campaign interpretation. | Campaign, fixture package/version where answer-bearing, bundle, branch, path, checkpoint, claim-class, scoring, canonical-pressure, and expected-transition metadata. Oracle/harness-side unless explicitly delivered as permitted SUT-visible fixture/control input. |
| `material_payload_ref` | Needed when semantic value itself must be inspected or scored. | A fingerprint alone is insufficient when the oracle must inspect semantic intent, scope, status, uncertainty, or classification meaning. |
| `material_integrity_ref` | Needed for identity/integrity checks. | Useful but not a substitute for inspectable semantic content where semantic scoring is required. |

Records may inherit metadata from an enclosing run, package, bundle, projection, capture, or retention-basis record if the inheritance relation is inspectable. The contract does not require duplicating all fields on every row, object, or event.

Semantic source is represented by `source` relations, not by `record_origin_role`. For example, a fixture-authored communication event can have `record_origin_role = fixture` while its `source` relation points to the synthetic user; a SUT-derived attributed assertion can have `record_origin_role = SUT` while preserving the same semantic source actor through its source relation and transition ancestry.

Semantic status provenance attaches to the individual status assertion, assessment, or transition result whose provenance matters. Capture provenance is separate: the harness may capture a SUT-derived status, but the harness did not semantically author that status merely by observing it. A single record-global status origin is insufficient when materially different statuses are created by different transitions or captured through different views.

## Scope Families

This ADR separates three scope families:

| Scope family | Meaning | SUT visibility rule |
| --- | --- | --- |
| Reference namespace | Where a reference resolves, such as run instance, package instance, report, or checkpoint. | SUT-visible references may use opaque or run-local namespace identity, but must not encode evaluation-context semantics. |
| Semantic scope | Where a state or relation may influence behavior, such as actor, activity, task mode, behavior dimension, consequence/context dimension, trial scope, and use target. | May be SUT-visible when it is genuine behavior-driving state or permitted fixture/control input. |
| Evaluation context | Campaign, bundle, branch, path, checkpoint, claim-class, scoring, and canonical-pressure metadata. | Oracle/harness-side unless explicitly delivered by an accepted selected-slice contract. It must not be smuggled into SUT-visible semantic scope. |

## Ordering Domains

Scenario time and transition order are separate selected-slice pressures.

Scenario time supports chronology and stale/current authority under `ADR-003`. It is not sufficient by itself to prove material intra-session ordering, such as proposal intent before proposal realization, user response before binding assessment, binding assessment before activation, or behavior disposition before simulator realization and outcome update.

Every order marker must identify its ordering domain. Records whose relative ordering is material to an accepted obligation must use comparable order markers within the same domain or preserve an explicit predecessor/happens-before relation.

The minimum ordering contract is:

- source facts may carry occurrence time, observation time, and delivered order where those differ;
- SUT transition records must preserve transition creation order in a domain comparable to other material transitions in the same run or checkpoint;
- relation assertions must preserve the order at which the relation was created or became effective when that order is material;
- oracle capture order may be separate from source occurrence order and SUT transition order;
- a scenario-day marker such as `D0` is insufficient where several material transitions occur within the same scenario day and their relative order is required by `ADR-005` or `ADR-006`.

## Effective State Identity

Stable object identity is not enough when the semantic meaning of the object can change over time.

A relation to lifecycle-bearing or otherwise mutable semantic state must resolve the effective semantic state, status, and scope that was consumed, asserted, or observed at the relation's material order. This may be preserved by immutable state-version references, revision IDs, order intervals, event-sourced reconstruction, transition-history records, capture snapshots, or another inspectable representation.

For example, if an outcome record `O10` points to active delayed-correction trial `T12` before `T12` is later narrowed or retired, the oracle must still be able to determine that `O10` used `T12` as it was effective at the outcome relation order. Inspecting `O10 -> current T12` after later lifecycle changes is insufficient if current `T12` no longer has the same material status or scope.

Conceptually valid representations include:

```text
O10 --outcome[trial]--> T12 @ effective_order(D10)
O10 --outcome[trial]--> T12-V3

T12 history:
  V1 active seq 51-92
  V2 narrowed seq 93-120
  V3 retired seq 121+
```

This rule does not require immutable storage for every object. It requires that historical dependency meaning not be rewritten by later status, scope, payload, or lifecycle changes.

Effective semantic endpoint identity is separate from `ADR-006` responsibility classification. A change from cross-transition SUT state to SUT transition evidence does not by itself require a new semantic state version unless semantic meaning also changed. Responsibility classification remains inspectable through order intervals, consumer history, transition history, or equivalent evidence.

## Dependency Contemporaneity

For SUT-owned relations used to prove that a fact, assessment, state, or control influenced a dependent SUT transition, the dependency must be established contemporaneously with that transition or be reconstructable from contemporaneous transition inputs/state whose identity and ordering were already preserved.

A relation created only after the dependent transition may be used as an oracle-derived inspection relation, but it cannot by itself prove that the referenced basis, support, binding, applicability assessment, or prior state was actually consumed by the SUT at the earlier transition.

Where relation assertion/capture order differs from semantic consumption or dependency-use order, both must remain distinguishable. Backdating a later relation to an earlier effective order is insufficient.

For example, a later oracle-derived relation `T1 --basis--> COMPARE-1` is valid if candidate formation at sequence 50 preserved a contemporaneous input snapshot or transition record naming `COMPARE-1`. It is invalid if the only evidence is a sequence-100 reconstruction or explanation that says `T1` probably used `COMPARE-1`.

## Minimum Record Contracts

| Record family | Minimum identity/reference metadata | Required relation families |
| --- | --- | --- |
| Selected-slice facts | Reference core; fixture item or SUT fact reference; semantic source relation where applicable; occurrence/order time; role label; record-origin role where material; material payload handle where scored. | `source`; may be the target of `basis`, `support`, or other required relations from consuming or derived records. |
| SUT transition evidence | Reference core; transition kind; input basis refs; result/status assertion provenance; transition creation order; affected state refs and effective versions where material; uncertainty or limitation marker where relevant. | The relation obligation map below decides required `basis`, `support`, `binding`, `transition_ancestry`, `applicability`, `realization`, `outcome`, or `explanation_support` relations for each selected transition. |
| State anchors | Reference core; state identity; effective semantic version/status/scope history; created-by transition ref; correction path where required; ADR-006 responsibility evidence if inspected. | `source` or `transition_ancestry`; conditional lifecycle relations including `supersession`, `retirement`, `narrowing`, and `conflict` only where the selected transition exists. |
| Lineage-preserving projections | Reference core; projection target refs; projection rule or view identity; generated order; proof that the projection adds no fixture-authored semantic conclusion; effective target state where material. | `projection_of` to retained state, retained transition evidence, or retained input facts, plus all underlying relations needed to reconstruct lineage. |
| Oracle-visible records | Reference core; observed SUT/fixture/simulator refs with effective observed state where material; oracle rule or claim-class refs where applicable; capture order; outcome or failure classification; oracle-only evaluation context unless explicitly delivered as a SUT-visible fixture/control fact. | `explanation_support`, `outcome`, or reporting/citation refs used for inspection. Must not become SUT-owned semantic state. |

## Referenceability Trigger

A record or fact requires its own stable reference when it must be:

- a relation endpoint;
- distinguished from another same-kind item;
- cited across transition, projection, capture, branch, or reporting boundaries;
- correlated across lineage-preserving projections, replay branches, or oracle captures;
- referenced by a failure artifact, obligation result, claim-support record, bounded milestone claim, or report.

A purely recomputable oracle predicate that is never independently referenced may remain an ephemeral computation associated with its rule ID and input references. This ADR does not require a stable record ID for every oracle boolean, intermediate assertion, or scoring step.

## Required Relation Tuple

Each required relation must be inspectable with at least:

- `relation_kind`;
- `from_ref`;
- `to_ref`;
- `target_role` or participant/use role when the relation kind can involve several participants;
- effective endpoint state/version/order when `to_ref` or `from_ref` is mutable or lifecycle-bearing and the effective meaning is material;
- dependency-use/effective order and relation assertion/capture order where those differ and the difference is material;
- `created_order_marker`;
- `asserted_by_role`;
- semantic use target or applicability scope when the relation is not globally applicable;
- evaluation context only for oracle/reporting relations, not SUT-visible semantic dependency relations unless explicitly delivered;
- relation-specific assertion status where current/withdrawn/disputed/superseded distinction is required.

The default orientation is:

```text
dependent or assessment record -> referenced source, basis, participant, predecessor, target, or limitation
```

For example, a temporal assessment points to the assessed evidence; a candidate points to its support; an active trial points to its candidate and activation assessment; an outcome record points to active trial, disposition, realization, and observed facts.

Equivalent embedded fields are valid if the oracle can recover the same tuple, orientation, target role, order, and scope. No graph-wide reachability, transitive closure, global topological sort, or generic graph API is required.

Where a selected-slice relationship is an assessment or classification involving several participants, the SUT-owned assessment/record is the relation anchor. Required relation tuples connect that anchor to each participant with a declared participant/use role.

Generic relation status must not replace required typed semantic relations. Narrowing, retirement, supersession, and conflict must be represented by their typed relation semantics when those selected-slice transitions exist, not solely by setting a generic status on another relation.

`basis` and `support` are orthogonal relation meanings. The same referenced record may be both a materially consumed input and epistemic support for the resulting candidate/conclusion, but the oracle must not infer support merely from basis membership.

Raw facts and communications consumed by a SUT semantic-classification transition are referenced through `basis`. `transition_ancestry` is reserved for lineage among SUT-owned semantic states, assessments, candidates, corrections, active state, or lifecycle-bearing predecessors where descendant identity/history is material. It must not be used as a generic synonym for "derived from."

For selected-slice records governed by a more specific required relation kind such as `outcome` or `explanation_support`, generic `support` does not satisfy that typed relation obligation.

## Selected-Slice Relation Obligation Map

The selected-slice minimum relation obligations are:

| Selected-slice record or transition | Minimum required relation semantics |
| --- | --- |
| Raw communication event such as `C-002`, `D-002`, or `V-003` | `source` to the synthetic user or applicable source actor; occurrence/delivery order and permitted fixture-visible content. Must not carry SUT-derived interpreted target, correction timing classification, authority status, or evaluation-context metadata as behavior-driving payload. |
| SUT-derived attributed assertion | `source` to the source actor; `basis` to the raw communication event the SUT attributed. |
| Temporal eligibility assessment | `basis` to assessed evidence, chronology facts or order markers, and declared use target. |
| Dimension comparison | `basis` to recognition observation and production observation; material scope refs for target dimension and task mode. |
| Production-focused candidate | `basis` to consumed candidate-formation inputs, including the selected bounded trial-direction affordance such as `TRIAL-PROD-FOCUS`; `support` to the dimension comparison or other SUT-owned assessment that epistemically favors the selected direction. Availability of the affordance is not itself support. |
| Candidate-bound proposal intent | `transition_ancestry` to the candidate it represents; material payload sufficient to inspect proposal intent. |
| Proposal realization view/fact | Simulator realization record points through `realization` to the SUT proposal intent it was asked to realize; the realization record payload identifies the surfaced wording/behavior. Fidelity or mismatch classification may be a separate assessment over requested intent and realized fact. |
| Binding assessment | For the canonical proposal-required path, role-qualified `binding` relations to the candidate-bound proposal intent, actual surfaced realization, and actual user response. Proposal intent ancestry to candidate and realization to proposal intent must be locally inspectable before activation. Candidate relation may also be included, but a final `binding = valid` label without this participant closure is insufficient. |
| Activation assessment | `basis` to candidate, binding assessment where applicable, candidate-support lineage, temporal evidence, control/context facts, and policy/control inputs. Activation-check results are outputs/status assertions of the assessment, not prior basis inputs to themselves. |
| Active trial | `transition_ancestry` to candidate and activation assessment. |
| SUT-derived scoped correction/control state from `D-002` or `V-003` | Separate SUT-owned state anchor with `source` to user and `basis` to the raw communication event; semantic scope records interpreted target, activity/task mode, correction timing, and authority/status meaning derived by the SUT. |
| Direct current-session correction disposition | `basis` to the SUT-derived scoped correction/control state and current context; must remain distinct from future trial state. |
| Delayed-correction candidate | For `SCN001-SSFO-V0.2.0-CANONICAL-THIN` and the same-run prefix used by `CF-DRILL-OPT-IN`, `transition_ancestry` to the SUT-owned direct current-session correction disposition is required. Also requires `basis` to consumed drill/correction evidence and `support` to evidence or SUT-owned assessment that epistemically favors delayed correction. |
| Active delayed-correction trial | `transition_ancestry` to delayed-correction candidate and activation assessment. |
| Later-use applicability assessment | Role-qualified `applicability` relations to retained active trial and declared later use target/context. |
| Later behavior disposition | `basis` to applicability assessment and applicable active trial. |
| Simulator realization fact/view | Simulator realization record points through `realization` to the prior SUT proposal or behavior disposition it was asked to realize; its own payload identifies what was actually realized. No realization self-edge is required or allowed merely to identify the simulator fact. |
| Intervention-conditioned outcome record | Role-qualified `outcome` relations to active trial, behavior disposition, realization, material context, observed facts, co-intervention status, and uncertainty. |
| Explanation support | `explanation_support` to retained behavior-change lineage, outcome, scope limitations, epistemic uncertainty, causal limitations, and unsupported generalization limits. |
| Lineage-preserving projection | `projection_of` to the retained state, transition evidence, or retained input fact it exposes. |
| Non-activation disposition | `basis` to insufficient/conflicting evidence or unresolved control condition; no candidate retirement relation exists if no candidate was formed. |
| Conditional supersession/retirement/narrowing/conflict | Required only when the SUT represents that selected-slice transition/result; must preserve old and new target/scope/history as applicable. The focused-drill counterfactual normally pressures `not_applicable` for the delayed-correction trial, not a narrowing transition. |

## Required Relation Semantics

| Relation kind | Minimum semantics | Selected-slice examples | Must not mean |
| --- | --- | --- | --- |
| `source` | Connects a fact, assertion, observation, control event, or simulator fact to the actor/system/package that originated its semantic content. Fixture-origin source may resolve oracle-side to the fixture/package; SUT-visible source endpoints may be opaque where exposing package identity would reveal evaluation context. | Current utterance attributed to synthetic user; fixture observation from package; simulator realization fact from simulated dependency. | The source is authoritative for SUT-owned conclusions merely because it exists, or a substitute for projection lineage. |
| `basis` | Identifies material input facts, prior transition evidence, available bounded affordances, or control/context facts consumed by a SUT transition or assessment for a declared use target. | Temporal eligibility basis over old `H-002`; comparison basis over recognition and production observations; selected direction basis to `TRIAL-PROD-FOCUS`; activation basis over candidate, binding, lineage, and control facts. | A vague retrospective explanation, all available context, or proof that the input epistemically supports the result. |
| `support` | Indicates evidence or an inspectable SUT-owned assessment that epistemically favors or justifies a candidate, interpretation, disposition, outcome classification, or explanation without becoming that supported object. | Dimension comparison supports production-focused candidate; scoped correction evidence supports delayed-correction candidate. A comparison consumed by candidate formation may be both `basis` and `support`. | Proof of causal truth, durable preference, automatic activation, or mere availability of an affordance. |
| `binding` | Uses a binding assessment as the anchor record and role-qualified participant relations to candidate-bound proposal intent, actual surfaced realization, actual user response, and candidate where useful. The candidate-bound proposal intent must preserve ancestry to the candidate, and the surfaced realization must realize that proposal intent. | Binding assessment points to `P-001R`, its surfaced realization, and the user acceptance before activation; candidate identity is recoverable through proposal ancestry. | User response binds directly to an invisible candidate, hidden intended policy, wrong proposal, or final binding label without participant closure. |
| `transition_ancestry` | Preserves lineage between state created by a transition and the predecessor candidate, assessment, correction, or prior state it descends from. | Active trial descends from candidate plus activation evidence; delayed-correction candidate descends from direct correction disposition. | A generic history note, generic "derived from" edge, or reconstruction after state loss. |
| `applicability` | Uses an applicability assessment as the anchor record and role-qualified participant relations to retained state and declared current use target/context. It records applicable, not applicable, or unresolved use. | Later-use review applies delayed-correction trial to spontaneous production; `CF-DRILL-OPT-IN` marks it not applicable for a focused drill with explicit immediate-correction opt-in. | Fixture-provided relevance ranking, hidden oracle applicability answer, automatic narrowing, or automatic conflict. |
| `projection_of` | Connects a lineage-preserving projection to the same underlying retained state, transition evidence, or retained input fact it exposes. | `L-002` projection points to the same active delayed-correction trial as `CF2-L-003`. | Semantic source, transition ancestry, or a substitute for lost target state. |
| `realization` | Connects a simulator realization record to the prior SUT proposal intent or behavior disposition it was asked to realize. The realization record's own payload identifies what was actually realized; separate fidelity assessment may compare requested and realized facts where material. | Simulated response realizes SUT direct-correction disposition; proposal wording record realizes SUT proposal intent. | Simulator output as sole evidence that the prior SUT disposition existed, or a realization record pointing to itself to identify that it is the simulator fact. |
| `outcome` | Uses an outcome record as the anchor and role-qualified participant relations to active trial, behavior disposition, realization, material context, observed outcome facts, co-intervention status, and uncertainty. | Intervention-conditioned outcome points to active trial, disposition, realization, co-intervention facts, and outcome observations. | Causal proof, long-term efficacy, global preference, or durable learning. |
| `explanation_support` | Connects explanation support to retained state/evidence, behavior-change lineage, transition basis, scope limitations, epistemic uncertainty, causal limitations, and unsupported generalization limits. | `DP-EXPLAIN` cites active trial, applicability, outcome, behavior-change lineage, and semantic limitation refs. | Hidden chain-of-thought, fabricated support, oracle-only answer keys, or oracle claim-class machinery treated as SUT-owned semantic support. |
| `supersession` | A later state or control meaning replaces an earlier one for the same relevant semantic/use target while preserving the earlier record. | A later explicit correction replaces an earlier same-target control meaning. | Deleting or rewriting the old record, or treating differently scoped evidence as automatically superseded. |
| `retirement` | An existing candidate, trial, or other lifecycle-bearing state becomes no longer active/effective, with basis and order preserved. | Existing candidate or active trial retired after a valid later transition. | Withholding before candidate formation, erasure, expiry machinery, or production forgetting. |
| `narrowing` | A transition relation between a narrower effective semantic state/scope and the prior broader state whose history remains preserved. | An already active trial is later narrowed from a supported broader spontaneous-production scope to a smaller subset after new scoped evidence, while preserving prior history. | Simple inapplicability, a new unrelated rule, broad preference, or the focused-drill counterfactual's normal `not_applicable` result. |
| `conflict` | An explicit unresolved relation among materially co-applicable states or controls that cannot simultaneously govern the same declared use target without further resolution. | Two same-target correction controls that both claim current applicability and cannot both govern. | Different scope, automatic failure, automatic winner selection, or a general contradiction engine. |

## Lifecycle Classification Inspectability

`ADR-006` lifecycle-relative classifications must remain inspectable through this metadata contract.

At each material inspection point, the oracle must be able to determine:

- whether a record is SUT-owned state, SUT transition evidence, a lineage-preserving projection, a derived inspection fact, or fixture/oracle-only;
- whether each material status assertion or classification was fixture-declared, SUT-derived, simulator-produced, or oracle-derived;
- whether the assertion was captured, observed, or projected by the harness or oracle, including capture order and view/projection identity where material;
- which later SUT consumer, if any, required the record to remain cross-transition state;
- when a record stopped being behavior-driving state and remained only transition evidence, if that reclassification occurs;
- which relations preserve source, basis, support, ancestry, applicability, realization, outcome, and explanation lineage after reclassification.

Where responsibility classification changes over a run, the oracle must be able to associate the classification with the relevant order interval or reclassification transition. A final current classification is insufficient to prove prior cross-transition retention.

This may be explicit metadata, a transition log, version history, or an oracle-reconstructable relation set. The implementation does not need a universal lifecycle engine, TTL scheduler, dependency invalidation service, or background maintainer.

## Oracle Visibility Guardrail

Oracle-visible does not mean SUT-visible.

The SUT may hold:

- SUT-visible fixture facts with fixture provenance;
- SUT-owned selected-slice state and transition evidence;
- lineage-preserving projections over SUT-owned state or delivered fixture facts when the projection adds no prohibited conclusion.

The SUT must not hold as behavior-driving semantic state:

- oracle rule IDs as answer guidance;
- claim-class pass/fail labels;
- branch policy, canonical path labels, or expected outcomes;
- evaluator-only comments or hidden ground truth;
- hidden stale/current, best-trial, applicability, causal, preference, or full-scenario verdicts.

Oracle records may reference SUT state and transition evidence after capture, but those references do not make oracle conclusions part of SUT state.

The reference and inspection contract does not define one payload that must be exposed wholesale to every accessible party. SUT semantic access may be a safe projection containing material semantic payload, permitted control/provenance facts, and behavior-needed lineage. Oracle-only campaign, answer-bearing package/version, bundle, branch, path, checkpoint, claim-class, responsibility-classification, capture, scoring, canonical-pressure, and expected-transition metadata must remain outside cognitive input unless a separate accepted selected-slice contract makes that exact fact SUT-visible.

`record_origin_role`, exposure/access metadata, `adr006_responsibility` evidence, and relation kinds are metadata for inspection and boundary preservation. They are not themselves behavior-driving semantic evidence unless explicitly delivered as permitted fixture/control input. A SUT-produced label such as `cross_transition_sut_state` is not sufficient proof of `ADR-006` cross-transition retention; the proof must come from retained state, later consumer history, transition order, capture evidence, or another accepted inspectable representation.

## Minimum Closure Rules

The selected slice requires local relation closure only.

For each inspected candidate, proposal, active trial, applicability assessment, behavior disposition, outcome record, projection, or explanation-support record, the oracle must be able to enumerate the directly required source, basis, support, binding, transition-ancestry, applicability, projection-of, realization, outcome, explanation-support, and applicable lifecycle relation semantics (`supersession`, `retirement`, `narrowing`, or `conflict`) named by this ADR and `ADR-006`, including endpoint participant/use roles where material.

For each relation to mutable or lifecycle-bearing state, the oracle must also be able to resolve the effective endpoint state/version/status/scope consumed by that relation.

Oracle capture, observation, and report citation links are evaluation/reporting references outside the core SUT semantic dependency vocabulary unless represented as lineage-preserving `projection_of` or another relation explicitly required by this ADR. They must still resolve the exact scoped and effective state observed. Implementations must not misuse `support` as a generic citation or capture relation.

The implementation is not required to:

- answer arbitrary dependency queries;
- compute all upstream or downstream descendants;
- maintain graph indexes;
- perform automatic invalidation propagation;
- detect all cycles;
- resolve conflicts generally;
- model grouped component operations;
- expose final internal modules.

If a later claim needs non-circular support or non-convergence detection beyond these local selected-slice relations, that belongs to `DEP-002`, not this ADR.

## Explicit Non-Scope

This dependency identity contract does not require or decide:

- a general dependency graph, graph database, graph traversal API, or universal edge schema;
- a workflow engine, orchestration lifecycle, task engine, retry policy, or queue;
- production memory schema, durable personal-memory custody, summary store, embedding store, adapter, or training artifact;
- retrieval, memory search, relevance ranking, distractor filtering, or context assembly;
- final database schema, storage engine, serialization format, repository split, service boundary, or internal module boundary;
- model, prompt, agent, provider, runtime, tool, or inference-destination identity beyond optional provenance refs when already captured elsewhere;
- the full behavior-configuration metadata contract required by `EVAL-004`; this ADR may reference already-declared campaign, run, fixture, or behavior-configuration IDs but does not define the first formal evaluation record;
- acceptance scoring or scenario-scoreability criteria required by `SLICE-005` and `EVAL-005`;
- background maintenance triggers, expiry, revocation propagation, capability degradation handling, external refresh, or manual review queues required by `DEP-003`;
- real personal continuity, durable developmental adaptation, real voice/avatar behavior, Japanese pedagogy quality, statistical reliability, production readiness, or full `SCN-001` pass.

## Downstream Effects

| Downstream question | Effect of this ADR on acceptance | What remains undecided |
| --- | --- | --- |
| `SLICE-003` | Unblocks the internal-boundary question by defining the minimum reference families and relation semantics that any selected-slice boundary must preserve. The boundary may now be drawn around producers, consumers, and inspectors of these records. | Final module split, repository layout, service topology, model/runtime boundary, and production architecture. |
| `DEP-003` | Provides the dependency relation kinds future maintenance-trigger analysis would inspect and satisfies the precondition that selected state/dependency types are known. It does not itself introduce expiry, revocation propagation, capability degradation, external refresh, or manual review. | Whether any runtime maintenance trigger is required for this milestone or a later one. |
| `SLICE-005` | Gives the acceptance gate a concrete evidence-adequacy precondition: required claim classes may depend on records only if their references and local relations satisfy this contract. | Which claim classes are jointly required, campaign aggregation for final milestone completion, and bounded pass language beyond prior ADRs. |
| `EVAL-004` | Identifies which evidence records need stable references to behavior/evaluation configuration IDs where those already exist in campaign metadata. | The full behavior-configuration metadata contract, compatibility claims, comparison metadata, and model/runtime/prompt configuration rules. |
| `EVAL-005` | Clarifies which unresolved dependency questions can be carried as bounded assumptions for this slice: no graph engine, no runtime maintenance, no retrieval, no production memory. | Final scoreability, unresolved-question impact on pass criteria, and which assumptions weaken or prevent specific claims. |

## Boundary Red-Team

| Overbuild pressure | Guardrail |
| --- | --- |
| The relation list could become a full dependency graph. | Relations are local typed semantics recoverable per inspected record. No graph engine, global traversal, generic edge schema, or transitive closure is required. |
| The reference contract could become the final schema. | Only scoped identity is universal. Other metadata is conditional and may be inherited, embedded, logged, reconstructed, or projected. The contract defines inspectable semantics only. |
| Lifecycle relations could become a workflow engine. | `supersession`, `retirement`, `narrowing`, and `conflict` are semantic history relations, not tasks, queues, retries, approvals, or background jobs. |
| Basis/support relations could become retrieval or context assembly. | The harness still curates context under `ADR-004`; this ADR only records which delivered facts or retained state the SUT used. |
| State anchors could become production memory architecture. | Identity is run-scoped and fixture-bound unless a later ADR deliberately expands it. Durable personal memory and real continuity remain out of scope. |
| Oracle records could leak answer metadata into the SUT. | Exposure/access metadata, `record_origin_role`, `adr006_responsibility` evidence, status assertion provenance, and typed `source` relations must distinguish SUT-accessible facts from oracle-only rules, labels, scores, and expected answers. |
| Effective endpoint identity could become immutable storage everywhere. | Immutable versions are one valid representation, but event history, order intervals, capture snapshots, or reconstructable transition history are also valid if they preserve historical relation meaning. |
| Evaluation path context could become semantic scope. | Reference namespace, semantic applicability scope, and evaluation context are separate. Campaign, answer-bearing package/version, bundle, branch, path, checkpoint, claim-class, scoring, canonical-pressure, and expected-transition metadata remain oracle/harness-side unless explicitly delivered. |
| Model/runtime provenance could become semantic authority. | Producing-mechanism refs are optional provenance unless separately required; they do not make a candidate active, true, applicable, or supported. |

## Register Effect

Upon acceptance, update `OPEN_QUESTIONS.md` as follows:

- move `DEP-001` to `Resolved` with outcome `Decision`, resolved by this ADR for the first `SCN-001` selected-slice milestone;
- record that the selected slice uses stable scoped references, effective-state identity for mutable/lifecycle-bearing relation endpoints, contemporaneous dependency-use evidence, and local typed relation semantics for source, basis, support, binding, transition ancestry, applicability, projection-of, realization, outcome, explanation support, supersession, retirement, narrowing, and conflict;
- record that this does not decide a full dependency graph, workflow engine, production memory schema, retrieval/context-assembly system, behavior-configuration metadata, acceptance gate, runtime maintenance triggers, or final internal module boundary;
- re-triage `SLICE-003` as the recommended next active frontier because selected state and dependency identity are now known;
- move `DEP-003` from `Blocked` to at least `Open`; acceptance of this ADR satisfies the "selected state/dependency types are known" precondition for asking whether any selected-slice maintenance trigger is required, but this ADR itself introduces no expiry, revocation, capability degradation, external refresh, or manual-review mechanism. Activate `DEP-003` only if the project owner determines runtime-maintenance semantics block the next frontier;
- re-triage `SLICE-005`; this ADR supplies evidence-reference adequacy constraints but does not decide final acceptance;
- keep `EVAL-004` deferred unless a later artifact prepares a first evaluation record, comparison, or evaluated compatibility claim requiring behavior-configuration metadata;
- keep `EVAL-005` deferred unless a later artifact prepares final scoring or scenario-scoreability criteria.

No other question automatically activates merely because this ADR is accepted.

## Reconsideration Triggers

Reconsider or supersede this ADR if:

- the oracle cannot verify `ADR-006` state/evidence relationships from local typed references without a broader graph mechanism;
- implementation cannot preserve stable run-scoped identities and effective historical endpoint meanings for candidates, proposals, active trials, applicability assessments, dispositions, outcomes, projections, or explanation support;
- SUT-visible references or semantic scope encode campaign, answer-bearing package/version, bundle, branch, path, checkpoint, claim-class, scoring, canonical-pressure, expected-transition, or hidden answer metadata;
- lifecycle-relative classification cannot be inspected without relying on retrospective self-report;
- fixture/oracle-only answer metadata is found inside behavior-driving SUT state;
- `SLICE-003` cannot draw a minimum internal boundary while preserving this contract;
- `SLICE-005`, `EVAL-004`, or `EVAL-005` requires broader metadata to make bounded first-milestone evidence or claims scoreable;
- `DEP-003` becomes active because expiry, revocation propagation, capability degradation, external refresh, or manual review enters the milestone;
- a later milestone claims retrieval, production memory, durable adaptation, real personal continuity, statistical reliability, or full `SCN-001` evidence from relations broader than this selected-slice contract.

## Non-Decisions

This ADR does not decide:

- the final internal boundary for `SLICE-003`;
- runtime maintenance triggers for `DEP-003`;
- acceptance gate or final done criteria for `SLICE-005`;
- behavior-configuration metadata for `EVAL-004`;
- scoreability criteria for `EVAL-005`;
- non-circular support or convergence detection for `DEP-002`;
- concrete storage schemas, class names, database tables, event buses, API payloads, or product inspection UI.
