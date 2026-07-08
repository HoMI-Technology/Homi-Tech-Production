"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  // --- TOTP step-up (AAL2) ---
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        setNeedsMfa(true);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    if (mfaCode.length !== 6) return;
    setMfaError(null);
    setMfaSubmitting(true);
    try {
      const supabase = createClient();
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      const factor = factorsData?.totp?.[0];
      if (factorsError || !factor) {
        setMfaError("No authenticator app found on this account. Try signing in again.");
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challengeError || !challengeData) {
        setMfaError(challengeError?.message ?? "Could not verify that code. Try again.");
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) {
        setMfaError(verifyError.message);
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setMfaError("Something went wrong. Try again.");
    } finally {
      setMfaSubmitting(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first, then request the link.");
      return;
    }
    setError(null);
    setMagicLoading(true);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
              : undefined,
        },
      });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setMagicSent(true);
    } catch {
      setError("Couldn't send the link. Try again in a moment.");
    } finally {
      setMagicLoading(false);
    }
  }

  if (needsMfa) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-light">Two-factor verification</h1>
        <p className="mt-2 text-sm text-dim">Enter the 6-digit code from your authenticator app.</p>

        <form onSubmit={handleMfaVerify} className="mt-6 space-y-4">
          <div>
            <label htmlFor="mfa-code" className="mb-1.5 block text-sm text-dim">
              Authentication code
            </label>
            <input
              id="mfa-code"
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
            />
          </div>

          {mfaError && (
            <p role="alert" className="text-sm text-crimson">
              {mfaError}
            </p>
          )}

          <button
            type="submit"
            disabled={mfaSubmitting || mfaCode.length !== 6}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {mfaSubmitting ? "Verifying…" : "Verify and continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">Welcome back</h1>
      <p className="mt-2 text-sm text-dim">Sign in to pick up where you left off.</p>

      {magicSent ? (
        <div className="mt-6 rounded-xl border border-cyan/30 bg-cyan/10 p-4 text-sm text-light">
          Check your inbox. We sent a sign-in link to <span className="font-medium">{email}</span>.
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-dim">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLoading}
            className="btn btn-ghost w-full disabled:opacity-60"
          >
            {magicLoading ? "Sending link…" : "Email me a magic link"}
          </button>
        </form>
      )}

      <div className="hairline my-6" />

      <p className="text-center text-sm text-dim">
        New to HōMI?{" "}
        <Link href="/auth/sign-up" className="font-medium text-cyan hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-dim">
        <Link href="/demo" className="text-dim hover:text-light">
          Try the demo
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-sm text-dim">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
