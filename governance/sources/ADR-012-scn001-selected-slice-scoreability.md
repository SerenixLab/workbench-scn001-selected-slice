# ADR-012: SCN-001 Selected-Slice Scoreability

Status: `Accepted`

Date: 2026-07-20

Accepted: 2026-07-20

Record revision: `R3`

Decision authority: project owner

Resolved question IDs: `EVAL-005`, `GROW-002`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.22`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`
- `decisions/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md` `R4`

Decision dependencies: accepted `ADR-010 R3` and `ADR-011 R3` define the
compatible behavior-identity and formal-record-authority contracts required by
this ADR.

Post-decision register state: `OPEN_QUESTIONS.md V0.2.23` records `EVAL-005`
as resolved by this ADR, `GROW-002` as resolved by its milestone-bounded
exclusion, and no accepted `ASM-*` entry.

## Decision

Define selected-slice scoreability as eligibility to make one bounded,
conjunctive, nonnumeric formal pass/fail determination under the accepted
fixture/oracle and campaign policy.

All five `ADR-005 R2` claim classes remain mandatory and non-substitutable:

1. `CC-TIME-STALE-BASIS`;
2. `CC-EVIDENCE-TRIAL-FORMATION`;
3. `CC-SCOPE-TRIAL-USE`;
4. `CC-OUTCOME-SEMANTICS`;
5. `CC-EXPLANATION-PROVENANCE`.

This ADR instantiates `ADR-004 R3` and `ADR-005 R2`. It does not redefine
`EVAL-003`, invent a weighted score, or merge validity, hard failure,
obligation result, and lifecycle into one status enum.

For this milestone, resolve `GROW-002` by a named bounded exclusion:

```text
For fixture/oracle package SCN001-SSFO-V0.2.0 and the first synthetic
selected-slice milestone, general longitudinal agreement-drift,
anti-correction-drift, and personality-drift detection are not evaluated
and cannot be claimed.
```

No working assumption supplies that missing capability.

## Scoreability Versus Other Results

Keep these determinations distinct:

```text
run validity                  -> can the intended SUT behavior be scored?
run-global invariant result   -> did a valid run violate a hard invariant?
per-claim obligation result   -> did each pressured claim class pass?
campaign lifecycle            -> is the campaign active, suspended, closed...?
bounded campaign result       -> BOUNDED_PASS, BOUNDED_FAIL,
                                 or NOT_YET_DETERMINABLE
completion determination D    -> are all ADR-009 eligibility conjuncts met?
owner disposition A           -> does the owner accept eligible D?
```

A bounded campaign pass is necessary but not sufficient for completion
eligibility. Engineering promotion, evidence-package, claim-closure, basis-
freshness, and owner-disposition requirements remain in `ADR-009 R4`.

## Inherited Orthogonal Result Domains

### Run Validity

Use exactly the accepted `ADR-005 R2` domain:

- `VALID`;
- `INVALID_UNSCORABLE`.

Invalidity is limited to declared fixture, harness, oracle, simulator, capture,
or infrastructure integrity defects that prevent evaluation of intended SUT
behavior. Awkward, wrong, evasive, off-policy, or claim-failing SUT behavior is
not invalidity.

### Run-Global Hard-Invariant Result

Use exactly:

- `INVARIANTS_CLEAR`;
- `HARD_FAIL`.

A valid hard failure is formal adverse evidence and globally disqualifies the
exact behavior fingerprint from the bounded milestone pass under `ADR-004 R3`.
It is not averaged, isolated to one class, or reset by a later favorable run or
evaluation-only change.

### Per-Claim Obligation Result

For every pre-registered path/claim-class combination, use exactly:

- `PASS`;
- `OBLIGATION_FAIL`;
- `NOT_REACHED`;
- `NOT_APPLICABLE`.

`NOT_REACHED` is non-passing for required coverage. It explains that an earlier
SUT-owned prerequisite failed; it does not turn the run invalid or satisfy the
downstream class.

`NOT_APPLICABLE` is allowed only where the authoritative `ADR-005 R2`
obligation map declares the path non-pressure for that class. It cannot be used
for a required path/claim combination or as a substitute for missing evidence.

### Lifecycle

Run-attempt and campaign lifecycle consume the accepted `EVAL-007` authority
contract. `suspended`, `authority_invalidated`, and `superseded` are lifecycle/
history meanings, not substitutes for the result domains above.

## Required Path And Claim Coverage

The complete required path set is:

- `SCN001-SSFO-V0.2.0-CANONICAL-THIN`;
- `SCN001-SSFO-V0.2.0-CF-CALIBRATION-NO-SPLIT`;
- `SCN001-SSFO-V0.2.0-CF-DRILL-OPT-IN`;
- `SCN001-SSFO-V0.2.0-CF-RECENT-BASIS`.

The authoritative path-to-claim and positive-obligation mapping remains the
`ADR-005 R2` Claim-Class Obligation Map. Every applicable package-local
positive obligation must map to at least one mandatory claim/path combination
as required by `ADR-009 R4`. An unmapped or silently omitted applicable
obligation is a contract defect, not a pass.

Canonical path evidence may support multiple classes only when each class's
distinct obligations are independently classified for every applicable formal
run. Evidence from one counterfactual cannot substitute for another claim
class's required pressure.

## Deterministic Qualification And Formal Run Count

The current workbench appears deterministic, but a label, fixed seed, or one
successful replay is insufficient.

Before a campaign uses the one-formal-run rule, an `ADR-011 R3` prospectively
anchored qualification plan allocates at least two clean independent executions
of every required path under the exact same behavior and evaluation
fingerprints. Each execution starts from the declared initial state or same-run
branch prefix and uses the planned capture/simulator pipeline. Every planned
execution and artifact remains in the sealed qualification result; an invalid,
missing, or divergent execution cannot be discarded or retried into a
qualification. `INCONCLUSIVE` and `NOT_QUALIFIED` both select the three-run
formal policy without implying SUT failure.

The evaluation configuration and qualification plan bind versioned profile
`DEQ-SCN001-V1` or an accepted successor. V1 defines:

- input closure: all required run, checkpoint, capture, simulator, retained-
  state, relation, transition, obligation, and explanation-support material;
- run-local reference normalization: replace opaque allocation IDs with
  canonical labels derived from semantic family, declared path/checkpoint,
  typed ancestry/relations, material creation order, and ordinal; ambiguous or
  non-unique mapping is a comparison failure, not benign variance;
- exact fields: reachability, validity/invariant/obligation domains, semantic
  family multiplicity, typed relations, transition ordering and envelopes,
  simulator meaning/fidelity, grammar classification, and support closure;
- the closed excluded-envelope list: UUID spelling, timestamps not used by an
  oracle, storage/custody locations, transport trace IDs, and other explicitly
  non-semantic provenance fields;
- natural-language handling: preserve the raw bytes/digest but compare only the
  exact accepted grammar classification, limitations, prohibited-claim result,
  and typed support unless the fixture declares byte-exact text material;
- raw/binary handling: compare exact byte digests for material declared byte-
  stable; otherwise retain the raw digest and compare the profile-declared
  canonical semantic projection without re-encoding the source artifact;
- mismatch classes: `VALUE_MISMATCH`, `MISSING_MEMBER`, `EXTRA_MEMBER`,
  `ORDER_MISMATCH`, `RELATION_MISMATCH`, `AMBIGUOUS_NORMALIZATION`,
  `RAW_DIGEST_MISMATCH`, and `COMPARATOR_ERROR`;
- comparator implementation fingerprint and a requirement that the distinct
  validator recompute the result from sealed raw captures rather than accept
  the producer's normalized projection.

The two executions must produce equivalent oracle-material state and evidence:

- same path/checkpoint reachability;
- same run validity and hard-invariant classification;
- same per-claim obligation vector;
- same required retained semantic families, identities relative to run-local
  allocation, typed relations, transition envelopes, and material ordering;
- same simulator request/realization meaning and fidelity classification;
- same explanation grammar classification and support closure.

Exact UUIDs, excluded timestamps, storage refs, and other profile-declared run-
local envelope identities need not be byte-equal. No implementation may add an
excluded field without a new profile/evaluation identity. Natural wording may
vary only within accepted bounded variance and must not alter oracle-material
classification.

Qualification artifacts are integrity-sealed and authority-indexed for the sole
purpose of choosing run count, but their executions remain explicitly
`development_preflight`, not formal SUT evidence, and may never be promoted into
the campaign.

The evaluation manifest owns the conditional policy. An eligible `QUALIFIED`
result selects one prospectively authorized, sealed formal run per required
path. `NOT_QUALIFIED` or `INCONCLUSIVE` selects three fresh valid formal runs per
path under `ADR-004 R3`; this means the campaign uses the conservative three-run
policy, not that the configuration has been proven intrinsically
nondeterministic. A configuration whose evaluation manifest prospectively
declares the nondeterministic branch uses three runs without a qualification
plan. The campaign authorization owns the selected count and slots, but they
must derive mechanically from this policy and the exact qualification basis.

Any later oracle-material divergence under unchanged fingerprints immediately
invalidates the qualification and suspends an active one-run campaign. The
campaign may resume only after accepted investigation and either:

- proof that the observation was not oracle-material divergence under the
  bound profile;
- accepted switch to the conservative three-run policy plus prospective
  activation of pre-authorized contingency slots sufficient to reach three
  fresh valid runs per path, counting already completed eligible formal runs;
  or
- campaign supersession when such contingency was not prospectively declared.

A valid adverse SUT output cannot be reclassified merely to preserve
deterministic qualification. Later attributable divergence produces separate
layered effects:

- an active campaign enters existing lifecycle `suspended` with reason
  `deterministic_qualification_invalidated`;
- a historical bounded result receives an immutable
  `RESULT_REEVALUATION_REQUIRED` standing record under `ADR-011 R3`;
- any dependent earlier `ELIGIBLE` completion determination becomes
  `REQUIRES_REEVALUATION` exactly as defined by `ADR-009 R4`.

No lifecycle, result-standing, or completion-determination artifact is edited,
and those three domains do not share one status enum.

## Invalid Attempts And Replacement

The campaign authorization preserves every accepted `ADR-005 R2` replacement
constraint and adds one stricter selected-slice rule. `ADR-005 R2` expressly
places the two-replacement-per-path cap on nondeterministic campaigns; this ADR
extends that same cap to deterministic campaigns so infrastructure invalidity
cannot create unlimited retries under the one-run policy. This is an
`EVAL-005` milestone instantiation, not an unaltered quotation:

- every invalid attempt remains in formal history;
- at most two invalid replacements per fixture path before campaign review,
  for deterministic and nondeterministic campaigns;
- two invalid attempts with the same root cause in one path require stop and
  review before more formal runs;
- three total invalid attempts across the campaign require suspension or an
  accepted evaluation-policy correction;
- replacement uses the same outcome-independent selection policy;
- a valid hard failure is never replaceable as invalid.

Replacement eligibility is decided from integrity evidence and pre-registered
reason codes without inspecting whether the SUT outcome would help or hurt the
campaign. Exhausted replacement budget leaves the campaign suspended or not
scoreable; it does not convert missing valid coverage into pass or SUT fail.

## Configuration Change And Campaign Disposition

Consume the accepted configuration identity/authority contracts as follows:

| Change class | Consequence |
| --- | --- |
| Annotation/storage-only change excluded from both payload and manifest assertion | No payload or manifest-assertion identity change; storage/envelope representation may differ. |
| Manifest provenance/lineage correction with unchanged payload fingerprint and changed manifest-artifact fingerprint | Same behavior/evaluation configuration payload, distinct immutable manifest artifact. Existing campaigns remain bound to the original artifact and are never silently retargeted. Review decides whether the original defect was harmless, authority-invalidating, or requires campaign supersession. |
| Behavior payload fingerprint change | New behavior configuration and campaign; prior evidence stays with the original fingerprint. |
| Evaluation payload fingerprint change | New evaluation configuration and campaign; unchanged behavior is not rehabilitated from a valid prior hard failure. |
| Same manifest ID with conflicting manifest-artifact fingerprint | Authority-closure failure; no alias selection or aggregation. |
| Fixture/oracle semantic or obligation-map change | New evaluation identity and package/ADR re-triage where required; no silent rescoring. |
| Material runtime/toolchain/environment change | New applicable behavior or evaluation identity according to ownership; unresolved ownership blocks comparison. |
| Unknown, missing, or unsupported comparison | `COMPARABILITY_UNRESOLVED`; no aggregation, evidence transfer, or compatibility claim. |

Campaign supersession preserves the earlier campaign, all attempts, outcomes,
corrections, and indexes. Repeating a failed campaign under materially unchanged
behavior/evaluation fingerprints cannot create a pass.

## Bounded Campaign Result

A campaign is ready for an authoritative bounded pass/fail only when:

- compatible accepted `EVAL-004` and `EVAL-007` contracts are in force;
- behavior/evaluation manifests and prospective campaign authorization validate;
- authority-namespace and campaign evidence indexes close the record universe;
- run selection, attempt allocation, invalidity, replacement, suspension, and
  supersession history satisfy accepted policy;
- required path/claim and obligation-map closure is complete, except that the
  explicit early global-hard-failure closure below may disposition never-started
  remaining slots without pretending their claims were reached;
- every required artifact is sealed, reference-resolvable, and within cutoff;
- the unresolved-question matrix below has no undispositioned claim-affecting
  question or undeclared working assumption;
- the exact bounded claim text and exclusion language are bound to the result.

Scoreability is materialized only through the immutable
`zoey:bounded-campaign-result:v1` artifact governed by `ADR-011 R3`. The result
consumes a previously frozen campaign index and closure namespace revision; a
later namespace revision indexes the sealed result. Missing that record means
no bounded pass/fail claim is supported and completion package `P` is
incomplete. When one or more readiness conjuncts remain unresolved, the same
artifact family may instead carry the bounded diagnostic
`NOT_YET_DETERMINABLE` under the narrower authority rules below.

Apply these result semantics:

```text
BOUNDED_PASS =
    every required valid formal run has INVARIANTS_CLEAR
    AND every required applicable path/claim result is PASS
    AND every declared non-pressure combination is exactly NOT_APPLICABLE
    AND no required combination is NOT_REACHED, NOT_APPLICABLE,
        OBLIGATION_FAIL, absent, or ambiguous
    AND all five claim classes are evidence-eligible

BOUNDED_FAIL =
    an authoritative valid HARD_FAIL exists
    OR a mandatory path/claim result is OBLIGATION_FAIL or NOT_REACHED
    OR a mandatory claim class is otherwise non-passing under complete,
       valid campaign closure

NOT_YET_DETERMINABLE =
    authority, validity, replacement, coverage, comparison, question,
    or evidence-universe closure remains unresolved
```

`NOT_YET_DETERMINABLE` may be sealed as an exact diagnostic assessment. It has
authoritative standing over its bound basis only when its own schema, producer,
exact input, effective-namespace, external-receipt, validation, and later-index
closure pass under `ADR-011 R3`. An unresolved authority namespace cannot
certify its own indeterminate assessment as authoritative.

A campaign may close as bounded failure immediately after an authoritative
valid hard failure if the pre-registered global-disqualification rule is
applied and every unused attempt is explicitly dispositioned. The only unused-
slot disposition that supports that early scoreable closure is
`CANCELLED_NOT_STARTED_GLOBAL_HARD_FAILURE`. It records the slot, campaign,
decisive run/decision reference, actor, and time and is valid only when the slot
never started and produced no material SUT output.

`NOT_STARTED_CAMPAIGN_SUPERSEDED` and
`ALLOCATION_AUTHORITY_INVALIDATED_BEFORE_START` may explain other unused slots,
but they do not support an early bounded-failure closure. A started attempt is
always indexed by its actual lifecycle/evidence and can never be represented as
unused. Otherwise, the planned attempt set must reach accepted closure;
optional stopping is forbidden.

These names define semantic outcomes, not a required single status field.
Campaign lifecycle remains separate.

## Unresolved-Question Matrix

This matrix classifies every unresolved register family that could be mistaken
for a prerequisite or silently imported into the selected claim.

| Question IDs | Disposition for this milestone | Claim effect / future trigger |
| --- | --- | --- |
| `EVAL-004`, `EVAL-007` | Blocking dependencies. | Must resolve in the same or an earlier owner decision set before this ADR becomes effective or a formal claim campaign is authorized. |
| `GROW-002` | Milestone-bounded exclusion; no fixture assumption. | General longitudinal agreement/anti-correction/personality drift is not evaluated or claimable. Later scope creates a new linked question. |
| `DEP-003` | Trigger absent; irrelevant to current run-scoped campaign. | No expiry, refresh, revocation maintenance, or background lifecycle claim. Trigger before such runtime maintenance enters the campaign. |
| `MEM-001`, `MEM-002`, `MEM-003`, `MEM-004`, `MEM-005`, `CONT-002`, `TRUST-001` | Trigger absent; outside the synthetic claim. | Fixture state is disposable evaluation state, not real personal memory or continuity. Formal evidence indexes are evaluation/governance artifacts, not SUT control-relevant derived personal state. No materially different inference trust boundary is used. Trigger before real retention, reuse, custody, or inference routing. |
| `DEP-002`, `DEP-004` | Trigger absent; outside the declared mechanism/claim. | No general non-convergence engine, component operation, or grouped workflow state is evaluated. |
| `TIME-001` | Trigger absent; outside the claim under accepted `TIME-002`. | No scheduler, TTL, due state, background clock, or full longitudinal governed-clock claim. |
| `GROW-003`, `GROW-004`, `GROW-005` | Trigger absent; outside the claim. | Configuration identity does not establish replacement continuity, continuity adoption, or durable user-facing adaptation. Trigger before using results for replacement/continuity or durable adaptation. |
| `INIT-001`, `INIT-002` | Trigger absent; outside the claim. | No proactive initiative or arbitration claim. |
| `AUTH-001`, `AUTH-002`, `AUTH-003`, `AUTH-004`, `AUTH-005`, `AUTH-006` | Trigger absent; outside the selected `SCN-001` synthetic path. | No real external operation, standing authority, operation lifecycle, or quoted-content instruction claim. |
| `SURF-001`, `SURF-002` | Trigger absent; outside the claim. | Fixture surface labels and simulated realizations do not establish a real second surface, voice contract, or voice behavior. |
| `LEG-001`, `LEG-002`, `LEG-003`, `LEG-004`, `LEG-005` | Trigger absent; outside the claim. | No legacy component is migrated, reused as authority, or needed by the formal campaign. |
| `PROD-001`, `PROD-002`, `PROD-003`, `PROD-005` | Trigger absent; outside the claim. | No user-facing workflow, memory control, presence demo, or plan promotion is evaluated. |
| `CONT-001` | Trigger absent; outside the claim. | No restore, migration, disconnection, or state-loss continuity claim. |
| `REPO-001` | Trigger absent. | Campaign artifacts remain in the governed workbench; trigger before durable `projects/` extraction. |

No `ASM-*` working assumption is accepted or required by this decision. If a
future implementation needs one, `EVAL-005` cannot be treated as resolved for
that changed basis without register re-triage and owner acceptance.

## GROW-002 Bounded Exclusion

The excluded capability is general longitudinal detection of:

- agreement drift that rewards the latest user statement regardless of retained
  contradictory evidence;
- anti-correction drift that increasingly resists or over-applies corrections
  across a longer trajectory;
- personality or global-preference drift inferred from repeated interactions.

The selected fixture still evaluates exact scoped state transition, current
correction, delayed correction, later applicability, bounded outcome, and
grounded explanation across its named synthetic chronology. That finite path is
not a general drift detector.

Allowed claim: the tested configuration passed or failed the five named claim
classes for `SCN001-SSFO-V0.2.0` under the exact formal campaign.

Forbidden claim: the tested configuration resists longitudinal agreement,
anti-correction, preference, personality, or adaptation drift in general.

If a later milestone brings that capability into scope, create a new linked
question because resolved IDs are not reopened.

## Explanation-Grammar Claim Ceiling

The finite selected-slice explanation grammar can establish only that, on the
registered paths and exact evaluation configuration:

- the emitted explanation belongs to the accepted finite semantic grammar;
- required limitations are present;
- forbidden causal, global, permanent, learning-style, efficacy, fatigue,
  focused-drill, or hidden-reasoning claims are absent within that grammar;
- typed retained-state and transition support closes under the oracle.

It does not establish safety or truthfulness for arbitrary natural-language
explanations, unseen paraphrases, other languages, production model outputs, or
unbounded conversation. The grammar revision/fingerprint is part of evaluation
identity; expanding accepted wording is an evaluation-configuration change with
new regression and campaign consequences.

## Maximum Bounded Claim

Only the form matching the actual campaign meaning may appear in the campaign-
status artifact.

For `BOUNDED_PASS`:

```text
Under synthetic SCN-001 selected-slice fixture/oracle package
SCN001-SSFO-V0.2.0, the exact declared behavior and evaluation configuration,
and the authoritative formal campaign and evidence cutoff, the tested behavior
configuration passed the conjunctive gate across the five mandatory selected-
slice claim classes.
```

For `BOUNDED_FAIL`:

```text
Under synthetic SCN-001 selected-slice fixture/oracle package
SCN001-SSFO-V0.2.0, the exact declared behavior and evaluation configuration,
and the authoritative formal campaign and evidence cutoff, the tested behavior
configuration failed the conjunctive gate across the five mandatory selected-
slice claim classes because [decisive authoritative hard failure or complete
non-passing class/path result].
```

For `NOT_YET_DETERMINABLE`:

```text
No bounded pass/fail determination is supported for the exact declared behavior
and evaluation configuration because [authority, validity, replacement,
coverage, comparison, question, or evidence-universe closure] remains
unresolved. This is campaign indeterminacy, not a SUT failure or pass.
```

The pass/fail forms append this mandatory ceiling:

```text
The result covers curated-context temporal handling, evidence-responsive trial
formation, scoped trial use, intervention-conditioned outcome semantics, and
bounded explanation provenance on the registered paths. It does not establish
full SCN-001 success, general longitudinal drift resistance, retrieval,
production memory, durable adaptation, real voice behavior, Japanese teaching
quality, statistical reliability, production readiness, or real continuity.
```

The indeterminate form instead states that any future determination would be
limited to those same registered paths and exclusions; it must not say that the
unclosed campaign already established coverage.

The bounded-result identity payload binds exact behavior/evaluation manifest
references with both payload and manifest-artifact fingerprints, the campaign-
authorization reference, frozen campaign-index reference, pre-result closure
namespace revision, external receipt, and cutoff; its envelope supplies its own
result ID/fingerprint without hashing that fingerprint into itself. Any later
claim-bearing artifact also carries the exact result reference and result-
indexing namespace revision/receipt. A bounded-
failure artifact must name the decisive hard failure or complete non-passing
class/path result. When a global hard failure ends evaluation early, it must say
that the gate requires all five classes but failed on the decisive invariant; it
must not imply every class was reached. An indeterminate artifact names the
unresolved closure and must not use `failed`, `failure artifact`, or wording
that attributes missing authority or evidence to SUT behavior.

## Cross-ADR Attack Outcomes

The three accepted contracts produce these exact dispositions:

| Attack | Required disposition |
| --- | --- |
| Evaluation-only combined-repository commit; SUT closure unchanged | Behavior fingerprint unchanged. Evaluation fingerprint changes only when the closed evaluator source/dependency/policy payload changes. A new campaign is required; prior valid behavior hard failure remains attributable. |
| Behavior-only commit; evaluator closure unchanged | Behavior fingerprint changes, evaluation fingerprint remains unchanged, and a new campaign is required. |
| Authorization/index created or published after output with backdated timestamps | Not authoritative; the run remains development evidence. |
| Qualified deterministic preflight followed by oracle-material divergence under unchanged fingerprints | Qualification invalidated; active campaign becomes `suspended` with the declared reason; prospectively declared three-run contingency or campaign supersession is required; historical result receives `RESULT_REEVALUATION_REQUIRED`; dependent eligible `D` receives `REQUIRES_REEVALUATION`. |
| Deterministic campaign has an infrastructure-invalid attempt | The attempt remains indexed; the selected-slice two-replacement cap and stop/suspension rules apply without converting invalidity into SUT failure. |
| All observed runs pass but required simulator/evidence closure is unresolvable | `NOT_YET_DETERMINABLE`, never `BOUNDED_PASS` or `BOUNDED_FAIL`. |
| Valid behavior hard failure followed by evaluation correction/change | A different evaluation identity alone cannot rehabilitate the behavior. Reclassification requires proof of oracle/policy defect, independent review, project-owner acceptance, and preserved original history. |
| Two authority-namespace forks | No effective evidence universe until outcome-independent reconciliation includes both complete histories, passes independent review, and receives project-owner acceptance. |
| Behavior/evaluation payload unchanged but manifest provenance corrected | Same configuration payload, new immutable manifest artifact; existing campaign remains bound to the original. Authority review decides whether the original provenance defect invalidates authority. |
| Qualification is `NOT_QUALIFIED` but authorization selects one run per path | Authorization-closure failure before execution. |
| Qualification result is sealed but absent from the authorizing namespace revision | Ineligible run-count basis; authorization rejected before execution. |
| All run records and campaign index exist but no bounded-result record exists | No bounded pass/fail claim; completion package `P` is incomplete. |
| Campaign index includes the result that consumes that same index, or result cites its later indexing revision | Self-certifying closure failure. |
| Same manifest ID has different manifest-artifact fingerprints | Authority-closure failure; no favorable alias selection. |
| Obligation map declares a combination non-pressure; it is `NOT_APPLICABLE` and all required applicable combinations pass | Eligible for `BOUNDED_PASS` if every other conjunct closes. |
| Anchor event ID exists but receipt bytes/digest/custody are missing | Authority closure fails; event naming alone is insufficient. |

## Adversarial Review Requirements

Before acceptance or implementation, reviewers must reject a design that:

- creates one flat enum mixing validity, hard failure, claim result, and
  lifecycle;
- treats `NOT_REACHED`, `NOT_APPLICABLE`, invalidity, suspension, or
  supersession as pass;
- rejects legitimate `NOT_APPLICABLE` on a declared non-pressure combination or
  permits it on a required applicable combination;
- averages, weights, votes, or substitutes among the five mandatory classes;
- substitutes one counterfactual path for another class's required pressure;
- claims determinism from a label, fixed seed, or one replay;
- normalizes run-local references through counts, suffixes, insertion order, or
  another undeclared comparator instead of the bound equivalence profile;
- retries or selectively omits qualification executions until two agree;
- promotes deterministic preflight artifacts into formal evidence;
- continues a one-run campaign after material deterministic divergence without
  suspension and prospective three-run contingency or supersession;
- treats conservative three-run policy selection as proof that the configuration
  is intrinsically nondeterministic;
- replaces invalid attempts after inspecting whether the SUT outcome was
  favorable;
- exceeds accepted invalid replacement limits or silently discards attempts;
- describes missing authority/evidence closure as bounded SUT failure;
- emits a bounded pass/fail claim without the sealed and later-indexed bounded-
  result record;
- creates a result/index dependency cycle or changes historical result standing
  in place;
- closes early after a hard failure while hiding a started attempt behind an
  unused-slot disposition;
- changes evaluation configuration to reset an unchanged behavior failure;
- treats configuration fingerprints as semantic continuity or replacement
  evidence under `GROW-003`/`GROW-004`;
- represents `GROW-002` as a fixture assumption or claims general drift
  resistance from the bounded trajectory;
- treats finite grammar success as arbitrary-language safety;
- calls a campaign pass milestone completion or owner acceptance;
- begins Phase 7 formal claim implementation before all three active evaluation
  decisions and current governance/review gates resolve.

## Consequences

Positive consequences:

- the milestone has a deterministic, conjunctive, nonnumeric result;
- every bounded result has a non-circular immutable authority artifact distinct
  from completion eligibility and owner acceptance;
- accepted run semantics remain orthogonal and diagnostically useful;
- deterministic economy is allowed only after explicit reproducibility proof;
- every unresolved question has an explicit claim disposition;
- `GROW-002` cannot be silently overclaimed;
- explanation evidence remains bounded to what the finite oracle can test.

Costs and limitations:

- deterministic preflight requires at least eight non-formal path executions;
- all four required paths and five claim classes must either complete their
  required evaluation closure or receive the sole permitted never-started
  disposition after an authoritative global hard failure;
- unresolved record authority, missing evidence, or exhausted invalidity budget
  prevents a result rather than producing a convenient fail/pass;
- the result is not statistical reliability, production readiness, or full
  scenario acceptance.

## Acceptance Effect

Dependency order is `ADR-010 R3` then `ADR-011 R3` then `ADR-012 R3`. The owner
accepted them in one coordinated decision set on 2026-07-20. Each contract
became effective only after its earlier compatible dependencies in that order.

The project owner accepted this exact revision on 2026-07-20 after accepting the
compatible `EVAL-004` and `EVAL-007` decisions. Therefore:

- `EVAL-005` is `Resolved` with outcome `Decision` for the first synthetic
  selected-slice milestone;
- `GROW-002` is `Resolved` with outcome `Bounded exclusion` for
  `SCN001-SSFO-V0.2.0`, with a future linked-question trigger;
- no `ASM-*` entry is created;
- `OPEN_QUESTIONS.md V0.2.23` records both resolved tombstones and the dependent
  question/claim re-triage;
- engineering standard/profile sources must be re-triaged and projected;
- Phase 7 may implement the accepted formal campaign/scoreability contract only
  after current workbench review and governance promotion controls are
  satisfied.

Acceptance does not itself declare the workbench behavior compatible, authorize
or run a campaign, create formal evidence, produce completion package `P`,
determine `D`, record owner disposition `A`, or complete the milestone.

## Reconsideration Triggers

Reconsider this decision if:

- deterministic preflight cannot establish oracle-material equivalence;
- the accepted fixture/oracle package changes its path, claim, obligation, or
  invalidity semantics;
- a later milestone requires statistical reliability, full `SCN-001`, general
  longitudinal drift, retrieval, real personal continuity, production memory,
  durable adaptation, real voice, pedagogy quality, or production readiness;
- a new unresolved question materially affects a required obligation or claim;
- the finite explanation grammar cannot represent the bounded supported
  explanations without hiding material variance.

## Non-Decisions

This ADR does not decide:

- behavior/evaluation manifest schemas or record authority beyond consuming
  accepted `EVAL-004` and `EVAL-007` contracts;
- new run validity, hard-invariant, obligation, invalidity, replacement, or
  selection semantics outside `ADR-004 R3` and `ADR-005 R2`;
- completion package `P`, determination `D`, owner disposition `A`, or current
  post-acceptance claim standing beyond `ADR-009 R4`;
- statistical thresholds, confidence intervals, production rollout, real
  memory, retrieval, voice, avatar, Japanese pedagogy, durable adaptation,
  trust-boundary architecture, or repository extraction.
