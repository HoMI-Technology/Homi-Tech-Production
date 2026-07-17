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

const STORAGE_KEY = "homi:companion-identity";

export const IDENTITY_NAME_MAX = 24;
export const DEFAULT_IDENTITY_NAME = "HōMI";

export interface HomiIdentity {
  /** What the user calls their Companion. 1–24 chars, single line. */
  name: string;
}

export const DEFAULT_IDENTITY: HomiIdentity = { name: DEFAULT_IDENTITY_NAME };

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

/** Loads the identity from localStorage, defaulting to HōMI. SSR-safe. */
export function loadIdentity(): HomiIdentity {
  if (typeof window === "undefined") return DEFAULT_IDENTITY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IDENTITY;
    const parsed = JSON.parse(raw) as Partial<HomiIdentity>;
    const name = typeof parsed.name === "string" ? sanitizeIdentityName(parsed.name) : null;
    return name ? { name } : DEFAULT_IDENTITY;
  } catch {
    return DEFAULT_IDENTITY;
  }
}

/** Persists the identity. SSR-safe no-op; invalid names fall back to default. */
export function saveIdentity(identity: HomiIdentity): HomiIdentity {
  const name = sanitizeIdentityName(identity.name) ?? DEFAULT_IDENTITY_NAME;
  const next: HomiIdentity = { name };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — the in-memory identity still applies this session.
    }
  }
  return next;
}
