import type { ReactNode } from "react";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/** Shared admin destinations — desktop sidebar + mobile chip row. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        href: "/admin",
        label: "Overview",
        icon: <path d="M3 10l7-6 7 6M5 9v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />,
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: <path d="M3 16.5v-5M8 16.5V8M13 16.5v-3M18 16.5V4" />,
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
        href: "/admin/email",
        label: "Email",
        icon: (
          <>
            <rect x="3" y="5" width="14" height="11" rx="1.5" />
            <path d="M4 7l6 4.5L16 7" />
            <path d="M7 18h6" />
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

export const ADMIN_NAV_FLAT = ADMIN_NAV_GROUPS.flatMap((g) => g.items);
