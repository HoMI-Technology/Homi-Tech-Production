"use client";

import { useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  HOOK_STYLES,
  PLATFORMS,
  platformMeta,
  stripNeverSay,
  type HookStyle,
  type SocialPlatform,
} from "@/lib/admin/marketing-agency";

/**
 * Single-purpose caption tool: an image (or a description of one) plus the key
 * message in, a hook line, body and hashtags out.
 *
 * Kept separate from the content studio on purpose — captions are written
 * against a visual, so the inputs and the failure modes are different. The
 * claim-law badge is the same guardrail either way.
 */
export function PostCaptionWriter() {
  const fieldId = useId();

  const [imageUrl, setImageUrl] = useState("");
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<SocialPlatform>("instagram");
  const [hookStyle, setHookStyle] = useState<HookStyle>("question");

  const [hook, setHook] = useState("");
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const meta = platformMeta(platform);
  const full = hook ? `${hook}\n\n${body}\n\n${hashtags.join(" ")}`.trim() : "";
  const used = hook.length + body.length;
  const over = used > meta.limit;

  async function generate() {
    const trimmedIdea = idea.trim();
    if (trimmedIdea.length < 3) {
      setError("Say what the key message is — a sentence is enough.");
      return;
    }

    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "caption",
          idea: trimmedIdea,
          // The URL is what the operator has; the model can only work from
          // words, so the URL doubles as the description when nothing else
          // was typed. An empty string is omitted rather than sent.
          imageDescription: imageUrl.trim() || undefined,
          platform,
          hookStyle,
        }),
      });
      const data = (await response.json()) as {
        hook?: string;
        body?: string;
        hashtags?: string[];
        source?: "model" | "template";
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Generation failed. Try again.");
        return;
      }

      const checkedHook = stripNeverSay(data.hook ?? "");
      const checkedBody = stripNeverSay(data.body ?? "");
      setHook(checkedHook.clean);
      setBody(checkedBody.clean);
      setHashtags(data.hashtags ?? []);
      setSource(data.source ?? "template");
      setFlagged([...new Set([...checkedHook.flagged, ...checkedBody.flagged])]);
    } catch {
      setError("Could not reach the generator. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select the caption and copy it manually.");
    }
  }

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Caption writer"
        subtitle="Write the caption for a graphic — hook, body and hashtags in one pass."
        action={
          source ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
              {source === "model" ? "Model" : "Template"}
            </span>
          ) : null
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-image`}>
          Image URL or description (optional)
          <input
            id={`${fieldId}-image`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={imageUrl}
            spellCheck={false}
            placeholder="/marketing/content/posts/… or describe the visual"
            onChange={(e) => setImageUrl(e.target.value.slice(0, 400))}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-idea`}>
          Key message
          <input
            id={`${fieldId}-idea`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={idea}
            placeholder="What should the reader take away?"
            onChange={(e) => setIdea(e.target.value.slice(0, 400))}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-platform`}>
          Platform
          <select
            id={`${fieldId}-platform`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
          >
            {PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-hook`}>
          Hook style
          <select
            id={`${fieldId}-hook`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={hookStyle}
            onChange={(e) => setHookStyle(e.target.value as HookStyle)}
          >
            {HOOK_STYLES.map((h) => (
              <option key={h.key} value={h.key}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Operator-supplied asset paths open in a new tab rather than rendering
          inline — the field also accepts a plain description, so there is not
          always an image to preview. */}
      {imageUrl.trim().startsWith("/") && (
        <a
          href={imageUrl.trim()}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block font-mono text-3xs text-cyan hover:underline"
        >
          Open asset ↗
        </a>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={generate} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              Writing
            </span>
          ) : (
            "Write caption"
          )}
        </button>
        <span
          className={`rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${
            flagged.length > 0
              ? "border-crimson/40 bg-crimson/10 text-light"
              : "border-emerald/40 bg-emerald/10 text-emerald"
          }`}
        >
          {flagged.length > 0 ? `Claim law · ${flagged.length} stripped` : "Claim law · clean"}
        </span>
        <span className={`score-numeral text-xs ${over ? "text-crimson" : "text-dim"}`}>
          {used.toLocaleString()} / {meta.limit.toLocaleString()}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        <label className="block text-3xs uppercase tracking-wide text-dim" htmlFor={`${fieldId}-out-hook`}>
          Hook
          <input
            id={`${fieldId}-out-hook`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-xs text-light"
            value={hook}
            spellCheck={false}
            onChange={(e) => setHook(e.target.value)}
            placeholder="The opening line lands here."
          />
        </label>
        <label className="block text-3xs uppercase tracking-wide text-dim" htmlFor={`${fieldId}-out-body`}>
          Body
          <textarea
            id={`${fieldId}-out-body`}
            className="mt-1 min-h-32 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-xs text-light"
            value={body}
            spellCheck={false}
            onChange={(e) => setBody(e.target.value)}
            placeholder="The caption body lands here."
          />
        </label>
        {hashtags.length > 0 && (
          <p className="font-mono text-3xs text-cyan">{hashtags.join(" ")}</p>
        )}
      </div>

      {flagged.length > 0 && (
        <p className="mt-3 text-xs text-crimson">
          Removed prohibited phrasing: {flagged.join(", ")}. Rewrite the gap before this ships.
        </p>
      )}

      <div className="mt-4">
        <button type="button" className="btn btn-primary btn-sm" onClick={copyAll} disabled={!hook}>
          {copied ? "Copied" : "Copy all"}
        </button>
      </div>
    </div>
  );
}
