"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: <path d="M3 10l7-6 7 6M5 9v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />,
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
    ],
  },
  {
    label: "Growth",
    items: [
      {
        href: "/admin/marketing",
        label: "Marketing",
        icon: (
          <>
            <path d="M3 8.5v3l4 .8 6 3.7V4L7 7.7 3 8.5z" />
            <path d="M15.5 8a3.2 3.2 0 010 4" />
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
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/admin/activity",
        label: "Activity",
        icon: <path d="M3 11h3l2 6 4-12 2 6h3" />,
      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="eyebrow px-3 !text-[0.625rem] !text-dim/80">{group.label}</p>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-slate-surface/80 text-cyan shadow-[inset_0_1px_0_rgba(226,232,240,0.06),0_0_24px_-8px_rgba(34,211,238,0.5)]"
                      : "text-dim hover:bg-slate-surface/50 hover:text-light"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan"
                      style={{ boxShadow: "0 0 10px rgba(34,211,238,0.8)" }}
                    />
                  )}
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                    {item.icon}
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
