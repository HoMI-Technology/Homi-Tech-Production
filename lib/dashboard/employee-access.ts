/**
 * Shared employee-hub access predicate.
 * Dashboard and portal must agree so CTAs cannot AccessPanel-loop.
 * Admits employer-linked profiles even when role is still "user".
 */
export function canAccessEmployeeHub(profile: {
  role?: string | null;
  employer_id?: string | null;
} | null): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.employer_id) ||
    profile.role === "employee" ||
    profile.role === "admin"
  );
}
