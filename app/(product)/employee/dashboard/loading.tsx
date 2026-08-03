import { DashboardLoadingSkeleton } from "@/components/ui/DashboardLoadingSkeleton";

export default function EmployeeDashboardLoading() {
  return <DashboardLoadingSkeleton ariaLabel="Loading employee dashboard" columns={3} />;
}
