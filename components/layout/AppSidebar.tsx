"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
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
  Route,
  Scale,
  Settings,
  Target,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Wordmark";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { DashboardSwitcher } from "@/components/layout/DashboardSwitcher";
import {
  SidebarDecisionState,
  SidebarPulseStrip,
  footerChipModel,
  useLatestVerdict,
  useVerdictAccent,
  type LatestVerdict,
} from "@/components/layout/SidebarDecisionState";
import { isActivePath } from "@/components/layout/HeaderShell";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import type { NavLink } from "@/lib/layout/nav-catalog";
import type { SwitcherContext } from "@/lib/dashboard/switcher-visibility";
import { visibleDashboards } from "@/lib/dashboard/switcher-visibility";
import { MONEY_MODES } from "@/components/money/MoneyModeNav";

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
 * Palette-only entries (settings, money modes) intentionally stay out of
 * the rail and remain reachable via ⌘K. Multi-role workspace homes are
 * reachable from the sidebar footer switcher when more than one dashboard
 * is visible.
 *
 * The rail leads with the five product modes — Readiness · Reality · Decide ·
 * Plan · Goals — which are the primary product map on desktop exactly as
 * ProductBottomNav is on mobile. Both surfaces read MONEY_MODES, so the labels
 * and routes can never fork. Everything else follows underneath.
 *
 * There is deliberately no "Money" parent: Money is not a place you open
 * before you can work, it IS the four non-Readiness modes. /money is the
 * Reality mode entry.
 */

/**
 * The five modes, in canonical order, sourced from MONEY_MODES so this file
 * cannot fork the labels the bottom bar renders.
 */
const MODE_HREFS: readonly string[] = MONEY_MODES.map((m) => m.href);

/** href → the exact mode label, for the five product modes. */
const MODE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  MONEY_MODES.map((m) => [m.href, m.label]),
);

/** href → the mode blurb, surfaced as the rail item's tooltip. */
const MODE_BLURBS: Readonly<Record<string, string>> = Object.fromEntries(
  MONEY_MODES.map((m) => [m.href, m.blurb]),
);

/**
 * Grouping. Hrefs, not entries — flag-gating still comes from the catalog so
 * this list can never fork the entry set that parity covers.
 */
const JOURNEY_ORDER: readonly { label: string; hrefs: readonly string[] }[] = [
  // The product itself. Five modes, at the top, always.
  { label: "Product", hrefs: MODE_HREFS },
  // Measuring and re-measuring.
  { label: "Measure", hrefs: ["/assessment", "/path"] },
  { label: "Understand", hrefs: ["/scenarios", "/tools/preflight"] },
  { label: "Act", hrefs: ["/agents", "/household", "/connections"] },
  { label: "Reflect", hrefs: ["/journal"] },
];

/**
 * Project the flag-filtered header set onto the journey order. Anything the
 * catalog adds later that JOURNEY_ORDER does not name still renders, under a
 * trailing "More" group — regrouping must never silently drop a destination.
 */
function buildGroups(
  source: readonly NavLink[],
): readonly { label: string; items: readonly NavLink[] }[] {
  const remaining = new Map(source.map((item) => [item.href, item]));
  const groups: { label: string; items: NavLink[] }[] = [];

  for (const { label, hrefs } of JOURNEY_ORDER) {
    const items: NavLink[] = [];
    for (const href of hrefs) {
      const item = remaining.get(href);
      if (!item) continue;
      items.push(item);
      remaining.delete(href);
    }
    if (items.length > 0) groups.push({ label, items });
  }
  if (remaining.size > 0) groups.push({ label: "More", items: [...remaining.values()] });

  return groups;
}

const GROUPS = buildGroups([...APP_PRIMARY_NAV, ...APP_MORE_NAV]);

/** href → glyph. Anything unmapped falls back to the neutral grid mark. */
const ICONS: Record<string, LucideIcon> = {
  "/dashboard": Home,
  "/agents": Cpu,
  "/assessment": ClipboardCheck,
  "/money": DollarSign,
  "/path": MapPin,
  "/household": Users,
  "/tools/preflight": Wrench,
  "/scenarios": LayoutGrid,
  "/plan": Compass,
  "/money/decide": Scale,
  "/money/plan": Route,
  "/money/goals": Target,
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
  // The five product modes render their canonical label and blurb from
  // MONEY_MODES so the rail and the mobile bar always say the same thing.
  const label = MODE_LABELS[item.href] ?? item.label;
  const tooltip = MODE_BLURBS[item.href] ?? item.label;
  return (
    <Link
      href={item.href}
      title={tooltip}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "text-light" : "text-dim hover:bg-white/[0.04] hover:text-light"
      } ${expanded ? "" : "justify-center xl:justify-start"}`}
    >
      {active && (
        <>
          {/* Active fill + edge pill key to the current verdict — see
              useVerdictAccent; :root in globals.css holds the cyan default. */}
          <motion.span
            layoutId={pillId}
            transition={PILL_SPRING}
            aria-hidden
            className="absolute inset-0 rounded-lg"
            style={{ background: "var(--sidebar-verdict-tint)" }}
          />
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
            style={{ background: "var(--sidebar-verdict-color)" }}
          />
        </>
      )}
      <Icon aria-hidden className="relative z-10 size-[18px] shrink-0" strokeWidth={1.75} />
      <span className={`relative z-10 truncate ${expanded ? "" : "max-xl:hidden"}`}>
        {label}
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

/**
 * Bottom-of-rail readiness chip — the last thing the eye lands on before it
 * leaves the sidebar. It restates the header block's verdict + score at the
 * point of exit and links straight back to /dashboard (or to /assessment when
 * there is no score yet) so the living Build — not the reveal — is the default.
 * nothing is cached).
 *
 * Collapsed to the 72px rail it degrades to the centered number alone; the link
 * carries an explicit aria-label so the verdict is still announced when the
 * label is not painted.
 */
function SidebarScoreChip({ state, expanded }: { state: LatestVerdict | null; expanded: boolean }) {
  const chip = footerChipModel(state);
  const color = chip.color ?? undefined;

  return (
    <Link
      href={chip.href}
      aria-label={chip.ariaLabel}
      className={`sidebar-footer-chip ${expanded ? "sidebar-footer-chip--expanded" : ""}`}
    >
      <span aria-hidden className="num sidebar-footer-score" style={{ color }}>
        {chip.score}
      </span>
      <span aria-hidden className={`sidebar-footer-text ${expanded ? "" : "max-xl:hidden"}`}>
        <span className="sidebar-footer-label" style={{ color }}>
          {chip.label}
        </span>
        {chip.meta && <span className="sidebar-footer-meta">{chip.meta}</span>}
      </span>
    </Link>
  );
}

function SidebarFooter({
  email,
  decisionState,
  expanded,
  roleContext,
}: {
  email: string | null;
  decisionState: LatestVerdict | null;
  expanded: boolean;
  roleContext: SwitcherContext;
}) {
  // Labels go screen-reader-only (not display:none) on the rail so the icon
  // rows keep an accessible name without a title-attribute fallback.
  const labelHidden = expanded ? "" : "max-xl:sr-only";
  const row = `flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-dim transition-colors hover:bg-white/[0.04] hover:text-light ${
    expanded ? "min-h-11" : "min-h-10 max-xl:justify-center max-xl:px-2 xl:min-h-11"
  }`;
  const showSwitcher = visibleDashboards(roleContext).length > 1;

  return (
    <div className={`border-t border-white/5 px-3 py-2.5 ${expanded ? "" : "max-xl:px-2"}`}>
      <SidebarScoreChip state={decisionState} expanded={expanded} />
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
      <Link href="/settings" title="Settings" className={row}>
        <Settings aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className={`truncate ${labelHidden}`}>Settings</span>
      </Link>
      {/* Sign-out lived in the AppHeader account menu; without it the signed-in
          shell would have no logout affordance at all. */}
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

  // One read, one accent publication — the rail and drawer share the result.
  const decisionState: LatestVerdict | null = useLatestVerdict();
  useVerdictAccent(decisionState);

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
        <div className="flex h-16 shrink-0 items-center justify-center px-2 xl:justify-start xl:px-3">
          <Link href="/dashboard" aria-label="HōMI dashboard" className="flex items-center">
            {/* Collapsed lg rail is 72px — scale the mark so letter color still reads. */}
            <Wordmark size="text-base xl:text-xl" />
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
        <SidebarDecisionState state={decisionState} expanded={false} />
        <SidebarNav pathname={pathname} pillId="nav-pill" expanded={false} />
        <SidebarPulseStrip state={decisionState} expanded={false} />
        <SidebarFooter
          email={email}
          decisionState={decisionState}
          expanded={false}
          roleContext={roleContext}
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
              <SidebarDecisionState state={decisionState} expanded />
              <SidebarNav pathname={pathname} pillId="nav-pill-drawer" expanded />
              <SidebarPulseStrip state={decisionState} expanded />
              <SidebarFooter
                email={email}
                decisionState={decisionState}
                expanded
                roleContext={roleContext}
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
