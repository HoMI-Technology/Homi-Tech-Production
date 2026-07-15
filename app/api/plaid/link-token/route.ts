import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { decryptToken } from "@/lib/plaid/crypto";
import { getUserEntitlements, requireCapability } from "@/lib/entitlements";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  /** plaid_items row id (uuid) — present ⇒ update-mode token for a reconnect. */
  item_id: z.string().uuid().optional(),
});

/**
 * GET/POST /api/plaid/link-token — creates a Plaid Link token for the
 * current user. Returns {configured:false} when PLAID_CLIENT_ID/PLAID_SECRET
 * are not set, so the client can render a "coming soon" panel instead of
 * erroring. Auth required (401) and gated on the bankSync capability (402
 * for free tier) — a Link token is the first step of a paid feature, and
 * client_user_id must be a real user id, never "anonymous".
 *
 * Update mode: POST with {item_id} (an owned plaid_items row id) creates a
 * link token bound to that item's access token — Link then opens in update
 * mode to repair the login. No products array, and no public_token exchange
 * afterwards; success is signalled by LOGIN_REPAIRED / a fresh sync.
 */
async function handler(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`plaid-link-token:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const credentials = getPlaidCredentials();
  if (!credentials) {
    return NextResponse.json({ configured: false });
  }

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const gate = requireCapability(userId, entitlements, "bankSync");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // Optional POST body: {item_id} switches to update mode for a reconnect.
  let updateItemId: string | undefined;
  if (request.method === "POST") {
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
      }
      const parsed = bodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
      }
      updateItemId = parsed.data.item_id;
    }
  }

  let updateAccessToken: string | null = null;
  if (updateItemId) {
    const admin = createAdminClient();
    if (!admin) {
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/link-token:${correlationId}] SUPABASE_SERVICE_ROLE_KEY missing`);
      return NextResponse.json(
        { configured: true, error: "Reconnect is not available right now.", correlationId },
        { status: 503 },
      );
    }
    // Ownership check + ciphertext read (service role only reaches the column).
    const { data: item } = await admin
      .from("plaid_items")
      .select("id, access_token_ct")
      .eq("id", updateItemId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!item) {
      return NextResponse.json({ error: "Bank connection not found." }, { status: 404 });
    }
    try {
      updateAccessToken = decryptToken(item.access_token_ct);
    } catch (err) {
      const correlationId = crypto.randomUUID();
      console.error(
        `[plaid/link-token:${correlationId}] token decryption failed:`,
        err instanceof Error ? err.message : "unknown error",
      );
      return NextResponse.json(
        { configured: true, error: "Reconnect is not available right now.", correlationId },
        { status: 503 },
      );
    }
  }

  try {
    const response = await plaidFetch(
      "/link/token/create",
      updateAccessToken
        ? {
            // Update mode: bind to the existing item; no products array.
            client_name: "HōMI",
            user: { client_user_id: userId },
            access_token: updateAccessToken,
            country_codes: ["US"],
            language: "en",
          }
        : {
            client_name: "HōMI",
            user: { client_user_id: userId },
            products: ["transactions"],
            country_codes: ["US"],
            language: "en",
          },
      credentials,
    );

    if (!response.ok) {
      const details = await response.text();
      const correlationId = crypto.randomUUID();
      console.error(`[plaid/link-token:${correlationId}]`, details);
      return NextResponse.json(
        { configured: true, error: "Plaid link token creation failed.", correlationId },
        { status: 502 },
      );
    }

    const data = (await response.json()) as { link_token?: string };
    if (!data.link_token) {
      return NextResponse.json(
        { configured: true, error: "Plaid did not return a link_token." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      configured: true,
      link_token: data.link_token,
      ...(updateAccessToken ? { update_mode: true } : {}),
    });
  } catch {
    return NextResponse.json(
      { configured: true, error: "Could not reach Plaid." },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
