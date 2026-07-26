"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  activeDashboardHref,
  visibleDashboards,
  type SwitcherContext,
} from "@/lib/dashboard/switcher-visibility";

export type DashboardSwitcherProps = SwitcherContext;

/**
 * Workspace switcher — single compact control, not a multi-pill row.
 * Multi-role operators still reach every eligible home; the bar stays one line.
 */
export function DashboardSwitcher({
  role,
  employerId,
  organizationId,
  orgMember,
  userRole,
}: DashboardSwitcherProps & {
  /** @deprecated Prefer `role`. Kept for call-site compatibility. */
  userRole?: string;
}) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const visible = visibleDashboards({
    role: role ?? userRole,
    employerId,
    organizationId,
    orgMember,
  });

  const activeHref =
    visible.length > 0
      ? (activeDashboardHref(pathname, visible) ?? visible[0].href)
      : null;
  const activeDashboard =
    visible.length > 0
      ? (visible.find((d) => d.href === activeHref) ?? visible[0])
      : null;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (visible.length <= 1 || !activeDashboard || !activeHref) return null;

  return (
    <nav ref={rootRef} className="relative" aria-label="Dashboard switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="chrome-workspace-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Workspace: ${activeDashboard.label}`}
      >
        <span className="chrome-workspace-dot" aria-hidden />
        <span className="chrome-workspace-label">{activeDashboard.label}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M3 6l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Switch workspace"
            initial={reducedMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="chrome-workspace-menu"
          >
            <p className="chrome-workspace-menu-kicker">Workspace</p>
            {visible.map((dashboard) => {
              const isActive = dashboard.href === activeHref;
              return (
                <Link
                  key={dashboard.href}
                  href={dashboard.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`chrome-workspace-item ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span>{dashboard.label}</span>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path
                        d="M3.5 8.5l3 3 6-6.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
