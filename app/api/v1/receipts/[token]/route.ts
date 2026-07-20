import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  hashPartnerKey,
  scoreBand,
  pillarBand,
  signReceipt,
  PARTNER_KEY_PREFIX,
  type ReceiptClaims,
} from "@/lib/receipts";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import type { VerdictKey } from "@/lib/brand";

export const runtime = "nodejs";

/**
 * GET /api/v1/receipts/:token — partner-facing readiness-receipt verification.
 *
 * Auth: `Authorization: Bearer homi_live_...` — hashed and matched against a
 * non-revoked partner_api_keys row (00022). The token in the path is the
 * consumer-authorized share handle; there is no lookup-by-person path.
 *
 * Fail-closed on revocation/expiry (checked at read time, never cached), and
 * every successful verification is written to receipt_verifications — an audit
 * log the CONSUMER can see ("Coastal Realty verified your receipt"), which is
 * simultaneously a trust surface, a tamper alarm, and partner-usage proof.
 *
 * Returns verdict + coarse bands + timestamps only; underlying financials
 * never leave the server.
 */

function unauthorized() {
  return NextResponse.json(
    { error: "A valid partner API key is required." },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );
}

interface ShareJoinRow {
  id: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  assessment: {
    overall_score: number | null;
    verdict: VerdictKey | null;
    financial_score: number | null;
    emotional_score: number | null;
    timing_score: number | null;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const ip = getClientIp(request);
  const auth = request.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key.startsWith(PARTNER_KEY_PREFIX)) return unauthorized();

  // Rate-limit per key (hashed), not per IP — a partner is one caller behind
  // shared egress. Falls back to IP only if the key is malformed.
  const { allowed } = await rateLimit(`receipt:${hashPartnerKey(key).slice(0, 16) || ip}`, {
    limit: 120,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const service = createAdminClient();
  if (!service) {
    return NextResponse.json({ error: "Verification is unavailable." }, { status: 503 });
  }

  // Authenticate the partner key.
  const { data: keyRow } = await service
    .from("partner_api_keys")
    .select("id, revoked_at")
    .eq("key_hash", hashPartnerKey(key))
    .maybeSingle();
  if (!keyRow || (keyRow as { revoked_at: string | null }).revoked_at) {
    return unauthorized();
  }
  const partnerKeyId = (keyRow as { id: string }).id;

  if (!/^[a-f0-9]{16,64}$/.test(token)) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  // Resolve the share + its assessment. Revocation/expiry are evaluated here
  // (read time) so a revoked link fails closed with no caching window.
  const { data, error } = await service
    .from("score_shares")
    .select(
      "id, expires_at, revoked_at, created_at, assessment:assessments(overall_score, verdict, financial_score, emotional_score, timing_score)",
    )
    .eq("share_token", token)
    .maybeSingle();

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[receipts:${correlationId}]`, error.code, error.message);
    return NextResponse.json({ error: "Verification failed.", correlationId }, { status: 500 });
  }

  const share = data as ShareJoinRow | null;
  const assessment = share?.assessment ?? null;
  if (!share || !assessment || assessment.verdict === null || assessment.overall_score === null) {
    return NextResponse.json({ status: "not_found", valid: false }, { status: 404 });
  }

  const revoked = share.revoked_at !== null;
  const expired = share.expires_at !== null && new Date(share.expires_at) <= new Date();
  const valid = !revoked && !expired;

  const claims: ReceiptClaims = {
    sub: token,
    verdict: assessment.verdict,
    scoreBand: scoreBand(assessment.overall_score),
    pillars: {
      financial: pillarBand(pct(assessment.financial_score, PILLAR_MAX_POINTS.financial)),
      emotional: pillarBand(pct(assessment.emotional_score, PILLAR_MAX_POINTS.emotional)),
      timing: pillarBand(pct(assessment.timing_score, PILLAR_MAX_POINTS.timing)),
    },
    issuedAt: share.created_at,
    expiresAt: share.expires_at,
    revoked,
  };

  // Audit every verification of a live receipt (consumer-visible via RLS).
  if (valid) {
    await service.from("receipt_verifications").insert({
      share_id: share.id,
      partner_key_id: partnerKeyId,
      ip,
    });
  }

  const signed = signReceipt(claims);
  return NextResponse.json(
    {
      valid,
      status: revoked ? "revoked" : expired ? "expired" : "valid",
      receipt: signed.claims,
      signature: signed.signature,
    },
    { status: valid ? 200 : 410 },
  );
}

function pct(total: number | null, max: number): number {
  if (total === null) return 0;
  return Math.max(0, Math.min(100, Math.round((total / max) * 100)));
}
