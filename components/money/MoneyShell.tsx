"use client";

import type { ReactNode } from "react";
import { MoneyModeRail } from "@/components/money/MoneyModeRail";
import { MoneyPicturePanel } from "@/components/money/MoneyPicturePanel";

/**
 * Money Reality instrument shell — dual-panel layout.
 *
 * Left (280px): MoneyPicturePanel — persistent financial picture, always
 * visible regardless of the active mode. Reads local ledger; never writes.
 *
 * Center (40px): MoneyModeRail — vertical S/T/D/P mode switcher.
 *
 * Right (flex): the active mode's content (Stand / Track / Decide / Plan).
 *
 * On mobile (<lg) the layout collapses: picture panel goes full-width above,
 * mode rail becomes a horizontal strip, content follows below.
 *
 * Client boundary: needed because MoneyModeRail + MoneyPicturePanel both
 * read from the browser (pathname + localStorage). PlannerApp (Track) is
 * dynamically imported with ssr:false, which is safe inside a client module.
 */
export function MoneyShell({ children }: { children: ReactNode }) {
  return (
    <div className="money-instrument-shell">
      {/* Left: persistent financial picture */}
      <aside className="money-picture-col" aria-label="Financial picture">
        <MoneyPicturePanel />
      </aside>

      {/* Center: vertical mode rail */}
      <MoneyModeRail />

      {/* Right: mode content */}
      <div className="money-content-col">
        {children}
      </div>
    </div>
  );
}
