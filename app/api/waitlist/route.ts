import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail } from "@/lib/email/send";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  interest: z.union([z.string(), z.array(z.string())]).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`waitlist:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { email, interest } = parsed.data;
  const interestedIn = interest ? (Array.isArray(interest) ? interest : [interest]) : [];

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email, interested_in: interestedIn, source: "site" });

  // Uniform response regardless of outcome (T1.8a) — do not let the response
  // reveal whether this email already exists on the waitlist (Postgres unique
  // violation, code 23505) or leak any other insert error. The insert itself
  // still happens as normal; only enumeration via the response is prevented.
  if (error && error.code !== "23505") {
    const correlationId = crypto.randomUUID();
    console.error(`[waitlist:${correlationId}]`, error);
  }

  // Best-effort confirmation email on a fresh sign-up. Never let a delivery
  // failure break the response; sendTemplateEmail no-ops when RESEND_API_KEY is
  // unset and honors the unsubscribe list.
  if (!error) {
    try {
      await sendTemplateEmail({ template: "waitlist", to: email });
    } catch (err) {
      const correlationId = crypto.randomUUID();
      console.error(`[waitlist:email:${correlationId}]`, err);
    }
  }

  return NextResponse.json({ ok: true });
}
