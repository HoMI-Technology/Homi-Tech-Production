import type { CSSProperties, ReactNode } from "react";

import { COLORS } from "@/lib/brand";

/**
 * Operate instrument shell — Direction A (Cockpit Linear).
 * Same visual language as personal /dashboard hero surface.
 *
 * Peer primitives live beside this file:
 * - `OperateHeroMeta`
 * - `ActionDock`
 * - `MetricRail`
 *
 * Re-exports below are temporary for one release — prefer direct imports.
 */
export function OperateInstrument({
  tint = COLORS.cyan,
  children,
  className = "",
}: {
  tint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`dash-instrument ${className}`.trim()}
      style={{ ["--instrument-tint" as string]: tint } as CSSProperties}
    >
      <div className="dash-instrument-inner p-5 sm:p-7 lg:p-8">{children}</div>
    </div>
  );
}

export { ActionDock } from "@/components/operate/ActionDock";
export { OperateHeroMeta } from "@/components/operate/OperateHeroMeta";
