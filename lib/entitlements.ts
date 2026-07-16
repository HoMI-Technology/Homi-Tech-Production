/**
 * HōMI entitlements — the single source of truth for *what a tier can do*.
 *
 * Before this layer, `subscription_tier` was written by the Stripe webhook and
 * read only as a badge in two pages (AUDIT T0.2): it gated nothing, so paid
 * users got nothing and free users got everything. This module maps a tier to a
 * concrete capability set and is enforced **server-side** (API routes + server
 * components) — never trust the client to decide what it may access.
 *
 * Capability lines are drawn from the published tier features in
 * `lib/stripe/tiers.ts` (kept in sync deliberately):
 *   - "Decision Companion chat access"  → Plus+   (advisorAccess)
 *   - "Unlimited re-scoring"            → Plus+   (unlimitedRescoring)
 *   - detailed pillar breakdown / export → Plus+  (fullReport)
 *   - "Couples mode"                     → Pro+    (couplesMode)
 *   - "Advanced finance tools"           → Pro+    (advancedTools)
 *   - "Up to 5 linked household members" → Family  (familySeats)
 *   - Bank account sync via Plaid        → Plus+   (bankSync)
 *
 * Consumer-authorized share links are the product's growth wedge (the landing
 * page sells them), so basic sharing is intentionally available on every tier;
 * only the number of *simultaneously active* links scales with tier.
 */

import type { TierKey } from "@/lib/stripe/tiers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Every distinct account tier, including the implicit unpaid tier. */
export type EntitlementTier = "free" | TierKey;

export interface Entitlements {
  /** The resolved tier these capabilities were derived from. */
  tier: EntitlementTier;
  /** Access to the Decision Companion chat (advisor / twin / trinity). */
  advisorAccess: boolean;
  /** Per-user daily advisor message quota. 0 when advisorAccess is false. */
  advisorMessagesPerDay: number;
  /** Detailed pillar-breakdown report + credential export. */
  fullReport: boolean;
  /** Re-run the assessment as many times as desired. */
  unlimitedRescoring: boolean;
  /** Couples / shared-readiness mode. */
  couplesMode: boolean;
  /** Number of linked household members (self counts as 1). */
  familySeats: number;
  /** Maximum number of simultaneously active share links. */
  maxActiveShares: number;
  /**
   * Advanced finance tools (mortgage, debt payoff modeling) — the published
   * Pro feature. Capability flag only: it must NOT be used to gate the
   * public funnel tool pages, only Pro-exclusive advanced tooling surfaces.
   */
  advancedTools: boolean;
  /**
   * Bank account sync via Plaid (link, exchange, stored accounts). Plaid
   * connections carry a real per-item cost, so this stays a paid capability.
   */
  bankSync: boolean;
  /** Linked household members and shared family dashboard (Family tier). */
  householdMode: boolean;
}

/** Boolean capability keys — the ones a route can gate on directly. */
export type BooleanCapability = {
  [K in keyof Entitlements]: Entitlements[K] extends boolean ? K : never;
}[keyof Entitlements];

const ENTITLEMENTS: Record<EntitlementTier, Entitlements> = {
  free: {
    tier: "free",
    // The Companion is the engagement hook that drives assessment completion and
    // retention — so free tier gets a genuine daily taste, not a locked door.
    // The ceiling is a graceful upgrade nudge (enforced server-side via the daily
    // usage counter), never a hard paywall on the funnel's core surface.
    advisorAccess: true,
    advisorMessagesPerDay: 5,
    fullReport: false,
    unlimitedRescoring: false,
    couplesMode: false,
    familySeats: 1,
    maxActiveShares: 3,
    advancedTools: false,
    bankSync: false,
    householdMode: false,
  },
  plus: {
    tier: "plus",
    advisorAccess: true,
    advisorMessagesPerDay: 25,
    fullReport: true,
    unlimitedRescoring: true,
    couplesMode: false,
    familySeats: 1,
    maxActiveShares: 25,
    advancedTools: false,
    bankSync: true,
    householdMode: false,
  },
  pro: {
    tier: "pro",
    advisorAccess: true,
    advisorMessagesPerDay: 100,
    fullReport: true,
    unlimitedRescoring: true,
    couplesMode: true,
    familySeats: 1,
    maxActiveShares: 100,
    advancedTools: true,
    bankSync: true,
    householdMode: false,
  },
  family: {
    tier: "family",
    advisorAccess: true,
    advisorMessagesPerDay: 100,
    fullReport: true,
    unlimitedRescoring: true,
    couplesMode: true,
    familySeats: 5,
    maxActiveShares: 100,
    advancedTools: true,
    bankSync: true,
    householdMode: true,
  },
};

/**
 * Normalizes any stored `subscription_tier` value to a known tier. Unknown,
 * null, empty, or legacy values ("", "none", "basic", …) resolve to "free" —
 * fail closed, never accidentally grant paid capabilities.
 */
export function normalizeTier(tier: string | null | undefined): EntitlementTier {
  if (tier === "plus" || tier === "pro" || tier === "family") return tier;
  return "free";
}

/**
 * Maps a tier to its capability set. Pure and deterministic; safe to call in
 * both server routes and (read-only) client code for display. Enforcement,
 * however, must always happen server-side.
 */
export function getEntitlements(tier: string | null | undefined): Entitlements {
  return ENTITLEMENTS[normalizeTier(tier)];
}

/**
 * Internal/admin accounts (profiles.role = 'admin') bypass the paywall
 * entirely: every capability on, top-of-ladder limits, and an advisor quota
 * high enough to never bite in practice (kept finite so the atomic usage RPC
 * still bounds runaway LLM spend). `tier` still reflects the stored
 * subscription_tier so billing surfaces stay truthful about what is paid for.
 */
export function getAdminEntitlements(storedTier?: string | null): Entitlements {
  return {
    ...ENTITLEMENTS.family,
    tier: normalizeTier(storedTier),
    advisorMessagesPerDay: 1000,
  };
}

/** Result of a capability check — a discriminated union for ergonomic routing. */
export type CapabilityCheck =
  | { ok: true }
  | { ok: false; status: 401 | 402; error: string };

/**
 * Gate a request on a boolean capability. Returns a ready-to-serialize failure
 * with the correct HTTP status:
 *   - 401 when there is no authenticated user at all;
 *   - 402 (Payment Required) when the user is authenticated but their tier
 *     lacks the capability — i.e. an upgrade unlocks it.
 *
 * @example
 *   const gate = requireCapability(userId, entitlements, "advisorAccess");
 *   if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
 */
export function requireCapability(
  userId: string | null,
  entitlements: Entitlements,
  capability: BooleanCapability,
): CapabilityCheck {
  if (!userId) {
    return { ok: false, status: 401, error: "Sign in to continue." };
  }
  if (!entitlements[capability]) {
    return {
      ok: false,
      status: 402,
      error: "This feature is part of a HōMI plan. Upgrade to unlock it.",
    };
  }
  return { ok: true };
}

/**
 * Resolves the current request's user and their entitlements from a
 * request-scoped Supabase server client. Reads `profiles.subscription_tier`
 * and `profiles.role`; admins bypass the paywall (see getAdminEntitlements),
 * any missing profile / unknown tier falls back to the free capability set.
 *
 * Returns `userId: null` for anonymous requests (the caller decides whether
 * that is a 401 or an allowed anonymous path such as the public demo).
 */
export async function getUserEntitlements(
  supabase: SupabaseClient,
): Promise<{ userId: string | null; entitlements: Entitlements }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, entitlements: ENTITLEMENTS.free };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, role")
    .eq("id", user.id)
    .maybeSingle();

  const storedTier = profile?.subscription_tier as string | null | undefined;

  return {
    userId: user.id,
    entitlements:
      profile?.role === "admin" ? getAdminEntitlements(storedTier) : getEntitlements(storedTier),
  };
}
