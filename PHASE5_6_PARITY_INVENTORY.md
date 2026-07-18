# Phase 5–6 Closure-Parity Inventory

This inventory is a review aid for the bounded SCN-001 implementation. The
governance lock, accepted ADRs, selected-slice profile, and conformance ledger
remain authoritative. This file neither defines semantics nor counts as formal
evaluation evidence.

## Invariants used throughout

`C` means that the package-local creator resolver requires one claimant, exact
`createdByTransitionRef` equality, and exactly one occurrence of the created
record in `resultReferences`. `T` means exact transition keys, SUT family and
origin, kind, interaction, result, ordered inputs, and ordered results. `R`
means exact typed outbound relation cardinality and metadata. `I` means exact
run-local source binding plus original/current ingestion and chronology. `G`
means the bounded global family cardinality is checked. `P` means validation is
passive, replay-stable, and covered by no-mutation attacks.

Exact first-ingestion closure is bidirectional for fixture-initialized
communications: every additional result must be a valid initialized assertion,
and every newly retained fixture-initialized communication must contribute
exactly one such result. Redelivery of an already retained communication does
not create or require a second initialized assertion.

SUT and evaluation use separate private implementations. The shared item is the
test concept, not a semantic validator.

## Family matrix

| Retained family or closure | SUT authority | Passive evaluation authority | Covered closure | Hostile coverage |
| --- | --- | --- | --- | --- |
| Focused request attribution (Phase 5 foundation) | `focusedDrill.js` `validateFocusedDrillAttribution` | `directCorrectionCheckpoint.js` `validateExactAttribution` | `C T R I G P`; exact assertion schema, actor, source and communication basis, with one assertion per source communication | creator/input/result, competing assertion, actor, relation, ingestion, order, replay |
| Scoped current correction/control | `directCorrection.js` `validateDirectCorrectionStateClosure` | `directCorrectionCheckpoint.js` `findExactDirectCorrectionRealization` | `C T R I G P`; exact state schema, controls, scope and attribution | creator-pointer, schema, source/input substitution, relation and chronology |
| Direct current-session disposition | `directCorrection.js` `validateDirectCorrectionDispositionClosure` | `directCorrectionCheckpoint.js` `findExactDirectCorrectionRealization` | `C T R G P`; exact state ancestry, scope and behavior | creator-pointer, competing identity, basis, transition and replay |
| Direct realization | `directCorrection.js` `resolveDirectCorrectionRealizationClosure` | `directCorrectionCheckpoint.js` `findExactDirectCorrectionRealization` | `T R I G P`; exact requested target, simulator fact and recording transition | indirect/duplicate claimants, ingestion, actor, relation, order and mismatch |
| Delayed-correction candidate | `delayedCorrection.js` `validateDelayedCorrectionCandidateClosure` | `delayedCandidateCheckpoint.js` `findExactDelayedCorrectionCandidate` | `C T R I G P`; exact focused/direct lineage, controls, immutable non-active state | creator, transition, lineage, policy source, relation and competing identity |
| Delayed activation assessment | `delayedCorrection.js` `validateDelayedActivationAssessmentClosure` | `delayedActiveCheckpoint.js` `findExactActiveDelayedCorrectionTrial` | `C T R I G P`; exact nine checks and retained material basis | creator, result multiplicity, check, retention singleton, relation and scope |
| Active delayed trial | `delayedCorrection.js` `validateActiveDelayedCorrectionTrialClosure` | `delayedActiveCheckpoint.js` `findExactActiveDelayedCorrectionTrial` | `C T R G P`; exact candidate/assessment ancestry and active scope | creator, transition, ancestry, scope and competing trial |
| Same-run state projection | `laterUse.js` `validateLaterStateProjectionClosure` | `laterUseCheckpoint.js` `validateExactLaterProjection` | `C T R I G P`; opaque reference contributes identity only | rule/view/target rewrite, creator, duplicate projection and relation attacks |
| Later applicability assessment | `laterUse.js` `validateLaterUseAssessmentClosure` | `laterUseCheckpoint.js` `findExactLaterUse` | `C T R I G P`; exact current scope, controls and active-trial projection | stored-result promotion, scope, attribution, transition, ingestion and support |
| Later behavior disposition | `laterUse.js` `validateLaterDispositionClosure` | `laterUseCheckpoint.js` `findExactLaterUse` | `C T R G P`; exact assessment result and bounded behavior | result/scope rewrite, competing identity, relation and replay |
| Later realization | `laterUse.js` `resolveLaterRealizationClosure` | `laterUseCheckpoint.js` `findExactLaterRealization` | `T R I G P`; exact target and fidelity with no false record creation | partial/competing transitions, premature relation, mismatch and ingestion |
| Later outcome | `laterOutcome.js` `validateLaterOutcomeClosure` | `laterOutcomeCheckpoint.js` `findExactLaterOutcome` | `C T R I G P`; exactly one outcome and linked uncertainty, association only | extra/duplicate outcome, promotion, raw substitution, relation and transition |
| Outcome uncertainty | `laterOutcome.js` `validateLaterOutcomeClosure` | `laterOutcomeCheckpoint.js` `findExactLaterOutcome` | `C T R G P`; exactly one uncertainty and complete non-exhaustive limits | extra/duplicate uncertainty, excluded causes, undeclared relation and basis |
| Explanation request attribution | `laterOutcome.js` `validateExplanationAttribution` | `laterOutcomeCheckpoint.js` `validateAttribution` | `C T R I G P`; exact assertion, actor, relations and chronology | creator/schema/family/origin, input/result, duplicate assertion, actor/relation |
| Explanation limitations | `laterOutcome.js` `validateExplanationClosure` | `laterOutcomeCheckpoint.js` `findExactExplanation` | `C T G P`; exactly one of each required type and exact shared result set | duplicate reference, extra known/unknown limit, rewrite and creator ambiguity |
| User-facing explanation | `laterOutcome.js` `validateExplanationClosure` | `laterOutcomeCheckpoint.js` `findExactExplanation` | `C T G P`; exact SUT template and independently bounded evaluator-owned closed sentence grammar with benign wording variance | extra identity, unrecognized/mixed clauses, causal/global/permanent/style/efficacy/fatigue/focused/hidden claims, plus an accepted benign variant |
| Explanation support | `laterOutcome.js` `validateExplanationClosure` | `laterOutcomeCheckpoint.js` `findExactExplanation` | `C T R I G P`; exact complete selected lineage and no hidden reasoning | extra support, missing/substituted lineage, result, relation and stale history |
| Relevant temporal assessments | `runState.js` temporal closure validators plus strict creator primitive | `laterOutcomeCheckpoint.js` `validateTemporalAssessment` | `C T R I P`; selected and co-created result multiplicity, source and age | selected/distractor duplicate result, creator, age, source and omission |

## Processing and output boundaries

| Boundary | Contract | Regression coverage |
| --- | --- | --- |
| `processCurrentInteraction()` | Successful ingress remains retained. Any thrown semantic-processing pass restores records, relations, order allocation, actor/source indexes, and pending position to the post-ingress checkpoint. An ordinary premature explanation is unavailable; terminal explanation artifacts without an outcome are corruption and fail transparently. | premature explanation, no-outcome orphan terminal families, late explanation failure and deterministic retry, late direct failure, later-use failure, no partial projection/attribution/relations/order, subsequent ordinary progress |
| `emitAvailableOutputs()` | zero returns the declared frozen empty result; one returns the exact frozen output; more than one raises bounded integrity failure without selection or mutation | genuine proposal/direct and duplicate focused-family ambiguity, zero/one replay, harness no-arbitration test |

## Review use

Any future Phase 5–6 change must identify the affected row and preserve symmetry
through each domain's own validator and mutation attacks. A checked row describes
the corrected engineering baseline only; it does not establish a formal
evaluation record, compatibility, scoreability, milestone completion, or
production readiness.
