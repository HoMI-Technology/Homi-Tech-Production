/**
 * Memory Palace — compact, referenceable moments from Companion threads.
 * Persistence still flows through existing Supabase advisor_* tables via
 * `lib/advisor/memory.ts`; this module shapes what HōMI may recall aloud.
 */

import type { MemoryPalaceEntry, ReadinessPillar } from "@/types/companion";

const PILLAR_CUES: Array<{ pillar: ReadinessPillar; re: RegExp }> = [
  {
    pillar: "financial",
    re: /\b(money|cash|debt|savings|runway|dti|credit|afford|income|budget)\b/i,
  },
  {
    pillar: "emotional",
    re: /\b(feel|emotion|stress|fear|partner|family|pressure|gut|anxious)\b/i,
  },
  {
    pillar: "timing",
    re: /\b(timing|when|horizon|wait|now|later|market|life stage|ready yet)\b/i,
  },
];

function detectPillar(text: string): ReadinessPillar | undefined {
  for (const cue of PILLAR_CUES) {
    if (cue.re.test(text)) return cue.pillar;
  }
  return undefined;
}

function gistOf(content: string, max = 120): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

export interface ThreadMessageLike {
  role: "user" | "assistant";
  content: string;
  /** Optional ms epoch; defaults to index-based ordering when absent. */
  at?: number;
}

/**
 * Build a Memory Palace from recent thread messages. Prefers user statements
 * (what they entrusted) and keeps a small working set for prompt/context.
 */
export function buildMemoryPalace(
  messages: ThreadMessageLike[],
  limit = 8,
): MemoryPalaceEntry[] {
  const entries: MemoryPalaceEntry[] = [];
  const base = Date.now();

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m.content.trim()) continue;
    // Skip ultra-short acknowledgements.
    if (m.content.trim().length < 12) continue;
    entries.push({
      id: `mem-${i}-${m.role}`,
      at: m.at ?? base - (messages.length - i) * 1000,
      gist: gistOf(m.content),
      pillar: detectPillar(m.content),
      role: m.role,
    });
  }

  // Prefer user memories, then most recent.
  return entries
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "user" ? -1 : 1;
      return b.at - a.at;
    })
    .slice(0, limit);
}

/**
 * Pick memories relevant to the current user utterance for HōMI to reference.
 */
export function recallRelevantMemories(
  palace: MemoryPalaceEntry[],
  utterance: string,
  limit = 2,
): MemoryPalaceEntry[] {
  const text = utterance.toLowerCase();
  const pillar = detectPillar(utterance);
  const scored = palace.map((entry) => {
    let score = 0;
    if (pillar && entry.pillar === pillar) score += 3;
    const words = entry.gist
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4);
    for (const w of words) {
      if (text.includes(w)) score += 1;
    }
    if (entry.role === "user") score += 0.5;
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

/** Companion-voice line that references a prior moment without inventing facts. */
export function memoryReferenceLine(entries: MemoryPalaceEntry[]): string {
  if (entries.length === 0) return "";
  const first = entries[0];
  if (entries.length === 1) {
    return `You mentioned before: "${first.gist}". I'm holding that with you.`;
  }
  return `I'm holding a few things you've already said — especially: "${first.gist}".`;
}
