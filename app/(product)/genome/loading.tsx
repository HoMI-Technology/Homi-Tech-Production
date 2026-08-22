import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Route-level loading UI for Behavioral Genome — matches dashboard skeleton
 * language. The page renders the same shape internally while stored results
 * hydrate (genome/page.tsx); keep the two in sync.
 */
export default function GenomeLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading behavioral genome"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-24 rounded-xl" />
      </div>
      <div className="glass mt-8 flex justify-center p-8">
        <Skeleton className="h-64 w-64 max-w-full rounded-full" />
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass space-y-3 p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-6 w-10" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
