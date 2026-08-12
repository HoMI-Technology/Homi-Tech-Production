// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PageTransition } from "./PageTransition";

let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
}));

describe("PageTransition", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("wraps children in a pathname-keyed transition stage", () => {
    render(
      <PageTransition>
        <p>dashboard body</p>
      </PageTransition>,
    );
    const wrapper = screen.getByTestId("product-page-transition");
    expect(wrapper).toContainElement(screen.getByText("dashboard body"));
  });

  it("survives a pathname change without runtime errors", () => {
    const { rerender } = render(
      <PageTransition>
        <p>first page</p>
      </PageTransition>,
    );
    mockPathname = "/money";
    expect(() =>
      rerender(
        <PageTransition>
          <p>second page</p>
        </PageTransition>,
      ),
    ).not.toThrow();
    expect(screen.getAllByTestId("product-page-transition").length).toBeGreaterThan(0);
  });
});
