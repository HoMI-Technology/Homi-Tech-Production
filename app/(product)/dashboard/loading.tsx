import { Skeleton } from "@/components/ui/Skeleton";
import { COLORS } from "@/lib/brand";

/**
 * Dashboard skeleton — mirrors the operate instrument layout so first paint
 * does not jump when data lands.
 */
export default function DashboardLoading() {
  return (
    <div className="field" aria-busy="true" aria-label="Loading dashboard">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div
          className="dash-instrument p-5 sm:p-7 lg:p-9"
          style={{ ["--instrument-tint" as string]: COLORS.cyan }}
        >
          <div className="dash-instrument-inner">
            <div className="mb-6 space-y-2 border-b border-white/10 pb-5">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="grid gap-8 lg:grid-cols-[188px_1fr]">
              <Skeleton className="mx-auto h-44 w-44 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-16 w-32" />
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="mt-4 h-2 w-full max-w-lg rounded-full" />
              </div>
            </div>
            <Skeleton className="mt-7 h-16 rounded-xl" />
          </div>
        </div>

        <div className="dash-rail mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dash-rail-cell">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2 h-7 w-12" />
              <Skeleton className="mt-2 h-2.5 w-20" />
            </div>
          ))}
        </div>

        <div className="dash-body-grid mt-8">
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="grid gap-3 lg:grid-cols-12">
              <Skeleton className="h-48 rounded-xl lg:col-span-6" />
              <Skeleton className="h-48 rounded-xl lg:col-span-3" />
              <Skeleton className="h-48 rounded-xl lg:col-span-3" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
