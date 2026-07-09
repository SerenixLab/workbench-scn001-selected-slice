# ADR-002: SCN-001 System-Under-Test Boundary

Status: `Accepted`

Date: 2026-07-07

Accepted: 2026-07-07

Record revision: `R2`

Decision authority: project owner

Related open question: `EVAL-006`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.6`
- `decisions/ADR-001-first-vertical-slice.md` `R1`

Post-decision register state: `OPEN_QUESTIONS.md` `V0.2.7` records `EVAL-006` as resolved by this ADR and activates selected-slice `GROW-001` and `TIME-001`.

## Decision

For the first `SCN-001` milestone, use a transition-inside boundary.

The harness supplies synthetic interaction events, fixture time facts, fixture surface/context labels, bounded Japanese task events, task-mode labels, item correctness observations, user feedback events, and a bounded low-consequence tutoring-trial affordance set. The system under test owns the semantic transitions required to make the run falsifiable: stale-history handling, attributed assertion handling, bounded comparison of dimension-specific observations, scoped trial-candidate formation or selection, candidate-bound trial proposal, trial activation after control checks, correction handling, current-session and later behavior disposition, intervention-conditioned outcome update with material context lineage, and exposure of effective state for oracle inspection.

The first boundary requires two distinct SUT-owned transition chains:

```text
dimension-specific calibration observations
    -> bounded recognition/production comparison
    -> production-responsive trial candidate
    -> proposal bound to the selected candidate
    -> user response supplied by harness and bound to the actual proposal
    -> scope, current/stale-basis validity, applicable user-governed constraints, reversibility, consequence, and applicability checks
    -> active production-focused trial
    -> retained trial, explicit drill preference, and short-term outcome remain separate
```

and:

```text
prior scoped drill evidence
    + current-session user correction
    + spontaneous-production context
    -> immediate current-session behavior correction
    -> inspectable current-session behavior disposition
    -> separately attributable delayed-correction trial candidate
    -> active scoped trial, if control checks pass
    -> retained active trial persists across the synthetic interaction boundary
    -> later behavior disposition is selected from retained trial state
    -> observed outcome updates the trial with material context lineage and without proving the causal theory
```

The harness may bound the fixture and supply raw or fixture-authoritative facts. It must not satisfy the central first-milestone claim by handing the SUT the materially correct trial candidate, pre-labeling later feedback as intervention-conditioned evidence, accepting a proposal the SUT did not actually surface, selecting the later correction policy, dynamically curating the available affordance set from the evidence whose effect is being tested, or reconstructing required retained trial state between interactions.

This ADR answers only the system-under-test boundary for `EVAL-006`. It does not define implementation architecture, repository boundaries, storage engines, model/runtime choices, real personal-history custody, voice/avatar behavior, external operations, Japanese pedagogy, final state schemas, oracle fixtures, nondeterministic acceptance policy, or acceptance gates.

Acceptance of this ADR resolves `EVAL-006` for the first `SCN-001` milestone boundary.

## Relationship To ADR-001 And EVAL-006

`ADR-001` accepted `SCN-001 V0.2.2: Japanese Longitudinal Development` as the first vertical-slice pressure path and made `EVAL-006` the next active question.

`EVAL-006` asks which semantic inputs, control facts, time events, external behavior, and cognitive candidates are inside the selected first-slice system under test versus supplied by the harness or simulated dependencies.

This ADR defines that split. Its acceptance resolves `EVAL-006` for the first milestone only and enables re-triage of the next evaluation, growth, time, and state questions. It does not claim that the first milestone passes full `SCN-001`.

## Thin SCN-001 Transition Map

The first milestone should exercise this thin path:

1. Harness initializes synthetic prior Japanese practice history with old beginner-session events, occurrence/order time, an evaluation-only retention basis, and a known practice gap.
2. Harness supplies a fixed or independently declared low-consequence tutoring-trial affordance set for the tested behavior configuration, including the possibility of no trial, deferral, or more calibration when evidence is insufficient.
3. The user resumes practice and makes conflicting self-assessments.
4. The SUT records those as attributed statements and avoids creating current skill facts from either source alone.
5. The SUT marks old history relevant but stale for current-skill authority using the supplied chronology and the accepted selected-slice time/staleness rule.
6. Harness supplies calibration task events, item correctness observations, and task-mode labels.
7. The SUT derives and preserves the bounded recognition/production comparison and may form a weak scoped interpretation or hypothesis.
8. The SUT forms or selects a reversible production-responsive trial candidate from the bounded observation pattern and available low-consequence trial affordances.
9. The SUT produces an inspectable proposal or offer bound to the selected trial candidate's material intent.
10. A simulated interaction dependency may realize the proposal's language without replacing its material trial intent.
11. Harness supplies a user response bound to the actual proposal. An unbound or ambiguous response cannot serve as activation basis without further clarification.
12. The trial candidate remains non-active until the bound user response and activation checks support activation.
13. After acceptance, the SUT checks scope, current/stale-basis validity, applicable user-governed constraints, reversibility, consequence, and current applicability, then activates the production-focused trial.
14. A simulated tutoring dependency realizes the selected trial intent through fixture drill content and correctness observations.
15. The harness supplies the explicit immediate-correction request during the focused drill, drill outcome facts, and positive drill feedback.
16. The SUT stores the explicit drill preference, production-trial state, and short-term outcome separately.
17. Harness advances to a later synthetic spontaneous spoken-interaction context and supplies the over-aggressive-interruption event and correction-friction facts.
18. The SUT handles the user's "let me finish first here" correction immediately, without erasing prior differently scoped drill evidence.
19. The SUT emits or maintains an inspectable current-session behavior disposition for the corrected scope.
20. The SUT forms a separate delayed-correction trial candidate for spontaneous production: delay minor correction until turn completion unless drill mode or explicit immediate-correction opt-in applies.
21. The SUT activates that scoped trial only after checking scope, current/stale-basis validity, applicable user-governed constraints, reversibility, consequence, and applicability.
22. Harness advances to a later synthetic spontaneous session.
23. The SUT reads retained active trial state and emits an inspectable behavior disposition for the later context before outcome events are supplied.
24. A simulated surface/tutoring dependency realizes that behavior disposition in the synthetic interaction.
25. Harness supplies raw observed outcome facts, user feedback, and any fixture-declared material context changes or concurrent interventions.
26. The SUT records the outcome as intervention-conditioned evidence tied to the active behavior disposition, trial, and material context lineage, without treating it as proof of the causal theory.
27. When asked why behavior changed, the SUT produces an explanation support record and user-facing explanation grounded in retained state, not hidden narrative generation.

## Boundary Table

| Material transition or responsibility | Boundary class | First-milestone expectation |
| --- | --- | --- |
| Synthetic prior Japanese practice history exists before the run | Harness-supplied | The harness provides old beginner-session event history, prior particle-error observations, prior drill feedback, and source/order metadata as fixture state. |
| Evaluation-only retention basis exists | Harness-supplied | The fixture supplies a bounded basis: purpose `SCN-001 first-milestone trajectory and oracle inspection`, permitted use limited to the named run, and discardable after evaluation. |
| Evaluation-only retention basis is applied | Inside system under test | The fixture supplies eligible state classes for run-scoped retention. The SUT applies that bounded basis and preserves required retained state. This milestone does not claim general retention minimization or real user-memory policy. |
| Fixture state persists across the evaluated trajectory | Inside system under test | State whose cross-interaction persistence is part of the evaluated boundary must survive relevant synthetic interaction boundaries inside the SUT. Disposable means discardable after the evaluation, not stateless between steps. |
| Real authoritative Zoey personal history or continuity exists | Excluded | The milestone uses synthetic or disposable fixture state only and makes no real continuity claim. |
| Prior event times, current scenario time, and session ordering are known | Harness-supplied | The harness supplies enough chronology to support stale-history and later-interaction checks. |
| Old history is marked relevant but stale for current-skill authority | Inside system under test | The SUT evaluates stale applicability under the selected-slice time/staleness rule; old history may guide context but cannot become current proficiency. |
| General scheduler, expiry, freshness, due-state, or longitudinal clock machinery | Deferred | The boundary needs only the selected-slice time/staleness semantics needed for this path. |
| User resume request and conflicting self-assessments are received | Harness-supplied | The harness supplies utterance events. |
| Resume request and self-assessments become attributed statements rather than current facts | Inside system under test | The SUT records source, time/context, attribution, and epistemic status. |
| Calibration exercise content, task-mode labels, and item correctness observations | Simulated dependency | A fixture scorer supplies item/task correctness and declared activity dimensions. It does not supply global proficiency, "weak production", learning-style, causal, motivational, or trial-selection conclusions. |
| Recognition and spontaneous-production evidence are compared | Inside system under test | The SUT derives and preserves the bounded dimension-specific pattern rather than collapsing observations into one scalar skill judgment. |
| Weak scoped interpretation or hypothesis about production difficulty is formed or withheld | Inside system under test | A separately retained hypothesis is optional. If formed or retained, it must expose lineage, scope, confidence or uncertainty, and enough status for the oracle to detect unsupported generalization. |
| Low-consequence tutoring-trial affordance set is available | Simulated dependency | The affordance set is fixed or independently declared for the tested behavior configuration before the calibration evidence under comparison is introduced. It may expose possible trial directions such as recognition-focused practice, spontaneous-production-focused practice, whole-pattern review, no trial, deferral, or more calibration. It does not rank or choose the trial. |
| Affordance availability stays independent of the tested evidence | Harness-supplied | The harness must not dynamically curate available trial directions based on the calibration evidence whose effect on SUT trial selection is being evaluated. Paired counterfactuals should use the same affordance set unless an affordance change is explicit and excluded from the evidence-responsive-selection claim. |
| Production-focused behavioral-trial candidate is formed or selected | Inside system under test | The SUT selects a materially evidence-responsive trial candidate from bounded observations and available affordances, or withholds trial formation when evidence is insufficient. The candidate is not active yet. |
| Candidate-bound production-trial proposal is produced | Inside system under test | The SUT emits an inspectable offer or proposal bound to the selected candidate's material trial intent. Candidate existence alone is not user acceptance. |
| Proposal wording is realized | Simulated dependency | A simulated interaction layer may realize wording, but it must not replace the material trial intent. |
| User response to production-trial proposal is supplied | Harness-supplied | The response must reference or semantically respond to the actual surfaced proposal. A fixed acceptance that silently corrects a wrong or missing proposal is invalid as activation basis. |
| Accepted production-trial candidate becomes active | Inside system under test | The SUT checks scope, current/stale-basis validity, applicable user-governed constraints, reversibility, consequence, and current applicability before activation. Acceptance is not merely decorative. |
| Drill item generation and Japanese correction content | Simulated dependency | The simulated tutoring dependency realizes the selected trial intent through fixture content and correctness observations. The SUT does not need real Japanese pedagogy. |
| Immediate correction is requested within the focused drill | Harness-supplied | The harness supplies the explicit request event. |
| Immediate correction is scoped to the focused drill | Inside system under test | The SUT distinguishes explicit drill preference from broader correction policy. |
| Drill outcome and positive feedback are observed | Harness-supplied | The harness supplies raw short-term accuracy and user-feedback facts. |
| Drill preference, production-trial state, and short-term outcome are retained separately | Inside system under test | The SUT must not claim long-term efficacy from drill outcome alone. |
| Later spontaneous voice-session context exists | Harness-supplied | The harness supplies a synthetic surface/context label; no real voice stack is in scope. |
| Real voice, STT, TTS, avatar, Live2D, prosody, or embodied behavior | Excluded | The milestone may reason over supplied context labels but may not claim voice/avatar behavior. |
| Initial over-aggressive interruption occurs in the spontaneous session | Harness-supplied | The harness supplies this event. The milestone does not test whether the SUT would independently avoid this initial overgeneralization. |
| User says "let me finish first here" | Harness-supplied | The harness supplies the correction utterance. |
| Current-session behavior changes immediately after correction | Inside system under test | The SUT applies the correction in the current scope and preserves the prior differently scoped drill evidence as historical evidence. |
| Current-session behavior disposition is inspectable | Inside system under test | After the correction event, the SUT emits or maintains an inspectable current-session disposition, such as delaying minor correction until turn completion in the current spontaneous session, with basis in the user correction event. |
| Future delayed-correction trial candidate is created | Inside system under test | The candidate is distinct from the direct current-session instruction and from focused-drill preference. It is scoped to spontaneous production unless drill mode or explicit immediate-correction opt-in applies. |
| Delayed-correction trial candidate becomes active | Inside system under test | The SUT checks scope, current/stale-basis validity, applicable user-governed constraints, reversibility, consequence, and current applicability before activation. This ADR does not decide whether all future trials require explicit approval. |
| Applicable active trial influences later behavior selection | Inside system under test | Before outcome evidence is supplied, the SUT reads retained active trial state and emits an inspectable behavior disposition for the later context. |
| Realization of correction wording or timing in synthetic interaction | Simulated dependency | The simulator may realize the selected disposition, but must not independently choose the correction policy being tested. |
| Later user outcome feedback and longer speaking observation | Harness-supplied | The harness supplies raw observed outcome facts, user statement, and any fixture-declared material context changes or concurrent interventions, not the semantic conclusion to draw from them. |
| Outcome updates delayed-correction trial as intervention-conditioned evidence | Inside system under test | The SUT identifies the active intervention context, behavior disposition, material context lineage, and any fixture-declared co-interventions. It may strengthen the observed-effect record but must not prove an untested cause or treat omitted co-changes as ruled out. |
| Effective state and transition evidence are exposed for inspection | Inside system under test | Inspection evidence must come from the effective SUT state and transition basis used to select later behavior, not from a free-standing self-description. |
| Oracle collection, rendering, normalization, or scoring | Harness-supplied | The harness or oracle may collect and render exposed evidence. Actual oracle data and scoring belong to later evaluation decisions. |
| Explanation support record and user-facing explanation | Inside system under test | The SUT must identify retained state and transition basis supporting consequential claims, while exposing uncertainty. This is not hidden chain-of-thought. |
| Private learning-history disclosure across real actors, audiences, or trust boundaries | Deferred | The first milestone may carry context labels but does not decide user-facing disclosure policy. |
| Full 40-session longitudinal anti-sycophancy drift detection | Deferred | The first milestone must preserve enough lineage for later trajectory inspection but does not claim full longitudinal-variant pass. |
| SCN-001 adversarial variants and nondeterministic acceptance policy | Deferred | These belong to later fixture, oracle, and acceptance-gate questions. |
| Calendar mutation, external operations, actor-assurance events, and provider reconciliation | Excluded | Those are `SCN-002` pressures and are not part of this milestone. |

## Maximum First-Milestone Claim Envelope

This ADR does not itself authorize any capability claim. Actual milestone claims require accepted `EVAL-002`, `EVAL-003`, and `SLICE-005` decisions and evidence satisfying those artifacts.

Subject to those later decisions, this boundary can support evidence for this maximum claim:

Under synthetic `SCN-001` fixture inputs and this boundary, the tested configuration can preserve and transition selected semantic state across interactions such that later behavior disposition is selected from retained, attributable evidence and correction history, while inspection output distinguishes assertion, observation, interpretation, trial candidate, active trial, behavior disposition, outcome, correction, and uncertainty.

This boundary cannot support claims of:

- full `SCN-001 V0.2.2` pass;
- any pass of mandatory adversarial variants or the full longitudinal variant;
- that Zoey teaches Japanese well;
- that Zoey has assessed real Japanese proficiency;
- real user-memory custody or durable Zoey continuity;
- real voice/avatar behavior;
- external-operation safety or authority handling;
- general memory architecture, final state schema, storage engine, model/runtime, or product workflow readiness;
- context discovery, retrieval quality, relevance selection, or active cognitive-frame assembly from a larger available-state set unless later `EVAL-001` puts those responsibilities inside the tested boundary;
- open-ended trial invention or autonomous experimental creativity beyond the bounded affordance set supplied to the tested configuration;
- independent avoidance of the initial overgeneralization from focused-drill correction to spontaneous interaction, because that over-aggressive-interruption event is fixture-supplied in this thin path.

## Claim Types This Boundary May Support

If later evaluation artifacts provide sufficient oracle data and acceptance semantics, this boundary may support evidence that the tested configuration:

- treats old practice history as relevant but stale;
- retains user self-assessments as attributed statements without turning them into current facts;
- derives and preserves a bounded recognition/production comparison from item correctness observations and task-mode labels;
- forms or selects a reversible production-focused trial candidate from Zoey-available evidence inside the declared context boundary rather than only replaying explicit user preference;
- keeps trial-candidate formation, candidate-bound proposal, user response, and active-trial activation separate;
- applies user correction immediately in scope while preserving prior differently scoped or apparently conflicting evidence;
- forms a separate delayed-correction trial candidate rather than converting a current-session instruction into a global preference;
- carries an active scoped trial across a later interaction;
- selects a later behavior disposition from retained active trial state before outcome evidence is supplied;
- records intervention-conditioned outcome evidence without treating it as independent proof of the theory that caused the intervention;
- explains changed behavior from inspectable retained state and transition basis.

## Claims Not Allowed

Not allowed from this milestone:

- "Zoey passed `SCN-001`."
- "Zoey has a complete growth system."
- "Zoey has learned the user's Japanese learning style."
- "Zoey knows the user's current Japanese level."
- "Immediate correction helps the user learn" as a general or long-term efficacy claim.
- "Voice users prefer delayed correction" or "text users prefer direct correction."
- "The user is bad at particles," "bad at Japanese," or "bad at languages."
- "The user was tired" unless the fixture supplies Zoey-available evidence sufficient for that narrower claim.
- "The system is ready for real personal memory, real voice, or external operations."

## Minimal State-Inspection Output Expectations

The first milestone does not need a final schema, but inspection output must expose at least:

- run boundary and baseline identifiers, including this ADR, `SCN-001 V0.2.2`, and the synthetic fixture name;
- behavior configuration identifier for the tested SUT;
- evaluation-only retention basis, permitted use, run scope, and discard-after-trajectory status;
- retained event history with source, occurrence/order time, observation time where relevant, surface/context label, and fixture provenance;
- attributed user assertions distinct from objective or operationally authoritative facts;
- calibration and drill observations with task-mode labels and item correctness preserved separately from derived interpretations;
- bounded comparison of recognition and production evidence with lineage to the underlying observations;
- any retained scoped interpretation or hypothesis, if formed, with evidence lineage, scope, confidence or uncertainty marker, and enough status for the oracle to detect unsupported generalization;
- behavioral-trial records with candidate/proposed/accepted/active/narrowed/retired status, proposal binding where applicable, activation basis, declared scope, reversibility/correction path, current/stale-basis check, applicable user-governed-constraint check, and outcome lineage;
- proof that required retained trial state persisted across the evaluated trajectory inside the SUT rather than being reconstructed by the harness;
- explicit user preferences or corrections distinct from Zoey-derived trial candidates and active trials;
- current-session behavior dispositions after user correction, including their correction-event basis and scope;
- later behavior dispositions emitted before outcome evidence, including the retained active trial state they used;
- intervention-conditioned outcome records that identify the active trial, behavior disposition, material context lineage, and any fixture-declared co-interventions under which the outcome was observed;
- any applicable narrowing or supersession history after user correction, plus preservation of prior scoped drill evidence and later correction;
- explanation support records linking the final "why are you correcting differently now" answer to retained state and transition basis rather than hidden narrative generation;
- enough transition timestamps or ordering markers to show that later behavior used prior retained state, not a post-hoc rewrite.

Inspection evidence must come from the effective SUT state and transition basis that the SUT actually uses to select later behavior. A cognition-generated narrative, explanation, or self-described state object cannot be the sole evidence that the state existed or influenced behavior. The state reference used by later behavior disposition must be inspectably the same active trial state whose lineage and activation basis are evaluated.

Explanation support records identify retained state and transition basis supporting consequential claims. They are not hidden model reasoning traces and do not require exposing hidden chain-of-thought.

## Minimum Paired Counterfactual Requirement

The full `SCN-001` adversarial suite remains out of scope for this first boundary. However, the first milestone cannot earn an evidence-responsive or scope-responsive trial claim from the canonical path alone.

Any first-milestone claim of evidence-responsive trial formation or scope-responsive trial application under this boundary requires at least one paired counterfactual capable of distinguishing the claimed response from canonical-path or fixture-position hardcoding. `EVAL-002` decides the fixture/oracle path, and `SLICE-005` decides the acceptance gate.

Candidate paired counterfactuals:

- Calibration counterfactual: recognition and spontaneous-production observations show no material difference. The SUT must not form the production-focused trial solely from stale particle history or fixture position.
- Correction-scope counterfactual: the later context is a voice accuracy drill with explicit immediate-correction opt-in. The SUT must not apply a broad "voice means delayed correction" policy.

These counterfactuals do not establish full `SCN-001` pass. They prevent the narrow first-milestone claim from being satisfied by a canonical-path switch statement.

## Demo-Gaming Risks

The boundary is designed to prevent these narrative-only successes:

| Risk | Boundary response |
| --- | --- |
| A demo hardcodes the final explanation while no state actually changed. | Explanation must be backed by inspectable event, assertion, interpretation where applicable, trial, correction, behavior disposition, and outcome records. |
| The harness supplies all semantic transitions and the SUT only replays them. | Bounded comparison, trial-candidate formation, trial activation, correction handling, later behavior disposition, and outcome update remain inside the SUT. |
| The SUT activates a trial before user acceptance. | Candidate formation, user acceptance, and activation after control checks are separate transitions. |
| The harness accepts an invisible or wrong proposal. | User response must be bound to the actual candidate-specific proposal surfaced by the SUT. |
| The harness supplies the materially correct central trial candidate. | The first growth-milestone claim requires the SUT to form or select the central scoped trial from Zoey-available observations and bounded affordances. |
| The harness curates the affordance menu from the tested evidence. | The affordance set is fixed or independently declared before the evidence under comparison and should stay stable across paired counterfactuals where relevant. |
| The system is forced to change after every experience. | The affordance set must allow no-trial, deferral, or more-evidence outcomes when support is insufficient. |
| The fixture scorer gives the semantic answer. | The scorer may supply item correctness and task dimensions, not global proficiency, latent weakness, causal interpretation, or trial selection. |
| The trial state never affects later behavior. | The SUT must emit a behavior disposition from retained active trial state before the harness supplies outcome evidence. |
| The immediate correction is only a status flag. | The SUT must expose a current-session behavior disposition after the correction event. |
| The harness reconstructs active trial state before each interaction. | Scenario-internal retained state needed for the cross-interaction claim must persist inside the SUT. |
| The harness pre-labels later feedback as intervention-conditioned evidence. | The harness supplies raw outcome facts; the SUT identifies active intervention context and uncertainty. |
| The outcome record privileges the trial while omitting material co-changes. | Outcome records must preserve fixture-declared context changes and co-interventions, and must not treat omitted co-changes as ruled out. |
| The system stores a scalar "particle skill" and claims adaptation. | Recognition and production evidence must remain distinct, and global skill or identity claims are prohibited. |
| The system merely replays explicit user preferences. | The production-focused trial candidate and later delayed-correction trial candidate have distinct bases and must remain inspectable. |
| The system treats positive feedback as proof of a broad learning style. | Outcomes are intervention-conditioned and scoped; untested causal explanations remain uncertain. |
| The system erases differently scoped or apparently conflicting history after correction. | Prior drill feedback and later voice correction must both remain inspectable with any applicable supersession, narrowing, or scope distinctions. |
| The system claims voice behavior because the scenario says "voice." | Voice is only a supplied context label; real voice/avatar behavior is excluded. |
| The system claims a full scenario pass from a base-path demonstration. | The first milestone claim envelope is explicitly narrower than full `SCN-001` pass. |

## Re-Triage Notes

Acceptance of this ADR does not automatically activate every selected-slice trigger check. The register remains authoritative.

`GROW-001` is active in the post-decision register state. The selected boundary depends on a minimum criterion for when behavior is a scoped cross-interaction behavioral trial rather than situational posture or durable developmental adaptation. The active scope remains selected-slice narrow; it does not need to solve general developmental adaptation theory.

`TIME-001` is active in the post-decision register state. This ADR chooses SUT-owned stale-history handling from supplied chronology, so a minimal selected-slice time/staleness contract is needed before oracle and state decisions. The register will decide whether this is a narrowed `TIME-001` answer or requires a new linked evaluation-time question under the ID rules.

`MEM-001` need not become active from this ADR alone because the retained state is synthetic fixture state under an evaluation-only retention basis, not real personal state or durable Zoey continuity. Real personal retention still requires register re-triage before non-throwaway use.

`EVAL-001` and `EVAL-003` are open but not the current active frontier. `EVAL-002`, `SLICE-002`, and `SLICE-005` remain blocked by intervening questions. Their eventual answers must respect this accepted boundary unless it is amended or superseded.

## Follow-On Questions After Acceptance

Following acceptance of this ADR, likely next questions are:

- `GROW-001`: define the selected-slice minimum criteria for trial candidate, active scoped trial, situational correction, and unsupported durable adaptation.
- `TIME-001` or a linked selected-slice time question: define the minimal chronology/staleness contract needed for stale-history handling and later-interaction ordering.
- `EVAL-001`: decide whether the first milestone tests context discovery or receives curated scenario context from the harness.
- `EVAL-002`: define fixture and oracle data for this boundary without requiring hidden chain-of-thought, including the paired counterfactual path.
- `EVAL-003`: define nondeterministic-run handling and hard invariant failures.
- `SLICE-002`: decide the minimum selected-slice state needed after the fixture and evaluation boundary are known.
- `SLICE-005`: define the acceptance gate and claim language for the first milestone.
- `EVAL-005`: later, identify which unresolved questions affect scoreability and which can be carried as bounded assumptions.

## Reconsideration Triggers

Reconsider this ADR if:

- `EVAL-001` shows context discovery must remain inside the SUT for the evidence-responsive trial transition to be meaningful;
- `EVAL-002` cannot define calibration inputs without supplying the interpretation or trial candidate the SUT is meant to form;
- `EVAL-002` cannot bind user responses to the SUT's actual surfaced proposal without making a product/UI decision outside this milestone;
- `EVAL-002` cannot keep the trial-affordance set independent of the evidence under comparison;
- `GROW-001` shows the selected cross-interaction behavior does not satisfy minimum trial semantics and is merely situational posture or stored preference;
- the SUT cannot produce an inspectable later behavior disposition causally dependent on retained trial state without adding a broad tutoring/runtime system;
- `TIME-001` shows stale-history handling cannot remain inside the SUT under fixture chronology without introducing unresolved time semantics;
- a minimally valid counterfactual cannot distinguish evidence-responsive trial formation or scope-responsive trial application from canonical-path hardcoding;
- oracle inspection can only rely on SUT self-report rather than the effective state used to drive later behavior;
- the boundary forces real personal-history custody, real voice/avatar behavior, or real Japanese pedagogy contrary to `ADR-001`.

## Consequences

Positive:

- Keeps the first `SCN-001` milestone falsifiable without requiring real personal memory, voice, or pedagogy.
- Leaves evidence-derived trial formation, candidate-to-active control, correction handling, and later behavior disposition inside the SUT.
- Forces state inspection to carry enough provenance and lineage to reject plausible retrospective storytelling.
- Separates trial-intent selection from Japanese exercise realization.
- Preserves `ADR-001` guardrails against premature general architecture.
- `Thin` here means narrow integration, product, and trust-boundary scope; it does not mean removing the developmental semantic chain that the milestone exists to falsify.

Negative:

- The first boundary is more demanding than a bookkeeping or candidate-supplied fixture.
- The harness must be precise enough that fixture-supplied facts do not smuggle in the behavior being tested.
- `GROW-001` and selected-slice time/staleness work likely become blocking after acceptance.
- The milestone still cannot claim full `SCN-001` pass.
- Later questions must still define fixture/oracle data, nondeterministic acceptance, minimum selected-slice state, and the first acceptance gate.

## Non-Decisions

This ADR does not decide:

- final state schema;
- persistence mechanism;
- storage engine;
- model, runtime, prompt, or agent structure;
- product surface or UI;
- Japanese curriculum, exercise generation, or grading quality;
- real voice or avatar behavior;
- real personal-history custody or recovery;
- external operations;
- acceptance-gate scoring;
- full longitudinal drift-detection criteria;
- general developmental adaptation theory;
- general governed-clock or scheduling architecture;
- whether `TIME-001` is narrowed directly or split under a new linked question during register re-triage.
