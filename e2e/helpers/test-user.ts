import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { liveSupabaseEnv } from "./env";

/**
 * Test-user factory backed by the Supabase admin (service-role) API.
 *
 * `@supabase/supabase-js` is already a runtime dependency of the app, so the
 * suite adds no new packages for this. Every live spec creates its OWN unique
 * user (no shared fixtures, parallel-safe) and deletes it in a finally block.
 */

let cached: SupabaseClient | null = null;

export function serviceClient(): SupabaseClient {
  if (cached) return cached;
  const env = liveSupabaseEnv();
  if (!env) {
    throw new Error(
      "serviceClient() called without live Supabase env. Gate the spec with skipWithoutLiveSupabase() first.",
    );
  }
  cached = createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** Satisfies lib/auth/password: >= 8 chars, at least one letter and one digit. */
export function newTestPassword(): string {
  return `E2e-${randomUUID()}!1`;
}

export function newTestEmail(): string {
  return `homi-e2e-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;
}

/** Creates an already-confirmed user (skips the inbox, usable for sign-in specs). */
export async function createTestUser(): Promise<TestUser> {
  const email = newTestEmail();
  const password = newTestPassword();
  const { data, error } = await serviceClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Smoke" },
  });
  if (error || !data.user) {
    throw new Error(`createTestUser failed: ${error?.message ?? "no user returned"}`);
  }
  return { id: data.user.id, email, password };
}

/**
 * Best-effort cleanup — never throws. Removes the rows a spec typically
 * creates before deleting the auth user itself (FK cascades cover the rest).
 */
export async function deleteTestUser(userId: string): Promise<void> {
  try {
    await serviceClient().from("score_shares").delete().eq("created_by", userId);
  } catch {
    // best effort
  }
  try {
    await serviceClient().from("assessments").delete().eq("user_id", userId);
  } catch {
    // best effort
  }
  try {
    await serviceClient().auth.admin.deleteUser(userId);
  } catch {
    // best effort
  }
}

/**
 * Finds a user's id by email (used after a UI-driven signup, where we never
 * see the id). `admin.listUsers` has no email filter, so page through — fine
 * on a dedicated test project.
 */
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await serviceClient().auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Mint the exact link Supabase would email after a password signup, so the
 * "email confirm" step can be driven without an inbox.
 */
export async function generateSignupConfirmLink(
  email: string,
  password: string,
  redirectTo: string,
): Promise<string> {
  const { data, error } = await serviceClient().auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo },
  });
  if (error) throw new Error(`generateLink(signup) failed: ${error.message}`);
  const link = data?.properties?.action_link;
  if (!link) throw new Error("generateLink(signup) returned no action_link");
  return link;
}

/** Mint a password-recovery link, as the forgot-password email would contain. */
export async function generateRecoveryLink(email: string, redirectTo: string): Promise<string> {
  const { data, error } = await serviceClient().auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });
  if (error) throw new Error(`generateLink(recovery) failed: ${error.message}`);
  const link = data?.properties?.action_link;
  if (!link) throw new Error("generateLink(recovery) returned no action_link");
  return link;
}
