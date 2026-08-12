import type { CSSProperties, ReactNode } from "react";

export type OperateDensity = "comfortable" | "compact" | "spacious";
export type OperateWidth = "default" | "narrow" | "full" | "content" | "focus";
export type OperateRole = "personal" | "partner" | "employee" | "team" | "admin";

/**
 * Shared operate page shell — density + width tokens only.
 * Visual language stays HōMI (field parent, glass children). No second brand.
 *
 * Width tiers (derived from the wave-3 survey of hand-rolled product shells):
 * - "default" / "full" — max-w-7xl (dashboard-class instrument surfaces)
 * - "content"          — max-w-6xl (standard personal content: daily, finance,
 *                        journal, calendar, signals, household, …)
 * - "focus"            — max-w-5xl (single-column focused surfaces: scenarios,
 *                        outcomes, twin, trinity, calibration, …)
 * - "narrow"           — max-w-3xl (reading columns: advisor, genome intro)
 *
 * "spacious" density is the flat py-12 rhythm those personal surfaces share.
 */
export function PageFrame({
  density = "comfortable",
  width = "default",
  role,
  children,
  className = "",
  id,
  style,
}: {
  density?: OperateDensity;
  width?: OperateWidth;
  role?: OperateRole;
  children: ReactNode;
  className?: string;
  id?: string;
  style?: CSSProperties;
}) {
  const max =
    width === "full"
      ? "max-w-7xl"
      : width === "content"
        ? "max-w-6xl"
        : width === "focus"
          ? "max-w-5xl"
          : width === "narrow"
            ? "max-w-3xl"
            : "max-w-7xl";
  const py =
    density === "compact" ? "py-6 sm:py-8" : density === "spacious" ? "py-12" : "py-8 sm:py-10";

  return (
    <div
      id={id}
      className={`field ${className}`.trim()}
      data-operate-role={role}
      data-density={density}
      style={style}
    >
      <div className={`mx-auto ${max} px-4 sm:px-6 ${py}`}>{children}</div>
    </div>
  );
}
