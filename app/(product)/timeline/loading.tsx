import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level loading UI for Score History — matches dashboard skeleton language. */
export default function TimelineLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading score history"
    >
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div className="glass mt-8 space-y-4 p-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="flex justify-between gap-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
