/**
 * Admin API gate — the same three layers the /admin layout uses
 * (role + allowlist + MFA), not role-only.
 */

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import {
  deriveNextLevel,
  evaluateAdminAccess,
  parseAdminEmails,
  type AssuranceLevel,
} from "@/lib/auth/admin";

export async function requireAdmin(): Promise<{ user: User } | { response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  let currentLevel: AssuranceLevel | null = null;
  let nextLevel: AssuranceLevel | null = null;
  try {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    currentLevel = (data?.currentLevel as AssuranceLevel | null) ?? null;
  } catch {
    currentLevel = null;
  }
  try {
    const { data } = await supabase.auth.mfa.listFactors();
    nextLevel = deriveNextLevel(data?.totp ?? null);
  } catch {
    nextLevel = null;
  }

  const decision = evaluateAdminAccess({
    role: (profile as { role?: string | null } | null)?.role ?? null,
    email: (profile as { email?: string | null } | null)?.email ?? user.email ?? null,
    allowlist: parseAdminEmails(env.ADMIN_EMAILS),
    currentLevel,
    nextLevel,
  });

  if (!decision.allow) {
    const error =
      decision.reason === "needs-enrollment"
        ? "Admin MFA enrollment required."
        : decision.reason === "needs-stepup"
          ? "Admin MFA step-up required."
          : "Admin access required.";
    return { response: NextResponse.json({ error, reason: decision.reason }, { status: 403 }) };
  }

  return { user };
}
