// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { HomeV4 } from "@/components/v4/HomeV4";
import { buildHomeV4View } from "@/lib/v4/home-state";
import { homeV4VisualReading } from "@/lib/v4/visual-fixture";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/home",
}));

afterEach(() => {
  cleanup();
});

const MARKETING = ["Sign in", "How It Works", "Pricing", "Guides", "For Teams"];

describe("ShellV4 + HomeV4 presentation", () => {
  it("ships the 1440 workspace chrome without marketing items", () => {
    const view = buildHomeV4View(homeV4VisualReading("hard-stop"));
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <HomeV4 view={view} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";

    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-v4-left-nav]")).not.toBeNull();
    expect(container.querySelector("[data-v4-top-command]")).not.toBeNull();
    expect(container.querySelector("[data-v4-ask-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-command-assess]")).not.toBeNull();
    expect(container.querySelector("[data-v4-shell-compass]")).not.toBeNull();
    expect(container.querySelector(".v4-rail-lockup")).not.toBeNull();
    expect(container.querySelector("[data-v4-mobile-nav]")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-gauge] svg")).not.toBeNull();
    expect(container.querySelector(".v4-hero-primary")).not.toBeNull();
    expect(container.querySelector(".v4-hero-secondary")).not.toBeNull();

    expect(text).toContain("Home");
    expect(text).toContain("Money");
    expect(text).toContain("Path");
    expect(text).toContain("Compare");
    expect(text).toContain("Assess");
    // Command label is the workspace decision context, not the greeting.
    expect(text).toContain("Buying a home");
    expect(text).toContain("Personal");

    for (const label of MARKETING) {
      expect(text).not.toContain(label);
    }
    expect(text).not.toContain("Sign in");
    expect(container.querySelector("header.site-header")).toBeNull();
  });
});
