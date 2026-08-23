/**
 * Fails if public/architecture.json is missing required invariants.
 * Full drift vs generator is covered by `npm run architecture:gen` + committing
 * the result; unit tests cover buildArchitectureDocument.
 *
 * Run: npm run architecture:check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FEED = path.join(ROOT, "public", "architecture.json");

function fail(msg) {
  console.error(`architecture:check ✗ ${msg}`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(FEED)) {
    fail("public/architecture.json missing — run npm run architecture:gen");
  }

  const doc = JSON.parse(fs.readFileSync(FEED, "utf8"));

  const oracle = (doc.ai_agents || []).find((a) => a.id === "oracle");
  if (!oracle || oracle.level !== 10) {
    fail("ai_agents.oracle.level must be 10 (registry SSOT)");
  }

  const analyst = (doc.ai_agents || []).find((a) => a.id === "analyst");
  if (!analyst || analyst.level !== 3) {
    fail("ai_agents.analyst.level must be 3");
  }

  const poisoned = ["mortgage-payment", "home-equity", "apr-comparison"];
  for (const route of doc.calculators || []) {
    for (const bad of poisoned) {
      if (String(route.route).includes(bad)) {
        fail(`poisoned calculator route still present: ${route.route}`);
      }
    }
  }

  const scoring = doc.scoring_engine;
  if (!scoring) {
    fail("scoring_engine section missing");
  }

  // Trade-secret lockdown: the public feed must NOT publish exact scoring
  // internals (pillar maxScores, verdict bands, hard-stop conditions/values).
  if (scoring.verdict_thresholds?.published !== false) {
    fail("scoring_engine.verdict_thresholds must be locked to { published: false }");
  }
  if (scoring.hard_stops?.published !== false) {
    fail("scoring_engine.hard_stops must be locked to { published: false }");
  }
  for (const pillar of scoring.pillars || []) {
    if ("maxScore" in pillar) {
      fail(`pillar ${pillar.key} must not publish maxScore`);
    }
  }

  if (
    !scoring.vocabulary_note?.includes("NOT_YET") ||
    !scoring.vocabulary_note?.includes("DO NOT PROCEED")
  ) {
    fail("vocabulary_note must keep key NOT_YET and label DO NOT PROCEED");
  }

  if (!doc.tool_aliases?.["/tools/mortgage-payment"]) {
    fail("tool_aliases must map /tools/mortgage-payment → /tools/mortgage");
  }

  if (!doc._meta?.feed_url?.includes("architecture.json")) {
    fail("_meta.feed_url must point at architecture.json");
  }

  if (!Array.isArray(doc.gaps) || doc.gaps.length < 1) {
    fail("gaps must include at least one verified residual item");
  }

  console.log(
    `architecture:check ✓ feed ok (routes=${doc.stats?.product_routes} agents=${doc.stats?.ai_agents} gaps=${doc.stats?.gaps})`,
  );
}

main();
