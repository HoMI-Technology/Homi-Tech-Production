import { Skeleton } from "@/components/ui/Skeleton";
import { PageFrame } from "@/components/operate/PageFrame";

/**
 * Dashboard skeleton — mirrors the subtracted fold (hero + verdict + next
 * step). No compass, rail, or pillar grid, so first paint does not jump.
 */
export default function DashboardLoading() {
  return (
    <PageFrame role="personal" density="compact">
      <div aria-busy="true" aria-label="Loading dashboard">
        <div className="dash-stage">
          <div className="glass p-5 sm:p-7 lg:p-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-16 w-32" />
            <Skeleton className="mt-4 h-10 w-48 rounded-full" />
            <Skeleton className="mt-4 h-4 w-full max-w-md" />
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Skeleton className="h-11 w-40 rounded-full" />
              <Skeleton className="h-11 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}
