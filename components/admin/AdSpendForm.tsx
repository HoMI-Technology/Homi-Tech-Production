"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Today's date as YYYY-MM-DD in local time, for the date input default. */
function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/**
 * Admin entry form for the ad-spend ledger. Posts to /api/admin/ad-spend
 * (upsert on date+channel+campaign) and refreshes the page so the CAC/ROAS
 * tables recompute. Channel suggestions come from the attribution vocabulary.
 */
export function AdSpendForm({ channelSuggestions }: { channelSuggestions: string[] }) {
  const router = useRouter();
  const [spendDate, setSpendDate] = useState(todayIso());
  const [channel, setChannel] = useState("");
  const [campaign, setCampaign] = useState("");
  const [spendUsd, setSpendUsd] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const spend = Number(spendUsd);
    if (!channel.trim()) {
      setError("Channel is required.");
      return;
    }
    if (!Number.isFinite(spend) || spend < 0) {
      setError("Enter a valid non-negative spend amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/ad-spend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          spendDate,
          channel: channel.trim(),
          campaign: campaign.trim(),
          spendUsd: spend,
          impressions: impressions ? Number(impressions) : 0,
          clicks: clicks ? Number(clicks) : 0,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      setSaved(true);
      setSpendUsd("");
      setImpressions("");
      setClicks("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Date</span>
          <input
            type="date"
            required
            value={spendDate}
            onChange={(e) => setSpendDate(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Channel</span>
          <input
            type="text"
            required
            list="ad-spend-channels"
            placeholder="google, meta, referral…"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="input"
          />
          <datalist id="ad-spend-channels">
            {channelSuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Campaign (optional)</span>
          <input
            type="text"
            placeholder="utm_campaign, e.g. spring-launch"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Spend (USD)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            value={spendUsd}
            onChange={(e) => setSpendUsd(e.target.value)}
            className="input"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Impressions (optional)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="0"
            value={impressions}
            onChange={(e) => setImpressions(e.target.value)}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-dim">Clicks (optional)</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder="0"
            value={clicks}
            onChange={(e) => setClicks(e.target.value)}
            className="input"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-dim">Notes (optional)</span>
        <input
          type="text"
          placeholder="Context for this spend line"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm text-light">
          Spend saved.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? "Saving…" : "Log spend"}
        </button>
        <span className="text-xs text-dim">
          Re-logging the same date + channel + campaign updates that line.
        </span>
      </div>
    </form>
  );
}
