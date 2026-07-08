"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/admin",
    label: "Overview",
    icon: (
      <path d="M3 10l7-6 7 6M5 9v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />
    ),
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: (
      <>
        <circle cx="10" cy="7" r="3" />
        <path d="M4 17c0-2.8 2.7-5 6-5s6 2.2 6 5" />
      </>
    ),
  },
  {
    href: "/admin/assessments",
    label: "Assessments",
    icon: (
      <>
        <rect x="4" y="3" width="12" height="14" rx="1.5" />
        <path d="M7 7h6M7 10h6M7 13h4" />
      </>
    ),
  },
  {
    href: "/admin/waitlist",
    label: "Waitlist",
    icon: (
      <>
        <path d="M3 6l7 5 7-5" />
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
      </>
    ),
  },
  {
    href: "/admin/organizations",
    label: "Organizations",
    icon: (
      <>
        <rect x="3" y="8" width="6" height="9" rx="1" />
        <rect x="11" y="4" width="6" height="13" rx="1" />
        <path d="M5.5 11h1M5.5 14h1M13.5 7h1M13.5 10h1M13.5 13h1" />
      </>
    ),
  },
  {
    href: "/admin/activity",
    label: "Activity",
    icon: (
      <path d="M3 11h3l2 6 4-12 2 6h3" />
    ),
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-slate-surface text-cyan" : "text-dim hover:bg-slate-surface/60 hover:text-light"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
