import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Home v4 route loading — quiet fold skeleton. No PageFrame, no glass cards,
 * no Compass. Shell v4 already wraps this route.
 */
export default function HomeV4Loading() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6" aria-busy="true" aria-label="Loading home">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-6 h-16 w-24" />
      <Skeleton className="mt-4 h-8 w-48 max-w-full" />
      <Skeleton className="mt-4 h-4 w-full max-w-md" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="mt-8 h-px w-full" />
      <Skeleton className="mt-6 h-4 w-40" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
    </div>
  );
}
