import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEFT_RAIL_PRIMARY } from "@/lib/layout/left-rail";
import { HOME_DENSITY_LENSES, HOME_KEY_AREAS_HEADING } from "@/lib/dashboard/fold-truth";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("PR13 invent chrome visible", () => {
  it("Bills, Learn, Net Worth, and Emergency Fund stay empty without invented $", () => {
    const bills = read("app/(product)/money/bills/page.tsx");
    const learn = read("app/(product)/learn/page.tsx");
    const netWorth = read("app/(product)/tools/net-worth/page.tsx");
    const fund = read("app/(product)/tools/emergency-fund/page.tsx");
    const empty = read("components/dashboard/InventChromeEmpty.tsx");
    for (const src of [bills, learn, netWorth, fund, empty]) {
      expect(src).not.toMatch(/\$4,200|\$4200|10,000|~8 points|On track/);
    }
    expect(bills).toContain('canonical: "/money/bills"');
    expect(learn).toContain('canonical: "/learn"');
    expect(learn).toContain("/guides");
    expect(netWorth).toContain('canonical: "/tools/net-worth"');
    expect(fund).toContain('canonical: "/tools/emergency-fund"');
    expect(empty).toContain("FOLD_CONNECTIONS_HREF");
    expect(empty).toContain("No invented amounts on this shell.");
  });

  it("signed-in Home and rail actually mount invent chrome on the live personal path", () => {
    const fold = read("components/dashboard/ThresholdFold.tsx");
    const rail = read("components/layout/AppSidebar.tsx");
    const router = read("components/layout/ProductLayoutRouter.tsx");
    const chrome = read("components/layout/SignedInPersonalChrome.tsx");
    const layout = read("app/(product)/layout.tsx");
    const companion = read("components/dashboard/HomeCompanionColumn.tsx");
    expect(layout).toContain("productShellFor");
    expect(layout).toContain("pathnameFromRequestHeaders");
    expect(layout).toContain("shell={shell}");
    expect(router).toContain("resolveProductShell");
    expect(router).toContain("SignedInPersonalChrome");
    expect(chrome).toContain("AppSidebar");
    expect(chrome).toContain('data-product-shell="personal"');
    expect(rail).toContain('data-invent-chrome="pr13"');
    expect(rail).toContain("LEFT_RAIL_PRIMARY");
    expect(fold).toContain('data-invent-chrome="pr13"');
    expect(fold.indexOf("<HomeJourney")).toBeLessThan(fold.indexOf("<HomeKeyAreas"));
    expect(fold.indexOf("<HomeKeyAreas")).toBeLessThan(fold.indexOf("<HomeDensity"));
    expect(companion).toContain("data-home-companion-theater");
    expect(companion).toContain("data-home-companion-composer");
    expect(companion).toContain("data-home-companion-orb");
    expect(companion).toContain('href="/advisor"');
    expect(companion).toContain("HOME_COMPANION_GUIDANCE");
    expect(companion).not.toMatch(/cx="10"|cx="26"/);
    for (const src of [fold, rail, companion, layout, router]) {
      expect(src).not.toMatch(/\$4,200|~8 points|On track/);
    }
  });

  it("State A Product map, Key Factors LOOK, and NW/EF chrome are the live lists", () => {
    expect(LEFT_RAIL_PRIMARY.map((i) => i.label)).toEqual([
      "Home",
      "Assessment",
      "Finances",
      "Plans",
      "Compare",
      "Bills",
      "Insights",
      "Learn",
      "Companion",
      "Tools",
    ]);
    expect(HOME_KEY_AREAS_HEADING).toBe("Key Factors");
    expect(HOME_DENSITY_LENSES.map((l) => l.id)).toEqual([
      "net-worth",
      "emergency-fund",
      "affordability",
      "debt-payoff",
      "blind-budget",
      "monte-carlo",
    ]);
  });
});
