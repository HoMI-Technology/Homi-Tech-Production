"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Inline MFA step-up for the admin access wall ("needs-stepup").
 *
 * The admin already has a verified authenticator, but the current session is
 * AAL1 (password/magic-link sign-in never lifts AAL on its own). Re-signing
 * in would land them right back here, so instead of a redirect loop this form
 * runs Supabase's challenge → verify against the existing session: a correct
 * code raises THIS session to AAL2, then router.refresh() re-runs the admin
 * layout and lets them in.
 */
export function AdminStepUpForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.find((f) => f.status === "verified");
      if (listError || !factor) {
        setError(
          "We couldn't find an authenticator on this account. Add one in your security settings, then come back.",
        );
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: code.trim(),
      });
      if (verifyError) {
        setError("That code didn't match. Check your authenticator app and try again.");
        return;
      }
      // Session is now AAL2 — re-run the server layout to enter the console.
      router.refresh();
    } catch {
      setError("Couldn't verify right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-3">
      <label htmlFor="admin-mfa-code" className="block text-sm text-dim">
        Authenticator code
      </label>
      <input
        id="admin-mfa-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="input text-center tracking-[0.3em]"
        placeholder="••••••"
      />
      {error && (
        <p role="alert" className="text-sm text-crimson">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || code.trim().length !== 6}
        className="btn btn-primary w-full disabled:opacity-50"
      >
        {busy ? "Verifying…" : "Verify and continue"}
      </button>
      <p className="text-xs leading-relaxed text-dim">
        Lost access to your authenticator app? Remove it in{" "}
        <Link href="/settings#security" className="text-cyan underline underline-offset-2">
          security settings
        </Link>{" "}
        and set up a new one.
      </p>
    </form>
  );
}
