/**
 * Shell v4 navigation — Product law + SHELL_CRAFT v4 / Ultra Premium reconcile.
 *
 * Primary rail (locked): Home · Money · Path · Compare
 * Secondary: Bills · Tools · Learn
 * System: Accounts · Settings
 * Mobile bottom: Home · Money · Path · More
 * Assess = top command only. No Support peer (no proven Support route).
 *
 * Compass is the shell mark only — never a page hero.
 * Wordmark locked hexes. No Lucide brand. No Homie. No `/dashboard`.
 */

export type V4NavItem = {
  href: string;
  label: string;
};

export const V4_SHELL_HOME_HREF = "/home" as const;
export const V4_SHELL_ASSESS_HREF = "/assessment" as const;
export const V4_SHELL_ASK_HREF = "/home" as const;
export const V4_SHELL_COMPASS_SIZE = 32 as const;
/** Ultra Premium rail — 216–228. */
export const V4_RAIL_WIDTH_PX = 222 as const;
/** Contextual right HōMI — 300–340. */
export const V4_HOMI_RAIL_WIDTH_PX = 320 as const;
/** Top command — 60–68. */
export const V4_COMMAND_HEIGHT_PX = 64 as const;

/** Product law primary order — do not paint Path before Money. */
export const V4_PRIMARY_NAV: readonly V4NavItem[] = [
  { href: "/home", label: "Home" },
  { href: "/money", label: "Money" },
  { href: "/path", label: "Path" },
  { href: "/scenarios", label: "Compare" },
] as const;

export const V4_SECONDARY_NAV: readonly V4NavItem[] = [
  { href: "/money/bills", label: "Bills" },
  { href: "/tools", label: "Tools" },
  { href: "/learn", label: "Learn" },
] as const;

export const V4_SYSTEM_NAV: readonly V4NavItem[] = [
  { href: "/connections", label: "Accounts" },
  { href: "/settings", label: "Settings" },
] as const;

export const V4_MOBILE_TABS: readonly V4NavItem[] = [
  { href: "/home", label: "Home" },
  { href: "/money", label: "Money" },
  { href: "/path", label: "Path" },
] as const;

export const V4_MORE_NAV: readonly V4NavItem[] = [
  { href: "/scenarios", label: "Compare" },
  ...V4_SECONDARY_NAV,
  ...V4_SYSTEM_NAV,
] as const;

export const V4_COMMAND_ITEMS: readonly V4NavItem[] = [
  ...V4_PRIMARY_NAV,
  ...V4_SECONDARY_NAV,
  ...V4_SYSTEM_NAV,
  { href: V4_SHELL_ASSESS_HREF, label: "Assess" },
] as const;

export const V4_KILLED_NAV_LABELS = ["Homie", "On track", "READY", "Support"] as const;

export function isV4NavActive(pathname: string, href: string): boolean {
  const p = pathname || "/";
  if (href === "/home") {
    return p === "/home" || p.startsWith("/home/");
  }
  if (href === "/money") {
    if (p === "/money/bills" || p.startsWith("/money/bills/")) return false;
    return p === "/money" || p.startsWith("/money/");
  }
  return p === href || p.startsWith(`${href}/`);
}

export function v4ShellShowsHomiRail(pathname: string): boolean {
  return pathname === "/home" || pathname.startsWith("/home/");
}
