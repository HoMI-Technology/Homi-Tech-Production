/**
 * "Your HōMI" — the user-created companion identity. Canon per
 * COMPANION-INTELLIGENCE-AUDIT.md: identity is configuration inside the
 * brand-voice envelope. The user names their HōMI; the name changes how the
 * relationship feels, never what the Companion is allowed to say. Personas
 * remain the tone presets underneath.
 *
 * v1 is the name. Tone/pacing/depth/focus arrive as later configuration —
 * extend HomiIdentity rather than adding parallel stores.
 */

import type { AdvisorPersona } from "@/lib/advisor/personas";

const STORAGE_KEY = "homi:companion-identity";

export const IDENTITY_NAME_MAX = 24;
export const DEFAULT_IDENTITY_NAME = "HōMI";

export type HomiPresetKey = "homi" | "steady" | "clarity" | "horizon";

export interface HomiPreset {
  key: HomiPresetKey;
  /** Starter name — the user can rename it any time. */
  name: string;
  /** One honest line about what this HōMI is for. */
  role: string;
  /** Brand-palette accent. Never colors outside canon. */
  color: string;
  /** The persona this HōMI leads with. Just a default — switchable as ever. */
  persona: AdvisorPersona;
  /** Visual form: the threshold compass, or a glowing orb in the accent color. */
  form: "compass" | "orb";
}

/**
 * The starter HōMIs — a few, deliberately. The old prototype's archetypes
 * (grounding / analytical / reflective) re-voiced within brand canon: no
 * animals, no emoji, brand colors only. Picking one is a starting point,
 * not a box — every one can be renamed, and personas stay switchable.
 */
export const HOMI_PRESETS: HomiPreset[] = [
  {
    key: "homi",
    name: "HōMI",
    role: "The classic. Warm, direct, balanced.",
    color: "#e2e8f0",
    persona: "homie",
    form: "compass",
  },
  {
    key: "steady",
    name: "Steady",
    role: "Grounding presence when it feels heavy.",
    color: "#34d399",
    persona: "gut",
    form: "orb",
  },
  {
    key: "clarity",
    name: "Clarity",
    role: "Numbers first. Patterns, plainly.",
    color: "#22d3ee",
    persona: "reality",
    form: "orb",
  },
  {
    key: "horizon",
    name: "Horizon",
    role: "Pace and timing. The long view.",
    color: "#facc15",
    persona: "timing",
    form: "orb",
  },
];

export function getPreset(key: string | null | undefined): HomiPreset {
  return HOMI_PRESETS.find((p) => p.key === key) ?? HOMI_PRESETS[0];
}

export interface HomiIdentity {
  /** What the user calls their Companion. 1–24 chars, single line. */
  name: string;
  /** Which starter HōMI this identity grew from — drives the visual form. */
  preset: HomiPresetKey;
}

export const DEFAULT_IDENTITY: HomiIdentity = { name: DEFAULT_IDENTITY_NAME, preset: "homi" };

/**
 * Normalizes a user-entered name: trims, collapses whitespace, strips line
 * breaks, clamps length. Returns null when nothing usable remains — callers
 * fall back to the default rather than storing an empty identity.
 */
export function sanitizeIdentityName(raw: string): string | null {
  const cleaned = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, IDENTITY_NAME_MAX);
}

/**
 * Resets the identity entirely: the next widget open shows the "choose your
 * HōMI" picker again. Used by the "what HōMI remembers" panel.
 */
export function clearIdentity(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort.
  }
}

/** Whether the user has ever chosen/saved an identity — gates the first-open picker. */
export function hasChosenIdentity(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Loads the identity from localStorage, defaulting to HōMI. SSR-safe. */
export function loadIdentity(): HomiIdentity {
  if (typeof window === "undefined") return DEFAULT_IDENTITY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IDENTITY;
    const parsed = JSON.parse(raw) as Partial<HomiIdentity>;
    const name = typeof parsed.name === "string" ? sanitizeIdentityName(parsed.name) : null;
    if (!name) return DEFAULT_IDENTITY;
    return { name, preset: getPreset(parsed.preset).key };
  } catch {
    return DEFAULT_IDENTITY;
  }
}

/** Persists the identity. SSR-safe no-op; invalid names fall back to default. */
export function saveIdentity(identity: HomiIdentity): HomiIdentity {
  const name = sanitizeIdentityName(identity.name) ?? DEFAULT_IDENTITY_NAME;
  const next: HomiIdentity = { name, preset: getPreset(identity.preset).key };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — the in-memory identity still applies this session.
    }
  }
  return next;
}
