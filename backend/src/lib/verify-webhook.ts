import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createVerify } from "node:crypto";

const pubKeyPath = fileURLToPath(new URL("./fireblocks-sandbox-pubkey.pem", import.meta.url));
const SANDBOX_PUBLIC_KEY = readFileSync(pubKeyPath, "utf8");

// Fireblocks signs each webhook: Fireblocks-Signature: Base64(RSA512(privKey, SHA512(rawBody)))
export function isAuthenticWebhook(rawBody: Buffer, signatureB64: string): boolean {
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
