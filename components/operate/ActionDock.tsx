import type { ReactNode } from "react";

/**
 * Next-move dock — Direction A (Cockpit Linear).
 * One primary action (+ optional secondary). Peer to OperateInstrument / MetricRail.
 */
export function ActionDock({
  kicker = "Next move",
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="dash-action-dock">
      <div className="min-w-0">
        <p className="dash-action-dock-label">{kicker}</p>
        <p className="dash-action-dock-title">{title}</p>
      </div>
      {children != null && <div className="dash-action-dock-actions">{children}</div>}
    </div>
  );
}
