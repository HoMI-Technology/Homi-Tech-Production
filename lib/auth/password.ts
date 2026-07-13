/**
 * Client-side password validation — a UX floor, never the security boundary.
 *
 * The real controls live server-side in Supabase Auth: minimum length, and
 * (once enabled in the dashboard, AUDIT T3.6) HaveIBeenPwned leaked-password
 * rejection. This helper just gives the user fast, friendly feedback before a
 * round-trip. Kept pure so it is trivially unit-testable and shared by both the
 * reset-password page and the settings password-change control.
 */

/** Minimum length we ask for in the UI. Supabase enforces its own minimum too. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Validates a new password and its confirmation.
 * Returns a human-readable error string, or null when the pair is acceptable.
 */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include at least one letter and one number.";
  }
  if (password !== confirm) {
    return "Those passwords don't match.";
  }
  return null;
}
