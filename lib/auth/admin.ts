/**
 * Admin-access authorization policy (login-hardening layer).
 *
 * The admin console has always gated on `profiles.role === "admin"`. This
 * module adds two defense-in-depth checks on top of that role:
 *
 *   1. Email allowlist (`ADMIN_EMAILS`) — even a profile row with
 *      `role='admin'` is refused unless its email is on the allowlist. A
 *      compromised/forged row alone can no longer mint console access.
 *   2. MFA — **temporary founder waiver 2026-09-08.** Solo-founder login
 *      cannot complete authenticator enrollment, so `needs-enrollment` and
 *      `needs-stepup` are skipped unless MFA is explicitly required. Role +
 *      `ADMIN_EMAILS` remain the gate. Enrollment UX (Settings → Security and
 *      `AdminAccessWall`) is kept; this is not a deletion of MFA. Re-enable
 *      by passing `requireMfa: true` (`ADMIN_REQUIRE_MFA=true`). Default is
 *      off (`requireMfa` omitted/false).
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
  /** Session's current assurance level (from getAuthenticatorAssuranceLevel). */
  currentLevel: AssuranceLevel | null;
  /**
   * The highest level the user *could* reach — `aal2` iff they have at least
   * one verified factor enrolled. This is Supabase's `nextLevel`.
   */
  nextLevel: AssuranceLevel | null;
  /**
   * Temporary founder waiver (2026-09-08): when false/omitted, an allowlisted
   * admin enters the console without AAL2. When true, enrollment/step-up
   * walls apply. Default off for solo founder — not a permanent product
   * policy change.
   */
  requireMfa?: boolean;
}

/** A factor as returned by `supabase.auth.mfa.listFactors()`. */
export interface EnrolledFactor {
  status?: string | null;
}

/**
 * Resolve `nextLevel` from an *authoritative* factor list.
 *
 * This must never be read off the session. `getAuthenticatorAssuranceLevel()`
 * derives nextLevel from the session's cached user object, which is written at
 * sign-in — so an admin who enrolls TOTP on an existing session keeps looking
 * factor-less until they re-authenticate, and a mandated-MFA console reports
 * "enroll" to someone already enrolled. `listFactors()` queries the auth server,
 * so it can't go stale.
 *
 * A null/undefined list means the lookup itself failed: return null so the
 * policy fails safe rather than inventing an assurance level.
 */
export function deriveNextLevel(
  factors: readonly EnrolledFactor[] | null | undefined,
): AssuranceLevel | null {
  if (!factors) return null;
  return factors.some((f) => f.status === "verified") ? "aal2" : "aal1";
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
 * Parse `ADMIN_REQUIRE_MFA`. Temporary founder waiver: unset / empty / any
 * value other than a truthy token means MFA is **not** required.
 */
export function parseAdminRequireMfa(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const token = raw.trim().toLowerCase();
  return token === "1" || token === "true" || token === "yes" || token === "on";
}

/**
 * Decide whether the current request may enter the admin console. Pure — the
 * caller resolves role/email/AAL and passes them in.
 *
 * Decision matrix:
 *   - not an admin role / not allowlisted        → "not-admin"
 *   - requireMfa false/omitted (waiver default) → allow (role + allowlist only)
 *   - requireMfa true + session already AAL2   → allow
 *   - requireMfa true + enrolled, session AAL1 → "needs-stepup"
 *   - requireMfa true + no factor / AAL fail   → "needs-enrollment"
 *
 * When MFA is required, failed AAL lookups fail closed. When `currentLevel`
 * is AAL2 the session is trusted even if the factor lookup failed.
 */
export function evaluateAdminAccess(input: AdminAccessInput): AdminAccessDecision {
  const isAdminRole = input.role === "admin";
  if (!isAdminRole || !isEmailAllowlisted(input.email, input.allowlist)) {
    return { allow: false, reason: "not-admin" };
  }

  // Temporary founder waiver (2026-09-08): skip enrollment + step-up walls.
  if (input.requireMfa !== true) {
    return { allow: true };
  }

  if (input.currentLevel === "aal2") return { allow: true };
  if (input.nextLevel === "aal2") return { allow: false, reason: "needs-stepup" };
  return { allow: false, reason: "needs-enrollment" };
}
