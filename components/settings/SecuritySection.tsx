"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/auth/password";

interface TotpFactor {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string | null;
}

/** In-flight TOTP enrollment: factor created, waiting for the first code. */
interface PendingEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/**
 * Security panel: password change + TOTP authenticator management.
 *
 * Enrollment was product-disabled in 2026-07 (password / magic link only) and
 * is restored in 2026-08 alongside the admin-console MFA requirement: admins
 * need a verified authenticator to reach /admin, and everyone else can add
 * one for extra protection. Sign-in itself stays password / magic link —
 * the second factor is only asked for where policy requires it.
 */
export function SecuritySection() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Authenticator enrollment ---
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [enrollStarting, setEnrollStarting] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [enrollDone, setEnrollDone] = useState(false);

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

  async function handleStartEnroll() {
    setError(null);
    setEnrollDone(false);
    setEnrollStarting(true);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator app",
      });
      if (enrollError || !data) {
        setError("Couldn't start setup right now. Try again in a moment.");
        return;
      }
      setPending({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setEnrollCode("");
    } catch {
      setError("Couldn't start setup right now. Try again in a moment.");
    } finally {
      setEnrollStarting(false);
    }
  }

  async function handleCancelEnroll() {
    const factorId = pending?.factorId;
    setPending(null);
    setEnrollCode("");
    // Sweep up the half-created factor so an abandoned setup leaves no
    // unverified clutter on the account.
    if (factorId) {
      try {
        const supabase = createClient();
        await supabase.auth.mfa.unenroll({ factorId });
      } catch {
        // Best-effort cleanup — an orphaned unverified factor is harmless.
      }
    }
  }

  async function handleVerifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setError(null);
    setVerifying(true);
    try {
      const supabase = createClient();
      // Verifying the enrollment challenge also lifts this session to AAL2,
      // so an admin can go straight to the console afterwards.
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pending.factorId,
        code: enrollCode.trim(),
      });
      if (verifyError) {
        setError("That code didn't match. Check the app and try again.");
        return;
      }
      setPending(null);
      setEnrollCode("");
      setEnrollDone(true);
      await loadFactors();
    } catch {
      setError("Couldn't verify right now. Try again in a moment.");
    } finally {
      setVerifying(false);
    }
  }

  const knownFactors = factors.filter(
    (f) => f.status === "verified" || f.status === "unverified",
  );

  return (
    <section id="security" className="glass scroll-mt-24 p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Security</h2>
      <p className="mt-1 text-sm text-dim">
        Sign-in uses your email and password (or magic link). Adding an authenticator app gives
        your account a second layer of protection — admin accounts need one to open the console.
      </p>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="h-10 animate-pulse rounded bg-slate-surface" />
        ) : (
          <>
            {knownFactors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-light">
                  Authenticator apps on this account
                </p>
                {error && !pending && <p className="text-sm text-crimson">{error}</p>}
                {knownFactors.map((f) => (
                  <div
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-3"
                  >
                    <p className="text-sm text-dim">
                      {f.friendly_name?.trim() || "Authenticator app"} ·{" "}
                      {f.status === "verified" ? "active" : "setup unfinished"}
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
            )}

            {enrollDone && (
              <p className="text-sm text-emerald">
                Authenticator added. When you open the admin console, enter the current code from
                your app.
              </p>
            )}

            {pending ? (
              <form onSubmit={handleVerifyEnroll} className="space-y-4">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-dim">
                  <li>Open your authenticator app (Google Authenticator, 1Password, Authy).</li>
                  <li>Scan the QR code below, or enter the setup key by hand.</li>
                  <li>Type the 6-digit code the app shows to finish.</li>
                </ol>
                <div className="flex flex-col items-start gap-3">
                  {/* The white tile exists only so camera scanners can read the
                      QR code; the panel around it stays on the dark system. */}
                  <div
                    className="rounded-lg bg-white p-3 [&>svg]:block"
                    dangerouslySetInnerHTML={{ __html: pending.qrCode }}
                  />
                  <p className="text-sm text-dim">
                    Setup key:{" "}
                    <code className="font-mono text-light select-all">{pending.secret}</code>
                  </p>
                </div>
                <div>
                  <label htmlFor="totp-enroll-code" className="mb-1.5 block text-sm text-dim">
                    6-digit code
                  </label>
                  <input
                    id="totp-enroll-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={enrollCode}
                    onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ""))}
                    className="input w-40 text-center tracking-[0.3em]"
                    placeholder="••••••"
                  />
                </div>
                {error && <p className="text-sm text-crimson">{error}</p>}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={verifying || enrollCode.trim().length !== 6}
                    className="btn btn-primary btn-sm disabled:opacity-50"
                  >
                    {verifying ? "Verifying…" : "Verify and finish"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEnroll}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={handleStartEnroll}
                  disabled={enrollStarting}
                  className="btn btn-primary btn-sm disabled:opacity-50"
                >
                  {enrollStarting ? "Starting…" : "Add an authenticator app"}
                </button>
                {error && <p className="mt-3 text-sm text-crimson">{error}</p>}
              </div>
            )}
          </>
        )}
      </div>

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
