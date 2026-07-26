import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";

/** Recovered from PR #81 — nav config lives outside the client component. */
describe("AppHeader nav config", () => {
  it("keeps PRIMARY lean and always includes Dashboard", () => {
    expect(APP_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "Dashboard" });
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/tools");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/journal");
  });

  it("puts Companion under More at /advisor", () => {
    expect(APP_MORE_NAV.map((i) => i.href)).toContain("/advisor");
    expect(APP_MORE_NAV.find((i) => i.href === "/advisor")?.label).toBe("Companion");
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
