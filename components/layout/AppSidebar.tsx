"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, Settings, X } from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import { isActivePath } from "@/components/layout/HeaderShell";
import { APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import type { NavLink } from "@/lib/layout/nav-catalog";
import type { SwitcherContext } from "@/lib/dashboard/switcher-visibility";
import { visibleDashboards } from "@/lib/dashboard/switcher-visibility";

/**
 * Signed-in application shell — fixed left sidebar.
 *
 * Primary rail is Home, Assess, Money, Path (Brand PASS first viewport).
 * Agents, Household, Connections, Journal, Score history, and Trust stay
 * in the command palette (More), not the primary rail. Score is stated
 * once on the Home fold — the footer does not restate it.
 */

function NavItem({
  item,
  active,
}: {
  item: NavLink;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      data-sidebar-primary=""
      className={`relative flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "text-cyan" : "text-dim hover:text-light"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-cyan"
        />
      )}
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
      <div className="flex flex-col gap-0.5">
        {APP_PRIMARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarFooter({
  email,
  expanded,
  roleContext,
  onOpenMore,
}: {
  email: string | null;
  expanded: boolean;
  roleContext: SwitcherContext;
  onOpenMore: () => void;
}) {
  const labelHidden = expanded ? "" : "max-xl:sr-only";
  const row = `flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-light ${
    expanded ? "min-h-11" : "min-h-10 max-xl:justify-center max-xl:px-2 xl:min-h-11"
  }`;
  const showSwitcher = visibleDashboards(roleContext).length > 1;

  return (
    <div className={`border-t border-white/5 px-3 py-2.5 ${expanded ? "" : "max-xl:px-2"}`}>
      {showSwitcher && (
        <div
          className={`mb-1.5 ${expanded ? "px-1" : "max-xl:flex max-xl:justify-center"}`}
          data-sidebar-workspace-switcher=""
        >
          <DashboardSwitcher
            role={roleContext.role}
            employerId={roleContext.employerId}
            organizationId={roleContext.organizationId}
          />
        </div>
      )}
      {email && (
        <p
          className={`truncate px-3 pb-1.5 text-2xs text-dim ${expanded ? "" : "max-xl:hidden"}`}
          title={email}
        >
          {email}
        </p>
      )}
      <button type="button" title="More" aria-label="More" onClick={onOpenMore} className={`w-full text-left ${row}`}>
        <span className={`truncate ${labelHidden}`}>More</span>
      </button>
      <Link href="/settings" title="Settings" className={row}>
        <Settings aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className={`truncate ${labelHidden}`}>Settings</span>
      </Link>
      <form action="/auth/sign-out" method="post">
        <button type="submit" title="Sign out" className={`w-full text-left ${row}`}>
          <X aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
          <span className={`truncate ${labelHidden}`}>Sign out</span>
        </button>
      </form>
    </div>
  );
}

export function AppSidebar({
  email,
  role,
  employerId,
  organizationId,
}: {
  email: string | null;
  /** Palette visibility context — same values AppHeader fed the palette. */
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("⌘K");
  const reduceMotion = useReducedMotion();

  const roleContext: SwitcherContext = { role, employerId, organizationId };

  useEffect(() => {
    if (!/Mac|iP(hone|ad|od)/.test(navigator.userAgent)) setShortcutLabel("Ctrl K");
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Lock vertical scroll only — overflow-x:hidden on body kills sticky.
    const prevOverflowY = document.body.style.overflowY;
    const prevOverflowX = document.body.style.overflowX;
    document.body.style.overflowY = "hidden";
    document.body.style.overflowX = "clip";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflowY = prevOverflowY;
      document.body.style.overflowX = prevOverflowX;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="fixed inset-x-0 top-0 z-[var(--z-nav)] flex h-14 items-center gap-3 border-b border-white/5 bg-navy/80 px-4 backdrop-blur-xl lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="app-sidebar-drawer"
          className="chrome-icon-btn !h-10 !min-w-10 !px-0"
        >
          <Menu aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
        <Link href="/dashboard" aria-label="HōMI dashboard" className="flex items-center">
          <Wordmark size="text-xl" />
        </Link>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Jump to…"
          title={`Jump to… (${shortcutLabel})`}
          className="chrome-icon-btn !h-10 !min-w-10 ml-auto !px-0"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Desktop rail — wordmark + four-item primary, matching Brand PASS. */}
      <aside className="fixed inset-y-0 left-0 z-[var(--z-nav)] hidden w-[248px] flex-col border-r border-white/5 bg-navy/60 backdrop-blur-xl lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/dashboard" aria-label="HōMI dashboard" className="flex items-center">
            <Wordmark size="text-xl" />
          </Link>
        </div>
        <SidebarNav pathname={pathname} />
        <SidebarFooter
          email={email}
          expanded
          roleContext={roleContext}
          onOpenMore={() => setPaletteOpen(true)}
        />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="sidebar-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => setOpen(false)}
              aria-hidden
              className="fixed inset-0 z-[var(--z-overlay)] bg-navy/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              key="sidebar-drawer"
              id="app-sidebar-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transform: "translateX(-100%)" }
              }
              animate={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 1, transform: "translateX(0%)" }
              }
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, transform: "translateX(-100%)" }
              }
              transition={
                reduceMotion
                  ? { duration: 0.16, ease: [0.23, 1, 0.32, 1] }
                  : { type: "spring", bounce: 0, duration: 0.4 }
              }
              className="fixed inset-y-0 left-0 z-[var(--z-overlay)] flex w-[248px] flex-col border-r border-white/10 bg-navy lg:hidden"
            >
              <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
                <Link href="/dashboard" aria-label="HōMI dashboard" className="flex items-center">
                  <Wordmark size="text-xl" />
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-lg p-2 text-dim transition-colors hover:bg-white/[0.04] hover:text-light"
                >
                  <X aria-hidden className="size-5" strokeWidth={1.75} />
                </button>
              </div>
              <SidebarNav pathname={pathname} />
              <SidebarFooter
                email={email}
                expanded
                roleContext={roleContext}
                onOpenMore={() => {
                  setOpen(false);
                  setPaletteOpen(true);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roleContext={roleContext}
      />
    </>
  );
}
