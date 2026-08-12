"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { WebhookPublishButtons } from "@/components/admin/WebhookPublisher";
import { COLORS } from "@/lib/brand";
import { ENGINE_WEEK_POSTS, buildUtmUrl } from "@/lib/admin/marketing-command";
import {
  CALENDAR_ADD_EVENT,
  PERSONAS,
  PLATFORMS,
  STUDIO_PREFILL_EVENT,
  TONES,
  personaBrief,
  platformMeta,
  slugifyCampaign,
  stripNeverSay,
  type CalendarAddDetail,
  type CalendarDay,
  type CalendarSlot,
  type PersonaKey,
  type PostTone,
  type SocialPlatform,
  type StudioPrefillDetail,
} from "@/lib/admin/marketing-agency";

type HistoryItem = {
  id: number;
  platform: SocialPlatform;
  tone: PostTone;
  topic: string;
  copy: string;
  hashtags: string[];
  campaign: string;
  source: "model" | "template";
};

type RepurposedPost = {
  platform: SocialPlatform;
  copy: string;
  hashtags: string[];
  campaign: string;
  source: "model" | "template";
};

const MAX_HISTORY = 5;

/** A LinkedIn post is the source; these are the three surfaces it adapts to. */
const REPURPOSE_TARGETS: SocialPlatform[] = ["x", "instagram", "threads"];

function isTone(value: string): value is PostTone {
  return TONES.some((t) => t.key === value);
}

/**
 * AI content studio — platform, tone and topic in, claim-safe post copy plus a
 * tagged link out.
 *
 * Two guardrails run on every completion. The endpoint strips prohibited
 * phrases server-side; stripNeverSay runs again here so what lands in the
 * textarea (and therefore the clipboard) is what the operator was shown. The
 * badge reports what the strip removed rather than hiding it.
 */
export function SocialContentStudio() {
  const fieldId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const [platform, setPlatform] = useState<SocialPlatform>("linkedin");
  const [tone, setTone] = useState<PostTone>("educational");
  const [topic, setTopic] = useState("");
  const [copy, setCopy] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [campaign, setCampaign] = useState("founder_post");
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"none" | "post" | "sent">("none");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [target, setTarget] = useState<{ day: CalendarDay; slot: CalendarSlot } | null>(null);
  const [persona, setPersona] = useState<PersonaKey>("all");
  const [advanced, setAdvanced] = useState(false);
  const [repurposed, setRepurposed] = useState<RepurposedPost[]>([]);
  const [repurposing, setRepurposing] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<SocialPlatform | null>(null);

  const meta = platformMeta(platform);
  const link = buildUtmUrl({
    path: "/assessment",
    source: meta.utmSource,
    medium: meta.utmMedium,
    campaign: campaign || "founder_post",
  });
  const combined = copy ? `${copy}${hashtags.length ? `\n\n${hashtags.join(" ")}` : ""}\n\n${link}` : "";
  const used = copy.length;
  const over = used > meta.limit;
  const meterPct = Math.min(100, meta.limit > 0 ? Math.round((used / meta.limit) * 100) : 0);
  const meterColor = over ? COLORS.crimson : meterPct > 85 ? COLORS.amber : COLORS.cyan;

  // The calendar's "+ Add post" opens this panel with the slot remembered, so
  // the finished post can go straight back to the cell it was requested from.
  useEffect(() => {
    function onPrefill(event: Event) {
      const detail = (event as CustomEvent<StudioPrefillDetail>).detail;
      if (!detail) return;
      setTarget({ day: detail.day, slot: detail.slot });
      if (detail.topic) setTopic(detail.topic);
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener(STUDIO_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(STUDIO_PREFILL_EVENT, onPrefill);
  }, []);

  // The themed calendar and the analytics import both deep-link here with a
  // topic already chosen. Read from window rather than useSearchParams so this
  // island never forces the page into a Suspense bailout at build time.
  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const nextTopic = params.get("studio_topic");
    const nextTone = params.get("studio_tone");
    if (!nextTopic && !nextTone) return;
    if (nextTopic) setTopic(nextTopic.slice(0, 400));
    if (nextTone && isTone(nextTone)) setTone(nextTone);
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const generate = useCallback(async () => {
    const trimmed = topic.trim();
    if (trimmed.length < 3) {
      setError("Give the post a topic — at least a few words.");
      return;
    }

    setLoading(true);
    setError(null);
    setCopied("none");
    // A new post invalidates whatever the last one was repurposed into.
    setRepurposed([]);

    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "generate_post",
          platform,
          tone,
          topic: trimmed,
          persona: personaBrief(persona) || undefined,
        }),
      });
      const data = (await response.json()) as {
        copy?: string;
        hashtags?: string[];
        utmSuggestion?: string;
        source?: "model" | "template";
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Generation failed. Try again.");
        return;
      }

      const checked = stripNeverSay(data.copy ?? "");
      const nextCampaign = slugifyCampaign(data.utmSuggestion || trimmed);
      const nextTags = data.hashtags ?? [];
      const nextSource = data.source ?? "template";

      setCopy(checked.clean);
      setFlagged(checked.flagged);
      setHashtags(nextTags);
      setCampaign(nextCampaign);
      setSource(nextSource);
      setHistory((prev) =>
        [
          {
            id: nextId.current++,
            platform,
            tone,
            topic: trimmed,
            copy: checked.clean,
            hashtags: nextTags,
            campaign: nextCampaign,
            source: nextSource,
          },
          ...prev,
        ].slice(0, MAX_HISTORY),
      );
    } catch {
      setError("Could not reach the generator. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [platform, tone, topic, persona]);

  /**
   * Adapt the LinkedIn post to the other three surfaces in one pass.
   *
   * Three independent calls rather than one prompt returning three posts: each
   * platform has its own ceiling and its own failure mode, and a single failure
   * should cost one column, not all of them. A rejected call falls back to that
   * platform's template inside the endpoint, so every column always fills.
   */
  const repurpose = useCallback(async () => {
    if (!copy) return;
    setRepurposing(true);
    setError(null);

    try {
      const results = await Promise.all(
        REPURPOSE_TARGETS.map(async (targetPlatform): Promise<RepurposedPost | null> => {
          const response = await fetch("/api/admin/marketing-ai", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "repurpose",
              source_copy: copy.slice(0, 3000),
              target_platform: targetPlatform,
            }),
          });
          const data = (await response.json()) as {
            copy?: string;
            hashtags?: string[];
            utmSuggestion?: string;
            source?: "model" | "template";
          };
          if (!response.ok || !data.copy) return null;
          return {
            platform: targetPlatform,
            copy: stripNeverSay(data.copy).clean,
            hashtags: data.hashtags ?? [],
            campaign: slugifyCampaign(data.utmSuggestion || campaign),
            source: data.source ?? "template",
          };
        }),
      );

      const usable = results.filter((r): r is RepurposedPost => r !== null);
      setRepurposed(usable);
      if (usable.length < REPURPOSE_TARGETS.length) {
        setError("Some platforms did not come back. Retry to fill the missing columns.");
      }
    } catch {
      setError("Could not reach the generator while repurposing.");
    } finally {
      setRepurposing(false);
    }
  }, [copy, campaign]);

  async function copyRepurposed(post: RepurposedPost) {
    const meta = platformMeta(post.platform);
    const link = buildUtmUrl({
      path: "/assessment",
      source: meta.utmSource,
      medium: meta.utmMedium,
      campaign: post.campaign,
    });
    const text = `${post.copy}${post.hashtags.length ? `\n\n${post.hashtags.join(" ")}` : ""}\n\n${link}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(post.platform);
      window.setTimeout(() => setCopiedTarget(null), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select the copy and copy it manually.");
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(combined);
      setCopied("post");
      window.setTimeout(() => setCopied("none"), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select the copy and copy it manually.");
    }
  }

  function sendToCalendar() {
    const detail: CalendarAddDetail = {
      day: target?.day,
      slot: target?.slot,
      platform,
      tone,
      campaign: campaign || "founder_post",
      copy,
    };
    window.dispatchEvent(new CustomEvent<CalendarAddDetail>(CALENDAR_ADD_EVENT, { detail }));
    setTarget(null);
    setCopied("sent");
    window.setTimeout(() => setCopied("none"), 1600);
  }

  function restore(item: HistoryItem) {
    setPlatform(item.platform);
    setTone(item.tone);
    setTopic(item.topic);
    setCopy(item.copy);
    setHashtags(item.hashtags);
    setCampaign(item.campaign);
    setSource(item.source);
    setFlagged(stripNeverSay(item.copy).flagged);
  }

  return (
    <div ref={rootRef} className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="AI content studio"
        subtitle="Platform, tone and topic in — claim-safe post copy and a tagged link out."
        action={
          source ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
              {source === "model" ? "Model" : "Template"}
            </span>
          ) : null
        }
      />

      {/* Platform tabs */}
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Target platform">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={platform === p.key}
            className={platform === p.key ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
            onClick={() => setPlatform(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-tone`}>
          Tone
          <select
            id={`${fieldId}-tone`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={tone}
            onChange={(e) => setTone(e.target.value as PostTone)}
          >
            {TONES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-topic`}>
          Topic
          <input
            id={`${fieldId}-topic`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={topic}
            placeholder="What is this post about?"
            onChange={(e) => setTopic(e.target.value.slice(0, 400))}
          />
        </label>
      </div>

      {/* Persona — collapsed by default. Most posts are written for the general
          ICP; targeting is the exception, so it lives behind a toggle. */}
      <div className="mt-3">
        <button
          type="button"
          className="text-3xs uppercase tracking-wide text-cyan hover:underline"
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          {advanced ? "Hide advanced" : "Advanced"}
          {persona !== "all" && !advanced ? " · persona set" : ""}
        </button>
        {advanced && (
          <label className="mt-2 block max-w-md text-xs text-dim" htmlFor={`${fieldId}-persona`}>
            Persona
            <select
              id={`${fieldId}-persona`}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
              value={persona}
              onChange={(e) => setPersona(e.target.value as PersonaKey)}
            >
              {PERSONAS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            {personaBrief(persona) && (
              <span className="mt-1 block text-3xs text-dim">
                The model writes to this anxiety in their own language.
              </span>
            )}
          </label>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-3xs uppercase tracking-wide text-dim">This week</span>
        {ENGINE_WEEK_POSTS.map((p) => (
          <button
            key={p.campaign}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setTopic(p.title);
              setCampaign(p.campaign);
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={generate} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              Generating
            </span>
          ) : (
            "Generate post"
          )}
        </button>
        {target && (
          <span className="text-xs text-dim">
            Writing for{" "}
            <span className="text-cyan">
              {target.day} · {target.slot}
            </span>
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      {/* Output */}
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-3xs uppercase tracking-wide text-dim" htmlFor={`${fieldId}-copy`}>
            Post copy
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${
                flagged.length > 0
                  ? "border-crimson/40 bg-crimson/10 text-light"
                  : "border-emerald/40 bg-emerald/10 text-emerald"
              }`}
            >
              {flagged.length > 0 ? `Claim law · ${flagged.length} stripped` : "Claim law · clean"}
            </span>
            <span
              className={`score-numeral text-xs ${over ? "text-crimson" : "text-dim"}`}
              aria-label={`${used} of ${meta.limit} characters used`}
            >
              {used.toLocaleString()} / {meta.limit.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-surface">
          <div
            className="h-full rounded-full"
            style={{ width: `${meterPct}%`, background: meterColor }}
          />
        </div>

        <textarea
          id={`${fieldId}-copy`}
          className="mt-2 min-h-40 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-xs text-light"
          value={copy}
          spellCheck={false}
          onChange={(e) => {
            setCopy(e.target.value);
            setFlagged(stripNeverSay(e.target.value).flagged);
          }}
          placeholder="Generated copy lands here — edit freely before you post."
        />

        {flagged.length > 0 && (
          <p className="mt-2 text-xs text-crimson">
            Removed prohibited phrasing: {flagged.join(", ")}. Reread the copy — the gap needs a
            rewrite, not a paste.
          </p>
        )}

        {hashtags.length > 0 && (
          <p className="mt-2 font-mono text-3xs text-dim">{hashtags.join(" ")}</p>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-3xs text-cyan">
            {link}
          </code>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={copyAll}
              disabled={!copy}
            >
              {copied === "post" ? "Copied" : "Copy post + link"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={sendToCalendar}
              disabled={!copy}
            >
              {copied === "sent" ? "Added" : "Send to calendar"}
            </button>
          </div>
        </div>

        {/* Publish + log. Both only make sense once there is a post. */}
        {copy && (
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-white/5 pt-3">
            <WebhookPublishButtons
              platform={platform}
              copy={copy}
              utmLink={link}
              utmCampaign={campaign || "founder_post"}
              hashtags={hashtags}
            />
            <a
              href={`/admin/marketing?log_campaign=${encodeURIComponent(campaign || "founder_post")}`}
              className="text-xs text-cyan hover:underline"
            >
              Log this post’s performance →
            </a>
          </div>
        )}

        {/* Repurpose — LinkedIn is the source surface, so the button only makes
            sense there. Everything else is a target, not an origin. */}
        {copy && platform === "linkedin" && (
          <div className="mt-4 border-t border-white/5 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={repurpose}
                disabled={repurposing}
              >
                {repurposing ? (
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                    />
                    Adapting
                  </span>
                ) : (
                  "Repurpose to all platforms"
                )}
              </button>
              <span className="text-xs text-dim">
                One pass to X, Instagram and Threads — each fitted to its own ceiling.
              </span>
            </div>

            {repurposed.length > 0 && (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {repurposed.map((post) => {
                  const targetMeta = platformMeta(post.platform);
                  const targetLink = buildUtmUrl({
                    path: "/assessment",
                    source: targetMeta.utmSource,
                    medium: targetMeta.utmMedium,
                    campaign: post.campaign,
                  });
                  const targetOver = post.copy.length > targetMeta.limit;
                  return (
                    <div
                      key={post.platform}
                      className="rounded-lg border border-white/5 bg-navy/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-light">{targetMeta.label}</p>
                        <span
                          className="score-numeral text-3xs"
                          style={{ color: targetOver ? COLORS.crimson : COLORS.dim }}
                        >
                          {post.copy.length.toLocaleString()} / {targetMeta.limit.toLocaleString()}
                        </span>
                      </div>
                      <textarea
                        aria-label={`${targetMeta.label} copy`}
                        className="mt-2 min-h-32 w-full rounded-lg border border-white/10 bg-navy/40 px-2 py-2 font-mono text-3xs text-light"
                        value={post.copy}
                        spellCheck={false}
                        onChange={(e) =>
                          setRepurposed((prev) =>
                            prev.map((item) =>
                              item.platform === post.platform
                                ? { ...item, copy: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                      {post.hashtags.length > 0 && (
                        <p className="mt-1.5 font-mono text-3xs text-dim">
                          {post.hashtags.join(" ")}
                        </p>
                      )}
                      <code className="mt-2 block break-all font-mono text-3xs text-cyan">
                        {targetLink}
                      </code>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm mt-2 w-full"
                        onClick={() => void copyRepurposed(post)}
                      >
                        {copiedTarget === post.platform ? "Copied" : "Copy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="text-3xs uppercase tracking-wide text-dim">
            Last {history.length} generated · this session only
          </p>
          <ul className="mt-2 space-y-1.5">
            {history.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="glass-hover w-full rounded-lg border border-white/5 px-3 py-2 text-left"
                  onClick={() => restore(item)}
                >
                  <p className="truncate text-xs text-light">{item.topic}</p>
                  <p className="mt-0.5 font-mono text-3xs text-dim">
                    {platformMeta(item.platform).label} · {item.tone} · {item.campaign}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
