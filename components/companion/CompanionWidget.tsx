"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { buildAssessmentContext } from "@/lib/advisor/context";
import { PERSONAS, type AdvisorPersona } from "@/lib/advisor/personas";
import { track } from "@/lib/analytics";

type Role = "user" | "assistant";

interface CompanionMessage {
  id: string;
  role: Role;
  content: string;
}

const THREAD_KEY = "homi:companion-thread";
const OPEN_KEY = "homi:companion-open";
const PERSONA_KEY = "homi:companion-persona";

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadThread(): CompanionMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(THREAD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveThread(messages: CompanionMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(THREAD_KEY, JSON.stringify(messages));
  } catch {
    // Not fatal — thread persistence is a nicety.
  }
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Floating Decision Companion — a compass-styled launcher (bottom-right,
 * product pages only) that opens a compact persona-aware chat panel. Not a
 * replacement for the full /advisor page (hidden there by design), just a
 * quick line to HōMI wherever the user happens to be in the product.
 */
export function CompanionWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persona, setPersona] = useState<AdvisorPersona>("homie");
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [gateCta, setGateCta] = useState<{ href: string; label: string } | null>(null);
  // LCP guard: the widget is never the largest paint and never above the fold,
  // so we keep its markup + hydration cost off the critical path until the page
  // is idle. This removed the launcher from the LCP path on the interactive
  // (product) routes (mortgage/shadow-score) that were breaking the 2.5s budget.
  const [idleReady, setIdleReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Defer first render until the browser is idle (falls back to a short timer
  // where requestIdleCallback is unavailable, e.g. Safari). Reduced-motion and
  // functionality are unchanged — only the timing of mount shifts.
  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setIdleReady(true), { timeout: 3000 });
      return () => (w as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setIdleReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  // Hydrate persisted state on mount (client only).
  useEffect(() => {
    setMessages(loadThread());
    if (typeof window !== "undefined") {
      setOpen(window.sessionStorage.getItem(OPEN_KEY) === "1");
      const storedPersona = window.sessionStorage.getItem(PERSONA_KEY) as AdvisorPersona | null;
      if (storedPersona && PERSONAS.some((p) => p.key === storedPersona)) {
        setPersona(storedPersona);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveThread(messages);
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

    try {
      const assessment = buildAssessmentContext();
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          assessment,
          persona,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { reply?: unknown; error?: unknown };

      if (!res.ok) {
        // The gate returns truthful, on-brand copy (sign-in / upgrade / retry) —
        // never let a 401/402 fall through to the generic "interrupted" line.
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something interrupted that thought. Try asking again in a moment.";
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: msg }]);
        if (res.status === 401) {
          setGateCta({ href: `/auth/sign-in?next=${encodeURIComponent(pathname)}`, label: "Sign in" });
        } else if (res.status === 402) {
          setGateCta({ href: "/pricing", label: "See plans" });
        }
        return;
      }

      setGateCta(null);
      const replyContent: string =
        typeof data.reply === "string"
          ? data.reply
          : "Something interrupted that thought. Try asking again in a moment.";

      setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: replyContent }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "assistant", content: "Connection dropped on my end. Try that again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Full chat lives on /advisor already — don't double up the surface there.
  if (pathname === "/advisor") return null;
  if (!idleReady) return null;

  const activePersona = PERSONAS.find((p) => p.key === persona) ?? PERSONAS[0];

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
        className="compass-glow fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-cyan/40 bg-navy-light/90 shadow-lg backdrop-blur transition-transform hover:scale-105"
      >
        <ThresholdCompass size={40} animated={!open} glow={false} verdict={undefined} />
      </button>

      {open && (
        <div
          id="homi-companion-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="HōMI Companion"
          className="glass fixed bottom-24 right-6 z-50 flex h-[70vh] max-h-[560px] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-surface/60 px-4 py-3">
            <p className="font-display text-sm font-semibold text-light">HōMI Companion</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close HōMI Companion"
              className="rounded-full p-1.5 text-dim transition-colors hover:text-light"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-slate-surface/60 px-3 py-2.5">
            {PERSONAS.map((p) => {
              const selected = p.key === persona;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPersona(p.key)}
                  aria-pressed={selected}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors"
                  style={{
                    borderColor: selected ? `${p.color}66` : "rgba(148,163,184,0.18)",
                    background: selected ? `${p.color}14` : "transparent",
                    color: selected ? p.color : "#94a3b8",
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <ThresholdCompass size={48} glow animated={false} />
                <p className="text-xs text-dim">{activePersona.role}</p>
                <p className="max-w-[240px] text-sm text-light">
                  Ask me anything, in {activePersona.name.toLowerCase()} mode.
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
                    {m.content}
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div className="glass inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim [animation-delay:300ms]" />
              </div>
            )}
          </div>

          {gateCta && (
            <div className="px-3 pt-1">
              <a
                href={gateCta.href}
                onClick={() => setOpen(false)}
                className="btn btn-primary block w-full !py-2 text-center text-sm"
              >
                {gateCta.label}
              </a>
            </div>
          )}

          <div className="hairline" />
          <div className="flex items-end gap-2 p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask HōMI…"
              className="input max-h-28 flex-1 resize-none !py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={sending || !input.trim()}
              className="btn btn-primary !px-3 !py-2 disabled:opacity-50"
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h14M11 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
