"use client";

import { useState, type FormEvent } from "react";

type Interest = "home-buying" | "career-change" | "major-purchase" | "teams";

const INTEREST_OPTIONS: { value: Interest; label: string }[] = [
  { value: "home-buying", label: "Home buying" },
  { value: "career-change", label: "Career change" },
  { value: "major-purchase", label: "Major purchase" },
  { value: "teams", label: "Teams / benefits" },
];

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<Interest>("home-buying");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interest }),
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

  if (status === "success") {
    return (
      <div className="glass p-8 text-center">
        <p className="font-display text-xl text-light">
          You&rsquo;re on the list. We&rsquo;ll tell you the truth when it&rsquo;s your turn.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass flex flex-col gap-5 p-8">
      <div>
        <label htmlFor="waitlist-email" className="text-sm font-medium text-light">
          Email
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input mt-2"
        />
      </div>

      <div>
        <label htmlFor="waitlist-interest" className="text-sm font-medium text-light">
          What brings you here?
        </label>
        <select
          id="waitlist-interest"
          value={interest}
          onChange={(e) => setInterest(e.target.value as Interest)}
          className="input mt-2"
        >
          {INTEREST_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={status === "loading"} className="btn btn-primary mt-2">
        {status === "loading" ? "Sending…" : "Get notified"}
      </button>

      {status === "error" && (
        <p className="text-center text-sm text-dim">
          Something didn&rsquo;t connect. Try again in a moment.
        </p>
      )}
    </form>
  );
}
