"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type DashboardLink = {
  href: string;
  label: string;
  requiredRole?: string;
  requiredOrg?: boolean;
};

const ALL_DASHBOARDS: DashboardLink[] = [
  { href: "/dashboard", label: "Personal" },
  { href: "/partner/dashboard", label: "Partner", requiredRole: "partner" },
  { href: "/employee/dashboard", label: "Employee", requiredOrg: true },
  { href: "/team", label: "Team", requiredOrg: true },
  { href: "/admin", label: "Admin", requiredRole: "admin" },
  { href: "/analytics", label: "Analytics", requiredRole: "admin" },
];

interface DashboardSwitcherProps {
  userRole?: string;
  orgMember?: boolean;
}

export function DashboardSwitcher({ userRole = "user", orgMember = false }: DashboardSwitcherProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visible = ALL_DASHBOARDS.filter((d) => {
    if (d.requiredRole && d.requiredRole !== userRole) return false;
    if (d.requiredOrg && !orgMember) return false;
    return true;
  });

  if (visible.length <= 1) return null;

  const activeDashboard = visible.find((d) => pathname.startsWith(d.href)) ?? visible[0];

  return (
    <nav className="relative" aria-label="Dashboard switcher">
      <div className="hidden items-center gap-1 rounded-xl border border-slate-high/30 bg-slate-surface/50 p-1 sm:inline-flex">
        {visible.map((dashboard) => {
          const isActive = pathname.startsWith(dashboard.href);
          return (
            <Link
              key={dashboard.href}
              href={dashboard.href}
              className={`relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isActive ? "text-light" : "text-dim hover:text-light"}`}
            >
              {isActive && !reducedMotion && (
                <motion.div
                  layoutId="dash-active-pill"
                  className="absolute inset-0 rounded-lg bg-navy-light/80 border border-slate-high/40"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{ zIndex: 0 }}
                />
              )}
              {isActive && reducedMotion && (
                <div className="absolute inset-0 rounded-lg bg-navy-light/80 border border-slate-high/40" style={{ zIndex: 0 }} />
              )}
              <span className="relative z-10">{dashboard.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="sm:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-slate-high/30 bg-slate-surface/50 px-3 py-2 text-sm font-medium text-light"
          aria-expanded={mobileOpen}
          aria-haspopup="listbox"
        >
          <span>{activeDashboard.label}</span>
          <svg className={`h-4 w-4 text-dim transition-transform ${mobileOpen ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? {} : { opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="glass absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden"
            >
              {visible.map((dashboard) => {
                const isActive = pathname.startsWith(dashboard.href);
                return (
                  <Link
                    key={dashboard.href}
                    href={dashboard.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2.5 text-sm transition-colors ${isActive ? "bg-navy-light/80 font-medium text-light" : "text-dim hover:bg-slate-surface/50 hover:text-light"}`}
                  >
                    {dashboard.label}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
