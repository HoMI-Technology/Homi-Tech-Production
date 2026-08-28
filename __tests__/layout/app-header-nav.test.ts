import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";

/** Nav config lives outside the client component for unit/e2e import. */
describe("AppHeader nav config", () => {
  it("carries the five product modes as PRIMARY, Readiness first", () => {
    // Doctrine change (founder, 2026-08-27): the five product modes —
    // Readiness · Reality · Decide · Plan · Goals — ARE the primary product
    // map on desktop, exactly as ProductBottomNav is on mobile. The previous
    // "ruthlessly short, max 4" rule described the retired one-line AppHeader
    // and required the user to open a "Money" parent before reaching four of
    // the five modes. That parent no longer exists.
    const hrefs = APP_PRIMARY_NAV.map((i) => i.href);
    expect(APP_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "Home" });
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");

    // Every mode route is primary chrome — none of them is nested behind a
    // parent destination.
    for (const href of ["/money", "/money/decide", "/money/plan", "/money/goals"]) {
      expect(hrefs).toContain(href);
    }

    // Journal still lives under More so the rail stays scannable.
    expect(hrefs).not.toContain("/journal");
    // Track and Invest fold into Reality rather than becoming peer entries.
    expect(hrefs).not.toContain("/money/budget");
    expect(hrefs).not.toContain("/money/investments");
  });

  it("puts Journal under More and keeps Companion off header chrome", () => {
    expect(APP_MORE_NAV.map((i) => i.href)).toContain("/journal");
    expect(APP_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
  });

  it("carries the launch product surface under More", () => {
    const hrefs = APP_MORE_NAV.map((i) => i.href);
    for (const href of [
      "/path",
      "/household",
      "/tools/preflight",
      "/scenarios",
      "/decisions",
      "/journal",
      "/connections",
    ]) {
      expect(hrefs).toContain(href);
    }
    // Verdict reveal + readiness checklist stay palette-only — Path owns Build.
    expect(hrefs).not.toContain("/results");
    expect(hrefs).not.toContain("/plan");
    // Money modes live under primary Money + MoneyModeNav — not More peers.
    for (const href of ["/money/budget", "/money/decide", "/money/plan"]) {
      expect(hrefs).not.toContain(href);
    }
    expect(APP_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
    // Incomplete lab surfaces stay off chrome for launch (routes still exist).
    for (const href of [
      "/simulator",
      "/signals",
      "/twin",
      "/trinity",
      "/genome",
      "/calendar",
      "/daily",
      "/credit",
    ]) {
      expect(hrefs).not.toContain(href);
    }
    // D3 household consolidation: /couples and /family merged into
    // /household (#couples / #family tabs) — the routes no longer exist.
    expect(hrefs).not.toContain("/couples");
    expect(hrefs).not.toContain("/family");
  });

  it("keeps Results off More chrome (palette reveal only)", () => {
    expect(APP_MORE_NAV.map((i) => i.href)).not.toContain("/results");
  });

  it("does not advertise Agents in PRIMARY unless the public FF is on", () => {
    const hrefs = APP_PRIMARY_NAV.map((i) => i.href);
    if (process.env.NEXT_PUBLIC_FF_AGENT_OS === "true") {
      expect(hrefs).toContain("/agents");
    } else {
      expect(hrefs).not.toContain("/agents");
    }
  });
});
