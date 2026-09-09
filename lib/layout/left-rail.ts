/**
 * PR13 left-rail destinations — Product map invent chrome.
 * Finances is the one money peer. Live URLs when they exist; honest empty shells otherwise.
 */

export type LeftRailItem = {
  href: string;
  label: string;
};

/**
 * PRIMARY Product map:
 * Home · Assessment · Finances · Plans · Compare · Bills · Insights · Learn · Companion · Tools.
 */
export const LEFT_RAIL_PRIMARY: readonly LeftRailItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/assessment", label: "Assessment" },
  { href: "/money", label: "Finances" },
  { href: "/path", label: "Plans" },
  { href: "/scenarios", label: "Compare" },
  { href: "/money/bills", label: "Bills" },
  { href: "/timeline", label: "Insights" },
  { href: "/learn", label: "Learn" },
  { href: "/advisor", label: "Companion" },
  { href: "/tools", label: "Tools" },
] as const;

/** SECONDARY: Accounts · Settings · Support. */
export const LEFT_RAIL_SECONDARY: readonly LeftRailItem[] = [
  { href: "/connections", label: "Accounts" },
  { href: "/settings", label: "Settings" },
  { href: "/trust", label: "Support" },
] as const;

/**
 * Dual-home labels that must never appear as rail peers next to the Product map.
 * Homie is companion LOOK, not a rail row.
 */
export const LEFT_RAIL_KILLED_LABELS = [
  "Assess",
  "Money",
  "Plan",
  "Homie",
] as const;

export const LEFT_RAIL_WIDTH_PX = 256 as const;

/** Employee / partner / admin / team trees keep the quiet v3 bar, not this rail. */
export function isRoleOperateRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /^(?:\/employee|\/partner|\/admin|\/team)(?:\/|$)/.test(pathname);
}

export function isLeftRailActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
  if (href === "/money") {
    if (pathname === "/money/bills" || pathname.startsWith("/money/bills/")) {
      return false;
    }
    return pathname === "/money" || pathname.startsWith("/money/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function personRailIdentity(
  fullName: string | null | undefined,
  email: string | null | undefined,
): { display: string; initials: string } {
  const trimmed = fullName?.trim() ?? "";
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0] ?? trimmed;
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    const lastInitial = last ? `${last.charAt(0).toUpperCase()}.` : "";
    const display = lastInitial ? `${first} ${lastInitial}` : first;
    const initials = `${first.charAt(0)}${last ? last.charAt(0) : ""}`.toUpperCase();
    return { display, initials };
  }
  const local = email?.split("@")[0]?.trim() || "You";
  return {
    display: local,
    initials: local.slice(0, 2).toUpperCase(),
  };
}

export function firstNameFromProfile(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const trimmed = fullName?.trim() ?? "";
  if (trimmed) return trimmed.split(/\s+/).filter(Boolean)[0] ?? null;
  const local = email?.split("@")[0]?.trim();
  return local || null;
}
