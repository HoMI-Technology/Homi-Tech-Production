// @vitest-environment jsdom
/**
 * Mobile bottom bar is HōMI + Assess only — not a Money cockpit.
 * Source-lock of MONEY_MODES imports lives in T3 policy.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
}));

import { ProductBottomNav } from "@/components/layout/ProductBottomNav";
import { HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

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

});
