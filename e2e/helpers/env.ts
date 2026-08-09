import { test } from "@playwright/test";

/**
 * Environment contract for the E2E suite (see e2e/README.md for the full map).
 *
 * Anonymous/local specs need nothing beyond the dev server. Specs that touch a
 * real Supabase project or real Stripe test-mode keys must NEVER fail just
 * because secrets are absent (fork PRs get no secrets) — they call one of the
 * gate helpers below, which skips the test with an explicit reason instead.
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export interface LiveSupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

function supabaseUrl(): string {
  return process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

/** Present when a live Supabase test project + service-role key are configured. */
export function liveSupabaseEnv(): LiveSupabaseEnv | null {
  const url = supabaseUrl();
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

export function missingLiveSupabaseVars(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl()) missing.push("E2E_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) missing.push("E2E_SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

/** Skip the current test unless a live Supabase test project is configured. */
export function skipWithoutLiveSupabase(): void {
  const missing = missingLiveSupabaseVars();
  test.skip(
    missing.length > 0,
    `Needs a live Supabase test project — unset: ${missing.join(", ")}. See e2e/README.md.`,
  );
}

export interface LiveStripeEnv {
  secretKey: string;
  webhookSecret: string;
}

/**
 * Present only when Stripe TEST-mode credentials are configured. Live keys are
 * refused on purpose: this suite drives real checkouts and must never be able
 * to touch a live Stripe account.
 */
export function liveStripeEnv(): LiveStripeEnv | null {
  const secretKey = process.env.E2E_STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.E2E_STRIPE_WEBHOOK_SECRET ?? "";
  if (!secretKey.startsWith("sk_test_")) return null;
  if (!webhookSecret.startsWith("whsec_")) return null;
  return { secretKey, webhookSecret };
}

export function missingLiveStripeVars(): string[] {
  const missing: string[] = [];
  const secretKey = process.env.E2E_STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.E2E_STRIPE_WEBHOOK_SECRET ?? "";
  if (!secretKey) missing.push("E2E_STRIPE_SECRET_KEY");
  else if (!secretKey.startsWith("sk_test_"))
    missing.push("E2E_STRIPE_SECRET_KEY (must be sk_test_*)");
  if (!webhookSecret) missing.push("E2E_STRIPE_WEBHOOK_SECRET");
  else if (!webhookSecret.startsWith("whsec_"))
    missing.push("E2E_STRIPE_WEBHOOK_SECRET (must be whsec_*)");
  return missing;
}

/** Skip the current test unless Supabase + Stripe test-mode env are configured. */
export function skipWithoutLiveStripe(): void {
  const missing = [...missingLiveSupabaseVars(), ...missingLiveStripeVars()];
  test.skip(
    missing.length > 0,
    `Needs live Supabase + Stripe TEST-mode keys — unset: ${missing.join(", ")}. See e2e/README.md.`,
  );
}
