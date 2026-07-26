import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Root loading state — rendered while the root layout and its children
 * are fetching. Uses the brand skeleton-shimmer pattern (see globals.css)
 * so the loading experience is consistent with the rest of the product.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4">
        {/* Compass placeholder — a circle with shimmer */}
        <div className="skeleton-shimmer rounded-full" style={{ width: 120, height: 120 }} />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Skeleton cards to suggest page structure loading */}
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-xl" />
          <Skeleton className="h-20 flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
