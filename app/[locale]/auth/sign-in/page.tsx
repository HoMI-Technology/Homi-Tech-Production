"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safeNext";

function SignInForm() {
  const t = useTranslations("auth.signIn");
  const tc = useTranslations("auth.common");
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
      setError(tc("genericError"));
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
        setMfaError(t("mfa.noApp"));
        return;
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challengeError || !challengeData) {
        setMfaError(challengeError?.message ?? t("mfa.verifyFailed"));
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
      setMfaError(t("mfa.genericError"));
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
      setError(t("googleError"));
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError(tc("emailFirst"));
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
      setError(tc("magicError"));
    } finally {
      setMagicLoading(false);
    }
  }

  if (needsMfa) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-light">{t("mfa.title")}</h1>
        <p className="mt-2 text-sm text-dim">{t("mfa.subtitle")}</p>

        <form onSubmit={handleMfaVerify} className="mt-6 space-y-4">
          <div>
            <label htmlFor="mfa-code" className="mb-1.5 block text-sm text-dim">
              {t("mfa.label")}
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
            {mfaSubmitting ? t("mfa.verifying") : t("mfa.submit")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">{t("title")}</h1>
      <p className="mt-2 text-sm text-dim">{t("subtitle")}</p>

      {magicSent ? (
        <div className="mt-6 rounded-xl border border-cyan/30 bg-cyan/10 p-4 text-sm text-light">
          {tc.rich("magicSent", {
            email,
            b: (chunks) => <span className="font-medium">{chunks}</span>,
          })}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-dim">
              {tc("email")}
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
                {t("password")}
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-cyan hover:underline">
                {t("forgot")}
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
            {loading ? t("submitting") : t("submit")}
          </button>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLoading}
            className="btn btn-ghost w-full disabled:opacity-60"
          >
            {magicLoading ? tc("magicSending") : tc("magic")}
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
            aria-label={t("continueGoogle")}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="mr-1">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            {t("continueGoogle")}
          </button>
        </>
      )}

      <div className="hairline my-6" />

      <p className="text-center text-sm text-dim">
        {t("newTo")}{" "}
        <Link href="/auth/sign-up" className="font-medium text-cyan hover:underline">
          {t("createAccount")}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-dim">
        <Link href="/demo" className="text-dim hover:text-light">
          {t("tryDemo")}
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-sm text-dim">…</div>}>
      <SignInForm />
    </Suspense>
  );
}
