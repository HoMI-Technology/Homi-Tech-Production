import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail } from "@/lib/email/send";
import { WAITLIST_INTEREST_VALUES, WAITLIST_SOURCES } from "@/lib/waitlist";

export const runtime = "nodejs";

const interestSchema = z.enum(WAITLIST_INTEREST_VALUES);

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .email()
    .transform((value) => value.toLowerCase()),
  interest: z.union([interestSchema, z.array(interestSchema).max(4)]).optional(),
  source: z.enum(WAITLIST_SOURCES).optional(),
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

  const { email, interest, source } = parsed.data;
  const interestedIn = interest ? (Array.isArray(interest) ? interest : [interest]) : [];

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email, interested_in: interestedIn, source: source ?? "site" });

  // Unique violation 23505 (already on the list) still returns success so the
  // list cannot be enumerated. Any other insert failure must fail the request —
  // founder lock overrides T1.8a uniform { ok: true } for non-23505 errors.
  if (error && error.code !== "23505") {
    const correlationId = crypto.randomUUID();
    console.error(`[waitlist:${correlationId}]`, error);
    return NextResponse.json(
      { error: "Something didn't connect. Try again in a moment." },
      { status: 500 },
    );
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
