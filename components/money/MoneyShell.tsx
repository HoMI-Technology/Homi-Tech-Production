import type { ReactNode } from "react";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";

/**
 * Money Reality shell — single quiet column.
 *
 * Mode tabs (Readiness / Reality / Decide / Plan / Goals) are not a primary
 * rail and are not painted here. Live depth routes stay reachable from Path
 * links, palette, and ···. Money is depth under the Home verdict.
 */
export function MoneyShell({ children }: { children: ReactNode }) {
  return (
    <div className="money-page" data-surface="money" data-money-depth="">
      <JobDepthFrame job="money">
        <div className="money-page-content">{children}</div>
      </JobDepthFrame>
    </div>
  );
}
