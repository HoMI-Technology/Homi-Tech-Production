import type { ArchitectureGap } from "./types";

/**
 * Verified residual gaps only. Stale satellite-catalog items (keyboard listener,
 * scroll progress, welcome banner, DO NOT PROCEED badge, calendar/family/receipts
 * “missing UI”) are intentionally omitted — they are already shipped in SSOT.
 *
 * Items closed by feat/architecture-agent-feed (slider hit targets, usePageTitle,
 * architecture feed) are also omitted.
 */
export const ARCHITECTURE_GAPS: ArchitectureGap[] = [
  {
    id: 1,
    severity: "low",
    area: "DevOps",
    issue: "Playwright E2E covers core funnels but not the full product matrix",
    fix: "Expand specs surgically for money/auth/share; keep live specs gated on secrets",
    effort: "4 hrs",
    verified: true,
  },
  {
    id: 2,
    severity: "medium",
    area: "Analytics",
    issue: "PostHog events are not instrumented uniformly across product routes",
    fix: "Align capture calls to BUILD-BRIEF taxonomy (assessment_*, verdict_*, checkout_*)",
    effort: "2 hrs",
    verified: true,
  },
  {
    id: 3,
    severity: "low",
    area: "Brand",
    issue:
      "Verdict vocabulary is dual-stable: enum NOT_YET, badge DO NOT PROCEED, prose often says “not yet”",
    fix: "Keep Policy A (see docs/adr/001-verdict-vocabulary.md); do not rename the enum without a migration ADR",
    effort: "docs only",
    verified: true,
  },
];
