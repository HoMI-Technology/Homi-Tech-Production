import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  hashPartnerKey,
  isPartnerKey,
  isEducationalPurpose,
  EDUCATIONAL_PURPOSE,
} from "@/lib/receipts";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json(
    { error: "A valid partner API key is required." },
    { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
  );
}

/**
 * POST /api/v1/share-sessions — partner creates a short-lived hosted URL.
 * Returns id/url/expiry only. No score. Consumer completes on HōMI.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const auth = request.headers.get("authorization") ?? "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!isPartnerKey(key)) return unauthorized();

  const purposeHeader = request.headers.get("homi-purpose");
  if (!purposeHeader) {
    return NextResponse.json(
      { error: { code: "PURPOSE_REQUIRED", message: "Homi-Purpose is required." } },
      { status: 400 },
    );
  }
  if (!isEducationalPurpose(purposeHeader)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { allowed } = await rateLimit(`share-session:${hashPartnerKey(key).slice(0, 16) || ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const service = createAdminClient();
  if (!service) {
    return NextResponse.json({ error: "Sessions are unavailable." }, { status: 503 });
  }

  const { data: keyRow } = await service
    .from("partner_api_keys")
    .select("id, revoked_at")
    .eq("key_hash", hashPartnerKey(key))
    .maybeSingle();
  if (!keyRow || (keyRow as { revoked_at: string | null }).revoked_at) {
    return unauthorized();
  }
  const partnerKeyId = (keyRow as { id: string }).id;
  const envTag = key.startsWith("homi_test_") ? "test" : "live";
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data, error } = await service
    .from("share_sessions")
    .insert({
      partner_key_id: partnerKeyId,
      purpose: EDUCATIONAL_PURPOSE,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create a session." }, { status: 500 });
  }

  const origin = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return NextResponse.json({
    id: data.id,
    url: `${origin}/assessment?session=${data.id}&env=${envTag}`,
    expires_at: data.expires_at,
  });
}
