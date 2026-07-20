# ADR-011: SCN-001 Formal Evaluation Record Authority

Status: `Accepted`

Date: 2026-07-20

Accepted: 2026-07-20

Record revision: `R3`

Decision authority: project owner

Resolved question IDs: `EVAL-007`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.22`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`
- `decisions/ADR-004-scn001-first-milestone-evaluation-policy.md` `R3`
- `decisions/ADR-005-scn001-selected-slice-fixture-oracle-contract.md` `R2`
- `decisions/ADR-007-scn001-selected-slice-dependency-identity.md` `R3`
- `decisions/ADR-009-scn001-first-selected-slice-milestone-completion-gate.md` `R4`

Decision dependency: accepted `ADR-010 R3` defines the compatible behavior-
configuration identity contract required by this ADR.

Post-decision register state: `OPEN_QUESTIONS.md V0.2.23` records `EVAL-007`
as resolved by this ADR in the coordinated acceptance set with `ADR-010 R3`
and `ADR-012 R3`.

## Decision

Adopt a prospective, manifest-bound, append-preserving formal-evaluation
authority contract for the first synthetic `SCN-001` selected-slice milestone.

Use seven distinct artifact families:

1. immutable evaluation-configuration manifest;
2. prospective deterministic-qualification plan and immutable qualification-
   result records;
3. prospective campaign-authorization manifest;
4. immutable run-attempt records and replayable evidence artifacts;
5. immutable correction, reclassification, run-invalidity, authority-
   invalidation, supersession, result-standing, and claim-invalidation records;
6. immutable bounded-campaign-result records;
7. frozen authority-namespace and campaign evidence indexes that establish the
   formal-evidence universe and cutoff.

These artifacts may be stored as package-local files in the governed workbench.
No database or new durable system-project repository is required. Formal
authorization does require the prospective external ordering anchor defined
below. The storage representation must provide one declared authority namespace
in which qualification history, prospective campaign authorizations, and every
resulting formal attempt are discoverable and cut off through immutable indexed
artifacts.

## Identity, Authority, Validity, And Outcome

The contract keeps these properties separate:

```text
configuration identity = what behavior and evaluation policy were bound
record authority       = whether formal production was prospectively authorized
record validity        = whether the intended SUT behavior was evaluable
evaluation outcome     = what the accepted oracle concluded
evidence completeness  = whether the declared authority universe is closed
```

An authoritative record may contain a hard failure, obligation failure, or
invalid attempt. Authority is not success. A valid content fingerprint without
prospective authorization is development evidence, not a formal record.

## Evaluation-Configuration Manifest

Every campaign binds one immutable evaluation-configuration manifest by opaque
identifier, evaluation fingerprint, and manifest-artifact fingerprint. Its
identity payload records:

- a closed evaluator source/build member index or tree digest covering
  executable formal oracle/checkpoint code, formal schemas, simulator/capture
  code, formal preflight/sealing checks actually executed by the authoritative
  pipeline, their generated artifacts, and behavior-affecting shared/generated
  evaluator inputs;
- evaluator package/build identity, exact resolved transitive dependency
  closure, and runtime/toolchain identity;
- fixture/oracle package `SCN001-SSFO-V0.2.0` or accepted successor;
- exact required fixture paths, bundles, branch policy, completeness
  declarations, checkpoint contract, oracle rule catalogue, and claim-class
  obligation map;
- simulator source/configuration and renderer/realization grammar identity;
- formal record, capture, evidence, correction, and index schema revisions;
- run-validity criteria and invalidity reason catalogue;
- invalid-run replacement limits and stop/review policy inherited from
  `ADR-005 R2`;
- outcome-independent run/seed selection method;
- deterministic-replay qualification policy, deterministic-equivalence profile
  identifier/revision, comparator implementation fingerprint, and closed
  normalization/exclusion rules, or a nondeterministic declaration;
- the conditional formal-run-count policy inherited from `ADR-004 R3` and
  instantiated by accepted `ADR-012 R3`: explicitly nondeterministic means three
  fresh valid runs per path; an eligible `QUALIFIED` result means one; an
  eligible `NOT_QUALIFIED` or `INCONCLUSIVE` result means three; the one-run
  branch must predeclare divergence contingency slots or mandatory campaign
  supersession;
- governing thesis, scenario, state/control, ADR, register, engineering, and
  fixture/oracle revisions;
- behavior-relevant evaluator environment and external dependency identity;
- evaluator-private artifact custody and access policy.

Its immutable provenance records the combined-repository identity, full source
commit, root package/lock digests, worktree state, and reconstruction evidence.
Those provenance fields do not change evaluation identity by themselves. A
SUT-only commit therefore leaves evaluation identity unchanged when the closed
evaluator source, dependency, runtime, governing basis, and policy payload is
unchanged; an evaluator checkpoint/oracle/test change covered by the closure
changes evaluation identity without changing behavior identity.

Ordinary development-only regression tests are provenance unless they alter an
executable formal component, a formal check actually required by the pipeline,
or an identity-bearing generated artifact. Merely adding a development test
does not split evaluation identity.

The evaluation manifest uses the same envelope/payload/assertion separation,
`RFC8785-JCS` canonicalization revision, SHA-256 algorithm, typed applicability
discipline, provenance treatment, and alias rules as accepted `ADR-010 R3`,
with behavior-independent hash domains:

```text
evaluation payload:  zoey:evaluation-configuration:v1
manifest assertion:  zoey:evaluation-configuration-manifest:v1
```

Its identity is separate from behavior identity. A campaign manifest binds one
of each; neither fingerprint includes the other.

A formal evaluation requires a clean evaluator worktree, or an exact immutable
patch/source bundle digest that reconstructs every evaluator-affecting
difference from the named commit and reproduces the declared evaluator closure.
A bare `dirty` state is ineligible for campaign authorization.

## Canonical Artifact Identity

Every artifact family in this ADR uses an immutable envelope plus one canonical
identity payload. The envelope holds the opaque artifact ID, storage/custody
location, content fingerprint, and non-semantic annotations. The identity
payload holds every field material to authorization, configuration, evidence,
classification, lifecycle, ordering, cutoff, or supersession. Every identity
payload includes `schema_id`, `schema_revision`, and an exact `artifact_kind`.
Grouped families additionally require `decision_kind` or `evidence_kind` from a
closed catalogue. The fingerprint field and storage location are never hashed
into themselves.

The V1 artifact-kind/schema mapping is closed:

| `artifact_kind` | `schema_id` |
| --- | --- |
| `EVALUATION_CONFIGURATION_MANIFEST` | `zoey.evaluation-configuration-manifest` |
| `DETERMINISTIC_QUALIFICATION_PLAN` | `zoey.deterministic-qualification-plan` |
| `DETERMINISTIC_QUALIFICATION_RESULT` | `zoey.deterministic-qualification-result` |
| `CAMPAIGN_AUTHORIZATION` | `zoey.campaign-authorization` |
| `FORMAL_RUN_RECORD` | `zoey.formal-run-record` |
| `FORMAL_EVIDENCE_ARTIFACT` | `zoey.formal-evidence-artifact` |
| `EVALUATION_DECISION` | `zoey.evaluation-decision` |
| `BOUNDED_CAMPAIGN_RESULT` | `zoey.bounded-campaign-result` |
| `CAMPAIGN_EVIDENCE_INDEX` | `zoey.campaign-evidence-index` |
| `AUTHORITY_NAMESPACE_INDEX` | `zoey.authority-namespace-index` |

Every artifact and exact reference must validate this mapping. An unknown kind,
unknown schema, or mismatched pair is invalid. The behavior-configuration
manifest mapping is defined by `ADR-010 R3`.

V1 `decision_kind` is exactly `RUN_INVALIDITY`, `AUTHORITY_INVALIDATION`,
`RECORD_CORRECTION`, `ORACLE_POLICY_RECLASSIFICATION`,
`QUALIFICATION_RESULT_CORRECTION`, `CAMPAIGN_SUPERSESSION`,
`BOUNDED_RESULT_SUPERSESSION`, `BOUNDED_RESULT_STANDING`,
`CLAIM_INVALIDATION`, or `NAMESPACE_RECONCILIATION`. V1 `evidence_kind` is
exactly `SUT_INPUT_CAPTURE`, `SUT_OUTPUT_CAPTURE`, `SUT_INSPECTION_CAPTURE`,
`SIMULATOR_REQUEST_CAPTURE`, `SIMULATOR_REALIZATION_CAPTURE`,
`EVALUATOR_PRIVATE_CAPTURE`, `ANCHOR_RECEIPT`, or `RAW_BINARY_ATTACHMENT`.
Adding or changing a kind requires the corresponding schema/domain revision; a
free-form subtype is invalid.

All V1 identity payloads use `RFC8785-JCS`, canonicalization revision `1`,
SHA-256, and `sha256:` plus 64 lowercase hexadecimal characters. Each family
has a separate hash domain:

| Artifact family | Hash domain |
| --- | --- |
| Evaluation configuration | `zoey:evaluation-configuration:v1` |
| Evaluation-configuration manifest assertion | `zoey:evaluation-configuration-manifest:v1` |
| Deterministic-qualification plan | `zoey:deterministic-qualification-plan:v1` |
| Deterministic-qualification result | `zoey:deterministic-qualification-result:v1` |
| Campaign authorization | `zoey:campaign-authorization:v1` |
| Formal run-attempt record | `zoey:formal-run-record:v1` |
| Replayable simulator/capture evidence | `zoey:formal-evidence-artifact:v1` |
| Evaluation decision (invalidity/correction/reclassification/supersession/standing/claim invalidation) | `zoey:evaluation-decision:v1` |
| Bounded campaign result | `zoey:bounded-campaign-result:v1` |
| Campaign evidence index | `zoey:campaign-evidence-index:v1` |
| Authority-namespace index | `zoey:authority-namespace-index:v1` |

For each row, compute:

```text
sha256(utf8(hash_domain + "\n") || RFC8785_JCS(identity_payload))
```

Every cross-artifact reference uses this closed exact V1 shape:

```text
artifact_id
artifact_kind
schema_id
schema_revision
content_fingerprint
```

Behavior/evaluation manifest references additionally carry their payload
fingerprint and manifest-artifact fingerprint; for those references the generic
`content_fingerprint` must equal `manifest_artifact_fingerprint`. Conceptual
identities such as
`campaign_id`, `attempt_id`, or `authority_namespace_id` do not replace exact
references to the authorization, record, or index artifacts that assert them.
A matching ID with a different artifact fingerprint, a payload fingerprint
inconsistent with its manifest assertion, an ID-only lineage link, or a
matching fingerprint under another domain/schema revision is a closure failure.
Future canonicalization, included-field, or hash-construction changes require
new schema/domain revisions.

## Field Authority And Conflict Closure

Repeated values are references, never competing declarations. They must be
canonically equal to the sole authority below; conflict is an authority-closure
failure and never `latest wins`.

| Field family | Sole authority | Referencing artifacts |
| --- | --- | --- |
| SUT behavior payload | Behavior manifest | Campaign, qualification, run, indexes |
| Fixture/oracle semantics, required paths, claim/obligation map, validity and deterministic-equivalence policy | Evaluation manifest | Qualification, campaign, run, indexes |
| Conditional formal-run-count policy and contingency requirements | Evaluation manifest | Qualification, campaign, result |
| Qualification allocation and comparison basis | Qualification plan | Qualification result, campaign |
| Qualification observations and result | Qualification result | Campaign, indexes |
| Selected planned valid run count, its derivation, formal attempt set, contingency slots, selection/replacement rules, and custody plan | Campaign authorization | Run, campaign index, bounded result |
| Actual attempt capture and initial classification | Sealed run record | Decisions, campaign index |
| Post-seal correction, authority invalidation, or reclassification | Effective evaluation decision record | Run history, indexes, completion package |
| Scoreability aggregation and bounded result payload | Bounded-campaign-result record under accepted `ADR-012` | Result standing, indexes, completion package |

For this selected-slice claim campaign, campaign authorization must repeat the
evaluation manifest's complete required path/claim set and may not narrow,
weaken, or replace fixture/oracle semantics, validity criteria, run-count
policy, or replacement limits. Its selected run count must be the deterministic
output of that policy and its exact qualification basis. A run cannot introduce
an undeclared path, slot, policy,
or claim. A stricter prospective campaign stop condition is allowed only when
the evaluation manifest explicitly declares that extension point and the
campaign still cannot obtain a pass with less evidence than the manifest
requires.

## Deterministic-Qualification Authority

Deterministic qualification is support for choosing the formal run-count rule;
its executions are not formal SUT evidence. It uses two immutable subtypes.

Before any qualification output is observed, a qualification plan fixes:

- exact behavior/evaluation manifest references with both payload/artifact
  fingerprints;
- every required path and the exact qualification execution slots;
- initial-state, isolation, capture, and simulator policy;
- deterministic-equivalence profile/revision and comparator implementation
  fingerprint;
- outcome-independent allocation and the rule that invalid, missing, or
  divergent preflight output cannot be discarded or retried into qualification;
- producer, distinct validator role, custody, and prospective anchor evidence.

The qualification plan must satisfy the same external anchor profiles defined
for campaign authorization before its first material preflight output. In that
application, substitute the qualification plan for the authorization manifest
and require the cumulative namespace index to include the plan.

The sealed qualification-result record contains:

- exact qualification-plan reference and behavior/evaluation identity closure;
- every planned execution ID, path, capture, and evidence digest;
- normalized oracle-material projections and comparator inputs;
- equivalence result, mismatch class, and divergence details for every pair or
  declared all-member comparison;
- `QUALIFIED`, `NOT_QUALIFIED`, or `INCONCLUSIVE` result;
- producer and distinct validator identity and validation result;
- exact qualification-plan anchor-receipt and fresh-start capture references;
- result fingerprint and an exact nullable supersession reference.

All qualification plans/results appear in the authority namespace. The plan is
prospectively anchored before its executions; the result necessarily is not. A
result becomes eligible as campaign-authorization support only when it is
sealed, independently validated, and included by exact reference in the same or
an earlier externally published cumulative namespace revision that includes the
campaign authorization. The authorization anchor therefore makes the selected
qualification result immutable before any formal attempt starts.

A campaign using the one-run branch references an eligible `QUALIFIED` result.
A campaign using the three-run branch after attempted qualification references
the eligible `NOT_QUALIFIED` or `INCONCLUSIVE` result. Only a configuration
whose evaluation manifest declares the three-run policy without qualification
may omit qualification references and use an explicit nondeterministic-policy
declaration. No campaign ID is included in the qualification result, avoiding a
circular authorization dependency; the later campaign references the already
sealed result.

The first anchored qualification plan for an exact behavior/evaluation pair is
the sole plan eligible to establish the one-run rule. `NOT_QUALIFIED` or
`INCONCLUSIVE` selects the three-run policy; repeating new plans under unchanged
fingerprints until one qualifies is forbidden. A later qualifying plan requires
a new applicable configuration identity or an independently reviewed, owner-
accepted correction proving that the earlier qualification record itself had
an authority defect. The earlier plan/result remains indexed.

## Prospective Campaign Authorization And Anchor

A campaign preflight authorizes only future formal record production. It never
promotes historical development or exploratory runs.

Before the first material SUT output for any formal attempt, the campaign must
have an immutable authorization manifest containing:

- campaign identifier;
- authority namespace identifier;
- exact behavior- and evaluation-manifest references, including their payload
  and manifest-artifact fingerprints;
- scenario, fixture/oracle package, claim classes, required paths, and mandatory
  obligation-map identity;
- selected run-count-policy branch and its exact evidence basis;
- exact deterministic-qualification plan/result references whenever
  qualification was attempted, otherwise the explicit evaluation-manifest
  nondeterministic-policy declaration;
- planned attempt slots or the deterministic rule that allocates them before
  their material outputs are observed;
- prospectively allocated deterministic-divergence contingency slots or the
  rule that campaign supersession is mandatory if qualification later fails;
- selected planned valid run count per path and a mechanically verifiable
  derivation from the evaluation-manifest policy plus qualification result;
- outcome-independent selection/seed rule and disposition of known exploratory
  outcomes, seeds, replay handles, cached realizations, or candidate pools;
- inherited invalidity, replacement, stop, suspension, and correction rules;
- replayable-evidence storage/custody locations and access boundaries;
- campaign authority identity, authorization time, and authorization result;
- prospective anchor profile, target authority ref/custody, and required anchor
  evidence shape;
- required anchor-receipt profile, digest algorithm, custody target, and
  resolvability policy;
- authorization manifest fingerprint.

The campaign authority is the project owner unless an accepted governance
artifact explicitly delegates that role for this milestone. A validator may
confirm preflight mechanically, but it does not create strategic authority by
calling itself authoritative.

Self-authored timestamps, local file mtimes, local Git commits, and mutable
branch labels do not prove prospective order. Before the first material formal
output, both the authorization and the cumulative namespace-index revision that
includes it must be committed and published through one declared anchor profile:

- `PROTECTED_REMOTE_GATE`: fast-forward publish the exact commit to the declared
  non-rewrite authority ref, then obtain a platform-issued immutable gate/event
  identity for that exact commit before starting any attempt; or
- `INDEPENDENT_PREOUTPUT_ATTESTATION`: an actor independent of campaign
  production records the exact authorization/index fingerprints and immutable
  commit identity in separately controlled custody before attempt start.

Every attempt records the anchor profile, repository/authority ref, exact commit
SHA, external gate/event or attestation identity, and observed predecessor.

The platform receipt or independent attestation is captured as an
`ANCHOR_RECEIPT` evidence artifact with the exact raw bytes or canonical
attestation payload, byte digest, media/encoding data, external identity,
custody reference, and the authorization/index commit it attests. The
authorization or qualification plan declares the receipt requirement but cannot
reference the receipt created by publishing its own commit; that would be
circular. Every attempt, qualification result, and campaign index references
the resulting receipt exactly, and the next
cumulative namespace revision includes it. Missing or unresolvable receipt
evidence fails authority closure.

The anchor must also establish a causal post-anchor execution start; ordering a
manifest before a claimed timestamp is insufficient if old output can be
replayed. Use one of:

- `GATE_LAUNCHED_ATTEMPT`: the successful external gate creates a fresh attempt
  challenge/nonce and launches the exact declared command/capture pipeline; or
- `INDEPENDENT_START_ATTESTATION`: the independent attestor creates a fresh
  challenge/nonce after anchoring and observes the attempt start and capture
  binding.

The challenge belongs to the evaluator-private capture envelope, not SUT
semantic input, and every run/qualification capture binds it. Cached or prior
output cannot satisfy fresh execution merely by copying the challenge into a
later record.

Missing anchor/start proof, publication after output, or an anchor controlled
solely by the result producer irrevocably leaves already observed output as
development evidence; backdated timestamps or later reconciliation cannot
promote it. A force move or history rewrite after a valid prospective anchor
quarantines affected authority until owner-authorized, independently reviewed
reconciliation proves the original external anchor/start chain and includes all
fork history.

Authorization must therefore be both indexed and externally anchored before the
attempt starts. A run performed earlier remains development evidence even when
its source, configuration, seed, and output later match an authorized attempt.

## Formal Attempt Allocation And Lifecycle

Every formal attempt receives an immutable attempt identifier before its
material SUT output is observed. Replacement attempts are allocated only after
the invalid predecessor is sealed under the pre-registered replacement rule and
keep its exact run-record reference plus conceptual attempt ID; an ID-only
replacement link is invalid.

Attempt lifecycle is distinct from scoring:

- `authorized`: attempt identity and selection basis are fixed;
- `started`: declared initial state/checkpoint has been opened;
- `evidence_captured`: required raw artifacts have been durably written;
- `sealed`: record validation and artifact-digest closure passed;
- `authority_invalidated`: a later authority/integrity finding withdraws the
  record from authoritative use without deleting it;
- `superseded`: a later immutable decision replaces a record-level conclusion
  without deleting history.

Lifecycle names define semantic distinctions, not a mandatory implementation
enum. Impossible combinations must be rejected. In particular, an attempt
cannot become `sealed` before evidence capture, and authority invalidation
cannot be used to hide an observed undesirable SUT outcome.
`INVALID_UNSCORABLE` remains the
separate accepted run-validity result. An invalid/unscorable attempt can and
must have a sealed immutable history record when its evidence was captured;
that does not make it a valid scored SUT run.

Campaign lifecycle is separate:

- `planned`;
- `authorized`;
- `active`;
- `suspended`;
- `closed`;
- `superseded`.

`suspended` and `superseded` are campaign lifecycle states, not run outcomes.

## Authoritative Run Record

Each run-attempt record contains at least:

- record schema/domain revision, record identifier, and content fingerprint;
- authority namespace, campaign, and attempt identifiers plus exact campaign-
  authorization and authorizing namespace-index references;
- behavior and evaluation manifest IDs, payload fingerprints, and manifest-
  artifact fingerprints;
- prospective authorization anchor profile, commit, and external gate/event or
  attestation reference plus exact anchor-receipt artifact reference;
- causal start-proof profile and fresh challenge/capture binding;
- path ID, claim classes pressured, attempt slot, actual seed/replay/provider
  handles where applicable, and selection-basis reference;
- initial snapshot/checkpoint identity and run-isolation evidence;
- start, evidence-capture, and seal facts; initial run-invalidity reference when
  known at sealing;
- delivered bundle IDs and exact ordered delivery/capture references;
- raw SUT input/output/inspection capture identities and digests;
- simulator request and replayable-realization evidence references;
- evaluator-private evidence references kept outside SUT visibility;
- run validity, run-global hard-invariant result, and per-claim obligation
  result vector using accepted `ADR-005 R2` domains;
- rule IDs, observed refs, expected/actual classification, and affected claim
  classes for every failure artifact;
- producer/validator identity and seal result;
- replacement/predecessor links knowable at sealing.

The record fingerprint uses its own domain:

```text
zoey:formal-run-record:v1
```

Mutable lifecycle state is not edited into a sealed record. Later lifecycle or
classification changes are separate immutable linked records that reference the
sealed run exactly. At initial sealing, later correction, authority-invalidation,
reclassification, and supersession fields are absent; indexes assemble those
effective history links without editing the run.

## Replayable Simulator Evidence

In-memory routing is insufficient for formal authority. Every simulator
interaction material to a checkpoint, outcome, invalidity decision, or oracle
classification must have a durable replayable evidence envelope containing:

- simulator request identity and exact requested SUT output/disposition ref;
- projected SUT-visible realization exactly as delivered;
- evaluator-private realization/premise data where applicable;
- simulator/evaluation configuration fingerprint;
- creation and delivery order;
- fidelity or mismatch data and origin;
- capture schema/domain revision, content digest, and storage/custody reference;
- validation and seal status.

For non-JSON or binary evidence, the canonical structured envelope records the
media type, encoding, byte length, and `sha256:` digest of the exact stored
bytes. Canonical JSON identity applies to the envelope; it must not normalize or
re-encode the raw artifact before verifying its byte digest.

Durable means the bytes are written to an immutable or content-addressed
artifact that remains resolvable at record sealing and at the evidence cutoff.
A process-local object, console log, or reconstructable expectation is not
durable evidence.

Durability must preserve the `ADR-002 R2` and `ADR-008 R2` boundary. Persisting
evaluator-private evidence never makes it SUT-visible, behavior-driving, or a
fixture answer.

## Formal-Evidence Universe And Cutoff

### Authority-Namespace Index

One declared authority namespace contains an index of every qualification plan,
qualification result, campaign authorization, and post-seal decision under its
control. A campaign is formal only if its prospective authorization appears in
this index and satisfies the external anchor before execution.

Every effective namespace-index revision, including post-campaign result,
correction, standing, and reconciliation revisions, must be fast-forward
published or independently attested under the declared anchor profile. Its
receipt is captured outside the revision it attests and included by exact
reference in the next revision, avoiding self-reference. A missing current-
revision receipt prevents use of that revision as an externally ordered cutoff
even though the revision's content fingerprint remains valid.

The project owner designates exactly one effective namespace for this milestone
or accepts an explicit union/supersession rule covering every predecessor. A
second unmerged namespace, divergent index head, or unresolved index fork makes
the formal-evidence universe incomplete. Reconciliation must be outcome-
independent, enumerate both complete fork histories, receive independent review,
and be accepted by the project owner; selecting one favorable head is invalid.
Campaigns outside the effective namespace are non-formal and cannot be
selectively imported after outcomes are known.

Each immutable namespace-index revision records:

- namespace identity and authority;
- every deterministic-qualification plan/result exact reference within the
  revision's scope;
- every campaign-authorization exact reference within the revision's scope;
- every frozen campaign-evidence-index exact reference within the revision's
  scope;
- every bounded-result, result-standing, and claim-invalidation exact reference
  within the revision's scope;
- prospective anchor profile and external evidence for each qualification plan
  and campaign authorization;
- every available anchor-receipt artifact reference, with the current revision's
  receipt carried prospectively by its successor or by the bound external
  custody reference;
- behavior and evaluation fingerprints bound by each campaign;
- authorization, suspension, closure, and supersession links;
- exact prior index-revision reference where applicable;
- monotonic revision number and exactly one accepted predecessor, with any fork
  explicitly reconciled rather than selected by favorable outcomes;
- exact included-entry count and content fingerprint;
- cutoff boundary expressed by index revision/fingerprint, not merely a date.

Namespace revisions are cumulative. A later revision may supersede a campaign
or decision, but it must continue to enumerate the earlier identity and its
supersession link. It cannot drop an earlier campaign from history.

This is the minimum registry needed to satisfy `ADR-009 R4` cross-campaign
configuration-history closure. It is an artifact, not a required central
service. A self-authored claim that all known campaigns were included is not a
substitute.

### Campaign Evidence Index

When a campaign closes or is suspended for review, freeze an immutable campaign
evidence index containing:

- every authorized attempt slot;
- every started, invalid, replacement, sealed, and unstarted/dispositioned
  attempt;
- every run record and raw evidence artifact identity/digest;
- behavior/evaluation manifest identities;
- selection-independence evidence;
- exact authorization/start anchor-receipt references and custody closure;
- invalidity reasons, replacement links, stop/review decisions, corrections,
  reclassifications, and supersessions;
- deterministic-qualification plan/result and divergence-contingency links;
- campaign lifecycle result;
- exact member count, cutoff, exact prior-index reference if any, and index
  fingerprint.

An omitted failed, awkward, off-policy, invalid, abandoned, or unstarted
authorized attempt is an index defect. A later favorable campaign cannot remove
an earlier campaign from the namespace index.

### Bounded Campaign Result And Standing

Every frozen campaign evidence index, including one frozen on suspension,
requires at least one initial immutable bounded-campaign-result assessment.
Later assessments may exist only through the supersession contract. `ADR-011`
owns its
identity, authority, indexing, and history; accepted `ADR-012` owns its scoring
payload and result semantics.

The V1 result envelope carries its schema/domain revision, `result_id`, and
content fingerprint under the generic artifact rules. Its identity payload
contains at least:

- exact behavior/evaluation manifest references, including payload and manifest-
  artifact fingerprints;
- exact campaign-authorization and frozen campaign-evidence-index references;
- the exact prior authority-namespace revision/cutoff and its external receipt;
- qualification plan/result references or the exact explicit nondeterministic-
  policy basis;
- selected run-count branch, planned count, attempt inventory, and derivation
  closure;
- complete applicable path/claim result vector, non-pressure
  `NOT_APPLICABLE` vector, run-validity closure, and hard-invariant closure;
- accepted scoreability-policy/ADR revision and aggregation implementation
  fingerprint;
- unresolved-question register/matrix revision and every unresolved blocker;
- exactly `BOUNDED_PASS`, `BOUNDED_FAIL`, or `NOT_YET_DETERMINABLE`;
- the exact bounded claim payload and fingerprint for pass/fail, or the exact
  indeterminacy statement for `NOT_YET_DETERMINABLE`;
- producer identity, distinct validator identity/result, creation provenance,
  and an exact nullable `supersedes_result_ref`.

Compute its identity under `zoey:bounded-campaign-result:v1`. Repeated values
must close to their sole authorities; the result record cannot redefine run,
qualification, authorization, fixture/oracle, or manifest facts.
The distinct validator must independently recompute the aggregation from the
frozen index and referenced authoritative records rather than accept the
producer's result vector or normalized summary.

The dependency and indexing order is:

```text
formal attempts/evidence
    -> frozen campaign evidence index C
C -> externally ordered closure namespace revision N includes exact C
C + N
    -> sealed bounded-campaign-result assessment R
later cumulative namespace revision N+1 includes exact R
    -> R may satisfy result authority
N+1 + R may enter completion package P
```

`C` must not include `R`, and `R` must not cite `N+1`; either dependency would
make the result self-certifying. Before inclusion in `N+1`, `R` is
`result_authority_pending_index_closure`. A missing result assessment means no
bounded pass/fail claim is supported and the completion package is incomplete.

An authoritative `BOUNDED_PASS` or `BOUNDED_FAIL` requires an effective prior
namespace, authoritative campaign/run closure, valid result aggregation,
distinct validation, exact external receipt closure, and later `N+1` inclusion.
A sealed `NOT_YET_DETERMINABLE` assessment may accurately enumerate incomplete
authority or evidence, but it becomes an authoritative statement about the
bound basis only when its own producer, schema, exact inputs, effective
namespace, receipt, validation, and `N+1` inclusion close. If the effective
namespace itself is unresolved, the assessment remains diagnostic and cannot
use authoritative-result language.

Results are immutable. Mechanical recalculation disagreement, later divergence,
new attributable evidence, or a material basis change appends a
`BOUNDED_RESULT_STANDING` decision with exactly `CURRENT`,
`RESULT_REEVALUATION_REQUIRED`, or `SUPERSEDED`; it never edits the historical
result. A superseding result uses an exact `supersedes_result_ref`. Any post-
observation result correction or supersession requires the exact defect and
basis delta, independent review, and project-owner acceptance. A
`CLAIM_INVALIDATION` decision records any report or result presentation that
exceeds the accepted bounded claim without changing underlying run outcomes.

A V1 result-standing decision binds the exact result reference, exact prior
standing reference or null, standing value, reason code, basis delta/evidence,
actor/time, independent-review reference where required, owner decision where
required, and its own content fingerprint. A V1 `CLAIM_INVALIDATION` binds the
exact offending artifact/claim reference, supported claim ceiling, observed
overclaim, affected result/campaign, reviewer/owner disposition, and
supersession history. Neither decision may rewrite the result payload.

### Completion Evidence Universe

For an `ADR-009 R4` completion determination, the formal-evidence-universe basis
is a frozen namespace-index revision that includes the required bounded-result
record plus every campaign index and material record attributable to the tested
behavior fingerprint through its cutoff.
Unresolved attribution, a missing campaign index, or an unresolvable artifact
blocks configuration-history closure.

The cutoff does not license ignoring a newer material namespace revision before
owner acceptance. `ADR-009 R4` basis-freshness control requires reevaluation or
a superseding completion determination when new attributable formal evidence or
authority history enters the effective namespace.

## Record Authority Predicate

A sealed run record is authoritative formal evidence only when all conditions
hold:

```text
campaign prospectively authorized
AND authorization indexed before attempt start
AND authorization/index externally anchored before material output
AND causal fresh-start proof binds execution/capture after that anchor
AND attempt allocated outcome-independently before material output
AND behavior/evaluation payload and manifest-artifact fingerprints match authorization
AND every repeated field closes to its sole authority without conflict
AND any one-run policy closes to an eligible sealed qualification result
    included in the authorizing namespace revision
AND declared initial state and isolation verified
AND required raw and simulator evidence durably captured
AND SUT/evaluator privacy boundary preserved
AND record schema, fingerprint, references, and digests validate
AND seal completed without an unresolved authority-invalidating defect
AND attempt and record appear in the frozen campaign evidence index
AND that campaign index appears in an effective externally ordered
    closure namespace revision
```

Before frozen campaign-index inclusion, a sealed run is an immutable formal-
attempt artifact with `authority_pending_index_closure`; it must be retained and
cannot be called authoritative evidence. After campaign-index inclusion but
before closure-namespace inclusion, authority remains
`authority_pending_namespace_closure`. These later inclusions change the
authority predicate, not the sealed record or its outcome. A campaign may not
omit an adverse pending record or favorable-select an index/namespace fork to
avoid making it authoritative.

Authority does not require `PASS`. An authoritative valid hard failure remains
formal evidence. An authoritative invalid-attempt record remains formal campaign
history but is not a valid scored SUT run; its declared run-invalidity is not by
itself an authority-invalidating defect.

## Invalidity, Authority Invalidation, Reclassification, And Supersession

Decision rights are closed as follows:

| Role | Permitted authority |
| --- | --- |
| Mechanical validator | Recompute schema, canonicalization, digest, reference, anchor, and index predicates; report or quarantine a defect; never make a discretionary semantic reclassification. |
| Campaign evaluator | Produce the initial validity, invariant, and obligation classifications strictly under the accepted manifest/rule catalogue; cannot revise its own sealed result. |
| Independent reviewer | Attest the evidence and outcome-independence of a proposed post-observation authority invalidation, oracle/policy correction, qualification/result correction, bounded-result supersession/standing change, claim invalidation, namespace reconciliation, or campaign-authority supersession; cannot alone accept it. |
| Project owner | Solely make those material post-observation decisions effective and accept campaign/result supersession or namespace-fork reconciliation. |

A sealed record that fails any predicate required at sealing never becomes
authoritative. Campaign-index inclusion is a separate later predicate and
remains pending until index freeze. A later mechanically detected defect
immediately quarantines the affected evidence from new aggregation, but
permanent authority invalidation or material reclassification after output was
observed requires an immutable proposal, independent review, and project-owner
acceptance. The campaign producer cannot unilaterally withdraw adverse evidence.

Run-invalidity reasons and replacement limits are inherited from `ADR-004 R3`
and `ADR-005 R2` and copied into the campaign authorization. They are not
chosen after observing an inconvenient outcome.

Every run-invalidity record preserves:

- attempt and record identity;
- pre-registered or independently inspectable reason code;
- evidence proving the integrity defect;
- decision actor/time;
- replacement eligibility and replacement attempt link;
- campaign stop/suspension consequence.

Initial run-invalidity classification may be made by the designated campaign
evaluator only from the pre-registered catalogue. Before campaign-index freeze,
a validator distinct from the output-producing process must recompute the
declared integrity predicate from sealed evidence; disagreement suspends the
campaign. A post-seal change to validity is a material reclassification and
follows the independent-review/owner rule.

An `authority_invalidated` lifecycle record is different: it records a later
finding that prospective authorization, identity, capture, sealing, or index
closure was defective. It preserves the original record and evidence, states
the exact authority defect and affected claims, and cannot be used to relabel
undesirable but valid SUT behavior as `INVALID_UNSCORABLE`.

Reclassification for an oracle or evaluation-policy defect uses the immutable
superseding decision required by `ADR-004 R3`: original and corrected
classification, exact defect, supporting evidence, authority, affected records,
campaigns, and claims. It becomes effective only after independent review and
project-owner acceptance. The original classification remains in history.

No record, evidence artifact, manifest, index, or failure is edited or deleted
to make a campaign pass. Corrections append linked artifacts. A behavior-
configuration change creates a new behavior identity and campaign. A material
evaluation change creates a new evaluation identity and campaign but cannot by
itself rehabilitate a valid hard failure of unchanged behavior.

## Comparison Rules

Formal records may be directly aggregated only when they bind the same behavior
and evaluation fingerprints and belong to an accepted common campaign/index
scope. Equal behavior identity with different evaluation identity requires a
new campaign and explicit historical disposition; it is not an implicit
apples-to-apples comparison.

Different behavior fingerprints remain different configurations under
accepted `ADR-010 R3`. Unknown or unsupported identity comparison is fail-
closed and cannot transfer evidence.

## Relationship To Completion Artifacts

This ADR supplies record authority and evidence-universe inputs to `ADR-009 R4`.
It does not collapse the completion artifact dependency:

```text
formal records -> frozen campaign index C
C -> closure namespace revision N
C + N -> bounded result R
later namespace revision indexes R
R + that later revision -> completion evidence package P
P -> completion-eligibility determination D
D -> project-owner disposition A
```

The authority index, campaign index, result, or run record must not cite `D` or
`A` as proof of its own completeness or validity. `C` must not include `R`, and
`R` must not cite the later namespace revision that indexes it. Owner acceptance
cannot repair missing formal evidence or a missing bounded-result record.

## Adversarial Review Requirements

Before acceptance or implementation, reviewers must reject a design that:

- authorizes a campaign after any material formal output was observed;
- treats a self-authored timestamp, local commit, mutable remote ref, or
  producer-controlled receipt as proof of prospective order;
- anchors metadata prospectively but reuses output observed before the anchor
  without a gate-launched or independently witnessed fresh-start chain;
- promotes an exploratory/development run because it later matches the formal
  configuration;
- allocates seeds or attempt slots from known favorable outcomes;
- treats a hash, signature, Git commit, or directory location as authority by
  itself;
- lets behavior-only repository changes alter evaluation identity, or
  evaluation-only repository changes alter behavior identity;
- permits repeated manifest/campaign/run fields to conflict or uses latest-wins
  precedence;
- uses an ID-only lineage/correction reference or a campaign ID where an exact
  campaign-authorization artifact reference is required;
- qualifies deterministic execution without an anchored plan, complete planned
  executions, closed comparison profile, or distinct validation;
- uses a qualification result for run-count selection before that result is
  sealed, validated, and included in the authorizing namespace revision;
- stores simulator evidence only in memory or reconstructs it after the run;
- stores only an external event ID while the anchor receipt bytes/digest/custody
  are missing or unresolvable;
- makes evaluator-private evidence SUT-visible;
- omits invalid, failed, abandoned, replacement, or superseded attempts;
- uses a timestamp alone as the evidence cutoff;
- lets a campaign index prove that no unindexed campaign existed without the
  authority-namespace index;
- mutates or deletes a sealed record, manifest, index, or historical failure;
- calls a sealed run authoritative before frozen campaign-index inclusion or
  omits an adverse authority-pending record from that index;
- calls an indexed run authoritative before the campaign index appears in an
  externally ordered effective namespace revision;
- omits the bounded-result record, places it in the campaign index it consumes,
  or lets it cite the later namespace revision that indexes it;
- gives an indeterminate diagnostic authoritative-result standing while the
  authority namespace used to produce it is unresolved;
- classifies undesirable SUT output as infrastructure invalidity;
- lets a campaign producer unilaterally invalidate or reclassify observed
  adverse evidence;
- changes evaluation configuration to reset a valid behavior hard failure;
- introduces `D -> P`, `A -> D`, or another self-certifying completion cycle.

## Consequences

Positive consequences:

- formal authority is prospective and outcome-independent;
- externally anchored ordering prevents authorization from being reconstructed
  solely from mutable repository files after outcomes are known;
- sole-field authority and conflict closure prevent contradictory locally valid
  artifacts;
- deterministic qualification is inspectable, non-circular, and indexed;
- bounded campaign results have an immutable, independently validated, non-
  circular authority path distinct from completion determination;
- replayable simulator evidence replaces process-local claims;
- every attempt and correction remains attributable;
- a lightweight artifact index satisfies cross-campaign completeness without a
  mandatory service or database;
- formal failure evidence cannot be hidden by later success;
- SUT/evaluator privacy and ownership remain intact.

Costs and limitations:

- Phase 7 must implement durable capture, validation, sealing, result
  aggregation, standing, and indexing;
- the authority namespace requires disciplined prospective registration;
- formal execution requires a protected remote gate/event or independent pre-
  output attestation outside the result producer's sole control;
- sensitive evaluator evidence needs controlled custody;
- missing artifacts or unresolved identity fail closed;
- this ADR does not select a signing system, database, hosted registry,
  long-term archive, or durable project-repository boundary.

## Acceptance Effect

The project owner accepted this exact revision on 2026-07-20 after accepting the
compatible `EVAL-004` resolution in `ADR-010 R3`. Therefore:

- `EVAL-007` is `Resolved` with outcome `Decision` for the first synthetic
  selected-slice milestone;
- `OPEN_QUESTIONS.md V0.2.23` records the resolved tombstone for this ADR;
- Phase 7 may implement the accepted manifest, capture, record, sealing,
  bounded-result, standing, and index contracts only after the governance
  projection and current workbench review gates are satisfied;
- a formal campaign intended to support the bounded milestone claim must also
  satisfy the accepted scoreability contract in `ADR-012 R3`.

Acceptance alone authorizes no campaign, formal record, evidence promotion,
compatibility claim, or implementation outside those downstream controls.

## Reconsideration Triggers

Reconsider this decision if:

- a repository-local authority namespace cannot establish the completeness
  basis required by `ADR-009 R4`;
- durable replayable evidence cannot preserve evaluator-private custody;
- formal records require cryptographic signer identity or third-party
  attestation beyond content fingerprints and recorded authority;
- the selected prospective anchor profiles cannot provide stable external
  ordering or their declared authority refs cannot prevent/reveal rewrites;
- a provider/runtime prevents exact attempt, model, seed, or trace attribution
  needed by the attempted claim;
- a durable system-project extraction, trust boundary, retention, or production
  archive triggers a separately governed storage/custody decision.

## Non-Decisions

This ADR does not decide:

- behavior-configuration identity beyond consuming `EVAL-004`;
- selected-slice scoreability or unresolved-question disposition;
- the accepted run validity, hard failure, claim obligation, or replacement
  semantics already owned by `ADR-004 R3` and `ADR-005 R2`;
- a final implementation language, file layout, database, signature,
  transparency log, cloud archive, or repository extraction beyond the minimum
  external ordering anchor required above;
- production memory, retrieval, model selection, voice, avatar, durable
  adaptation, product UI, or broader `SCN-001` acceptance.
