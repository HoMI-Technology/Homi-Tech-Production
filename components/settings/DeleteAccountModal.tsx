"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_PHRASE = "DELETE";

export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = input.trim() === CONFIRM_PHRASE;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not delete your account. Try again.");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not delete your account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-md p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-light">Delete your account</h2>
        <p className="mt-2 text-sm text-dim">
          This permanently removes your assessments, journal entries, check-ins, and share links. This cannot be undone.
        </p>

        <p className="mt-4 text-sm text-dim">
          Type <span className="font-semibold text-crimson">{CONFIRM_PHRASE}</span> to confirm.
        </p>
        <input
          className="input mt-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={CONFIRM_PHRASE}
          autoFocus
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-crimson">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="btn !bg-crimson !text-white disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
