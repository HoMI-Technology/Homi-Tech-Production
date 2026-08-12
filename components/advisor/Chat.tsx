"use client";

import { useEffect, useRef, useState } from "react";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { loadLocalResult } from "@/lib/assessment/storage";
import { buildCompanionContext } from "@/lib/advisor/context";
import { MessageContent } from "@/components/companion/MessageContent";
import { CompanionTierBanner } from "@/components/companion/CompanionTierBanner";
import { loadIdentity } from "@/lib/advisor/identity";
import {
  loadThreadMessages,
  saveThreadMessages,
  pullAdvisorThread,
} from "@/lib/advisor/thread-store";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Am I actually ready?",
  "What's my weakest pillar?",
  "Talk me out of rushing",
  "Should I buy right now?",
];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function CompassAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
      <ThresholdCompass size={28} animated={false} glow={false} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <CompassAvatar />
      <div className="glass flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-dim [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadThreadMessages("chat"));
    setHasAssessment(Boolean(loadLocalResult()));

    // `?q=` opener (Money picture panel → "Ask Homie"). Read off window rather
    // than useSearchParams: the latter forces a Suspense boundary / CSR bailout
    // on this statically-rendered page. It *pre-fills* the composer instead of
    // sending — a link should never spend a companion turn on its own.
    const seed = new URLSearchParams(window.location.search).get("q")?.trim();
    if (seed) {
      setInput(seed);
      textareaRef.current?.focus();
    }

    // One memory: reconcile the server thread (shared with the floating
    // widget) in the background via the persistence contract; on
    // 401/offline the local copy above stands.
    let cancelled = false;
    void pullAdvisorThread("chat").then((thread) => {
      if (cancelled || !thread) return;
      if (thread.conversationId) setConversationId(thread.conversationId);
      if (thread.messages.length > 0) setMessages(thread.messages);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveThreadMessages("chat", messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = { id: makeId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const { assessment, finance, credit, whatChanged, path } = buildCompanionContext();
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          assessment,
          finance,
          whatChanged,
          credit,
          path,
          identity: loadIdentity(),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        reply?: unknown;
        error?: unknown;
        conversationId?: unknown;
      };

      if (!res.ok) {
        // Surface the gate's truthful copy (e.g. daily-quota upgrade nudge) rather
        // than a generic "interrupted" line. /advisor is auth-gated, so 401 is
        // unexpected here; 402 (over quota) is the real case.
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something interrupted that thought. Try asking again in a moment.";
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: msg }]);
        return;
      }

      if (typeof data.conversationId === "string") setConversationId(data.conversationId);
      const replyContent: string =
        typeof data.reply === "string"
          ? data.reply
          : "Something interrupted that thought. Try asking again in a moment.";

      setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: replyContent }]);
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
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="glass flex h-[70vh] min-h-[480px] flex-col overflow-hidden">
      {/* Honest free vs paid Companion labeling (display only; server gates access). */}
      <CompanionTierBanner />
      {/* Thread */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <ThresholdCompass size={72} glow />
            <div>
              <p className="font-display text-lg text-light">
                {hasAssessment ? "Ready when you are." : "I don't have your numbers yet."}
              </p>
              <p className="mt-1 max-w-sm text-sm text-dim">
                {hasAssessment
                  ? "Ask me anything about your readiness. I'll always tell you the truth."
                  : "Take the Shadow Score first, or just ask me something — I can still talk in general terms."}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="btn btn-ghost btn-xs"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-light">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2">
              <CompassAvatar />
              <div className="glass max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-light">
                <MessageContent text={m.content} />
              </div>
            </div>
          ),
        )}

        {sending && <TypingIndicator />}
      </div>

      {/* Composer */}
      <div className="hairline" />
      <div className="flex items-end gap-3 p-4">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask HōMI anything…"
          className="input max-h-40 flex-1 resize-none"
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={sending || !input.trim()}
          className="btn btn-primary btn-sm disabled:opacity-50"
          aria-label="Send message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 10h14M11 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className="px-4 pb-3 text-center text-2xs leading-snug text-dim/70">
        Educational guidance only — not financial advice.
      </p>
    </div>
  );
}
