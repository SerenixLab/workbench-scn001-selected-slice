# ADR-009: SCN-001 First Selected-Slice Milestone Completion Gate

Status: `Accepted`

Date: 2026-07-10

Accepted: 2026-07-10

Record revision: `R4`

Decision authority: project owner

Resolved question IDs: `SLICE-005`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.19`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-003-scn001-selected-slice-trial-time-contract.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`
- `decisions/ADR-006-scn001-selected-slice-state-contract.md` `R2`
- `decisions/ADR-007-scn001-selected-slice-dependency-identity.md` `R3`
- `decisions/ADR-008-scn001-selected-slice-internal-boundary.md` `R2`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.20` records
`SLICE-005` as resolved by this ADR for the first synthetic `SCN-001`
selected-slice workbench milestone, records the all-five conjunctive
`P -> D -> A` completion contract, leaves `EVAL-004` and `EVAL-005` deferred
until their concrete triggers occur, keeps `DEP-003` open and non-active, and
returns the current implementation frontier to governed selected-slice work
with no active blocking question.

## Decision

For the first synthetic `SCN-001` selected-slice workbench milestone, use a
conjunctive completion gate. All five claim classes defined by `ADR-005 R2`
are mandatory and non-substitutable obligation domains:

1. `CC-TIME-STALE-BASIS`;
2. `CC-EVIDENCE-TRIAL-FORMATION`;
3. `CC-SCOPE-TRIAL-USE`;
4. `CC-OUTCOME-SEMANTICS`;
5. `CC-EXPLANATION-PROVENANCE`.

Milestone eligibility is decided through an exact completion-eligibility
determination. Eligibility is a property of that determination's bound basis;
it is not an intrinsic lifecycle status of a behavior-configuration revision,
formal campaign, evidence package, or report considered alone.

A completion-eligibility determination is `ELIGIBLE` only when every mandatory
claim class is evidence-eligible under the accepted formal campaign policy,
the mandatory obligation map is complete, the applicable formal-campaign
integrity and configuration-history conditions are satisfied against an
inspectable formal-evidence universe and evidence cutoff, every applicable
engineering promotion and claim-support gate is satisfied, the required
evidence package is complete without post-hoc repair or unresolved material
contradiction, and the exact bounded completion claim has passed the
claim-closure gate defined by this ADR.

The milestone becomes historically `milestone_complete` for the exact accepted
completion determination only when the project owner explicitly accepts that
`ELIGIBLE` determination and the acceptance is recorded against the bound
determination basis and exact pre-reviewed bounded completion claim.

No weighted score, average, majority, representative subset, compensating
strength, favorable later run, or partial completion across claim classes may
produce a milestone pass. Claim-class evidence eligibility may be tracked and
reviewed independently as formal progress, but no individual class or proper
subset of classes establishes first selected-slice milestone completion.

This ADR resolves `SLICE-005`. It defines the completion contract; it does
not declare that any implementation, behavior configuration, campaign,
completion determination, or milestone has already passed or been accepted.

## Why All Five Claim Classes Are Mandatory

`ADR-005 R2` deliberately leaves joint milestone completion to `SLICE-005`.
The five classes are mandatory because omission of any one permits a materially
false bounded completion claim even when the remaining classes pass.

| Omitted claim class | False completion still possible |
| --- | --- |
| `CC-TIME-STALE-BASIS` | The SUT can mishandle old versus recent evidence, treat stale history as independently current-authoritative, or refresh historical basis while still succeeding on downstream fixture transitions. |
| `CC-EVIDENCE-TRIAL-FORMATION` | The SUT can select the production-focused trial from path position, stale history, fixture structure, or hardcoding instead of responding to current dimension-specific evidence. |
| `CC-SCOPE-TRIAL-USE` | The SUT can form a plausible trial but overgeneralize correction behavior across focused drill and spontaneous-production contexts or ignore applicable user-governed constraints. |
| `CC-OUTCOME-SEMANTICS` | The SUT can realize plausible behavior while discarding intervention-conditioned outcomes or promoting observed effects into unsupported causal or long-term efficacy claims. |
| `CC-EXPLANATION-PROVENANCE` | The SUT can reach plausible behavior while generating an unsupported retrospective explanation not grounded in retained state and contemporaneous transition basis. |

The classes are therefore non-substitutable obligation domains. They are not
assumed statistically independent or causally isolated. Shared runs and
upstream/downstream dependencies remain governed by `ADR-004 R3` and
`ADR-005 R2`; conjunctive completion means only that failure or absence in one
mandatory domain cannot be compensated by strength in another.

## Completion State Model

### Completion Determination Identity And Bound Basis

A completion-eligibility determination is an attributable evaluation/governance
result over one exact bound completion basis.

Conceptually:

```text
completion basis D =
    behavior-configuration identity
    + evaluation-configuration identity
    + formal-evidence universe / record-authority identity
    + evidence cutoff or equivalent completeness boundary
    + accepted EVAL-004 and EVAL-005 bases
    + engineering-governance basis
    + completion evidence package identity
    + exact proposed bounded completion claim identity
```

The exact record schema, fingerprints, serialization, and identity mechanics
remain reserved to `EVAL-004`, `EVAL-005`, and any separately required linked
evaluation-governance decision. This ADR requires the basis components and
their lifecycle semantics; it does not prescribe their storage representation.

### Completion Artifact Dependency Direction

The completion artifacts have one semantic dependency direction:

```text
completion evidence package P
        |
        v
completion-eligibility determination D
        |
        v
project-owner disposition A
```

`P` is the frozen evidence subject. `D` references and evaluates `P` together
with the other bound completion-basis components and records the eligibility
result. `A` references `D`, performs the acceptance-time basis-freshness control
required by this ADR, and records the project-owner disposition.

The completion evidence package must not use the identity or result of `D`, the
owner disposition `A`, or a later post-acceptance claim-standing disposition as
evidence that the package is complete or that any eligibility conjunct passes.
The eligibility-conjunct result belongs to `D`, not to `P`.

A convenience review, archive, or transport bundle may contain or reference
`P`, `D`, `A`, and later claim-standing records. The identity of that enclosing
bundle is not part of `D`'s completion basis merely because it carries those
artifacts. If a later contract separately makes the enclosing bundle itself a
bound completion-basis artifact, that is a new artifact dependency and must not
recreate a recursive `P -> D -> P` or equivalent self-certifying closure.

A behavior-configuration revision may therefore participate in more than one
completion determination. For example, one evidence package or claim artifact
may be insufficient while a corrected package or claim over the same unchanged
behavior and evaluation evidence supports a later eligible determination.
Correcting a report does not retroactively change SUT behavior; changing the
completion basis creates or supersedes the corresponding completion
determination.

An unreferenced `completion_eligible = true` assertion, SUT-authored milestone
status, package-generator self-description, or owner assumption is
insufficient. The determination must identify its exact bound basis, preserve
inspectable support for every conjunct below, identify the evaluation or
governance-side actor or mechanism that produced the determination, and record
its result and unresolved blockers.

### Completion Predicate

For an exact completion determination `D`:

```text
completion_eligible(D) =
    all mandatory claim classes evidence-eligible under D
    AND mandatory positive-obligation map closure satisfied under D
    AND no unresolved disqualifying hard-invariant failure in the applicable
        valid formal-evidence universe bound to D
    AND complete mandatory path and run coverage
    AND formal campaign integrity and configuration-history closure satisfied
    AND run-selection independence closure satisfied
    AND run-validity, replacement, stop, suspension, and supersession handling
        resolved under the accepted policy
    AND applicable engineering promotion enforcement satisfied
    AND applicable engineering promotion integration verified
    AND applicable engineering claim-support enforcement satisfied
    AND required completion evidence package complete, reference-resolvable,
        and free of unresolved material contradiction across required records
    AND evidence-package assembly has not repaired missing SUT-owned evidence
    AND exact bounded claim-closure gate passed

historical_milestone_completion(D) =
    completion_eligible(D)
    AND effective project-owner disposition for D is ACCEPTED
    AND accepted claim identity exactly matches the pre-reviewed bounded claim
```

A determination may have the semantic result `ELIGIBLE` or `INELIGIBLE`. A
previously evaluated determination may also become `REQUIRES_REEVALUATION` when
a material dependency changes before owner acceptance, or `SUPERSEDED` when a
later determination replaces it. These names define semantic distinctions, not
a required implementation enum.

Failure or absence of any eligibility conjunct leaves completion unsupported.
Owner acceptance is not a substitute for eligibility. Implementation progress,
passing development tests, passing engineering conformance gates, oracle
success, claim-class eligibility, evidence-package assembly, and owner approval
are each insufficient alone.

An `ELIGIBLE` determination may await owner disposition. It does not establish
historical milestone completion until accepted. The owner may defer or reject
an eligible determination, but may not convert an ineligible or
`REQUIRES_REEVALUATION` determination into completion by waiving an accepted
semantic, campaign-integrity, claim-support, or mandatory evidence obligation.

Historical owner acceptance and the current supportability of the bounded
completion claim are distinct. Post-acceptance claim standing is governed by
the dedicated section below.

## Mandatory Claim-Class Gate

The authoritative path, obligation, checkpoint, and missing-prerequisite
mapping remains the `ADR-005 R2` claim-class obligation map.

Path names in the table below are local suffixes under fixture/oracle package
`SCN001-SSFO-V0.2.0`. The package-scoped path identity remains authoritative.

| Mandatory claim class | Complete required path set | Completion condition |
| --- | --- | --- |
| `CC-TIME-STALE-BASIS` | `CANONICAL-THIN` and `CF-RECENT-BASIS` | Every mandatory valid formal run on both paths satisfies every applicable time/stale-basis positive obligation. |
| `CC-EVIDENCE-TRIAL-FORMATION` | `CANONICAL-THIN` and `CF-CALIBRATION-NO-SPLIT` | Every mandatory valid formal run on both paths satisfies every applicable attribution, comparison, formation, proposal, response-binding, and activation positive obligation. |
| `CC-SCOPE-TRIAL-USE` | `CANONICAL-THIN` and `CF-DRILL-OPT-IN` | Every mandatory valid formal run on both paths satisfies every applicable drill, direct-correction, delayed-trial, activation, and later-use scope positive obligation. |
| `CC-OUTCOME-SEMANTICS` | `CANONICAL-THIN` | Every mandatory valid formal run satisfies the applicable intervention-conditioned outcome, realization, context-lineage, and uncertainty positive obligations. |
| `CC-EXPLANATION-PROVENANCE` | `CANONICAL-THIN` | Every mandatory valid formal run satisfies the applicable retained-state, transition-basis, uncertainty, and bounded-explanation positive obligations. |

A claim class is evidence-eligible only when every mandatory valid formal run
on every path required for that class is `PASS` under `ADR-004 R3` and
`ADR-005 R2`. A `NOT_REACHED` result is non-passing for required coverage. An
upstream failure may explain why a downstream obligation was not reached, but
it does not satisfy or waive that downstream mandatory claim class.

### Mandatory Obligation-Map Closure

Conjunctive completion across five classes is sufficient only if the
package-local positive-obligation catalogue and authoritative claim-class
obligation map are closed for the bounded milestone.

For `SCN001-SSFO-V0.2.0`, every applicable positive-obligation ID in the
`ADR-005 R2` package-local Positive Obligations catalogue must be assigned by
the authoritative `ADR-005 R2` Claim-Class Obligation Map to at least one
mandatory claim class. An obligation may appear in more than one class/path
where the authoritative map explicitly does so; that is not ambiguity when the
map's class/path aggregation semantics remain inspectable.

An applicable package-local positive obligation that is unmapped, silently
omitted from the authoritative map, or represented in a way that leaves its
class/path aggregation unresolved is an evaluation/completion-contract defect.
It prevents eligibility until the fixture/oracle contract is corrected or
superseded through the accepted decision process.

Separately, if an accepted governing selected-slice source introduces or
reveals a required positive capability obligation that is not represented in
the authoritative package-local Positive Obligations catalogue, the
fixture/oracle contract is incomplete for completion purposes. The project must
correct or supersede the fixture/oracle contract before eligibility. ADR-009
does not turn every normative sentence in ADR-002 through ADR-008 into a new
implicit `OBL-*` item; it requires the accepted fixture/oracle capability-
obligation catalogue to remain complete against the selected-slice sources it
claims to evaluate.

Evidence from a path required by one claim class cannot substitute for a
different required path or claim class. Additional exploratory, development,
optional, or non-mandatory runs cannot compensate for a failed or missing
mandatory formal run.

Claim-class evidence eligibility may be preserved as diagnostic and formal
progress state. Such partial state does not create a partial milestone pass or
an incremental completion percentage.

## Formal Run And Campaign Requirements

The formal campaign and run-selection rules remain those accepted in
`ADR-004 R3` and concretized by `ADR-005 R2`:

- nondeterministic configurations require three fresh valid runs per required
  fixture path;
- deterministic configurations may use one recorded run per required path
  only when oracle-material replayability is established by the accepted
  mechanism or verification requirement;
- run selection is outcome-independent and fixed before formal outcomes are
  observed;
- all formal attempts remain attributable in campaign history as required by
  the accepted validity and replacement policy;
- independent evidence runs begin from the declared fixture checkpoint or
  initial state and do not inherit semantic state or behavior artifacts from
  another independent run;
- campaign identity binds the behavior configuration and evaluation
  configuration;
- material behavior-affecting or evaluation-affecting changes require a new
  eligible revision, identity, or superseding campaign under the accepted
  configuration-identity rules;
- optional stopping, cherry-picked reruns, favorable-seed selection, unlimited
  invalid-run replacement, and repeated campaigns under the same materially
  unchanged failed behavior configuration cannot establish completion.

A material evaluation-configuration change ends or supersedes the affected
campaign as required by `ADR-004 R3`. Evaluation-configuration change alone
does not rehabilitate a behavior-configuration revision already disqualified
by valid formal evidence. Rehabilitation requires an attributable materially
behavior-affecting configuration revision or an accepted oracle/evaluation-
policy correction showing that the earlier evidence was invalidly scored under
the correction conditions accepted by `ADR-004 R3`.

The complete required run set is the union of the mandatory valid formal runs
for every path required by all five mandatory claim classes. Shared canonical
path runs may support multiple classes only when each class's distinct
obligations are independently evaluated and pass for every applicable run.

### Run-Selection Independence Closure

Completion eligibility must preserve ADR-004's outcome-independent run-
selection rule against both prior formal outcomes and prior exploratory or
development outcome knowledge for the same behavior-configuration revision.

The completion basis must include the selection-independence evidence required
by the accepted evaluation-record contract, including the disposition of known
prior outcomes, seeds, replay handles, cached realizations, candidate pools, or
other observed run material capable of influencing the formal run-selection or
seed-selection method or the universe from which formal runs are chosen.

For example, exploring many seeds, selecting a favorable seed pool from the
observed outcomes, and then pre-registering random selection only within that
favorable pool is not outcome-independent formal selection.

Exploratory runs do not become formal campaign evidence merely because their
outcome knowledge must be dispositioned for selection independence. The
closure obligation is to show that known exploratory or formal outcomes did
not determine the formal selection method or candidate universe in a way
forbidden by `ADR-004 R3`.

## Formal Campaign Integrity And Configuration-History Closure

Completion eligibility is not established by presenting only the latest or
most favorable campaign or by asserting that no other campaign is personally
known to the package assembler or reviewer.

### Formal-Evidence Universe And Evidence Cutoff

Every completion determination must identify the formal-evidence universe,
record authority, manifest, or equivalent accepted completeness basis against
which formal configuration history is evaluated. It must also identify an
evidence cutoff or equivalent resolvable completeness boundary within that
universe.

The cutoff is not merely a date. It must identify an inspectable record boundary
or snapshot basis sufficient under the accepted evaluation-record contract to
determine which formal campaign, run, correction, reclassification, and
supersession records are within the determination's evidence basis.

This ADR does not require a database, central service, append-only log, or one
specific registry mechanism. The accepted `EVAL-004` record contract or a
separately accepted linked evaluation-governance decision must make the formal-
evidence universe, record attribution, and completeness basis inspectable. If
`EVAL-004` cannot do so without materially broadening its registered decision
target, the register must create or activate the required linked question
before a completion determination may become eligible.

A self-authored statement such as "all campaigns I know about are included" is
insufficient. If the accepted record authority or completeness basis cannot
establish the relevant formal-evidence universe for the tested behavior-
configuration identity, configuration-history closure is unsupported.

### Configuration-History Closure

Against the bound formal-evidence universe and cutoff, the completion evidence
package must include or stably reference every formal campaign, formal run,
supersession, material-change decision, oracle/evaluation-policy correction,
and campaign failure attributable to the tested behavior-configuration
identity under the accepted `EVAL-004` identity and comparison contract and
material to whether that revision may support the bounded milestone claim.

At minimum:

- a failed campaign cannot be omitted merely because a later campaign passed;
- a valid formal hard-invariant failure cannot be hidden by describing the run
  as optional, additional, non-mandatory, awkward, off-policy, or outside the
  final campaign after the formal outcome was observed;
- a later campaign under the same materially unchanged behavior configuration
  cannot reset failed-campaign history;
- a material evaluation-configuration change may require a new campaign but
  does not by itself rehabilitate the unchanged behavior configuration;
- an attributable materially behavior-affecting configuration revision may
  permit a new eligible campaign under the accepted configuration-identity
  contract;
- an accepted oracle or evaluation-policy correction may supersede a prior
  classification only through the correction history required by
  `ADR-004 R3`;
- uncertainty about whether an earlier formal campaign or run belongs to the
  tested behavior-configuration identity prevents eligibility until the
  accepted identity/comparison contract resolves that comparison or the
  affected evidence is otherwise validly dispositioned.

This section does not define behavior/evaluation fingerprints, equivalence
rules, record-authority mechanics, or material-change comparison algorithms.
It requires configuration-level formal-evidence history closure once the
accepted evaluation contracts make those identities, attributions, and
completeness boundaries inspectable.

## Failure Semantics

### Hard-Invariant Failure

Consistent with the formal campaign policy in `ADR-004 R3`, an observed
hard-invariant failure in a valid formal run prevents that exact behavior-
configuration revision from supporting the bounded milestone pass. The failure
is run-global and is not averaged, offset, isolated to one claim class, made
irrelevant by later favorable runs, or repaired through a new campaign under
the same materially unchanged behavior configuration.

A new eligible campaign capable of supporting completion requires an
attributable materially behavior-affecting configuration revision, or an
accepted evaluation-policy/oracle correction showing that the earlier run was
invalidly scored under the correction conditions defined by `ADR-004 R3`. A
material evaluation-configuration change alone does not rehabilitate the
unchanged behavior configuration.

### Positive-Obligation Failure

An `OBLIGATION_FAIL` blocks the affected claim class from evidence eligibility.
Because all five claim classes are mandatory for this milestone, failure of
any one class blocks the affected completion determination from eligibility.

An upstream failure producing `NOT_REACHED` for a dependent mandatory class
also blocks eligibility because required claim/path coverage is incomplete.
The distinction remains useful for diagnosis and attribution; it is not a
partial-pass mechanism.

A required positive obligation missing from the authoritative mandatory claim-
class map is not treated as passed or absent. It is an obligation-map closure
defect and blocks eligibility under the Mandatory Obligation-Map Closure rule.

### Invalid Or Unscorable Run

`INVALID_UNSCORABLE` is neither a pass nor automatically a SUT hard failure. It
may be replaced only under the pre-registered run-validity and replacement
policy accepted by `ADR-004 R3` and `ADR-005 R2`.

Every invalid attempt remains in campaign history with its declared reason and
supporting evidence. Runs must not be silently discarded, relabeled invalid
because the SUT output was undesirable, or replaced without the predetermined
limit and stop/review conditions.

Eligibility requires campaign-integrity state to be clear:

- no unresolved campaign suspension remains;
- no campaign declared invalid is used as passing evidence;
- every required stop-and-review condition has a recorded outcome;
- every invalid-run replacement complies with the accepted replacement and
  outcome-independent run-selection policy;
- every supersession or evaluation-policy/oracle correction material to the
  campaign is represented in the evidence history.

Repeated or concentrated invalidity may suspend or invalidate the campaign
rather than yielding unlimited replacement opportunities.

### Claim-Boundary Failure

A SUT-created unsupported semantic state or user-facing claim during a run is
scored under the applicable hard invariant. A later report, README, milestone
artifact, evidence package, completion claim, owner-acceptance narrative, or
other claim-bearing artifact that exceeds the accepted evidence boundary is
`CLAIM_INVALID`.

A `CLAIM_INVALID` artifact does not retroactively alter formal run outcomes,
but the affected artifact cannot support claim closure or owner acceptance
until corrected, withdrawn, or superseded with the accepted evidence history
preserved. Any corrected claim-bearing artifact must pass the applicable
claim-support and bounded claim-closure controls for its exact revision.

## Engineering Completion Gate

Milestone completion requires engineering readiness separately from behavioral
evidence eligibility.

Every completion determination must bind an exact engineering-governance basis.
That basis is the repository governance lock and canonical engineering-
governance projection governing the claim-bearing work when the completion
basis is frozen for eligibility review, including the active standard,
profiles, integrations, governing-source revisions, rule revisions, and
canonical content identities required by that governance system.

The engineering standard, active profiles, and integration contracts remain
derivative engineering-conformance artifacts. They are not added here as new
semantic Decision-Time Baselines and do not supersede the ADR/register sources
they cite.

The bound engineering-governance basis must not be an intentionally stale,
alternate, or incomplete projection selected to avoid stricter applicable
rules. Publication, activation, projection, and rule-level revalidation remain
governed by the canonical engineering-governance system. Any applicable
`revalidation-required` state unresolved for the bound completion basis
prevents eligibility.

Before a completion determination may be `ELIGIBLE`:

- the lock-declared complete conformance index must identify every active
  `ENG-*` rule in the bound governance basis and give every rule exactly one
  explicit applicability disposition;
- every applicable rule must satisfy its canonical minimum promotion
  enforcement for the relevant claim-bearing scope;
- every applicable minimum promotion integration, including `CI-required`
  enforcement, must be verified through the actual promotion mechanism rather
  than inferred from workflow text;
- every applicable minimum claim-support enforcement must be satisfied for the
  bounded completion claim and the exact claim-bearing artifacts that rely on
  that rule;
- every required local enforcement reference must resolve to inspectable
  evidence and the actual gate must run where the ledger says it runs;
- no unresolved `promotion-blocking` or `claim-blocking` failure may remain for
  the bounded completion claim;
- every active engineering exception affecting an applicable promotion-bearing
  or claim-bearing rule must be exposed in the completion package with its
  rule revision, scope, residual risk, compensating control,
  expiry/reconsideration trigger, and promotion/claim consequence;
- an engineering exception may record residual risk only under
  `ENG-BASE-EXCEPTION-001` or an accepted superseding rule; it cannot waive an
  accepted semantic obligation, convert a failed claim class into a pass, or
  create formal evidence eligibility;
- engineering conformance results must remain distinct from formal behavior
  evidence, completion eligibility, and milestone acceptance.

### Revision Scope Of Engineering Evidence

Engineering evidence has two revision scopes:

1. campaign-bearing implementation evidence must cover the exact SUT
   implementation/build and exact evaluation, harness, oracle, simulator, and
   behavior-affecting revisions used by the formal campaign;
2. evidence-subject and claim evidence must cover the exact frozen completion
   evidence package `P`, capture/reporting and governance-projection revisions,
   exact proposed bounded claim, and other claim-bearing artifacts bound to the
   completion determination.

Engineering conformance or claim-support results that are produced by
inspecting the exact frozen package `P` may be detached attestations referenced
by `D`. They need not be inserted into `P` as required contents when doing so
would change the exact package revision they attest. A conformance result over
`P` must identify the exact subject-package revision or identity it inspected;
a result over a predecessor package cannot be reused merely because a later
package added the result itself.

Campaign-bearing engineering evidence and any prerequisite engineering records
that exist before `P` is frozen may remain inside or be stably referenced by
`P`. The package-level engineering and claim-support determination over the
exact frozen `P` is an eligibility input recorded or referenced by `D`.

A post-campaign report or claim-only correction does not by itself require a
new behavioral campaign when it does not materially change the behavior or
evaluation configuration under the accepted `EVAL-004` contract. It does
change the completion basis and therefore requires a corrected or superseding
completion determination plus the applicable engineering, claim-support, and
claim-closure gates for the corrected artifact revision.

Passing the engineering completion gate does not establish behavioral
compatibility. Failure to satisfy it blocks eligibility even when all five
behavioral claim classes are otherwise evidence-eligible.

Acceptance of this ADR is expected to change the open-question and claim-
frontier basis used by some engineering rules. Updating the register after ADR
acceptance may therefore trigger canonical engineering-rule revision,
projection refresh, or source-bound `revalidation-required` states under the
engineering governance system. That revalidation is a consequence of accepting
this semantic decision and is not a prerequisite to accepting this ADR itself.
It is a prerequisite wherever the resulting engineering rules require it for a
later completion determination.

## Bounded Claim-Closure Gate

Before a completion determination may become `ELIGIBLE`, the exact proposed
bounded completion claim and every claim-bearing report, summary, or acceptance-
preparation artifact included in its bound evidence package must pass a bounded
claim-closure review.

The review must verify that:

- the proposed claim does not exceed the `ADR-005 R2` bounded claim language;
- the proposed claim does not exceed the Maximum Completion Claim in this ADR;
- the accepted `EVAL-005` scoreability, unresolved-question, and fixture-
  assumption limits are reflected in the claim;
- stronger excluded claims remain explicitly excluded where omission would
  make the package misleading;
- no unresolved `CLAIM_INVALID` artifact is relied upon by the presented
  completion claim;
- the exact claim-bearing artifact revisions satisfy applicable `ENG-CLAIM-*`
  and active-profile claim-support controls under the bound engineering-
  governance basis.

The qualifying review outcome must record:

- the exact reviewed artifact identities;
- the exact bounded completion claim identity and normative claim payload;
- the applicable claim-boundary and scoreability bases;
- the qualifying reviewer or review authority required by the bound
  engineering-governance rules;
- the review result and any unresolved limitation.

A generated claim template, SUT self-description, report-generator assertion,
or unreferenced `claim_review_passed` Boolean is insufficient. Claim closure is
a review of the exact claim-bearing artifacts and evidence boundary, not a
substitute for formal run scoring, engineering conformance, completion-
eligibility determination, or project-owner acceptance.

Before owner acceptance, the exact bounded completion claim is a pre-reviewed
inactive claim payload. Claim closure may review the payload prospectively,
including its acceptance-dependent wording and evidence ceiling, but the claim
must not be published or represented as a current completed-milestone fact
until an effective `ACCEPTED` disposition activates that exact claim identity.
A report that presents the inactive payload as already true before acceptance
is claim-bearing and is subject to the applicable `CLAIM_INVALID` controls.

The final owner disposition is not permitted to redefine the normative claim
payload after this review. Owner-disposition identity consistency is governed
by the Completion Authority And Owner Disposition section so that acceptance
does not create an infinite recursive claim-review loop.

## Evidence-Package Assembly Must Not Repair Evidence

Evidence-package assembly, normalization, completeness derivation, eligibility
determination, bounded claim review, and owner review are evaluation/governance-
side activities. They must preserve the accepted `ADR-006`, `ADR-007`, and
`ADR-008` state, dependency, contemporaneity, state-origin, and passive-
inspection boundaries.

Package assembly or eligibility derivation must not:

- mutate behavior-driving SUT state;
- create missing SUT-owned transition basis or dependency-use evidence after
  the material transition;
- manufacture missing proposal binding, applicability, realization, outcome,
  lifecycle, or explanation-support history;
- infer a missing contemporaneous relation solely because later records make
  the relation appear plausible;
- reclassify a formal run, obligation, or hard-invariant outcome except through
  the accepted oracle/evaluation-policy correction mechanisms;
- restore or recreate SUT-owned state that the accepted boundary required the
  SUT to retain.

Package completeness means that required evidence is present, validly captured,
or validly derived under accepted inspection/oracle rules. It does not
authorize retrospective reconstruction of evidence the SUT was required to
preserve contemporaneously.

A completion determination whose package appears complete or consistent only
because assembly or eligibility derivation repaired missing SUT-owned evidence
is `INELIGIBLE`.

## Required Completion Evidence Package

The completion evidence package `P` is the frozen evidence subject evaluated by
a completion determination. It must be bounded to one behavior-configuration
revision and its bound evaluation configuration. It must include, directly or
through stable inspectable references:

- the accepted `SLICE-005`, `EVAL-004`, and `EVAL-005` resolution artifacts;
- the accepted ADR and fixture/oracle baselines governing the campaign;
- the exact behavior-configuration identity, bound evaluation-configuration
  identity, and SUT implementation/build identity required by the accepted
  record contract;
- the formal-evidence universe, record authority, manifest, or equivalent
  accepted completeness basis used for configuration-history closure;
- the evidence cutoff or equivalent resolvable record boundary against which
  the package's formal-evidence closure statements were assembled;
- campaign pre-registration for the presented campaign;
- the configuration-level formal campaign lineage required by the Formal
  Campaign Integrity And Configuration-History Closure section, including
  prior failed or superseded campaigns where material;
- the complete attempt history for every campaign included in that material
  formal-evidence lineage;
- the complete mandatory run inventory for every required package-scoped path;
- run-selection independence evidence and the required disposition of prior
  formal or exploratory outcome knowledge capable of influencing the formal
  selection method or candidate universe;
- run-validity decisions, invalid-run reasons, replacement decisions,
  stop/review outcomes, campaign suspension/invalidity dispositions, and
  supersession outcomes;
- run-level hard-invariant results and claim-class positive-obligation result
  vectors;
- the authoritative `ADR-005 R2` package-local Positive Obligations catalogue,
  authoritative mandatory positive-obligation to claim-class map, and an
  obligation-map closure statement showing that every applicable package-local
  positive-obligation ID is represented by the authoritative map;
- any accepted source-contract review or fixture/oracle correction showing that
  no selected-slice positive capability obligation required for the bounded
  claim remains unrepresented in the package-local positive-obligation
  catalogue;
- checkpoint, effective-state, transition-basis, relation, realization,
  outcome, and explanation-support evidence required by `ADR-005 R2`;
- failure, correction, reclassification, supersession, and `CLAIM_INVALID`
  artifacts where applicable;
- the exact bound engineering-governance lock/projection identity;
- campaign-bearing engineering conformance evidence and prerequisite
  engineering records that exist before the package is frozen;
- every active engineering exception material to an applicable promotion-
  bearing or claim-bearing rule, with its required residual-risk and
  consequence record;
- the bounded claim-closure review record for the exact presented claim-bearing
  artifact revisions and exact proposed bounded claim identity;
- a completeness statement showing that all five mandatory claim classes,
  their complete required package-scoped path sets, and all mandatory valid
  formal runs are represented;
- a configuration-history closure statement showing that no unresolved prior
  formal campaign or valid formal hard-invariant failure attributable to the
  tested behavior-configuration identity in the bound evidence universe and
  package evidence boundary disqualifies the presented revision;
- every additional configuration-identity, comparison, scoreability,
  unresolved-question, fixture-assumption, scoring, record-authority, or
  completeness-basis artifact required to be part of the evidence subject by
  the accepted `EVAL-004`, `EVAL-005`, or separately accepted linked
  evaluation-governance contracts;
- the exact pre-reviewed inactive bounded completion claim payload and identity,
  the maximum bounded claim supported, and the stronger claims explicitly
  excluded.

`P` must not include the completion determination's identity or eligibility
result as evidence required to make `P` complete. It must not include the owner
disposition or later claim-standing result as evidence required for package
completeness. Those are downstream artifacts in the `P -> D -> A` dependency
direction.

Required package records must be reference-resolvable and free of unresolved
material contradiction under the accepted evaluation contracts. Material
contradiction includes incompatible behavior/evaluation identities,
contradictory pass and failure classifications for the same authoritative
obligation result, unresolved references required for claim support, or other
cross-record conflicts that prevent the completion predicate from being
evaluated. Reviewer disagreement alone is not automatically a record
inconsistency; it is handled through the applicable review or owner-disposition
process.

### Completion Eligibility Determination Record

The completion determination `D` evaluates the exact frozen package `P` and the
other bound completion-basis components. `D` must identify or reference:

- its own stable determination identity;
- every component of its exact bound completion basis;
- the exact frozen package `P` identity or revision evaluated;
- the exact proposed bounded completion claim identity evaluated;
- the exact package-level engineering conformance and claim-support attestations
  over `P` and the claim-bearing artifacts, including the exact subject
  revisions those attestations inspected;
- the evidence supporting every completion predicate conjunct;
- the determining evaluation or governance actor/mechanism;
- `ELIGIBLE` or `INELIGIBLE` as the determination result;
- every unresolved blocker or limitation material to eligibility;
- any earlier completion determination it explicitly supersedes.

The conjunct-by-conjunct eligibility result is part of `D`. It is not required
content of `P` and must not be used by `P` to certify its own completeness.

This section identifies evidence and determination families and their dependency
direction. It does not define the exact behavior/evaluation configuration-
record metadata, fingerprints, equivalence rules, comparison algorithm,
serialization, formal-evidence registry mechanism, scoring representation,
scoreability-disposition schema, or attestation format reserved to `EVAL-004`,
`EVAL-005`, engineering governance, or any required linked evaluation-
governance decision.

## Relationship To EVAL-004 And EVAL-005

This completion contract does not absorb or resolve `EVAL-004` or `EVAL-005`.

`EVAL-004` remains responsible for the exact behavior-configuration and
evaluation-configuration record metadata, identity, fingerprinting, and
comparison contract. It must resolve before the first formal evaluation record,
comparison, or compatibility claim is created or relied upon for milestone
completion. The configuration-history closure required by this ADR consumes
the accepted `EVAL-004` identity/comparison contract; it does not predefine it.

The formal-evidence universe and completeness basis required by this ADR must be
inspectable through the accepted evaluation-record authority. This ADR does not
assume that `EVAL-004` must create a central campaign registry. If the narrow
`EVAL-004` record contract cannot establish record attribution and the relevant
completeness boundary without materially broadening its registered decision
target, the register must create or activate a linked evaluation-governance
question before final eligibility determination. ADR-009 requires inspectable
closure; it does not silently assign an unrelated storage or registry design to
`EVAL-004`.

`EVAL-005` remains responsible for final scoring and scenario-scoreability
criteria, including which unresolved questions may be carried as bounded
fixture assumptions without strengthening the claim.

For this milestone, preparing the final completion determination is itself a
scoreability-dependent act because the project is asserting that the declared
formal evidence universe is sufficient to determine the bounded milestone
claim. Therefore preparation of the first actual completion-eligibility
determination triggers `EVAL-005`, and `EVAL-005` must resolve before that
determination may be relied upon for owner acceptance.

Acceptance of this ADR does not by itself activate `EVAL-005`; the register
trigger remains tied to preparation of scoring or scenario-scoreability
criteria and the final completion determination. An accepted `SLICE-005` gate
may define what completion requires while actual completion eligibility and
milestone acceptance remain unavailable until the separately triggered
`EVAL-004` and `EVAL-005` contracts and any required linked evaluation-
governance contract are accepted.

## Eligibility Cutoff, Re-Evaluation, And Supersession

An eligibility determination is evaluated against its declared evidence
universe, evidence cutoff or equivalent completeness boundary, evaluation
contract bases, engineering-governance basis, package identity, and proposed
bounded claim. The determination is therefore an as-of result over an exact
basis, not a timeless property of the behavior configuration.

The evidence cutoff does not authorize ignoring material adverse evidence that
enters the accepted formal-evidence universe before owner acceptance. Before an
`ELIGIBLE` determination is accepted, any material change to an eligibility
dependency requires re-evaluation or a superseding determination.

At minimum, re-evaluation is required when a material dependency review,
formal-evidence-universe comparison, accepted record update, governance update,
or other qualifying control identifies that:

- new formal evidence attributable to the tested behavior configuration has
  entered the accepted formal-evidence universe;
- an earlier formal campaign or run is newly attributed to the tested behavior
  configuration;
- a run, campaign, obligation result, oracle result, or hard-failure
  classification is materially corrected, reclassified, or superseded;
- the accepted `EVAL-004` or `EVAL-005` basis, or a linked evaluation-
  governance contract on which eligibility depends, materially changes;
- an accepted governing ADR, fixture/oracle package, thesis/scenario/state-
  control baseline, or bounded working assumption material to the completion
  claim changes, is superseded, or is invalidated;
- the bound engineering-governance basis changes in a way that affects an
  applicable promotion-bearing or claim-bearing rule, or an applicable rule
  becomes `revalidation-required`;
- an active engineering exception material to the determination expires,
  leaves scope, or reaches its reconsideration trigger;
- the formal-evidence completeness basis is found incomplete or invalid;
- the completion evidence package or exact bounded completion claim changes
  materially.

The earlier determination and its historical result remain attributable; they
are not silently rewritten. Until re-evaluation completes, the earlier
`ELIGIBLE` result is `REQUIRES_REEVALUATION` for owner-acceptance purposes and
cannot be accepted as current eligibility. A corrected or later determination
may explicitly supersede it.

No fixed time-to-live, scheduler, background monitor, or general governed-clock
machinery is required by this rule. It is an event-driven basis-validity rule.
The mandatory acceptance-time freshness control below prevents owner acceptance
from relying only on personal non-awareness of an intervening material change.

### Acceptance-Time Basis Freshness

Every `ACCEPTED` owner disposition requires an inspectable acceptance-time
basis-freshness check over the exact `ELIGIBLE` determination.

Immediately before acceptance under the applicable acceptance workflow, the
check must compare the determination's bound evidence cutoff or completeness
boundary with the current accepted formal-evidence record-authority/completeness
boundary and inspect the other material eligibility dependencies named in this
section for intervening changes. The check must record:

- the completion-determination identity reviewed;
- the current formal-evidence universe/completeness boundary against which the
  determination cutoff was compared;
- the material eligibility-dependency bases checked;
- whether a material delta or unresolved comparison exists;
- the qualifying actor or mechanism and check order/time.

A statement that the owner, package assembler, or reviewer is personally
unaware of new evidence is insufficient. If the freshness check identifies a
material delta or unresolved comparison, the determination becomes
`REQUIRES_REEVALUATION` for acceptance purposes and cannot receive an
`ACCEPTED` disposition until re-evaluated or superseded by a currently eligible
determination.

A `DEFERRED` determination may remain eligible only while its bound eligibility
basis remains materially valid. Every later attempt to move that determination
to `ACCEPTED` performs a new acceptance-time basis-freshness check; a prior
freshness result does not permanently attach to the deferred determination.

## Completion Authority And Owner Disposition

The project owner is the milestone completion authority.

Implementation completion, green engineering gates, oracle output, formal
campaign results, evidence-package assembly, claim closure, or an eligibility
mechanism do not autonomously establish historical milestone completion. The
owner must review the exact completion determination and its bounded evidence
package and record one of the following dispositions against the determination
identity:

- `ACCEPTED`: the determination is currently `ELIGIBLE`, the required
  acceptance-time basis-freshness check is clear, the owner accepts the exact
  pre-reviewed bounded completion claim, and historical milestone completion is
  established for that determination;
- `DEFERRED`: the owner does not yet accept completion. The determination may
  remain `ELIGIBLE` only while its bound basis remains materially valid; the
  milestone is not complete;
- `REJECTED`: the owner rejects the presented completion claim or determination.
  The recorded basis must identify whether the determination was not actually
  eligible, the claim boundary was unsupported, evidence or governance closure
  was insufficient, or the owner declined acceptance despite mechanical
  eligibility.

The disposition record must identify:

- the exact completion-determination identity;
- the exact completion evidence package;
- the behavior-configuration identity;
- the evaluation-configuration identity;
- the formal-evidence universe and cutoff/completeness boundary;
- the exact pre-reviewed bounded completion claim identity;
- for `ACCEPTED`, the acceptance-time basis-freshness check identity and the
  current evidence-universe/completeness boundary checked;
- the owner disposition and attributable basis;
- the decision time;
- any prior effective owner disposition it explicitly supersedes.

### Owner-Disposition History And Effective State

Owner dispositions are preserved as historical decision events. A later
disposition must not silently overwrite or delete an earlier disposition.
There is at most one effective owner disposition for the current disposition
state of an exact completion determination; a later disposition becomes
effective only by explicitly superseding the prior effective disposition and
preserving the earlier basis.

A later `ACCEPTED` disposition may supersede `DEFERRED` only if the determination
is still currently `ELIGIBLE` and a new acceptance-time basis-freshness check is
clear. If a `REJECTED` disposition asserted objective
ineligibility, a later acceptance requires a corrected, re-evaluated, or
superseding eligible determination before acceptance. If rejection was an
owner's discretionary refusal despite confirmed eligibility, a later owner
acceptance may explicitly supersede that refusal with a recorded basis,
provided the determination remains eligible.

An `ACCEPTED` disposition is not rewritten into `REJECTED` when later adverse
evidence appears. Historical acceptance remains preserved; current claim
standing is handled through the Post-Acceptance Claim Standing rule.

The owner may reject or defer acceptance despite mechanically passing results.
The owner may not waive a valid formal hard-invariant failure, missing
mandatory claim class, orphaned mandatory positive obligation, failed required
positive obligation, unresolved campaign-integrity failure, invalid replacement
process, run-selection independence defect, required claim-support gate, or
accepted semantic obligation while calling the same determination complete.

A later corrected or materially changed package, completion claim, behavior
configuration, evaluation configuration, evidence universe/cutoff, or
engineering-governance basis changes the bound completion basis and requires a
new or superseding completion determination and a new owner disposition. Prior
owner acceptance does not automatically attach to that changed basis.

### Final Acceptance Claim Identity

The owner disposition must accept the exact bounded completion claim that
passed the Bounded Claim-Closure Gate. The disposition may reference that claim
by stable identity and record `ACCEPTED`; it must not redefine or expand the
normative completion claim payload.

Additional administrative notes are non-normative only when they make no
capability, compatibility, scenario-pass, readiness, architecture, safety, or
other claim-bearing assertion beyond the pre-reviewed claim. Additional claim-
bearing narrative created with or after the disposition is a separate claim-
bearing artifact, cannot strengthen milestone status, and must separately
satisfy applicable claim controls.

The acceptance path must verify identity consistency between the exact claim
that passed claim closure and the claim referenced by the effective `ACCEPTED`
disposition. This identity-consistency check is not a recursive new claim-
closure review of the disposition itself.

## Post-Acceptance Claim Standing

Project-owner acceptance is an attributable historical decision event. Later
evidence does not rewrite the fact that the owner accepted the eligible
completion determination at the recorded decision time.

Historical milestone completion and current supportability of the bounded
completion claim are separate semantics:

```text
historical acceptance occurred
    != bounded completion claim remains currently supportable forever
```

After acceptance, a material change to evidence or a governing basis that would
have blocked eligibility if known or effective at determination time requires
re-triage of the bounded completion claim and any dependent claims. Examples
include:

- a newly recovered or newly attributable valid formal hard-invariant failure
  for the accepted behavior configuration;
- discovery that the bound formal-evidence universe or completeness basis was
  materially incomplete;
- accepted reclassification of a campaign, run, obligation result, or
  configuration identity that changes the eligibility result;
- an accepted oracle/evaluation-policy correction or governing-source
  supersession that invalidates the scoreability or claim basis;
- discovery that the accepted package relied on post-hoc repaired SUT evidence,
  a claim-support failure, or an owner-acceptance claim identity mismatch.

The project owner, or a later separately accepted authority explicitly assigned
to milestone claim standing, must preserve the original acceptance and record a
superseding claim-standing disposition or re-triage result. Each claim-standing
disposition must identify the accepted completion determination and exact
bounded claim to which it applies, the material evidence or governing-basis
trigger reviewed, the standing-review basis, the determining authority and
result, its effective order/time, and any prior effective claim-standing
disposition it explicitly supersedes. A free-floating `claim_current = true`
or equivalent assertion is insufficient.

The exact status labels are not prescribed, but the semantics must distinguish
at least:

- the bounded completion claim remains currently supportable;
- the claim requires re-triage before continued reliance;
- the current claim is superseded by a later accepted claim or determination;
- the current claim is invalidated by accepted disqualifying evidence.

A later valid formal hard-invariant failure attributable to the accepted
behavior-configuration revision cannot leave the same bounded completion claim
currently supportable unless an accepted ADR-004 correction basis validly
supersedes that failure classification. The historical acceptance event remains
in the record, but downstream reports must not continue presenting the claim as
currently supported.

Post-acceptance claim-standing re-triage does not define general continuity,
restore, temporal maintenance, or product-recall machinery. It is claim
lifecycle governance for this bounded milestone.

## Maximum Completion Claim

If every condition in this ADR and the accepted `EVAL-004` and `EVAL-005`
contracts is satisfied, the maximum completion claim is:

```text
The project owner accepted completion of the first synthetic SCN-001 selected-
slice workbench milestone for the identified behavior-configuration revision
under the bound evaluation configuration, on the basis of the identified
eligible completion determination. All five mandatory ADR-005 claim classes
satisfied their applicable positive obligations across every required package-
scoped canonical/counterfactual path and mandatory valid formal run, and every
applicable positive-obligation ID in the authoritative ADR-005 package-local
catalogue was represented by the mandatory claim-class map, with no accepted
selected-slice positive capability obligation left outside that catalogue. The formal evidence universe and declared evidence cutoff satisfied
the pre-registered run-selection, selection-independence, validity,
replacement, campaign-integrity, configuration-identity, and configuration-
history closure rules; no unresolved valid formal hard-invariant failure
disqualified the tested behavior-configuration revision; and the applicable
engineering promotion, claim-support, formal-evidence, and bounded claim-
closure gates were satisfied.
```

The claim must identify, directly or through stable references required by the
accepted record contracts:

- the completion determination;
- the formal-evidence universe, record authority/completeness basis, and
  evidence cutoff;
- the formal campaign and material formal-campaign lineage;
- the behavior configuration;
- the evaluation configuration;
- the SUT implementation/build;
- the fixture/oracle package;
- the accepted governing decision revisions;
- the bound engineering-governance lock/projection and conformance result;
- the completion evidence package;
- the exact pre-reviewed bounded claim identity;
- the acceptance-time basis-freshness check;
- the effective project-owner acceptance record.

The historical acceptance claim may be stated only while preserving the
separate current claim-standing status required by this ADR. A report must not
present an invalidated or superseded bounded completion claim as currently
supportable merely because historical owner acceptance occurred.

## Explicit Claim Boundary

Milestone completion under this ADR does not imply:

- full `SCN-001` acceptance;
- production readiness, statistical reliability, or general robustness;
- real personal-memory custody or durable Zoey continuity;
- retrieval, memory search, relevance ranking, or context assembly;
- real voice, avatar, embodiment, STT, or TTS behavior;
- Japanese pedagogy quality or general correction efficacy;
- durable developmental adaptation or a complete growth system;
- LLM, hybrid inference, model-replacement, prompt-replacement, or runtime
  compatibility;
- inference-topology correctness or trust-boundary safety across model,
  service, provider, agent, or process destinations;
- general Zoey architecture, capability, safety, or cross-scenario validity;
- durable system-project repository status.

The accepted evidence is synthetic, fixture-bounded, curated-context,
scenario-provisional, and specific to the tested configuration and first
selected-slice responsibility boundary.

Use of an LLM, multiple models, deterministic logic, local inference, hosted
inference, agents, or a hybrid cognitive mechanism inside the tested
implementation does not by itself strengthen or expand this claim boundary.

## Register Effect

Acceptance of this ADR updates `OPEN_QUESTIONS.md` to:

- move `SLICE-005` to `Resolved` with outcome `Decision` for the first
  synthetic `SCN-001` selected-slice workbench milestone;
- record all five `ADR-005 R2` claim classes as jointly mandatory and non-
  substitutable obligation domains;
- record package-local positive-obligation catalogue and authoritative claim-
  class map closure as prerequisites to conjunctive completion;
- record that `completion_eligible` is an attributable result of an exact
  completion determination over a bound completion basis, not an intrinsic
  status of a behavior configuration or evidence package alone;
- record the distinction between an eligible completion determination and
  historical `milestone_complete`, with explicit project-owner acceptance
  required only for the latter;
- record the one-way completion artifact dependency `P -> D -> A`: frozen
  completion evidence package, completion-eligibility determination, then owner
  disposition;
- record that eligibility depends on an inspectable formal-evidence universe,
  evidence cutoff/completeness boundary, selection-independence closure, event-
  driven basis re-evaluation, and an inspectable acceptance-time basis-freshness
  check before every `ACCEPTED` disposition;
- record that historical owner acceptance and current bounded-claim standing
  remain distinct when later adverse evidence or governing-source changes
  require re-triage;
- retain `EVAL-004` and `EVAL-005` as separate questions whose concrete
  triggers must occur and whose resolutions are prerequisites to the first
  actual completion-eligibility determination that relies on their contracts;
- require a linked evaluation-governance question before completion if the
  accepted evaluation-record contracts cannot establish the formal-evidence
  record authority or completeness basis without materially broadening their
  registered decision target;
- keep `REPO-001`, production, trust-boundary, durable continuity, retrieval,
  voice, and broader scenario questions outside this bounded resolution unless
  their independent triggers occur;
- leave implementation work unblocked while prohibiting `milestone_complete`,
  accepted-slice, or equivalent completion claims until the entire completion
  state model is satisfied.

No implementation, campaign, score, evaluation record, evidence package,
completion determination, or milestone is accepted merely by accepting this
decision contract.

Acceptance of this ADR may require the canonical engineering standard/profile
and workbench governance projection to re-triage source-bound claim/frontier
rules after the register records `SLICE-005` as resolved. That governance
refresh follows acceptance of the semantic decision; it is not a circular
precondition for accepting this ADR.

## Consequences

Positive:

- establishes a clear, falsifiable definition of done before candidate,
  proposal, activation, later-use, outcome, and explanation implementation
  grows further;
- prevents strong performance in one claim class from hiding failure in a non-
  substitutable selected-slice obligation domain;
- requires the authoritative ADR-005 package-local positive-obligation
  catalogue and claim-class map to be closed for the bounded milestone and
  treats a source-required capability obligation missing from that catalogue as
  fixture/oracle incompleteness;
- preserves hard-invariant, positive-obligation, invalid-run, campaign-
  integrity, engineering, claim-closure, eligibility-determination, owner-
  acceptance, and post-acceptance claim-standing semantics as distinct
  controls;
- prevents campaign reset and final-package selection from laundering earlier
  disqualifying formal evidence under a materially unchanged behavior
  configuration;
- replaces subjective "known campaign" completeness with an inspectable formal-
  evidence universe and cutoff/completeness basis;
- prevents prior exploratory outcome knowledge from silently poisoning formal
  run-selection or candidate-universe independence;
- prevents evidence-package assembly or eligibility derivation from repairing
  missing contemporaneous SUT state or dependency evidence;
- makes eligibility an attributable result over an exact bound basis rather
  than a free-floating Boolean or ambiguous property of the SUT revision;
- enforces the one-way `P -> D -> A` completion-artifact dependency and prevents
  the evidence package from using its own eligibility result or owner acceptance
  as self-certifying package evidence;
- requires material basis changes before owner acceptance to trigger re-
  evaluation and requires an acceptance-time freshness comparison before every
  `ACCEPTED` disposition without introducing a general timer or background-
  maintenance system;
- preserves historical owner acceptance while allowing later disqualifying
  evidence to invalidate or supersede the current supportability of the
  bounded claim;
- prevents the final owner acceptance artifact from strengthening the exact
  claim that passed bounded claim closure;
- binds claim-bearing engineering evidence to explicit governance and artifact
  revisions without turning derivative engineering governance into semantic
  authority;
- keeps formal record identity and scoreability contracts separately governed;
- bounds completion to the synthetic workbench milestone.

Negative:

- no individual claim class or proper subset can establish milestone
  completion, even though class-level evidence eligibility may be tracked as
  formal progress;
- one failed mandatory class, unmapped applicable package-local obligation,
  source-required positive capability obligation missing from the fixture/oracle
  catalogue, missing path, unresolved valid formal hard failure, campaign-
  integrity defect, selection-independence defect, invalid campaign state,
  unresolved claim-support control, or unresolved completion gate blocks
  eligibility;
- final completion determination remains unavailable until `EVAL-004`,
  `EVAL-005`, any required linked evaluation-governance decision, and
  applicable engineering enforcement are ready;
- completion review must inspect the authoritative formal-evidence universe,
  configuration history, material campaign lineage, and evidence cutoff rather
  than only the latest passing campaign;
- deferred eligibility can require re-evaluation when a material basis change
  occurs before owner acceptance, and every later acceptance attempt must repeat
  the acceptance-time basis-freshness check;
- owner-disposition and post-acceptance claim-standing history must preserve
  supersession rather than use silent last-write-wins;
- the required evidence package is larger than a demonstration, development
  test report, or ordinary engineering-conformance summary.

## Reconsideration Triggers

Reconsider or supersede this decision if:

- an accepted change to `ADR-004` or `ADR-005` materially changes formal run
  validity, hard-failure scope, claim classes, required paths, obligations,
  campaign aggregation, run-selection independence, or invalid-run handling;
- a mandatory class or applicable package-local positive obligation cannot be
  evaluated without violating the accepted SUT, fixture, oracle, simulator,
  state-origin, dependency-contemporaneity, or passive-inspection boundary;
- `EVAL-004` or `EVAL-005` cannot define its separate contract without
  contradicting the completion state model or closure obligations in this ADR;
- no accepted evaluation-record or linked evaluation-governance contract can
  define an inspectable formal-evidence record authority/completeness basis
  without requiring a materially different completion decision;
- engineering governance cannot bind an applicable completion-review basis
  without either stale-rule shopping or retroactive moving-target semantics;
- post-acceptance claim-standing governance proves insufficient to preserve both
  historical acceptance and current claim supportability under later adverse
  evidence;
- the milestone proposes retrieval, real personal state, production surfaces,
  durable adaptation, or broader scenario acceptance;
- the milestone proposes evidence about LLM/hybrid inference compatibility,
  inference topology, model/runtime replacement compatibility, or cross-
  destination trust-boundary safety rather than merely using such mechanisms
  inside the bounded implementation;
- a later milestone needs partial capability promotion rather than whole first-
  slice completion; that requires a separately named capability claim and must
  not be called this milestone complete.

## Non-Decisions

This ADR does not decide:

- the exact completion-evidence-package, completion-determination, owner-
  disposition, acceptance-time freshness, or claim-standing record schemas,
  storage formats, status enums, attestation formats, or serialization;
- the exact `EVAL-004` record schema, metadata, fingerprints, equivalence, or
  comparison rules;
- the exact `EVAL-005` scoring representation, unresolved-question disposition
  schema, fixture-assumption record, or final scoreability contract;
- whether the formal-evidence universe is represented by a registry, manifest,
  repository index, content-addressed record set, service, or another
  inspectable mechanism;
- the physical packaging format of any convenience review/archive bundle that
  carries `P`, `D`, `A`, or claim-standing records;
- the exact linked evaluation-governance question or authority shape if the
  narrow `EVAL-004` contract cannot establish record-universe completeness;
- canonical engineering-governance publication or release-activation policy;
- background monitoring, time-to-live, scheduler, or general temporal-
  maintenance machinery for eligibility or claim standing;
- implementation architecture beyond accepted ADR-008 responsibilities;
- model, prompt, runtime, agent, or tool selection;
- deterministic versus nondeterministic implementation choice;
- storage, serialization, database, replay, or report format;
- production memory, retrieval, voice, UI, trust boundary, or deployment;
- durable repository extraction;
- full `SCN-001` or general Zoey acceptance.