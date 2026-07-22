import assert from "node:assert/strict";
import test from "node:test";

import {
  SUT_PUBLIC_BOUNDARY_METHODS,
  createSutBoundary
} from "@zoey/scn001-sut-core";

import { REQUIRED_CLAIM_CLASSES, REQUIRED_PATHS } from "../src/formalAuthority.js";
import {
  executeSelectedSlicePath,
  executeSelectedSlicePathForMechanismTest
} from "../src/selectedSliceFormalRunner.js";

test("formal runner executes all exact paths and derives complete passing vectors", () => {
  for (const pathId of REQUIRED_PATHS) {
    const result = executeSelectedSlicePath({ path_id: pathId });
    assert.equal(result.path_id, pathId);
    assert.equal(result.run_validity, "VALID");
    assert.equal(result.invariant_result, "INVARIANTS_CLEAR");
    assert.equal(result.failure_assertions.length, 0);
    assert.deepEqual(
      result.obligation_results.map((entry) => entry.claim_class),
      [...REQUIRED_CLAIM_CLASSES].sort()
    );
    assert.ok(result.obligation_results.every((entry) => (
      entry.result === "PASS" || entry.result === "NOT_APPLICABLE"
    )));
    assert.deepEqual(
      result.events.map((event) => event.event_order),
      Array.from({ length: result.event_count }, (_, index) => index + 1)
    );
    assert.ok(result.events.filter((event) => event.event_kind === "DELIVERED").every(
      (event) => Array.isArray(event.source_material) && event.source_material.length > 0
        && event.inspection_after_event.runRef === result.run_ref
    ));
    assert(Object.isFrozen(result));
  }
});

test("formal runner owns outcome fields and rejects caller-selected classifications", () => {
  assert.throws(
    () => executeSelectedSlicePath({
      path_id: REQUIRED_PATHS[0],
      run_validity: "VALID",
      invariant_result: "INVARIANTS_CLEAR",
      obligation_results: []
    }),
    /must name exactly one accepted path/
  );
});

test("missing material output becomes derived failure and downstream not-reached", () => {
  const base = createSutBoundary();
  const boundary = Object.freeze(Object.fromEntries(
    SUT_PUBLIC_BOUNDARY_METHODS.map((method) => [
      method,
      method === "emitAvailableOutputs" ? () => [] : (...argumentsReceived) => (
        base[method](...argumentsReceived)
      )
    ])
  ));
  const result = executeSelectedSlicePathForMechanismTest({
    path_id: "SCN001-SSFO-V0.2.0-CANONICAL-THIN"
  }, boundary);
  const byClaim = new Map(result.obligation_results.map((entry) => [
    entry.claim_class, entry.result
  ]));
  assert.equal(byClaim.get("CC-TIME-STALE-BASIS"), "PASS");
  assert.equal(byClaim.get("CC-EVIDENCE-TRIAL-FORMATION"), "OBLIGATION_FAIL");
  assert.equal(byClaim.get("CC-SCOPE-TRIAL-USE"), "NOT_REACHED");
  assert.equal(byClaim.get("CC-OUTCOME-SEMANTICS"), "NOT_REACHED");
  assert.equal(byClaim.get("CC-EXPLANATION-PROVENANCE"), "NOT_REACHED");
  assert.deepEqual(result.failure_assertions.map((finding) => finding.rule_id), [
    "SCN001-SSFO-V0.2.0-OBL-EVID-004"
  ]);
});
