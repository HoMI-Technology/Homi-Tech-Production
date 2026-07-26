import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * CSP policy source-code audit
 * =============================
 *
 * Reads next.config.ts and asserts on the Content-Security-Policy
 * string so an accidental edit can't silently weaken the policy.
 */

const ROOT = path.resolve(__dirname, "../..");
const NEXT_CONFIG = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");

// Extract the CSP string from the source.
// It is built from an array joined with "; ".
const cspMatch = NEXT_CONFIG.match(/contentSecurityPolicy\s*=\s*\[([\s\S]*?)\]\.join\("; "\)/);
if (!cspMatch) {
  throw new Error("Could not find contentSecurityPolicy array in next.config.ts");
}
const cspSource = cspMatch[1];

describe("CSP — required directives present", () => {
  it("contains default-src 'self'", () => {
    expect(cspSource).toContain("default-src 'self'");
  });

  it("contains frame-ancestors 'none'", () => {
    expect(cspSource).toContain("frame-ancestors 'none'");
  });

  it("contains upgrade-insecure-requests", () => {
    expect(cspSource).toContain("upgrade-insecure-requests");
  });

  it("contains object-src 'none'", () => {
    expect(cspSource).toContain("object-src 'none'");
  });

  it("contains base-uri 'self'", () => {
    expect(cspSource).toContain("base-uri 'self'");
  });

  it("contains a report-uri or report-to directive", () => {
    const hasReportUri = cspSource.includes("report-uri") || cspSource.includes("report-to");
    expect(hasReportUri).toBe(true);
  });
});

describe("CSP — script-src restrictions", () => {
  it("does NOT contain 'unsafe-eval' in script-src", () => {
    // unsafe-eval is only acceptable in dev builds for HMR; our CSP string
    // is shared between dev and prod, and dev uses report-only mode.
    // Production builds must never allow eval.
    expect(cspSource).not.toContain("'unsafe-eval'");
  });

  it("contains 'unsafe-inline' in script-src (required by Next inline chunks)", () => {
    // This is a known limitation documented in next.config.ts.
    // Removing it requires nonce middleware — a deliberate follow-up.
    expect(cspSource).toContain("script-src");
    expect(cspSource).toContain("'unsafe-inline'");
  });
});

describe("CSP — connect-src external origins", () => {
  it("allows Supabase REST and Realtime origins", () => {
    expect(cspSource).toContain("https://*.supabase.co");
    expect(cspSource).toContain("wss://*.supabase.co");
  });

  it("allows Anthropic API (server-side parity, zero browser cost)", () => {
    expect(cspSource).toContain("https://api.anthropic.com");
  });
});

describe("CSP — header delivery", () => {
  it("sends enforced CSP header on production builds", () => {
    expect(NEXT_CONFIG).toContain('key: "Content-Security-Policy"');
  });

  it("sends report-only CSP header everywhere (including dev)", () => {
    expect(NEXT_CONFIG).toContain('key: "Content-Security-Policy-Report-Only"');
  });
});

describe("CSP — security headers companion", () => {
  it("sends X-Frame-Options: DENY", () => {
    expect(NEXT_CONFIG).toContain('key: "X-Frame-Options", value: "DENY"');
  });

  it("sends Strict-Transport-Security with preload", () => {
    expect(NEXT_CONFIG).toContain('key: "Strict-Transport-Security"');
    expect(NEXT_CONFIG).toContain("preload");
  });

  it("sends X-Content-Type-Options: nosniff", () => {
    expect(NEXT_CONFIG).toContain('key: "X-Content-Type-Options", value: "nosniff"');
  });

  it("sends Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(NEXT_CONFIG).toContain('key: "Referrer-Policy", value: "strict-origin-when-cross-origin"');
  });

  it("sends Permissions-Policy restricting camera, microphone, geolocation", () => {
    expect(NEXT_CONFIG).toContain('key: "Permissions-Policy"');
    expect(NEXT_CONFIG).toContain("camera=()");
    expect(NEXT_CONFIG).toContain("microphone=()");
    expect(NEXT_CONFIG).toContain("geolocation=()");
  });
});
