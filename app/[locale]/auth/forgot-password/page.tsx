"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * /auth/forgot-password — starts the reset flow. Calls
 * supabase.auth.resetPasswordForEmail with a redirect through /auth/callback
 * (which exchanges the recovery code for a session) onward to
 * /auth/reset-password, where the user sets a new password.
 *
 * The success state is intentionally uniform whether or not the address has an
 * account — no email enumeration (AUDIT T1.8).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`
          : undefined;
      // We ignore the result deliberately: revealing whether the email exists
      // would leak account membership. Only a hard transport failure surfaces.
      await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      setSent(true);
    } catch {
      setError("Couldn't send the reset email. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">Reset your password</h1>
      <p className="mt-2 text-sm text-dim">
        Enter your email and we&apos;ll send a secure link to set a new password.
      </p>

      {sent ? (
        <div className="mt-6 rounded-xl border border-cyan/30 bg-cyan/10 p-4 text-sm text-light">
          If an account exists for <span className="font-medium">{email}</span>, a reset link is on its
          way. It expires in an hour — check your spam folder if you don&apos;t see it.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-dim">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-crimson">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-60">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <div className="hairline my-6" />

      <p className="text-center text-sm text-dim">
        Remembered it?{" "}
        <Link href="/auth/sign-in" className="font-medium text-cyan hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
