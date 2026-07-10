# SCN-001 Selected-Slice Engineering Profile

Profile version: `V0.3.1`

Status: `Draft`

Date: 2026-07-10

Base standard: `ENGINEERING_STANDARD.md` `V0.5.0`

Decision basis:

- `OPEN_QUESTIONS.md` `V0.2.18`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`
- `decisions/ADR-006-scn001-selected-slice-state-contract.md` `R2`
- `decisions/ADR-007-scn001-selected-slice-dependency-identity.md` `R3`
- `decisions/ADR-008-scn001-selected-slice-internal-boundary.md` `R2`

## Purpose

This profile maps accepted first selected-slice decisions into implementation conformance rules.

It is not a second semantic source for `SCN-001`. The ADRs listed above remain authoritative. This profile defines engineering consequences, required checks, failure consequences, and attack cases for the first non-throwaway selected-slice implementation.

## Responsibility Shape

The first implementation keeps SUT and evaluation responsibilities distinguishable:

```text
scn001_eval -> declared scn001_sut_core public boundary
scn001_sut_core -> no dependency on scn001_eval
```

The exact language, package manager, test runner, repository layout, and CI provider remain implementation choices.

## Evaluation-Context Barrier

The primary control is semantic, not lexical:

```text
SUT-visible contracts, references, and behavior-driving state do not encode
evaluation-context concepts prohibited by ADR-007 R3 and ADR-008 R2.
```

Known-key scanners for strings such as `expected_transition`, `oracle_rule_id`, `claim_class`, `canonical_match`, or `branch_policy` may be useful as defence in depth. Passing a lexical scanner is not proof of evaluation-context separation.

## Rule Catalogue

### ENG-CLAIM-WORKBENCH-001 - Scenario-Provisional Workbench Boundary

Rule revision: `R2`

Governing sources:

- `ADR-001 R1`
- `ADR-008 R2`
- `OPEN_QUESTIONS.md V0.2.18`
- `ENG-BASE-REPO-001 R2`

Scope: first `SCN-001` selected-slice implementation repository or workbench.

Applies when: creating, documenting, moving, promoting, or making claims about the first selected-slice implementation workspace.

Rule: the first `SCN-001` selected-slice implementation is a governed scenario-provisional workbench unless a later accepted responsibility-boundary decision says otherwise. Workbench placement does not make the implementation throwaway and does not weaken active conformance obligations. The ADR-008 SUT/evaluation split is a selected-slice responsibility boundary, not a durable Zoey system-project repository boundary.

Forbidden shapes:

- placing `scn001-selected-slice` under `projects/` as a durable Zoey system-project repo without a `REPO-001` resolution or equivalent accepted decision;
- claiming the workbench defines final Zoey repository layout, final module split, general Zoey core, general memory architecture, general growth architecture, permanent evaluation architecture, full `SCN-001` pass, or milestone acceptance;
- treating milestone success, code maturity, age, reuse, or renaming as sufficient promotion into `projects/`;
- weakening selected-slice conformance because the repository is a workbench.

Required checks:

- workbench README declares repository role, governance classification, permitted architecture claim, governance lock reference, and denied claims;
- workbench-to-project extraction checks the `REPO-001` trigger before creating durable project claims;
- local conformance ledger keeps selected-slice rules active for non-throwaway workbench code.

Eligible protection mechanisms:

- structural
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: claim-bearing workbench artifacts cite the scenario-provisional claim boundary and do not claim durable system-project status.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does this artifact treat the workbench as governed scenario-provisional implementation rather than a durable Zoey system-project boundary?

### ENG-CONF-IMPORT-001 - SUT Has No Evaluation Dependency

Rule revision: `R2`

Governing sources:

- `ADR-008 R2`

Scope: `scn001_sut_core`.

Applies when: SUT code, dependencies, imports, generated code, plugins, runtime loading, or shared contracts are changed.

Rule: SUT core has no direct or transitive dependency path to evaluation modules, evaluation record families, fixture/oracle packages, harness, simulator, capture/reporting, branch policy, scoring logic, or claim-class labels.

Forbidden shapes:

- `scn001_sut_core -> scn001_eval`;
- `scn001_sut_core -> shared_contracts -> scn001_eval`;
- dynamic imports, reflection, plugin loading, or generated imports that reach evaluation code;
- SUT code using answer-bearing fixture/oracle record types.

Required checks:

- direct and transitive dependency conformance where tooling can see it;
- dynamic loading surfaces are forbidden or explicitly reviewed with residual risk.

Eligible protection mechanisms:

- static
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: static dependency conformance or an explicitly equivalent structural barrier plus review of dynamic-loading residual risk.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can SUT code reach evaluation-owned semantics directly or transitively?

### ENG-CONF-IMPORT-002 - Evaluation Uses Declared SUT Public Surface Only

Rule revision: `R2`

Governing sources:

- `ADR-008 R2`
- `ENG-HEALTH-API-001 R2`

Scope: `scn001_eval`.

Applies when: harness, simulator, fixture projection, capture, oracle code, or evaluation tests call SUT code.

Rule: evaluation code reaches SUT behavior only through declared public boundary surfaces. Harness, simulator, fixture projection, capture, and oracle code do not call private SUT internals or hidden semantic transition commands.

Forbidden shapes:

- simulator imports private SUT modules;
- harness calls internal transition functions by decision-point or expected-transition name;
- tests claim selected-slice behavior evidence while bypassing the public boundary;
- making SUT internals public solely to simplify evaluation setup.

Required checks:

- import/export rules distinguish declared public SUT surface from private internals;
- behavior-evidence samples drive SUT through the declared public boundary.

Eligible protection mechanisms:

- static
- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: public-surface access is structurally declared and negative-tested for private/internal access where practical.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: is evaluation calling only the declared SUT public boundary?

### ENG-CONF-PAYLOAD-001 - Closed SUT Ingress

Rule revision: `R2`

Governing sources:

- `ADR-005 R2`
- `ADR-008 R2`

Scope: SUT public input and evaluation-origin payload projection.

Applies when: SUT ingress, fixture projection, simulator projection, serializers, input schemas, or boundary payloads change.

Rule: formal SUT ingress is closed against undeclared evaluation-origin material and answer-bearing evaluation context.

Forbidden shapes:

- passing full fixture/oracle records to SUT code;
- passing full simulator evaluation records to SUT code;
- SUT-visible payloads carrying branch policy, path identity, expected transition, oracle rule, claim class, canonical-match, scoring, or hidden answer fields;
- arbitrary extra fields being ignored after crossing into semantic ingestion.

Required checks:

- closed ingress through separate types, allowlist projection, closed schemas, restricted serializers, typed constructors, or another inspectable closed-contract mechanism;
- if representation permits arbitrary fields, unknown fields are rejected before semantic ingestion;
- negative tests submit full answer-bearing records and prohibited evaluation-context fields.

Eligible protection mechanisms:

- structural
- static
- automated-test

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: structural or static closed-ingress barrier plus automated negative tests for answer-bearing records.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can any undeclared evaluation-origin material reach SUT semantic ingestion?

### ENG-CONF-PAYLOAD-002 - Rejected Ingress Is Semantically Atomic

Rule revision: `R2`

Governing sources:

- `ADR-005 R2`
- `ADR-006 R2`
- `ADR-008 R2`

Scope: SUT public input validation and ingestion.

Applies when: input validation, deserialization, ingestion order, telemetry, or rejected-payload handling changes.

Rule: rejected SUT ingress has no selected-slice semantic side effects.

Forbidden shapes:

- retaining communication events before discovering prohibited fields;
- creating source relations before rejecting hidden oracle metadata;
- consuming transition order or consumer history for rejected semantic payloads;
- updating behavior-driving state and then returning a validation error.

Required checks:

- `rejected_payload_has_no_semantic_side_effect` negative test or equivalent;
- rejected ingress may create segregated technical/error telemetry but does not alter semantic state, transition evidence, semantic relations, consumer history, or material transition order.

Eligible protection mechanisms:

- structural
- automated-test

Expected test modes:

- negative
- contract

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: automated side-effect negative test.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: what semantic state remains unchanged after a rejected payload?

### ENG-CONF-ROLE-001 - Role And State-Origin Preservation

Rule revision: `R2`

Governing sources:

- `ADR-005 R2`
- `ADR-006 R2`

Scope: evaluation adapters and SUT-safe projections.

Applies when: adapters convert fixture/oracle/simulator material into SUT-visible inputs.

Rule: evaluation adapters preserve input role and state origin. They do not precompute SUT-owned semantic conclusions.

Forbidden shapes:

- raw communication converted by evaluation into correction-control state;
- task observations converted by evaluation into recognition/production split conclusions;
- fixture labels converted into SUT transition results;
- simulator realization converted into semantic correctness.

Required checks:

- adapter tests prove raw communications, observations, chronology facts, context labels, affordances, simulator facts, and state references keep their accepted role;
- negative tests catch pre-promoted semantic conclusions.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: adapter role/state-origin preservation covered by contract or negative tests.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: does this adapter preserve evidence role, or does it make a SUT conclusion?

### ENG-CONF-PUBLIC-001 - No Answer Selectors In SUT Public Boundary

Rule revision: `R2`

Governing sources:

- `ADR-008 R2`
- `ENG-HEALTH-API-001 R2`

Scope: SUT public commands, methods, endpoints, schemas, and harness-callable interfaces.

Applies when: SUT public boundary is added, renamed, widened, or used by evaluation.

Rule: the SUT public boundary does not expose semantic answer selectors, decision-point commands, expected-transition commands, or internal transition execution APIs.

Forbidden shapes:

- `execute_decision_point("DP-...")` as public SUT behavior input;
- `run_transition("EXPECTED_TRANSITION")` as public API;
- public APIs whose arguments reveal path, branch, expected transition, claim class, canonical answer, or oracle rule.

Required checks:

- public boundary review and where possible static/API checks reject answer-selector surfaces.

Eligible protection mechanisms:

- static
- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: public boundary surface is declared and checked for answer-selector APIs.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can the public boundary tell the SUT which semantic transition or answer is expected?

### ENG-CONF-EVIDENCE-001 - Behavior Evidence Uses Public Boundary

Rule revision: `R2`

Governing sources:

- `ADR-008 R2`
- `ENG-CLAIM-001 R2`

Scope: tests, traces, demos, and reports that claim selected-slice behavior evidence.

Applies when: an artifact is used as selected-slice behavior evidence or supports an evaluated claim about SUT behavior.

Rule: selected-slice behavior evidence drives SUT behavior through the accepted public boundary. Internal unit tests may test internals but do not count as selected-slice behavior evidence.

Forbidden shapes:

- demos or traces presenting internal-transition calls as behavior compatibility;
- internal unit tests counted as public-boundary behavior evidence.

Required checks:

- behavior evidence cites public boundary calls;
- internal-transition tests are labeled implementation evidence only.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: claim-bearing behavior artifacts cite public-boundary execution.

Failure consequences:

- claim-blocking

Review question: is this artifact behavior evidence or only implementation evidence?

### ENG-CONF-HARNESS-001 - Harness Non-Arbitration

Rule revision: `R2`

Governing sources:

- `ADR-008 R2`

Scope: harness and simulator-routing behavior.

Applies when: harness delivery, SUT output selection, simulator routing, ambiguity handling, or run validity behavior changes.

Rule: the harness transports the SUT-selected material proposal or behavior disposition. It does not choose among competing SUT outputs based on fixture path, branch policy, oracle expectation, canonical answer, or expected outcome.

Forbidden shapes:

- harness selects the canonical candidate from multiple SUT candidates;
- simulator realizes an output not selected by the SUT;
- harness resolves SUT ambiguity in favor of the fixture answer.

Required checks:

- negative test where SUT emits competing candidates and harness does not rescue the run;
- trace identifies which output was SUT-selected for realization.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- negative
- contract

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: automated negative test for competing-output non-arbitration.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: does the harness transport the SUT-selected output or choose for it?

### ENG-CONF-RUN-001 - Independent Run Isolation

Rule revision: `R3`

Governing sources:

- `ADR-003 R2`
- `ADR-004 R3`
- `ADR-008 R2`

Scope: harness run lifecycle, SUT run-scoped state, tests, provider/session reuse, caches, and replay.

Applies when: run lifecycle, test setup, global state, singleton state, provider sessions, caches, or replay behavior changes.

Rule: independent selected-slice runs do not inherit behavior-driving semantic state, transition evidence, relations, outcomes, or active trial state from each other.

Forbidden shapes:

- module globals preserving selected-slice semantic state across independent runs;
- static mutable collections or singleton stores leaking run A into run B;
- provider/session reuse that exposes run A semantic state to run B;
- test fixture reuse that makes longitudinal state appear without SUT-owned retention inside the run.

Required checks:

- run A creates candidate/active trial/outcome;
- run A ends;
- run B starts fresh;
- run A state, relations, outcomes, candidates, and active trials are not resolvable in run B;
- run A state does not affect run B behavior.

Eligible protection mechanisms:

- structural
- automated-test

Expected test modes:

- negative
- replay

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: automated independent-run isolation test.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can any selected-slice semantic state cross independent run boundaries?

### ENG-CONF-STATE-001 - Bounded Selected-Slice State Access

Rule revision: `R2`

Governing sources:

- `ADR-004 R3`
- `ADR-006 R2`
- `ADR-007 R3`

Scope: SUT state access in selected-slice behavior.

Applies when: state access, reference resolution, relation traversal, later-use behavior, or memory/context helpers change.

Rule: selected-slice state access is limited to identity resolution, direct access to already active run-scoped state, and local relation traversal required by accepted selected-slice decisions.

Forbidden shapes:

- open memory search;
- broad relevance ranking;
- distractor filtering;
- active cognitive-frame assembly;
- retrieval over a larger state universe.

Required checks:

- later-use paths resolve opaque SUT-owned handles or local relations, not broad retrieval;
- if broader retrieval is needed to pass, stop and re-triage the relevant open question before milestone claims.

Eligible protection mechanisms:

- structural
- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: bounded access covered by tests or structural limitation; no unresolved retrieval dependency.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: is this state access selected-slice bounded, or did it become retrieval/context assembly?

### ENG-CONF-STATE-002 - Transition-Attributable Semantic Mutation

Rule revision: `R2`

Governing sources:

- `ADR-006 R2`
- `ADR-007 R3`
- `ADR-008 R2`

Scope: behavior-driving selected-slice semantic state.

Applies when: state mutation, loaders, normalizers, serializers, inspection, capture, helpers, or transition evidence change.

Rule: every mutation to behavior-driving selected-slice semantic state remains attributable to a SUT-owned transition responsibility and preserves contemporaneous evidence of material order, consumed basis refs, produced or affected state refs, and transition result/status assertion.

Forbidden shapes:

- normalizers, serializers, state loaders, inspection, capture, or generic helpers silently promoting candidate state to active state;
- writing transition records after the fact as a substitute for contemporaneous mutation evidence;
- changing semantic status without an attributable SUT transition responsibility.

Required checks:

- tests or review inspect mutation provenance for behavior-driving state changes;
- helper layers that can mutate semantic state are explicitly bounded and reviewed.

Eligible protection mechanisms:

- structural
- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: behavior-driving mutation provenance is automated-test or structurally enforced for claim-bearing transitions.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: which SUT-owned transition responsibility caused this semantic mutation?

### ENG-CONF-DEP-001 - No Post-Hoc Dependency Repair

Rule revision: `R2`

Governing sources:

- `ADR-007 R3`
- `ADR-008 R2`

Scope: relation capture, inspection, reporting, and oracle-visible evidence.

Applies when: dependency-use evidence, relation capture, inspection, capture, reporting, or snapshots change.

Rule: dependency-use evidence is contemporaneously preserved or reconstructable from contemporaneously preserved inputs/state. Later-created relations, reports, or snapshots do not by themselves prove earlier SUT consumption.

Forbidden shapes:

- inspection creates missing lineage and presents it as prior SUT evidence;
- capture creates basis-use evidence after the transition;
- reporting backdates dependency use;
- later snapshots substitute for material-order state.

Required checks:

- negative tests or review cases for missing lineage, capture-created consumption evidence, backdated reporting relation, post-hoc basis proof, and later snapshot substitution.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- negative
- replay

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: no post-hoc repair is covered by negative tests for claim-bearing dependency evidence.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: was this dependency evidence preserved at material order, or repaired later?

### ENG-CONF-DEP-002 - Historical Effective Endpoint Identity

Rule revision: `R2`

Governing sources:

- `ADR-007 R3`

Scope: relations to mutable or lifecycle-bearing selected-slice semantic state.

Applies when: relations, lifecycle status, narrowing, retirement, supersession, conflict, state versioning, or endpoint inspection changes.

Rule: relations to mutable or lifecycle-bearing semantic state resolve the state, status, and scope effective at the relation's material order. Later mutation does not rewrite prior dependency meaning.

Forbidden shapes:

- relation endpoints as pointers only to current mutable records;
- narrowing, retirement, supersession, or conflict rewriting prior consumed state;
- prior dependency inspection returning current scope/status rather than material-order scope/status.

Required checks:

- test where an earlier relation consumes a state under scope/status A, later mutation changes scope/status B, and inspection of the earlier relation still recovers A.

Eligible protection mechanisms:

- structural
- automated-test

Expected test modes:

- regression
- replay
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: automated historical-endpoint mutation test or structural immutable/effective-version mechanism.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can later lifecycle mutation rewrite what an earlier relation meant?

### ENG-CONF-INSPECT-001 - Passive Inspection Invariance

Rule revision: `R2`

Governing sources:

- `ADR-006 R2`
- `ADR-008 R2`

Scope: SUT inspection surfaces.

Applies when: inspection APIs, snapshots, relation enumeration, debug views, or state inspection implementation changes.

Rule: inspection is passive. It does not create, repair, narrow, retire, activate, or mutate behavior-driving state, transition evidence, relation sets, consumer history, basis-use evidence, or lifecycle status.

Forbidden shapes:

- lazy relation materialization during inspection;
- inspection writes missing lineage back into SUT state;
- inspection consumes transition order or lifecycle status;
- inspection performs model/tool calls that alter selected-slice evidence.

Required checks:

- inspection mutation tests compare semantic state, relation set, transition order, and lifecycle status before and after inspection.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: automated inspection invariance test.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: what selected-slice evidence is guaranteed unchanged after inspection?

### ENG-CONF-INSPECT-002 - Inspection Interleaving Passivity

Rule revision: `R2`

Governing sources:

- `ADR-006 R2`
- `ADR-007 R3`
- `ADR-008 R2`

Scope: SUT inspection and later SUT behavior.

Applies when: inspection can run between behavior-driving operations or can affect caches, order counters, RNG, lazy computation, model calls, tool calls, or relation materialization.

Rule: inserting inspection between behavior-driving operations does not change later oracle-material behavior, except for explicitly segregated behavior-neutral observability artifacts.

Forbidden shapes:

- inspection warms caches that change later selected-slice behavior;
- inspection consumes RNG, order counters, or hidden state used by later transitions;
- deferred semantic computation occurs only because inspection was called;
- relation materialization during inspection changes later behavior.

Required checks:

- `process(A); process(B)` is oracle-materially equivalent to `process(A); inspect(...); inspect(...); process(B)`.

Eligible protection mechanisms:

- automated-test

Expected test modes:

- interleaving
- replay
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: automated inspection interleaving test.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can adding inspection between transitions change later behavior or evidence?

### ENG-CONF-SIM-001 - Simulator Isolation And Projection

Rule revision: `R2`

Governing sources:

- `ADR-002 R2`
- `ADR-005 R2`
- `ADR-008 R2`

Scope: simulator realization and simulator outputs returning to SUT.

Applies when: simulator realization, simulator output records, simulator-to-SUT projection, or simulator dependencies change.

Rule: simulator realizes SUT-selected proposal intents or behavior dispositions into synthetic facts. It does not choose correction policy, repair SUT decisions, decide semantic correctness, own branch gates, leak canonical matches to SUT, or become a direct SUT dependency.

Forbidden shapes:

- SUT imports simulator code;
- simulator selects canonical behavior;
- simulator output to SUT includes canonical-match, branch, oracle, or scoring fields;
- simulator repairs wrong SUT choices.

Required checks:

- simulator output returning to SUT passes the same closed-ingress projection as fixture inputs;
- negative tests submit full simulator evaluation records to SUT ingress.

Eligible protection mechanisms:

- static
- structural
- automated-test

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: simulator isolation and projection are covered by dependency checks and negative ingress tests.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: does the simulator realize SUT choice, or choose/repair behavior?

### ENG-CONF-CAPTURE-001 - Capture And Reporting Do Not Drive Or Repair Behavior

Rule revision: `R2`

Governing sources:

- `ADR-006 R2`
- `ADR-007 R3`
- `ADR-008 R2`

Scope: capture, reporting, logs, snapshots, debug traces, replay, and restore paths.

Applies when: capture/reporting artifacts, logs, snapshots, replay, restore, or debug traces can be read by later SUT behavior or claims.

Rule: capture and reporting collect evidence and failure artifacts; they do not become behavior-driving input to later SUT transitions and do not create missing SUT evidence after the fact.

Forbidden shapes:

- reports or capture artifacts re-ingested as SUT-visible semantic state;
- evaluation-only metadata in logs or snapshots influencing later SUT behavior;
- replay/restore promoting evaluation capture into SUT state without accepted decision;
- capture/reporting creating relation evidence presented as contemporaneous SUT state.

Required checks:

- replay/restore paths preserve the same visibility and state-origin rules as SUT input;
- tests or review prove evaluation-only metadata is not reintroduced into SUT behavior.

Eligible protection mechanisms:

- structural
- automated-test
- manual-review

Expected test modes:

- contract
- negative
- replay

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: capture/reporting non-repair and non-reingestion are tested or structurally impossible.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: can capture/reporting become behavior input or repair missing evidence?

### ENG-CONF-REF-001 - SUT-Safe References And Handles

Rule revision: `R2`

Governing sources:

- `ADR-005 R2`
- `ADR-007 R3`
- `ADR-008 R2`

Scope: SUT-visible references, handles, IDs, and serialized state references.

Applies when: references, handles, IDs, fixture projection, state citation, serialization, or relation endpoints change.

Rule: SUT-visible references do not encode evaluation context. Evaluation-side fixture IDs may exist inside evaluation records, but SUT-visible handles are opaque or otherwise non-evaluation-bearing.

Forbidden shapes:

- path-qualified fixture IDs used as SUT-visible handles;
- branch, bundle, checkpoint, claim-class, scoring, canonical-pressure, or expected-transition context encoded in handles;
- semantic aliases that carry the same answer-bearing meaning under different field names.

Required checks:

- negative tests reject literal path-qualified fixture IDs where they reveal evaluation context;
- review checks semantic leakage, not only reserved word matches.

Eligible protection mechanisms:

- structural
- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- CI-required

Minimum claim-support enforcement: SUT-visible handles are structurally opaque or negative-tested for evaluation-context leakage.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: does this reference reveal evaluation context by meaning, not just by word choice?

### ENG-CONF-CLAIM-001 - Selected-Slice Claim Boundary

Rule revision: `R2`

Governing sources:

- `OPEN_QUESTIONS.md V0.2.18`
- `ADR-004 R3`
- `ADR-005 R2`
- `ENG-CLAIM-001 R2`

Scope: SCN-001 reports, tests, traces, demos, README text, and implementation docs.

Applies when: an artifact describes selected-slice conformance, behavior, evidence, scoreability, acceptance, readiness, or broader scenario support.

Rule: selected-slice engineering conformance does not imply evaluated behavioral compatibility, formal campaign evidence, final scoreability, full SCN-001 pass, production memory, retrieval, real trust-boundary safety, or milestone acceptance.

Forbidden shapes:

- calling a development trace formal campaign evidence;
- using `score`, `pass`, `accepted_slice`, or equivalent labels to imply final acceptance before governing questions resolve;
- claiming full SCN-001 or production readiness from selected-slice conformance tests.

Required checks:

- docs and reports use bounded language;
- first compatibility/evaluation-record claims trigger `EVAL-004`;
- final scoreability claims trigger `EVAL-005`;
- first selected-slice completion/acceptance claims trigger `SLICE-005`.

Eligible protection mechanisms:

- static
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: claim-bearing artifacts are review-checked and do not use reserved formal-evaluation status before triggers resolve.

Failure consequences:

- claim-blocking

Review question: what exactly does this selected-slice artifact claim, and which stronger claims are excluded?

## Minimum Claim-Support Gate Families

Before selected-slice engineering claims rely on implementation evidence, the local conformance ledger should define gates for:

- architecture/dependency conformance;
- SUT boundary and ingress conformance;
- run isolation and state integrity;
- dependency/effective-endpoint integrity;
- inspection passivity;
- simulator/capture isolation;
- claim-language review;
- governance integrity.

Rules may start as review-only during exploration, but claim-supporting implementation needs local evidence for the minimum claim-support enforcement listed on the applicable rules.

## Red-Team Prompts

Use these as attack prompts when reviewing implementation:

- Can SUT code import or reflect into evaluation code?
- Can evaluation call private SUT internals and still claim behavior evidence?
- Can a full fixture/oracle object reach SUT input?
- Can rejected input leave semantic residue?
- Can a normalizer or loader silently change behavior-driving state?
- Can run B observe semantic state from run A?
- Can inspection alter later SUT behavior?
- Can capture or reporting repair missing dependency evidence?
- Can a mutable endpoint rewrite prior dependency meaning?
- Can fixture path, branch, claim class, score, expected transition, or canonical pressure leak through references?
- Can the harness choose the output the simulator realizes?
- Can logs, snapshots, or replay artifacts reintroduce evaluation metadata into SUT behavior?
- Can a development artifact be described as formal evaluation evidence?
