/**
 * HōMI Brand Core — locked to CANON.md + lib/brand/homi-tokens.json.
 * These values are immutable for production. Never approximate.
 * Token JSON is a derived lock (not imported at runtime); TS here remains authority with CSS `@theme`.
 */

export const BRAND = {
  name: "HōMI",
  display: "HōMI",
  legalEntity: "Homi Technologies LLC",
  domain: "homitechnology.com",
  category: "Decision Readiness Intelligence™",
} as const;