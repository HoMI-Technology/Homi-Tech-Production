"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart2,
  BookOpen,
  ClipboardCheck,
  Compass,
  Cpu,
  DollarSign,
  Home,
  LayoutGrid,
  Link2,
  MapPin,
  Menu,
  MessageCircle,
  Settings,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { isActivePath } from "@/components/layout/HeaderShell";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import type { NavLink } from "@/lib/layout/nav-catalog";
import type { SwitcherContext } from "@/lib/dashboard/switcher-visibility";

/**
 * Signed-in application shell — fixed left sidebar.
 *
 * Replaces the one-line AppHeader on authenticated product routes. Desktop
 * renders an icon rail that expands to labels at xl; below lg it collapses to
 * a top bar plus a drawer.
 *
 * Nav comes from lib/layout/app-nav (APP_PRIMARY_NAV / APP_MORE_NAV), which is
 * the flag-aware projection of NAV_CATALOG's `surfaces.header` field — the same
 * source AppHeader used, so the parity test in
 * __tests__/layout/nav-catalog-parity.test.ts keeps covering this surface.
 * Palette-only entries (settings, role dashboards, money modes) intentionally
 * stay out of the rail and remain reachable via ⌘K.
 */

const GROUPS: readonly { label: string; items: readonly NavLink[] }[] = [
  { label: "Navigate", items: APP_PRIMARY_NAV },
  { label: "More", items: APP_MORE_NAV },
];

/** href → glyph. Anything unmapped falls back to the neutral grid mark. */
const ICONS: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/agents": Cpu,
  "/assessment": ClipboardCheck,
  "/money": DollarSign,
  "/path": MapPin,
  "/results": BarChart2,
  "/household": Users,
  "/tools/preflight": Wrench,
  "/scenarios": LayoutGrid,
  "/plan": Compass,
  "/journal": BookOpen,
  "/advisor": MessageCircle,
  "/connections": Link2,
};

const FALLBACK_ICON: LucideIcon = LayoutGrid;

const PILL_SPRING = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.7 };

function NavItem({
  item,
  active,
  pillId,
  expanded,
}: {
  item: NavLink;
  active: boolean;
  /** layoutId for the shared active pill — unique per rendered nav list. */
  pillId: string;
  /** Rail below xl shows icons only; the drawer is always expanded. */
  expanded: boolean;
}) {
  const Icon = ICONS[item.href] ?? FALLBACK_ICON;
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "text-light" : "text-dim hover:bg-white/[0.04] hover:text-light"
      } ${expanded ? "" : "justify-center xl:justify-start"}`}
    >
      {active && (
        <>
          <motion.span
            layoutId={pillId}
            transition={PILL_SPRING}
            aria-hidden
            className="absolute inset-0 rounded-lg bg-white/[0.06]"
          />
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-cyan"
          />
        </>
      )}
      <Icon aria-hidden className="relative z-10 size-[18px] shrink-0" strokeWidth={1.75} />
      <span className={`relative z-10 truncate ${expanded ? "" : "max-xl:hidden"}`}>
        {item.label}
      </span>
    </Link>
  );
}

function SidebarNav({
  pathname,
  pillId,
  expanded,
}: {
  pathname: string;
  pillId: string;
  expanded: boolean;
}) {
  return (
    <nav aria-label="Primary" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className={`nav-section-label ${expanded ? "" : "max-xl:sr-only"}`}>{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                active={isActivePath(pathname, item.href)}
                pillId={pillId}
                expanded={expanded}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ email, expanded }: { email: string | null; expanded: boolean }) {
  return (
    <div className={`border-t border-white/5 px-3 py-3 ${expanded ? "" : "max-xl:hidden"}`}>
      {email && (
        <p className="truncate px-3 pb-2 text-2xs text-dim" title={email}>
          {email}
        </p>
      )}
      <Link
        href="/settings"
        className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-light"
      >
        <Settings aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className="truncate">Settings</span>
      </Link>
      {/* Sign-out lived in the AppHeader account menu; without it the signed-in
          shell would have no logout affordance at all. */}
      <form action="/auth/sign-out" method="post">
        <button
          type="submit"
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-light"
        >
          <X aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
          <span className="truncate">Sign out</span>
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

      {/* Desktop rail — icons at lg, labels at xl */}
      <aside className="fixed inset-y-0 left-0 z-[var(--z-nav)] hidden w-[72px] flex-col border-r border-white/5 bg-navy/60 backdrop-blur-xl lg:flex xl:w-[248px]">
        <div className="flex h-16 shrink-0 items-center justify-center px-3 xl:justify-start">
          <Link href="/dashboard" aria-label="HōMI dashboard" className="flex items-center">
            <Wordmark size="text-xl" />
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-label="Jump to…"
          title={`Jump to… (${shortcutLabel})`}
          className="mx-3 mb-1 flex min-h-11 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-dim transition-colors hover:border-cyan/35 hover:text-light max-xl:justify-center"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="shrink-0"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
          <span className="max-xl:hidden">Jump to…</span>
          <kbd className="ml-auto chrome-kbd max-xl:hidden">{shortcutLabel}</kbd>
        </button>
        <SidebarNav pathname={pathname} pillId="nav-pill" expanded={false} />
        <SidebarFooter email={email} expanded={false} />
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
              transition={{ duration: 0.18 }}
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
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
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
              <SidebarNav pathname={pathname} pillId="nav-pill-drawer" expanded />
              <SidebarFooter email={email} expanded />
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
