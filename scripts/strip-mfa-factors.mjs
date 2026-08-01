/**
 * One-shot: remove all MFA factors for all users (service role).
 * Usage: node scripts/strip-mfa-factors.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

console.log("host", new URL(url).host);
console.log("service_role_len", key.length);

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Direct REST fallback for factor delete
async function adminFetch(path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

const listRes = await adminFetch("/auth/v1/admin/users?page=1&per_page=200");
if (!listRes.ok) {
  console.error("listUsers REST failed", listRes.status, listRes.body);
  // try js client
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.error("listUsers client failed", error);
    process.exit(1);
  }
  await processUsers(data.users);
} else {
  const users = listRes.body?.users || listRes.body || [];
  await processUsers(users);
}

async function processUsers(users) {
  let removed = 0;
  let usersWithFactors = 0;
  const failures = [];

  for (const u of users) {
    // Prefer factors on user object from admin list
    let factors = Array.isArray(u.factors) ? u.factors : [];

    if (!factors.length) {
      const facRes = await adminFetch(`/auth/v1/admin/users/${u.id}/factors`);
      if (facRes.ok) {
        if (Array.isArray(facRes.body)) factors = facRes.body;
        else if (Array.isArray(facRes.body?.factors)) factors = facRes.body.factors;
      }
    }

    if (!factors.length) continue;
    usersWithFactors += 1;
    console.log(`user ${u.email || u.id}: ${factors.length} factor(s)`);

    for (const f of factors) {
      const id = f.id;
      if (!id) continue;

      // Try client API first
      let ok = false;
      if (admin.auth.admin.mfa?.deleteFactor) {
        const del = await admin.auth.admin.mfa.deleteFactor({ id, userId: u.id });
        if (!del.error) {
          ok = true;
        } else {
          console.log(`  client delete: ${del.error.message}`);
        }
      }

      if (!ok) {
        const delRes = await adminFetch(`/auth/v1/admin/users/${u.id}/factors/${id}`, {
          method: "DELETE",
        });
        if (delRes.ok) {
          ok = true;
        } else {
          console.log(`  REST delete FAIL ${id}`, delRes.status, delRes.body);
          failures.push({ email: u.email, id, error: delRes.body });
        }
      }

      if (ok) {
        console.log(`  deleted ${id} (${f.factor_type || f.friendly_name || "factor"})`);
        removed += 1;
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        usersScanned: users.length,
        usersWithFactors,
        factorsRemoved: removed,
        failures: failures.length,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exit(2);
}
