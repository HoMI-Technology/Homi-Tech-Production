/**
 * Readiness surface roles (SSOT).
 *
 * Import this module from `/results`, `/path`, `/plan`, and `/dashboard` so the
 * boundary cannot drift as three copy-pasted comment blocks (post-login audit F8).
 *
 * Living Build = `/dashboard` fold + `/path`. Checklist `/plan` is palette-only.
 * `/results` is an optional palette / Last-verdict reveal. `/report/{id}` is the record.
 */
export const SURFACE_ROLES = {
  home: "Signed-in Home fold — Path next move leads; money standing strip shows where cash sits; HōMI-Score is a compact rail reading.",
  results: "Guest empty / residual route only. Signed-in visits redirect to Home — not a Build destination.",
  path: "Living Build — binding-constraint Path to Ready over time.",
  plan: "Checklist deep-link (palette-only). Path owns the Build in chrome.",
  report: "Persisted, shareable/printable record of one assessment.",
} as const;

export type SurfaceRoleKey = keyof typeof SURFACE_ROLES;
