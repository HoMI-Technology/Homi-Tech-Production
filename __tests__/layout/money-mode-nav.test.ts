/**
 * Unmounted five-mode Money nav is gone. Live `/money` is MoneyWorkspaceV4.
 * Source-lock of ProductBottomNav / layout mounts lives in T3 policy.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("five-mode navigation", () => {
  it("MoneyModeNav satellite and rail shim are deleted", () => {
    expect(existsSync(resolve(process.cwd(), "components/money/MoneyModeNav.tsx"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "components/money/MoneyModeRail.tsx"))).toBe(false);
  });

  it("is not mounted as a primary rail or MoneyShell tab wall", () => {
    const shell = read("components/money/MoneyShell.tsx");
    const header = read("components/layout/AppHeader.tsx");
    expect(shell).not.toContain("MoneyModeNav");
    expect(header).not.toContain("MoneyModeNav");
    expect(header).not.toContain("MONEY_MODES");
  });
});
