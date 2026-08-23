"use client";

import { useEffect, useState } from "react";
import { buildCompanionContext } from "@/lib/advisor/context";
import { loadIdentity, clearIdentity, getPreset, DEFAULT_IDENTITY } from "@/lib/advisor/identity";
import { clearLocalThreads } from "@/lib/advisor/thread-keys";
import { track } from "@/lib/analytics";

type ThreadState =
  | { kind: "loading" }
  | { kind: "server"; messageCount: number }
  | { kind: "local" }
  | { kind: "empty" };

/**
 * "What HōMI remembers" — the inspectable memory panel. Everything the
 * Companion knows about the user, stated plainly, with the controls to erase
 * it. Two honesty rules govern this panel: only facts the user gave HōMI are
 * shown (HōMI holds no hidden inferences), and forgetting is real — the
 * server thread is deleted, not archived.
 */
export function CompanionMemorySection() {
  const [identityName, setIdentityName] = useState(DEFAULT_IDENTITY.name);
  const [presetRole, setPresetRole] = useState("");
  const [assessmentLine, setAssessmentLine] = useState(
    "Nothing yet — no assessment on this device.",
  );
  const [financeLine, setFinanceLine] = useState(
    "Nothing yet — no saved money picture on this device.",
  );
  const [thread, setThread] = useState<ThreadState>({ kind: "loading" });
  const [confirmingForget, setConfirmingForget] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const identity = loadIdentity();
    setIdentityName(identity.name);
    setPresetRole(getPreset(identity.preset).role);

    const { assessment, finance } = buildCompanionContext();
    if (assessment) {
      const age =
        typeof assessment.ageDays === "number"
          ? assessment.ageDays === 0
            ? "from today"
            : `${assessment.ageDays} days old`
          : "age unknown";
      setAssessmentLine(`Decision Readiness Score ${assessment.score}/100 (${age}), self-reported answers.`);
    }
    if (finance) {
      const age =
        typeof finance.ageDays === "number"
          ? finance.ageDays === 0
            ? "saved today"
            : `saved ${finance.ageDays} days ago`
          : "save date unknown";
      setFinanceLine(`Your money picture (${age}), self-reported on Money Stand.`);
    }

    let cancelled = false;
    fetch("/api/advisor/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { conversationId?: string | null; messages?: unknown[] } | null) => {
        if (cancelled) return;
        if (data?.conversationId && Array.isArray(data.messages)) {
          setThread({ kind: "server", messageCount: data.messages.length });
        } else if (data) {
          setThread({ kind: "empty" });
        } else {
          setThread({ kind: "local" });
        }
      })
      .catch(() => {
        if (!cancelled) setThread({ kind: "local" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function forgetConversation() {
    setConfirmingForget(false);
    setNotice(null);
    let serverOk = true;
    if (thread.kind === "server") {
      try {
        const res = await fetch("/api/advisor/history", { method: "DELETE" });
        serverOk = res.ok;
      } catch {
        serverOk = false;
      }
    }
    clearLocalThreads();
    if (serverOk) {
      setThread({ kind: "empty" });
      setNotice("Forgotten. Your next conversation starts clean.");
      track("companion_thread_forgotten");
    } else {
      setNotice(
        "Couldn't reach the server — local copies were cleared, but the server thread remains. Try again.",
      );
    }
  }

  function resetIdentity() {
    clearIdentity();
    setIdentityName(DEFAULT_IDENTITY.name);
    setPresetRole(getPreset(DEFAULT_IDENTITY.preset).role);
    setNotice(
      "Identity reset. The Companion will ask you to choose your HōMI next time you open it.",
    );
    track("companion_identity_reset");
  }

  const threadLine =
    thread.kind === "loading"
      ? "Checking…"
      : thread.kind === "server"
        ? `${thread.messageCount} message${thread.messageCount === 1 ? "" : "s"} stored in your account — shared across your devices.`
        : thread.kind === "local"
          ? "Stored on this device only (sign in to keep it across devices)."
          : "No stored conversation.";

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">What HōMI remembers</h2>
      <p className="mt-1 text-sm text-dim">
        Everything your Companion knows, stated plainly. Only facts you gave it — nothing inferred
        behind your back — and all of it yours to erase.
      </p>

      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-light">Your HōMI</dt>
          <dd className="mt-0.5 text-dim">
            {identityName === DEFAULT_IDENTITY.name ? "HōMI (the classic)" : identityName} —{" "}
            {presetRole || "your companion."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-light">Readiness</dt>
          <dd className="mt-0.5 text-dim">{assessmentLine}</dd>
        </div>
        <div>
          <dt className="font-semibold text-light">Money picture</dt>
          <dd className="mt-0.5 text-dim">{financeLine}</dd>
        </div>
        <div>
          <dt className="font-semibold text-light">Conversation</dt>
          <dd className="mt-0.5 text-dim">{threadLine}</dd>
        </div>
      </dl>

      {notice && <p className="mt-4 text-sm text-cyan">{notice}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        {confirmingForget ? (
          <>
            <button type="button" onClick={forgetConversation} className="btn btn-primary btn-sm">
              Yes, forget it
            </button>
            <button
              type="button"
              onClick={() => setConfirmingForget(false)}
              className="btn btn-ghost btn-sm"
            >
              Keep it
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingForget(true)}
            disabled={thread.kind === "loading"}
            className="btn btn-ghost btn-sm disabled:opacity-50"
          >
            Forget this conversation
          </button>
        )}
        <button type="button" onClick={resetIdentity} className="btn btn-ghost btn-sm">
          Reset my HōMI
        </button>
      </div>
    </section>
  );
}
