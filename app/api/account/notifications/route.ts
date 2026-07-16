import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  emailRemindersEnabled: z.boolean(),
});

/** PATCH /api/account/notifications — update email reminder preference. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "emailRemindersEnabled is required." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ email_reminders_enabled: parsed.data.emailRemindersEnabled })
    .eq("id", user.id);

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[notifications:PATCH:${correlationId}]`, error);
    return NextResponse.json(
      { error: "Could not update notification settings.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, emailRemindersEnabled: parsed.data.emailRemindersEnabled });
}

/** GET /api/account/notifications — read email reminder preference. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("email_reminders_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const correlationId = crypto.randomUUID();
    console.error(`[notifications:GET:${correlationId}]`, error);
    return NextResponse.json(
      { error: "Could not load notification settings.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    emailRemindersEnabled: data?.email_reminders_enabled ?? true,
  });
}
