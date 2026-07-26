import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";

/** Nav config lives outside the client component for unit/e2e import. */
describe("AppHeader nav config", () => {
  it("keeps PRIMARY ruthlessly short with Home first", () => {
    expect(APP_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "Home" });
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");
    expect(APP_PRIMARY_NAV.map((i) => i.href)).toContain("/tools");
    // Journal lives under More so the product bar stays one line.
    expect(APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/journal");
    expect(APP_PRIMARY_NAV.length).toBeLessThanOrEqual(4);
  });

  it("puts Journal and Companion under More", () => {
    expect(APP_MORE_NAV.map((i) => i.href)).toContain("/journal");
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
