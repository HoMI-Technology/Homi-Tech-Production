#!/usr/bin/env node
/**
 * HōMI admin account provisioning
 * ===============================
 *
 * Idempotent: ensures the given email exists as a confirmed Supabase auth
 * user and that its profile carries `role = 'admin'` (which unlocks every
 * capability with no paywall — see lib/entitlements.ts getAdminEntitlements)
 * plus `subscription_tier = 'family'` so the currently-deployed build is
 * also fully unlocked while the entitlements bypass ships.
 *
 * When it has to create the auth user, the account gets a random throwaway
 * password (never printed); the script prints a one-time recovery link so
 * the owner sets their real password on first sign-in.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/create-admin.mjs [email]        # default: info@homitechnology.com
 *   (or: npm run create-admin)
 *
 * SERVICE ROLE ONLY — run from a trusted machine; never ship the key.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const DEFAULT_EMAIL = "info@homitechnology.com";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.argv[2] || process.env.ADMIN_EMAIL || DEFAULT_EMAIL).toLowerCase();

if (!url || !key) {
  console.error(
    "[create-admin] Missing env.\n" +
      "  Set both before running:\n" +
      "    NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co\n" +
      "    SUPABASE_SERVICE_ROLE_KEY=...   (Supabase dashboard → Settings → API)",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Does the account already exist? (profiles is provisioned from
//    auth.users by the on_auth_user_created trigger, so it is 1:1.)
const { data: existing, error: lookupError } = await supabase
  .from("profiles")
  .select("id, role, subscription_tier")
  .eq("email", email)
  .maybeSingle();

if (lookupError) {
  console.error("[create-admin] profile lookup failed:", lookupError.message);
  process.exit(1);
}

let userId = existing?.id ?? null;

// 2. Create the confirmed auth user if it doesn't exist yet.
if (!userId) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomBytes(24).toString("base64url"), // throwaway; reset via link below
    user_metadata: { full_name: "HōMI Admin" },
  });
  if (error) {
    console.error("[create-admin] auth user creation failed:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`[create-admin] created auth user ${userId} (${email})`);

  const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (linkError) {
    console.warn(
      "[create-admin] couldn't generate a recovery link:",
      linkError.message,
      '\n  Use "Forgot password" on the sign-in page to set a password.',
    );
  } else {
    console.log("\n  Set the account password with this one-time link:\n");
    console.log(`  ${link.properties.action_link}\n`);
  }
} else {
  console.log(
    `[create-admin] auth user already exists: ${userId}` +
      ` (role=${existing.role}, tier=${existing.subscription_tier})`,
  );
}

// 3. Promote: admin role (paywall bypass once deployed) + family tier
//    (fully unlocked on the currently-deployed entitlements as well).
const { error: promoteError } = await supabase
  .from("profiles")
  .update({ role: "admin", subscription_tier: "family" })
  .eq("id", userId);

if (promoteError) {
  console.error("[create-admin] promotion failed:", promoteError.message);
  process.exit(1);
}

console.log(`[create-admin] ${email} is an admin with all features unlocked.`);
