"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolvePostLoginDestination } from "@/lib/auth/postLoginDestination";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Raw `next` is resolved after auth with assessment state; deep links still
  // pass through resolvePostLoginDestination → safeNext.
  const requestedNext = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  function destinationAfterSignIn(): string {
    return resolvePostLoginDestination({
      requestedNext,
      hasCompletedAssessment: false,
    });
  }

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

      // Password auth only — no TOTP step-up. MFA is disabled for product login.
      const dest = destinationAfterSignIn();
      router.push(dest);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again in a moment.");
    } finally {
      setLoading(false);
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
      // Callback applies the same state-based resolver. Omit next when the
      // form had none so first-run users can land on Assess.
      const nextQuery = requestedNext?.trim()
        ? `?next=${encodeURIComponent(requestedNext.trim())}`
        : "";
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback${nextQuery}`
              : undefined,
        },
      });
      if (otpError) {
        setError(otpError.message);
        return;
      }
      setMagicSent(true);
    } catch {
      setError("Couldn’t send the link. Try again in a moment.");
    } finally {
      setMagicLoading(false);
    }
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

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full disabled:opacity-60"
          >
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

      <OAuthButtons next={requestedNext} />

      <div className="hairline my-6" />

      <p className="text-center text-sm text-dim">
        New to HōMI?{" "}
        <Link href="/auth/sign-up" className="font-medium text-cyan hover:underline">
          Create an account
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
