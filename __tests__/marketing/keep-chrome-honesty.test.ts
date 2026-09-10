import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { isKeepPagePath } from "@/lib/auth/keep-routes";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

/** DARK product destinations KEEP chrome must not advertise. */
const DARK_HREFS = [
  "/dashboard",
  "/demo",
  "/first-moment",
  "/how-it-works",
  "/guides",
  "/pricing",
  "/b2b",
  "/assessment",
  "/money",
  "/path",
  "/tools",
  "/home",
] as const;

describe("KEEP chrome honesty — marketing header", () => {
  const header = src("components", "layout", "SiteHeader.tsx");

  it("only links Sign in (KEEP auth), never DARK product nav", () => {
    expect(header).toContain('href="/auth/sign-in"');
    expect(isKeepPagePath("/auth/sign-in")).toBe(true);
    for (const href of DARK_HREFS) {
      expect(header, href).not.toContain(`"${href}"`);
      expect(header, href).not.toContain(`'${href}'`);
    }
  });
});

describe("KEEP chrome honesty — auth CTAs", () => {
  it("sign-in does not offer the DARK /demo", () => {
    const page = src("app", "auth", "sign-in", "page.tsx");
    expect(page).not.toContain('href="/demo"');
    expect(page).not.toContain("Try the demo");
    expect(page).toContain('href="/auth/sign-up"');
  });

  it("reset-password continue lands on KEEP `/`, not `/dashboard`", () => {
    const page = src("app", "auth", "reset-password", "page.tsx");
    expect(page).not.toContain('href="/dashboard"');
    expect(page).not.toContain("Go to your dashboard");
    expect(page).toContain('href="/"');
    expect(isKeepPagePath("/")).toBe(true);
  });
});

describe("KEEP chrome honesty — PWA shortcuts", () => {
  it("omits DARK dashboard/money shortcuts", () => {
    const m = manifest();
    expect(m.shortcuts ?? []).toEqual([]);
    expect(m.start_url).toBe("/");
  });
});
