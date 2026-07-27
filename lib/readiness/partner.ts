/**
 * Partner dual-readiness — couples alignment as a path input.
 * Reads local couples store; never invents partner scores.
 */

export interface CouplesAlignmentSnapshot {
  overallPct: number;
  biggestGapTopic: string | null;
  completedAt: string;
  label: "aligned" | "mostly" | "divergent" | "gap";
}

const COUPLES_KEY = "homi:couples";

const TOPIC_LABELS: Record<string, string> = {
  timeline: "Timeline urgency",
  price: "Price comfort",
  location: "Location flexibility",
  risk: "Risk tolerance",
  lifestyle: "Lifestyle priorities",
  transparency: "Financial transparency",
};

function alignmentPct(a: number, b: number): number {
  return Math.max(0, 100 - Math.abs(a - b) * 10);
}

function labelFor(pct: number): CouplesAlignmentSnapshot["label"] {
  if (pct >= 80) return "aligned";
  if (pct >= 60) return "mostly";
  if (pct >= 40) return "divergent";
  return "gap";
}

/**
 * Load couples alignment from localStorage (SSR-safe null).
 */
export function loadCouplesAlignment(): CouplesAlignmentSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COUPLES_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as {
      partnerA?: Record<string, number>;
      partnerB?: Record<string, number>;
      completedAt?: string;
    };
    if (!stored.partnerA || !stored.partnerB || !stored.completedAt) return null;

    const keys = Object.keys(TOPIC_LABELS);
    const perTopic = keys
      .filter((k) => stored.partnerA![k] != null && stored.partnerB![k] != null)
      .map((k) => ({
        key: k,
        pct: alignmentPct(stored.partnerA![k], stored.partnerB![k]),
      }));
    if (perTopic.length === 0) return null;

    const overallPct = Math.round(
      perTopic.reduce((s, t) => s + t.pct, 0) / perTopic.length,
    );
    const biggest = [...perTopic].sort((a, b) => a.pct - b.pct)[0];

    return {
      overallPct,
      biggestGapTopic: biggest
        ? TOPIC_LABELS[biggest.key] ?? biggest.key
        : null,
      completedAt: stored.completedAt,
      label: labelFor(overallPct),
    };
  } catch {
    return null;
  }
}

export function partnerPathNote(snapshot: CouplesAlignmentSnapshot | null): string | null {
  if (!snapshot) return null;
  if (snapshot.label === "aligned" || snapshot.label === "mostly") {
    return `Couples alignment ${snapshot.overallPct}% (${snapshot.label}).`;
  }
  return (
    `Couples alignment ${snapshot.overallPct}% — significant gap` +
    (snapshot.biggestGapTopic ? ` on ${snapshot.biggestGapTopic}` : "") +
    `. Path should not treat solo readiness as household READY.`
  );
}

/** True when partner work should block a clean READY narrative. */
export function partnerBlocksJointReady(
  snapshot: CouplesAlignmentSnapshot | null,
): boolean {
  if (!snapshot) return false;
  return snapshot.overallPct < 60;
}
