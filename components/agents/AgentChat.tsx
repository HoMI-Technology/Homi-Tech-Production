"use client";

import { useEffect, useRef, useState } from "react";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { buildCompanionContext } from "@/lib/advisor/context";
import { loadIdentity } from "@/lib/advisor/identity";
import {
  loadThreadMessages,
  saveThreadMessages,
  pullAdvisorThread,
} from "@/lib/advisor/thread-store";
import { fetchLatestStoredAssessment } from "@/lib/assessment/latest";
import type { AgentId, AgentMode } from "@/lib/agents/registry";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  agent?: AgentId;
  tools?: string[];
  receipt?: string;
}

interface AgentChatProps {
  /** The currently selected lead agent / mode. */
  mode: AgentMode;
  /** Called when the user changes mode from inside the chat. */
  onModeChange?: (mode: AgentMode) => void;
}

const MODE_LABELS: Record<AgentMode, string> = {
  explore: "Explore",
  analyze: "Analyze",
  plan: "Plan",
  simulate: "Simulate",
  compare: "Compare",
  decompress: "Decompress",
};

const SUGGESTED_PROMPTS = [
  "Am I actually ready?",
  "What's my weakest pillar?",
  "Talk me out of rushing",
  "Run a scenario: what if I lose my job?",
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

export function AgentChat({ mode, onModeChange }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadThreadMessages("chat"));
    void fetchLatestStoredAssessment().then((latest) => {
      setHasAssessment(Boolean(latest ?? buildCompanionContext().assessment));
    });

    let cancelled = false;
    void pullAdvisorThread("chat").then((thread) => {
      if (cancelled || !thread) return;
      if (thread.conversationId) setConversationId(thread.conversationId);
      if (thread.messages.length > 0) setMessages(thread.messages as ChatMessage[]);
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
    setError(null);

    const userMsg: ChatMessage = { id: makeId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const latest = await fetchLatestStoredAssessment();
      const { assessment, finance, whatChanged } = buildCompanionContext(undefined, latest);
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
          assessment,
          finance,
          whatChanged,
          identity: loadIdentity(),
          mode,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        reply?: unknown;
        error?: unknown;
        conversationId?: unknown;
        routed_agents?: AgentId[];
        tools_suggested?: string[];
        receipt?: { id?: string };
      };

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Something interrupted that thought. Try asking again in a moment.";
        setError(msg);
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: msg }]);
        return;
      }

      if (typeof data.conversationId === "string") setConversationId(data.conversationId);
      const replyContent =
        typeof data.reply === "string"
          ? data.reply
          : "Something interrupted that thought. Try asking again in a moment.";

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: replyContent,
          agent: data.routed_agents?.[0],
          tools: data.tools_suggested,
          receipt: data.receipt?.id,
        },
      ]);
    } catch {
      const msg = "Connection dropped on my end. Try that again in a moment.";
      setError(msg);
      setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: msg }]);
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
    <div className="glass flex h-[60vh] min-h-[420px] flex-col overflow-hidden">
      {/* Header: mode switcher + live agent attribution */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          {messages.length > 0 &&
            messages[messages.length - 1].role === "assistant" &&
            messages[messages.length - 1].agent && (
              <span className="text-xs font-bold uppercase tracking-wider text-cyan">
                {messages[messages.length - 1].agent}
              </span>
            )}
          {messages.length === 0 && (
            <span className="text-xs font-bold uppercase tracking-wider text-dim">Agent OS</span>
          )}
        </div>
        <SegmentedControl<AgentMode>
          ariaLabel="Agent mode"
          options={(Object.keys(MODE_LABELS) as AgentMode[]).map((m) => ({
            value: m,
            label: MODE_LABELS[m],
          }))}
          value={mode}
          onChange={(m) => onModeChange?.(m)}
          variant="compact"
          className="flex flex-wrap gap-1"
        />
      </div>

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <ThresholdCompass size={72} glow />
            <div>
              <p className="font-display text-lg text-light">
                {hasAssessment ? "Ask your team of agents." : "I don't have your numbers yet."}
              </p>
              <p className="mt-1 max-w-sm text-sm text-dim">
                {hasAssessment
                  ? "Homie coordinates Scout, Analyst, Coach, Architect, and Oracle — each brings a different lens."
                  : "Take the full assessment first, or ask a general question — the agents can still talk in plain terms."}
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
              <div className="max-w-[80%]">
                {m.agent && (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan">
                      {m.agent}
                    </span>
                    {m.tools && m.tools.length > 0 && (
                      <span className="text-3xs text-dim">{m.tools.join(", ")}</span>
                    )}
                  </div>
                )}
                <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-light">
                  {m.content}
                </div>
                {m.receipt && (
                  <div className="mt-1 font-mono text-3xs text-dim/60">Receipt: {m.receipt}</div>
                )}
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
          placeholder="Ask the agents anything…"
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
      {error && <p className="px-4 pb-3 text-center text-xs text-crimson">{error}</p>}
    </div>
  );
}
