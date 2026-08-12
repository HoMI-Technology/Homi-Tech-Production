"use client";

import { useCallback, useState } from "react";
import type { MarketingAssetRow } from "@/lib/admin/agency-approvals";
import { requiresSecondConfirm } from "@/lib/admin/agency-approvals";

/**
 * CEO approval queue — approve / reject / rewrite with feedback.
 * Server re-validates claim law and refuse-publish until approved.
 */
export function ApprovalQueue({
  initialAssets,
}: {
  initialAssets: MarketingAssetRow[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/marketing-assets?status=pending&limit=40");
    if (!res.ok) return;
    const data = (await res.json()) as { assets: MarketingAssetRow[] };
    setAssets(data.assets ?? []);
  }, []);

  async function patch(
    id: string,
    status: "approved" | "rejected" | "draft",
    extra?: { confirm_second?: boolean; body?: string; rejected_reason?: string },
  ) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing-assets", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, ...extra }),
      });
      const data = (await res.json()) as {
        error?: string;
        requires_second_confirm?: boolean;
        asset?: MarketingAssetRow;
      };
      if (res.status === 409 && data.requires_second_confirm) {
        setConfirmId(id);
        setError("Second confirmation required (claim flags or competitor-derived).");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Update failed.");
        return;
      }
      setConfirmId(null);
      await refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusyId(null);
    }
  }

  async function rewrite(asset: MarketingAssetRow) {
    const note = (feedback[asset.id] ?? "").trim();
    if (!note) {
      setError("Add feedback before rewrite.");
      return;
    }
    setBusyId(asset.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "rewrite_from_feedback",
          original: asset.body,
          feedback: note,
          platform: asset.platform || "linkedin",
        }),
      });
      const data = (await res.json()) as {
        copy?: string;
        flagged?: string[];
        error?: string;
        source?: string;
      };
      if (!res.ok || !data.copy) {
        setError(data.error ?? "Rewrite failed.");
        return;
      }
      await patch(asset.id, "draft", { body: data.copy });
    } catch {
      setError("Rewrite network error.");
    } finally {
      setBusyId(null);
    }
  }

  if (assets.length === 0) {
    return (
      <div
        id="approval-queue"
        className="glass mt-6 border border-emerald/20 p-5 scroll-mt-[calc(var(--nav-offset)+3.5rem)]"
      >
        <p className="text-3xs font-semibold uppercase tracking-wide text-emerald">
          Approval queue
        </p>
        <p className="mt-2 text-sm text-light">Queue clear — nothing waiting for CEO eyes.</p>
        <p className="mt-1 text-xs text-dim">
          Generate from Content desk and click “Queue for approval” to populate.
        </p>
      </div>
    );
  }

  return (
    <div
      id="approval-queue"
      className="glass mt-6 border border-amber/30 p-5 scroll-mt-[calc(var(--nav-offset)+3.5rem)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-wide text-amber">
            Approval queue · {assets.length}
          </p>
          <p className="mt-1 text-sm text-light">Decide before anything ships.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {assets.map((asset) => {
          const second = requiresSecondConfirm(asset) || confirmId === asset.id;
          return (
            <li
              key={asset.id}
              className="rounded-xl border border-white/10 bg-navy/40 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-light">
                    {asset.title || asset.kind}
                    <span className="ml-2 font-mono text-3xs text-dim">
                      {asset.kind} · {asset.source}
                      {asset.agent_id ? ` · ${asset.agent_id}` : ""}
                    </span>
                  </p>
                  {asset.flagged?.length > 0 && (
                    <p className="mt-1 text-3xs text-amber">
                      Claim flags: {asset.flagged.join(", ")}
                    </p>
                  )}
                </div>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-3xs uppercase text-dim">
                  {asset.status}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-dim line-clamp-6">{asset.body}</p>

              <label className="mt-3 block text-3xs text-dim">
                Feedback for rewrite
                <input
                  className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
                  value={feedback[asset.id] ?? ""}
                  onChange={(e) =>
                    setFeedback((prev) => ({ ...prev, [asset.id]: e.target.value }))
                  }
                  placeholder='e.g. "Too corporate — sound more like a founder"'
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busyId === asset.id}
                  onClick={() =>
                    void patch(asset.id, "approved", {
                      confirm_second: second || Boolean(confirmId === asset.id),
                    })
                  }
                >
                  {second ? "Confirm approve" : "Approve"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busyId === asset.id}
                  onClick={() => void rewrite(asset)}
                >
                  Rewrite from feedback
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-crimson"
                  disabled={busyId === asset.id}
                  onClick={() =>
                    void patch(asset.id, "rejected", {
                      rejected_reason: feedback[asset.id] || "Rejected by CEO",
                    })
                  }
                >
                  Reject
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
