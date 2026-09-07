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

describe("signed-in /assessment uses quiet top-bar shell v3", () => {
  it("mounts AppHeader in main's product chrome — not AssessmentShell", () => {
    render(
      <ProductLayoutRouter user email={null}>
        <p>walk</p>
      </ProductLayoutRouter>,
    );

    expect(document.querySelector("[data-app-shell='v3']")).not.toBeNull();
    expect(document.querySelector("main#main")).not.toBeNull();
    expect(document.querySelector(".assessment-focus-bar")).toBeNull();
    expect(document.querySelector(".assessment-focus-shell")).toBeNull();
    expect(document.body.textContent).not.toContain("Intelligence Gathering");
    const compasses = document.querySelectorAll('[aria-label*="Threshold Compass"]');
    expect(compasses).toHaveLength(1);
    expect(compasses[0]?.closest("main#main")).toBeNull();
  });
});
