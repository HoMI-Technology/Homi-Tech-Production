"use client";

import { useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  HOOK_STYLES,
  PLATFORMS,
  platformMeta,
  stripNeverSay,
  type HookStyle,
  type ImageBrief,
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

  const [brief, setBrief] = useState<ImageBrief | null>(null);
  const [briefSource, setBriefSource] = useState<"model" | "template" | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState<"canva" | "image" | null>(null);

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
    // A new caption invalidates the brief written against the old one.
    setBrief(null);
    setBriefSource(null);

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

  /**
   * Turn the finished caption into a design brief.
   *
   * Deliberately a second step rather than part of the caption call: the
   * operator edits the hook before it is worth briefing a visual against, and
   * the brief is only wanted for the captions that actually ship.
   */
  async function generateBrief() {
    setBriefLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "image_brief",
          caption_hook: hook.slice(0, 400),
          caption_body: body.slice(0, 3000),
          platform,
        }),
      });
      const data = (await response.json()) as Partial<ImageBrief> & {
        source?: "model" | "template";
        error?: string;
      };
      if (!response.ok || !data.canva_prompt || !data.midjourney_prompt) {
        setError(data.error ?? "Could not write the image brief.");
        return;
      }
      setBrief({
        canva_prompt: data.canva_prompt,
        midjourney_prompt: data.midjourney_prompt,
        style_notes: data.style_notes ?? "",
      });
      setBriefSource(data.source ?? "template");
    } catch {
      setError("Could not reach the brief service.");
    } finally {
      setBriefLoading(false);
    }
  }

  async function copyBrief(which: "canva" | "image", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBrief(which);
      window.setTimeout(() => setCopiedBrief(null), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select the brief and copy it manually.");
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

      {/* Image brief — only once there is a caption to brief a visual against. */}
      {hook && (
        <div className="mt-6 border-t border-white/5 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Image brief</p>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={generateBrief}
              disabled={briefLoading}
            >
              {briefLoading ? (
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                  Briefing
                </span>
              ) : brief ? (
                "Rewrite brief"
              ) : (
                "Generate image brief"
              )}
            </button>
            {briefSource && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
                {briefSource === "model" ? "Model" : "Template"}
              </span>
            )}
          </div>

          {brief && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-white/5 bg-navy/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-3xs uppercase tracking-wide text-cyan">Canva brief</p>
                    <button
                      type="button"
                      className="text-3xs text-dim hover:underline"
                      onClick={() => void copyBrief("canva", brief.canva_prompt)}
                    >
                      {copiedBrief === "canva" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-3xs leading-relaxed text-light">
                    {brief.canva_prompt}
                  </p>
                </div>
                <div className="rounded-lg border border-white/5 bg-navy/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-3xs uppercase tracking-wide text-cyan">Image prompt</p>
                    <button
                      type="button"
                      className="text-3xs text-dim hover:underline"
                      onClick={() => void copyBrief("image", brief.midjourney_prompt)}
                    >
                      {copiedBrief === "image" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-3xs leading-relaxed text-light">
                    {brief.midjourney_prompt}
                  </p>
                </div>
              </div>
              {brief.style_notes && (
                <p className="text-3xs leading-relaxed text-dim">{brief.style_notes}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
