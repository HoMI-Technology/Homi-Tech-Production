"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { HomieAvatar } from "@/components/companion/HomieAvatar";
import { buildCompanionContext } from "@/lib/advisor/context";
import { fetchLatestStoredAssessment } from "@/lib/assessment/latest";
import { MessageContent } from "@/components/companion/MessageContent";
import { QuotaNotice } from "@/components/advisor/QuotaNotice";
import { useQuotaGate } from "@/hooks/useQuotaGate";
import { CompanionTierBanner } from "@/components/companion/CompanionTierBanner";
import {
  consumeLensDigest,
  takePendingSynthesisMessage,
  SYNTHESIS_EVENT,
} from "@/lib/tools/digest";
import {
  loadIdentity,
  saveIdentity,
  hasChosenIdentity,
  getPreset,
  getLaunchSkin,
  isLaunchSkin,
  LAUNCH_SKINS,
  IDENTITY_NAME_MAX,
  DEFAULT_IDENTITY,
  type HomiIdentity,
  type HomiPreset,
  type LaunchSkinKey,
} from "@/lib/advisor/identity";
import { PERSONAS, type AdvisorPersona } from "@/lib/advisor/personas";
import { SegmentedControl, accentFromBrandHex } from "@/components/ui/SegmentedControl";
import {
  loadThreadMessages,
  saveThreadMessages,
  pullAdvisorThread,
} from "@/lib/advisor/thread-store";
import { track } from "@/lib/analytics";
import { detectAcuteDistress } from "@/lib/advisor/crisis";
import { ingestPhase0Observation, writePhase0Freeze } from "@/lib/advisor/phase0";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { resolvePhase0PersonKey, usePhase0Freeze } from "@/hooks/usePhase0Freeze";
import { useHomieVoice } from "@/hooks/useHomieVoice";
import { estimateSpeechRateWpm } from "@/lib/advisor/voice";
import { orchestrateHomieBehaviors } from "@/lib/advisor/behaviors";
import {
  cardsForSpeech,
  clearHomieCardHighlights,
  highlightHomieCards,
} from "@/lib/advisor/card-highlight";
import type { HomieCardId } from "@/types/companion";
import { decideGentleInterrupt } from "@/lib/advisor/gentle-interrupter";
import { readEmotionalMirror } from "@/lib/advisor/emotional-mirror";
import type { VerdictKey } from "@/lib/brand";

type Role = "user" | "assistant";

interface CompanionMessage {
  id: string;
  role: Role;
  content: string;
}

const OPEN_KEY = "homi:companion-open";
const PERSONA_KEY = "homi:companion-persona";

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The HōMI's visual form: the threshold compass for the classic, a glowing
 * brand-color orb for the others. Abstract on purpose — no mascots.
 */
function HomiForm({
  preset,
  size,
  glow = false,
}: {
  preset: HomiPreset;
  size: number;
  glow?: boolean;
}) {
  if (preset.form === "compass") {
    return <ThresholdCompass size={size} animated={false} glow={glow} verdict={undefined} />;
  }
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${preset.color}, ${preset.color}22 72%)`,
        boxShadow: `0 0 ${Math.round(size / 2)}px ${preset.color}55`,
      }}
    />
  );
}

/**
 * Floating Decision Companion — a compass-styled launcher (bottom-right,
 * product pages only) that opens a compact skin-aware chat panel. Launch
 * chrome offers Steady / Clarity / Horizon only; engine personas stay
 * underneath. Not a replacement for the full /advisor page (hidden there
 * by design), just a quick line to HōMI wherever the user happens to be.
 *
 * Prefer mounting via CompanionHost so this module is not in the public
 * initial script graph. `skipIdle` is set when the host already gated on
 * user intent (click / synthesis / restored open).
 */
export function CompanionWidget({ skipIdle = false }: { skipIdle?: boolean } = {}) {
  const pathname = usePathname();
  const freeze = usePhase0Freeze();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persona, setPersona] = useState<AdvisorPersona>("homie");
  const [identity, setIdentity] = useState<HomiIdentity>(DEFAULT_IDENTITY);
  const [identityChosen, setIdentityChosen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [gateCta, setGateCta] = useState<{ href: string; label: string } | null>(null);
  const quota = useQuotaGate();
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [presenceNote, setPresenceNote] = useState<string | null>(null);
  // LCP guard when mounted directly: keep markup off the critical path until
  // idle. CompanionHost sets skipIdle after user intent so open is immediate.
  const [idleReady, setIdleReady] = useState(skipIdle);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listenStartedAtRef = useRef<number>(0);
  const clearHighlightRef = useRef<(() => void) | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const interruptedThisListenRef = useRef(false);

  const voice = useHomieVoice({
    ttsEnabled,
    onError: (err) => setVoiceError(err.message),
    onLatency: (sample) => {
      if (!sample.withinBudget) {
        track("homie_voice_latency_over_budget", {
          phase: sample.phase,
          ms: sample.durationMs,
        });
      }
    },
  });
  const {
    caps: voiceCaps,
    avatarState,
    interim: voiceInterim,
    listening: voiceListening,
    listen,
    stopListening,
    speak,
    chimeAndPause,
    setSilentPresence,
    resetPresence,
  } = voice;

  // Defer first render until the browser is idle (falls back to a short timer
  // where requestIdleCallback is unavailable, e.g. Safari). Skipped when the
  // host already confirmed user intent (skipIdle).
  useEffect(() => {
    if (skipIdle) {
      setIdleReady(true);
      return;
    }
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setIdleReady(true), { timeout: 3000 });
      return () =>
        (w as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdleReady(true), 1200);
    return () => window.clearTimeout(t);
  }, [skipIdle]);

  // Hydrate persisted state on mount (client only).
  useEffect(() => {
    setMessages(loadThreadMessages("widget"));
    const identityOnLoad = loadIdentity();
    setIdentity(identityOnLoad);
    setIdentityChosen(hasChosenIdentity());
    if (typeof window !== "undefined") {
      setOpen(window.sessionStorage.getItem(OPEN_KEY) === "1");
      // Skin identity wins: launch skins pin the engine persona. Classic chrome
      // may still restore a previously stored persona for continuity.
      const skin = getLaunchSkin(identityOnLoad.preset);
      if (skin) {
        setPersona(skin.persona);
      } else {
        const storedPersona = window.sessionStorage.getItem(PERSONA_KEY) as AdvisorPersona | null;
        if (storedPersona && PERSONAS.some((p) => p.key === storedPersona)) {
          setPersona(storedPersona);
        }
      }
    }
    setHydrated(true);

    // One memory: signed-in users reconcile their server thread — same
    // conversation as the full-page chat, any device — via the persistence
    // contract. Anonymous (401) or failure keeps the local sessionStorage
    // copy loaded above.
    let cancelled = false;
    void pullAdvisorThread("widget").then((thread) => {
      if (cancelled || !thread) return;
      if (thread.conversationId) setConversationId(thread.conversationId);
      if (thread.messages.length > 0) setMessages(thread.messages);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function commitNameDraft() {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setIdentity(saveIdentity({ name: trimmed, preset: identity.preset }));
    setIdentityChosen(true);
    track("companion_renamed");
  }

  function chooseSkin(p: HomiPreset) {
    setIdentity(saveIdentity({ name: p.name, preset: p.key }));
    setPersona(p.persona);
    setIdentityChosen(true);
    track("companion_preset_chosen");
  }

  function selectLaunchSkin(key: LaunchSkinKey) {
    const skin = getPreset(key);
    const nextName =
      identity.name === DEFAULT_IDENTITY.name ? skin.name : identity.name;
    setIdentity(saveIdentity({ name: nextName, preset: skin.key }));
    setPersona(skin.persona);
    setIdentityChosen(true);
    track("companion_preset_chosen");
  }

  useEffect(() => {
    if (!hydrated) return;
    saveThreadMessages("widget", messages);
  }, [messages, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.sessionStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.sessionStorage.setItem(PERSONA_KEY, persona);
  }, [persona, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Escape closes the panel and returns focus to the launcher.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const container = panelRef.current;
      if (!container) return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Simple focus trap entry: move focus into the panel when it opens.
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => {
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: CompanionMessage = { id: makeId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setVoiceError(null);
    setPresenceNote(null);
    clearHighlightRef.current?.();
    clearHighlightRef.current = null;
    cancelSpeakRef.current?.();

    try {
      const personKey = await resolvePhase0PersonKey();
      const tripped = ingestPhase0Observation({
        personKey,
        texts: [trimmed],
        selfHarm: detectAcuteDistress(trimmed),
      });
      if (tripped.frozen && tripped.record) {
        return;
      }

      const latest = await fetchLatestStoredAssessment();
      const { assessment, finance, credit, surface, whatChanged, path } =
        buildCompanionContext(pathname, latest);

      const afterHardTruth =
        Boolean(assessment?.hardStops?.length) ||
        assessment?.verdict === "NOT_YET" ||
        /\b(not yet|do not proceed|hard stop)\b/i.test(
          messages.filter((m) => m.role === "assistant").slice(-1)[0]?.content ?? "",
        );

      // Voice turns carry pace: words over the live listen window feed the
      // Emotional Mirror's voice-tone read. Typed turns have no pace signal.
      const speakingMs = listenStartedAtRef.current
        ? Date.now() - listenStartedAtRef.current
        : 0;
      const speechRateWpm =
        speakingMs > 0 ? (estimateSpeechRateWpm(trimmed, speakingMs) ?? undefined) : undefined;

      const behavior = orchestrateHomieBehaviors({
        utterance: trimmed,
        thread: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        speakingMs,
        speechRateWpm,
        afterHardTruth,
        presenceRoll: Math.random(),
        futureSelf: assessment
          ? {
              score: assessment.score,
              verdict: assessment.verdict as VerdictKey,
              pillars: assessment.pillars,
              pathProgress:
                path && path.stepCount > 0
                  ? path.completedCount / path.stepCount
                  : null,
            }
          : undefined,
      });

      // Silent Witness — presence only; no API call this turn.
      if (behavior.primary === "silent_witness" && behavior.silent?.remainSilent) {
        setSilentPresence();
        setPresenceNote("HōMI is here with you.");
        track("homie_silent_witness", { reason: behavior.silent.reason });
        clearHighlightRef.current = highlightHomieCards(["companion_line"]);
        return;
      }

      if (behavior.primary === "emotional_mirror" && behavior.emotional) {
        setPresenceNote(behavior.emotional.reflection);
      } else if (behavior.primary === "future_self" && behavior.futureSelf) {
        setPresenceNote(`Future self · ${behavior.futureSelf.horizonLabel}`);
      } else if (behavior.primary === "memory_palace" && behavior.memoryRefs?.length) {
        setPresenceNote("Holding what you've already shared.");
      }

      // Decision Lab Phase 3: if a lens on this page has published a fresh
      // digest, the Companion reads its precomputed numbers — it never
      // recomputes them. Page-scoped and staleness-guarded at consume.
      const lensDigest = consumeLensDigest(pathname);
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          assessment,
          finance,
          surface,
          whatChanged,
          credit,
          path,
          lensDigest,
          identity,
          persona,
          homieBehaviorHint: behavior.promptHint,
          phase0Frozen: freeze.status === "frozen",
          phase0Until: freeze.record?.until,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        reply?: unknown;
        error?: unknown;
        conversationId?: unknown;
        source?: unknown;
        phase0?: {
          frozen?: boolean;
          until?: number;
          financialStress?: boolean;
          selfHarm?: boolean;
        };
      };

      if (data.source === "phase0" && data.phase0?.frozen && typeof data.phase0.until === "number") {
        writePhase0Freeze({
          personKey,
          until: data.phase0.until,
          trippedAt: Date.now(),
          financialStress: Boolean(data.phase0.financialStress),
          selfHarm: Boolean(data.phase0.selfHarm),
          signalIds: [],
        });
        return;
      }

      if (!res.ok) {
        // 402 is a commercial statement, so it renders as chrome below the thread —
        // Homie does not ask for money in its own voice (ADR-003). 401 and everything
        // else still speak in-thread: those interrupt the conversation, they are not
        // a sales moment.
        if (quota.handleResponse(res.status, data)) {
          setGateCta(null);
          return;
        }
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something interrupted that thought. Try asking again in a moment.";
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: msg }]);
        if (res.status === 401) {
          setGateCta({
            href: `/auth/sign-in?next=${encodeURIComponent(pathname)}`,
            label: "Sign in",
          });
        } else if (res.status === 402) {
          // Payload predates the structured quota field — keep the old CTA path.
          setGateCta({ href: "/pricing", label: "See plans" });
        }
        return;
      }

      setGateCta(null);
      quota.clear();
      if (typeof data.conversationId === "string") setConversationId(data.conversationId);
      const replyContent: string =
        typeof data.reply === "string"
          ? data.reply
          : "Something interrupted that thought. Try asking again in a moment.";

      setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: replyContent }]);

      // Highlight what Homie actually says: the pre-reply behavior cards plus
      // instruments named in the spoken reply itself.
      const highlightCards: HomieCardId[] = Array.from(
        new Set([...behavior.cards, ...cardsForSpeech(replyContent)]),
      );
      clearHighlightRef.current = highlightHomieCards(highlightCards);
      track("homie_behavior_turn", { behavior: behavior.primary });
      if (ttsEnabled && voiceCaps.synthesis) {
        // Highlights live for the speech window — released when the spoken
        // reply ends. With TTS muted there is no window, so they linger until
        // the next turn or close (visual stand-in for speech).
        cancelSpeakRef.current = speak(replyContent, () => {
          clearHighlightRef.current?.();
          clearHighlightRef.current = null;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: "Connection dropped on my end. Try that again in a moment.",
        },
      ]);
    } finally {
      setSending(false);
      listenStartedAtRef.current = 0;
    }
  }

  // Latest-ref so the synthesis listener (registered once) always calls the
  // current sendMessage closure.
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  // Clear dashboard highlights when the panel closes or unmounts.
  useEffect(() => {
    if (!open) {
      clearHighlightRef.current?.();
      clearHighlightRef.current = null;
      cancelSpeakRef.current?.();
      cancelSpeakRef.current = null;
      clearHomieCardHighlights();
      resetPresence();
    }
  }, [open, resetPresence]);

  useEffect(() => {
    return () => {
      clearHomieCardHighlights();
      cancelSpeakRef.current?.();
    };
  }, []);

  // Gentle Interrupter — while listening, soft-pause long monologues once.
  useEffect(() => {
    if (!voiceListening || !voiceInterim || interruptedThisListenRef.current) return;
    const speakingMs = Date.now() - listenStartedAtRef.current;
    const emotional = readEmotionalMirror(
      voiceInterim,
      estimateSpeechRateWpm(voiceInterim, speakingMs) ?? undefined,
    );
    const decision = decideGentleInterrupt({
      transcript: voiceInterim,
      speakingMs,
      emotional,
    });
    if (!decision.shouldInterrupt) return;
    interruptedThisListenRef.current = true;
    chimeAndPause();
    stopListening();
    setPresenceNote(decision.insight ?? null);
    track("homie_gentle_interrupt", { reason: decision.reason });
    const text = voiceInterim.trim();
    if (text) void sendMessageRef.current(text);
  }, [voiceInterim, voiceListening, chimeAndPause, stopListening]);

  // "What does this change for me?" — a lens button queues the message and
  // fires the event; the panel opens and sends it with the page's fresh
  // digest attached (picked up inside sendMessage).
  //
  // Also drain on hydrate: CompanionHost may load this module *after* the
  // synthesis event already fired (interaction-gated import race).
  useEffect(() => {
    function handleSynthesis() {
      const pending = takePendingSynthesisMessage();
      if (!pending) return;
      setOpen(true);
      track("lens_synthesis_opened");
      sendMessageRef.current(pending);
    }
    window.addEventListener(SYNTHESIS_EVENT, handleSynthesis);
    if (hydrated) {
      handleSynthesis();
    }
    return () => window.removeEventListener(SYNTHESIS_EVENT, handleSynthesis);
  }, [hydrated]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  async function handleVoiceToggle() {
    setVoiceError(null);
    if (voiceListening) {
      stopListening();
      return;
    }
    if (!open) setOpen(true);
    interruptedThisListenRef.current = false;
    listenStartedAtRef.current = Date.now();
    track("homie_voice_listen_start");
    const text = await listen();
    if (interruptedThisListenRef.current) return;
    if (text.trim()) {
      setInput(text.trim());
      await sendMessage(text.trim());
    }
  }

  // Full chat lives on /advisor already — don't double up the surface there.
  // Ops console: keep Companion off admin so attention work stays uncluttered.
  if (pathname === "/advisor" || pathname === "/admin" || pathname.startsWith("/admin/")) {
    return null;
  }
  if (!idleReady) return null;

  const activeSkin = getLaunchSkin(identity.preset);
  const skinForEmptyState = activeSkin ?? getPreset(identity.preset);
  const selectedSkinKey: LaunchSkinKey | null = isLaunchSkin(identity.preset)
    ? identity.preset
    : null;

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={() =>
          setOpen((o) => {
            const next = !o;
            if (next) track("companion_opened");
            return next;
          })
        }
        aria-expanded={open}
        aria-controls="homi-companion-panel"
        aria-label={open ? "Close HōMI Companion" : "Open HōMI Companion"}
        className="companion-launcher compass-glow fixed right-6 z-[var(--z-menu)] flex h-14 w-14 items-center justify-center rounded-full border border-cyan/40 bg-navy-light/90 shadow-lg backdrop-blur bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] max-lg:bottom-[calc(4.5rem_+_env(safe-area-inset-bottom,0px))]"
      >
        {/* max-lg raise keeps the launcher above the ProductBottomNav tab bar
            (bar height + safe-area inset) so it never covers a tab. */}
        <HomieAvatar
          state={open ? avatarState : "breathing"}
          size={48}
          accent={getPreset(identity.preset).color}
        />
      </button>

      {open && (
        <div
          id="homi-companion-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="HōMI Companion"
          className="companion-sheet glass fixed right-4 z-[var(--z-overlay)] flex h-[min(70dvh,560px)] max-h-[calc(100dvh-env(safe-area-inset-top,0px)-8rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-2xl bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] max-lg:bottom-[calc(8.5rem_+_env(safe-area-inset-bottom,0px))] sm:right-6"
        >
          <div className="flex items-center justify-between border-b border-slate-surface/60 px-4 py-3">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={commitNameDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitNameDraft();
                  if (e.key === "Escape") setEditingName(false);
                }}
                maxLength={IDENTITY_NAME_MAX}
                aria-label="Name your HōMI"
                className="input w-40 !py-1 text-sm"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(identity.name === DEFAULT_IDENTITY.name ? "" : identity.name);
                  setEditingName(true);
                }}
                title="Name your HōMI"
                className="group flex items-center gap-1.5 rounded px-1 -mx-1 text-left transition-colors hover:bg-slate-surface/40"
              >
                <HomiForm preset={getPreset(identity.preset)} size={14} />
                <span className="font-display text-sm font-semibold text-light">
                  {identity.name === DEFAULT_IDENTITY.name ? "HōMI Companion" : identity.name}
                </span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-dim opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden="true"
                >
                  <path d="M11.5 2.5l2 2L5 13l-2.5.5L3 11l8.5-8.5z" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close HōMI Companion"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-dim transition-colors hover:text-light"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Honest free vs paid Companion labeling (display only; server gates access). */}
          <CompanionTierBanner compact />

          <div className="border-b border-slate-surface/60 px-3 py-2.5">
            <SegmentedControl<LaunchSkinKey>
              ariaLabel="Companion skin"
              options={LAUNCH_SKINS.map((p) => ({
                value: p.key,
                label: p.name,
                accent: accentFromBrandHex(p.color),
              }))}
              value={selectedSkinKey}
              onChange={selectLaunchSkin}
              variant="compact"
              className="flex flex-wrap gap-1.5"
            />
          </div>

          {freeze.status === "frozen" && freeze.record ? (
            <div className="flex-1 overflow-y-auto">
              <Phase0FreezeScreen record={freeze.record} />
            </div>
          ) : (
            <>
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label={`Conversation with ${
              identity.name === DEFAULT_IDENTITY.name ? "HōMI Companion" : identity.name
            }`}
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.length === 0 && !identityChosen && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div>
                  <p className="font-display text-sm font-semibold text-light">Choose your HōMI</p>
                  <p className="mt-1 text-xs text-dim">
                    Steady, Clarity, or Horizon. Rename it any time.
                  </p>
                </div>
                <div className="grid w-full grid-cols-3 gap-2">
                  {LAUNCH_SKINS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => chooseSkin(p)}
                      className="glass flex flex-col items-center gap-1.5 rounded-xl border border-slate-surface/60 p-3 transition-colors hover:border-cyan/40"
                    >
                      <HomiForm preset={p} size={28} />
                      <span className="text-sm font-semibold text-light">{p.name}</span>
                      <span className="text-2xs leading-snug text-dim">{p.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length === 0 && identityChosen && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <HomiForm preset={skinForEmptyState} size={48} glow />
                <p className="text-xs text-dim">{skinForEmptyState.role}</p>
                <p className="max-w-[240px] text-sm text-light">
                  {activeSkin
                    ? `Ask me anything — ${activeSkin.name} is listening.`
                    : "Ask me anything. Pick Steady, Clarity, or Horizon above whenever you want a different surface."}
                </p>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm text-light">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div className="glass max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed text-light">
                    <MessageContent text={m.content} />
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div
                className="glass inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-3 py-2"
                role="status"
                aria-label="HōMI is thinking"
              >
                <span className="companion-typing-dot" style={{ animationDelay: "0ms" }} />
                <span className="companion-typing-dot" style={{ animationDelay: "160ms" }} />
                <span className="companion-typing-dot" style={{ animationDelay: "320ms" }} />
              </div>
            )}
          </div>

          {quota.notice && (
            <QuotaNotice data={quota.notice} onDismiss={quota.clear} className="mx-3 mt-1" />
          )}

          {gateCta && (
            <div className="px-3 pt-1">
              <a
                href={gateCta.href}
                onClick={() => setOpen(false)}
                className="btn btn-primary btn-sm block w-full text-center"
              >
                {gateCta.label}
              </a>
            </div>
          )}

          {/* Presence / voice status. Kept mounted so the live region exists
              before content arrives — conditional mounting can drop the
              announcement in some screen readers. */}
          <div
            className={`space-y-1 px-3 ${
              presenceNote || voiceError || (voiceListening && voiceInterim) ? "pt-1" : ""
            }`}
            aria-live="polite"
          >
            {presenceNote && (
              <p className="text-3xs leading-snug text-cyan/80">{presenceNote}</p>
            )}
            {voiceListening && voiceInterim && (
              <p className="text-3xs leading-snug text-dim">Listening: {voiceInterim}</p>
            )}
            {voiceError && (
              <p className="text-3xs leading-snug text-amber">{voiceError}</p>
            )}
          </div>

          <div className="hairline" />
          <div className="flex items-end gap-2 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                voiceListening ? "Listening…" : `Ask ${identity.name}…`
              }
              className="input max-h-28 flex-1 resize-none !py-2 text-sm"
              aria-label={`Message ${identity.name}`}
            />
            {voiceCaps.recognition && (
              <button
                type="button"
                onClick={() => void handleVoiceToggle()}
                disabled={sending}
                className={`btn btn-sm px-3 disabled:opacity-50 ${
                  voiceListening
                    ? "border border-cyan/50 bg-cyan/15 text-cyan"
                    : "btn-secondary"
                }`}
                aria-pressed={voiceListening}
                aria-label={voiceListening ? "Stop listening" : "Speak to HōMI"}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden="true"
                >
                  <rect x="7" y="2" width="6" height="10" rx="3" />
                  <path d="M4 9a6 6 0 0 0 12 0M10 15v3" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {voiceCaps.synthesis && (
              <button
                type="button"
                onClick={() => setTtsEnabled((v) => !v)}
                className={`btn btn-sm px-2.5 ${
                  ttsEnabled ? "text-cyan" : "text-dim"
                }`}
                aria-pressed={ttsEnabled}
                aria-label={ttsEnabled ? "Mute HōMI voice" : "Unmute HōMI voice"}
                title={ttsEnabled ? "Voice replies on" : "Voice replies off"}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  aria-hidden="true"
                >
                  {ttsEnabled ? (
                    <>
                      <path d="M3 8v4h3l4 3V5L6 8H3z" strokeLinejoin="round" />
                      <path d="M14 7.5a4 4 0 0 1 0 5" strokeLinecap="round" />
                    </>
                  ) : (
                    <>
                      <path d="M3 8v4h3l4 3V5L6 8H3z" strokeLinejoin="round" />
                      <path d="M14 8l4 4M18 8l-4 4" strokeLinecap="round" />
                    </>
                  )}
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={sending || !input.trim()}
              className="btn btn-primary btn-sm px-3 disabled:opacity-50"
              aria-label="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 10h14M11 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="px-3 pb-2 text-center text-3xs leading-snug text-dim/70">
            Educational guidance only — not financial advice.
          </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
