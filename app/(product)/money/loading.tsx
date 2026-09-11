import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Money v4 route loading — quiet picture skeleton. No PageFrame, no Compass.
 * Shell v4 already wraps this route.
 */
export default function MoneyV4Loading() {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6" aria-busy="true" aria-label="Loading money">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-5 h-8 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-3">
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-16 w-full max-w-xl" />
      </div>
    </div>
  );
}
