import assert from "node:assert/strict";
import test from "node:test";

import { createSutBoundary, SUT_PUBLIC_BOUNDARY_METHODS } from "../index.js";

test("the public boundary exposes only non-answer-selecting lifecycle, ingress, output, and inspection operations", () => {
  const boundary = createSutBoundary();

  assert.deepEqual(Object.keys(boundary).sort(), [...SUT_PUBLIC_BOUNDARY_METHODS].sort());
  for (const method of SUT_PUBLIC_BOUNDARY_METHODS) {
    assert.doesNotMatch(method, /(decision|expected|transition)/i);
  }
});

test("public boundary operations reject extra arguments instead of accepting answer selectors", () => {
  const boundary = createSutBoundary();

  assert.throws(
    () => boundary.startRun({ expectedTransition: "trial_formation" }),
    /startRun accepts exactly 0 argument/
  );
});
