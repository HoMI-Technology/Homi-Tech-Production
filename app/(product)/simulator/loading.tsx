import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level loading UI for the Score simulator — matches dashboard skeleton language. */
export default function SimulatorLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading score simulator"
    >
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-3 h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-6 p-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="glass flex flex-col items-center space-y-4 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
