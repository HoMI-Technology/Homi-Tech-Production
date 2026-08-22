import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level loading UI for Household — matches dashboard skeleton language. */
export default function HouseholdLoading() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading household readiness"
    >
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-3 h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="glass space-y-4 p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="glass space-y-4 p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
