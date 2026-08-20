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
  PRIMARY_CLOSE_LABEL,
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
    expect(page).toContain("isNextRedirectError");
    expect(page).toMatch(/if\s*\(\s*isNextRedirectError\s*\(/);
    expect(page.indexOf("redirect(PRIMARY_CLOSE_HREF)")).toBeLessThan(
      page.indexOf("<FullAssessmentFlow"),
    );
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

  it("leaves the primary Assess button on PRIMARY_CLOSE_HREF / PRIMARY_CLOSE_LABEL", () => {
    expect(header).toContain("PRIMARY_CLOSE_LABEL");
    expect(header).toMatch(/href=\{PRIMARY_CLOSE_HREF\}[\s\S]*\{PRIMARY_CLOSE_LABEL\}/);
  });

  it("leaves signed-in product chrome on /assessment", () => {
    expect(APP_PRIMARY_NAV.map((item) => item.href)).toContain("/assessment");
  });
});

describe("anonymous SiteFooter Product column", () => {
  const footer = src("components", "layout", "SitemapFooter.tsx");

  it("points Full Assessment at First Moment and does not touch Waitlist", () => {
    expect(footer).toContain('{ href: "/first-moment", label: "Full Assessment" }');
    expect(footer).not.toMatch(/href:\s*["']\/assessment["']/);
    expect(footer).toContain('{ href: "/waitlist", label: "Waitlist" }');
    expect(footer).toContain('{ href: "/first-moment", label: "Assess" }');
  });
});

describe("homepage Assess close is unchanged", () => {
  it("keeps the hero Assess on PRIMARY_CLOSE_HREF / First Moment", () => {
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

describe("FullAssessmentFlow does not score a guest", () => {
  it("handleSubmit redirects to First Moment before fetchServerScore / save / /dashboard", () => {
    const flow = src("components", "assessment", "FullAssessmentFlow.tsx");
    const start = flow.indexOf("async function handleSubmit");
    const end = flow.indexOf("const nextDisabled");
    const submit = flow.slice(start, end);
    expect(submit).toContain("getUser");
    expect(submit).toContain("PRIMARY_CLOSE_HREF");
    expect(submit.indexOf("getUser")).toBeLessThan(submit.indexOf("fetchServerScore"));
    expect(submit.indexOf("PRIMARY_CLOSE_HREF")).toBeLessThan(submit.indexOf("fetchServerScore"));
    expect(submit.indexOf("PRIMARY_CLOSE_HREF")).toBeLessThan(submit.indexOf("saveLocalResult"));
    expect(submit.indexOf("PRIMARY_CLOSE_HREF")).toBeLessThan(submit.indexOf('router.push("/dashboard")'));
  });
});

describe("guest /results does not paint a localStorage verdict", () => {
  it("refuses ResultsVerdictView when there is no user", () => {
    const page = src("app", "(product)", "results", "page.tsx");
    expect(page).toContain("discardScoreShapedShadow");
    expect(page).toMatch(/isAnonymous\s*\?\s*null/);
    expect(page).toContain('href="/assessment"');
    expect(page.indexOf("isAnonymous ? null")).toBeLessThan(page.indexOf("<ResultsVerdictView"));
  });
});

describe("guest /plan does not paint a localStorage score", () => {
  it("waits for auth, then drops leftover local results for anonymous visitors", () => {
    const page = src("app", "(product)", "plan", "page.tsx");
    expect(page).toMatch(/isAnonymous\s*\?\s*null/);
    expect(page).toContain("pickResult");
    expect(page).toContain("No plan yet");
    expect(page).not.toContain("fetchServerScore");
    expect(page).not.toContain("/api/scoring");
    expect(page.indexOf("isAnonymous ? null")).toBeLessThan(page.indexOf("No plan yet"));
  });

  it("empty state closes: guest → First Moment; signed-in → Assess + Path", () => {
    const page = src("app", "(product)", "plan", "page.tsx");
    const emptyStart = page.indexOf("No plan yet");
    const emptyEnd = page.indexOf("const doneCount");
    const empty = page.slice(emptyStart, emptyEnd);
    expect(emptyStart).toBeGreaterThan(-1);
    expect(emptyEnd).toBeGreaterThan(emptyStart);
    expect(empty).toContain("PRIMARY_CLOSE_HREF");
    expect(empty).toContain("PRIMARY_CLOSE_LABEL");
    expect(empty).toContain("SIGNED_IN_ASSESS_HREF");
    expect(PRIMARY_CLOSE_HREF).toBe("/first-moment");
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
    // Two Link tags in source: primary Assess (guest or signed-in href) +
    // signed-in-only Path to Ready (gated by !isAnonymous).
    expect(empty.match(/<Link\b/g)).toHaveLength(2);
    expect(empty).toContain('href="/path"');
    expect(empty).not.toContain("Get your Shadow Score");
    expect(empty).not.toContain("Take the full assessment");
    expect(empty).not.toContain("/shadow-score");
    expect(empty).not.toMatch(/href=["']\/assessment["']/);
  });
});

describe("anonymous SiteHeader has no NotificationBell", () => {
  it("removes the bell from marketing chrome and leaves it on AppHeader", () => {
    const site = src("components", "layout", "SiteHeader.tsx");
    const app = src("components", "layout", "AppHeader.tsx");
    expect(site).not.toContain("NotificationBell");
    expect(app).toContain("<NotificationBell />");
  });
});

describe("guest /tools Assess close is First Moment", () => {
  it("points the hub Assess link at PRIMARY_CLOSE_HREF, not /assessment", () => {
    const page = src("app", "(product)", "tools", "page.tsx");
    expect(page).toContain("PRIMARY_CLOSE_HREF");
    expect(page).toContain("PRIMARY_CLOSE_LABEL");
    expect(PRIMARY_CLOSE_HREF).toBe("/first-moment");
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
    expect(page).not.toMatch(/href=["']\/assessment["']/);
  });
});

describe("guest product chrome has no Companion FAB", () => {
  it("mounts CompanionHost only for a signed-in user", () => {
    const layout = src("app", "(product)", "layout.tsx");
    expect(layout).toMatch(/\{user\s*&&\s*<CompanionHost\s*\/>\}/);
    expect(layout).not.toMatch(/^\s*<CompanionHost\s*\/>\s*$/m);
    expect(layout).toContain('from "@/components/companion/CompanionHost"');
  });
});

describe("/api/scoring is not session-gated", () => {
  it("does not 401 /api/scoring — other callers stay auth-free", () => {
    const route = src("app", "api", "scoring", "route.ts");
    expect(route).toMatch(/Auth-free so the anonymous assessment funnel/);
    expect(route).not.toMatch(/status:\s*401/);
  });
});
