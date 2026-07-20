import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { safeSecretEquals } from "@/lib/security";
import { sendTemplateEmail } from "@/lib/email/send";

export const runtime = "nodejs";

const bodySchema = z.object({
  template: z.enum(["welcome", "verdict", "reassessment", "waitlist"]),
  to: z.string().email(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const provided = request.headers.get("x-homi-internal");
  if (!internalSecret || !safeSecretEquals(provided, internalSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`email:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "template and a valid `to` email are required." }, { status: 400 });
  }

  const { template, to, params } = parsed.data;

  const result = await sendTemplateEmail({ template, to, params });

  if (!result.ok) {
    const correlationId = crypto.randomUUID();
    return NextResponse.json(
      { error: "Failed to send email.", correlationId },
      { status: result.reason === "render_error" ? 500 : 502 },
    );
  }

  if (!result.sent) {
    if (result.reason === "unsubscribed") {
      return NextResponse.json({ ok: true, skipped: "unsubscribed" });
    }
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({ configured: true, ok: true });
}
