import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/sign-out — ends the session and redirects home. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
