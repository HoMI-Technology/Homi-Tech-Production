import type { VerdictKey } from "@/lib/brand";
import {
  lastReadAgeDays,
  lastReadAgeFrom,
  lastReadHeadline,
} from "@/lib/dashboard/last-read-chrome";

/**
 * Existing scored-fold chrome only — not a second card.
 * Stale age (≥30d) only. Does not reprint the verdict.
 * Direction is omitted on this crop — no client ledger read.
 * Wave 1 band-cross recheck stays below as HomeMoneyRecheck.
 */
export function LastReadChrome({
  verdict,
  lastReadAt,
}: {
  verdict: VerdictKey;
  lastReadAt: string | null;
}) {
  const ageDays = lastReadAgeDays(lastReadAt);
  const headline = lastReadHeadline(verdict, ageDays, lastReadAgeFrom(lastReadAt));

  if (!headline) return null;

  return (
    <div data-last-read-chrome="" className="min-w-0 text-sm text-dim">
      <p data-last-read-age="">{headline}</p>
    </div>
  );
}
