import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scoreToVerdict } from "@/lib/scoring/public";
import {
  AGENT_INSTRUCTION,
  EXAMPLE_COMPUTE_RESPONSE,
  EXAMPLE_RECEIPT_RESPONSE,
  EXAMPLE_SCORE,
  EXAMPLE_VERDICT,
} from "@/lib/developers/fixtures";

const page = () => readFileSync(join(process.cwd(), "app/(marketing)/developers/page.tsx"), "utf8");
const playground = () =>
  readFileSync(join(process.cwd(), "components/developers/Playground.tsx"), "utf8");
const phone = () =>
  readFileSync(join(process.cwd(), "components/developers/ExamplePhone.tsx"), "utf8");
const allUi = () => page() + playground() + phone();

describe("developers fixtures", () => {
  it("locks EXAMPLE 61 to BUILD_FIRST via public scoreToVerdict", () => {
    expect(scoreToVerdict(61)).toBe("BUILD_FIRST");
    expect(EXAMPLE_SCORE).toBe(61);
    expect(EXAMPLE_VERDICT).toBe("BUILD_FIRST");
    expect(EXAMPLE_COMPUTE_RESPONSE.score).toBe(61);
    expect(EXAMPLE_COMPUTE_RESPONSE.verdict).toBe("BUILD_FIRST");
  });

  it("does not put email or ssn on the fixture contract", () => {
    const blob = JSON.stringify({
      EXAMPLE_COMPUTE_RESPONSE,
      AGENT_INSTRUCTION,
    });
    expect(blob.toLowerCase()).not.toMatch(/"ssn"|email@/);
  });
});

describe("developers page canon", () => {
  it("exists as Preview and names Decision Readiness", () => {
    const src = allUi();
    expect(src).toMatch(/Preview|EXAMPLE/);
    expect(src).toContain("Decision Readiness");
  });

  it("associates 61 with EXAMPLE", () => {
    expect(allUi()).toMatch(/EXAMPLE[\s\S]{0,800}61|61[\s\S]{0,800}EXAMPLE/);
  });

  it("does not ship hk_demo or a live POST /v1/readiness heading", () => {
    const src = allUi();
    expect(src).not.toContain("hk_demo");
    expect(src).not.toMatch(/<h[1-6][^>]*>\s*POST \/v1\/readiness/);
  });

  it("documents receipts + purpose and the eligibility wall", () => {
    const src = allUi();
    expect(src).toContain("/api/v1/receipts");
    expect(src).toContain("Homi-Purpose");
    expect(src.toLowerCase()).toMatch(/credit/);
    expect(src.toLowerCase()).toMatch(/employment/);
    expect(src.toLowerCase()).toMatch(/housing/);
  });

  it("teaches session-then-verify, not lookup", () => {
    expect(AGENT_INSTRUCTION.do).toContain("share-sessions");
    expect(AGENT_INSTRUCTION.do).toContain("/api/v1/receipts");
    expect(AGENT_INSTRUCTION.never.toLowerCase()).toMatch(/scoring/);
  });

  it("defaults the playground to share-sessions, not legacy compute", () => {
    const src = playground();
    expect(src).toMatch(/useState<Tab>\(\s*"session"\s*\)/);
    expect(src.indexOf('id: "session"')).toBeLessThan(src.indexOf('id: "compute"'));
  });

  it("keeps partner EXAMPLE receipt without a raw overall 0–100", () => {
    expect(JSON.stringify(EXAMPLE_RECEIPT_RESPONSE)).not.toContain("overall_score");
    expect(EXAMPLE_RECEIPT_RESPONSE.receipt).not.toHaveProperty("score");
    expect(EXAMPLE_RECEIPT_RESPONSE.receipt.verdict).toBe("BUILD_FIRST");
  });

  it("does not advertise lookup-by-email or SSN pull", () => {
    const src = allUi();
    expect(src).not.toMatch(/GET \/score\?email/i);
    expect(src).not.toMatch(/lookup by (email|ssn)/i);
    expect(src).not.toMatch(/\bSSN\b/);
  });
});

describe("homepage landing-canon still forbids 61 theater", () => {
  it("does not put BUILD FIRST on /", () => {
    const home = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");
    expect(home).not.toContain("BUILD FIRST");
    expect(home).not.toMatch(/score-numeral[^>]*>\s*61\s*</);
  });
});
