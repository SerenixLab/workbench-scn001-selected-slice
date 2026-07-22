import assert from "node:assert/strict";
import test from "node:test";

import { SUT_PUBLIC_BOUNDARY_METHODS, createSutBoundary } from "@zoey/scn001-sut-core";

import {
  executeDeterministicQualification,
  executeDeterministicQualificationForMechanismTest
} from "../src/deterministicQualificationRunner.js";
import { createFormalCampaignFixture } from "../test_support/formalCampaignFixtures.js";
import {
  createFixtureQualificationStartAttestationBytes
} from "../test_support/anchorFixture.js";

test("qualification derives equivalence from two actual executions per path", async () => {
  const setup = await createFormalCampaignFixture();
  const result = await executeDeterministicQualification(inputFor(setup, "actual"));
  assert.equal(result.result_classification, "QUALIFIED");
  assert.equal(result.executions.length, 8);
  assert.equal(result.comparisons.length, 4);
  assert.ok(result.comparisons.every((comparison) => comparison.equivalent === true));
  for (const path of new Set(result.executions.map((execution) => execution.path_id))) {
    const pair = result.executions.filter((execution) => execution.path_id === path);
    assert.equal(pair[0].comparator_input_digest, pair[1].comparator_input_digest);
    assert.notEqual(pair[0].oracle_projection_digest, pair[1].oracle_projection_digest);
  }
});

test("qualification rejects a signed start bound to a substituted session scope", async () => {
  const setup = await createFormalCampaignFixture();
  const input = inputFor(setup, "wrong-scope");
  input.fresh_start_attestor = async (request) => signedStart({
    ...structuredClone(request),
    run_scope_id: "run-scope:substituted"
  });
  await assert.rejects(
    () => executeDeterministicQualification(input),
    /signed payload conflicts on run_scope_id/
  );
});

test("one execution divergence mechanically derives NOT_QUALIFIED", async () => {
  const setup = await createFormalCampaignFixture();
  const firstExecution = setup.qualificationPlan.identity_payload.execution_slots[0].execution_id;
  const result = await executeDeterministicQualificationForMechanismTest(
    inputFor(setup, "divergent"),
    (slot, createMechanismSession) => {
      const base = createSutBoundary();
      const boundary = Object.freeze(Object.fromEntries(SUT_PUBLIC_BOUNDARY_METHODS.map(
        (method) => [
          method,
          slot.execution_id === firstExecution && method === "emitAvailableOutputs"
            ? () => []
            : (...argumentsReceived) => base[method](...argumentsReceived)
        ]
      )));
      return createMechanismSession({ path_id: slot.path_id }, boundary);
    }
  );
  assert.equal(result.result_classification, "NOT_QUALIFIED");
  assert.equal(result.comparisons.filter((entry) => entry.equivalent === false).length, 1);
  assert.equal(result.comparisons[0].mismatch_class, "VALUE_MISMATCH");
});

function inputFor(setup, suffix) {
  return {
    store: setup.store,
    plan: setup.qualificationPlan,
    behavior_manifest: setup.behaviorManifest,
    evaluation_manifest: setup.evaluationManifest,
    authorizing_namespace: setup.qualificationNamespace,
    anchor_receipt: setup.qualificationReceipt,
    anchor_public_key: setup.anchorPublicKey,
    fresh_start_attestor: async (request) => signedStart(request),
    artifact_namespace: `artifact:qualification-runner:${suffix}`,
    result_artifact_id: `artifact:qualification-result:${suffix}`,
    validation_artifact_id: `artifact:qualification-validation:${suffix}`,
    evidence_producer_identity: "actor:qualification-runner",
    evidence_validator_identity: "actor:qualification-evidence-validator",
    result_producer_identity: "actor:qualification-result-producer",
    result_validator_identity: "actor:qualification-result-validator",
    sealed_at: "2026-07-22T17:00:00Z"
  };
}

function signedStart(request) {
  return createFixtureQualificationStartAttestationBytes({
    ...structuredClone(request),
    challenge: `challenge:${request.execution_id}`,
    issued_by: "actor:external-gate",
    observed_by: "actor:external-gate",
    start_event_id: `event:start:${request.execution_id}:${request.run_scope_id}`,
    producer_identity: "actor:external-start-platform",
    issued_at: "2026-07-22T16:59:00Z"
  });
}
