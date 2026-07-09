# Zoey Evaluation Instructions

Template ID: `ZOEY-CODEX-AGENTS-EVAL`

Template version: `V0.2.0`

Integration: `CODEX_INTEGRATION.md` `V0.1.0`

Instantiation: starting nested evaluation guidance. Local specialization is allowed; inherited active rules must not be weakened.

This directory is evaluation-owned implementation code.

Apply the root repository instructions first, then this evaluation-specific guidance.

## Evaluation Boundary Rules

- `[ENG-CONF-IMPORT-002]` Evaluation code may depend on the declared SUT public boundary only.
- `[ENG-CONF-EVIDENCE-001]` Claim-relevant selected-slice behavior must be driven through the declared SUT public boundary.
- `[ENG-CONF-PAYLOAD-001]` Fixture/oracle records may be answer-bearing internally, but full records never cross SUT ingress.
- `[ENG-CONF-PAYLOAD-002]` Rejected SUT ingress must leave no semantic residue.
- `[ENG-CONF-ROLE-001]` Projections into SUT must preserve role and state origin.
- `[ENG-CONF-REF-001]` SUT-visible references and handles must not encode evaluation context.

Evaluation projections must not produce undeclared SUT fields. Do not rely on evaluation filtering as the sole boundary protection; SUT ingress remains the authoritative closed contract and must reject invalid boundary payloads before semantic ingestion.

## Harness And Simulator Rules

- `[ENG-CONF-HARNESS-001]` The harness transports SUT-selected material output; it does not choose among competing SUT outputs.
- `[ENG-CONF-RUN-001]` Independent runs begin with isolated SUT run state. Harness/test fixture reuse must not make prior semantic state available to a fresh run.
- `[ENG-CONF-SIM-001]` The simulator realizes SUT-selected proposal intents or behavior dispositions.
- `[ENG-CONF-CAPTURE-001]` Capture/reporting collect evidence; they do not repair missing SUT state or relation evidence.

Simulator outputs returning to SUT use the same closed-ingress barrier as fixture inputs. The simulator must not repair SUT behavior, decide semantic correctness, own branch gates, or leak canonical-match facts to the SUT.

## Capture, Reporting, And Claims

- `[ENG-CONF-CLAIM-001]` Development artifacts and engineering conformance results are not formal evaluation evidence.
- `[ENG-CLAIM-001]` Keep engineering conformance, evaluated behavioral compatibility, and milestone acceptance separate.
- `[ENG-CLAIM-002]` Do not claim formal evaluation evidence before the governing record contract allows it.

Logs, snapshots, replay, and restore paths must not reintroduce evaluation-only metadata into SUT behavior. Do not use captured SUT state as fixture input merely because capture can read it.

## Review Focus

Before completing an evaluation change, check whether it affects:

- fixture projection;
- harness delivery or arbitration;
- simulator realization;
- run isolation;
- capture/reporting;
- oracle-visible evidence;
- SUT ingress payloads;
- replay/restore;
- artifact labels or claims.

If yes, update tests or the conformance ledger for the applicable `ENG-CONF-*` and `ENG-CLAIM-*` rules.
