"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/auth/password";
import { Link, useRouter } from "@/i18n/navigation";

/**
 * /auth/reset-password — the second half of the recovery flow. The user
 * arrives here with a recovery session already established by /auth/callback
 * (exchangeCodeForSession). We confirm that session exists, then let them set a
 * new password via supabase.auth.updateUser.
 *
 * If there's no session (link expired, opened directly, or already used), we
 * show a recovery path rather than a dead form.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setHasSession(Boolean(user));
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateNewPassword(password, confirm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      // Give the confirmation a beat to render, then send them into the app.
      router.refresh();
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <p className="text-sm text-dim">Verifying your reset link…</p>;
  }

  if (!hasSession) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-light">This link has expired</h1>
        <p className="mt-2 text-sm text-dim">
          Reset links are single-use and expire after an hour. Request a fresh one and try again.
        </p>
        <Link href="/auth/forgot-password" className="btn btn-primary mt-6 w-full">
          Send a new reset link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-light">Password updated</h1>
        <p className="mt-2 text-sm text-dim">
          You&apos;re signed in with your new password.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6 w-full">
          Go to your dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">Set a new password</h1>
      <p className="mt-2 text-sm text-dim">Choose something you haven&apos;t used here before.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm text-dim">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm text-dim">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-crimson">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full disabled:opacity-60">
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
