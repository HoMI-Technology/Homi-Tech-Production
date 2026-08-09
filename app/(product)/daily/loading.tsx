import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level loading UI for Daily Check-in — matches dashboard skeleton language. */
export default function DailyLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading daily check-in"
    >
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="glass space-y-5 p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="mt-2 h-11 w-full rounded-xl" />
        </div>
        <div className="glass space-y-4 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
