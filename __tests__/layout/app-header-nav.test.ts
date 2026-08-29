import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";

/** Nav config lives outside the client component for unit/e2e import. */
describe("AppHeader nav config", () => {
  it("keeps PRIMARY to Home, Assess, Money, Path", () => {
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toEqual([
      "/dashboard",
      "/assessment",
      "/money",
      "/path",
    ]);
    expect(APP_PRIMARY_NAV.map((i) => i.label)).toEqual(["Home", "Assess", "Money", "Path"]);
    expect(APP_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "Home" });
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/journal");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/agents");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/household");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/connections");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/timeline");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/trust");
    expect(APP_PRIMARY_NAV).toHaveLength(4);
  });

  it("puts Journal under More and keeps Companion off header chrome", () => {
    expect(APP_MORE_NAV.map((i) => i.href)).toContain("/journal");
    expect(APP_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
  });

  it("carries the launch product surface under More", () => {
    const hrefs = APP_MORE_NAV.map((i) => i.href);
    for (const href of [
      "/household",
      "/tools/preflight",
      "/scenarios",
      "/journal",
      "/connections",
    ]) {
      expect(hrefs).toContain(href);
    }
    // Verdict reveal + readiness checklist stay palette-only — Path owns Build.
    expect(hrefs).not.toContain("/path");
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
      "/decisions",
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

  it("keeps Agents off PRIMARY — More / palette only, even when the flag is on", () => {
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/agents");
    expect(APP_MORE_NAV.map((i) => i.href)).not.toContain("/path");
  });
});
