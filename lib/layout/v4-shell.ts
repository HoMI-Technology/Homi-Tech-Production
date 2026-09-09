/**
 * Shell v4 navigation — Product law + SHELL_CRAFT v4 / Ultra Premium reconcile.
 *
 * Primary rail (locked): Home · Money · Path · Compare
 * Secondary (craft): Tools · Settings · Support
 * Mobile bottom: Home · Money · Path · More
 *
 * Compass is the shell mark only — never a page hero.
 * Wordmark locked hexes. No Lucide brand. No Homie. No `/dashboard`.
 */

export type V4NavItem = {
  href: string;
  label: string;
};

export const V4_SHELL_HOME_HREF = "/home" as const;
export const V4_SHELL_COMPASS_SIZE = 32 as const;
export const V4_RAIL_WIDTH_PX = 240 as const;

/** Product law primary order — do not paint Path before Money. */
export const V4_PRIMARY_NAV: readonly V4NavItem[] = [
  { href: "/home", label: "Home" },
  { href: "/money", label: "Money" },
  { href: "/path", label: "Path" },
  { href: "/scenarios", label: "Compare" },
] as const;

export const V4_SECONDARY_NAV: readonly V4NavItem[] = [
  { href: "/tools", label: "Tools" },
  { href: "/settings", label: "Settings" },
  { href: "/trust", label: "Support" },
] as const;

export const V4_MOBILE_TABS: readonly V4NavItem[] = [
  { href: "/home", label: "Home" },
  { href: "/money", label: "Money" },
  { href: "/path", label: "Path" },
] as const;

export const V4_MORE_NAV: readonly V4NavItem[] = [
  { href: "/scenarios", label: "Compare" },
  { href: "/tools", label: "Tools" },
  { href: "/settings", label: "Settings" },
  { href: "/trust", label: "Support" },
  { href: "/connections", label: "Accounts" },
  { href: "/assessment", label: "Assess" },
] as const;

export const V4_COMMAND_ITEMS: readonly V4NavItem[] = [
  ...V4_PRIMARY_NAV,
  ...V4_SECONDARY_NAV,
  { href: "/connections", label: "Connect accounts" },
  { href: "/assessment", label: "Assess" },
] as const;

export const V4_KILLED_NAV_LABELS = ["Homie", "On track", "READY", "Assess"] as const;

export function isV4NavActive(pathname: string, href: string): boolean {
  if (href === "/home") {
    return pathname === "/home" || pathname.startsWith("/home/");
  }
  if (href === "/money") {
    return pathname === "/money" || pathname.startsWith("/money/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function v4ShellShowsHomiRail(pathname: string): boolean {
  return pathname === "/home" || pathname.startsWith("/home/");
}
