export default function FinanceLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div>
        <div className="h-4 w-24 animate-pulse rounded bg-slate-surface/40" />
        <div className="mt-3 h-10 w-48 animate-pulse rounded bg-slate-surface/40" />
        <div className="mt-2 h-5 w-96 max-w-full animate-pulse rounded bg-slate-surface/40" />
      </div>
      <div className="h-10 w-full animate-pulse rounded bg-slate-surface/40" />
      <div className="h-64 animate-pulse rounded-lg bg-slate-surface/40" />
    </div>
  );
}
