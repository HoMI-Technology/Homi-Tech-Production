import { Skeleton } from "@/components/ui/Skeleton";

export default function EmployeeDashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12" aria-busy="true" aria-label="Loading employee dashboard">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-2 h-10 w-64" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
