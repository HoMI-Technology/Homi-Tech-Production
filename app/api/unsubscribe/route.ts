import { NextResponse } from "next/server";
import { verifyUnsubscribeToken, recordUnsubscribe } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";

/**
 * One-click email unsubscribe (RFC 8058). Gmail/Yahoo POST here with no body;
 * the confirmation page also GETs here after the user confirms. Either way we
 * verify the HMAC token, record the opt-out, and return 200 so the mail client
 * shows success.
 */
async function handle(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const email = url.searchParams.get("e");
  const token = url.searchParams.get("t");

  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Invalid or expired unsubscribe link." }, { status: 400 });
  }

  const ok = await recordUnsubscribe(email, "one-click");
  if (!ok) {
    // Don't leak infra state to mail clients; a soft-fail still lets the user
    // retry from the confirmation page.
    return NextResponse.json({ ok: false, error: "Could not process right now." }, { status: 503 });
  }

  return NextResponse.json({ ok: true, unsubscribed: true });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
