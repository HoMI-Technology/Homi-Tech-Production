import type { Profile } from "@/types/database";

/**
 * Partner dashboard gate — byte-equivalent of the inline page check.
 * TESTABILITY-EXTRACTION 2026-08-30: moved from app/(product)/partner/dashboard/page.tsx.
 */
export function canAccessPartnerDashboard(
  profile: Pick<Profile, "role"> | null,
): boolean {
  if (!profile) return false;
  return profile.role === "partner" || profile.role === "admin";
}
