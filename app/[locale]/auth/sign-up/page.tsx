"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safeNext";

function SignUpForm() {
  const t = useTranslations("auth.signUp");
  const tc = useTranslations("auth.common");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Same-origin only — defense-in-depth against ?next=//evil.com open redirects.
  const next = safeNext(searchParams.get("next"), "/onboarding");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=/onboarding`
              : undefined,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError(tc("genericError"));
    } finally {
      setLoading(false);
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
          data: fullName ? { full_name: fullName } : undefined,
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
            <label htmlFor="fullName" className="mb-1.5 block text-sm text-dim">
              {t("fullName")}
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder={t("fullNamePlaceholder")}
            />
          </div>

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
            <label htmlFor="password" className="mb-1.5 block text-sm text-dim">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder={t("passwordPlaceholder")}
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

      <div className="hairline my-6" />

      <p className="text-center text-sm text-dim">
        {t("haveAccount")}{" "}
        <Link href="/auth/sign-in" className="font-medium text-cyan hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="text-sm text-dim">…</div>}>
      <SignUpForm />
    </Suspense>
  );
}
