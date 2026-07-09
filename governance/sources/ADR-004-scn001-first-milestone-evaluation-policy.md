# ADR-004: SCN-001 First-Milestone Evaluation Policy

Status: `Accepted`

Date: 2026-07-07

Accepted: 2026-07-08

Record revision: `R3`

Decision authority: project owner

Resolved question IDs: `EVAL-001`, `EVAL-003`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.12`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.13` records `EVAL-001` and `EVAL-003` as resolved by this ADR and activates `EVAL-002`.

## Decision

Adopt one ADR with two independently referenced first-milestone evaluation decisions under accepted `ADR-002` and `ADR-003`:

- Decision A, for `EVAL-001`: selected-slice context boundary.
- Decision B, for `EVAL-003`: nondeterministic acceptance and hard-invariant policy.

For the first `SCN-001` milestone, the harness supplies curated fixture context at each SUT decision point. The SUT does not own open retrieval, memory search, broad relevance selection, or context assembly in this milestone. The SUT does own semantic use of the supplied context: stale-history judgment, attribution where not already fixture-declared, scoped trial formation, activation checks, retained active-trial state, later-use applicability, outcome attribution, and explanation support.

For nondeterministic behavior, use a formal milestone evaluation campaign with hard invariant gates plus bounded variance. Natural wording and benign branch variance are acceptable only when the effective inspected state satisfies the oracle. No valid hard-invariant failure may be averaged away or made irrelevant by later lucky runs under the same materially unchanged behavior configuration.

Acceptance of this ADR resolves `EVAL-001` through Decision A and `EVAL-003` through Decision B for the first `SCN-001` milestone only. This ADR does not amend the `ADR-002` SUT boundary, the `ADR-003` trial/time contract, or the exclusion of full `SCN-001` scenario-pass claims.

## Critical Analysis Of The Current Gap

The first milestone needs to prove the selected semantic transition chain before it claims the harder problem of finding the right context from a larger available-state set.

Testing open retrieval now would merge at least three failure causes: the SUT might fail to retrieve relevant history, fail to preserve context permissions and epistemic status during assembly, or retrieve the right context but fail the semantic transition. That ambiguity would make `EVAL-002` fixture and oracle design larger without increasing the first milestone's core falsification value.

A bounded hybrid with distractors is tempting, but still requires distractor policy, relevance oracle policy, and trust-boundary handling. It also invites a misleading claim that the first milestone evaluated retrieval or context assembly when it only evaluated a tiny synthetic selection task.

Harness-curated context has its own risk: the harness can accidentally hand the SUT the answer. The acceptable narrow policy is therefore curated fixture context with preserved semantic roles, not curated semantic conclusions. The fixture may supply the evidence and control facts the SUT is allowed to consider, but the SUT must still perform the accepted `ADR-002` and `ADR-003` semantic transitions over that material.

Nondeterministic runs create a similar problem. Exact wording should not be the oracle, but a plausible natural-language explanation cannot excuse broken state. The smallest acceptable policy is to gate on hard invariants, require formal campaign evidence, and allow bounded variance only where the inspected effective state is equivalent for the milestone claim.

## Decision A: Context Boundary

For the first `SCN-001` milestone, choose harness-curated context.

The harness supplies fixture-owned context at each material decision point, preserving the distinct role of each supplied item:

- fixture evidence, including historical observations and task outcomes;
- current-path communication events and user responses;
- observations, task-mode labels, item correctness, and outcome facts;
- chronology facts and session ordering;
- surface and context labels;
- fixed or independently declared low-consequence trial affordance facts;
- fixture-declared material context changes and co-interventions.

The curated bundle is not one undifferentiated evidence source. Availability of a trial affordance is not evidence that the trial is semantically warranted. A surface label is not evidence of a preference. A chronology fact is not a staleness verdict. A user response event is not automatically valid acceptance of a candidate-bound proposal.

### State-Origin Rule

Harness-curated context applies to fixture-owned evidence, control facts, communications, and affordance inputs. It must not reconstruct, restate, or semantically recreate SUT-owned retained trial state between interactions.

SUT-owned retained semantic state required by `ADR-002` and `ADR-003` must remain sourced from the SUT's effective retained state. If the harness or oracle exposes a view or reference to retained SUT state for cognition or inspection, that view must preserve the identity and lineage of the same retained SUT state. It must not become a fixture-authored semantic copy that rescues a lost transition.

A lineage-preserving view or reference must not add fixture-authored semantic conclusions, relevance rankings, applicability verdicts, recommended actions, or derived support that the SUT is responsible for producing. Only representation or projection needed to expose the same retained state is permitted under this boundary.

### Attribution And Fixture Status

Current-path utterances and user messages are supplied as attributable communication events. Where `ADR-002` assigns attribution, epistemic-status handling, or semantic classification to the SUT, the harness must not pre-label the current-path event as the SUT's answer.

Pre-existing fixture history may include fixture-declared semantic status when that status is part of the initialized synthetic state. Such status is harness-supplied input, not evidence that the SUT derived attribution or epistemic classification. Any milestone claim must distinguish fixture-initialized semantic status from SUT-owned semantic transitions performed during the evaluated path.

### Completeness And Adaptive-Curation Rules

`EVAL-002` must declare completeness semantics for each fixture-state family whose absence materially affects the transition, scoped to the declared synthetic scope and material decision point or bundle policy. Exhaustive omission means absence within that named family, synthetic scope, and decision-point or bundle scope. Non-exhaustive omission means unknown or not supplied, not "none exists." Exhaustive must not be interpreted as global completeness beyond the declared scope.

The material context bundle, bundle-construction rule, and permitted branch responses must be fixed by the pre-registered fixture/oracle version before the evaluated SUT output they pressure is observed. The harness must not add, remove, reorder, or relabel semantic evidence to rescue an incorrect SUT transition unless that adaptive branch is explicitly pre-registered and excluded from claims the branch would otherwise answer for the SUT.

The harness must not supply semantic conclusions, including:

- "stale", "current skill", "current proficiency", or "fresh enough";
- "best trial", "correct trial", "active trial", or "applicable trial";
- "intervention-conditioned", "causally proven", or "learning efficacy";
- "voice preference", "learning style", "bad at particles", "bad at Japanese", or equivalent identity, trait, or global-preference labels.

The SUT must expose which supplied facts formed each transition basis. That inspection requirement proves lineage for SUT-owned semantic transitions. It does not support a claim that the SUT discovered, retrieved, ranked, selected, or assembled context from a larger available-state set.

### Context Responsibility Table

| Responsibility | First-milestone owner |
| --- | --- |
| Fixture-owned evidence, communication events, observations, chronology, context labels, user responses, outcomes, material changes, and affordance facts, with roles preserved | Harness |
| Effective context bundle, bundle-construction rule, branch policy, and fixture-state completeness declarations | Harness |
| SUT-owned retained semantic state, including active trial state after SUT transition | SUT; harness/oracle may expose only lineage-preserving views or references |
| Open retrieval, memory search, broad relevance selection, distractor filtering, and active cognitive-frame assembly | Excluded |
| Epistemic status, attribution, stale-history judgment, scoped comparison, trial candidate formation, activation checks, later-use applicability, outcome classification, and explanation support over supplied context | SUT, except fixture-initialized declared status that is explicitly treated as harness-supplied input |
| Oracle collection, normalization, run-validity classification, and scoring of exposed effective state | Harness or oracle |

## Decision B: Nondeterministic Acceptance

Minimum acceptable first-milestone evidence is one canonical thin path plus the required paired counterfactual pressure from `ADR-002` and `ADR-003`, run under a declared behavior configuration.

Counterfactual pressure is claim-class specific. An evidence-responsive trial-formation claim requires an evidence or calibration counterfactual capable of falsifying that class. A scope or applicability-responsive trial-use claim requires a scope or applicability counterfactual capable of falsifying that class. If the first milestone claims both responsiveness classes, both counterfactual classes are mandatory. A counterfactual for one claim class cannot substitute for another.

### Formal Milestone Evaluation Campaign

Run evidence must be collected under a pre-registered formal milestone evaluation campaign. Pre-registration must identify:

- campaign identifier;
- scenario pressure ID and version, including `SCN-001 V0.2.2`;
- thesis baseline, including `SYSTEM_THESIS.md V0.3.1`;
- state/control baseline, including `STATE_AND_CONTROL_MODEL.md V0.4.1`;
- accepted ADR revisions that bind the campaign;
- fixture paths, fixture versions, context-bundle policy, branch policy, and completeness declarations;
- claim classes and required paired counterfactual pressure;
- behavior configuration identifier and revision;
- evaluation configuration identifier, including fixture, bundle policy, branch policy, oracle, run-validity policy, replacement policy, and run-selection policy versions;
- SUT implementation or build identifier;
- model, prompt, runtime, and tool configuration where applicable;
- nondeterminism declaration, planned outcome-independent seed policy or run-selection method, and any deterministic replay expectation;
- oracle version, run-validity criteria, and invalid-run replacement policy;
- planned run count per fixture path.

Actual replay handles, provider run IDs, actual seeds, runtime-generated trace IDs, and observed configuration fingerprints belong in the run evidence record. They need not already exist at pre-registration time.

For a nondeterministic formal campaign, the run-selection or seed-selection method must be fixed independently of prior observed formal or exploratory outcomes for the same behavior-configuration revision. Known favorable seeds, replay handles, cached outputs, or previously observed realizations must not be selected as fresh formal runs merely because their outcomes are known. Exploratory runs performed before campaign registration remain development evidence and must not later be relabelled as fresh formal campaign evidence for the unchanged behavior-configuration revision.

For nondeterministic configurations, require three fresh valid runs per fixture path inside the campaign. All attempts are evidence. Failed, awkward, or off-policy attempts must remain in the campaign history. Cherry-picked reruns do not count toward a milestone pass.

A fresh independent evidence run begins from the declared fixture checkpoint or initial-state snapshot for that path. It must not inherit semantic state, candidate state, active trial state, outcome state, or model response artifacts produced by another independent evidence run unless the fixture explicitly defines a named longitudinal branch. Nondeterministic repeated runs must not reuse cached model or cognitive outputs in a way that converts them into deterministic replay. Deterministic replay runs are classified separately.

Once a formal campaign begins for a behavior-configuration revision, its mandatory valid runs form the evidence set for that campaign. A failed campaign cannot be made passing by registering another campaign under the same materially unchanged behavior configuration and waiting for a favorable run set.

An observed hard-invariant failure in a valid formal run prevents that exact behavior-configuration revision from supporting the bounded milestone pass. A new eligible campaign requires an attributable behavior-affecting configuration revision, or an accepted evaluation-policy or oracle correction showing that the earlier run was invalidly scored.

An oracle or evaluation-policy correction does not erase the original run classification from campaign history. Reclassification must be represented as a superseding evaluation decision that records affected run IDs, previous classification, corrected classification, the exact oracle or policy defect, evidence that the defect rather than undesirable SUT output caused the original classification, the decision authority accepting the correction, and affected campaigns or claims requiring re-evaluation. Changing the expected semantic outcome because the SUT fails is a contract change, not an oracle correction, and requires the corresponding ADR, baseline, or register re-triage.

A deterministic replayable configuration may use one recorded run per fixture path only when deterministic replayability of the material inspected state is established by an inspectable mechanism guarantee or replay verification required by the evaluation policy. Merely supplying a seed, setting low temperature, or labelling the configuration deterministic is insufficient. The required reproduction target is oracle-material state equivalence, not bit-for-bit text equality unless the oracle later requires exact equality.

Any material behavior-affecting change capable of altering evaluated obligations, hard invariants, or oracle-visible state ends the current campaign for that behavior-configuration revision. Subsequent formal evidence must be bound to a new configuration revision or accepted configuration identity. This applies whether the change is described as a fix, optimization, refactor, prompt change, model change, context-policy change, or runtime change.

Campaign identity binds both the tested behavior configuration and the evaluation configuration. A material change to fixture paths, context-bundle policy, branch policy, oracle semantics, run-validity criteria, invalid-run replacement policy, or run-selection policy also ends or supersedes the campaign, even when the SUT behavior configuration is unchanged.

Decision B defines only the minimum identifiers required to bind a formal campaign to the tested behavior configuration and evaluation configuration. It does not resolve `EVAL-004`, which will decide the full evaluation-record metadata, fingerprinting, and behavior-configuration comparison contract.

### Campaign And Claim-Class Aggregation

A hard-invariant failure in any valid mandatory run globally disqualifies that behavior-configuration revision from the bounded first-milestone pass governed by this ADR.

Positive obligations aggregate by pre-registered claim class. A claim class is evidence-eligible only when every mandatory valid run on every fixture path required for that claim class is `PASS`. An `OBLIGATION_FAIL` fails the affected claim class, but it need not invalidate unrelated claim classes whose required paths all pass.

`SLICE-005` later decides which evidence-eligible claim classes are jointly required for milestone completion.

### Evaluation Outcomes

Formal run classification distinguishes:

- `PASS`: a valid scored run satisfies all hard invariants and path-specific positive obligations.
- `HARD_FAIL`: a valid scored run violates a hard SUT invariant.
- `OBLIGATION_FAIL`: a valid scored run avoids hard-invariant failure but fails a path-specific required capability or positive obligation.
- `INVALID_UNSCORABLE`: a declared harness, fixture, oracle, or infrastructure integrity condition prevents the intended SUT behavior from being evaluated.

`INVALID_UNSCORABLE` is not a SUT pass and is not automatically a SUT hard fail. The invalidity reason must be recorded, the invalidity criterion must be pre-registered or independently inspectable, replacement policy must be predetermined, and the invalid attempt must remain in campaign history. Once a material SUT semantic output relevant to an obligation has been observed, the run cannot be retroactively classified invalid solely because the output was awkward, incorrect, or off-policy.

The invalid-run replacement policy must include a stop, review, or campaign-invalidity condition for repeated or materially concentrated `INVALID_UNSCORABLE` outcomes. Unlimited replacement until the planned number of valid runs appears is not allowed. Repeated invalid outcomes may invalidate or suspend the campaign when they undermine confidence that valid runs are being selected through the pre-registered run-selection policy rather than surviving a biased failure process.

Claim-boundary violations are artifact-level outcomes, not run outcomes. They do not retroactively change historical run classification. If the SUT itself creates unsupported semantic state or a user-facing claim that crosses the bounded claim boundary during the run, that is a SUT hard-invariant failure. If a later evidence artifact, report, README, or milestone claim asserts more than campaign evidence supports, that later artifact is `CLAIM_INVALID`.

### Allowed Variance

Allowed variance includes:

- natural-language wording;
- exact tutoring phrasing or drill realization supplied by simulated dependencies;
- asking a clarifying question where the fixture path and oracle permit it;
- withholding, deferring, narrowing, or asking for more evidence where the accepted contracts and path-specific oracle permit that disposition;
- schema-neutral representation differences where the required inspection fields are present.

A disposition is allowed variance only when the fixture facts and path-specific oracle make that disposition semantically valid. The variance allowance does not waive the positive capability obligation associated with a fixture path.

Variance is not allowed to change semantic status, activation authority, transition ordering, scope, retention basis, lineage, outcome attribution, claim boundary, or campaign validity.

## Hard Failures

Any valid hard-invariant failure fails the run and prevents the behavior-configuration revision from supporting a bounded milestone pass.

Hard SUT invariant failures are:

- user assertions, observations, inferences, preferences, outcomes, and adaptations become semantically indistinguishable, or the effective state lacks sufficient role or status information to preserve the required distinctions;
- prior evidence ineligible for current-authority use under `ADR-003` Decision B is treated as independently current-authoritative, or current corroboration silently refreshes or re-dates the historical evidence itself;
- recognition and production evidence collapse into one scalar skill or proficiency claim;
- candidate, activation-basis assessment, active-trial state, and later-use applicability are not inspectably distinct;
- where the selected activation basis requires a candidate-bound proposal and user response, proposal, response binding, and activation are not inspectably distinct;
- a proposal-required trial activates using an unbound, ambiguous, fixed, or silently corrective user response rather than a response attributable to the actual surfaced candidate-bound proposal;
- a non-active trial candidate or proposal influences trial-driven later behavior before active transition;
- a trial activates without satisfied scope, basis-lineage, stale-basis, user-constraint, reversibility, consequence, applicability, retention, and non-adaptation checks;
- later behavior is selected after outcome evidence, or from harness-reconstructed state rather than retained active trial state;
- outcome evidence is promoted to proof of the untested causal theory, or otherwise given unsupported causal certainty;
- direct correction, explicit drill preference, future scoped trial, and durable adaptation are conflated;
- the SUT creates a global learning style, identity trait, broad cross-surface correction rule, durable developmental adaptation, or unsupported semantic state or user-facing claim that treats synthetic fixture retention as real personal memory or Zoey continuity, supplied surface labels as evidence of real voice behavior, simulated tutoring realization as evidence of Japanese pedagogical efficacy, or the bounded milestone as a full `SCN-001` pass;
- final explanation fabricates, contradicts, or claims support not present in retained inspected state.

Positive-obligation failures are distinct from hard-invariant failures. Examples include never forming an evidence-responsive trial on a sufficient-evidence canonical path, failing to let a retained active trial influence later behavior when applicable, discarding all applicable intervention-conditioned outcomes or refusing to let any such outcome update selected trial evidence where the fixture path requires that capability, failing to provide required explanation support without fabricating a claim, or permanently abstaining from all selected-slice trial behavior where the path requires a demonstration. Such failures do not require forbidden state creation, but they still prevent the affected campaign or claim class from passing.

Fixture or oracle validity failures are also distinct. Examples include the harness supplying "current skill" as an answer, reconstructing a lost retained trial, loading the wrong fixture version, corrupting input, failing before required input delivery, or an oracle scoring self-report instead of exposed effective state.

## Claims Enabled And Excluded

If later artifacts provide sufficient fixture, oracle, and acceptance-gate detail, this policy may support a bounded claim:

Under synthetic `SCN-001` fixture context, the tested behavior configuration can transition selected semantic state across interactions and expose enough effective state for oracle inspection.

The three-run policy is a first-milestone repeatability and anti-single-demo gate. It does not establish a failure rate, confidence interval, statistical reliability estimate, production readiness, or general robustness.

This policy does not support claims about:

- retrieval quality;
- open-ended context discovery;
- production memory architecture;
- sensitivity-aware context assembly;
- full `SCN-001` pass;
- statistical reliability or production readiness;
- longitudinal drift handling;
- durable developmental adaptation;
- real personal continuity;
- real voice or avatar behavior;
- Japanese pedagogy quality.

SUT context discovery and bounded hybrid discovery are deferred. They may enable stronger context-selection claims in a later milestone, but they require distractor design, retrieval oracle design, permission and sensitivity handling, and failure attribution policy that are intentionally outside this first semantic-transition milestone.

## Downstream Contract For EVAL-002

`EVAL-002` may begin fixture and oracle design after this ADR is accepted. It must preserve:

- the context responsibility table, including harness-supplied fixture roles versus SUT-owned semantic judgments;
- the state-origin rule prohibiting harness reconstruction of SUT-owned retained semantic state;
- the claim boundary excluding retrieval and context-assembly evidence;
- context completeness declarations and anti-adaptive-rescue bundle policy;
- claim-class-specific paired counterfactual coverage;
- formal campaign pre-registration, outcome-independent run selection, fresh-run isolation, run-validity criteria, replacement policy, campaign-integrity review, and no optional stopping under the same materially unchanged behavior configuration and evaluation configuration;
- campaign aggregation by claim class;
- oracle or evaluation-policy correction audit requirements;
- tested behavior configuration and evaluation configuration identity;
- allowed variance, hard invariant, positive-obligation, invalid-run, and artifact-level claim-invalid classifications;
- oracle-visible fields for transition basis, attribution status, activation checks, retained state, later-use applicability, outcome lineage, and explanation support.

With those fixed, `EVAL-002` can design fixtures and oracles without deciding boundary, nondeterministic acceptance, or claim scope.

`SLICE-002` must not infer a general retrieval, memory, or context-assembly state contract from this ADR. It should preserve only the selected-slice state needed to expose the supplied-context basis, retained SUT state, and SUT-owned semantic transitions.

`SLICE-005` must phrase the first milestone acceptance gate as a curated-context semantic-transition claim with hard-invariant campaign evidence. It must reject retrieval/context-assembly claims, full `SCN-001` pass claims, statistical reliability claims, and claims based on cherry-picked nondeterministic runs, unlimited invalid-run replacement, or repeated campaigns under the same materially unchanged behavior configuration and evaluation configuration.

## Accepted Register Effect

Acceptance by the project owner updates `OPEN_QUESTIONS.md` to:

- move `EVAL-001` to `Resolved` with outcome `Decision`, resolved by this ADR's Decision A for the first `SCN-001` milestone;
- move `EVAL-003` to `Resolved` with outcome `Decision`, resolved by this ADR's Decision B for the first `SCN-001` milestone;
- activate `EVAL-002` as the next decision frontier before selected-slice state contracts or acceptance gates;
- keep `SLICE-002` and `SLICE-005` blocked until `EVAL-002` is resolved.

## Reconsideration Triggers

Reconsider Decision A, the context-boundary decision, if:

- the first milestone intends to claim retrieval, relevance selection, memory search, or active context assembly;
- `EVAL-002` cannot build fixtures without supplying semantic conclusions;
- oracle inspection cannot distinguish supplied fixture context from SUT-owned semantic transition basis;
- later implementation requires trust-boundary or sensitivity-aware context assembly before the first semantic-transition milestone can be meaningful.

Reconsider Decision B, the nondeterministic acceptance decision, if:

- hard invariant failures cannot be observed from effective state;
- formal campaign evidence is too weak to distinguish the bounded claim from cherry-picked demos;
- run-validity criteria cannot distinguish SUT semantic failure from fixture/oracle invalidity;
- run-selection policy cannot be made independent of prior known outcomes;
- deterministic replay cannot reproduce oracle-material inspected state;
- invalid-run replacement or oracle-correction policy cannot preserve campaign integrity;
- later milestone scope requires full `SCN-001` scenario acceptance, longitudinal drift evidence, production rollout criteria, or statistical reliability claims;
- behavior or evaluation configuration metadata is insufficient to bind evidence to the tested system and campaign.

Reconsider the shared claim boundary if a later milestone wants to claim full `SCN-001` pass, durable developmental adaptation, production memory architecture, real continuity, or context-discovery capability.

## Non-Scope

This ADR does not decide:

- fixture content or oracle scoring beyond policy constraints;
- final schemas;
- full behavior-configuration metadata, fingerprinting, or comparison contract;
- storage, retrieval, embeddings, summaries, adapters, or memory architecture;
- sensitivity-aware context assembly;
- trust-boundary policy for inference destinations;
- production retention policy;
- full scenario scoring;
- statistical reliability;
- longitudinal drift detection;
- durable developmental adaptation;
- real voice, avatar, Japanese pedagogy, or product UI.
