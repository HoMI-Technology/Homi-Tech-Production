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
 *   - "Full AI Companion conversations" → Plus+   (advisorRealModel; free tier
 *     gets the deterministic rule-based Companion only)
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
  /**
   * Whether the Companion is served by the real Anthropic model. Free tier gets
   * the deterministic rule-based fallback only ($0 AI cost); paid tiers spend on
   * the cheap model. This is the cost-safety switch — never grant it to free.
   */
  advisorRealModel: boolean;
  /** Per-user daily advisor message quota. 0 when advisorAccess is false. */
  advisorMessagesPerDay: number;
  /**
   * Per-user MONTHLY advisor message ceiling. Daily quotas alone leave the
   * monthly LLM-spend tail uncapped (a Plus user at the daily cap every day
   * costs a multiple of the tier price); this bounds it. Set comfortably above
   * daily × typical-active-days so it only ever catches pathological use.
   */
  advisorMessagesPerMonth: number;
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
   * Saved tool scenarios (Decision Lab Phase 4). Free gets one — enough to
   * name a future, not enough to compare two. Comparison needs ≥2 scenarios,
   * so the cap itself is the honest gate on the comparison view.
   */
  maxScenarios: number;
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
    advisorRealModel: false,
    advisorMessagesPerDay: 5,
    advisorMessagesPerMonth: 60,
    fullReport: false,
    unlimitedRescoring: false,
    couplesMode: false,
    familySeats: 1,
    maxActiveShares: 3,
    maxScenarios: 1,
    advancedTools: false,
    bankSync: false,
    householdMode: false,
  },
  plus: {
    tier: "plus",
    advisorAccess: true,
    advisorRealModel: true,
    advisorMessagesPerDay: 25,
    advisorMessagesPerMonth: 300,
    fullReport: true,
    unlimitedRescoring: true,
    couplesMode: false,
    familySeats: 1,
    maxActiveShares: 25,
    maxScenarios: 25,
    advancedTools: false,
    bankSync: true,
    householdMode: false,
  },
  pro: {
    tier: "pro",
    advisorAccess: true,
    advisorRealModel: true,
    advisorMessagesPerDay: 100,
    advisorMessagesPerMonth: 1200,
    fullReport: true,
    unlimitedRescoring: true,
    couplesMode: true,
    familySeats: 1,
    maxActiveShares: 100,
    maxScenarios: 100,
    advancedTools: true,
    bankSync: true,
    householdMode: false,
  },
  family: {
    tier: "family",
    advisorAccess: true,
    advisorRealModel: true,
    // Per-member; matches Pro (family is "everything in Pro" for up to 5).
    // Household aggregate can reach familySeats × this at full tilt — the
    // Anthropic prepaid cap is the real cost backstop, and a shared household
    // pool is the proper optimization (tracked for later).
    advisorMessagesPerDay: 100,
    advisorMessagesPerMonth: 1200,
    fullReport: true,
    unlimitedRescoring: true,
    couplesMode: true,
    familySeats: 5,
    maxActiveShares: 100,
    maxScenarios: 100,
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
    // Must be raised alongside the daily cap. Inheriting family's 1200/month against
    // 1000/day made the monthly ceiling bind on day two — the opposite of "never bite
    // in practice" above, and with tier reading `family` the operator got no upgrade
    // path either. 30x the daily cap keeps it finite (spend still bounded) and out of
    // the way. Locked by __tests__/advisor-quota.test.ts.
    advisorMessagesPerMonth: 30_000,
  };
}

/** Result of a capability check — a discriminated union for ergonomic routing. */
export type CapabilityCheck = { ok: true } | { ok: false; status: 401 | 402; error: string };

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
