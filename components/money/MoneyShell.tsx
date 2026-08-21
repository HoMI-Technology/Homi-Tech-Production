import type { ReactNode } from "react";
import { MoneyModeNav } from "@/components/money/MoneyModeNav";

/**
 * Money Reality shell — single-column cockpit.
 *
 * The old three-column instrument (280px picture panel + 40px glyph rail +
 * content) put four competing zones on one page and printed surplus/income/
 * evidence twice. Now: labeled mode tabs on top, one measured column below.
 * The picture-panel data lives inline in the mode content (see MoneyStand).
 *
 * Server component: MoneyModeNav owns the only client boundary (usePathname),
 * so a server page can pass server-rendered children straight through.
 */
export function MoneyShell({ children }: { children: ReactNode }) {
  return (
    <div className="money-page" data-surface="money" data-money-depth="">
      <MoneyModeNav />
      <div className="money-page-content">{children}</div>
    </div>
  );
}
