import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/sign-out — ends the session and redirects home. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 ensures the follow-up request to "/" is a GET; 307 would preserve POST
  // and hit a 405 on the homepage route.
  return NextResponse.redirect(new URL("/", request.url), 303);
}
