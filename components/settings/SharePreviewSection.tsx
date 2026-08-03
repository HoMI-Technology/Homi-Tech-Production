"use client";

import { useEffect, useState } from "react";
import { buildCompanionContext } from "@/lib/advisor/context";
import { buildSharePreview, type SharePreview } from "@/lib/advisor/share-preview";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

const CONFIDENCE_LABEL: Record<SharePreview["confidence"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/**
 * "If you shared your readiness" — the institutional preview (blueprint
 * Phase 4, trust step). Shows the user exactly the summary a lender or agent
 * would see: band, confidence with its reasons, per-source data quality, hard
 * stops, and the disclaimer as part of the product.
 *
 * Rendering this preview shares nothing. Sharing is a separate, explicit act
 * via POST /api/shares, which mints a 30-day link the user creates themselves.
 * Keep this copy in step with that route — an earlier version of this section
 * told users sharing did not exist at all, which stopped being true when the
 * route shipped.
 */
export function SharePreviewSection() {
  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPreview(buildSharePreview(buildCompanionContext()));
    setHydrated(true);
  }, []);

  return (
    <section className="glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-light">If you shared your readiness</h2>
      <p className="mt-1 text-sm text-dim">
        A preview of the summary a lender or agent would see. Viewing this preview shares nothing — a
        summary only leaves your account if you create a share link yourself, and those links expire
        after 30 days.
      </p>

      {!hydrated ? (
        <div className="mt-6 h-24 animate-pulse rounded-xl bg-slate-surface/40" />
      ) : !preview ? (
        <p className="mt-6 text-sm text-dim">
          Nothing to preview yet — a readiness summary needs a completed assessment first.
        </p>
      ) : (
        <div className="mt-6 space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={preview.verdict} size="lg" />
            <span className="text-light">
              HōMI-Score {preview.score}/100 · Confidence: {CONFIDENCE_LABEL[preview.confidence]}
            </span>
          </div>

          <div>
            <p className="font-semibold text-light">Why this confidence</p>
            <ul className="mt-1 list-disc pl-5 text-dim">
              {preview.confidenceReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-light">Data quality</p>
            <ul className="mt-1 list-disc pl-5 text-dim">
              {preview.dataQuality.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {preview.hardStops.length > 0 && (
            <div>
              <p className="font-semibold text-light">Protective hard stops</p>
              <ul className="mt-1 list-disc pl-5 text-dim">
                {preview.hardStops.map((stop) => (
                  <li key={stop}>{stop}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-slate-surface/60 pt-4 text-xs text-dim">{preview.disclaimer}</p>
        </div>
      )}
    </section>
  );
}
