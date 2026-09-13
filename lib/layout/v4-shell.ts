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
export const V4_SHELL_EMPLOYEE_HREF = "/employee/dashboard" as const;
export const V4_SHELL_PARTNER_HREF = "/partner/dashboard" as const;
export const V4_SHELL_ADMIN_HREF = "/admin" as const;
export const V4_SHELL_TEAM_HREF = "/team" as const;

/** Employee operate jobs — same Shell v4, not a personal Home clone. Live route only. */
export const V4_EMPLOYEE_WORKSPACE_NAV: readonly V4NavItem[] = [
  { href: V4_SHELL_EMPLOYEE_HREF, label: "Home" },
] as const;

export const V4_EMPLOYEE_OPERATE_NAV: readonly V4NavItem[] = [
  { href: `${V4_SHELL_EMPLOYEE_HREF}#attention`, label: "Attention" },
  { href: `${V4_SHELL_EMPLOYEE_HREF}#privacy`, label: "Privacy" },
] as const;

export const V4_EMPLOYEE_MOBILE_TABS: readonly V4NavItem[] = [
  { href: V4_SHELL_EMPLOYEE_HREF, label: "Home" },
] as const;

/** Partner operate jobs — book growth, not a personal Home clone. Live route only. */
export const V4_PARTNER_WORKSPACE_NAV: readonly V4NavItem[] = [
  { href: V4_SHELL_PARTNER_HREF, label: "Home" },
] as const;

export const V4_PARTNER_OPERATE_NAV: readonly V4NavItem[] = [
  { href: `${V4_SHELL_PARTNER_HREF}#book`, label: "Book" },
  { href: `${V4_SHELL_PARTNER_HREF}#invite`, label: "Invite" },
] as const;

export const V4_PARTNER_MOBILE_TABS: readonly V4NavItem[] = [
  { href: V4_SHELL_PARTNER_HREF, label: "Home" },
] as const;

/** Admin ops console — existing rooms only. Not personal Home. */
export const V4_ADMIN_CONSOLE_NAV: readonly V4NavItem[] = [
  { href: V4_SHELL_ADMIN_HREF, label: "Home" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/assessments", label: "Assessments" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/marketing", label: "Marketing" },
] as const;

export const V4_ADMIN_ROOMS_NAV: readonly V4NavItem[] = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/attribution", label: "Attribution" },
  { href: "/admin/email", label: "Email" },
  { href: "/admin/ad-spend", label: "Ad spend" },
  { href: "/admin/waitlist", label: "Waitlist" },
] as const;

export const V4_ADMIN_MOBILE_TABS: readonly V4NavItem[] = [
  { href: V4_SHELL_ADMIN_HREF, label: "Home" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/marketing", label: "Marketing" },
] as const;

export const V4_ADMIN_MORE_NAV: readonly V4NavItem[] = [
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/assessments", label: "Assessments" },
  { href: "/admin/activity", label: "Activity" },
  ...V4_ADMIN_ROOMS_NAV,
] as const;

/** Team aggregate home — `/team` only. No rooms. Not personal Home. */
export const V4_TEAM_WORKSPACE_NAV: readonly V4NavItem[] = [
  { href: V4_SHELL_TEAM_HREF, label: "Home" },
] as const;

export const V4_TEAM_MOBILE_TABS: readonly V4NavItem[] = [
  { href: V4_SHELL_TEAM_HREF, label: "Home" },
] as const;

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

export function isV4EmployeeWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_EMPLOYEE_HREF || p.startsWith(`${V4_SHELL_EMPLOYEE_HREF}/`);
}

export function isV4PartnerWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_PARTNER_HREF || p.startsWith(`${V4_SHELL_PARTNER_HREF}/`);
}

export function isV4AdminWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_ADMIN_HREF || p.startsWith(`${V4_SHELL_ADMIN_HREF}/`);
}

export function isV4TeamWorkspace(pathname: string): boolean {
  const p = pathname || "/";
  return p === V4_SHELL_TEAM_HREF || p.startsWith(`${V4_SHELL_TEAM_HREF}/`);
}

export function isV4NavActive(pathname: string, href: string): boolean {
  const p = pathname || "/";
  const hrefPath = href.split("#")[0] || href;
  if (hrefPath === "/home") {
    if (
      isV4EmployeeWorkspace(p) ||
      isV4PartnerWorkspace(p) ||
      isV4AdminWorkspace(p) ||
      isV4TeamWorkspace(p)
    ) {
      return false;
    }
    return p === "/home" || p.startsWith("/home/") || isV4AskPath(p);
  }
  if (hrefPath === "/money") {
    if (p === "/money/bills" || p.startsWith("/money/bills/")) return false;
    return p === "/money" || p.startsWith("/money/");
  }
  if (hrefPath === V4_SHELL_EMPLOYEE_HREF) {
    if (href.includes("#")) return false;
    return isV4EmployeeWorkspace(p);
  }
  if (hrefPath === V4_SHELL_PARTNER_HREF) {
    if (href.includes("#")) return false;
    return isV4PartnerWorkspace(p);
  }
  if (hrefPath === V4_SHELL_ADMIN_HREF) {
    if (href.includes("#")) return false;
    return p === V4_SHELL_ADMIN_HREF;
  }
  if (hrefPath === V4_SHELL_TEAM_HREF) {
    if (href.includes("#")) return false;
    return isV4TeamWorkspace(p);
  }
  return p === hrefPath || p.startsWith(`${hrefPath}/`);
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

/** Mobile Ask sheet = prompts only (no Open HōMI / nav dump). */
export function isV4AskOnlyPath(pathname: string): boolean {
  return (
    isV4SystemSurfacePath(pathname) ||
    isV4EmployeeWorkspace(pathname) ||
    isV4PartnerWorkspace(pathname)
  );
}

/** Admin + Team command is quiet — no Ask field, no Assess, no Clarity. */
export function isV4QuietCommandPath(pathname: string): boolean {
  return isV4AdminWorkspace(pathname) || isV4TeamWorkspace(pathname);
}
