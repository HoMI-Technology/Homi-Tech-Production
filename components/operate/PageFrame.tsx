import type { ReactNode } from "react";

export type OperateDensity = "comfortable" | "compact";
export type OperateWidth = "default" | "narrow" | "full";
export type OperateRole = "personal" | "partner" | "employee" | "team" | "admin";

/**
 * Shared operate page shell — density + width tokens only.
 * Visual language stays HōMI (field parent, glass children). No second brand.
 */
export function PageFrame({
  density = "comfortable",
  width = "default",
  role,
  children,
  className = "",
}: {
  density?: OperateDensity;
  width?: OperateWidth;
  role?: OperateRole;
  children: ReactNode;
  className?: string;
}) {
  const max =
    width === "full"
      ? "max-w-7xl"
      : width === "narrow"
        ? "max-w-3xl"
        : "max-w-6xl";
  const py = density === "compact" ? "py-8 sm:py-10" : "py-10 sm:py-12";

  return (
    <div
      className={`field ${className}`.trim()}
      data-operate-role={role}
      data-density={density}
    >
      <div className={`mx-auto ${max} px-6 ${py}`}>{children}</div>
    </div>
  );
}
