/**
 * Shell v4 navigation — Product law + SHELL_CRAFT v4 / Ultra Premium reconcile.
 *
 * Primary rail (locked): Home · Money · Path · Compare
 * Secondary: Bills · Tools · Learn
 * System: Accounts · Settings
 * Mobile bottom: Home · Money · Path · More. Compare lives under More.
 * Assess = top command only. No Support peer (no proven Support route).
 *
 * Compass is the shell mark only — never a page hero.
 * Wordmark locked hexes. Lucide is nav marks only — never a second Compass.
 * No Homie. No `/dashboard`.
 */

export type V4NavItem = {
  href: string;
  label: string;
};

export const V4_SHELL_HOME_HREF = "/home" as const;
export const V4_SHELL_ASSESS_HREF = "/assessment" as const;
export const V4_SHELL_PATH_HREF = "/path" as const;
export const V4_SHELL_MONEY_HREF = "/money" as const;
export const V4_SHELL_COMPARE_HREF = "/scenarios" as const;
export const V4_SHELL_ASK_HREF = "/ask" as const;
export const V4_SHELL_COMPASS_SIZE = 32 as const;
/** Ultra Premium rail — 216–228. */
export const V4_RAIL_WIDTH_PX = 222 as const;
/** Contextual right HōMI — 300–340. */
export const V4_HOMI_RAIL_WIDTH_PX = 320 as const;
/** Top command — 60–68. */
export const V4_COMMAND_HEIGHT_PX = 64 as const;

/** Product law primary order — do not paint Path before Money. */
export const V4_PRIMARY_NAV: readonly V4NavItem[] = [
  { href: V4_SHELL_HOME_HREF, label: "Home" },
  { href: V4_SHELL_MONEY_HREF, label: "Money" },
  { href: V4_SHELL_PATH_HREF, label: "Path" },
  { href: V4_SHELL_COMPARE_HREF, label: "Compare" },
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
  { href: V4_SHELL_HOME_HREF, label: "Home" },
  { href: V4_SHELL_MONEY_HREF, label: "Money" },
  { href: V4_SHELL_PATH_HREF, label: "Path" },
] as const;

export const V4_MORE_NAV: readonly V4NavItem[] = [
  { href: V4_SHELL_COMPARE_HREF, label: "Compare" },
  { href: V4_SHELL_ASK_HREF, label: "Ask HōMI" },
  ...V4_SECONDARY_NAV,
  ...V4_SYSTEM_NAV,
] as const;

export const V4_COMMAND_ITEMS: readonly V4NavItem[] = [
  ...V4_PRIMARY_NAV,
  ...V4_SECONDARY_NAV,
  ...V4_SYSTEM_NAV,
  { href: V4_SHELL_ASSESS_HREF, label: "Assess" },
  { href: V4_SHELL_ASK_HREF, label: "Ask HōMI" },
] as const;

export const V4_KILLED_NAV_LABELS = ["Homie", "On track", "READY", "Support"] as const;

export const V4_SHELL_BILLS_HREF = "/money/bills" as const;
export const V4_SHELL_TOOLS_HREF = "/tools" as const;
export const V4_SHELL_LEARN_HREF = "/learn" as const;
export const V4_SHELL_ACCOUNTS_HREF = "/connections" as const;
export const V4_SHELL_SETTINGS_HREF = "/settings" as const;

export function isV4AskPath(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_ASK_HREF || p.startsWith(`${V4_SHELL_ASK_HREF}/`);
}

export function isV4BillsWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_BILLS_HREF || p.startsWith(`${V4_SHELL_BILLS_HREF}/`);
}

export function isV4ToolsHub(pathname: string): boolean {
  return (pathname || "/") === V4_SHELL_TOOLS_HREF;
}

export function isV4LearnWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_LEARN_HREF || p.startsWith(`${V4_SHELL_LEARN_HREF}/`);
}

export function isV4AccountsWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_ACCOUNTS_HREF || p.startsWith(`${V4_SHELL_ACCOUNTS_HREF}/`);
}

export function isV4SettingsWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_SETTINGS_HREF || p.startsWith(`${V4_SHELL_SETTINGS_HREF}/`);
}

/** Bills · Tools hub · Learn · Accounts · Settings — not nested calculators. */
export function isV4SystemSurfacePath(pathname: string): boolean {
  const p = pathname || "/";
  return (
    isV4BillsWorkspace(p) ||
    isV4ToolsHub(p) ||
    isV4LearnWorkspace(p) ||
    isV4AccountsWorkspace(p) ||
    isV4SettingsWorkspace(p)
  );
}

export function isV4NavActive(pathname: string, href: string): boolean {
  const p = pathname || "/";
  if (href === "/home") {
    return p === "/home" || p.startsWith("/home/") || isV4AskPath(p);
  }
  if (href === "/money") {
    if (p === "/money/bills" || p.startsWith("/money/bills/")) return false;
    return p === "/money" || p.startsWith("/money/");
  }
  return p === href || p.startsWith(`${href}/`);
}

export function isV4AssessPath(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_ASSESS_HREF || p.startsWith(`${V4_SHELL_ASSESS_HREF}/`);
}

export function isV4PathWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_PATH_HREF || p.startsWith(`${V4_SHELL_PATH_HREF}/`);
}

export function isV4MoneyWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  if (p === "/money/bills" || p.startsWith("/money/bills/")) return false;
  return p === V4_SHELL_MONEY_HREF || p.startsWith(`${V4_SHELL_MONEY_HREF}/`);
}

export function isV4CompareWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_COMPARE_HREF || p.startsWith(`${V4_SHELL_COMPARE_HREF}/`);
}

export function v4ShellShowsHomiRail(pathname: string): boolean {
  const p = pathname || "/";
  if (p === "/home" || p.startsWith("/home/")) return true;
  if (isV4AskPath(p)) return true;
  return isV4AssessPath(p);
}
