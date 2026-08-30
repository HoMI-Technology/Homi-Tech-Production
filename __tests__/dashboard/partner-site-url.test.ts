/**
 * Partner invite origin must never silently default to https://homitechnology.com.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PartnerSiteUrlError,
  resolvePartnerInviteOrigin,
} from "@/lib/dashboard/partner-site-url";

const PAGE = resolve(process.cwd(), "app/(product)/partner/dashboard/page.tsx");

describe("resolvePartnerInviteOrigin", () => {
  it("prefers an explicit NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolvePartnerInviteOrigin({
        envUrl: "https://preview.example.com/",
        host: "partner.internal",
        proto: "http",
      }),
    ).toBe("https://preview.example.com");
  });

  it("derives from the request host when the env URL is unset", () => {
    expect(
      resolvePartnerInviteOrigin({
        envUrl: "",
        host: "app.example.test, other.host",
        proto: "https",
      }),
    ).toBe("https://app.example.test");
    expect(
      resolvePartnerInviteOrigin({
        envUrl: null,
        host: "localhost:3000",
        proto: "http",
      }),
    ).toBe("http://localhost:3000");
  });

  it("fails loud when both env URL and host are missing — never invents production", () => {
    expect(() =>
      resolvePartnerInviteOrigin({ envUrl: undefined, host: null, proto: "https" }),
    ).toThrow(PartnerSiteUrlError);
    expect(() => resolvePartnerInviteOrigin({})).toThrow(/must not silently default/);
    expect(() => resolvePartnerInviteOrigin({ envUrl: "   ", host: "" })).toThrow(
      PartnerSiteUrlError,
    );
  });

  it("never returns https://homitechnology.com as a silent default", () => {
    expect(() => resolvePartnerInviteOrigin({ envUrl: null, host: null })).toThrow(
      /homitechnology\.com/,
    );
    const derived = resolvePartnerInviteOrigin({
      envUrl: undefined,
      host: "staging.internal",
      proto: "https",
    });
    expect(derived).not.toBe("https://homitechnology.com");
  });
});

describe("partner dashboard page — silent production default is gone", () => {
  it("does not fall back to https://homitechnology.com", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).not.toMatch(
      /NEXT_PUBLIC_SITE_URL\s*\?\?\s*["']https:\/\/homitechnology\.com["']/,
    );
    expect(src).not.toMatch(/const SITE_URL\s*=/);
    expect(src).toContain("resolvePartnerInviteOrigin");
    expect(src).toContain('from "next/headers"');
  });
});

describe("partner dashboard page — no other people's overall scores", () => {
  it("does not render raw overall_score or an average integer", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).not.toMatch(/Math\.round\(a\.overall_score\)/);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    expect(src).not.toMatch(/>Score</);
  });

  it("shows receipt bands instead of integers", () => {
    const src = readFileSync(PAGE, "utf8");
    expect(src).toMatch(/scoreBand\(/);
    expect(src).toContain('from "@/lib/receipts"');
  });
});

describe("lib/env.ts — silent production default is gone", () => {
  it("does not fall back to https://homitechnology.com", () => {
    const src = readFileSync(resolve(process.cwd(), "lib/env.ts"), "utf8");
    expect(src).not.toMatch(/return\s+["']https:\/\/homitechnology\.com["']/);
  });
});
