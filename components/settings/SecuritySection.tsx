"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/auth/password";

interface TotpFactor {
  id: string;
  status: "verified" | "unverified";
  friendly_name?: string | null;
}

/** Security panel: TOTP two-factor authentication via supabase.auth.mfa. */
export function SecuritySection() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<TotpFactor[]>([]);

  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
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

  function resetEnrollment() {
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setEnrolling(false);
  }

  async function handleEnroll() {
    setError(null);
    setEnrolling(true);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError || !data) {
        setError(enrollError?.message ?? "Could not start enrollment. Try again.");
        setEnrolling(false);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch {
      setError("Could not start enrollment. Try again.");
      setEnrolling(false);
    }
  }

  async function handleVerify() {
    if (!factorId || code.length !== 6) return;
    setError(null);
    setVerifying(true);
    try {
      const supabase = createClient();
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError || !challengeData) {
        setError(challengeError?.message ?? "Could not verify that code. Try again.");
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      resetEnrollment();
      await loadFactors();
    } catch {
      setError("Could not verify that code. Try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleUnenroll(id: string) {
    setError(null);
    setRemovingId(id);
    try {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: id });
      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }
      await loadFactors();
    } finally {
      setRemovingId(null);
    }
  }

  const verifiedFactor = factors.find((f) => f.status === "verified");

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Security</h2>
      <p className="mt-1 text-sm text-dim">
        Add an authenticator app as a second step at sign-in. Nothing here affects your HōMI-Score.
      </p>

      {loading ? (
        <div className="mt-6 h-10 animate-pulse rounded bg-slate-surface" />
      ) : verifiedFactor ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-light">Two-factor authentication is on</p>
            <p className="text-sm text-dim">An authenticator app is connected to your account.</p>
          </div>
          {error && <p className="w-full text-sm text-crimson">{error}</p>}
          <button
            type="button"
            onClick={() => handleUnenroll(verifiedFactor.id)}
            disabled={removingId === verifiedFactor.id}
            className="btn !border !border-crimson/50 !bg-transparent !px-4 !py-2 !text-crimson text-sm hover:!bg-crimson/10 disabled:opacity-50"
          >
            {removingId === verifiedFactor.id ? "Turning off…" : "Turn off"}
          </button>
        </div>
      ) : factorId ? (
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-dim">
            Scan this with your authenticator app (Google Authenticator, 1Password, Authy), or enter the
            secret manually.
          </p>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="Authenticator app QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
          )}
          {secret && (
            <p className="score-numeral break-all rounded-lg bg-slate-surface/60 px-3 py-2 text-xs text-dim">
              {secret}
            </p>
          )}
          <div>
            <label htmlFor="totp-code" className="mb-1.5 block text-sm text-dim">
              6-digit code from your app
            </label>
            <input
              id="totp-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
            />
          </div>
          {error && <p className="text-sm text-crimson">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying || code.length !== 6}
              className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
            >
              {verifying ? "Verifying…" : "Verify and enable"}
            </button>
            <button type="button" onClick={resetEnrollment} className="btn btn-ghost !px-4 !py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          {error && <p className="mb-3 text-sm text-crimson">{error}</p>}
          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrolling}
            className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
          >
            {enrolling ? "Starting…" : "Enable two-factor authentication"}
          </button>
        </div>
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
          className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
        >
          {pwSaving ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
