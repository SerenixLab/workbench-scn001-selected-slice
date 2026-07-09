# ADR-001: First Vertical Slice Pressure Path

Status: `Accepted`

Date: 2026-07-07

Accepted: 2026-07-07

Record revision: `R1`

Decision authority: project owner

Related open question: `SLICE-001`

Decision-Time Baselines:

- `SYSTEM_THESIS.md` `V0.3.1`
- `CANONICAL_SCENARIOS.md` `V0.2.2`
- `STATE_AND_CONTROL_MODEL.md` `V0.4.1`
- `OPEN_QUESTIONS.md` `V0.2.2`

Initial post-decision register state: `OPEN_QUESTIONS.md` `V0.2.3` records `SLICE-001` as resolved by this ADR and `EVAL-006` as active.

## Decision

Select `SCN-001 V0.2.2: Japanese Longitudinal Development` as the canonical pressure path for Zoey's first vertical-slice implementation sequence.

This ADR selects the scenario pressure source. It does not claim a complete `SCN-001` implementation, define the system-under-test boundary, define the first milestone acceptance gate, or decide future repository/module boundaries.

The first implementation milestone derived from this decision should be harness-first and state-inspection-first. It should not be a polished tutoring product, a voice/avatar product, or a reconstruction of Yuki.

## Evidence Inputs

This decision is based on:

- `CANONICAL_SCENARIOS.md V0.2.2`, especially `SCN-001` and `SCN-002`;
- `STATE_AND_CONTROL_MODEL.md V0.4.1`, especially scenario alignment and generalized control obligations;
- `OPEN_QUESTIONS.md V0.2.2`, especially `SLICE-001`, `EVAL-006`, and the Open Question Index;
- legacy inspection of Yuki material concerning session events, memory/growth planning, retrieval/context flow, and evidence-dashboard direction;
- legacy inspection of Iris/Specialized-LLM material concerning control-plane discipline, policy/capability separation, audit, artifact/state tracking, and evidence/replay direction.

Both scenarios are compared at the thinnest fixture-first boundary that can still keep their central semantic transition inside the future system under test. Real voice infrastructure, real calendar integration, real personal-history custody, production UI, and final storage/runtime choices are excluded from this comparison.

Legacy leverage claims in this ADR are qualitative planning evidence based on prior project inspection. This decision establishes no legacy component reuse, migration, or extraction claim; concrete reuse evidence remains subject to the applicable `LEG-*` questions.

## Decision Rationale

The decisive criterion is early falsification value against Zoey's controlled-growth thesis.

`SCN-001` directly pressures stale history, attributed evidence, scoped interpretation, behavioral trials, user correction, intervention-conditioned outcomes, anti-sycophancy, and trajectory drift. These are the less-solved and more Zoey-specific problems.

`SCN-002` has crisper operation checkpoints and will be essential counter-pressure, but choosing it first risks making Zoey's first executable abstraction an Iris-like operation/control kernel with developmental continuity added later.

This decision accepts that `SCN-001` is harder to evaluate. It remains justified only if `EVAL-006` can keep at least one meaningful cross-interaction growth/trial transition inside the declared system-under-test boundary.

## Evidence Matrix

| Dimension | `SCN-001`: Japanese Longitudinal Development | `SCN-002`: Voice-Originated Calendar Mutation | Judgment |
| --- | --- | --- | --- |
| Central thesis risk pressured | Controlled growth, memory provenance, scoped adaptation, anti-sycophancy, medium-scoped behavior, user correction, and trajectory drift. | Actor assurance, authorization, operation safety, external source of truth, disclosure, reconciliation, and practical delegation. | Both are central; `SCN-001` tests the less-solved developmental thesis first. |
| Required semantic transitions | Stale history -> attributed assertions/observations -> scoped evidence-responsive trial formation or selection, optionally informed by provisional interpretation or hypothesis -> active behavioral trial -> intervention-conditioned outcome -> later behavior change -> trajectory inspection. | Utterance event -> actor assurance -> target resolution -> proposal -> authorization -> pre-action validation -> external mutation -> uncertain outcome -> reconciliation -> audit. | `SCN-001` exercises growth semantics; `SCN-002` exercises operation semantics more crisply. |
| Required state pressure | Event history, attributed assertions, calibration observations, active trial state, user correction, explanation provenance, and enough lineage to derive trajectory inspection. Developmental adaptation state is required only if introduced. | Operation intent, actor assurance state, external projection, proposal, authorization binding, submission, outcome, reconciliation, and audit/accountability state. | Both require inspectable state. `SCN-001` pressures cross-interaction state and correction; `SCN-002` pressures authority-bearing operation state. |
| Fixture-first dependencies | Synthetic Japanese sessions, calibration fixture, simulated user feedback, governed clock, and inspectable developmental-state output. | Semantic voice-origin event fixture, actor-assurance fixture, deterministic simulated calendar source, simulated provider outcome, reconciliation fixture, and inspectable operation-state output. | At equal thinness, `SCN-001` is still narrower because it avoids external-authority and side-effect semantics. |
| Legacy leverage | Yuki offers relevant examples and negative lessons around session history, memory/growth planning, retrieval/context flow, and evidence-dashboard direction. Voice/STT pieces are out of scope for the first thin slice. | Iris/Specialized-LLM offers relevant examples and negative lessons around policy/capability separation, audit, operation state, artifact/state tracking, and control-plane discipline. | Legacy material is evidence and candidate mechanism material only. This ADR does not authorize migration or extraction. |
| Shared harness/control leverage | Both lineages contain useful lessons for replay, event logging, provenance, state inspection, runtime fixtures, and evidence presentation. | Both lineages contain useful lessons for replay, event logging, provenance, state inspection, runtime fixtures, and evidence presentation. | Do not map Yuki to `SCN-001` and Iris to `SCN-002` as conceptual poles. |
| Demo-gaming risk | High. A fake system can hardcode tutoring behavior or produce a plausible retrospective story. Requires state checkpoints, adversarial pressure, and longitudinal evidence. | Medium-high. A fake system can script a happy operation path, but operation components are easier to inspect. | `SCN-001` has higher evaluation ambiguity but higher thesis falsification value. If `EVAL-006` cannot make it inspectable, reconsider this ADR. |
| Architecture overbuild pressure | Risk of prematurely defining a general memory/personality/adaptation architecture from one scenario. | Risk of prematurely defining a general operation kernel, authorization model, audit store, and external-action architecture from one scenario. | Both carry capture risk. `SCN-001` is acceptable only if derived abstractions remain scenario-provisional. |
| Triggered question frontier | Selecting `SCN-001` resolves the pressure-path choice and triggers re-triage under `OPEN_QUESTIONS.md`. | Selecting `SCN-002` would resolve the pressure-path choice and trigger re-triage under `OPEN_QUESTIONS.md`. | The register, not this matrix, controls activation order. `EVAL-006` is next if this ADR is accepted. |
| First evaluator checkpoints | Stale-history handling, recognition/production split, trial formation or selection, trial activation, user correction, intervention-conditioned outcome, explanation provenance, and trajectory pressure. | Actor assurance, target resolution, proposal, authorization binding, material-state validation, uncertain outcome, reconciliation, and audit truth. | `SCN-002` checkpoints are crisper. `SCN-001` checkpoints are harder but closer to Zoey's distinct unresolved risk. |
| Cross-scenario transfer | Pressures provenance, lifecycle, correction, time, explanation, and trajectory semantics that may later be challenged by operation authority. | Pressures authority, audit, reconciliation, and side-effect truth that may later challenge growth-derived abstractions. | `SCN-002` remains mandatory counter-pressure before `SCN-001`-derived abstractions can be treated as general Zoey architecture. |
| Time to first falsifiable run | Planning judgment: likely moderate with synthetic sessions and explicit state checkpoints. | Planning judgment: likely moderate-high because side-effect and authority semantics must still be simulated coherently. | This is not measured prototype evidence; it is a comparative planning judgment. |

## System-Under-Test Boundary Implication

This ADR does not define the system-under-test boundary.

Following acceptance of this ADR, the next active question is `EVAL-006`: define what the selected slice must produce versus what the harness supplies.

The first-slice claim must enumerate every material scenario transition supplied by the harness or simulated dependency. The slice may claim evidence only for semantic responsibilities that remain inside the declared system-under-test boundary.

## First Thin-Milestone Scope Boundaries

These boundaries apply only to the first thin milestone derived from this pressure path:

- real authoritative personal history is out of scope;
- real durable Zoey continuity is out of scope;
- the first run uses synthetic or explicitly disposable fixture state;
- disposable fixture state may persist across the simulated interactions and time transitions required by the evaluated path; disposable means it is not authoritative real-user Zoey continuity and may be discarded after the evaluation trajectory, not that the harness may reconstruct required retained state before every interaction;
- introducing real personal history requires register re-triage before non-throwaway use;
- avatar, Live2D, embodied presence behavior, real voice, STT, and TTS are out of scope;
- calendar mutation and other external side-effect operations are out of scope;
- embeddings, adapters, training examples, learned profiles, final storage engines, and final runtime choices are out of scope unless introduced by a later accepted decision;
- no claim may be made that Zoey teaches Japanese well.

No claim of full `SCN-001 V0.2.2` pass is allowed until the canonical base path, all mandatory adversarial pressure paths, and the required longitudinal variant satisfy the applicable harness acceptance policy. Early milestones must state the narrower path, boundary, and criteria actually tested.

## Post-Acceptance Register Effect

Acceptance of this ADR resolved `SLICE-001`. The authoritative downstream question state is maintained in `OPEN_QUESTIONS.md`; this ADR does not independently redefine later activation order.

The first post-decision register effect is:

- `SLICE-001` becomes `Resolved` by this ADR.
- `EVAL-006` becomes the next `Active` question.
- `TIME-001` and `GROW-001` have their triggers satisfied and must be re-triaged; they do not automatically join the active blocking frontier.
- `EVAL-001`, `EVAL-003`, and other slice-specific trigger checks remain subject to re-triage after `EVAL-006`.
- `EVAL-002`, `SLICE-002`, `DEP-001`, and later questions remain blocked according to `OPEN_QUESTIONS.md` until their dependencies are satisfied.

The Open Question Index remains authoritative for status, dependency, and activation order.

## First-Slice Guardrails

State contracts, internal boundaries, and abstractions derived solely from `SCN-001` remain scenario-provisional. They must not be described as the general Zoey kernel, general memory architecture, final project boundary, or final module split until challenged against `SCN-002` authority and operation pressure.

`SCN-002` remains mandatory counter-pressure against over-generalizing from developmental semantics. This ADR does not decide the exact second implementation milestone or any sequencing beyond the first pressure path.

## Reconsideration Triggers

Reconsider this ADR if:

- `EVAL-006` cannot leave at least one evidence-responsive, cross-interaction behavioral-trial transition inside the system under test without substantially expanding scope;
- the first falsifiable `SCN-001` path requires real personal-history custody, voice infrastructure, or a broad tutoring architecture contrary to the first thin-milestone scope boundaries;
- re-triage shows the active dependency frontier is materially broader than assumed in this comparison;
- legacy evidence demonstrates a materially thinner `SCN-002` falsification path than the equivalent `SCN-001` path;
- first-slice implementation begins defining general Zoey architecture from `SCN-001`-specific semantics before `SCN-002` has challenged those abstractions.

## Consequences

Positive:

- Tests Zoey's controlled-growth thesis before the system becomes an operation engine.
- Keeps the first implementation free from calendar/provider/authentication dependencies.
- Forces inspectable state and explanation provenance early.
- Uses legacy evidence without preserving Iris or Yuki as identity-bearing systems.

Negative:

- Harder to score than an operation path.
- Higher risk of plausible narrative success unless the harness inspects state.
- Does not prove external operation safety, actor assurance, auditability, or practical delegation.
- May bias early abstractions toward growth and memory unless the guardrails and future `SCN-002` counter-pressure are enforced.

## Non-Decisions

This ADR does not decide:

- repository boundaries;
- final state schema;
- memory storage engine;
- vector store or embedding use;
- model/runtime choice;
- real Japanese pedagogy;
- voice/avatar product behavior;
- legacy migration plan;
- GitHub repository layout;
- second-slice sequencing.
