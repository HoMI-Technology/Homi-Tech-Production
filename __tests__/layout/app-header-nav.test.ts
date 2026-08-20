import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";

/** Nav config lives outside the client component for unit/e2e import. */
describe("AppHeader nav config", () => {
  it("keeps PRIMARY ruthlessly short with Home first", () => {
    expect(APP_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "Home" });
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/money");
    // Journal lives under More so the product bar stays one line.
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/journal");
    expect(APP_PRIMARY_NAV.length).toBeLessThanOrEqual(4);
  });

  it("puts Journal under More and keeps Companion off header chrome", () => {
    expect(APP_MORE_NAV.map((i) => i.href)).toContain("/journal");
    expect(APP_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
  });

  it("carries the launch product surface under More", () => {
    const hrefs = APP_MORE_NAV.map((i) => i.href);
    for (const href of [
      "/path",
      "/results",
      "/household",
      "/tools/preflight",
      "/scenarios",
      "/journal",
      "/connections",
    ]) {
      expect(hrefs).toContain(href);
    }
    // Readiness plan checklist is palette-only — Path owns the living Build.
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

  it("puts Results adjacent to Path to Ready", () => {
    const hrefs = APP_MORE_NAV.map((i) => i.href);
    expect(hrefs.indexOf("/results")).toBe(hrefs.indexOf("/path") + 1);
    expect(APP_MORE_NAV.find((i) => i.href === "/results")?.label).toBe("Results");
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
