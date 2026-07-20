"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface DashboardSwitcherProps {
  role?: string | null;
  /** True when the user is a partner (role) — not profiles.partner_id (that is "referred by"). */
  isPartner?: boolean;
  employerId?: string | null;
  orgId?: string | null;
  isEmployee?: boolean;
}

/**
 * Role-based dashboard strip for multi-surface users.
 * Paths avoid marketing route collisions:
 *   partner → /partner/dashboard, employee → /employee/dashboard, team → /team
 */
export function DashboardSwitcher({
  role,
  isPartner,
  employerId,
  orgId,
  isEmployee,
}: DashboardSwitcherProps) {
  const pathname = usePathname();

  const dashboards: { label: string; href: string; active: boolean }[] = [
    {
      label: "Personal",
      href: "/dashboard",
      active: pathname === "/dashboard" || pathname.startsWith("/dashboard/"),
    },
  ];

  if (isPartner || role === "partner" || role === "admin") {
    dashboards.push({
      label: "Partner",
      href: "/partner/dashboard",
      active: pathname.startsWith("/partner/dashboard") || pathname.startsWith("/partner/portal"),
    });
  }
  if (employerId || isEmployee || role === "employee") {
    dashboards.push({
      label: "Benefits",
      href: "/employee/dashboard",
      active: pathname.startsWith("/employee/dashboard") || pathname.startsWith("/employee/portal"),
    });
  }
  if (orgId || role === "admin") {
    dashboards.push({
      label: "Team",
      href: "/team",
      active: pathname === "/team" || pathname.startsWith("/team/"),
    });
  }
  if (role === "admin") {
    dashboards.push({
      label: "Admin",
      href: "/admin",
      active: pathname === "/admin" || pathname.startsWith("/admin/"),
    });
    dashboards.push({
      label: "Growth",
      href: "/analytics",
      active: pathname === "/analytics",
    });
  }

  if (dashboards.length <= 1) return null;

  return (
    <nav
      className="hidden items-center gap-1 rounded-lg bg-slate-surface/50 p-1 md:flex"
      aria-label="Dashboard switcher"
    >
      {dashboards.map((d) => (
        <Link
          key={d.href}
          href={d.href}
          className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
            d.active ? "bg-navy text-light" : "text-dim hover:text-light"
          }`}
          aria-current={d.active ? "page" : undefined}
        >
          {d.label}
        </Link>
      ))}
    </nav>
  );
}
