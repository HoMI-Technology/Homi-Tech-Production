import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Dashboard route skeleton — the shape of the answer, instantly. Mirrors the
 * real layout's geometry (greeting → stat rail → verdict hero → trajectory →
 * pillars) so the loaded page lands in place with zero layout shift, instead
 * of a generic spinner followed by everything popping in at once.
 */
export default function DashboardLoading() {
  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="sr-only" role="status">
          Loading your dashboard…
        </p>

        {/* Greeting */}
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />

        {/* Stat rail */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-3 h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Verdict hero */}
        <div className="glass mt-8 p-8">
          <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex justify-center">
              <Skeleton className="h-[170px] w-[170px] rounded-full" />
            </div>
            <div>
              <Skeleton className="h-14 w-40" />
              <Skeleton className="mt-4 h-4 w-full max-w-xl" />
              <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
              <Skeleton className="mt-5 h-2 w-full max-w-xl rounded-full" />
              <div className="mt-6 flex flex-wrap gap-3">
                <Skeleton className="h-11 w-48 rounded-xl" />
                <Skeleton className="h-11 w-32 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Trajectory + next move */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="glass p-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-40" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
          <div className="glass p-8">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-6 w-48" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-6 h-10 w-40 rounded-xl" />
          </div>
        </div>

        {/* Pillars */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-2 h-3 w-40" />
              <div className="mt-5 flex justify-center">
                <Skeleton className="h-[120px] w-[120px] rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
