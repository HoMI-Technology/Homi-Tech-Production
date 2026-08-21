/**
 * HōMI voice-first companion — shared types.
 *
 * The floating avatar is one surface of the Companion mote. These types describe
 * avatar visual state, the five core presence behaviors, voice I/O, and the
 * dashboard-card highlight contract used while HōMI speaks.
 */

/** Visual / interaction state of the floating circular avatar. */
export type HomieAvatarState =
  | "idle"
  | "breathing"
  | "listening"
  | "speaking"
  | "interrupted"
  | "silent";

/**
 * Five core presence behaviors. Exactly one primary behavior may drive a turn;
 * Silent Witness may also suppress speech even when another behavior was scored.
 */
export type HomieBehaviorId =
  | "emotional_mirror"
  | "memory_palace"
  | "gentle_interrupter"
  | "future_self"
  | "silent_witness";

/** Heuristic emotional register reflected back to the user (never a diagnosis). */
export type EmotionalTone =
  | "calm"
  | "anxious"
  | "hopeful"
  | "frustrated"
  | "uncertain"
  | "steady";

/**
 * Dashboard instruments HōMI may highlight while speaking.
 * Selectors live in `lib/advisor/card-highlight.ts` and target existing
 * `data-*` hooks — companion code never invents new dashboard markup.
 */
export type HomieCardId =
  | "score"
  | "verdict"
  | "hard_stop"
  | "build"
  | "money"
  | "companion_line"
  | "financial"
  | "emotional"
  | "timing";

/** Three-pillar Decision Readiness anchors HōMI may reference. */
export type ReadinessPillar = "financial" | "emotional" | "timing";

export interface EmotionalMirrorReading {
  tone: EmotionalTone;
  /** 0–1 confidence of the heuristic — never presented as clinical certainty. */
  confidence: number;
  /** Short, plain reflection line suitable for companion voice. */
  reflection: string;
  signals: string[];
}

export interface MemoryPalaceEntry {
  id: string;
  /** ms epoch when the exchange was stored (client or server). */
  at: number;
  /** Compact factual gist the Companion may reference later. */
  gist: string;
  /** Optional pillar this memory touched. */
  pillar?: ReadinessPillar;
  role: "user" | "assistant";
}

export interface FutureSelfProjection {
  horizonLabel: string;
  /** Educational projection grounded in current verdict/path — not a promise. */
  projection: string;
  weakestPillar?: ReadinessPillar;
  verdictHint?: string;
}

export interface GentleInterruptDecision {
  shouldInterrupt: boolean;
  reason: "long_monologue" | "insight_ready" | "tone_shift" | "none";
  /** Soft copy HōMI may offer after the chime (never advice). */
  insight?: string;
}

export interface SilentWitnessDecision {
  remainSilent: boolean;
  /** Why presence alone is enough this turn. */
  reason: "presence" | "user_processing" | "after_hard_truth" | "none";
}

export interface HomieBehaviorTurn {
  primary: HomieBehaviorId;
  emotional?: EmotionalMirrorReading;
  memoryRefs?: MemoryPalaceEntry[];
  interrupt?: GentleInterruptDecision;
  futureSelf?: FutureSelfProjection;
  silent?: SilentWitnessDecision;
  /** Cards to highlight while HōMI speaks this turn. */
  cards: HomieCardId[];
  /** Optional system-prompt additive for /api/advisor. */
  promptHint: string;
}

/** Voice path latency sample — budget is 300ms for local I/O feedback. */
export interface VoiceLatencySample {
  phase: "listen_feedback" | "tts_start" | "recognition_final";
  startedAt: number;
  endedAt: number;
  durationMs: number;
  withinBudget: boolean;
}

export const HOMIE_VOICE_LATENCY_BUDGET_MS = 300;

export interface HomieVoiceCapabilities {
  recognition: boolean;
  synthesis: boolean;
}

export type HomieVoiceErrorCode =
  | "unsupported"
  | "permission_denied"
  | "no_speech"
  | "aborted"
  | "network"
  | "synthesis_failed"
  | "unknown";

export interface HomieVoiceError {
  code: HomieVoiceErrorCode;
  message: string;
}
