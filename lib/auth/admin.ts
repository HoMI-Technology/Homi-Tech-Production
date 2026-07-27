/**
 * Admin-access authorization policy (login-hardening layer).
 *
 * The admin console has always gated on `profiles.role === "admin"`. This
 * module adds two opt-in, defense-in-depth checks on top of that role, both
 * OFF by default so existing (role-only) behaviour is unchanged until an
 * operator turns them on:
 *
 *   1. Email allowlist (`ADMIN_EMAILS`) — even a profile row with
 *      `role='admin'` is refused unless its email is on the allowlist. A
 *      compromised/forged row alone can no longer mint console access.
 *   2. Mandatory MFA (`ADMIN_REQUIRE_MFA=1`) — an admin must hold an
 *      Assurance Level 2 (verified TOTP) session to reach the console.
 *
 * The step-up check (a verified factor exists but the current session is only
 * AAL1) is ALWAYS enforced regardless of the flags — if an admin has enrolled
 * MFA, we never serve the console to a half-authenticated session.
 *
 * Pure functions only: all Supabase/AAL lookups happen in the caller (the
 * admin layout) and are passed in, so this policy is unit-testable in
 * isolation. See `__tests__` for the decision matrix.
 */

/** Supabase MFA assurance levels, as returned by getAuthenticatorAssuranceLevel(). */
export type AssuranceLevel = "aal1" | "aal2";

/** The outcome of evaluating whether a request may enter the admin console. */
export type AdminAccessDecision =
  | { allow: true }
  /** Authenticated but not an admin (wrong role, or not on the allowlist). */
  | { allow: false; reason: "not-admin" }
  /** Admin, MFA required, but no verified factor enrolled yet → must enroll. */
  | { allow: false; reason: "needs-enrollment" }
  /** Admin with a verified factor, but the session is still AAL1 → must step up. */
  | { allow: false; reason: "needs-stepup" };

export interface AdminAccessInput {
  /** `profiles.role` for the signed-in user (null if no profile). */
  role: string | null | undefined;
  /** The signed-in user's email (case-insensitive match against the allowlist). */
  email: string | null | undefined;
  /** Parsed `ADMIN_EMAILS` allowlist; empty array = allowlist disabled. */
  allowlist: readonly string[];
  /** Whether `ADMIN_REQUIRE_MFA` is on. */
  requireMfa: boolean;
  /** Session's current assurance level (from getAuthenticatorAssuranceLevel). */
  currentLevel: AssuranceLevel | null;
  /**
   * The highest level the user *could* reach — `aal2` iff they have at least
   * one verified factor enrolled. This is Supabase's `nextLevel`.
   */
  nextLevel: AssuranceLevel | null;
}

/**
 * Parse an `ADMIN_EMAILS` env value ("a@x.com, b@y.com") into a normalized,
 * lowercased, de-duplicated list. Empty/undefined → [] (allowlist disabled).
 */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,\s]+/)) {
    const email = part.trim().toLowerCase();
    if (email && email.includes("@")) seen.add(email);
  }
  return [...seen];
}

/** True when `email` passes the allowlist (an empty allowlist passes everyone). */
export function isEmailAllowlisted(
  email: string | null | undefined,
  allowlist: readonly string[],
): boolean {
  if (allowlist.length === 0) return true;
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}

/**
 * Decide whether the current request may enter the admin console. Pure — the
 * caller resolves role/email/AAL and passes them in.
 */
export function evaluateAdminAccess(input: AdminAccessInput): AdminAccessDecision {
  const isAdminRole = input.role === "admin";
  if (!isAdminRole || !isEmailAllowlisted(input.email, input.allowlist)) {
    return { allow: false, reason: "not-admin" };
  }

  const hasVerifiedFactor = input.nextLevel === "aal2";
  const atAal2 = input.currentLevel === "aal2";

  // Enrolled a factor but the session hasn't stepped up → always block.
  if (hasVerifiedFactor && !atAal2) {
    return { allow: false, reason: "needs-stepup" };
  }

  // MFA mandated but no verified factor yet → must enroll before continuing.
  if (input.requireMfa && !hasVerifiedFactor) {
    return { allow: false, reason: "needs-enrollment" };
  }

  return { allow: true };
}
