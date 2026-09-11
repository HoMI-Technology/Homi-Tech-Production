// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { PartnerWorkspaceV4 } from "@/components/v4/partner/PartnerWorkspaceV4";
import { V4_MORE_NAV, V4_PRIMARY_NAV } from "@/lib/layout/v4-shell";
import { partnerV4VisualView } from "@/lib/v4/partner-workspace";

const nav = vi.hoisted(() => ({ pathname: "/partner/dashboard" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => nav.pathname,
}));

afterEach(() => {
  cleanup();
  nav.pathname = "/partner/dashboard";
});

function shell(child: ReactNode) {
  return (
    <ShellV4 greeting="Welcome back" firstName={null}>
      {child}
    </ShellV4>
  );
}

describe("Partner v4 in Shell v4", () => {
  it("empty selects partner Home, Invite CTA, micro Clarity, no fake book", () => {
    const { container } = render(
      shell(<PartnerWorkspaceV4 view={partnerV4VisualView("empty")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-partner-v4-kind='empty']")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='home']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelector("[data-v4-workspace-chip='partner']")?.textContent).toMatch(
      /Partner\s*book/,
    );
    expect(container.querySelector("[data-v4-rail-primary]")).toBeNull();
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Partner")).toBe(false);
    expect(text).toContain("No clients in your book yet.");
    expect(text).toContain("Invite when you're ready — never invent a client list or scores.");
    expect(text).not.toContain("Money");
    expect(text).not.toContain("Compare");
    expect(container.querySelector("[data-partner-v4-pulse]")).toBeNull();
    expect(container.querySelector("[data-system-v4-cta]")?.textContent).toBe("Invite");
    expect(container.querySelector("[data-system-v4-cta]")?.getAttribute("href")).toBe("#invite");
    expect(container.querySelector(".v4-system-main")?.id).toBe("invite");
    expect(container.querySelector(".v4-system-title")?.closest("#invite")).not.toBeNull();
    expect(container.querySelector("[data-partner-invite]")?.id).not.toBe("invite");
    expect(container.querySelector("[data-v4-homi-header='micro']")).not.toBeNull();
    expect(container.querySelector("[data-partner-v4-homi] [data-wordmark]")).toBeNull();
    expect(container.querySelector("[data-partner-v4-homi] .v4-homi-mode")?.textContent).toBe(
      "Clarity",
    );
    expect(
      container.querySelectorAll("[data-system-v4-grid] > .v4-system-main > *").length,
    ).toBeLessThanOrEqual(3);
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    expect(text).not.toContain("HeroScore");
    expect(text).not.toContain("Switch only if");
    expect(text).not.toContain("CRAFT");
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this partner book...");
    expect(
      (container.querySelector("[data-partner-v4-homi-ask]") as HTMLInputElement | null)
        ?.placeholder,
    ).toBe("Ask HōMI about this partner book...");
  });

  it("invite-error fail-loud never paints a silent production link or On track", () => {
    const { container } = render(
      shell(<PartnerWorkspaceV4 view={partnerV4VisualView("invite-error")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-system-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("INVITE BLOCKED");
    expect(text).toContain("Origin missing.");
    expect(text).toMatch(/fail-loud/i);
    expect(container.querySelector("[data-system-v4-cta]")?.textContent).toBe("Retry invite");
    expect(container.querySelector("[data-system-v4-verdict]")?.textContent).toBe("INVITE BLOCKED");
    expect(container.querySelector(".v4-system-main")?.id).toBe("invite");
    expect(container.querySelector("[data-system-v4-hard-stop]")?.closest("#invite")).not.toBeNull();
    expect(text).not.toContain("shadow-score");
    expect(text).not.toContain("https://homitechnology.com");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("HeroScore");
    expect(text).not.toMatch(/\bOn track\b/);
  });

  it("normal shows live referral pulse with quiet age and no client scores", () => {
    const { container } = render(
      shell(<PartnerWorkspaceV4 view={partnerV4VisualView("normal")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-system-v4-age]")?.textContent).toMatch(/Synced 12m ago/);
    expect(container.querySelectorAll("[data-partner-v4-pulse]")).toHaveLength(2);
    expect(text).toContain("Your book.");
    expect(text).toContain("Referral · live");
    expect(text).toContain("SSOT");
    expect(text).toContain("Invite again");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this partner book...");
  });

  it("mobile Ask sheet is prompts only — no Open HōMI and no nav dump", () => {
    const { container } = render(
      shell(<PartnerWorkspaceV4 view={partnerV4VisualView("empty")} />),
    );
    fireEvent.focus(container.querySelector("[data-v4-ask-homi]") as HTMLInputElement);
    const sheet = container.querySelector("[data-v4-ask-sheet]");
    expect(sheet?.getAttribute("data-v4-ask-sheet")).toBe("ask-only");
    expect(container.querySelector("[data-v4-ask-open]")).toBeNull();
    expect(sheet?.textContent).not.toContain("Open HōMI");
    expect(sheet?.textContent).not.toMatch(/\bCompare\b/);
    expect(sheet?.textContent).not.toMatch(/\bAccounts\b/);
    expect(sheet?.textContent).toContain("Why no client scores");
  });

  it("mounts right HōMI as a workspace column, not a floating overlay", () => {
    const { container } = render(
      shell(<PartnerWorkspaceV4 view={partnerV4VisualView("empty")} />),
    );
    const homi = container.querySelector("[data-partner-v4-homi]");
    expect(homi).not.toBeNull();
    expect(homi?.classList.contains("v4-system-homi")).toBe(true);
    expect(container.querySelector("[data-v4-homi-rail]")).toBeNull();
    expect(container.querySelector("[data-partner-v4]")?.contains(homi)).toBe(true);
    expect(V4_MORE_NAV.some((item) => item.label === "Partner")).toBe(false);
  });
});
