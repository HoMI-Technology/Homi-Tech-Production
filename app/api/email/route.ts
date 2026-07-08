import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { welcomeEmail, verdictEmail, reassessmentReminder, waitlistConfirmation } from "@/lib/email/templates";
import type { VerdictKey } from "@/lib/brand";

export const runtime = "nodejs";

const VERDICT_KEYS: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

function isVerdictKey(value: unknown): value is VerdictKey {
  return typeof value === "string" && (VERDICT_KEYS as string[]).includes(value);
}

const bodySchema = z.object({
  template: z.enum(["welcome", "verdict", "reassessment", "waitlist"]),
  to: z.string().email(),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const provided = request.headers.get("x-homi-internal");
  if (!internalSecret || provided !== internalSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const { allowed } = rateLimit(`email:${ip}`, { limit: 10, windowMs: 60_000 });
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

  let rendered: { subject: string; html: string };
  try {
    switch (template) {
      case "welcome":
        rendered = welcomeEmail(String(params?.name ?? "there"));
        break;
      case "verdict": {
        const verdict = isVerdictKey(params?.verdict) ? params.verdict : "NOT_YET";
        rendered = verdictEmail(String(params?.name ?? "there"), Number(params?.score ?? 0), verdict);
        break;
      }
      case "reassessment":
        rendered = reassessmentReminder(String(params?.name ?? "there"), Number(params?.daysSince ?? 30));
        break;
      case "waitlist":
        rendered = waitlistConfirmation();
        break;
      default:
        return NextResponse.json({ error: `Unknown template.` }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed to render email template." }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ configured: false });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HōMI <hello@homitechnology.com>",
        to,
        subject: rendered.subject,
        html: rendered.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const correlationId = crypto.randomUUID();
      console.error(`[email:${correlationId}]`, text);
      return NextResponse.json(
        { error: "Email provider rejected the request.", correlationId },
        { status: 502 },
      );
    }
    return NextResponse.json({ configured: true, ok: true });
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(`[email:${correlationId}]`, err);
    return NextResponse.json({ error: "Failed to send email.", correlationId }, { status: 502 });
  }
}
