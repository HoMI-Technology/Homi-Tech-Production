import { Skeleton } from "@/components/ui/Skeleton";

const GRID_COLS: Record<3 | 4, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/**
 * Shared route-level loading skeleton for the role dashboards
 * (employee / partner / team). Heading pair + stat-card grid; card count
 * follows the column count so the shape matches the loaded page.
 */
export function DashboardLoadingSkeleton({
  ariaLabel,
  columns,
}: {
  ariaLabel: string;
  columns: 3 | 4;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12" aria-busy="true" aria-label={ariaLabel}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-10 w-64" />
      <div className={`mt-8 grid grid-cols-2 gap-4 ${GRID_COLS[columns]}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="glass p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
