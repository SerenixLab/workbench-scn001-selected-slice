import assert from "node:assert/strict";
import test from "node:test";

import {
  createBehaviorConfigurationManifest,
  createEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import {
  assertUniqueArtifactReferenceIds,
  createCanonicalArtifact,
  createExactArtifactReference,
  resolveExactArtifactReference,
  validateCanonicalArtifact
} from "../src/formalArtifactIdentity.js";
import {
  REQUIRED_PATHS,
  allocateReplacementAttempt,
  attemptStartAllocationBindingFingerprint,
  createCampaignAuthorization,
  createInitialRunInvalidityDecision,
  createMaterialAuthorityDecision,
  createQualificationPlan,
  createQualificationResult,
  validateCampaignAuthorization,
  validateProspectiveExecutionStartPrerequisites,
  validateQualificationPlan,
  validateQualificationResult
} from "../src/formalAuthority.js";

const digest = (character) => `sha256:${character.repeat(64)}`;

test("generic formal artifacts bind kind, schema, domain, payload, and exact reference", () => {
  const artifact = createCanonicalArtifact({
    artifact_id: "artifact:decision:001",
    artifact_kind: "EVALUATION_DECISION",
    identity_payload: {
      artifact_kind: "EVALUATION_DECISION",
      schema_id: "zoey.evaluation-decision",
      schema_revision: 1,
      decision_kind: "RUN_INVALIDITY",
      decision_id: "decision:run-invalidity:001"
    }
  });
  assert.equal(validateCanonicalArtifact(artifact), artifact);
  const reference = createExactArtifactReference(artifact);
  assert.equal(resolveExactArtifactReference(reference, artifact), artifact);
  const conflictingReference = {
    ...reference,
    content_fingerprint: digest("f")
  };
  assert.throws(
    () => assertUniqueArtifactReferenceIds(
      [reference, conflictingReference], "hostile reference graph"
    ),
    /repeats artifact identity/
  );
  const tampered = structuredClone(artifact);
  tampered.identity_payload.decision_id = "decision:run-invalidity:favorable-alias";
  assert.throws(() => validateCanonicalArtifact(tampered), /fingerprint mismatch/);
  assert.throws(
    () => createCanonicalArtifact({
      artifact_id: "artifact:bad:001",
      artifact_kind: "BEHAVIOR_CONFIGURATION_MANIFEST",
      identity_payload: {
        artifact_kind: "BEHAVIOR_CONFIGURATION_MANIFEST",
        schema_id: "zoey.behavior-configuration-manifest",
        schema_revision: 1
      }
    }),
    /dual-fingerprint constructor/
  );
  assert.throws(
    () => createCanonicalArtifact({
      artifact_id: "artifact:bad-decision:001",
      artifact_kind: "EVALUATION_DECISION",
      identity_payload: {
        artifact_kind: "EVALUATION_DECISION",
        schema_id: "zoey.evaluation-decision",
        schema_revision: 1,
        decision_kind: "HIDE_ADVERSE_EVIDENCE"
      }
    }),
    /unknown decision_kind/
  );
  assert.throws(
    () => createCanonicalArtifact({
      artifact_id: "artifact:premature-evidence:001",
      artifact_kind: "FORMAL_EVIDENCE_ARTIFACT",
      identity_payload: {
        artifact_kind: "FORMAL_EVIDENCE_ARTIFACT",
        schema_id: "zoey.formal-evidence-artifact",
        schema_revision: 1,
        evidence_kind: "SUT_INPUT_CAPTURE"
      }
    }),
    /has no implemented closed schema/
  );
});

test("qualification plan preallocates two independent executions for every exact path", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  assert.equal(validateQualificationPlan(plan, {
    behaviorManifest: context.behaviorManifest,
    evaluationManifest: context.evaluationManifest
  }), plan);
  assert.equal(plan.identity_payload.execution_slots.length, REQUIRED_PATHS.length * 2);
  for (const path of REQUIRED_PATHS) {
    assert.deepEqual(
      plan.identity_payload.execution_slots
        .filter((slot) => slot.path_id === path)
        .map((slot) => slot.ordinal),
      [1, 2]
    );
  }
  assert.equal(
    plan.identity_payload.execution_evidence_status,
    "DEVELOPMENT_PREFLIGHT_NOT_FORMAL_SUT_EVIDENCE"
  );
});

test("qualification plan rejects incomplete paths, retries, actor collapse, and policy retargeting", () => {
  const context = configurationContext();
  const base = qualificationPlanInput(context);
  base.execution_slots = base.execution_slots.filter(
    (slot) => slot.path_id !== REQUIRED_PATHS[3]
  );
  assert.throws(() => createQualificationPlan(base), /at least two slots/);

  const retryable = qualificationPlanInput(context);
  retryable.allocation_policy.invalid_missing_divergent_disposition = "RETRY_UNTIL_MATCH";
  assert.throws(() => createQualificationPlan(retryable), /non-retryable/);

  const selfValidated = qualificationPlanInput(context);
  selfValidated.validator_identity = selfValidated.producer_identity;
  assert.throws(() => createQualificationPlan(selfValidated), /must be distinct/);

  const plan = qualificationPlan(context);
  const tampered = structuredClone(plan);
  tampered.identity_payload.deterministic_equivalence.comparator_fingerprint = digest("0");
  assert.throws(
    () => validateQualificationPlan(tampered, {
      behaviorManifest: context.behaviorManifest,
      evaluationManifest: context.evaluationManifest
    }),
    /fingerprint mismatch|conflicts with the evaluation manifest/
  );
});

test("qualification result retains all planned executions and derives QUALIFIED exactly", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const result = qualificationResult(context, plan, "QUALIFIED");
  assert.equal(validateQualificationResult(result, {
    plan,
    behaviorManifest: context.behaviorManifest,
    evaluationManifest: context.evaluationManifest
  }), result);
  assert.equal(result.identity_payload.result, "QUALIFIED");
  assert.equal(result.identity_payload.executions.length, plan.identity_payload.execution_slots.length);
  assert.equal(
    result.identity_payload.evidence_class,
    "DETERMINISTIC_QUALIFICATION_ONLY_NOT_FORMAL_SUT_EVIDENCE"
  );
});

test("qualification cannot discard divergence, omit slots, self-validate, or choose a favorable result", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const missing = qualificationResultInput(plan, "QUALIFIED");
  missing.executions.pop();
  assert.throws(
    () => createQualificationResult({
      ...missing,
      behavior_manifest: context.behaviorManifest,
      evaluation_manifest: context.evaluationManifest
    }),
    /retain every planned execution/
  );

  const divergent = qualificationResultInput(plan, "QUALIFIED");
  divergent.comparisons[0].equivalent = false;
  divergent.comparisons[0].mismatch_class = "VALUE_MISMATCH";
  divergent.comparisons[0].details_digest = digest("d");
  assert.throws(
    () => createQualificationResult({
      ...divergent,
      behavior_manifest: context.behaviorManifest,
      evaluation_manifest: context.evaluationManifest
    }),
    /must be derived as NOT_QUALIFIED/
  );

  divergent.result = "NOT_QUALIFIED";
  const retainedDivergence = createQualificationResult({
    ...divergent,
    behavior_manifest: context.behaviorManifest,
    evaluation_manifest: context.evaluationManifest
  });
  assert.equal(retainedDivergence.identity_payload.result, "NOT_QUALIFIED");

  const selfValidated = qualificationResultInput(plan, "QUALIFIED");
  selfValidated.validator_identity = selfValidated.producer_identity;
  assert.throws(
    () => createQualificationResult({
      ...selfValidated,
      behavior_manifest: context.behaviorManifest,
      evaluation_manifest: context.evaluationManifest
    }),
    /must be distinct/
  );
});

test("campaign authorization derives one-run branch and preallocates divergence contingency", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const result = qualificationResult(context, plan, "QUALIFIED");
  const authorization = campaignAuthorization(context, plan, result);
  assert.equal(validateCampaignAuthorization(authorization, {
    behavior_manifest: context.behaviorManifest,
    evaluation_manifest: context.evaluationManifest,
    qualification_plan: plan,
    qualification_result: result
  }), authorization);
  assert.equal(authorization.identity_payload.run_count_branch, "QUALIFIED_ONE");
  assert.equal(authorization.identity_payload.planned_valid_runs_per_path, 1);
  assert.equal(authorization.identity_payload.attempt_slots.length, REQUIRED_PATHS.length);
  assert.equal(authorization.identity_payload.contingency_slots.length, REQUIRED_PATHS.length * 2);
  assert.equal(authorization.identity_payload.campaign_authority_role, "PROJECT_OWNER");
});

test("campaign cannot narrow paths, choose run count, replace hard failure, or self-authorize", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const result = qualificationResult(context, plan, "QUALIFIED");

  const incomplete = campaignAuthorizationInput(context, plan, result);
  incomplete.attempt_slots = [];
  assert.throws(() => createCampaignAuthorization(incomplete), /exactly 1 PRIMARY slots/);

  const selfAuthorized = campaignAuthorizationInput(context, plan, result);
  selfAuthorized.campaign_authority_identity = selfAuthorized.producer_identity;
  selfAuthorized.authorized_by = selfAuthorized.producer_identity;
  assert.throws(() => createCampaignAuthorization(selfAuthorized), /must be distinct/);

  const authorization = campaignAuthorization(context, plan, result);
  const narrowed = structuredClone(authorization);
  narrowed.identity_payload.required_paths.pop();
  assert.throws(
    () => validateCampaignAuthorization(narrowed, {
      behavior_manifest: context.behaviorManifest,
      evaluation_manifest: context.evaluationManifest,
      qualification_plan: plan,
      qualification_result: result
    }),
    /fingerprint mismatch|does not match its sole authority/
  );

  const hardFailureRetry = structuredClone(authorization);
  hardFailureRetry.identity_payload.invalidity_replacement_policy.valid_hard_failure_replaceable = true;
  assert.throws(
    () => validateCampaignAuthorization(hardFailureRetry, {
      behavior_manifest: context.behaviorManifest,
      evaluation_manifest: context.evaluationManifest,
      qualification_plan: plan,
      qualification_result: result
    }),
    /fingerprint mismatch|invalidity\/replacement policy/
  );
});

test("NOT_QUALIFIED selects three fresh runs and forbids one-run contingency semantics", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const resultInput = qualificationResultInput(plan, "NOT_QUALIFIED");
  resultInput.comparisons[0].equivalent = false;
  resultInput.comparisons[0].mismatch_class = "VALUE_MISMATCH";
  resultInput.comparisons[0].details_digest = digest("f");
  const result = createQualificationResult({
    ...resultInput,
    behavior_manifest: context.behaviorManifest,
    evaluation_manifest: context.evaluationManifest
  });
  const input = campaignAuthorizationInput(context, plan, result, 3);
  input.contingency_mode = "NOT_APPLICABLE";
  input.contingency_slots = [];
  const authorization = createCampaignAuthorization(input);
  assert.equal(authorization.identity_payload.run_count_branch, "CONSERVATIVE_THREE");
  assert.equal(authorization.identity_payload.attempt_slots.length, REQUIRED_PATHS.length * 3);
});

test("attempt start requires exact indexed authorization, independent anchor, and causal fresh start", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const result = qualificationResult(context, plan, "QUALIFIED");
  const authorization = campaignAuthorization(context, plan, result);
  const start = executionStartInput(authorization);
  const grant = validateProspectiveExecutionStartPrerequisites(start);
  assert.equal(grant.lifecycle, "authorized");
  assert.equal(grant.authority_status, "READY_FOR_DURABLE_AUTHORITY_RESOLUTION");
  assert.equal(grant.execution_start_authorized, false);
  assert(Object.isFrozen(grant));

  const wrongSlot = executionStartInput(authorization);
  wrongSlot.slot_id = "slot:not-authorized:001";
  assert.throws(() => validateProspectiveExecutionStartPrerequisites(wrongSlot), /not prospectively authorized/);

  const producerReceipt = executionStartInput(authorization);
  producerReceipt.anchor_verification.validator_identity =
    producerReceipt.anchor_verification.producer_identity;
  assert.throws(() => validateProspectiveExecutionStartPrerequisites(producerReceipt), /must be distinct/);

  const replayed = executionStartInput(authorization);
  replayed.fresh_start_proof.start_event_id = replayed.fresh_start_proof.anchor_event_id;
  assert.throws(() => validateProspectiveExecutionStartPrerequisites(replayed), /causal post-anchor closure/);

  const oldOutput = executionStartInput(authorization);
  oldOutput.fresh_start_proof.issued_by = oldOutput.anchor_verification.producer_identity;
  assert.throws(() => validateProspectiveExecutionStartPrerequisites(oldOutput), /causal post-anchor closure/);
});

test("run invalidity remains immutable and replacement allocation enforces stop limits", () => {
  const context = configurationContext();
  const plan = qualificationPlan(context);
  const result = qualificationResult(context, plan, "QUALIFIED");
  const authorization = campaignAuthorization(context, plan, result);
  const first = createInitialRunInvalidityDecision(invalidityInput(
    authorization,
    "artifact:invalidity:001",
    "artifact:run-record:invalid:001",
    "attempt:primary:01:1",
    REQUIRED_PATHS[0],
    "SCN001-SSFO-V0.2.0-VAL-005"
  ));
  const allocation = allocateReplacementAttempt({
    authorization,
    invalidity_decisions: [first],
    target_decision: first
  });
  assert.equal(allocation.replacement_ordinal, 1);
  assert.equal(allocation.outcome_independent, true);
  assert.equal(allocation.lifecycle, "authorized");
  assert.match(allocation.selection_basis_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(allocation.seed_commitment, /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(allocation.seed_commitment, allocation.selection_basis_digest);

  const second = createInitialRunInvalidityDecision(invalidityInput(
    authorization,
    "artifact:invalidity:002",
    "artifact:run-record:invalid:002",
    allocation.attempt_id,
    REQUIRED_PATHS[0],
    "SCN001-SSFO-V0.2.0-VAL-005",
    allocation
  ));
  assert.throws(
    () => allocateReplacementAttempt({
      authorization,
      invalidity_decisions: [first, second],
      target_decision: second
    }),
    /stop\/review limits/
  );

  const unsupportedReason = invalidityInput(
    authorization,
    "artifact:invalidity:bad",
    "artifact:run-record:invalid:bad",
    "attempt:primary:01:1",
    REQUIRED_PATHS[0],
    "OUTCOME_WAS_UNFAVORABLE"
  );
  assert.throws(
    () => createInitialRunInvalidityDecision(unsupportedReason),
    /pre-registered reason code/
  );

  const catalogueAlias = invalidityInput(
    authorization,
    "artifact:invalidity:catalogue-alias",
    "artifact:run-record:invalid:catalogue-alias",
    "attempt:primary:01:1",
    REQUIRED_PATHS[0],
    "SCN001-SSFO-V0.2.0-VAL-999"
  );
  assert.throws(
    () => createInitialRunInvalidityDecision(catalogueAlias),
    /pre-registered reason code/
  );
});

test("material authority changes require distinct review and project-owner acceptance", () => {
  const input = {
    artifact_id: "artifact:authority-decision:001",
    decision_kind: "AUTHORITY_INVALIDATION",
    subject_ref: runRecordReference("artifact:run-record:001"),
    prior_decision_ref: null,
    reason_code: "authority:anchor-receipt-unresolvable",
    original_disposition: "authority_pending_namespace_closure",
    replacement_disposition: "authority_invalidated",
    basis_delta_digest: digest("4"),
    basis_evidence_refs: [evidenceReference("artifact:authority-defect:001")],
    proposed_by: "actor:authority-investigator",
    independent_reviewer: "actor:authority-reviewer",
    review_attestation_ref: evidenceReference("artifact:authority-review:001"),
    owner_identity: "actor:zoey-project-owner",
    owner_decision: "ACCEPTED",
    affected_claims: ["CC-SCOPE-TRIAL-USE"],
    effective_at: "2026-07-21T15:00:00Z",
    effective_by: "actor:zoey-project-owner"
  };
  const decision = createMaterialAuthorityDecision(input);
  assert.equal(decision.identity_payload.decision_kind, "AUTHORITY_INVALIDATION");
  assert.equal(decision.identity_payload.owner_decision, "ACCEPTED");

  assert.throws(
    () => createMaterialAuthorityDecision({
      ...input,
      artifact_id: "artifact:authority-decision:self-reviewed",
      independent_reviewer: input.proposed_by
    }),
    /independent review and owner acceptance/
  );
  assert.throws(
    () => createMaterialAuthorityDecision({
      ...input,
      artifact_id: "artifact:authority-decision:unowned",
      owner_decision: "PRODUCER_APPROVED"
    }),
    /independent review and owner acceptance/
  );
  assert.throws(
    () => createMaterialAuthorityDecision({
      ...input,
      artifact_id: "artifact:authority-decision:standing",
      decision_kind: "BOUNDED_RESULT_STANDING"
    }),
    /not a material authority decision handled by Phase 7B/
  );
});

function configurationContext() {
  return {
    behaviorManifest: createBehaviorConfigurationManifest(behaviorManifestInput()),
    evaluationManifest: createEvaluationConfigurationManifest(evaluationManifestInput())
  };
}

function qualificationPlan(context) {
  return createQualificationPlan(qualificationPlanInput(context));
}

function qualificationPlanInput(context) {
  return {
    artifact_id: "artifact:qualification-plan:001",
    authority_namespace_id: "namespace:scn001:first-milestone",
    behavior_manifest: context.behaviorManifest,
    evaluation_manifest: context.evaluationManifest,
    execution_slots: qualificationSlots(),
    allocation_policy: {
      method_id: "allocation:qualification:lexical-v1",
      method_revision: "1",
      method_digest: digest("1"),
      outcome_independent: true,
      invalid_missing_divergent_disposition: "RETAIN_NO_RETRY_INTO_QUALIFICATION"
    },
    producer_identity: "actor:qualification-producer",
    validator_identity: "actor:qualification-validator",
    custody_plan: custodyPlan(),
    anchor_requirement: anchorRequirement(),
    created_at: "2026-07-21T12:00:00Z",
    created_by: "actor:qualification-producer"
  };
}

function qualificationResult(context, plan, result) {
  return createQualificationResult({
    ...qualificationResultInput(plan, result),
    behavior_manifest: context.behaviorManifest,
    evaluation_manifest: context.evaluationManifest
  });
}

function qualificationResultInput(plan, result) {
  return {
    artifact_id: `artifact:qualification-result:${result.toLowerCase()}`,
    plan,
    executions: qualificationExecutions(plan),
    comparisons: qualificationComparisons(plan),
    result,
    producer_identity: "actor:qualification-result-producer",
    validator_identity: "actor:qualification-result-validator",
    validation_result: "VALIDATED",
    validation_attestation_ref: evidenceReference("artifact:qualification-validation:001"),
    anchor_receipt_ref: evidenceReference("artifact:anchor-receipt:qualification"),
    fresh_start_proof_refs: plan.identity_payload.execution_slots.map((slot, index) => (
      evidenceReference(`artifact:fresh-start:${String(index + 1).padStart(2, "0")}`)
    )),
    sealed_at: "2026-07-21T12:30:00Z",
    sealed_by: "actor:qualification-result-validator"
  };
}

function campaignAuthorization(context, plan, result) {
  return createCampaignAuthorization(campaignAuthorizationInput(context, plan, result));
}

function campaignAuthorizationInput(context, plan, result, count = 1) {
  return {
    artifact_id: "artifact:campaign-authorization:001",
    campaign_id: "campaign:scn001:first-milestone:001",
    authority_namespace_id: "namespace:scn001:first-milestone",
    behavior_manifest: context.behaviorManifest,
    evaluation_manifest: context.evaluationManifest,
    qualification_plan: plan,
    qualification_result: result,
    attempt_slots: attemptSlots(count, "PRIMARY", 0),
    contingency_mode: count === 1 ? "PREALLOCATED_TO_THREE" : "NOT_APPLICABLE",
    contingency_slots: count === 1 ? attemptSlots(2, "CONTINGENCY", 1) : [],
    campaign_authority_identity: "actor:zoey-project-owner",
    producer_identity: "actor:campaign-producer",
    custody_plan: custodyPlan(),
    anchor_requirement: anchorRequirement(),
    authorized_at: "2026-07-21T13:00:00Z",
    authorized_by: "actor:zoey-project-owner"
  };
}

function executionStartInput(authorization) {
  const namespaceRef = {
    artifact_id: "artifact:namespace-index:authorization",
    artifact_kind: "AUTHORITY_NAMESPACE_INDEX",
    schema_id: "zoey.authority-namespace-index",
    schema_revision: 1,
    content_fingerprint: digest("8")
  };
  const receiptRef = evidenceReference("artifact:anchor-receipt:campaign");
  const authorizationRef = createExactArtifactReference(authorization);
  return {
    authorization,
    slot_id: authorization.identity_payload.attempt_slots[0].slot_id,
    authorizing_namespace_ref: namespaceRef,
    anchor_receipt_ref: receiptRef,
    anchor_verification: {
      authorization_ref: authorizationRef,
      namespace_index_ref: namespaceRef,
      anchor_receipt_ref: receiptRef,
      profile: "PROTECTED_REMOTE_GATE",
      external_commit_sha: "a".repeat(40),
      authority_ref: "refs/heads/formal-authority",
      external_event_id: "event:protected-gate:001",
      observed_predecessor: "b".repeat(40),
      receipt_bytes_digest: digest("9"),
      validator_identity: "actor:external-gate-validator",
      producer_identity: "actor:campaign-producer",
      source: "EXTERNAL_PLATFORM",
      verification_result: "VERIFIED"
    },
    fresh_start_proof: {
      profile: "GATE_LAUNCHED_ATTEMPT",
      slot_id: authorization.identity_payload.attempt_slots[0].slot_id,
      challenge: "challenge:post-anchor:001",
      issued_by: "actor:external-gate",
      observed_by: "actor:external-gate",
      anchor_event_id: "event:protected-gate:001",
      start_event_id: "event:attempt-start:001",
      run_scope_id: "run-scope:attempt-start:001",
      allocation_binding_digest: attemptStartAllocationBindingFingerprint(
        authorization.identity_payload.attempt_slots[0]
      ),
      capture_binding_digest: digest("a"),
      verification_result: "VERIFIED"
    }
  };
}

function qualificationSlots() {
  return REQUIRED_PATHS.flatMap((path, pathIndex) => [1, 2].map((ordinal) => ({
    execution_id: `qualification:${String(pathIndex + 1).padStart(2, "0")}:${ordinal}`,
    path_id: path,
    ordinal,
    selection_basis_digest: digest(String(pathIndex + ordinal))
  })));
}

function qualificationExecutions(plan) {
  return plan.identity_payload.execution_slots.map((slot, index) => ({
    execution_id: slot.execution_id,
    path_id: slot.path_id,
    status: "COMPLETED",
    capture_refs: [evidenceReference(`artifact:qualification-capture:${String(index + 1).padStart(2, "0")}`)],
    oracle_projection_digest: digest("b"),
    comparator_input_digest: digest("c")
  }));
}

function qualificationComparisons(plan) {
  return REQUIRED_PATHS.map((path) => {
    const [left, right] = plan.identity_payload.execution_slots.filter(
      (slot) => slot.path_id === path
    );
    return {
      left_execution_id: left.execution_id,
      right_execution_id: right.execution_id,
      equivalent: true,
      mismatch_class: null,
      details_digest: null
    };
  });
}

function attemptSlots(count, slotKind, ordinalOffset) {
  return REQUIRED_PATHS.flatMap((path, pathIndex) => Array.from(
    { length: count }, (_, index) => {
      const ordinal = index + 1;
      const suffix = `${String(pathIndex + 1).padStart(2, "0")}:${ordinal + ordinalOffset}`;
      return {
        slot_id: `slot:${slotKind.toLowerCase()}:${suffix}`,
        attempt_id: `attempt:${slotKind.toLowerCase()}:${suffix}`,
        path_id: path,
        ordinal,
        slot_kind: slotKind,
        selection_basis_digest: digest("d"),
        seed_commitment: digest("e")
      };
    }
  ));
}

function evidenceReference(artifactId) {
  return {
    artifact_id: artifactId,
    artifact_kind: "FORMAL_EVIDENCE_ARTIFACT",
    schema_id: "zoey.formal-evidence-artifact",
    schema_revision: 1,
    content_fingerprint: digest("7")
  };
}

function runRecordReference(artifactId) {
  return {
    artifact_id: artifactId,
    artifact_kind: "FORMAL_RUN_RECORD",
    schema_id: "zoey.formal-run-record",
    schema_revision: 1,
    content_fingerprint: digest("3")
  };
}

function invalidityInput(
  authorization,
  artifactId,
  runRecordId,
  attemptId,
  pathId,
  reasonCode,
  attemptAllocation = null
) {
  const slot = authorization.identity_payload.attempt_slots.find(
    (candidate) => candidate.attempt_id === attemptId && candidate.path_id === pathId
  );
  return {
    artifact_id: artifactId,
    campaign_authorization: authorization,
    run_record_ref: runRecordReference(runRecordId),
    attempt_allocation: attemptAllocation ?? {
      allocation_kind: "PROSPECTIVE_SLOT",
      authorization_ref: createExactArtifactReference(authorization),
      slot_id: slot?.slot_id ?? "slot:unresolved:001",
      attempt_id: attemptId,
      path_id: pathId,
      selection_basis_digest: slot?.selection_basis_digest ?? digest("0"),
      lifecycle: "authorized",
      outcome_independent: true
    },
    attempt_id: attemptId,
    path_id: pathId,
    reason_code: reasonCode,
    basis_evidence_refs: [evidenceReference(`${artifactId}:evidence`)],
    evaluator_identity: "actor:campaign-evaluator",
    validator_identity: "actor:invalidity-validator",
    validator_result: "CONFIRMED",
    replacement_eligible: true,
    campaign_consequence: "CONTINUE_WITH_REPLACEMENT",
    decided_at: "2026-07-21T14:00:00Z",
    decided_by: "actor:invalidity-validator"
  };
}

function custodyPlan() {
  return {
    custody_id: "custody:formal-evaluation:local",
    access_policy_digest: digest("6")
  };
}

function anchorRequirement() {
  return {
    profile: "PROTECTED_REMOTE_GATE",
    authority_ref: "refs/heads/formal-authority",
    receipt_media_type: "application/json",
    receipt_encoding: "utf-8",
    receipt_digest_algorithm: "sha-256",
    receipt_custody_target: "custody:formal-evaluation:anchor-receipts",
    resolvability_policy: "REQUIRED_AT_USE",
    fresh_start_profile: "GATE_LAUNCHED_ATTEMPT",
    receipt_authentication: {
      algorithm: "Ed25519",
      key_id: "key:formal-authority-test",
      public_key_fingerprint: digest("9")
    }
  };
}

function behaviorManifestInput() {
  return {
    manifest_id: "manifest:behavior:authority-test",
    identity_payload: {
      sut_source_build: sourceBuild("SUT_SOURCE", [member("scn001_sut_core/index.js", "1")]),
      public_boundary: {
        package_name: "@zoey/scn001-sut-core",
        entry_point: "scn001_sut_core/index.js",
        exports: ["createSutBoundary"],
        input_contract_digest: digest("2"),
        output_contract_digest: digest("3"),
        lifecycle_contract_digest: digest("4"),
        inspection_contract_digest: digest("5"),
        feature_flags: {}
      },
      dependencies_runtime: runtimeIdentity(),
      behavior_policy: {
        policy_id: "policy:scn001-selected-slice",
        policy_revision: "R1",
        policy_digest: digest("6"),
        external_configurations: []
      },
      model: notApplicable("deterministic_non_model_sut"),
      prompt: notApplicable("deterministic_non_model_sut"),
      tool: notApplicable("no_behavior_affecting_tool"),
      provider: notApplicable("no_external_provider"),
      randomness: notApplicable("no_runtime_randomness"),
      artifact_custody: []
    },
    provenance: provenance(),
    created_at: "2026-07-21T11:00:00Z",
    created_by: "actor:manifest-builder"
  };
}

function evaluationManifestInput() {
  return {
    manifest_id: "manifest:evaluation:authority-test",
    identity_payload: {
      evaluator_source_build: sourceBuild("EVALUATOR_SOURCE", [
        member("scn001_eval/src/formalAuthority.js", "2")
      ]),
      dependencies_runtime: runtimeIdentity(),
      fixture_oracle: {
        package_id: "SCN001-SSFO-V0.2.0",
        package_revision: "V0.2.0",
        required_paths: [...REQUIRED_PATHS],
        claim_classes: [
          "CC-EVIDENCE-TRIAL-FORMATION",
          "CC-EXPLANATION-PROVENANCE",
          "CC-OUTCOME-SEMANTICS",
          "CC-SCOPE-TRIAL-USE",
          "CC-TIME-STALE-BASIS"
        ],
        bundle_digest: digest("3"),
        branch_policy_digest: digest("4"),
        completeness_declaration_digest: digest("5"),
        checkpoint_contract_digest: digest("6"),
        oracle_rule_catalogue_digest: digest("7"),
        claim_obligation_map_digest: digest("8")
      },
      simulator: {
        source_digest: digest("9"),
        configuration_digest: digest("a"),
        realization_grammar_digest: digest("b")
      },
      artifact_schemas: {
        behavior_configuration_manifest: 1,
        evaluation_configuration_manifest: 1,
        deterministic_qualification_plan: 1,
        deterministic_qualification_result: 1,
        campaign_authorization: 1,
        formal_run_record: 1,
        formal_evidence_artifact: 1,
        evaluation_decision: 1,
        bounded_campaign_result: 1,
        campaign_evidence_index: 1,
        authority_namespace_index: 1
      },
      run_validity: {
        criteria_digest: digest("c"),
        invalidity_reason_catalogue_digest: digest("d")
      },
      replacement_policy: {
        invalid_attempt_limit_per_path: 2,
        replacement_rule_digest: digest("e"),
        stop_review_policy_digest: digest("f")
      },
      selection_policy: {
        method_id: "selection:outcome-independent-v1",
        method_revision: "1",
        method_digest: digest("1")
      },
      deterministic_replay: {
        mode: "QUALIFICATION_SUPPORTED",
        profile_id: "DEQ-SCN001-V1",
        profile_revision: "1",
        comparator_fingerprint: digest("2"),
        normalization_rules_digest: digest("3"),
        exclusion_rules_digest: digest("4")
      },
      run_count_policy: {
        qualified_runs_per_path: 1,
        not_qualified_runs_per_path: 3,
        inconclusive_runs_per_path: 3,
        nondeterministic_runs_per_path: 3,
        divergence_contingency: "PREALLOCATE_OR_SUPERSEDE"
      },
      governing_basis: { documents: governingDocuments() },
      behavior_affecting_environment: [],
      artifact_custody: []
    },
    provenance: provenance(),
    created_at: "2026-07-21T11:00:00Z",
    created_by: "actor:manifest-builder"
  };
}

function sourceBuild(scope, members) {
  return {
    closure_schema: "zoey.closed-source-build-identity",
    closure_revision: 1,
    scope,
    inclusion_rule: `closure:${scope.toLowerCase()}:v1`,
    exclusion_rule: `exclusion:${scope.toLowerCase()}:v1`,
    members,
    shared_inputs: [],
    package_projection: {
      package_name: scope === "SUT_SOURCE" ? "@zoey/scn001-sut-core" : "@zoey/scn001-eval",
      package_version: "0.1.0",
      manifest_projection_digest: digest("5"),
      field_paths: scope === "SUT_SOURCE"
        ? ["exports", "name", "type", "version"]
        : ["dependencies", "name", "type", "version"]
    },
    dependency_closure: { graph_digest: digest("6"), members: [] },
    build: {
      build_kind: "DIRECT_EXECUTION",
      artifact_set_digest: digest("7"),
      recipe_identity: "recipe:node-direct:v1",
      generated_assets: []
    },
    coverage: {
      method: "CLOSED_MEMBER_INDEX_AND_DEPENDENCY_GRAPH",
      status: "COMPLETE",
      external_inputs: []
    }
  };
}

function runtimeIdentity() {
  return {
    runtime_name: "node",
    runtime_version: "24.4.1",
    implementation: "v8",
    operating_system: "darwin",
    architecture: "arm64",
    toolchain_identity: "node:24.4.1",
    environment: [],
    locale: "en-US",
    timezone: "UTC",
    clock_mode: "fixture-controlled",
    numeric_mode: "ecmascript-number"
  };
}

function provenance() {
  return {
    repository_identity: "repository:zoey-scn001-selected-slice",
    repository_role: "governed_workbench",
    source_commit: "a".repeat(40),
    root_package_digest: digest("8"),
    root_lock_digest: digest("9"),
    worktree_state: "clean",
    reconstruction: {
      method: "command",
      command: "git checkout --detach aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      source_bundle_digest: null
    }
  };
}

function member(path, character) {
  return { logical_path: path, file_mode: "100644", byte_digest: digest(character) };
}

function notApplicable(reasonCode) {
  return {
    applicability: "not_applicable",
    reason_code: reasonCode,
    identity_fields: {},
    custody_ref: null,
    content_digest: null,
    unknown_fields: []
  };
}

function governingDocuments() {
  const entries = [
    ["ADR-002", "R2"], ["ADR-004", "R3"], ["ADR-005", "R2"],
    ["ADR-007", "R3"], ["ADR-009", "R4"], ["ADR-010", "R3"],
    ["ADR-011", "R3"], ["ADR-012", "R3"],
    ["CANONICAL_SCENARIOS", "V0.2.2"], ["ENGINEERING_STANDARD", "V0.6.4"],
    ["OPEN_QUESTIONS", "V0.2.23"], ["SCN001-SSFO-V0.2.0", "V0.2.0"],
    ["SCN001_SELECTED_SLICE", "V0.5.0"], ["STATE_AND_CONTROL_MODEL", "V0.4.1"],
    ["SYSTEM_THESIS", "V0.3.1"]
  ];
  return entries.map(([document_id, revision]) => ({
    document_id,
    revision,
    content_digest: digest("a")
  }));
}
