import type { CSSProperties, ReactNode } from "react";

/**
 * Operate instrument shell — Direction A (Cockpit Linear).
 * Same visual language as personal /dashboard hero surface.
 */
export function OperateInstrument({
  tint = "#22d3ee",
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
      {children != null && <div className="flex flex-wrap gap-2.5">{children}</div>}
    </div>
  );
}
