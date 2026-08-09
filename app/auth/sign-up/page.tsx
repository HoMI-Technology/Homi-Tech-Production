"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/auth/safeNext";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

function SignUpForm() {
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
              ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
              : undefined,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
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
      setError("Couldn’t send the link. Try again in a moment.");
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-light">Create your account</h1>
      <p className="mt-2 text-sm text-dim">Honest readiness starts with an honest account.</p>

      {magicSent ? (
        <div className="mt-6 rounded-xl border border-cyan/30 bg-cyan/10 p-4 text-sm text-light">
          Check your inbox. We sent a sign-in link to <span className="font-medium">{email}</span>.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm text-dim">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Jordan Rivera"
            />
          </div>

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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
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
            {loading ? "Creating account…" : "Create account"}
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

      <OAuthButtons next={next} />

      <div className="hairline my-6" />

      <p className="text-center text-sm text-dim">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-cyan hover:underline">
          Sign in
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
