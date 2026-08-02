import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaidCredentials } from "@/lib/plaid/client";
import { verifyPlaidWebhook, sha256Hex } from "@/lib/plaid/webhook-verify";
import { syncItem, type SyncableItem } from "@/lib/plaid/sync";
import type { PlaidItemStatus } from "@/types/database";

export const runtime = "nodejs";

/**
 * POST /api/plaid/webhook — Plaid webhook receiver.
 *
 * Contract with Plaid:
 *   • Verification failures → 401 (never process an unsigned delivery).
 *   • Unknown webhook types / unknown item_ids → 200. Plaid retries non-2xx
 *     and eventually disables the webhook, so "we don't handle this" must
 *     never look like a failure.
 *   • Transient DB failure recording the event → 500 so Plaid redelivers.
 *
 * Idempotency: Plaid webhooks carry no event id, so the dedupe key is
 * sha256(webhook_type|webhook_code|item_id|request_body_sha256) inserted
 * into webhook_events (insert-first; unique violation ⇒ already processed),
 * mirroring the Stripe webhook's ledger pattern.
 *
 * PLAID_WEBHOOK_SKIP_VERIFY="true" bypasses JWT verification ONLY outside
 * production — for tests and sandbox tooling. Never set it in production.
 */

interface PlaidWebhookBody {
  webhook_type?: string;
  webhook_code?: string;
  item_id?: string;
  error?: { error_code?: string } | null;
}

function ack(extra?: Record<string, unknown>) {
  return NextResponse.json({ received: true, processed: true, ...extra });
}

export async function POST(request: Request) {
  const correlationId = crypto.randomUUID();
  // Raw body FIRST — the sha256 claim is over the exact raw bytes.
  const rawBody = await request.text();

  const credentials = getPlaidCredentials();
  const skipVerify =
    process.env.PLAID_WEBHOOK_SKIP_VERIFY === "true" && process.env.NODE_ENV !== "production";

  let bodySha256: string;
  if (skipVerify) {
    bodySha256 = sha256Hex(rawBody);
  } else {
    if (!credentials) {
      console.error(`[plaid/webhook:${correlationId}] delivery received but Plaid is not configured`);
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const verification = await verifyPlaidWebhook(
      rawBody,
      request.headers.get("plaid-verification"),
      credentials,
    );
    if (!verification.ok) {
      console.error(`[plaid/webhook:${correlationId}] verification failed: ${verification.reason}`);
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    bodySha256 = verification.bodySha256;
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody) as PlaidWebhookBody;
  } catch {
    // A verified-but-unparseable body is a sender bug; retrying can't fix it.
    console.error(`[plaid/webhook:${correlationId}] unparseable body`);
    return ack({ processed: false });
  }

  const webhookType = body.webhook_type ?? "UNKNOWN";
  const webhookCode = body.webhook_code ?? "UNKNOWN";
  const plaidItemId = body.item_id ?? "";

  const admin = createAdminClient();
  if (!admin) {
    // Same contract as the Stripe webhook: missing service role is a
    // configuration error. Acking with 200 would silence Plaid redelivery
    // while item status never updates.
    console.error(`[plaid/webhook:${correlationId}] SUPABASE_SERVICE_ROLE_KEY missing — cannot process`);
    return NextResponse.json(
      { error: "Server misconfigured; webhook will retry." },
      { status: 500 },
    );
  }

  // Insert-first idempotency (same ledger as the Stripe webhook). Plaid sends
  // no event id, so derive one from the delivery's identifying content.
  const dedupeKey = createHash("sha256")
    .update(`${webhookType}|${webhookCode}|${plaidItemId}|${bodySha256}`, "utf8")
    .digest("hex");
  const { error: insertError } = await admin
    .from("webhook_events")
    .insert({ event_id: `plaid:${dedupeKey}`, type: `plaid.${webhookType}.${webhookCode}` });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, processed: false, duplicate: true });
    }
    console.error(`[plaid/webhook:${correlationId}] webhook_events insert failed`, insertError.message);
    return NextResponse.json({ error: "Could not record webhook event." }, { status: 500 });
  }

  if (!plaidItemId) {
    return ack({ processed: false });
  }

  const { data: item, error: itemError } = await admin
    .from("plaid_items")
    .select("id, user_id, item_id, access_token_ct, transactions_cursor, status")
    .eq("item_id", plaidItemId)
    .maybeSingle();

  if (itemError) {
    console.error(`[plaid/webhook:${correlationId}] plaid_items lookup failed`, itemError.message);
    return ack({ processed: false });
  }
  if (!item) {
    // Unknown item (e.g. deleted locally after disconnect) — acknowledge.
    console.warn(`[plaid/webhook:${correlationId}] webhook for unknown item — acknowledged`);
    return ack({ processed: false });
  }

  async function setStatus(status: PlaidItemStatus) {
    const { error } = await admin!.from("plaid_items").update({ status }).eq("id", item!.id);
    if (error) {
      console.error(`[plaid/webhook:${correlationId}] status update failed`, error.message);
    }
  }

  try {
    if (webhookType === "TRANSACTIONS" && webhookCode === "SYNC_UPDATES_AVAILABLE") {
      // Inline sync is acceptable here: one user's item, well inside Plaid's
      // 10-second acknowledgment window for typical delta sizes.
      await syncItem(admin, item as SyncableItem);
      return ack();
    }

    if (webhookType === "ITEM") {
      switch (webhookCode) {
        case "ERROR":
          if (body.error?.error_code === "ITEM_LOGIN_REQUIRED") {
            await setStatus("login_required");
          }
          return ack();
        case "PENDING_DISCONNECT":
          await setStatus("pending_disconnect");
          return ack();
        case "PENDING_EXPIRATION":
          await setStatus("pending_expiration");
          return ack();
        case "LOGIN_REPAIRED":
          await setStatus("healthy");
          return ack();
        case "USER_PERMISSION_REVOKED":
        case "USER_ACCOUNT_REVOKED": {
          // The user cut access at the institution: keep the item row as a
          // "revoked" tombstone for the reconnect UX, but purge account and
          // transaction data so verified cash flow no longer reflects revoked
          // consent.
          await setStatus("revoked");
          // Transactions FIRST, deliberately. If the second delete fails we
          // must not be left holding the more sensitive rows after the
          // accounts row — their only UI entry point — is already gone. Both
          // deletes are idempotent, and a failure still acks so Plaid
          // redelivers and the retry completes the purge.
          const { error: txnError } = await admin
            .from("plaid_transactions")
            .delete()
            .eq("item_id", item.id);
          if (txnError) {
            console.error(
              `[plaid/webhook:${correlationId}] transaction purge failed`,
              txnError.message,
            );
          }
          const { error: accountError } = await admin.from("plaid_accounts").delete().eq("item_id", item.id);
          if (accountError) {
            console.error(`[plaid/webhook:${correlationId}] account purge failed`, accountError.message);
          }
          return ack();
        }
        case "WEBHOOK_UPDATE_ACKNOWLEDGED":
          return ack();
        default:
          return ack({ processed: false });
      }
    }

    // Unknown webhook families are acknowledged, never errored.
    return ack({ processed: false });
  } catch (err) {
    // Processing failed after the event was recorded. Acknowledge anyway —
    // the next SYNC_UPDATES_AVAILABLE (or manual sync) retries the work, and
    // a retry of THIS delivery would dedupe to a no-op regardless.
    console.error(
      `[plaid/webhook:${correlationId}] handler error:`,
      err instanceof Error ? err.message : "unknown error",
    );
    return ack({ processed: false });
  }
}
