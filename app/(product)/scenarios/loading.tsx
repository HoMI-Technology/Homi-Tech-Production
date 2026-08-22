import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level loading UI for Scenario studio — matches dashboard skeleton language. */
export default function ScenariosLoading() {
  return (
    <div
      className="mx-auto max-w-3xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading scenario studio"
    >
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-9 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="glass space-y-4 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="glass space-y-4 p-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
