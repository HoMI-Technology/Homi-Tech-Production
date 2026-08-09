"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileSection({
  userId,
  email,
  initialFullName,
}: {
  userId: string;
  email: string;
  initialFullName: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function handleSave() {
    setSaving(true);
    setStatus("idle");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", userId);
      setStatus(error ? "error" : "saved");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Profile</h2>
      <p className="mt-1 text-sm text-dim">Your basic account details.</p>

      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-sm text-dim">
            Full name
          </label>
          <input
            id="full_name"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-dim">Email</label>
          <p className="input opacity-70">{email}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" && <span className="text-sm text-emerald">Saved.</span>}
          {status === "error" && (
            <span className="text-sm text-crimson">Could not save. Try again.</span>
          )}
        </div>
      </div>
    </section>
  );
}
