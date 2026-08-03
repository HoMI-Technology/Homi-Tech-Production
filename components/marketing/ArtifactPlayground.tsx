"use client";

import { useRef, useState } from "react";
import { PERSONAS, type AdvisorPersona } from "@/lib/advisor/personas";
import { SegmentedControl, accentFromBrandHex } from "@/components/ui/SegmentedControl";
import { VERDICT_META } from "@/lib/brand";
import { DEMO_DATA } from "@/lib/demo/context";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

const QUICK_PROMPTS = [
  "Am I ready?",
  "What's my weakest pillar?",
  "Is the pressure mine?",
  "What should I build first?",
  "Run my runway",
  "What would waiting change?",
];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Standalone companion chat + mock-context panel for the /artifact test
 * environment. Follows the same visual conventions as
 * components/companion/CompanionWidget.tsx (persona chips, message bubbles,
 * .input/.btn composer) but posts with `demoContext: true` instead of a
 * real assessment payload — the server supplies the fixed mock context.
 */
export function ArtifactPlayground() {
  const [contextOpen, setContextOpen] = useState(true);
  const [persona, setPersona] = useState<AdvisorPersona>("homie");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const meta = VERDICT_META[DEMO_DATA.verdict];
  const activePersona = PERSONAS.find((p) => p.key === persona) ?? PERSONAS[0];

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: makeId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          persona,
          demoContext: true,
        }),
      });

      const data = await res.json();
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
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* LEFT — mock context panel */}
      <div className="glass h-fit p-5">
        <button
          type="button"
          onClick={() => setContextOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={contextOpen}
        >
          <span className="font-semibold text-light">Mock context panel</span>
          <span className="text-xs text-dim">{contextOpen ? "Hide" : "Show"}</span>
        </button>

        {contextOpen && (
          <div className="mt-5 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="score-numeral text-3xl font-bold text-light">{DEMO_DATA.score}</span>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-dim">HōMI-Score out of 100 · streak {DEMO_DATA.streak}</p>
            </div>

            <div className="flex flex-col gap-2">
              <PillarRow label="Financial Reality" value={DEMO_DATA.pillars.financial} max={DEMO_DATA.pillarMax.financial} />
              <PillarRow label="Emotional Truth" value={DEMO_DATA.pillars.emotional} max={DEMO_DATA.pillarMax.emotional} />
              <PillarRow label="Perfect Timing" value={DEMO_DATA.pillars.timing} max={DEMO_DATA.pillarMax.timing} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dim">Mock decisions</p>
              <div className="mt-2 flex flex-col gap-3">
                {DEMO_DATA.journalEntries.map((entry) => (
                  <div key={entry.title} className="rounded-lg border border-slate-surface/60 p-3">
                    <p className="text-sm font-medium text-light">{entry.title}</p>
                    <p className="mt-1 text-xs text-dim">{entry.context}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT — companion chat */}
      <div className="glass flex h-[600px] flex-col overflow-hidden">
        <div className="border-b border-slate-surface/60 px-4 py-3">
          <SegmentedControl<AdvisorPersona>
            ariaLabel="Companion persona"
            options={PERSONAS.map((p) => ({
              value: p.key,
              label: p.name,
              accent: accentFromBrandHex(p.color),
            }))}
            value={persona}
            onChange={setPersona}
            variant="compact"
            className="flex flex-wrap gap-1.5"
          />
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-xs text-dim">{activePersona.role}</p>
              <p className="max-w-[280px] text-sm text-light">
                Ask anything, in {activePersona.name.toLowerCase()} mode — the mock context above is what the
                Companion sees.
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

        <div className="hairline" />

        <div className="flex flex-wrap gap-2 px-4 py-3">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={sending}
              className="rounded-full border border-slate-surface/60 px-3 py-1.5 text-xs text-dim transition-colors hover:border-cyan/40 hover:text-light disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

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
    </div>
  );
}

function PillarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-light">{label}</span>
        <span className="score-numeral text-dim">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-surface">
        <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
