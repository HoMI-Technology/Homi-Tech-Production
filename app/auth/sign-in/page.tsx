"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safeNext";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Same-origin only — blocks ?next=//evil.com open-redirects post-login.
  const next = safeNext(searchParams.get("next"));

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

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (oauthError) setError(oauthError.message);
    } catch {
      setError("Could not start Google sign-in. Try again in a moment.");
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
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm text-dim">
                Password
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-cyan hover:underline">
                Forgot password?
              </Link>
            </div>
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

      {process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "1" && (
        <>
          <div className="hairline my-6" />
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="btn btn-ghost w-full"
            aria-label="Continue with Google"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mr-1">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>
        </>
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
