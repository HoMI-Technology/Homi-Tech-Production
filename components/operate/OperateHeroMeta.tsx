import type { ReactNode } from "react";

/**
 * Instrument fold title + job line — Direction A (Cockpit Linear).
 * Peer to OperateInstrument / MetricRail / ActionDock.
 */
export function OperateHeroMeta({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="dash-hero-meta">
      <h1>{title}</h1>
      {description != null && <p>{description}</p>}
    </div>
  );
}
