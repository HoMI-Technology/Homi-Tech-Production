import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { VerdictKey } from "@/lib/brand";

/**
 * Readiness-receipt verification primitives (B2B v1; migration 00022).
 *
 * The consumer authorizes a share; a partner they hand the token to can verify
 * it here. Two independent secrets:
 *   • partner API keys — authenticate the CALLER. Stored as SHA-256 hashes;
 *     the plaintext (`homi_live_<32hex>`) is shown once at mint time.
 *   • RECEIPT_SIGNING_SECRET — signs the RECEIPT so a partner can validate it
 *     offline and detect a doctored screenshot. HMAC-SHA256 over canonical
 *     claim JSON, `kid`-tagged for rotation.
 *
 * FCRA-conscious by construction: a receipt carries verdict + coarse bands and
 * timestamps only — never underlying financials, never identity. Verification
 * is always consumer-initiated (partner presents a token the consumer gave
 * them); there is no lookup-by-person path anywhere in this module.
 */

export const PARTNER_KEY_PREFIX = "homi_live_";

/** SHA-256 hex of a partner API key — the only form stored in the DB. */
export function hashPartnerKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

/** Coarse score band. Deliberately lossy — partners get a signal, not a score. */
export type ScoreBand = "high" | "moderate" | "emerging" | "early";

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "high";
  if (score >= 65) return "moderate";
  if (score >= 50) return "emerging";
  return "early";
}

/** Pillar attainment bucketed to a 3-level band (never the raw sub-score). */
export type PillarBand = "strong" | "developing" | "building";

export function pillarBand(pct: number): PillarBand {
  if (pct >= 75) return "strong";
  if (pct >= 50) return "developing";
  return "building";
}

export interface ReceiptClaims {
  /** Opaque share token (consumer-authorized handle). */
  sub: string;
  verdict: VerdictKey;
  scoreBand: ScoreBand;
  pillars: {
    financial: PillarBand;
    emotional: PillarBand;
    timing: PillarBand;
  };
  /** ISO timestamps. */
  issuedAt: string;
  expiresAt: string | null;
  revoked: boolean;
}

const SIGNING_KID = "homi-receipt-v1";

/**
 * Canonical JSON — keys emitted in a fixed order so the signature is stable
 * regardless of object construction order. Any drift here breaks verification,
 * so the field list is explicit rather than Object.keys-derived.
 */
function canonicalize(claims: ReceiptClaims): string {
  return JSON.stringify([
    claims.sub,
    claims.verdict,
    claims.scoreBand,
    claims.pillars.financial,
    claims.pillars.emotional,
    claims.pillars.timing,
    claims.issuedAt,
    claims.expiresAt,
    claims.revoked,
  ]);
}

function signingSecret(): string | null {
  return process.env.RECEIPT_SIGNING_SECRET || null;
}

export interface SignedReceipt {
  claims: ReceiptClaims;
  signature: {
    alg: "HS256";
    kid: string;
    value: string;
  } | null;
}

/** Attaches an HMAC signature to the claims. Signature is null when unconfigured. */
export function signReceipt(claims: ReceiptClaims): SignedReceipt {
  const secret = signingSecret();
  if (!secret) return { claims, signature: null };
  const value = createHmac("sha256", secret).update(canonicalize(claims)).digest("base64url");
  return { claims, signature: { alg: "HS256", kid: SIGNING_KID, value } };
}

/** Constant-time verification of a signed receipt (for partner-side/offline checks + tests). */
export function verifyReceiptSignature(receipt: SignedReceipt): boolean {
  const secret = signingSecret();
  if (!secret || !receipt.signature) return false;
  const expected = createHmac("sha256", secret)
    .update(canonicalize(receipt.claims))
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(receipt.signature.value);
  return a.length === b.length && timingSafeEqual(a, b);
}
