import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Guard for migration 20260804000002_profiles_privilege_guard (originally
 * 00020a, renumbered to a timestamp so the Supabase CLI reconciles it). The
 * real behavioural oracle is the opt-in live-DB suite in
 * __tests__/acceptance/rls.integration.test.ts; this CI-runnable test pins
 * the migration's invariants so an edit can't silently drop a privileged
 * column from the guard or detach the trigger.
 */
const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260804000002_profiles_privilege_guard.sql"),
  "utf8",
);

describe("20260804000002_profiles_privilege_guard.sql", () => {
  it("guards every privileged column", () => {
    for (const col of ["role", "subscription_tier", "subscription_status", "stripe_customer_id"]) {
      expect(sql).toMatch(new RegExp(`new\\.${col} is distinct from old\\.${col}`));
    }
  });

  it("installs a BEFORE UPDATE trigger on profiles", () => {
    expect(sql).toMatch(/create trigger profiles_privilege_guard\s+before update on profiles/);
    expect(sql).toMatch(/drop trigger if exists profiles_privilege_guard/);
  });

  it("allows the service role (Stripe webhook / ops scripts) and admins through", () => {
    expect(sql).toContain("'service_role'");
    expect(sql).toContain("is_admin()");
  });

  it("keeps the pinned search_path on the SECURITY DEFINER function", () => {
    expect(sql).toMatch(/security definer\s+set search_path = public/);
  });

  it("rejects with insufficient_privilege so PostgREST surfaces a clean 403-class error", () => {
    expect(sql).toContain("42501");
  });
});
