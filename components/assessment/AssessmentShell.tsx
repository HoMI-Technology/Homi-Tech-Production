import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Full-bleed shell for the assessment ritual.
 *
 * Hides the sidebar. Shows a thin top bar (wordmark + exit link) and nothing
 * else — the assessment IS the product's core moment, so it gets the viewport
 * with no competing chrome. Routed to by ProductLayoutRouter, which is the only
 * place that knows the current path.
 *
 * It renders `main#main` when used. Signed-in /assessment now uses the quiet
 * top-bar shell (ProductLayoutRouter → AppHeader); this file is unused in
 * that live path.
 */
export function AssessmentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="assessment-focus-shell">
      {/* Minimal top bar — wordmark + escape hatch. Progress lives in the flow
          itself (components/assessment/ProgressBar.tsx), not up here. */}
      <div className="assessment-focus-bar">
        <Link href="/dashboard" aria-label="HōMI home">
          <Wordmark size="text-lg" />
        </Link>
        <p className="eyebrow text-dim/50">Intelligence Gathering</p>
        {/* Answers are drafted to localStorage on every step (lib/assessment/
            draft.ts), so leaving really does keep your place. */}
        <Link
          href="/dashboard"
          className="text-2xs font-medium text-dim/60 transition-colors hover:text-dim"
        >
          Save &amp; exit
        </Link>
      </div>

      <main id="main" className="assessment-focus-content">
        {children}
      </main>
    </div>
  );
}
