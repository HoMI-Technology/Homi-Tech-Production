/**
 * Dashboard skeleton — mirrors the operate instrument layout so first paint
 * does not jump when data lands.
 */
export default function DashboardLoading() {
  return (
    <div className="field">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div
          className="dash-instrument p-5 sm:p-7 lg:p-9"
          style={{ ["--instrument-tint" as string]: "#22d3ee" }}
        >
          <div className="dash-instrument-inner">
            <div className="mb-6 space-y-2 border-b border-white/10 pb-5">
              <div className="h-7 w-48 animate-pulse rounded bg-slate-surface/80" />
              <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-surface/50" />
            </div>
            <div className="grid gap-8 lg:grid-cols-[188px_1fr]">
              <div className="mx-auto h-44 w-44 animate-pulse rounded-full bg-slate-surface/70" />
              <div className="space-y-3">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-surface/60" />
                <div className="h-16 w-32 animate-pulse rounded bg-slate-surface/80" />
                <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-surface/50" />
                <div className="mt-4 h-2 w-full max-w-lg animate-pulse rounded-full bg-slate-surface/60" />
              </div>
            </div>
            <div className="mt-7 h-16 animate-pulse rounded-xl bg-slate-surface/50" />
          </div>
        </div>

        <div className="dash-rail mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="dash-rail-cell">
              <div className="h-2.5 w-16 animate-pulse rounded bg-slate-surface/60" />
              <div className="mt-2 h-7 w-12 animate-pulse rounded bg-slate-surface/80" />
              <div className="mt-2 h-2.5 w-20 animate-pulse rounded bg-slate-surface/40" />
            </div>
          ))}
        </div>

        <div className="dash-body-grid mt-8">
          <div className="space-y-4">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-surface/60" />
            <div className="grid gap-3 lg:grid-cols-12">
              <div className="h-48 animate-pulse rounded-xl bg-slate-surface/50 lg:col-span-6" />
              <div className="h-48 animate-pulse rounded-xl bg-slate-surface/40 lg:col-span-3" />
              <div className="h-48 animate-pulse rounded-xl bg-slate-surface/40 lg:col-span-3" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-36 animate-pulse rounded-xl bg-slate-surface/45" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-surface/40" />
            <div className="h-48 animate-pulse rounded-xl bg-slate-surface/35" />
          </div>
        </div>
      </div>
    </div>
  );
}
