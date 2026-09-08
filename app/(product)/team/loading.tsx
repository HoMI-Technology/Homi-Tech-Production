import { DashboardLoadingSkeleton } from "@/components/ui/DashboardLoadingSkeleton";

export default function TeamDashboardLoading() {
  return <DashboardLoadingSkeleton ariaLabel="Loading team dashboard" columns={3} />;
}
