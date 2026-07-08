import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  interest: z.union([z.string(), z.array(z.string())]).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`waitlist:${ip}`, { limit: 10, windowMs: 60_000 });
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

  if (error) {
    // Postgres unique violation code.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: "Could not join the waitlist right now." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
