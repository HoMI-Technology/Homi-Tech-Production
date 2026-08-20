/**
 * Readiness surface roles (SSOT).
 *
 * Import this module from `/results`, `/path`, `/plan`, and `/dashboard` so the
 * boundary cannot drift as three copy-pasted comment blocks (post-login audit F8).
 *
 * Living Build = `/dashboard` fold + `/path`. Checklist `/plan` is palette-only.
 * `/results` is the verdict reveal transition. `/report/{id}` is the record.
 */
export const SURFACE_ROLES = {
  home: "Signed-in Home fold — Path next move leads; HōMI-Score is a compact rail reading.",
  results: "Verdict reveal — score, pillars, insight, then exit into the Build (Home + Path). No in-page Path operate.",
  path: "Living Build — binding-constraint Path to Ready over time.",
  plan: "Checklist deep-link (palette-only). Path owns the Build in chrome.",
  report: "Persisted, shareable/printable record of one assessment.",
} as const;

export type SurfaceRoleKey = keyof typeof SURFACE_ROLES;
