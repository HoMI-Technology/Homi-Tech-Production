"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ShareLinkRow {
  id: string;
  share_token: string;
  expires_at: string | null;
  created_at: string;
}

interface VerificationRow {
  share_id: string;
  verified_at: string;
}

/** Settings panel: lists the signed-in user's active share links with a per-row revoke action. */
export function ShareLinksSection() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [verifyCounts, setVerifyCounts] = useState<Record<string, number>>({});
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLinks() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("score_shares")
        .select("id, share_token, expires_at, created_at")
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });
      const rows = (data as ShareLinkRow[] | null) ?? [];
      setLinks(rows);

      // Consumer-visible receipt audit (00022): how many times a partner
      // verified each of my links. RLS scopes this to shares I own.
      if (rows.length > 0) {
        const { data: verifications } = await supabase
          .from("receipt_verifications")
          .select("share_id, verified_at");
        const counts: Record<string, number> = {};
        for (const v of (verifications as VerificationRow[] | null) ?? []) {
          counts[v.share_id] = (counts[v.share_id] ?? 0) + 1;
        }
        setVerifyCounts(counts);
      } else {
        setVerifyCounts({});
      }
    } catch {
      // Leave the list empty — the section still renders gracefully.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLinks();
  }, []);

  async function handleRevoke(id: string) {
    setError(null);
    setRevokingId(id);
    try {
      const res = await fetch(`/api/shares/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not revoke that link. Try again.");
        return;
      }
      await loadLinks();
    } catch {
      setError("Could not revoke that link. Try again.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">Share links</h2>
      <p className="mt-1 text-sm text-dim">
        Anyone with an active link below can view that read-only score. Revoke a link at any time to
        cut off access — this does not affect your Decision Readiness Score.
      </p>

      {loading ? (
        <div className="mt-6 h-10 animate-pulse rounded bg-slate-surface" />
      ) : links.length === 0 ? (
        <p className="mt-6 text-sm text-dim">No active share links.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {error && <p className="text-sm text-crimson">{error}</p>}
          {links.map((link, idx) => (
            <div key={link.id}>
              {idx > 0 && <div className="hairline mb-3" />}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="score-numeral break-all text-sm font-medium text-light">
                    {link.share_token}
                  </p>
                  <p className="text-sm text-dim">
                    {link.expires_at
                      ? `Expires ${new Date(link.expires_at).toLocaleDateString()}`
                      : "No expiration"}
                    {verifyCounts[link.id] ? (
                      <span className="ml-2 text-emerald">
                        · Verified by a partner {verifyCounts[link.id]}×
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(link.id)}
                  disabled={revokingId === link.id}
                  className="btn btn-sm btn-danger-ghost disabled:opacity-50"
                >
                  {revokingId === link.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
