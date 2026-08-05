#!/usr/bin/env node
/**
 * Authenticated production smoke test.
 *
 * Requires SMOKE_EMAIL and SMOKE_PASSWORD env vars. Signs in via Supabase Auth,
 * then exercises authenticated routes on homitechnology.com.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const supabaseUrl = "https://giyycykxkzfbowiapxpd.supabase.co";
const siteUrl = "https://homitechnology.com";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvLocal();

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (env or .env.local)");
  process.exit(1);
}

if (!email || !password) {
  console.error("Set SMOKE_EMAIL and SMOKE_PASSWORD");
  process.exit(1);
}

function base64urlEncode(str) {
  return Buffer.from(str)
    .toString("base64url")
    .replace(/=+$/, "");
}

async function signIn() {
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`sign-in failed: ${data.error_description || data.error || res.statusText} (${res.status})`);
  }
  return data;
}

function makeCookie(session) {
  const name = "sb-giyycykxkzfbowiapxpd-auth-token";
  const value = JSON.stringify(session);
  return `${name}=${encodeURIComponent(value)}`;
}

async function fetchAuthed(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${siteUrl}${path}`;
  return fetch(url, {
    ...opts,
    headers: {
      cookie: authCookie,
      ...(opts.headers || {}),
    },
  });
}

async function fetchSupabaseRest(path) {
  const url = `${supabaseUrl}/rest/v1${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.pgrst.object+json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase REST ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => []);
}

let authCookie = "";
let accessToken = "";

async function main() {
  console.log("[smoke] signing in...");
  const session = await signIn();
  authCookie = makeCookie(session);
  accessToken = session.access_token;
  console.log(`[smoke] signed in as ${session.user.email} (${session.user.id})`);

  console.log("[smoke] GET /finance (authenticated)...");
  const financeRes = await fetchAuthed("/finance");
  console.log(`[smoke] /finance -> ${financeRes.status} ${financeRes.statusText}`);

  console.log("[smoke] GET /api/assessments...");
  const assessmentsRes = await fetchAuthed("/api/assessments");
  console.log(`[smoke] /api/assessments -> ${assessmentsRes.status}`);
  const assessmentsBody = await assessmentsRes.json().catch(() => ({}));
  const assessments = assessmentsBody.assessments || [];
  console.log(`[smoke] assessments count: ${assessments.length}`);

  if (assessments.length > 0) {
    // Clean up any pre-existing active shares so the create does not hit the
    // plan limit on a repeated smoke-test run.
    const existingShares = await fetchSupabaseRest(
      `/score_shares?select=id&created_by=eq.${session.user.id}&revoked_at=is.null&expires_at=gt.${new Date().toISOString()}`,
    );
    for (const s of Array.isArray(existingShares) ? existingShares : []) {
      console.log(`[smoke] DELETE /api/shares/${s.id} (pre-existing active share)...`);
      const cleanupRes = await fetchAuthed(`/api/shares/${s.id}`, { method: "DELETE" });
      console.log(`[smoke] cleanup share -> ${cleanupRes.status}`);
    }

    const assessmentId = assessments[0].id;
    console.log(`[smoke] POST /api/shares with assessmentId=${assessmentId}...`);
    const shareRes = await fetchAuthed("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId }),
    });
    console.log(`[smoke] /api/shares -> ${shareRes.status}`);
    const shareBody = await shareRes.json().catch(() => ({}));
    console.log(`[smoke] share url: ${shareBody.url || shareBody.error || "(none)"}`);

    if (shareRes.ok && shareBody.url) {
      console.log(`[smoke] GET ${shareBody.url} (anonymous)...`);
      const anonShareRes = await fetch(shareBody.url);
      console.log(`[smoke] share link -> ${anonShareRes.status}`);

      // Find the share id by token and revoke it.
      const token = shareBody.url.split("/share/").pop();
      const shares = await fetchSupabaseRest(
        `/score_shares?select=id,share_token&created_by=eq.${session.user.id}&share_token=eq.${token}`,
      );
      const shareRow = Array.isArray(shares) ? shares[0] : shares;
      if (shareRow?.id) {
        console.log(`[smoke] DELETE /api/shares/${shareRow.id} (revoke)...`);
        const revokeRes = await fetchAuthed(`/api/shares/${shareRow.id}`, {
          method: "DELETE",
        });
        console.log(`[smoke] revoke share -> ${revokeRes.status}`);
      }
    }
  }

  console.log("[smoke] POST /api/billing/portal...");
  const portalRes = await fetchAuthed("/api/billing/portal", { method: "POST" });
  console.log(`[smoke] /api/billing/portal -> ${portalRes.status}`);
  const portalBody = await portalRes.json().catch(() => ({}));
  console.log(`[smoke] portal configured: ${portalBody.configured}, url: ${portalBody.url || "n/a"}`);

  console.log("[smoke] POST /api/checkout (test mode)...");
  const checkoutRes = await fetchAuthed("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier: "plus" }),
  });
  console.log(`[smoke] /api/checkout -> ${checkoutRes.status}`);
  const checkoutBody = await checkoutRes.json().catch(() => ({}));
  console.log(`[smoke] checkout configured: ${checkoutBody.configured}, url: ${checkoutBody.url ? "(present)" : "n/a"}`);
  if (!checkoutRes.ok && checkoutBody.error) {
    console.log(`[smoke] checkout error: ${checkoutBody.error}`);
  }

  console.log("[smoke] POST /auth/v1/recover (password reset email)...");
  const recoverRes = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  console.log(`[smoke] /auth/v1/recover -> ${recoverRes.status}`);

  console.log("[smoke] done");
}

main().catch((err) => {
  console.error("[smoke] fatal:", err.message);
  process.exit(1);
});
