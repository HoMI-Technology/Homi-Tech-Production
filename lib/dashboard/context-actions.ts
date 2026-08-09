/**
 * Contextual quick actions — the dashboard leads with the three instruments
 * that matter *now* instead of nine equal-weight links. Pure and unit-tested;
 * the component maps hrefs back to its action metadata.
 */

export type PillarKey = "financial" | "emotional" | "timing";

export interface ContextActionInput {
  hasAssessment: boolean;
  /** Weakest pillar from the latest assessment, if any. */
  weakestPillar: PillarKey | null;
  checkedInToday: boolean;
}

/** The instrument that works each pillar (mirrors NEXT_MOVES routing). */
const PILLAR_TOOL: Record<PillarKey, string> = {
  // Money Reality: signed-in financial work happens in Decide, not the public hub.
  financial: "/money/decide",
  emotional: "/advisor",
  timing: "/signals",
};

const FILLERS = ["/simulator", "/journal", "/plan"];

/** Exactly three hrefs, most-relevant first, deduped. */
export function contextualActionHrefs(input: ContextActionInput): string[] {
  if (!input.hasAssessment) {
    // Shortest path to a first score leads; Money picture third (not public tools mall).
    return ["/shadow-score", "/assessment", "/money"];
  }
  const out: string[] = [];
  if (!input.checkedInToday) out.push("/daily");
  if (input.weakestPillar) out.push(PILLAR_TOOL[input.weakestPillar]);
  for (const href of FILLERS) {
    if (out.length >= 3) break;
    if (!out.includes(href)) out.push(href);
  }
  return out.slice(0, 3);
}

/**
 * Whether the most recent check-in happened today. Compares calendar dates in
 * the given reference clock's zone (server-local) — a deliberate approximation
 * documented here: worst case the "Check in" action shows a few hours early or
 * late near midnight, which is harmless.
 */
export function checkedInToday(latestCheckinIso: string | null, now: Date = new Date()): boolean {
  if (!latestCheckinIso) return false;
  const d = new Date(latestCheckinIso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
