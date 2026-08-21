/**
 * HōMI behavior orchestrator — picks the primary presence behavior for a turn
 * and assembles prompt hints + card highlights for the floating avatar.
 */

import { readEmotionalMirror } from "@/lib/advisor/emotional-mirror";
import {
  buildMemoryPalace,
  memoryReferenceLine,
  recallRelevantMemories,
  type ThreadMessageLike,
} from "@/lib/advisor/memory-palace";
import { decideGentleInterrupt } from "@/lib/advisor/gentle-interrupter";
import { projectFutureSelf, type FutureSelfInput } from "@/lib/advisor/future-self";
import { decideSilentWitness } from "@/lib/advisor/silent-witness";
import { cardsForPillar, cardsForSpeech } from "@/lib/advisor/card-highlight";
import type {
  HomieBehaviorId,
  HomieBehaviorTurn,
  HomieCardId,
} from "@/types/companion";

export interface OrchestrateInput {
  utterance: string;
  thread?: ThreadMessageLike[];
  futureSelf?: FutureSelfInput;
  /** ms the user has been speaking (voice turns). */
  speakingMs?: number;
  afterHardTruth?: boolean;
  /** Injectable RNG for Silent Witness presence rolls. */
  presenceRoll?: number;
  speechRateWpm?: number;
  /** Prefer a specific behavior (e.g. user asked for future self). */
  prefer?: HomieBehaviorId;
}

const FUTURE_SELF_ASK =
  /\b(future self|future me|years from now|who (do|will) i become|project(ion)?)\b/i;
const MEMORY_ASK = /\b(remember|you said|last time|before|earlier|we talked)\b/i;

function uniqueCards(cards: HomieCardId[]): HomieCardId[] {
  return Array.from(new Set(cards));
}

/**
 * Orchestrate HōMI's five core presence behaviors for one user turn.
 */
export function orchestrateHomieBehaviors(input: OrchestrateInput): HomieBehaviorTurn {
  const utterance = input.utterance.trim();
  const emotional = readEmotionalMirror(utterance, input.speechRateWpm);
  const palace = buildMemoryPalace(input.thread ?? []);
  const memoryRefs = recallRelevantMemories(palace, utterance, 2);
  const futureSelf = projectFutureSelf(input.futureSelf ?? {});
  const silent = decideSilentWitness({
    utterance,
    afterHardTruth: input.afterHardTruth,
    emotional,
    presenceRoll: input.presenceRoll,
  });
  const interrupt = decideGentleInterrupt({
    transcript: utterance,
    speakingMs: input.speakingMs ?? 0,
    emotional,
    insightReady: memoryRefs.length > 0 || Boolean(input.futureSelf?.verdict),
    insightText:
      memoryRefs.length > 0
        ? memoryReferenceLine(memoryRefs)
        : futureSelf.projection.slice(0, 180),
  });

  let primary: HomieBehaviorId = "emotional_mirror";

  if (input.prefer) {
    primary = input.prefer;
  } else if (silent.remainSilent) {
    primary = "silent_witness";
  } else if (FUTURE_SELF_ASK.test(utterance)) {
    primary = "future_self";
  } else if (MEMORY_ASK.test(utterance) || memoryRefs.length > 0) {
    primary = "memory_palace";
  } else if (interrupt.shouldInterrupt) {
    primary = "gentle_interrupter";
  } else if (emotional.tone !== "steady" && emotional.confidence >= 0.5) {
    primary = "emotional_mirror";
  } else if (input.futureSelf?.verdict && /\b(path|ready|score|verdict)\b/i.test(utterance)) {
    primary = "future_self";
  }

  const cards: HomieCardId[] = [...cardsForSpeech(utterance)];
  if (emotional.tone === "anxious" || emotional.tone === "frustrated") {
    cards.push(...cardsForPillar("emotional"));
  }
  if (primary === "future_self" && futureSelf.weakestPillar) {
    cards.push(...cardsForPillar(futureSelf.weakestPillar), "score", "verdict");
  }
  if (primary === "memory_palace") {
    cards.push("companion_line");
  }

  const promptParts: string[] = [];
  promptParts.push(
    `HōMI presence behavior this turn: ${primary.replace(/_/g, " ")}. Stay inside HōMI voice rules — educational only, no advice.`,
  );

  if (primary === "emotional_mirror") {
    promptParts.push(
      `Emotional Mirror: tone≈${emotional.tone} (heuristic, not clinical). Reflect briefly: ${emotional.reflection}`,
    );
  }
  if (primary === "memory_palace" && memoryRefs.length > 0) {
    promptParts.push(
      `Memory Palace references (facts the user already said — do not invent): ${memoryRefs
        .map((m) => `"${m.gist}"`)
        .join(" | ")}`,
    );
  }
  if (primary === "gentle_interrupter" && interrupt.insight) {
    promptParts.push(
      `Gentle Interrupter: a soft pause was warranted (${interrupt.reason}). Offer at most one short insight: ${interrupt.insight}`,
    );
  }
  if (primary === "future_self") {
    promptParts.push(
      `Future Self projection (mirror of current path, not a promise): ${futureSelf.projection}`,
    );
  }
  if (primary === "silent_witness") {
    promptParts.push(
      "Silent Witness: prefer minimal or empty reply. Presence over words. A single short acknowledgment is the maximum.",
    );
  }

  return {
    primary,
    emotional,
    memoryRefs: memoryRefs.length > 0 ? memoryRefs : undefined,
    interrupt,
    futureSelf,
    silent,
    cards: uniqueCards(cards),
    promptHint: promptParts.join("\n"),
  };
}
