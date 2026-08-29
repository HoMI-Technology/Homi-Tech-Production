// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
}));

import { ProductBottomNav } from "@/components/layout/ProductBottomNav";
import { HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

afterEach(() => {
  cleanup();
  mockPathname = "/dashboard";
});

describe("ProductBottomNav — <lg global bar", () => {
  it("primary tabs are HōMI + Assess — not a money cockpit", () => {
    render(<ProductBottomNav />);

    const bar = document.querySelector("[data-product-bottom-nav]");
    expect(bar).not.toBeNull();
    expect(bar?.className).toMatch(/lg:hidden/);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => [link.getAttribute("href"), link.textContent?.trim()])).toEqual([
      ["/dashboard", "HōMI"],
      ["/assessment", "Assess"],
    ]);

    expect(screen.queryByRole("link", { name: /readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^home$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^money$/i })).not.toBeInTheDocument();
    for (const label of ["Reality", "Decide", "Plan", "Goals"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: /companion|advisor/i })).not.toBeInTheDocument();

    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).toContain("/dashboard");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).toContain("/assessment");
    expect(HEADER_PRIMARY_NAV.map((i) => i.href)).not.toContain("/money");
  });

  it("does not deep-link money modes or /advisor as global tabs", () => {
    mockPathname = "/money";
    render(<ProductBottomNav />);

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/dashboard", "/assessment"]);
    expect(hrefs).not.toContain("/money");
    expect(hrefs).not.toContain("/money/decide");
    expect(hrefs).not.toContain("/money/plan");
    expect(hrefs).not.toContain("/money/goals");
    expect(hrefs).not.toContain("/advisor");
    expect(screen.getByRole("link", { name: "HōMI" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Assess" }).getAttribute("aria-current")).toBeNull();
  });

  it("source does not import MONEY_MODES or local-ledger", () => {
    const src = read("components/layout/ProductBottomNav.tsx");
    expect(src).toContain('label: "HōMI"');
    expect(src).toContain('label: "Assess"');
    expect(src).toContain("lg:hidden");
    expect(src).not.toContain("MONEY_MODES");
    expect(src).not.toContain("MoneyModeNav");
    expect(src).not.toContain("/money");
    expect(src).not.toContain("/advisor");
    expect(src).not.toContain("Reality");
    expect(src).not.toContain("Decide");
    expect(src).not.toContain("Goals");
    expect(src).not.toMatch(/label: "Home"/);
    expect(src).not.toMatch(/label: "Money"/);
    expect(src).not.toMatch(/label: "Readiness"/);
  });
});
