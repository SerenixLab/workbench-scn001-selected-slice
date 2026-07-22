import { generateKeyPairSync, sign } from "node:crypto";

import {
  anchorPublicKeyFingerprint,
  anchorReceiptSigningBytes,
  freshStartAttestationSigningBytes
} from "../src/formalEvidence.js";
import { canonicalizeJson } from "../src/formalArtifactIdentity.js";

const keyPair = generateKeyPairSync("ed25519");

export const FIXTURE_ANCHOR_PUBLIC_KEY = keyPair.publicKey.export({
  type: "spki",
  format: "pem"
});

export function fixtureAnchorRequirement() {
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
      key_id: "key:fixture-external-anchor",
      public_key_fingerprint: anchorPublicKeyFingerprint(FIXTURE_ANCHOR_PUBLIC_KEY)
    }
  };
}

export function createFixtureAnchorReceiptBytes(signedPayload) {
  const header = {
    schema_id: "zoey.external-anchor-receipt",
    schema_revision: 1,
    algorithm: "Ed25519",
    key_id: "key:fixture-external-anchor",
    signed_payload: structuredClone(signedPayload)
  };
  const receipt = {
    ...header,
    signature: sign(null, anchorReceiptSigningBytes(header), keyPair.privateKey).toString("base64")
  };
  return Buffer.from(`${canonicalizeJson(receipt)}\n`, "utf8");
}

export function createFixtureFreshStartAttestationBytes(signedPayload) {
  const header = {
    schema_id: "zoey.external-fresh-start-attestation",
    schema_revision: 1,
    algorithm: "Ed25519",
    key_id: "key:fixture-external-anchor",
    signed_payload: structuredClone(signedPayload)
  };
  const attestation = {
    ...header,
    signature: sign(
      null, freshStartAttestationSigningBytes(header), keyPair.privateKey
    ).toString("base64")
  };
  return Buffer.from(`${canonicalizeJson(attestation)}\n`, "utf8");
}
