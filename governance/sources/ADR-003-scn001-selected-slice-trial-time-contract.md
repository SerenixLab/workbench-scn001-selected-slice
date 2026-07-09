# ADR-003: SCN-001 Selected-Slice Trial And Time Contract

Status: `Accepted`

Date: 2026-07-07

Accepted: 2026-07-07

Record revision: `R2`

Decision authority: project owner

Resolved question IDs: `GROW-001`, `TIME-002`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.9`
- `decisions/ADR-001-first-vertical-slice.md` `R1`
- `decisions/ADR-002-scn001-system-under-test-boundary.md` `R2`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.10` records `GROW-001` and `TIME-002` as resolved by this ADR, keeps `TIME-001` deferred, and activates `EVAL-001` and `EVAL-003`.

## Decision

Adopt one ADR with two independently referenced selected-slice decisions under accepted `ADR-002`:

- Decision A, for `GROW-001`: selected-slice trial semantics.
- Decision B, for `TIME-002`: selected-slice chronology and staleness semantics.

For the first `SCN-001` milestone, the system under test may support scoped, reversible behavioral trials that cross the synthetic interaction boundary. It must not claim durable developmental adaptation, a full growth architecture, general time machinery, scheduler behavior, reminders, due-state handling, or expiry machinery.

The harness supplies bounded events, observations, user responses, context labels, and chronology facts. The SUT owns the selected semantic transitions: stale-history classification, trial-candidate formation, candidate-bound proposal where applicable, activation-basis validation, active-trial transition, current-session correction disposition, later behavior disposition, and intervention-conditioned outcome update.

Acceptance of this ADR resolves `GROW-001` through Decision A and `TIME-002` through Decision B for the first `SCN-001` milestone only. This ADR does not amend the `ADR-002` SUT boundary or resolve the broader deferred governed-clock question in `TIME-001`.

## Critical Analysis Of The Current Gap

The current documents are directionally consistent, but several constraints are not yet tight enough for `EVAL-002`, `SLICE-002`, or `SLICE-005`.

1. `ADR-002` requires trial candidates, candidate-bound proposal where applicable, active trials, narrowing/retirement, and unsupported durable adaptation boundaries, but it does not define the minimum semantic distinctions. Without this, a fixture could pass by storing one generic preference or one generic adaptation record.
2. `ADR-002` requires activation checks for both the production-focused trial and the delayed-correction trial, but only the production-focused path clearly includes a candidate-bound proposal and user acceptance. The delayed-correction path needs a selected-slice activation basis that remains weaker than a durable preference and stronger than mere current-session posture.
3. The docs say old history is relevant but stale, while also requiring the SUT to own stale-history handling. `TIME-002` must prevent the harness from smuggling in the stale judgment while still giving the SUT reproducible chronology.
4. `SCN-001` allows evaluator inspection of adaptation candidates or active adaptations, while `ADR-002` forbids first-milestone durable adaptation claims. The selected slice must reconcile this by allowing no active durable adaptation and, at most, an unsupported or withheld adaptation boundary.
5. The phrase "trial crosses an interaction boundary" can be mistaken for scheduler, reminder, due, expiry, or autonomous background-maintenance scope. The selected slice needs only retained trial state plus supplied session ordering.
6. The State and Control Model requires stale-basis checks, user-governed constraints, scope, consequence, and reversibility, but the first milestone has not named the minimum inspection fields needed to show those checks occurred without prescribing a final schema.

The smallest fix is one joint selected-slice contract with independently inspectable trial and time decisions. Stale-basis validity is one of the activation and later-use checks for trial state, so the two decisions are coupled, but they remain distinct. `TIME-001` retains the broader deferred governed-clock question; this ADR addresses the narrower selected-slice time question as `TIME-002`.

## Selected-Slice State Meanings

### Direct Situational Correction

A direct situational correction is an immediate behavior change in the current interaction or current declared scope because the user corrected Zoey or gave a valid scoped instruction.

Minimum requirements:

- basis is the user correction or instruction event, with source, chronology, and context preserved;
- scope is current-session or otherwise explicitly narrow from the user's wording and context;
- current behavior changes immediately where the correction is applicable;
- prior differently scoped evidence is not erased;
- the correction is not silently promoted to a future preference, active trial, or durable adaptation.

In the selected path, "Don't stop me mid-sentence like that here. Let me finish first." directly supports a current-session spontaneous-production behavior disposition. Any future generalization remains a separate Zoey-derived trial candidate.

### Trial Candidate

A trial candidate is a possible provisional behavior transition that is not yet active. It may be generated from bounded observations, attributed history, explicit user request, current correction, or governed exploration.

A selected-slice behavioral trial must have an attributable provisional or evaluative purpose. It changes behavior under bounded uncertainty so that observed outcomes may inform whether the behavior should be preserved, narrowed, changed, or retired. Scope and reversibility alone do not make a preference, direct instruction, situational posture, or procedure a trial.

Minimum requirements:

- material trial intent is identifiable;
- provisional or evaluative purpose is identifiable;
- outcome relevance is identifiable without claiming that the trial's causal theory is proven;
- basis and evidence lineage are retained;
- candidate source is distinguishable, such as Zoey inference, explicit user request, user correction, or exploration;
- proposed scope is declared across relevant dimensions such as subject, activity, task mode, surface/context label, audience where relevant, temporal relation, and consequence ceiling;
- reversibility or correction path is identifiable;
- current/stale-basis status is not assumed;
- candidate status is inspectable;
- no candidate affects later behavior as an active trial until activation basis and activation checks are satisfied.

The SUT may withhold trial formation, ask for more evidence, defer, or record insufficient support. The affordance set must allow those outcomes.

### Active Scoped Trial

An active scoped trial is a retained, provisional, reversible behavior change with an attributable trial purpose that may influence later behavior disposition inside its declared scope.

Minimum requirements:

- activation basis is satisfied and inspectable;
- activation checks have passed;
- active scope is no broader than the basis supports;
- active trial can be narrowed, retired, corrected, or superseded;
- later behavior disposition can reference the retained active trial state before outcome evidence is supplied;
- outcomes are recorded as intervention-conditioned and scoped, not as proof of the causal theory that motivated the trial;
- active trial state remains distinct from explicit user preference, direct situational correction, short-term outcome, and durable developmental adaptation.

An active scoped trial may cross synthetic interaction boundaries under the evaluation-only retention basis. That persistence is not a claim of real Zoey continuity or real personal-memory custody.

### Unsupported Durable Developmental Adaptation

For the first `SCN-001` milestone, durable developmental adaptation is unsupported.

The SUT must not activate or claim a durable developmental adaptation when a proposed semantic effect would:

- change Zoey's future tendencies, habits, procedures, or defaults beyond a scoped reversible trial;
- create a broad learning-style, identity, personality, motivation, or proficiency claim;
- claim long-term learning efficacy from short-term or intervention-conditioned outcomes;
- turn a broad surface, domain, activity, or context label such as `voice`, `text`, or `Japanese` into a global policy;
- require longitudinal trajectory controls not present in the first milestone;
- depend on real personal-history continuity, production retention policy, or full growth architecture.

If a broader durable-adaptation effect is actually proposed, valid selected-slice outcomes are: withhold it, narrow it into a scoped trial candidate when independently supported, record a non-activation decision enough for inspection, or retire it. This does not require a general adaptation-state store. An unsupported durable adaptation must not drive later behavior as active state.

## Minimum Semantic Distinctions

The first milestone does not require a final schema and must not collapse all meanings into one exclusive `TrialStatus`. It must preserve these orthogonal distinctions:

| Distinction | Required selected-slice meanings |
| --- | --- |
| Trial lifecycle phase | Candidate, active, and retired. A candidate can exist without being surfaced. |
| Candidate-bound proposal or control relation | Not surfaced, surfaced as a concrete proposal or offer bound to the candidate, superseded, or withdrawn where applicable. Surfacing a proposal does not activate the trial or replace candidate state. |
| Evidence temporal eligibility | Current or applicable for the selected use, stale for current-authority use, temporally insufficient, or unknown. This targets evidence or basis items, not the trial object. |
| Activation-basis assessment | Incomplete, sufficient, insufficient, invalidated, or unresolved conflict. This answers whether a candidate may cross into active trial state now. |
| User response, where applicable | Accepted, rejected, ambiguous, unavailable, or not required. User acceptance attaches to the surfaced proposal or control event, not to every trial lifecycle. |
| Active-trial effective applicability | Currently applicable, narrowed, inapplicable, conflicted, or superseded. This answers whether a historically active trial may influence behavior in the current context now. |
| Non-activation disposition | Withhold, defer, ask for clarification, request more evidence, retire, or keep unsupported for inspection. |
| Durable-adaptation boundary | Unsupported in this milestone, narrowed into scoped trial candidate, withheld, or retired. This is a claim boundary, not a behavior-driving lifecycle phase. |

`Proposed` is not a generic internal candidate phase for this selected slice. It is required only where a candidate is surfaced as a concrete control or interaction proposal to which a later response may bind. Merely forming an inspectable internal candidate does not make it proposed.

`Accepted` is not a generic trial phase. In the production-focused path, the user may accept a proposal and that response becomes part of the activation basis. In the delayed-correction path, a user correction may support the selected activation basis without being an acceptance of a future Zoey-derived trial. In both paths, the SUT must still check scope, stale-basis validity, user-governed constraints, reversibility, consequence, and current applicability before activation.

## Selected Activation Basis

The selected slice has two activation-basis paths.

### Production-Focused Trial

For the calibration-derived production-focused trial:

1. The SUT forms or selects a materially evidence-responsive candidate from bounded recognition/production observations and the fixed or independently declared affordance set.
2. The SUT surfaces an inspectable proposal or offer bound to the candidate's material trial intent.
3. The harness supplies a user response semantically bound to the actual surfaced proposal.
4. An unbound, ambiguous, fixed, or silently corrective response cannot satisfy activation basis.
5. After bound proposal acceptance, the candidate still becomes active only if all activation checks pass.

### Delayed-Correction Trial

For the later spontaneous-production delayed-correction trial:

1. The user's correction changes current-session behavior immediately as direct situational correction.
2. A future delayed-correction trial candidate must be separately attributable to the current correction event, prior scoped drill evidence, and spontaneous-production context.
3. Candidate activation does not require a second explicit approval in this selected slice if the proposed trial is low consequence, reversible, materially close to the correction, and scoped no broader than spontaneous production where drill mode or explicit immediate-correction opt-in remains excluded.
4. If the correction basis is ambiguous, materially broader than the user's wording, consequential, conflicting, or not reversible, the SUT must ask, defer, narrow, or withhold activation.
5. The active trial must remain labelled as Zoey-derived trial state, not as a direct user preference or global correction policy.

For this selected path, "materially close" means the future trial changes the same behavior dimension named by the correction, correction timing, within the same activity class, spontaneous production. It must not introduce a new causal interpretation, target domain, audience, consequence class, cross-surface policy, or global learning-style claim.

This selected basis is narrower than a general rule for all future trials. Later milestones may require explicit approval for broader, higher-consequence, less reversible, or more durable behavior changes.

## Activation Checks

Before any trial candidate becomes active, the SUT must inspectably satisfy these checks:

1. `scope`: the active scope is declared and does not exceed the evidence, request, correction, or proposal basis.
2. `basis_lineage`: supporting events, observations, assertions, corrections, and proposal/response binding where applicable are retained with provenance.
3. `current_stale_basis`: old history is not treated as current skill authority; the active basis includes current or currently applicable evidence sufficient for the selected trial under the `TIME-002` staleness contract.
4. `user_governed_constraints`: explicit preferences, corrections, rules, opt-ins, opt-outs, revocations, and scope conflicts are preserved and evaluated by authority class, applicability scope, current context, specificity, and revocation or supersession. An unresolved material conflict remains inspectable and prevents unsupported activation until clarified, narrowed, or otherwise validly resolved.
5. `reversibility`: the trial can be corrected, narrowed, retired, or superseded without requiring a broad migration or identity change.
6. `consequence`: the trial is low consequence within the fixture and does not affect external operations, disclosure rights, commitments, reminders, or real personal history.
7. `current_applicability`: the current context matches the declared scope, and material context changes or co-interventions do not invalidate the basis.
8. `retention_basis`: retained state is covered by the evaluation-only retention basis and remains disposable after the evaluation trajectory.
9. `non_adaptation_boundary`: activation would not constitute an unsupported durable developmental adaptation.

Failing any check prevents activation. The SUT may narrow the candidate and re-check, ask for clarification, defer, retire the candidate, or keep an unsupported state for inspection.

## Later-Use Applicability Check

Before an active trial influences a later behavior disposition, the SUT must re-evaluate current applicability and any material basis dependency affected by supplied chronology, user-governed state, scope, context, or fixture-declared material change.

`Active` means the trial passed activation at some point. It does not mean indefinitely applicable. At later use, the SUT may apply the trial in scope, narrow it, mark it inapplicable or conflicted, defer, ask for clarification, or retire it. This check may happen synchronously when selecting the later behavior disposition; it does not require background maintenance, scheduler behavior, reminders, due state, or expiry machinery.

`TIME-002` does not define age-based active-trial expiry, trial TTL, or generic trial staleness. Elapsed time alone does not retire an active trial in the first milestone. Later-use review evaluates defined dependencies: current user-governed state, scope, context, fixture-declared material changes, and temporal eligibility of evidence or basis items under selected rules.

## Minimal Harness Chronology Contract

The harness supplies chronology facts, not temporal conclusions.

For each material event or observation, the harness must supply at least:

- stable event or observation identifier;
- source or fixture provenance;
- occurrence order within the synthetic trajectory;
- occurrence time or relative scenario time;
- observation time if materially different from occurrence time;
- session identifier and session order;
- current scenario time at each SUT decision point or enough ordering to derive it;
- surface/context label and task-mode label where relevant;
- relation to fixture-declared material context changes or co-interventions where relevant.

For the stale-history and later-interaction path, the harness must supply enough chronology to distinguish:

- old beginner-session history before the practice gap;
- current resume session;
- calibration events before the production-focused proposal;
- focused drill and immediate-correction request;
- later spontaneous correction session;
- later spontaneous outcome session;
- outcome evidence occurring after the later behavior disposition.

The harness may supply practice-gap duration or raw timestamps from which the gap is derivable. It must not supply qualitative gap labels such as "long", the conclusion "stale for current skill authority", "fresh enough for activation", "currently valid", or any equivalent temporal-applicability verdict.

Exact wall-clock dates, time zones, calendar recurrence, and real clock synchronization are unnecessary unless a later fixture chooses to express scenario time through wall-clock values.

## SUT-Owned Temporal Judgments

Under this selected contract, the SUT owns these temporal judgments:

- each prior practice observation or derived skill-state basis is evaluated for current-authority eligibility in the skill dimension it actually supports;
- a prior practice observation or derived skill-state basis more than 90 scenario days before the current resume decision point is not independently eligible to establish current skill state for that dimension;
- current observations in the same skill dimension may establish a new current basis and may make prior historical evidence relevant as corroborating context, but they do not refresh, rewrite, or update the occurrence time, observation time, age, or independent current-authority eligibility of the prior evidence;
- old history may guide context, calibration choice, or weak hypothesis formation, but cannot by itself establish current proficiency or activate the production-focused trial;
- current calibration observations are temporally applicable to the production-focused trial only if no material supersession or context invalidation occurs before proposal and activation;
- the current-session correction is immediately applicable to current spontaneous-production behavior in that session;
- a delayed-correction future trial can use the current correction as basis only in materially similar later spontaneous-production contexts, excluding focused drill or explicit immediate-correction opt-in;
- later behavior disposition must be selected from retained active trial state after current-applicability review and before the harness supplies later outcome evidence;
- outcome updates must preserve the active intervention context, behavior disposition, chronology, material context lineage, and fixture-declared co-interventions;
- temporal uncertainty, insufficient chronology, an unsatisfied selected temporal dependency, or material context change may require narrowing, deferral, clarification, or withholding activation.

The 90-day threshold is a synthetic selected-slice control rule for prior-evidence current-authority eligibility, not a real Japanese-pedagogy claim and not an active-trial expiry rule. User self-assessment remains an attributed assertion, not a current-skill authority source by itself. Old history remains relevant historical evidence.

## Minimum Inspection Fields

The first milestone remains schema-neutral, but inspection output must expose enough effective state to show:

- event chronology and session ordering used by the SUT;
- evidence temporal eligibility, stale-history judgment, and current-authority basis;
- trial candidate material intent, provisional/evaluative purpose, source, scope, support lineage, lifecycle phase, candidate-bound proposal relation where applicable, activation-basis assessment, and active-trial effective applicability;
- proposal binding and bound user response for the production-focused trial;
- activation-basis type and activation-check results for every active trial;
- later-use applicability review before a retained active trial influences later behavior disposition;
- current-session correction disposition and its current-scope basis;
- distinction between explicit drill preference, production-focused trial, direct correction, delayed-correction trial, and outcome evidence;
- active trial state and later-use applicability basis used by later behavior disposition before outcome evidence;
- outcome record with intervention-conditioned lineage, material context lineage, and co-interventions;
- unsupported durable adaptation boundary where a broader adaptation would otherwise be implied;
- narrowing, retirement, supersession, or conflict history where applicable.

Inspection evidence must come from the effective state and transition basis that the SUT actually uses. A generated explanation or retrospective narrative is not enough.

## Decision Evidence And Boundary Examples

These examples define required semantic boundaries without prescribing final fixture content or schema.

### Direct Correction, Not Trial

If the user says, "Let me finish first here," the SUT may immediately change the current-session correction-timing disposition in that spontaneous-production context. It must not silently create a future preference, active trial, or durable adaptation from that current correction alone.

### Insufficient Evidence, No Trial

If calibration shows no material recognition/production difference and the only production-error support is prior practice evidence more than 90 scenario days old, the SUT must not form a production-focused trial solely from stale historical evidence. Valid outcomes include no trial, more calibration, deferral, or an inspectable insufficient-support disposition.

### Basis Changes Before Activation

If a production-focused candidate is formed but new current observations before proposal acceptance or activation contradict the recognition/production difference, the candidate's activation basis is no longer sufficient by default. The SUT must re-evaluate, narrow, defer, or retire the candidate rather than automatically activating it.

### Unsupported Durable Adaptation

If a proposed effect says "Andrea has a gentle-correction learning style across Japanese and voice," the SUT must not activate it as durable developmental adaptation in this milestone. It may withhold the effect or derive a narrower spontaneous-production correction-timing trial only if that narrower trial is independently supported.

### Temporal Counterfactual

If a prior production observation is 120 scenario days old and no current production observation exists, it is not independently eligible for current-skill authority. If the same old observation is accompanied by current production calibration, the current calibration supplies the current basis and the old observation remains historical corroborating context; the old record itself is not refreshed.

## Downstream Contract For Blocked Questions

`EVAL-002` must define fixture and oracle data that exercise this contract without handing the SUT the semantic answers. In particular, it must include raw chronology, stable affordance sets, proposal-response binding, counterfactual evidence for hardcoding checks, and oracle checks for activation status and stale-basis handling. It must include a temporal counterfactual where comparable retained history is recent enough, or current observations establish current basis clearly enough, that the SUT cannot pass by marking every retained history item stale or by refreshing the old record itself.

`EVAL-002` must declare whether material synthetic context changes and co-interventions are exhaustively represented for the evaluated path. If they are exhaustive, absence from fixture-declared material events may be treated as absence within the synthetic world model only. If they are not exhaustive, the SUT must preserve unknown co-intervention status rather than inferring none.

`SLICE-002` must preserve at least the selected-slice state needed by this contract: event chronology, attributed assertions, observations, trial candidate and active trial semantic distinctions, current-session dispositions, activation-check basis, later-use applicability basis, and outcome lineage. It need not define a final memory architecture.

`SLICE-005` must phrase the first milestone claim as scoped-trial and selected-slice time/staleness evidence only. It must reject claims of durable developmental adaptation, full growth architecture, scheduler behavior, real personal continuity, or full `SCN-001` pass.

## Claim Boundary

If later artifacts provide sufficient fixture and acceptance semantics, this contract may support a claim that the tested configuration:

- marks prior practice evidence relevant but not independently eligible for current skill authority from supplied chronology under the selected synthetic staleness rule;
- forms or selects selected-slice trial candidates, surfaces candidate-bound proposals where the selected activation basis requires them, and activates or applies scoped trials only after the applicable basis and controls are satisfied;
- distinguishes direct situational correction from future trial state;
- carries active scoped trial state across a synthetic interaction boundary under an evaluation-only retention basis;
- selects later behavior from retained active trial state after later-use applicability review and before later outcome evidence;
- records intervention-conditioned outcomes without proving the causal theory.

This contract does not support claims that:

- Zoey has a complete growth or developmental adaptation system;
- any durable developmental adaptation is active;
- Zoey knows the user's current Japanese proficiency beyond bounded fixture evidence;
- Zoey learned a fixed learning style or cross-surface correction preference;
- Zoey can schedule, remind, monitor due state, expire state, or run a general governed clock;
- Zoey has real personal-memory custody, real continuity, real voice behavior, or real Japanese pedagogy.

## Non-Scope

This ADR does not decide:

- final schemas;
- storage, retrieval, embeddings, summaries, adapters, or learned profiles;
- production retention policy or real personal-history custody;
- full developmental adaptation theory;
- trajectory-level drift detection beyond preserving selected lineage;
- scheduler, reminders, watches, due state, expiry machinery, or background temporal maintenance;
- initiative behavior or proactive follow-up;
- external operations;
- real Japanese curriculum, grading, or pedagogy;
- voice, STT, TTS, avatar, or product UI;
- nondeterministic acceptance policy;
- fixture content, oracle scoring, or paired-counterfactual details beyond the contract constraints above.

## Accepted Register Effect

Acceptance by the project owner updates `OPEN_QUESTIONS.md` to:

- move `GROW-001` to `Resolved` with outcome `Decision`, resolved by this ADR's Decision A for the first `SCN-001` milestone;
- move `TIME-002` to `Resolved` with outcome `Decision`, resolved by this ADR's Decision B for the first `SCN-001` milestone;
- keep `TIME-001` deferred for scheduler, reminders, due state, expiry, background temporal maintenance, and full longitudinal governed-clock semantics;
- preserve the bounded non-support of durable developmental adaptation as part of the first milestone claim boundary;
- preserve the explicit non-scope for scheduler, reminders, due state, expiry machinery, full governed-clock architecture, and full growth architecture;
- activate the next decision frontier before `EVAL-002`, `SLICE-002`, or `SLICE-005`.

## Reconsideration Triggers

Reconsider Decision A, the selected-slice trial contract, if:

- the selected delayed-correction trial requires broader user authorization than the low-consequence, reversible selected basis allows;
- oracle inspection cannot show that later behavior used retained active trial state rather than post-hoc explanation;
- `EVAL-002` cannot build fixture data without supplying the trial candidate, activation decision, or later behavior disposition;
- a future amendment needs durable adaptation support or broader trial generalization.

Reconsider Decision B, the selected-slice time contract, if:

- `EVAL-002` cannot build fixture data without supplying the stale judgment;
- `EVAL-002` cannot counterpressure the selected staleness rule without turning the fixture into a hidden answer key;
- stale-history handling requires background time advancement, expiry, reminders, due state, or general scheduler semantics;
- selected trial behavior needs age-based expiry, TTL, or general trial-staleness machinery.

Reconsider the shared first-milestone claim boundary if the first milestone wants to claim durable developmental adaptation, real personal continuity, or full `SCN-001` pass.
