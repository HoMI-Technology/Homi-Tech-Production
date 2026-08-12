import type { ReactNode } from "react";

export type MetricCell = {
  label: string;
  value: ReactNode;
  footer?: string;
  color?: string;
};

/**
 * Slim metric rail — Direction A (Cockpit Linear).
 * Replaces equal StatTile KPI walls on operate homes.
 */
export function MetricRail({ cells }: { cells: MetricCell[] }) {
  return (
    <div className="dash-rail">
      {cells.map((cell) => (
        <div key={cell.label} className="dash-rail-cell">
          <p className="dash-rail-label">{cell.label}</p>
          <p className="dash-rail-value num" style={cell.color ? { color: cell.color } : undefined}>
            {cell.value}
          </p>
          {cell.footer != null && <p className="dash-rail-footer">{cell.footer}</p>}
        </div>
      ))}
    </div>
  );
}
