"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/auth/password";

interface TotpFactor {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string | null;
}

/**
 * Security panel: password change + remove leftover TOTP factors.
 * New MFA enrollment is disabled — product login is password / magic link only.
 */
export function SecuritySection() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Change password ---
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwDone(false);
    const validationError = validateNewPassword(pw, pwConfirm);
    if (validationError) {
      setPwError(validationError);
      return;
    }
    setPwError(null);
    setPwSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: pw });
      if (updateError) {
        setPwError(updateError.message);
        return;
      }
      setPw("");
      setPwConfirm("");
      setPwDone(true);
    } catch {
      setPwError("Couldn't update your password. Try again in a moment.");
    } finally {
      setPwSaving(false);
    }
  }

  async function loadFactors() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.mfa.listFactors();
      setFactors((data?.totp as TotpFactor[] | undefined) ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFactors();
  }, []);

  async function handleUnenroll(id: string) {
    setError(null);
    setRemovingId(id);
    try {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (unenrollError) {
        setError(
          unenrollError.message +
            " If this keeps failing, remove the factor under Supabase → Authentication → Users.",
        );
        return;
      }
      await loadFactors();
    } finally {
      setRemovingId(null);
    }
  }

  const leftoverFactors = factors.filter((f) => f.status === "verified" || f.status === "unverified");

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Security</h2>
      <p className="mt-1 text-sm text-dim">
        Sign-in uses your email and password (or magic link). Two-factor codes are not required.
      </p>

      {loading ? (
        <div className="mt-6 h-10 animate-pulse rounded bg-slate-surface" />
      ) : leftoverFactors.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-light">Old authenticator still on this account</p>
          <p className="text-sm text-dim">
            You can remove it below. The app no longer asks for a code at sign-in either way.
          </p>
          {error && <p className="text-sm text-crimson">{error}</p>}
          {leftoverFactors.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-dim">
                {f.friendly_name?.trim() || "Authenticator app"} · {f.status}
              </p>
              <button
                type="button"
                onClick={() => handleUnenroll(f.id)}
                disabled={removingId === f.id}
                className="btn btn-sm btn-danger-ghost disabled:opacity-50"
              >
                {removingId === f.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-dim">No authenticator apps connected.</p>
      )}

      <div className="hairline my-8" />

      <h3 className="font-display text-lg font-semibold text-light">Change password</h3>
      <p className="mt-1 text-sm text-dim">Update the password you use to sign in.</p>

      <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm text-dim">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm text-dim">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>
        {pwError && <p className="text-sm text-crimson">{pwError}</p>}
        {pwDone && <p className="text-sm text-emerald">Password updated.</p>}
        <button
          type="submit"
          disabled={pwSaving || pw.length === 0}
          className="btn btn-primary btn-sm disabled:opacity-50"
        >
          {pwSaving ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
