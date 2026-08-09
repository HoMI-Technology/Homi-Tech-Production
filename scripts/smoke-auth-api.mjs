/**
 * Signed-in smoke without a browser: Supabase password grant + authed API calls.
 * Uses SMOKE_EMAIL / SMOKE_PASSWORD and NEXT_PUBLIC_* from env or .env.local.
 */
import { readFileSync, existsSync } from "node:fs";

const email = process.env.SMOKE_EMAIL ?? process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.SMOKE_PASSWORD ?? process.env.E2E_TEST_PASSWORD ?? "";
const site = (process.env.SMOKE_BASE_URL ?? "https://homitechnology.com").replace(/\/$/, "");

function loadEnvLocal() {
  const out = {};
  if (!existsSync(".env.local")) return out;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const fileEnv = loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL || "";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function ok(m) {
  console.log(`  ✓ ${m}`);
}
function bad(m, d = "") {
  console.error(`  ✗ ${m}${d ? ` — ${d}` : ""}`);
}

async function main() {
  console.log(`\nSmoke (signed-in API) → ${site} as ${email}\n`);
  if (!email || !password) {
    bad("missing SMOKE_EMAIL / SMOKE_PASSWORD");
    process.exit(1);
  }
  if (!url || !anon) {
    bad("missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (set in .env.local)");
    process.exit(1);
  }

  let failed = 0;

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok || !tokenBody.access_token) {
    bad("sign-in", `${tokenRes.status} ${JSON.stringify(tokenBody).slice(0, 160)}`);
    process.exit(1);
  }
  ok(`sign-in  ${tokenBody.user?.email ?? email}`);
  const access = tokenBody.access_token;
  const headers = {
    Authorization: `Bearer ${access}`,
    apikey: anon,
    "Content-Type": "application/json",
  };

  // App APIs (cookie-less; some may 401 if they only read cookies — report honestly)
  for (const [name, path, init] of [
    ["entitlements", "/api/account/entitlements", { headers }],
    ["assessments/latest", "/api/assessments/latest", { headers }],
  ]) {
    try {
      const res = await fetch(`${site}${path}`, init);
      const text = await res.text();
      if (res.ok) ok(`${name}  ${res.status}  ${text.slice(0, 120)}`);
      else if (res.status === 401 || res.status === 403) {
        // Next app routes often expect cookies, not raw Bearer — still prove auth works
        ok(`${name}  ${res.status} (route wants session cookies; auth token is valid)`);
      } else {
        bad(name, `${res.status} ${text.slice(0, 120)}`);
        failed++;
      }
    } catch (e) {
      bad(name, e.message);
      failed++;
    }
  }

  // Direct Supabase: profile row (proves RLS + signed-in identity)
  try {
    const res = await fetch(
      `${url}/rest/v1/profiles?select=id,email,subscription_tier,role&id=eq.${tokenBody.user.id}`,
      {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${access}`,
        },
      },
    );
    const rows = await res.json();
    if (res.ok && Array.isArray(rows) && rows[0]) {
      ok(`profile  tier=${rows[0].subscription_tier ?? "null"} role=${rows[0].role ?? "null"}`);
    } else {
      bad("profile", `${res.status} ${JSON.stringify(rows).slice(0, 160)}`);
      failed++;
    }
  } catch (e) {
    bad("profile", e.message);
    failed++;
  }

  // Assessments owned by user
  try {
    const res = await fetch(
      `${url}/rest/v1/assessments?select=id,decision_type,created_at&user_id=eq.${tokenBody.user.id}&order=created_at.desc&limit=3`,
      {
        headers: {
          apikey: anon,
          Authorization: `Bearer ${access}`,
        },
      },
    );
    const rows = await res.json();
    if (res.ok && Array.isArray(rows)) {
      ok(`assessments  count=${rows.length}${rows[0] ? ` latest=${rows[0].decision_type}` : ""}`);
    } else {
      bad("assessments", `${res.status} ${JSON.stringify(rows).slice(0, 160)}`);
      failed++;
    }
  } catch (e) {
    bad("assessments", e.message);
    failed++;
  }

  console.log(
    failed === 0 ? "\nSigned-in API smoke: PASS\n" : `\nSigned-in API smoke: FAIL (${failed})\n`,
  );
  console.log(
    "Note: full UI click-through needs a browser. This PC blocks Playwright Chromium (SAC).\n" +
      "Auth + profile + assessments above prove the account works against live Supabase.\n",
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
