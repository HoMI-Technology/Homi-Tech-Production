import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import { isProtectedPath, PUBLIC_PRODUCT_ROUTES } from "@/lib/auth/protected-routes";
import {
  FIRST_MOMENT_BEAT_COUNT,
  FIRST_MOMENT_BEATS,
  FIRST_MOMENT_HANDOFF_LINE,
  PRIMARY_CLOSE_HREF,
} from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("guest /assessment is First Moment — page gate", () => {
  const page = src("app", "(product)", "assessment", "page.tsx");

  it("server-redirects guests to First Moment and does not mount the 45-q first", () => {
    expect(page).toContain("getCachedUser");
    expect(page).toContain("PRIMARY_CLOSE_HREF");
    expect(page).toMatch(/if\s*\(\s*!user\s*\)\s*redirect\(\s*PRIMARY_CLOSE_HREF\s*\)/);
    expect(page).toMatch(/catch\s*\{[\s\S]*redirect\(\s*PRIMARY_CLOSE_HREF\s*\)/);
    expect(page.indexOf("redirect(PRIMARY_CLOSE_HREF)")).toBeLessThan(page.indexOf("<FullAssessmentFlow"));
  });

  it("still renders FullAssessmentFlow for a signed-in user", () => {
    expect(page).toContain("return <FullAssessmentFlow />");
    expect(page).not.toContain('redirect("/auth/sign-in');
  });

  it("does not middleware-protect /assessment — that bounce would skip First Moment", () => {
    expect(PUBLIC_PRODUCT_ROUTES).toContain("assessment");
    expect(isProtectedPath("/assessment")).toBe(false);
  });
});

describe("anonymous SiteHeader Assessment nav", () => {
  const header = src("components", "layout", "SiteHeader.tsx");

  it("points Assessment at First Moment, not a raw /assessment bypass", () => {
    expect(header).toMatch(/href:\s*PRIMARY_CLOSE_HREF,\s*label:\s*"Assessment"/);
    expect(header).not.toMatch(/href:\s*["']\/assessment["']/);
    expect(PRIMARY_CLOSE_HREF).toBe("/first-moment");
  });

  it("leaves signed-in product chrome on /assessment", () => {
    expect(APP_PRIMARY_NAV.map((item) => item.href)).toContain("/assessment");
  });
});

describe("homepage Assess close is unchanged", () => {
  it("keeps InterviewHero on PRIMARY_CLOSE_HREF / First Moment", () => {
    const hero = src("components", "home", "InterviewHero.tsx");
    expect(hero).toContain("PRIMARY_CLOSE_HREF");
    expect(hero).toContain("PRIMARY_CLOSE_LABEL");
    expect(hero).toContain("?src=hero");
    expect(hero).not.toContain('href="/assessment"');
    expect(hero).not.toContain("/shadow-score");
  });
});

describe("First Moment copy stays word-locked", () => {
  it("does not invent a sixth beat or change the handoff line", () => {
    expect(FIRST_MOMENT_BEAT_COUNT).toBe(5);
    expect(FIRST_MOMENT_BEATS).toHaveLength(5);
    expect(FIRST_MOMENT_HANDOFF_LINE).toBe(
      "This takes about 5 minutes. You’ll need an account so the verdict stays yours.",
    );
    expect(FIRST_MOMENT_BEATS[4].line).toBe(FIRST_MOMENT_HANDOFF_LINE);
    expect(FIRST_MOMENT_BEATS[4].cta).toBe("Create account");
    expect(FIRST_MOMENT_BEATS[4].continueCta).toBe("Continue");
  });
});

describe("scoring APIs refuse a guest verdict", () => {
  it("POST /api/assessments already 401s without a session", () => {
    const route = src("app", "api", "assessments", "route.ts");
    expect(route).toMatch(/if\s*\(\s*!user\s*\)/);
    expect(route).toMatch(/saved:\s*false/);
    expect(route).toMatch(/status:\s*401/);
  });

  it("POST /api/scoring requires a session before computeScore", () => {
    const route = src("app", "api", "scoring", "route.ts");
    expect(route).toMatch(/if\s*\(\s*!user\s*\)/);
    expect(route).toMatch(/status:\s*401/);
    expect(route.indexOf('status: 401')).toBeLessThan(route.indexOf("computeScore(inputs)"));
    expect(route).not.toMatch(/guest scoring path/);
    expect(route).not.toMatch(/Auth-free/);
  });
});
