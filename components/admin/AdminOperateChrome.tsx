"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/AdminSidebar";

/**
 * Admin depth chrome under SHELL_CRAFT v3.
 * `/admin` home is PageFrame-only (no left rail). Existing `/admin/*` rooms
 * keep the sidebar + mobile chips — not a new room, not a fifth role home.
 */
export function AdminOperateChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/admin";

  return (
    <div className="field min-h-dvh" data-operate-role="admin" data-density="compact">
      {isHome ? (
        children
      ) : (
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10">
          <aside className="hidden w-52 shrink-0 md:block lg:w-56">
            <div className="sticky top-[var(--nav-offset)]">
              <AdminSidebar />
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <AdminMobileNav />
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
