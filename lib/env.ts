/**
 * Typed environment access.
 *
 * Required client-safe vars (NEXT_PUBLIC_*) are validated lazily — the
 * getter throws a helpful error the first time it is *used*, not at
 * import time, so modules that merely import `env` don't crash builds
 * or edge bundles that never touch the missing value.
 *
 * Optional vars (Anthropic, Stripe) are exposed as possibly-undefined
 * strings plus hasAnthropic()/hasStripe() helpers so callers can branch
 * cleanly instead of sprinkling `if (!process.env.X)` everywhere.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[HōMI env] Missing required environment variable "${name}". ` +
        `Set it in your .env.local (or hosting provider's env config) before using this feature.`,
    );
  }
  return value;
}

export const env = {
  // --- Supabase (required, client-safe) ---
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },

  // --- Site ---
  get NEXT_PUBLIC_SITE_URL(): string {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "https://homitechnology.com";
  },

  // --- Supabase (server-only, optional) ---
  get SUPABASE_SERVICE_ROLE_KEY(): string | undefined {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },

  // --- Admin console hardening (server-only, optional) ---
  /**
   * Comma/space-separated allowlist of admin emails. When set, a profile row
   * with role='admin' is refused console access unless its email is listed —
   * defense-in-depth so a forged/compromised row alone can't mint admin.
   * Unset = allowlist disabled (role-only gating, the historical behaviour).
   */
  get ADMIN_EMAILS(): string | undefined {
    return process.env.ADMIN_EMAILS;
  },
  /**
   * When "1", admins must hold an AAL2 (verified TOTP) session to reach the
   * console; those without an enrolled factor are sent to enroll. Default off.
   */
  get ADMIN_REQUIRE_MFA(): boolean {
    return process.env.ADMIN_REQUIRE_MFA === "1";
  },

  // --- Anthropic (optional) ---
  get ANTHROPIC_API_KEY(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  },

  // --- PostHog (optional; capture + owner dashboard query API) ---
  get NEXT_PUBLIC_POSTHOG_KEY(): string | undefined {
    return process.env.NEXT_PUBLIC_POSTHOG_KEY;
  },
  get NEXT_PUBLIC_POSTHOG_HOST(): string | undefined {
    const raw = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!raw?.trim()) return undefined;
    // Strip pasted inline comments (e.g. "https://… # Or https://eu…").
    const cleaned = raw.split("#", 1)[0]?.trim();
    return cleaned || undefined;
  },
  get POSTHOG_PERSONAL_API_KEY(): string | undefined {
    return process.env.POSTHOG_PERSONAL_API_KEY;
  },
  get POSTHOG_PROJECT_ID(): string | undefined {
    return process.env.POSTHOG_PROJECT_ID;
  },

  // --- Stripe (optional) ---
  get STRIPE_SECRET_KEY(): string | undefined {
    return process.env.STRIPE_SECRET_KEY;
  },
  get STRIPE_WEBHOOK_SECRET(): string | undefined {
    return process.env.STRIPE_WEBHOOK_SECRET;
  },
  get STRIPE_PRICE_PLUS(): string | undefined {
    return process.env.STRIPE_PRICE_PLUS;
  },
  get STRIPE_PRICE_PRO(): string | undefined {
    return process.env.STRIPE_PRICE_PRO;
  },
  get STRIPE_PRICE_FAMILY(): string | undefined {
    return process.env.STRIPE_PRICE_FAMILY;
  },
};

/** True when an Anthropic API key is configured. */
export function hasAnthropic(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** True when Stripe secret key is configured (checkout/webhooks can run). */
export function hasStripe(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** True when PostHog capture is configured (snippet + server capture run). */
export function hasPostHog(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

/**
 * True when the owner analytics dashboard can query PostHog: capture key
 * present (so events flow in) plus a personal API key (so HogQL query API
 * calls authenticate). The project id is auto-detected when unset.
 */
export function hasPostHogAnalytics(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.POSTHOG_PERSONAL_API_KEY);
}
