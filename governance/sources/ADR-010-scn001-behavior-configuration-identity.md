# ADR-010: SCN-001 Behavior-Configuration Identity

Status: `Accepted`

Date: 2026-07-20

Accepted: 2026-07-20

Record revision: `R3`

Decision authority: project owner

Resolved question IDs: `EVAL-004`

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

Companion decision: accepted `ADR-011 R3` separately resolves formal-record
authority under `EVAL-007`. This ADR does not absorb that target; `ADR-011`
depends on this identity contract, not conversely.

Post-decision register state: `OPEN_QUESTIONS.md V0.2.23` records `EVAL-004`
as resolved by this ADR in the coordinated acceptance set with `ADR-011 R3`
and `ADR-012 R3`.

## Decision

Adopt a hybrid immutable behavior-configuration manifest for the first
synthetic `SCN-001` selected-slice milestone.

Every formal evaluation record must bind all three of:

- an opaque behavior-configuration manifest identifier used as a stable local
  reference; and
- a deterministic behavior fingerprint over the manifest's behavior identity
  payload; and
- a deterministic manifest-artifact fingerprint over the immutable manifest
  assertion, including its provenance and correction lineage.

The referenced manifest carries the complete behavior-affecting identity. A
run record may repeat selected fields for review convenience, but repeated
fields must match the manifest and are not a second authority.

This decision distinguishes four concepts:

```text
manifest identifier          = stable reference to one immutable manifest
behavior fingerprint         = exact identity of the behavior payload
manifest-artifact fingerprint = exact identity of the manifest assertion
record authority             = separately governed by EVAL-007 / ADR-011
evaluation result            = separately governed by accepted run/scoring policy
```

A matching behavior fingerprint proves only that the same canonical behavior
payload was named. It does not prove that the provenance assertion is the same,
who authorized a campaign, that evidence is complete, that a run is valid, or
that the behavior passed.

## Manifest Envelope And Identity Payload

The artifact has an envelope, one behavior identity payload, and one immutable
manifest assertion.

Required envelope fields are:

- `artifact_kind`: `BEHAVIOR_CONFIGURATION_MANIFEST`;
- `schema_id`: `zoey.behavior-configuration-manifest`;
- `schema_revision`: `1`;
- `manifest_id`: an opaque stable identifier unique within the formal-evidence
  authority namespace;
- `identity_payload`: the complete behavior identity object defined below;
- `provenance`: the repository/source reconstruction evidence defined below;
- `canonicalization_scheme`: `RFC8785-JCS`;
- `canonicalization_revision`: `1`;
- `hash_algorithm`: `sha-256`;
- `hash_domain`: `zoey:behavior-configuration:v1`;
- `behavior_fingerprint`;
- `manifest_hash_domain`: `zoey:behavior-configuration-manifest:v1`;
- `manifest_artifact_fingerprint`;
- `created_at` and `created_by` stable creation provenance;
- optional non-identity annotations;
- `supersedes_manifest_ref`, either null or an exact typed reference to the
  corrected predecessor.

The exact V1 `artifact_kind` for this artifact is
`BEHAVIOR_CONFIGURATION_MANIFEST`. Its `schema_id` is
`zoey.behavior-configuration-manifest`. The artifact-kind/schema mapping is
closed and must validate in both the manifest and every exact reference.

The identity payload must contain:

1. the closed SUT source/build identity;
2. SUT public-boundary identity;
3. dependency identity;
4. runtime and behavior-relevant environment identity;
5. behavior policy and external configuration identity;
6. typed model, prompt, tool, provider, and randomness applicability;
7. artifact custody references and digests where content is not embedded.

The immutable manifest assertion contains `artifact_kind`, `schema_id`,
`schema_revision`, `manifest_id`, `identity_payload`, `behavior_fingerprint`,
`provenance`, `canonicalization_scheme`, `canonicalization_revision`,
`hash_algorithm`, `hash_domain`, `manifest_hash_domain`, `created_at`,
`created_by`, and `supersedes_manifest_ref`. It excludes storage locations,
human annotations, and `manifest_artifact_fingerprint` itself. Its separate
fingerprint prevents artifact-kind/schema identity, provenance, creator/time
assertions, hash-contract metadata, or correction lineage from being silently
mutated without making repository relocation or annotation edits into behavior
changes.

`supersedes_manifest_ref` has this closed V1 shape:

```text
artifact_id = predecessor manifest_id
artifact_kind
schema_id
schema_revision
content_fingerprint = manifest_artifact_fingerprint
behavior_fingerprint
manifest_artifact_fingerprint
```

Every field is required when the reference is non-null. An ID-only predecessor
link is invalid. The corresponding evaluation-manifest reference substitutes
`evaluation_fingerprint` for `behavior_fingerprint` under `ADR-011 R3`.

`created_at` and `created_by` are immutable artifact provenance, not proof of
prospective authorization or external ordering. Self-authored creation time
cannot replace the external anchor required by `ADR-011 R3`. V1 encodes
`created_at` as an RFC 3339 UTC instant with second precision and `created_by`
as a stable actor/automation identity from the declared authority namespace;
display names alone are invalid.

Manifest provenance, stable creator/time assertions, hash-contract metadata,
human annotations, storage paths, and both fingerprint fields are excluded from
the behavior identity payload. Moving an identical
manifest or correcting an annotation therefore does not invent a new behavior
configuration. Any field capable of changing evaluated behavior belongs in the
identity payload and cannot be hidden in provenance or an annotation.

## Required Behavior Identity

### Source And Build

The identity payload records a path-scoped and dependency-scoped SUT closure:

- a source-closure schema/revision and closed inclusion/exclusion rule;
- every SUT-owned source file by repository-relative logical path, file mode,
  and exact byte digest, or an equivalent deterministic source-tree digest with
  an inspectable member index;
- behavior-affecting shared/generated files included by that closure;
- the behavior-relevant projection of any shared package manifest and the exact
  resolved transitive dependency closure actually used to build or execute the
  SUT; whole-file root manifest/lock digests remain provenance when they also
  contain evaluator-only declarations; the projection records its closed field-
  path set and deterministic derivation rule;
- build/package identifier and version;
- digest of the built or directly executed SUT artifact set;
- build command or build-recipe identity where a build occurs;
- behavior-affecting generated assets and their digests;
- a coverage declaration identifying how behavior-affecting inputs outside the
  named closure are detected; unresolved coverage makes identity `unknown`.

The manifest provenance records the repository identity and role, exact source
commit, root package/lock digests, worktree state, and reconstruction command or
source bundle. Those fields are evidence about where the closed SUT payload was
obtained; they are not behavior discriminators by themselves in a combined
repository. An evaluator-only source, test, schema, index, or dependency change
therefore does not change behavior identity when the closed SUT source,
artifact, dependency, contract, environment, and policy payload is unchanged.

For the current workbench, the closure includes `scn001_sut_core/**`, its
behavior-relevant package-metadata projection and exact transitive runtime
dependencies, and any shared or generated input that can affect execution. It
excludes `scn001_eval/**`,
evaluator-only tests/simulators, formal-record artifacts, campaign indexes, and
governance prose unless a particular item is compiled into or materially
configures the executed SUT.

A formal campaign requires a clean worktree, or an exact immutable patch/source
bundle digest that reconstructs every behavior-affecting difference from the
named commit and reproduces the declared SUT closure. A bare `dirty` label is
not complete provenance and is ineligible for formal campaign authorization.

### Public SUT Boundary

The identity payload records:

- SUT package/project identity;
- declared public entry point and export surface;
- public input, output, lifecycle, and inspection contract digest actually
  effective during execution;
- behavior-relevant feature or policy flags exposed at that boundary.

Accepted ADR, register, or governance revisions belong to the evaluation
configuration and campaign governing basis unless their content is compiled
into or materially controls SUT execution. A behavior-effective contract is
identity-bearing through its exact effective digest, not merely because a
governance document naming it was edited or accepted.

Private source is still covered by source/build identity. The public-boundary
digest exists to make boundary changes reviewable; it does not imply that
private implementation changes are immaterial.

### Dependencies And Runtime

The identity payload records:

- exact resolved SUT transitive dependency graph or a closure projection from a
  larger lock artifact;
- local/package dependencies with their exact source/build identities;
- runtime name, version, implementation, operating system, and architecture;
- toolchain identity used to build or execute the SUT;
- behavior-affecting environment variable names and canonical values or content
  digests;
- locale, timezone, clock mode, and numeric/runtime modes where behavior-
  affecting;
- external tool or provider identities where applicable.

Authentication secrets are never embedded. A secret used only for access is
recorded as non-behavioral authentication material. If secret content can alter
behavior, its stable content digest and custody reference are identity-bearing;
an undisclosed and unfingerprinted behavior-affecting secret makes the
configuration ineligible for formal evidence.

### Model, Prompt, Tool, Provider, And Randomness

Each category uses this closed minimum object; omission, extra semantic fields,
and free-form `"not applicable"` strings are invalid:

```text
applicability   = applicable | not_applicable | unknown
reason_code     = stable catalogue code or null
identity_fields = closed category-specific object
custody_ref     = typed reference or null
content_digest  = sha256 digest or null
unknown_fields  = sorted list of required unresolved field names
```

Allowed applicability values are:

- `applicable`: `reason_code` is null, required `identity_fields` are complete,
  `unknown_fields` is empty, and custody/digest fields are populated whenever
  referenced content is not embedded;
- `not_applicable`: `identity_fields` is empty, custody/digest fields are null,
  `unknown_fields` is empty, and a stable reason code explains why the category
  cannot affect this configuration;
- `unknown`: a stable unknown reason code and a non-empty `unknown_fields` list
  identify the incomplete identity; known fields may remain present for
  diagnosis, but the manifest is ineligible for formal authorization.

The initial `not_applicable` reason-code catalogue is:

- `deterministic_non_model_sut` for model or prompt categories;
- `no_external_provider` for provider configuration;
- `no_behavior_affecting_tool` for tool configuration;
- `no_runtime_randomness` for randomness configuration.

The initial `unknown` catalogue is `identity_not_obtainable`,
`mutable_alias_without_revision`, `custody_unresolved`, and
`behavior_effect_uncertain`. Free-form explanation may appear only as a
non-identity diagnostic annotation; it cannot replace or extend reason-code
semantics without a schema/domain revision.

For `applicable` model configuration, record the provider/runtime, exact model
identifier and a stable revision or weight digest sufficient for the attempted
claim, decoding and sampling parameters, adapter/checkpoint identities, and
relevant serving configuration. A mutable alias without a stable revision or
digest is `unknown` and ineligible for formal campaign authorization.

For `applicable` prompt configuration, record prompt/template identifiers,
content fingerprints, composition order, variable-binding policy, and a custody
reference when prompt text is not embedded. Sensitive prompt content may remain
access-controlled; its exact digest and authorized custody reference may not be
omitted. A digest is an identity control, not a privacy guarantee: low-entropy
or guessable prompt content and its manifest may also require access control.

For this deterministic non-model selected-slice SUT, the expected initial
values are typed `not_applicable` entries with reason code
`deterministic_non_model_sut` for model and prompt, and a complete declaration
of any remaining tool/provider/randomness behavior.

## Canonicalization And Fingerprinting

The identity payload is valid JSON restricted to the canonicalization scheme's
supported value domain. Non-finite numbers, platform-dependent encodings,
comments, duplicate object keys, and implicit defaults are forbidden.

The behavior fingerprint is computed as:

```text
sha256(
    utf8("zoey:behavior-configuration:v1\n")
    || RFC8785_JCS(identity_payload)
)
```

Encode `behavior_fingerprint` as `sha256:` followed by 64 lowercase hexadecimal
characters.

The manifest-artifact fingerprint is computed as:

```text
sha256(
    utf8("zoey:behavior-configuration-manifest:v1\n")
    || RFC8785_JCS(manifest_assertion)
)
```

Encode it using the same `sha256:` form. A verifier must first recompute the
behavior fingerprint from `identity_payload`, then verify that value inside the
manifest assertion, and finally recompute the manifest-artifact fingerprint.

The domain prefix is mandatory. Identical canonical bytes used for another
artifact type must not share an ambiguous cross-type identity. Any future
change to included fields, canonicalization, or hash construction requires a
new schema/domain revision; it must not silently reinterpret an existing
fingerprint.

## Comparison And Material Change

Behavior configurations compare through these outcomes:

| Outcome | Condition | Formal-evidence consequence |
| --- | --- | --- |
| `IDENTICAL` | Same schema/domain and same behavior fingerprint. | Records name the same exact behavior payload. |
| `METADATA_ONLY_DIFFERENCE` | Behavior fingerprint is equal; only behavior-payload-excluded provenance, annotation, or storage location differs. | No behavior-configuration split; a provenance change still creates a distinct manifest-artifact fingerprint and cannot retarget an existing campaign. |
| `BEHAVIOR_CONFIGURATION_CHANGED` | Any identity-bearing field differs under a comparable schema/domain. | New behavior configuration and new campaign identity are required. |
| `COMPARABILITY_UNRESOLVED` | Missing/unknown identity, unsupported schema/domain comparison, or unresolved artifact custody. | Evidence cannot be transferred, merged, or used for compatibility/completion. |

No automatic `semantically equivalent` outcome exists. Different behavior
fingerprints remain different configurations even when a reviewer expects the
same outputs. A later accepted equivalence policy may support a separately
bounded comparison claim, but it cannot rewrite historical identity or erase
formal failures.

Identity-bearing changes include the closed SUT source tree, build artifacts,
behavior-effective public boundary, SUT transitive dependency closure,
runtime/toolchain, behavior policy, feature flags, model, prompt, provider/tool
behavior, applicable randomness, and any environment input capable of changing
an evaluated obligation, hard invariant, or oracle-visible state. A full-
repository commit, root lock, evaluation source, or governance-only change is
provenance or evaluation identity unless it changes one of those closed SUT
inputs.

Purely editorial annotations, creation provenance, and artifact relocation are
not behavior-identity-bearing only because the behavior payload explicitly
excludes them. A
change described as a refactor or optimization is still behavior-configuration
change when an identity-bearing source/build field changes.

## Immutability, Correction, And Supersession

Manifests are immutable after publication or first formal reference, whichever
comes first. A malformed or incomplete
manifest is not edited in place. Correction creates a new manifest with a new
`manifest_id`, the corrected fingerprints, and an exact
`supersedes_manifest_ref`.

If the corrected identity payload has the same behavior fingerprint, the
correction may repair provenance or lineage while producing a new manifest-
artifact fingerprint. If the behavior fingerprint changes, formal records
remain bound to the original behavior configuration; they are not silently
retargeted to the correction.

Two manifests under the same schema/domain with the same behavior fingerprint
identify the same behavior payload even when their manifest IDs and artifact
fingerprints differ. They remain distinct immutable manifest artifacts. Direct
aggregation must not fail merely because such aliases exist, but the authority
namespace must designate one effective manifest lineage for a campaign and
must reject unresolved competing supersession chains, reuse of one manifest ID
for different artifact fingerprints, or favorable alias selection.

Deletion, path replacement, rebasing, or mutable tags must not erase the
original manifest from formal history.

## Relationship To Accepted Evaluation Policy

This ADR instantiates, but does not redefine, the configuration-identity
requirements in `ADR-004 R3`, `ADR-005 R2`, and `ADR-009 R4`.

- A material behavior change ends the affected campaign.
- A valid formal hard failure remains attributable to the exact failed behavior
  fingerprint and cannot be rehabilitated by an evaluation-only change.
- Development runs performed before prospective campaign authorization remain
  development evidence even when their behavior fingerprint later matches an
  authorized campaign.
- Configuration identity alone does not establish the formal-evidence universe,
  evidence cutoff, record authority, scoreability, completion eligibility, or
  owner acceptance.

## Adversarial Review Requirements

Before acceptance or implementation, reviewers must reject a design that:

- treats a Git commit, package version, model name, or prompt label alone as
  complete behavior identity;
- fingerprints a combined-repository commit or root lock as behavior identity
  without deriving the closed SUT source and dependency closure;
- allows evaluator-only or governance-only changes to split behavior identity;
- excludes behavior-affecting shared/generated material from the SUT closure;
- omits build output, dependency lock, runtime, boundary, or behavior-relevant
  environment identity;
- accepts `unknown`, missing, or unfingerprinted behavior-affecting material in
  a formal manifest;
- embeds secrets or sensitive prompts merely to make a manifest self-contained;
- hashes the mutable storage envelope, storage paths, human annotations, or the
  fingerprint field itself; stable `created_at` and `created_by` are hashed
  only because this ADR explicitly places them in the immutable manifest
  assertion, and they remain non-authoritative for prospective order;
- allows provenance or supersession lineage to mutate without changing the
  manifest-artifact fingerprint;
- permits creation provenance or hash-contract metadata to mutate without
  changing the manifest-artifact fingerprint;
- uses an ID-only manifest correction or supersession reference;
- uses raw JSON serialization without a pinned canonicalization revision;
- omits hash-domain separation;
- treats equal fingerprints as proof of authority or pass status;
- treats different fingerprints as automatically equivalent;
- treats same-payload manifest aliases as different behavior or permits
  competing alias/supersession chains to become effective silently;
- edits or retargets a manifest after formal evidence references it;
- lets an evaluation-only configuration change erase a behavior failure.

## Consequences

Positive consequences:

- formal evidence can identify exactly which behavior was evaluated;
- deterministic non-model configurations remain first-class without fake model
  or prompt strings;
- sensitive content can remain in controlled custody while exact identity stays
  inspectable;
- configuration-history comparison becomes deterministic and conservative;
- record authority remains cleanly separated from content identity.

Costs and limitations:

- implementation must inventory behavior-affecting inputs rather than rely on a
  commit label;
- closed SUT source/build changes create new identities even when output appears
  unchanged;
- unresolved or inaccessible identity material blocks formal use;
- this ADR does not choose a storage service, central registry, final file
  layout, signing mechanism, or cross-configuration semantic equivalence policy.

## Acceptance Effect

The project owner accepted this exact revision on 2026-07-20. Therefore:

- `EVAL-004` is `Resolved` with outcome `Decision` for the first synthetic
  selected-slice milestone;
- `OPEN_QUESTIONS.md V0.2.23` records the resolved tombstone for this ADR;
- formal-record authority and evidence-universe completeness remain separately
  governed by accepted `ADR-011 R3`;
- scoreability and unresolved-question treatment remain separately governed by
  accepted `ADR-012 R3`;
- engineering standard/profile sources must be re-triaged and projected before
  Phase 7 implementation.

Acceptance alone authorizes no formal record, campaign, comparison,
compatibility claim, or implementation outside those downstream controls.

## Reconsideration Triggers

Reconsider this decision if:

- the canonicalization or hash construction cannot be implemented consistently
  across the required toolchains;
- a behavior-affecting input cannot be represented without exposing prohibited
  sensitive content and no stable digest/custody mechanism exists;
- a model/runtime cannot supply a sufficiently exact revision or weight identity
  for the claim being attempted;
- a later milestone needs accepted semantic-equivalence or continuity comparison
  across different behavior fingerprints;
- a trust-boundary, production, or durable-repository trigger changes the
  permitted custody or storage boundary.

## Non-Decisions

This ADR does not decide:

- evaluation-configuration identity or formal-record authority;
- campaign authorization, evidence storage, sealing, cutoff, or supersession;
- scoreability, run aggregation, or completion eligibility;
- final schema file format beyond the canonical identity and manifest-assertion
  contracts;
- digital signatures, transparency logs, databases, or services;
- production model selection, prompt design, memory, retrieval, voice, avatar,
  durable adaptation, trust-boundary architecture, or repository extraction.
