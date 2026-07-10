# Zoey Engineering Standard

Document version: `V0.5.0`

Status: `Draft`

Date: 2026-07-10

Release context:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.18`
- accepted ADRs through `decisions/ADR-008-scn001-selected-slice-internal-boundary.md` `R2`

Rule-level governing sources are listed on each rule. The release context is not a substitute for rule-level source references.

## Purpose

This document defines Zoey's general engineering governance for non-throwaway implementation work.

It defines:

- how engineering rules are identified, versioned, and retired;
- how accepted decisions remain authoritative;
- how implementation repositories consume governance;
- what counts as enforcement;
- how conformance ledgers avoid stale compliance claims;
- the general code-health floor for non-throwaway work;
- claim boundaries that prevent engineering artifacts from being mistaken for evaluated behavioral compatibility or milestone acceptance.

Scenario-specific or milestone-specific obligations live in profiles, not in this base standard.

## Authority Model

This standard is a derivative engineering-conformance artifact. It does not create, redefine, or supersede semantic architecture decisions.

For every engineering rule:

```text
governing ADR/register/source = semantic authority
engineering rule = implementation consequence and required protection
implementation repo = local enforcement mechanism and evidence
```

If this standard, a profile, an integration contract, or a local governance projection conflicts with a cited governing artifact, the governing artifact wins. The affected engineering rule becomes `revalidation-required` in local ledgers until corrected or explicitly confirmed against the governing source.

Rule validity is source-bound. When a governing source revision changes, every rule that cites that source becomes revalidation-required; rules that do not cite the changed source remain valid unless the change affects them indirectly and that dependency is recorded.

## Rule Identity And Lifecycle

Engineering rule IDs are stable. Do not reuse a rule ID after removal, retirement, replacement, or semantic split.

Every canonical rule has a rule revision:

```text
ENG-HEALTH-API-001 R2
```

Editorial wording may preserve the same rule revision. A material change to the rule target, obligation, required check, eligible protection, review actor, minimum promotion enforcement, claim-support minimum, or failure consequence increments the rule revision. A materially different target creates a new rule ID.

Retired rules keep a tombstone that names the replacement rule or retirement reason where practical.

Rule prefixes:

| Prefix | Rule family |
| --- | --- |
| `ENG-BASE-*` | Authority, publication, conformance, profile composition, and governance lifecycle. |
| `ENG-HEALTH-*` | General code-health and implementation discipline. |
| `ENG-CONF-*` | Architecture or active-profile conformance. |
| `ENG-CLAIM-*` | Artifact labels and claim boundaries. |
| `ENG-CHANGE-*` | Open-question and decision-change triggers. |
| `ENG-AGENT-*` | Tool-neutral coding-agent governance. |

## Canonical Rule Schema

The rule catalogue is the normative engineering surface. Guidance, rationale, examples, checklists, and attack catalogues support the rules; they do not create independent binding obligations unless attached to a rule ID.

Canonical rule entries use this schema:

```text
ID:
Rule revision:
Governing sources:
Rationale references:
External behavior assumptions:
Scope:
Applies when:
Rule:
Forbidden shapes:
Required checks:
Eligible protection mechanisms:
Expected test modes:
Allowed review actors:
Minimum promotion enforcement:
Minimum promotion integration:
Minimum claim-support enforcement:
Failure consequences:
Review question:
Notes:
```

Optional fields may be omitted when not applicable. Local enforcement status is never stored in the canonical rule. It belongs only in the implementation repo's conformance ledger.

`Governing sources` identifies external semantic sources, accepted rule references, or explicit governance records that constrain the rule. The canonical rule artifact and rule revision are pinned separately in the governance lock. For a base rule with no external semantic source, `this standard` means the canonical rule entry itself and is revalidated only when that rule revision changes, not whenever the document version changes. Broad references such as "all accepted ADRs" are not source-closure identifiers.

Eligible protection mechanisms describe usable protection shapes. They are not alternatives silently selected by a ledger author; the minimum promotion-enforcement field states what must actually exist:

- `structural`: design makes violation impossible or materially hard;
- `static`: lint, dependency analysis, schema validation, type checks, or build rules;
- `automated-test`: deterministic tests, contract tests, negative tests, replay tests, or property tests;
- `manual-review`: explicit qualifying reviewer action and recorded outcome.

Unless a rule states a stricter minimum, minimum promotion enforcement is: every required check resolves through at least one eligible protection mechanism, and the local ledger status is neither `uncovered` nor `revalidation-required` when the rule applies to the promoted change.

Expected test modes describe test shape:

- `positive`;
- `negative`;
- `contract`;
- `interleaving`;
- `replay`;
- `property`;
- `regression`.

Minimum promotion integration states the lowest acceptable integration for the required enforcement:

- `none`;
- `local-recorded`: a documented local command or recorded qualifying review is required before promotion;
- `CI-visible`: CI executes and reports the check, but branch/release policy need not require it;
- `CI-required`: promotion cannot proceed without the successful CI check.

`protected-branch` is an implementation mechanism for `CI-required`, not a provider-neutral canonical integration level. A rule may declare more than one integration when they are cumulative. For example, `local-recorded` plus `CI-required` requires both a reproducible local control and a protected CI gate. `CI-visible` plus `CI-required` is redundant and must be normalized to `CI-required`. The local ledger records the actual provider mechanism.

Failure consequences describe what a failure blocks. Unqualified consequences are cumulative. A condition-qualified consequence applies only under the stated condition:

- `merge-blocking`;
- `promotion-blocking`;
- `claim-blocking`;
- `advisory`.

## Review Actors

Manual review is not satisfied merely because text says a rule was reviewed.

Review and check categories:

- `human-review`: explicit human or project-owner-authorized reviewer action;
- `agent-review`: review performed by a coding agent or separate automated reasoning task;
- `automated-check`: non-discretionary tool result, which is a mechanism rather than a discretionary review actor.

When an entry omits `Allowed review actors`, these canonical defaults apply:

- `ENG-HEALTH-*`: `human-review` or `agent-review` by an independent agent/task;
- `ENG-BASE-*`, `ENG-AGENT-*`, `ENG-CLAIM-*`, `ENG-CHANGE-*`, and active-profile rules: `human-review`.

A rule may explicitly narrow or broaden its allowed actors. The same agent that implements a change cannot self-attest a manual-review control for that change.

A manual-review control is enforceable only when:

- the review trigger is declared;
- the review question is declared;
- the qualifying reviewer outcome is recorded;
- promotion cannot proceed without the required outcome.

Otherwise the rule is `uncovered` in the local conformance ledger.

## Conformance Ledger

Every governed non-throwaway implementation repo keeps a conformance ledger. It may be Markdown, a test manifest, CI configuration, or another inspectable local artifact.

Every governed repo must also publish a human-readable `CONFORMANCE.md` applicability index at the path declared by its governance lock. The index may be generated from another local manifest, but it is the required router for agents and reviewers.

Minimum ledger fields:

```text
Rule ID:
Rule revision:
Rule source artifact:
Governing source revisions:
Applicability:
Applicability rationale:
Applies To:
Actual mechanisms:
Actual test modes:
Actual promotion mechanism:
Status:
Failure consequences:
Local evidence:
Residual risk:
Reviewer/Owner:
Active exception:
Verified at:
```

Allowed local status values:

- `enforced`;
- `review-only`;
- `uncovered`;
- `revalidation-required`.

`Verified at` should identify the commit, build, configuration, or comparable evidence identity. A date may be included, but a date alone is not an integrity anchor.

## Governance Publication And Consumption

`Zoey/meta` owns canonical engineering governance. Implementation repositories consume pinned projections of the applicable standard, profiles, integration contracts, and governing source snapshots.

The preferred implementation-repo projection is:

```text
governed implementation repo
    AGENTS.md
    governance/
        ENGINEERING_STANDARD.md
        profiles/
            SCN001_SELECTED_SLICE.md
        integrations/
            CODEX_INTEGRATION.md   if Codex is used
        ZOEY_GOVERNANCE.lock
        CONFORMANCE.md
        EXCEPTIONS.md              if an exception is active
        sources/
            OPEN_QUESTIONS.md
            ADR-*.md
```

The local governance snapshot is not a new authority. Its lock records exactly which canonical release, active profiles, integration contracts, source snapshots, rule revisions, and content digests the repo consumes. The ledger records mutable local conformance truth; it is never a digested governance input.

Do not solve governance consumption by relying on conversational memory, a developer remembering to paste rules, a sibling repository being present, or a personal global coding-agent instruction file. Repository-level governance must travel with the repository.

## Profile Composition

Profiles add scenario-specific or milestone-specific engineering rules. They may cite, strengthen, or set stricter minimum enforcement for base rules.

Profile rules must not silently weaken, redefine, or reuse existing rule IDs. Rule IDs are globally unique across canonical engineering governance.

Two active profiles with conflicting obligations create a governance conflict. Profile activation order does not resolve semantic conflict. Promotion is blocked until the conflict is resolved, explicitly scoped, or accepted through the governing decision process.

Profile IDs and profile rule IDs are not reused after retirement.

## Guidance Escalation And Pruning

Use the smallest durable control that fits the problem:

- one-off issue: review comment, local fix, or issue;
- repeated repo-local mistake: nearest applicable `AGENTS.md` or repo-local guidance;
- repeated workflow: skill or scripted review workflow;
- repeated cross-repo engineering failure: candidate `ENG-*` rule;
- selected milestone conformance pressure: active profile rule;
- semantic architecture problem: Open Question or ADR.

Do not turn every annoyance into a global rule. At profile release, major standard release, or milestone boundary, review duplicate rules, obsolete tool assumptions, mechanically enforced guidance that no longer needs prose, and rules with no observed applicability.

When a recurring failure becomes mechanically impossible, remove redundant agent prose unless it still provides useful routing context.

## Rule Catalogue

### ENG-BASE-001 - Source Authority

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: all governed non-throwaway implementation work.

Applies when: implementation, tests, docs, reports, or governance artifacts depend on an accepted Zoey decision or unresolved-question frontier.

Rule: implementation work preserves accepted governing sources over local convenience. If code, tests, or documentation require changing an accepted source, the change is handled as a decision update or new ADR.

Forbidden shapes:

- silently implementing a different boundary than an accepted ADR;
- hiding a decision change inside code;
- claiming conformance to a rule whose cited source changed without revalidation.

Required checks:

- cite governing sources in local governance locks and conformance ledgers;
- mark affected local ledger entries `revalidation-required` when governing sources change.

Eligible protection mechanisms:

- manual-review
- static

Expected test modes:

- contract

Allowed review actors:

- human-review

Minimum promotion integration: `CI-required`.

Minimum claim-support enforcement: local ledger identifies governing source revisions for claim-bearing rules.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does this change preserve the accepted governing source, or does it require a source update?

### ENG-BASE-002 - Rule-Level Revalidation

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: all standard/profile releases and governed implementation repos.

Applies when: a pinned governing source revision, rule revision, active profile set, active integration set, or canonical snapshot digest changes.

Rule: rule validity is tied to cited sources and rule revisions. When a pinned source revision, rule revision, active rule set, or canonical snapshot digest changes, affected rules become `revalidation-required` until explicitly confirmed against the changed baseline. Volatile lock metadata, local ledger changes, and active-exception edits do not by themselves change the canonical governance baseline.

Forbidden shapes:

- treating the whole standard as silently valid after source changes;
- treating the whole standard as invalid when only a source-bound subset needs review;
- treating a lock timestamp or local ledger update as a source change;
- omitting source revisions or rule revisions from local governance locks.

Required checks:

- local governance lock lists standard version, active profile versions, active integration versions, source revisions, rule revisions, and canonical content digests;
- conformance ledger can identify rules affected by source changes.

Eligible protection mechanisms:

- structural
- static
- manual-review

Expected test modes:

- contract

Allowed review actors:

- human-review

Minimum promotion integration: `CI-required`.

Minimum claim-support enforcement: source-bound affected rules are not `uncovered` or silently stale.

Failure consequences:

- claim-blocking

Review question: which local rules cite the changed source or rule revision?

### ENG-BASE-PUBLISH-001 - Repository Governance Projection

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: every governed non-throwaway implementation repo.

Applies when: a repository is created, governance is synchronized, active profiles change, or non-throwaway implementation work is promoted.

Rule: each implementation repo can determine the canonical engineering-standard release it consumes, every active profile and integration contract it consumes, the governing source snapshots for active rules, and where local conformance mechanisms are recorded.

Forbidden shapes:

- relying on a sibling `meta` checkout for routine governance discovery;
- relying on a developer to remind agents or reviewers about the standard;
- manually edited local governance copies that cannot be checked against canonical snapshots.

Required checks:

- local governance snapshot or lock exists before non-throwaway implementation work is promoted;
- local projection includes applicable source snapshots or another repo-self-sufficient access mechanism;
- local lock records canonical content digests, digest algorithm, and canonicalization semantics;
- projection derives governing source snapshots from the active rule-source closure.

Eligible protection mechanisms:

- structural
- static
- manual-review

Expected test modes:

- contract

Allowed review actors:

- human-review

Minimum promotion integration: `CI-required`.

Minimum claim-support enforcement: governance projection and source snapshots are present and integrity-checkable.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: can this repository prove which governance and source snapshots it consumes without a sibling checkout or conversation memory?

### ENG-BASE-REPO-001 - Repository Role And Architecture Claim Declaration

Rule revision: `R2`

Governing sources:

- `OPEN_QUESTIONS.md V0.2.18`

Scope: every governed non-throwaway implementation repository or workbench.

Applies when: a governed implementation repository or workbench is created, renamed, moved, used for claim-bearing work, or proposed for extraction into a durable system-project repository.

Rule: each governed implementation repository declares its workspace/repository role, permitted architecture claim, and governance lock reference. Repository placement, age, milestone success, code volume, reuse, or renaming does not strengthen the declared architecture claim.

Forbidden shapes:

- treating a workbench as a durable Zoey system-project boundary because the milestone succeeds;
- using a scenario or milestone name as sufficient justification for durable placement under `projects/`;
- duplicating governance baseline prose as an authority parallel to `governance/ZOEY_GOVERNANCE.lock`;
- extracting workbench implementation into a durable system-project boundary without the applicable responsibility-boundary decision.

Required checks:

- repository guidance declares repository role and permitted architecture claim;
- repository guidance points to `governance/ZOEY_GOVERNANCE.lock` as the governance baseline authority;
- durable project creation or workbench-to-project extraction checks the applicable open-question trigger.

Eligible protection mechanisms:

- structural
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: claim-bearing work identifies the repository role, permitted architecture claim, and governance lock reference.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: what repository role and architecture claim does this work rely on, and is a stronger claim blocked by an open question?

### ENG-BASE-CONFORMANCE-001 - Conformance Evidence Must Resolve

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: local conformance ledgers, gates, tests, and governance locks.

Applies when: a rule is marked `enforced` or `review-only`, local evidence is renamed or deleted, gates are changed, or governance is audited.

Rule: a local rule may be marked `enforced` only when every required local enforcement reference resolves to an inspectable mechanism and the actual promotion mechanism satisfies the rule's minimum promotion integration.

Forbidden shapes:

- ledger cites a deleted test, renamed CI job, removed checker config, skipped test, or missing tool;
- ledger says `static` after the dependency checker is removed;
- gate exists but no longer runs on the required promotion path;
- `Last checked` date is used as proof after evidence disappeared.

Required checks:

- conformance audit verifies rule IDs, rule revisions, source revisions, evidence paths, gate names, actual promotion mechanisms, and status consistency.

Eligible protection mechanisms:

- static
- automated-test
- manual-review

Expected test modes:

- contract

Minimum promotion integration: `CI-required`.

Minimum claim-support enforcement: no claim-supporting rule is marked enforced with missing evidence.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does every claimed local enforcement reference still resolve and run where the ledger says it runs?

### ENG-BASE-CONFORMANCE-002 - Applicability Completeness

Rule revision: `R1`

Governing sources: canonical governance lock.

Scope: the complete active canonical rule set and every repository-local `CONFORMANCE.md` applicability index.

Applies when: governance is projected or audited, an active standard/profile/integration changes, or the conformance index is changed.

Rule: every rule in the pinned active rule set receives exactly one explicit repository applicability disposition. Missing from the index is an audit failure, not an implicit `not-applicable` result.

Forbidden shapes:

- listing only rules a ledger author remembered to apply;
- treating a missing index row as non-applicability;
- marking a rule `not-applicable` without a repository-specific rationale;
- retaining a stale applicability disposition after scope, paths, active profiles, or integrations change.

Required checks:

- projection initializes an index row for every active rule with rule ID, revision, and source artifact;
- conformance audit compares the index to the active lock rule set;
- every `not-applicable` disposition has a rationale and is reviewable.

Eligible protection mechanisms:

- static
- automated-test
- manual-review

Allowed review actors:

- human-review

Minimum promotion enforcement: complete applicability disposition and a passing conformance audit.

Minimum promotion integration: `CI-required`.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does every active rule have a truthful, explicit applicability disposition?

### ENG-BASE-EXCEPTION-001 - Scoped Engineering Exceptions

Rule revision: `R1`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: repository-local exceptions to engineering controls.

Applies when: a repository cannot meet an applicable engineering control and proposes a temporary deviation, compensating control, or `AGENTS.override.md` exception.

Rule: an engineering exception is a time-bounded, human-approved record of residual risk for a specific rule revision and scope. It does not change canonical rule meaning, silently satisfy minimum enforcement, or waive an accepted semantic obligation.

Forbidden shapes:

- an exception without rule ID/revision, scope, compensating control, human approval, and expiry or reconsideration trigger;
- using an exception to permit behavior prohibited by a cited ADR/register;
- reporting an excepted rule as `enforced` merely because an exception exists;
- using an open-ended "temporary" exception.

Required checks:

- active exception resolves from the affected `CONFORMANCE.md` entry;
- exception register records reason, compensating control, approval, effective date, expiry/reconsideration, promotion consequence, and claim consequence;
- conformance audit flags expired or out-of-scope exceptions.

Eligible protection mechanisms:

- manual-review
- static

Allowed review actors:

- human-review

Minimum promotion enforcement: active exception is valid, scoped, and its compensating control resolves; otherwise the affected rule is `uncovered` or `revalidation-required`.

Minimum promotion integration: `CI-required`.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does this exception record residual risk without weakening an accepted semantic obligation?

### ENG-BASE-PROFILE-001 - Profile Composition

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: active profiles and profile rule catalogues.

Applies when: a profile is created, activated, retired, combined with another profile, or changed.

Rule: profiles may add rules, cite base rules, or strengthen minimum enforcement. They must not silently weaken, redefine, or reuse rule IDs. The active profile set is represented as separately pinned source artifacts, not a concatenated singular profile file.

Forbidden shapes:

- two active profiles define the same rule ID differently;
- a profile weakens a base rule without an accepted source change;
- profile activation order is used to resolve a semantic conflict;
- publishing a multi-profile set through a singular `ACTIVE_PROFILE.md` abstraction.
- retired profile IDs or rule IDs are reused.

Required checks:

- profile rule IDs are globally unique;
- active profile conflicts are resolved before promotion;
- active profile source artifacts and rule IDs are listed in the governance lock and conformance index.

Eligible protection mechanisms:

- manual-review
- static

Expected test modes:

- contract

Minimum promotion integration: `CI-required`.

Minimum claim-support enforcement: active profile set has no unresolved conflicts.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does this profile add or strengthen rules without redefining existing obligations?

### ENG-AGENT-001 - Persistent Agent Governance

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: repository-integrated coding agents.

Applies when: coding agents perform governed work or repository guidance is created/changed.

Rule: repository-integrated coding agents receive durable project guidance sufficient to discover active engineering rules, local enforcement, and required gates before governed changes. Agent guidance does not substitute for mechanical enforcement.

Forbidden shapes:

- relying on personal global instructions for project governance;
- requiring each prompt to restate active Zoey rules;
- treating agent guidance as proof that a rule is enforced;
- nested or specialized guidance silently weakening inherited active rules.

Required checks:

- root guidance routes agents to local governance lock and conformance index;
- specialized guidance cites relevant rule IDs where practical;
- inherited rules may be specialized or strengthened, not silently weakened.

Eligible protection mechanisms:

- structural
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: agent guidance routes to local governance, but claim support still depends on ledger evidence.

Failure consequences:

- promotion-blocking

Review question: can an agent starting in this repo find applicable rules and gates without prompt reminders?

### ENG-HEALTH-CHANGE-001 - Focused Change

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Rationale references:

- Google Engineering Practices

Scope: all non-throwaway implementation changes.

Applies when: a change modifies non-throwaway code, tests, governance, build, or documentation.

Rule: each change has one primary purpose and is small enough for direct review.

Forbidden shapes:

- mixing behavior change, broad refactor, generated structure, and conformance change without explicit split rationale;
- hiding semantic changes inside formatting, renames, or cleanup.

Required checks:

- review identifies primary purpose;
- broad changes record why splitting would be riskier than combining.

Eligible protection mechanisms:

- manual-review

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: claim-bearing changes identify their primary purpose and applicable rules.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: what is the primary purpose of this change, and is it small enough to review directly?

### ENG-HEALTH-TEST-001 - Behavior-Change Test Obligation

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Rationale references:

- Google Engineering Practices

Scope: non-throwaway behavior changes and bug fixes.

Applies when: behavior changes or a bug is fixed.

Rule: behavior changes add or update tests that fail without the change. Bug fixes include regression tests unless the failure is not reproducible in the implementation test harness or is purely editorial/build-environment-specific.

Forbidden shapes:

- changing behavior with only final-output smoke tests where boundary, state, or claim behavior is affected;
- skipping a regression test without recording the exception.

Required checks:

- test evidence or recorded exception appears in the change review.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- positive
- negative
- regression

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: behavior relevant to claims has tests or an explicit recorded exception.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: which test fails without this behavior change?

### ENG-HEALTH-TEST-002 - Test Validity

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Rationale references:

- Google Engineering Practices

Scope: non-throwaway tests and conformance checks.

Applies when: tests are added, changed, or used as conformance evidence.

Rule: tests exercise the narrowest meaningful boundary without mocking, precomputing, or asserting away the responsibility under test.

Forbidden shapes:

- mocking the decision being claimed;
- asserting only private implementation fields as behavior evidence;
- happy-path string snapshots as the sole evidence for state or boundary behavior;
- fixture data supplying the expected semantic result to the code under test.

Required checks:

- test review identifies the responsibility under test and what would make the test fail.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- contract
- negative
- regression

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: claim-supporting tests do not precompute the claimed behavior.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: does this test actually exercise the responsibility it claims to protect?

### ENG-HEALTH-API-001 - Minimal Public API

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: all public implementation APIs.

Applies when: public modules, functions, endpoints, exports, schemas, commands, or contracts are added or widened.

Rule: public API is minimal by default. Code is not made public solely to make tests, fixtures, or evaluation setup easier.

Forbidden shapes:

- exporting internal transition functions to let tests or harness code drive hidden semantics;
- making private state mutation public to simplify setup;
- expanding a selected-slice public boundary without a governing decision or profile rule.

Required checks:

- public API additions identify governing source and consumer;
- tests use local/internal seams rather than broadening public boundaries.

Eligible protection mechanisms:

- static
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: public APIs used for claim evidence are declared and reviewed.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: why must this be public, and which governed consumer needs it?

### ENG-HEALTH-STRUCTURE-001 - Bounded Module Responsibility

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: top-level directories, packages, shared modules, and broad helpers.

Applies when: a new top-level area, package, shared module, or broad helper is introduced or renamed.

Rule: every top-level directory and shared module has one bounded, stateable responsibility.

Forbidden shapes:

- ambiguous ownership areas such as `misc`, `old`, `new`, `final`, `v2`, `temp`, `general`, or `common-everything`;
- shared modules that cannot state which code does not belong there;
- directories whose names hide SUT/evaluation, state, or claim ownership.

Required checks:

- repository map or local guidance is updated when a new top-level project area is introduced;
- review can state the responsibility in one sentence.

Eligible protection mechanisms:

- manual-review

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: claim-bearing code lives in areas with clear ownership.

Failure consequences:

- advisory: an ownership label is imprecise but does not mislead a reviewer or claim;
- merge-blocking: ownership ambiguity hides SUT/evaluation, state, or claim responsibility.

Review question: what is this module's responsibility, and what does not belong here?

### ENG-HEALTH-ABSTRACTION-001 - Current Justification For Abstractions

Rule revision: `R2`

Governing sources:

- `ADR-001 R1`

Scope: non-throwaway implementation abstractions and shared helpers.

Applies when: a change introduces a new shared module, public interface, base abstraction, generic orchestration type, or moves logic from local to shared ownership.

Rule: new abstractions require current justification: repeated concrete pressure, an accepted boundary or contract obligation, testability or conformance need, or an accepted ADR/working assumption. Anticipated future Zoey scope alone is insufficient.

Forbidden shapes:

- broad `engine`, `manager`, `context`, `memory`, `shared`, `common`, or `utils` modules without bounded responsibility;
- abstractions that hide SUT/evaluation ownership or state origin.

Required checks:

- review records the abstraction responsibility and current justification.

Eligible protection mechanisms:

- manual-review

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: shared abstractions involved in claims have current justification.

Failure consequences:

- advisory: a local abstraction has limited cleanup value but does not alter a governed boundary;
- merge-blocking: an abstraction obscures ownership, state origin, or an active governed contract.

Review question: what current pressure justifies this abstraction, and why is a local implementation insufficient?

### ENG-HEALTH-DEPENDENCY-001 - Production Dependency Discipline

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: production/runtime dependencies and build-critical dependencies.

Applies when: a dependency is added, materially upgraded, or moved into production/runtime scope.

Rule: new production dependencies require current need, why existing standard-library/local/dependency options are insufficient, ownership boundary, runtime/build impact, version/lock impact, and maintenance suitability appropriate to consequence.

Forbidden shapes:

- adding a package because an agent found it convenient;
- adding dependency-driven architecture before local pressure exists;
- bypassing lockfile or reproducibility expectations.

Required checks:

- dependency addition rationale appears in review or local dependency record.

Eligible protection mechanisms:

- manual-review
- static

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: claim-bearing code does not depend on unreviewed production dependencies.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: why is this dependency needed now, and what ownership/maintenance risk does it introduce?

### ENG-HEALTH-REPRO-001 - Reproducible Project Commands

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: required gates, local commands, CI commands, and documented developer setup.

Applies when: a repo defines or changes quality, test, conformance, build, or governance gates.

Rule: required local gates can be run from a clean checkout through documented repository commands.

Forbidden shapes:

- depending on undocumented global tools, aliases, shell state, or mystery working directories;
- saying a gate exists without a documented command or CI job;
- tests requiring manual environment patches not recorded in repo guidance.

Required checks:

- repo guidance lists exact commands for required gates;
- command docs are updated when gates change.

Eligible protection mechanisms:

- manual-review
- automated-test

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: required claim-supporting gates are reproducible from documented commands.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: can a clean checkout run this gate using documented commands?

### ENG-HEALTH-FAILURE-001 - Failure Transparency

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: contract checks, conformance gates, SUT/evaluation boundaries, inspection, reporting, and operational helpers.

Applies when: code catches errors, reports conformance status, handles invalid input, or falls back after unexpected failures.

Rule: contract violations and unexpected failures are not silently converted into success, empty results, or fallback behavior without attributable handling.

Forbidden shapes:

- broad catch returning `None`, empty lists, or success status;
- architecture check unavailable but report says pass;
- inspection failed and returns empty relation set as if valid;
- fallback hides violated rule ID or boundary.

Required checks:

- failure paths expose violated contract or residual risk without leaking prohibited evaluation metadata.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- negative
- regression

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: claim-supporting checks fail closed and report failure transparently.

Failure consequences:

- merge-blocking
- claim-blocking

Review question: does this failure path preserve the difference between success, absence, invalidity, and unavailable check?

### ENG-HEALTH-DEAD-001 - Dead Code And Throwaway Promotion

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: non-throwaway implementation code and throwaway artifacts.

Applies when: dead code, prototypes, experiments, or throwaway artifacts are present near non-throwaway implementation.

Rule: dead code is deleted rather than commented out. Throwaway artifacts receive no conformance credit, and promotion into non-throwaway implementation requires normal review and conformance as if newly introduced.

Forbidden shapes:

- non-throwaway code importing throwaway code;
- commented-out implementation bodies retained as pseudo-history;
- prototype code promoted without conformance review.

Required checks:

- review flags throwaway imports and commented-out dead code;
- promotion review applies active rules and tests.

Eligible protection mechanisms:

- static
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: claim-bearing code does not depend on throwaway code.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: is this code active, deleted, or intentionally throwaway?

### ENG-HEALTH-TODO-001 - Tracked TODO Identity

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: TODOs in non-throwaway code.

Applies when: TODO, FIXME, temporary-workaround, or deferred-work markers appear in non-throwaway code.

Rule: TODOs reference a tracked issue, open-question ID, ADR trigger/reconsideration, or stable implementation follow-up ID. A prose reason may accompany the ID but cannot replace it.

Forbidden shapes:

- `TODO: fix later`;
- `TODO: temporary`;
- architecture-bearing TODOs with no owner, trigger, or follow-up identity.

Required checks:

- review flags untracked TODOs in non-throwaway code.

Eligible protection mechanisms:

- static
- manual-review

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: claim-bearing code has no untracked architecture TODOs.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: what stable follow-up identity owns this TODO?

### ENG-HEALTH-COMMENT-001 - Useful Comment Discipline

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: comments in non-throwaway code.

Applies when: comments are added, generated, or used to justify behavior.

Rule: comments explain why, invariants, non-obvious limitations, accepted trade-offs, or consequences of change. Comments do not narrate obvious syntax or duplicate implementation.

Forbidden shapes:

- generated comments such as "loop through items" for obvious code;
- comments that assert conformance without evidence;
- stale comments that contradict active rules.

Required checks:

- review removes or corrects misleading or low-value comments.

Eligible protection mechanisms:

- manual-review

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: comments used in claims or conformance explanations are accurate.

Failure consequences:

- advisory: a comment is merely low value and does not mislead a reviewer;
- merge-blocking: a comment misstates conformance, a contract, or a governing decision.

Review question: does this comment explain an invariant, trade-off, or consequence that code alone does not show?

### ENG-HEALTH-GEN-001 - Generated Artifact Review

Rule revision: `R2`

Governing sources: none; base engineering rule authored in this canonical rule artifact.

Scope: AI-generated or tool-generated code, schemas, tests, docs, and project structure.

Applies when: generated artifacts become non-throwaway implementation or governance material.

Rule: generated artifacts are not authoritative and are reviewed before becoming non-throwaway implementation.

Forbidden shapes:

- generated shared DTOs that mix SUT and evaluation fields;
- generated public contracts that become the first authority for ownership boundaries;
- generated documentation that overclaims acceptance, compatibility, or production readiness.

Required checks:

- generated public contracts, shared packages, fixture projections, simulator records, capture records, and inspection surfaces receive explicit review.

Eligible protection mechanisms:

- automated-test
- manual-review

Expected test modes:

- contract
- negative

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: generated claim-bearing contracts are reviewed against active rules.

Failure consequences:

- merge-blocking
- promotion-blocking

Review question: did generation introduce hidden ownership, state, boundary, or claim assumptions?

### ENG-CLAIM-001 - Claim Domain Separation

Rule revision: `R2`

Governing sources:

- `OPEN_QUESTIONS.md V0.2.18`

Scope: docs, tests, reports, traces, demos, README text, and review language.

Applies when: an artifact describes capability, compatibility, evaluation, scoring, acceptance, readiness, or conformance.

Rule: engineering conformance, evaluated behavioral compatibility, and milestone acceptance are separate claim domains.

Forbidden shapes:

- presenting engineering conformance as evaluated behavioral compatibility;
- presenting development traces or conformance tests as formal evaluation evidence;
- claiming milestone acceptance before the applicable acceptance question resolves.

Required checks:

- artifact labels and documentation use claim language that matches their domain;
- compatibility claims trigger the relevant evaluation-record metadata question.

Eligible protection mechanisms:

- static
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded
- CI-required

Minimum claim-support enforcement: claim-bearing artifacts use bounded language and trigger required open questions.

Failure consequences:

- claim-blocking
- promotion-blocking

Review question: which claim domain does this artifact support, and what does it not support?

### ENG-CLAIM-002 - Formal Evaluation Artifact Reservation

Rule revision: `R2`

Governing sources:

- `OPEN_QUESTIONS.md V0.2.18`
- `ADR-004 R3`
- `ADR-005 R2`

Scope: evaluation records, reports, comparisons, and scoring language.

Applies when: artifacts use formal evaluation, scoreability, pass evidence, campaign, acceptance, or milestone-complete language.

Rule: formal evaluation artifacts remain inactive/reserved until their governing open questions and record contracts resolve. Development artifacts and engineering conformance results are not promoted, copied, renamed, or described as formal evaluation evidence.

Forbidden shapes:

- `formal_campaign_record`, `pass_evidence`, `accepted_slice`, `milestone_complete`, or equivalent labels before governing decisions allow them;
- using internal scoring-related evaluation package data to imply final scoreability.

Required checks:

- reports and docs distinguish development artifact, engineering conformance result, and formal evaluation artifact.

Eligible protection mechanisms:

- static
- manual-review

Expected test modes:

- contract

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: formal-evaluation language is absent or authorized by governing decisions.

Failure consequences:

- claim-blocking

Review question: does this artifact imply formal evaluation evidence before the formal record contract exists?

### ENG-CHANGE-001 - Open Question Trigger Discipline

Rule revision: `R2`

Governing sources:

- `OPEN_QUESTIONS.md V0.2.18`

Scope: implementation work that crosses unresolved governance frontiers.

Applies when: implementation introduces or claims a capability, state transition, external operation, derived artifact, user-facing exposure, or compatibility claim that depends on unresolved control.

Rule: implementation stops and re-triages the relevant open question before the first non-throwaway use or claim that depends on an unresolved control.

Forbidden shapes:

- implementing production memory, retrieval, trust-boundary routing, final scoreability, formal evaluation-record metadata, product surfaces, or continuity claims under selected-slice assumptions;
- burying an open-question trigger inside code.

Required checks:

- review asks whether the change triggers `SLICE-005`, `EVAL-004`, `EVAL-005`, `DEP-003`, `REPO-001`, `MEM-*`, `TRUST-*`, `PROD-*`, `SURF-*`, `CONT-*`, or `LEG-*`.

Eligible protection mechanisms:

- manual-review

Minimum promotion integration:

- local-recorded

Minimum claim-support enforcement: triggered open questions are resolved or scoped before dependent claims.

Failure consequences:

- promotion-blocking
- claim-blocking

Review question: does this change depend on an unresolved control or claim frontier?

## External References

These references inform the engineering shape. Zoey governing documents remain authoritative.

- NIST SP 800-218, Secure Software Development Framework: <https://csrc.nist.gov/pubs/sp/800/218/final>
- Google Engineering Practices, Code Review Standard: <https://google.github.io/eng-practices/review/reviewer/standard.html>
- Google Engineering Practices, Small CLs: <https://google.github.io/eng-practices/review/developer/small-cls.html>
- OWASP SAMM Policy And Compliance: <https://owaspsamm.org/model/governance/policy-and-compliance/>
