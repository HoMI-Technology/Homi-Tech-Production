"use client";

import { useId, useState, type FormEvent } from "react";
import {
  WAITLIST_INTERESTS,
  type WaitlistInterest,
  type WaitlistSource,
} from "@/lib/waitlist";

export function WaitlistForm({
  source = "waitlist",
  idPrefix,
  surface = "card",
}: {
  source?: WaitlistSource;
  idPrefix?: string;
  /** `whisper` is the homepage close — fields only, no glass card. */
  surface?: "card" | "whisper";
}) {
  const generatedId = useId();
  const prefix = idPrefix ?? `waitlist-${generatedId}`;
  const emailId = `${prefix}-email`;
  const interestId = `${prefix}-interest`;
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<WaitlistInterest>("home-buying");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interest, source }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const whisper = surface === "whisper";

  if (status === "success") {
    return (
      <div className={whisper ? "text-left" : "glass p-8 text-center"}>
        <p className={whisper ? "text-sm text-dim" : "font-display text-xl text-light"}>
          You&rsquo;re on the list. We&rsquo;ll tell you the truth when it&rsquo;s your turn.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={whisper ? "flex flex-col gap-3 text-left" : "glass flex flex-col gap-5 p-8 text-left"}
    >
      <div>
        <label htmlFor={emailId} className={whisper ? "text-xs font-medium text-dim" : "text-sm font-medium text-light"}>
          Email
        </label>
        <input
          id={emailId}
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input mt-2"
        />
      </div>

      <div>
        <label htmlFor={interestId} className={whisper ? "text-xs font-medium text-dim" : "text-sm font-medium text-light"}>
          What brings you here?
        </label>
        <select
          id={interestId}
          value={interest}
          onChange={(e) => setInterest(e.target.value as WaitlistInterest)}
          className="input mt-2"
        >
          {WAITLIST_INTERESTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className={whisper ? "btn btn-ghost btn-sm mt-1 self-start" : "btn btn-primary mt-2"}
      >
        {status === "loading" ? "Sending…" : "Get notified"}
      </button>

      {status === "error" && (
        <p className={`text-sm text-dim ${whisper ? "text-left" : "text-center"}`} role="alert">
          Something didn&rsquo;t connect. Try again in a moment.
        </p>
      )}
    </form>
  );
}
