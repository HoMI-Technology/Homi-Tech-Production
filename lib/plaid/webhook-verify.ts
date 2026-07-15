/**
 * Plaid webhook verification (node:crypto only — no new dependencies).
 *
 * Plaid signs every webhook with a JWT in the `Plaid-Verification` header:
 *   1. Decode the JWT header WITHOUT verifying; require alg === "ES256".
 *   2. Fetch the JWK for the header's `kid` via POST /webhook_verification_key/get
 *      (cached in-memory by kid — keys rotate rarely).
 *   3. Verify the ES256 signature. JWTs carry the raw r||s (IEEE P1363)
 *      signature form, hence `dsaEncoding: "ieee-p1363"`.
 *   4. Reject tokens whose `iat` is older than 5 minutes (replay window).
 *   5. SHA-256 the RAW request body and constant-time compare against the
 *      `request_body_sha256` claim — the JWT signs the body indirectly.
 *
 * Verification failures return { ok:false, reason } — reasons are for server
 * logs only; the route must answer a bare 401 without detail.
 */

import { createHash, createPublicKey, timingSafeEqual, verify as verifySignature, type KeyObject } from "node:crypto";
import { plaidFetch, type PlaidCredentials } from "@/lib/plaid/client";

const MAX_TOKEN_AGE_SECONDS = 5 * 60;

/** In-memory JWK cache, keyed by kid. Plaid rotates keys rarely; a warm
 * serverless instance re-verifies without a round-trip. */
const keyCache = new Map<string, KeyObject>();

/** Test hook — clears the kid→key cache between test cases. */
export function clearWebhookKeyCache(): void {
  keyCache.clear();
}

export type WebhookVerification =
  | { ok: true; bodySha256: string }
  | { ok: false; reason: string };

/** SHA-256 of a raw string body, lowercase hex. */
export function sha256Hex(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(segment, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getVerificationKey(
  kid: string,
  credentials: PlaidCredentials,
): Promise<KeyObject | null> {
  const cached = keyCache.get(kid);
  if (cached) return cached;

  try {
    const res = await plaidFetch("/webhook_verification_key/get", { key_id: kid }, credentials);
    if (!res.ok) return null;
    const data = (await res.json()) as { key?: Record<string, unknown> };
    if (!data.key) return null;
    const keyObject = createPublicKey({ key: data.key as never, format: "jwk" });
    keyCache.set(kid, keyObject);
    return keyObject;
  } catch {
    return null;
  }
}

/**
 * Verifies a Plaid webhook delivery. `rawBody` MUST be the exact raw request
 * text (read with `await request.text()` before any JSON parsing) — the
 * sha256 claim is over raw bytes.
 */
export async function verifyPlaidWebhook(
  rawBody: string,
  verificationHeader: string | null,
  credentials: PlaidCredentials,
): Promise<WebhookVerification> {
  if (!verificationHeader) {
    return { ok: false, reason: "missing Plaid-Verification header" };
  }

  const segments = verificationHeader.split(".");
  if (segments.length !== 3) {
    return { ok: false, reason: "malformed JWT" };
  }
  const [headerB64, payloadB64, signatureB64] = segments;

  const header = decodeSegment(headerB64);
  if (!header) return { ok: false, reason: "undecodable JWT header" };
  if (header.alg !== "ES256") {
    return { ok: false, reason: `disallowed alg "${String(header.alg)}"` };
  }
  const kid = header.kid;
  if (typeof kid !== "string" || kid.length === 0) {
    return { ok: false, reason: "missing kid" };
  }

  const key = await getVerificationKey(kid, credentials);
  if (!key) return { ok: false, reason: "could not obtain verification key" };

  let signature: Buffer;
  try {
    signature = Buffer.from(signatureB64, "base64url");
  } catch {
    return { ok: false, reason: "undecodable signature" };
  }

  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
  let signatureValid = false;
  try {
    // JWT ES256 signatures are the raw 64-byte r||s concatenation.
    signatureValid = verifySignature(
      "sha256",
      signingInput,
      { key, dsaEncoding: "ieee-p1363" },
      signature,
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    return { ok: false, reason: "signature verification failed" };
  }

  const payload = decodeSegment(payloadB64);
  if (!payload) return { ok: false, reason: "undecodable JWT payload" };

  const iat = payload.iat;
  if (typeof iat !== "number" || !Number.isFinite(iat)) {
    return { ok: false, reason: "missing iat" };
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - iat > MAX_TOKEN_AGE_SECONDS) {
    return { ok: false, reason: "token too old (possible replay)" };
  }

  const claimedSha = payload.request_body_sha256;
  if (typeof claimedSha !== "string" || claimedSha.length === 0) {
    return { ok: false, reason: "missing request_body_sha256 claim" };
  }

  const computedSha = sha256Hex(rawBody);
  const claimedBuf = Buffer.from(claimedSha.toLowerCase(), "utf8");
  const computedBuf = Buffer.from(computedSha, "utf8");
  if (claimedBuf.length !== computedBuf.length || !timingSafeEqual(claimedBuf, computedBuf)) {
    return { ok: false, reason: "request body sha256 mismatch" };
  }

  return { ok: true, bodySha256: computedSha };
}
