// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextualHomiV4 } from "@/components/v4/ask/ContextualHomiV4";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { V4_MOBILE_TABS, V4_MORE_NAV, V4_PRIMARY_NAV, V4_SHELL_ASK_HREF } from "@/lib/layout/v4-shell";
import { askV4VisualView } from "@/lib/v4/contextual-homi";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/ask",
}));

afterEach(() => {
  cleanup();
});

describe("Contextual HōMI in Shell v4", () => {
  it("empty state is Assess-only with Home selected and no fake $", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("empty")} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-ask-v4]")).not.toBeNull();
    expect(container.querySelector("[data-ask-v4-empty]")).not.toBeNull();
    expect(container.querySelector("[data-ask-v4-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='home']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(V4_PRIMARY_NAV.some((item) => item.href === V4_SHELL_ASK_HREF)).toBe(false);
    expect(text).toContain("No assessment yet.");
    expect(text).toContain("no fake readiness");
    expect(container.querySelector("[data-ask-v4-cta]")?.getAttribute("href")).toBe("/assessment");
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    expect(text).not.toContain("CRAFT V4");
  });

  it("hard-stop ACTIVE stays explain-only and never paints On track or READY", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("hard-stop")} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-ask-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway is the hold.");
    expect(text).toContain("Hold first. Path still leads.");
    expect(text).toContain("never On track theater");
    expect(container.querySelector("[data-ask-v4-cta]")?.getAttribute("href")).toBe("/path");
    expect(text).not.toMatch(/\bREADY\b/);
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
  });

  it("default explains readiness, deep-links Path and Money, and labels illustrative cards", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("default")} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-ask-v4-default]")).not.toBeNull();
    expect(container.querySelector("[data-ask-v4-age]")?.textContent).toMatch(/Assessed Aug 29/i);
    const ask = container.querySelector("[data-ask-v4-default]");
    const askText = ask?.textContent ?? "";
    expect(askText).toContain("Path still leads.");
    expect(askText).not.toMatch(/you're ready/i);
    expect(askText).not.toMatch(/you're close/i);
    expect(askText).not.toContain("Tighten runway before offers");
    expect(text).toContain("never a second score");
    expect(container.querySelectorAll("[data-ask-v4-card]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-ask-v4-card]").length).toBeLessThanOrEqual(2);
    const hrefs = [...container.querySelectorAll("[data-ask-v4-card]")].map((node) =>
      node.getAttribute("href"),
    );
    expect(hrefs).toContain("/path");
    expect(hrefs).toContain("/money");
    expect(text).toContain("Educational");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
  });

  it("sets Ask HōMI about this readiness on the command field", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("empty")} />
      </ShellV4>,
    );
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this readiness...");
    const homiAsk = container.querySelector("[data-ask-v4-homi-ask]") as HTMLInputElement | null;
    expect(homiAsk?.placeholder).toBe("Ask HōMI about this readiness...");
  });

  it("mounts right HōMI as a workspace column, not a floating overlay", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("empty")} />
      </ShellV4>,
    );
    const homi = container.querySelector("[data-ask-v4-homi]");
    expect(homi).not.toBeNull();
    expect(homi?.classList.contains("v4-ask-homi")).toBe(true);
    expect(container.querySelector("[data-v4-homi-rail]")).toBeNull();
    expect(container.querySelector(".v4-ask")?.contains(homi)).toBe(true);
  });

  it("keeps Ask/HōMI under More, never a fifth mobile tab", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("empty")} />
      </ShellV4>,
    );
    expect(V4_MOBILE_TABS.map((item) => item.label)).toEqual(["Home", "Money", "Path"]);
    expect(V4_MOBILE_TABS.some((item) => item.label === "Ask HōMI")).toBe(false);
    expect(V4_MORE_NAV.some((item) => item.label === "Ask HōMI")).toBe(true);
    expect(container.querySelector("[data-v4-mobile-tab='ask hōmi']")).toBeNull();
    expect(container.querySelectorAll("[data-v4-mobile-tab]")).toHaveLength(4);
    fireEvent.click(container.querySelector("[data-v4-mobile-tab='more']") as HTMLButtonElement);
    expect(container.querySelector("[data-v4-more-sheet]")).not.toBeNull();
    expect(container.querySelector("[data-v4-more-list]")?.textContent).toContain("Ask HōMI");
  });

  it("opens Ask as a sheet from the top command, not a typing theater", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <ContextualHomiV4 view={askV4VisualView("empty")} />
      </ShellV4>,
    );
    fireEvent.focus(container.querySelector("[data-v4-ask-homi]") as HTMLInputElement);
    expect(container.querySelector("[data-v4-ask-sheet]")).not.toBeNull();
    expect(container.querySelector("[data-v4-ask-open]")?.textContent).toMatch(/Open HōMI/);
    expect(container.textContent).not.toContain("Homie");
    expect(container.querySelector("[data-v4-ask-sheet]")?.textContent).not.toMatch(/typing/i);
  });
});
