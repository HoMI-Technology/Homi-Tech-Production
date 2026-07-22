import type { UserRole } from "@/types/database";

export type DashboardLink = {
  href: string;
  label: string;
  /** Role that may see this entry (admins always see every entry). */
  requiredRole?: Exclude<UserRole, "user" | "admin">;
  /** Requires employer_id (employee benefits hub). */
  requiredEmployer?: boolean;
  /** Requires organization_id (team aggregates). */
  requiredOrganization?: boolean;
  /** Admin-only destination. */
  adminOnly?: boolean;
};

export const ALL_DASHBOARDS: DashboardLink[] = [
  { href: "/dashboard", label: "Personal" },
  { href: "/partner/dashboard", label: "Partner", requiredRole: "partner" },
  { href: "/employee/dashboard", label: "Employee", requiredEmployer: true },
  { href: "/team", label: "Team", requiredOrganization: true },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/admin/analytics", label: "Analytics", adminOnly: true },
];

export type SwitcherContext = {
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
  /**
   * Legacy combined org flag from the product layout era.
   * When true without specific IDs, both employer and organization gates pass.
   */
  orgMember?: boolean;
};

/**
 * Which dashboard switcher tabs a user should see.
 * Admins see every destination. Employee vs Team are not conflated when
 * employerId / organizationId are provided separately.
 */
export function visibleDashboards(ctx: SwitcherContext): DashboardLink[] {
  const role = (ctx.role ?? "user") as string;
  const isAdmin = role === "admin";
  const hasEmployer = Boolean(ctx.employerId) || Boolean(ctx.orgMember);
  const hasOrganization = Boolean(ctx.organizationId) || Boolean(ctx.orgMember);
  // Role "employee" may lack employer_id mid-onboarding but still belongs on the hub.
  const employeeEligible =
    role === "employee" || hasEmployer || isAdmin;

  return ALL_DASHBOARDS.filter((d) => {
    if (isAdmin) return true;
    if (d.adminOnly) return false;
    if (d.requiredRole && d.requiredRole !== role) return false;
    if (d.requiredEmployer && !employeeEligible) return false;
    if (d.requiredOrganization && !hasOrganization) return false;
    return true;
  });
}

/** Which switcher tab should appear active for the current path. */
export function activeDashboardHref(pathname: string, visible: DashboardLink[]): string | null {
  if (pathname.startsWith("/admin/analytics")) {
    return visible.find((d) => d.href === "/admin/analytics")?.href ?? null;
  }
  if (pathname.startsWith("/admin")) {
    return visible.find((d) => d.href === "/admin")?.href ?? null;
  }
  // Longest prefix match so /partner/dashboard wins over /dashboard.
  const sorted = [...visible].sort((a, b) => b.href.length - a.href.length);
  return sorted.find((d) => pathname === d.href || pathname.startsWith(`${d.href}/`))?.href ?? null;
}
