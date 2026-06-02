import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createVerify } from "node:crypto";
import { createRemoteJWKSet, compactVerify } from "jose";

const pubKeyPath = fileURLToPath(new URL("./fireblocks-sandbox-pubkey.pem", import.meta.url));
const SANDBOX_PUBLIC_KEY = readFileSync(pubKeyPath, "utf8");

// Webhooks v2 publishes signing keys as JWKS. The kid in the detached-JWS header
// selects the key, so rotation is automatic. This backend targets the sandbox.
const JWKS_URL =
  process.env.FIREBLOCKS_WEBHOOK_JWKS_URL ??
  "https://sandbox-keys.fireblocks.io/.well-known/jwks.json";

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

/**
 * Webhooks v2 — validate the detached JWS from `Fireblocks-Webhook-Signature`.
 * The payload (raw body) is sent separately, so we rebuild the compact JWS.
 */
export async function isAuthenticWebhookV2(
  rawBody: Buffer,
  jwsSignature: string,
): Promise<boolean> {
  if (!jwsSignature) return false;
  try {
    const [header, , sig] = jwsSignature.split(".");
    if (!header || !sig) return false;
    const payload = rawBody.toString("base64url");
    await compactVerify(`${header}.${payload}.${sig}`, jwks);
    return true;
  } catch {
    return false;
  }
}

// Legacy (Webhooks v1): Fireblocks-Signature = Base64(RSA512(privKey, SHA512(rawBody)))
export function isAuthenticWebhookLegacy(rawBody: Buffer, signatureB64: string): boolean {
  if (!signatureB64) return false;
  const verifier = createVerify("RSA-SHA512");
  verifier.update(rawBody);
  verifier.end();
  try {
    return verifier.verify(SANDBOX_PUBLIC_KEY, signatureB64, "base64");
  } catch {
    return false;
  }
}

/**
 * Combined verifier. Prefers Webhooks v2 (JWKS) and falls back to the legacy v1
 * signature so the receiver keeps working across the migration window.
 */
export async function isAuthenticWebhook(
  rawBody: Buffer,
  headers: { v2Signature: string; legacySignature: string },
): Promise<{ valid: boolean; method: "v2" | "v1" | null }> {
  if (headers.v2Signature && (await isAuthenticWebhookV2(rawBody, headers.v2Signature))) {
    return { valid: true, method: "v2" };
  }
  if (headers.legacySignature && isAuthenticWebhookLegacy(rawBody, headers.legacySignature)) {
    return { valid: true, method: "v1" };
  }
  return { valid: false, method: null };
}
