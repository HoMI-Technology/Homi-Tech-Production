/**
 * Readiness surface roles (SSOT).
 *
 * Import this module from `/path`, `/plan`, and `/dashboard` so the boundary
 * cannot drift as copy-pasted comment blocks (post-login audit F8).
 *
 * Living Build = `/dashboard` fold + `/path`. Checklist `/plan` is palette-only.
 * `/results` is retired — middleware redirects signed-in → Home, guest → First Moment.
 * `/report/{id}` is the record.
 */
export const SURFACE_ROLES = {
  home: "Signed-in Home fold inside the v3 quiet shell — verdict, score, age, hard stop, hold, then Path/Assess. Money waits below the fold until real accounts. Compass stays in the bar.",
  results:
    "Retired route. Middleware redirects signed-in → Home, guest → First Moment — not a Build destination.",
  path: "Living Build — binding-constraint Path to Ready over time.",
  plan: "Checklist deep-link (palette-only). Path owns the Build in chrome.",
  report: "Persisted, shareable/printable record of one assessment.",
} as const;

export type SurfaceRoleKey = keyof typeof SURFACE_ROLES;
