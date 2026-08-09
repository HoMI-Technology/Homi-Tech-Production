"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/Modal";

const CONFIRM_PHRASE = "DELETE";

/**
 * Account deletion confirmation, rebuilt on the shared Modal primitive
 * (task 3.5): role=dialog + aria-modal + labelledby, Escape to close, focus
 * trap, focus return to the "Delete my account" trigger, body scroll lock.
 * Backdrop click deliberately does NOT close — destructive flow; Cancel and
 * Escape are the exits. Typed-confirmation flow and the btn-danger action
 * are unchanged.
 */
export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

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
    <Modal
      open
      onClose={onClose}
      labelledBy={headingId}
      closeOnBackdrop={false}
      initialFocusRef={inputRef}
    >
      <h2 id={headingId} className="font-display text-xl font-semibold text-light">
        Delete your account
      </h2>
      <p className="mt-2 text-sm text-dim">
        This permanently removes your assessments, journal entries, check-ins, and share links. This
        cannot be undone.
      </p>

      <p className="mt-4 text-sm text-dim">
        Type <span className="font-semibold text-crimson">{CONFIRM_PHRASE}</span> to confirm.
      </p>
      <input
        ref={inputRef}
        className="input mt-2"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        aria-label={`Type ${CONFIRM_PHRASE} to confirm deletion`}
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
          className="btn btn-danger disabled:opacity-50"
        >
          {loading ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </Modal>
  );
}
