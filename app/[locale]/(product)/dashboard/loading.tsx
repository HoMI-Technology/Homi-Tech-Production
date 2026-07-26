import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Dashboard route skeleton — mirrors the instrument chrome layout
 * (greeting → score instrument → rail → pillars).
 */
export default function DashboardLoading() {
  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
        <p className="sr-only" role="status">
          Loading your dashboard…
        </p>

        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />

        {/* Instrument hero */}
        <div className="dash-instrument mt-8 p-8" style={{ ["--instrument-tint" as string]: "#22d3ee" }}>
          <div className="dash-instrument-inner grid gap-8 lg:grid-cols-[200px_1fr]">
            <div className="flex justify-center">
              <Skeleton className="h-[188px] w-[188px] rounded-full" />
            </div>
            <div>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-16 w-40" />
              <Skeleton className="mt-4 h-4 w-full max-w-xl" />
              <Skeleton className="mt-6 h-2 w-full max-w-xl rounded-full" />
              <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                <Skeleton className="h-11 w-48 rounded-xl" />
                <Skeleton className="h-11 w-32 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Metric rail */}
        <div className="dash-rail mt-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="dash-rail-cell">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-8 w-14" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Pillars: focus wide */}
        <div className="mt-10 grid gap-4 lg:grid-cols-12">
          <div className="glass p-6 lg:col-span-6">
            <Skeleton className="h-5 w-40" />
            <div className="mt-6 flex justify-center">
              <Skeleton className="h-[140px] w-[140px] rounded-full" />
            </div>
          </div>
          <div className="glass p-6 lg:col-span-3">
            <Skeleton className="h-5 w-28" />
            <div className="mt-6 flex justify-center">
              <Skeleton className="h-[108px] w-[108px] rounded-full" />
            </div>
          </div>
          <div className="glass p-6 lg:col-span-3">
            <Skeleton className="h-5 w-28" />
            <div className="mt-6 flex justify-center">
              <Skeleton className="h-[108px] w-[108px] rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
