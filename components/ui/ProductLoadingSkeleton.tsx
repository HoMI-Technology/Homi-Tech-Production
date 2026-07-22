/**
 * Shared product-page loading skeleton — matches dashboard/daily language
 * (slate shimmer only; never brand colors). Use for client-fetched surfaces
 * that previously flashed bare "Loading..." text.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export function ProductLoadingSkeleton({
  label = "Loading",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div className="mt-8 space-y-4" aria-busy="true" aria-label={label}>
      <div className="glass space-y-4 p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-3 w-full max-w-xl" />
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
