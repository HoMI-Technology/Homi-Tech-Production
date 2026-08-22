import { Skeleton } from "@/components/ui/Skeleton";

/** Route-level loading UI for Decision Rehearsal — matches dashboard skeleton language. */
export default function DecisionsLoading() {
  return (
    <div
      className="mx-auto max-w-3xl px-4 sm:px-6 py-12"
      aria-busy="true"
      aria-label="Loading decision rehearsal"
    >
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="glass mt-8 space-y-4 p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-11 w-40 rounded-xl" />
      </div>
      <div className="glass mt-6 space-y-3 p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
