import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("PR12 invent chrome shells", () => {
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
});
