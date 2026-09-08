/**
 * PR10 left-rail destinations — product-brief law for personal signed-in chrome.
 * Live Production URLs only. HEADER_PRIMARY_NAV stays the quiet role-tree bar.
 */

export type LeftRailItem = {
  href: string;
  label: string;
};

/** PRIMARY: Home · Assess · Plan · Money · Compare · Tools · Companion. */
export const LEFT_RAIL_PRIMARY: readonly LeftRailItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/assessment", label: "Assess" },
  { href: "/path", label: "Plan" },
  { href: "/money", label: "Money" },
  { href: "/scenarios", label: "Compare" },
  { href: "/tools", label: "Tools" },
  { href: "/advisor", label: "Companion" },
] as const;

/** SECONDARY: Accounts · Settings · Support. Learn omitted (no live /learn). */
export const LEFT_RAIL_SECONDARY: readonly LeftRailItem[] = [
  { href: "/connections", label: "Accounts" },
  { href: "/settings", label: "Settings" },
  { href: "/trust", label: "Support" },
] as const;

/** Labels that must never appear as rail peers. */
export const LEFT_RAIL_KILLED_LABELS = [
  "Learn",
  "Bills",
  "Insights",
  "Finances",
  "Plans",
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
