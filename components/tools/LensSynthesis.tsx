/**
 * LensSynthesis — the "What does this change for me?" action.
 *
 * Lives on a lens result panel next to the DeltasCard. Two jobs:
 * 1. Keep the page's lens digest fresh in sessionStorage while the user
 *    moves sliders (the Companion reads it on its next message).
 * 2. On click, open the Companion with a pre-seeded synthesis message.
 *
 * The Companion explains; it never calculates. Every number it will cite
 * was computed here, deterministically, before it sees them.
 */

"use client";

import { useEffect, useMemo } from "react";
import { track } from "@/lib/analytics";
import { useCfm } from "@/hooks/use-cfm";
import { cfmCoverage } from "@/lib/tools/cfm";
import { getLens, lensCoveragePaths } from "@/lib/tools/registry";
import { publishLensDigest, requestLensSynthesis, type LensDigestInput } from "@/lib/tools/digest";

export function LensSynthesis({ digest }: { digest: LensDigestInput }) {
  const { cfm, hydrated } = useCfm();

  const coverage = useMemo(() => {
    if (!cfm) return 0;
    const lens = getLens(digest.lensId);
    return lens ? cfmCoverage(cfm, lensCoveragePaths(lens)) : 0;
  }, [cfm, digest.lensId]);

  // Keep the digest fresh as sliders move — the Companion consumes it
  // page-scoped and rejects anything older than 30 minutes.
  useEffect(() => {
    if (!hydrated) return;
    publishLensDigest({ ...digest, cfmCoverage: coverage, updatedAt: Date.now() });
  }, [digest, coverage, hydrated]);

  if (!hydrated) return null;

  return (
    <button
      type="button"
      onClick={() => {
        track("lens_synthesis_clicked", { lens: digest.lensId });
        requestLensSynthesis();
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald/40 px-4 py-2.5 text-sm font-medium text-emerald transition-colors hover:bg-emerald/10"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 0l1.8 5.2L15 7l-5.2 1.8L8 14 6.2 8.8 1 7l5.2-1.8L8 0z" />
      </svg>
      What does this change for me?
    </button>
  );
}
