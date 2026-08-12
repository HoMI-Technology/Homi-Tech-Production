"use client";

import { useMemo, useState } from "react";
import { buildUtmUrl } from "@/lib/admin/marketing-command";

const PATHS = [
  { value: "/assessment", label: "Assessment" },
  { value: "/shadow-score", label: "Shadow score" },
  { value: "/waitlist", label: "Waitlist" },
  { value: "/", label: "Home" },
  { value: "/guides/afford-is-not-ready", label: "Guide: afford ≠ ready" },
  { value: "/guides/what-homi-is-not", label: "Guide: what HōMI isn’t" },
  { value: "/pricing", label: "Pricing" },
] as const;

const PRESETS = [
  { source: "linkedin", medium: "social", campaign: "founder_post" },
  { source: "email", medium: "lifecycle", campaign: "launch_live" },
  { source: "x", medium: "social", campaign: "founder_post" },
  { source: "producthunt", medium: "referral", campaign: "launch" },
] as const;

/**
 * Build first-touch UTM links for founder posts and campaigns.
 * Client-only so copy-to-clipboard works without a server action.
 */
export function UtmLinkBuilder() {
  const [path, setPath] = useState<string>("/assessment");
  const [source, setSource] = useState("linkedin");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("founder_post");
  const [copied, setCopied] = useState(false);

  const url = useMemo(
    () => buildUtmUrl({ path, source, medium, campaign }),
    [path, source, medium, campaign],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={`${p.source}-${p.campaign}`}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSource(p.source);
              setMedium(p.medium);
              setCampaign(p.campaign);
            }}
          >
            {p.source}/{p.campaign}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-dim">
          Landing path
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          >
            {PATHS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-dim">
          utm_campaign
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value.replace(/\s+/g, "_").slice(0, 80))}
            spellCheck={false}
          />
        </label>
        <label className="block text-xs text-dim">
          utm_source
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={source}
            onChange={(e) => setSource(e.target.value.replace(/\s+/g, "").slice(0, 40))}
            spellCheck={false}
          />
        </label>
        <label className="block text-xs text-dim">
          utm_medium
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={medium}
            onChange={(e) => setMedium(e.target.value.replace(/\s+/g, "").slice(0, 40))}
            spellCheck={false}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-xs text-cyan">
          {url}
        </code>
        <button type="button" className="btn btn-primary btn-sm shrink-0" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="text-xs text-dim">
        First-touch wins. Use on every founder post so Source of last 10 is not all “direct”.
      </p>
    </div>
  );
}
