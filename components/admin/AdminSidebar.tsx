"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS } from "@/components/admin/admin-nav";

function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="eyebrow px-3 !text-[0.625rem] !text-dim/80">{group.label}</p>
          <div className="mt-1.5 flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isAdminNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
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

/** Compact horizontal admin nav for viewports below `md`. */
export function AdminMobileNav() {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>("[aria-current='page']");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [pathname]);

  return (
    <nav
      ref={scrollerRef}
      aria-label="Admin sections"
      className="admin-mobile-nav sticky top-[var(--nav-offset)] z-20 -mx-1 mb-6 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-1 md:hidden [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
    >
      {ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
        const active = isAdminNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "border-cyan/40 bg-slate-surface text-cyan"
                : "border-slate-high/30 bg-slate-surface/40 text-dim hover:text-light"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
