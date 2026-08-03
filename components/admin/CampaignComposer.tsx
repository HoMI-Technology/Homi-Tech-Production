"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/brand";
import { campaignEmail } from "@/lib/email/templates";
import type { CampaignAudience } from "@/types/database";

const AUDIENCES: { value: CampaignAudience; label: string }[] = [
  { value: "waitlist", label: "Waitlist" },
  { value: "free", label: "Free tier" },
  { value: "plus", label: "Plus tier" },
  { value: "pro", label: "Pro tier" },
  { value: "family", label: "Family tier" },
  { value: "all", label: "Everyone (waitlist + all accounts)" },
];

interface CountState {
  audience: CampaignAudience;
  sendable: number;
  suppressed: number;
}

interface SendSummary {
  sent: number;
  failed: number;
  suppressed: number;
}

type Phase = "editing" | "confirming" | "sending" | "done";

const PREVIEW_UNSUB = "#unsubscribe-preview";

export function CampaignComposer() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState<CampaignAudience>("waitlist");
  const [body, setBody] = useState("");

  const [phase, setPhase] = useState<Phase>("editing");
  const [count, setCount] = useState<CountState | null>(null);
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const previewHtml = useMemo(
    () =>
      campaignEmail(
        body.trim() ||
          `<p style="margin:0;color:${COLORS.dim};">Start writing to preview the broadcast exactly as recipients will see it.</p>`,
        PREVIEW_UNSUB,
      ).html,
    [body],
  );

  const canReview = name.trim() !== "" && subject.trim() !== "" && body.trim() !== "" && !busy;

  async function post(payload: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  }

  /** Save the draft and return its campaign id (creates on first pass). */
  async function saveDraft(existingId: string | null): Promise<string | null> {
    const { ok, data } = await post({
      action: "save",
      ...(existingId ? { campaignId: existingId } : {}),
      name: name.trim(),
      subject: subject.trim(),
      audience,
      body,
    });
    if (!ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to save the draft.");
      return null;
    }
    return typeof data.campaignId === "string" ? data.campaignId : null;
  }

  const [campaignId, setCampaignId] = useState<string | null>(null);

  async function handleReview() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const id = await saveDraft(campaignId);
      if (!id) return;
      setCampaignId(id);

      const { ok, data } = await post({ action: "count", audience });
      if (!ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to resolve the audience.");
        return;
      }
      setCount({
        audience,
        sendable: Number(data.sendable ?? 0),
        suppressed: Number(data.suppressed ?? 0),
      });
      setPhase("confirming");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    if (!campaignId || !count) return;
    setBusy(true);
    setError(null);
    setPhase("sending");
    try {
      const { ok, data } = await post({
        action: "send",
        campaignId,
        confirmedCount: count.sendable,
      });
      if (!ok) {
        setError(typeof data.error === "string" ? data.error : "Send failed.");
        // Audience moved — drop back to editing so the count can be re-checked.
        setPhase("editing");
        setCount(null);
        return;
      }
      setSummary({
        sent: Number(data.sent ?? 0),
        failed: Number(data.failed ?? 0),
        suppressed: Number(data.suppressed ?? 0),
      });
      setPhase("done");
      setCampaignId(null);
      setCount(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setPhase("editing");
    setSummary(null);
    setError(null);
    setName("");
    setSubject("");
    setBody("");
    setAudience("waitlist");
    router.refresh();
  }

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-dim">Campaign name</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="February product update"
            maxLength={120}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-dim">Subject line</span>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What we shipped this month"
            maxLength={200}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-dim">Audience</span>
          <select
            className="input"
            value={audience}
            onChange={(e) => {
              setAudience(e.target.value as CampaignAudience);
              setCount(null);
              if (phase === "confirming") setPhase("editing");
            }}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-dim">Body (HTML)</span>
          <textarea
            className="input min-h-[220px] font-mono text-xs leading-relaxed"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              if (phase === "confirming") {
                setPhase("editing");
                setCount(null);
              }
            }}
            placeholder={'<p style="margin:0 0 16px 0;">Hi there,</p>'}
          />
          <span className="text-[11px] text-dim">
            Admin-authored HTML, wrapped in the standard HōMI email shell with an unsubscribe footer.
          </span>
        </label>

        {error && (
          <p className="rounded-lg border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">{error}</p>
        )}

        {phase === "done" && summary && (
          <div className="rounded-lg border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm text-light">
            <p className="font-semibold text-emerald">Campaign sent.</p>
            <p className="mt-1 text-dim">
              {summary.sent.toLocaleString()} delivered
              {summary.failed > 0 ? ` · ${summary.failed.toLocaleString()} failed` : ""}
              {summary.suppressed > 0 ? ` · ${summary.suppressed.toLocaleString()} suppressed (unsubscribed)` : ""}
            </p>
          </div>
        )}

        {phase === "confirming" && count ? (
          <div className="rounded-lg border border-cyan/30 bg-slate-surface/60 px-4 py-4">
            <p className="text-sm text-light">
              Ready to send to <span className="score-numeral font-semibold text-cyan">{count.sendable.toLocaleString()}</span>{" "}
              recipient{count.sendable === 1 ? "" : "s"}.
            </p>
            {count.suppressed > 0 && (
              <p className="mt-1 text-xs text-dim">
                {count.suppressed.toLocaleString()} address{count.suppressed === 1 ? "" : "es"} on this audience opted out and
                will be skipped.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" onClick={handleSend} disabled={busy || count.sendable === 0}>
                Confirm and send
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPhase("editing");
                  setCount(null);
                }}
                disabled={busy}
              >
                Back to editing
              </button>
            </div>
          </div>
        ) : phase === "sending" ? (
          <p className="text-sm text-dim">Sending… this can take a moment for large audiences.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={handleReview} disabled={!canReview}>
              Review recipients
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const id = await saveDraft(campaignId);
                  if (id) {
                    setCampaignId(id);
                    router.refresh();
                  }
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!canReview}
            >
              Save draft
            </button>
            {phase === "done" && (
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                New campaign
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-dim">Preview</p>
        <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-surface">
          <iframe
            title="Campaign preview"
            sandbox=""
            srcDoc={previewHtml}
            className="h-[480px] w-full bg-navy"
          />
        </div>
        <p className="mt-2 text-[11px] text-dim">
          The unsubscribe link is a placeholder in preview; each recipient gets a working one-click opt-out.
        </p>
      </div>
    </div>
  );
}
