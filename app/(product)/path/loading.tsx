import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Path v4 route loading — quiet step skeleton. No PageFrame, no Compass.
 * Shell v4 already wraps this route.
 */
export default function PathV4Loading() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6" aria-busy="true" aria-label="Loading path">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-5 h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div className="mt-8 grid gap-3">
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-16 w-full max-w-xl" />
      </div>
    </div>
  );
}
