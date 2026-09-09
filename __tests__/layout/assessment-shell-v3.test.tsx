// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/assessment",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/components/layout/CommandPalette", () => ({
  CommandPalette: () => null,
}));

import { ProductLayoutRouter } from "@/components/layout/ProductLayoutRouter";

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
});

afterEach(() => {
  cleanup();
});

describe("signed-in /assessment uses PR10 left-rail chrome", () => {
  it("mounts the left rail in product chrome — not AssessmentShell, no craft badge", () => {
    render(
      <ProductLayoutRouter user shell="personal" email={null}>
        <p>walk</p>
      </ProductLayoutRouter>,
    );

    expect(document.querySelector("[data-app-shell='pr10-rail']")).not.toBeNull();
    expect(document.querySelector("[data-left-rail]")).not.toBeNull();
    expect(document.querySelector('[data-product-shell="personal"]')).not.toBeNull();
    expect(document.querySelector('[data-invent-chrome="pr13"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Assessment");
    expect(document.body.textContent).toContain("Finances");
    expect(document.body.textContent).toContain("Plans");
    expect(document.body.textContent).toContain("Bills");
    expect(document.body.textContent).toContain("Insights");
    expect(document.body.textContent).toContain("Learn");
    expect(document.body.textContent).toContain("Companion");
    expect(document.body.textContent).toContain("Tools");
    expect(document.querySelector("main#main")).not.toBeNull();
    expect(document.querySelector(".assessment-focus-bar")).toBeNull();
    expect(document.querySelector(".assessment-focus-shell")).toBeNull();
    expect(document.body.textContent).not.toContain("Intelligence Gathering");
    const compasses = document.querySelectorAll('[aria-label*="Threshold Compass"]');
    expect(compasses).toHaveLength(1);
    expect(compasses[0]?.closest("main#main")).toBeNull();
    expect(document.querySelector("[data-shell-floor]")).toBeNull();
    expect(document.body.textContent).not.toContain("CRAFT · PR10");
    expect(document.body.textContent).not.toContain("NOT SHIP");
    expect(document.body.textContent).not.toContain("Craft v3");
    expect(document.body.textContent).not.toContain("PR2 floor");
  });
});
