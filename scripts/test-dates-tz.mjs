#!/usr/bin/env node
/**
 * Run the dates unit suite under UTC and America/Los_Angeles so the classic
 * off-by-one cannot hide behind the Cloud VM's default timezone.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZONES = ["UTC", "America/Los_Angeles", "Pacific/Auckland"];

let failed = false;
for (const tz of ZONES) {
  console.log(`\n▶ dates under TZ=${tz}`);
  const result = spawnSync(
    "npx",
    ["vitest", "run", "__tests__/dates.test.ts"],
    {
      cwd: ROOT,
      env: { ...process.env, TZ: tz },
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.status !== 0) {
    failed = true;
    console.error(`dates TZ=${tz} FAILED`);
  }
}

process.exitCode = failed ? 1 : 0;
if (!failed) console.log("\ndates-tz: all zones passed.");
