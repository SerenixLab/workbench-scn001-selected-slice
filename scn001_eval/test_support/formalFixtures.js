import {
  createBehaviorConfigurationManifest,
  createEvaluationConfigurationManifest
} from "../src/configurationIdentity.js";
import { createExactArtifactReference } from "../src/formalArtifactIdentity.js";
import {
  REQUIRED_PATHS,
  createCampaignAuthorization,
  createQualificationPlan,
  createQualificationResult
} from "../src/formalAuthority.js";
import { fixtureAnchorRequirement } from "./anchorFixture.js";

export const digest = (character) => `sha256:${character.repeat(64)}`;

export function createFormalAuthorityFixture({ qualification = "QUALIFIED" } = {}) {
  const behaviorManifest = createBehaviorConfigurationManifest(behaviorManifestInput());
  const evaluationManifest = createEvaluationConfigurationManifest(evaluationManifestInput());
  const configuration = { behaviorManifest, evaluationManifest };
  const qualificationPlan = createQualificationPlan({
    artifact_id: "artifact:qualification-plan:fixture",
    authority_namespace_id: "namespace:scn001:first-milestone",
    behavior_manifest: behaviorManifest,
    evaluation_manifest: evaluationManifest,
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
  });
  const comparisons = qualificationComparisons(qualificationPlan);
  if (qualification === "NOT_QUALIFIED") {
    comparisons[0].equivalent = false;
    comparisons[0].mismatch_class = "VALUE_MISMATCH";
    comparisons[0].details_digest = digest("f");
  }
  const qualificationResult = createQualificationResult({
    artifact_id: `artifact:qualification-result:fixture:${qualification.toLowerCase()}`,
    plan: qualificationPlan,
    behavior_manifest: behaviorManifest,
    evaluation_manifest: evaluationManifest,
    executions: qualificationExecutions(qualificationPlan),
    comparisons,
    result: qualification,
    producer_identity: "actor:qualification-result-producer",
    validator_identity: "actor:qualification-result-validator",
    validation_result: "VALIDATED",
    validation_attestation_ref: evidenceReference("artifact:qualification-validation:fixture"),
    anchor_receipt_ref: evidenceReference("artifact:anchor-receipt:qualification-fixture"),
    fresh_start_proof_refs: qualificationPlan.identity_payload.execution_slots.map(
      (slot, index) => evidenceReference(`artifact:fresh-start:fixture:${index + 1}`)
    ),
    supersedes_result_ref: null,
    correction_decision_ref: null,
    sealed_at: "2026-07-21T12:30:00Z",
    sealed_by: "actor:qualification-result-validator"
  });
  const campaignAuthorization = createCampaignAuthorization({
    artifact_id: "artifact:campaign-authorization:fixture",
    campaign_id: "campaign:scn001:first-milestone:fixture",
    authority_namespace_id: "namespace:scn001:first-milestone",
    behavior_manifest: behaviorManifest,
    evaluation_manifest: evaluationManifest,
    qualification_plan: qualificationPlan,
    qualification_result: qualificationResult,
    attempt_slots: attemptSlots(qualification === "QUALIFIED" ? 1 : 3, "PRIMARY", 0),
    contingency_mode: qualification === "QUALIFIED" ? "PREALLOCATED_TO_THREE" : "NOT_APPLICABLE",
    contingency_slots: qualification === "QUALIFIED" ? attemptSlots(2, "CONTINGENCY", 1) : [],
    campaign_authority_identity: "actor:zoey-project-owner",
    producer_identity: "actor:campaign-producer",
    custody_plan: custodyPlan(),
    anchor_requirement: anchorRequirement(),
    authorized_at: "2026-07-21T13:00:00Z",
    authorized_by: "actor:zoey-project-owner"
  });
  return {
    ...configuration,
    qualificationPlan,
    qualificationResult,
    campaignAuthorization,
    authorityContext: {
      behavior_manifest: behaviorManifest,
      evaluation_manifest: evaluationManifest,
      qualification_plan: qualificationPlan,
      qualification_result: qualificationResult
    }
  };
}

export function rebuildFormalAuthorityFixture(fixture, evidence, qualification = "QUALIFIED") {
  const { behaviorManifest, evaluationManifest, qualificationPlan } = fixture;
  const comparisons = qualificationComparisons(qualificationPlan);
  if (qualification === "NOT_QUALIFIED") {
    comparisons[0].equivalent = false;
    comparisons[0].mismatch_class = "VALUE_MISMATCH";
    comparisons[0].details_digest = digest("f");
  }
  const qualificationResult = createQualificationResult({
    artifact_id: `artifact:qualification-result:fixture:${qualification.toLowerCase()}`,
    plan: qualificationPlan,
    behavior_manifest: behaviorManifest,
    evaluation_manifest: evaluationManifest,
    executions: qualificationExecutions(qualificationPlan, evidence.execution_capture_refs),
    comparisons,
    result: qualification,
    producer_identity: "actor:qualification-result-producer",
    validator_identity: "actor:qualification-result-validator",
    validation_result: "VALIDATED",
    validation_attestation_ref: evidence.validation_attestation_ref,
    anchor_receipt_ref: evidence.anchor_receipt_ref,
    fresh_start_proof_refs: evidence.fresh_start_proof_refs,
    supersedes_result_ref: null,
    correction_decision_ref: null,
    sealed_at: "2026-07-21T12:30:00Z",
    sealed_by: "actor:qualification-result-validator"
  });
  const campaignAuthorization = createCampaignAuthorization({
    artifact_id: "artifact:campaign-authorization:fixture",
    campaign_id: "campaign:scn001:first-milestone:fixture",
    authority_namespace_id: "namespace:scn001:first-milestone",
    behavior_manifest: behaviorManifest,
    evaluation_manifest: evaluationManifest,
    qualification_plan: qualificationPlan,
    qualification_result: qualificationResult,
    attempt_slots: attemptSlots(qualification === "QUALIFIED" ? 1 : 3, "PRIMARY", 0),
    contingency_mode: qualification === "QUALIFIED" ? "PREALLOCATED_TO_THREE" : "NOT_APPLICABLE",
    contingency_slots: qualification === "QUALIFIED" ? attemptSlots(2, "CONTINGENCY", 1) : [],
    campaign_authority_identity: "actor:zoey-project-owner",
    producer_identity: "actor:campaign-producer",
    custody_plan: custodyPlan(),
    anchor_requirement: anchorRequirement(),
    authorized_at: "2026-07-21T13:00:00Z",
    authorized_by: "actor:zoey-project-owner"
  });
  return {
    behaviorManifest,
    evaluationManifest,
    qualificationPlan,
    qualificationResult,
    campaignAuthorization,
    authorityContext: {
      behavior_manifest: behaviorManifest,
      evaluation_manifest: evaluationManifest,
      qualification_plan: qualificationPlan,
      qualification_result: qualificationResult
    }
  };
}

export function evidenceReference(artifactId, character = "7") {
  return {
    artifact_id: artifactId,
    artifact_kind: "FORMAL_EVIDENCE_ARTIFACT",
    schema_id: "zoey.formal-evidence-artifact",
    schema_revision: 1,
    content_fingerprint: digest(character)
  };
}

export function runRecordReference(artifactId, character = "3") {
  return {
    artifact_id: artifactId,
    artifact_kind: "FORMAL_RUN_RECORD",
    schema_id: "zoey.formal-run-record",
    schema_revision: 1,
    content_fingerprint: digest(character)
  };
}

export function decisionReference(artifactId, character = "4") {
  return {
    artifact_id: artifactId,
    artifact_kind: "EVALUATION_DECISION",
    schema_id: "zoey.evaluation-decision",
    schema_revision: 1,
    content_fingerprint: digest(character)
  };
}

function qualificationSlots() {
  return REQUIRED_PATHS.flatMap((path, pathIndex) => [1, 2].map((ordinal) => ({
    execution_id: `qualification:fixture:${pathIndex + 1}:${ordinal}`,
    path_id: path,
    ordinal,
    selection_basis_digest: digest(String(pathIndex + ordinal))
  })));
}

function qualificationExecutions(plan, captureRefs = null) {
  return plan.identity_payload.execution_slots.map((slot, index) => ({
    execution_id: slot.execution_id,
    path_id: slot.path_id,
    status: "COMPLETED",
    capture_refs: captureRefs === null
      ? [evidenceReference(`artifact:qualification-capture:fixture:${index + 1}`)]
      : [captureRefs[index]],
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
      const suffix = `${pathIndex + 1}:${ordinal + ordinalOffset}`;
      return {
        slot_id: `slot:${slotKind.toLowerCase()}:fixture:${suffix}`,
        attempt_id: `attempt:${slotKind.toLowerCase()}:fixture:${suffix}`,
        path_id: path,
        ordinal,
        slot_kind: slotKind,
        selection_basis_digest: digest("d"),
        seed_commitment: digest("e")
      };
    }
  ));
}

function custodyPlan() {
  return {
    custody_id: "custody:formal-evaluation:fixture",
    access_policy_digest: digest("6")
  };
}

function anchorRequirement() {
  return fixtureAnchorRequirement();
}

function behaviorManifestInput() {
  return {
    manifest_id: "manifest:behavior:formal-fixture",
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
    manifest_id: "manifest:evaluation:formal-fixture",
    identity_payload: {
      evaluator_source_build: sourceBuild("EVALUATOR_SOURCE", [
        member("scn001_eval/src/formalEvidence.js", "2")
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
