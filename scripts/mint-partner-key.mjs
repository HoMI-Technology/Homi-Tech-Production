#!/usr/bin/env node
/**
 * Mint a partner API key for the readiness-receipt verification API (00022).
 *
 * Operator-only, offline by design: it generates a key, prints the plaintext
 * ONCE (hand it to the partner over a secure channel), and prints the exact
 * SQL to store only its SHA-256 hash. The plaintext never touches the database
 * and this script never needs the service-role key.
 *
 *   node scripts/mint-partner-key.mjs "Coastal Realty" "Coastal Realty LLC"
 */
import { randomBytes, createHash } from "node:crypto";

const label = process.argv[2];
const orgName = process.argv[3] ?? null;

if (!label) {
  console.error('Usage: node scripts/mint-partner-key.mjs "<label>" ["<org name>"]');
  process.exit(1);
}

const key = `homi_live_${randomBytes(16).toString("hex")}`;
const keyHash = createHash("sha256").update(key).digest("hex");

const esc = (v) => (v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

console.log("\n=== Partner API key (shown once — store securely, give to the partner) ===\n");
console.log(`  ${key}\n`);
console.log("=== Run this in the Supabase SQL editor to register the hash ===\n");
console.log(
  `insert into partner_api_keys (label, org_name, key_hash)\n` +
    `values (${esc(label)}, ${esc(orgName)}, '${keyHash}');\n`,
);
console.log("The partner authenticates with:  Authorization: Bearer <the key above>\n");
