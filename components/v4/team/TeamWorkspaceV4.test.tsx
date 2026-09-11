// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { TeamWorkspaceV4 } from "@/components/v4/team/TeamWorkspaceV4";
import { V4_PRIMARY_NAV } from "@/lib/layout/v4-shell";
import { teamV4VisualView } from "@/lib/v4/team-workspace";

const nav = vi.hoisted(() => ({ pathname: "/team" }));

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
  nav.pathname = "/team";
});

function shell(child: ReactNode) {
  return (
    <ShellV4 greeting="Welcome back" firstName={null}>
      {child}
    </ShellV4>
  );
}

describe("Team v4 in Shell v4", () => {
  it("empty selects Team Home, no Ask, no Assess, no fake KPI", () => {
    const { container } = render(shell(<TeamWorkspaceV4 view={teamV4VisualView("empty")} />));
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-team-v4-kind='empty']")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='home']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelector("[data-v4-workspace-chip='team']")?.textContent).toMatch(
      /Team\s*aggregate/,
    );
    expect(container.querySelector("[data-v4-rail-primary]")).toBeNull();
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Team")).toBe(false);
    expect(text).toContain("No team yet.");
    expect(container.querySelector("[data-team-v4] .v4-system-meta")).toBeNull();
    expect(container.querySelector(".dash-rail")).toBeNull();
    expect(text).not.toContain("Money");
    expect(text).not.toContain("Compare");
    expect(container.querySelector("[data-v4-ask-homi]")).toBeNull();
    expect(container.querySelector("[data-v4-command-assess]")).toBeNull();
    expect(container.querySelector("[data-admin-v4-lock]")?.textContent).toMatch(/No Ask/);
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toContain("HeroScore");
    expect(text).not.toContain("Clarity");
    expect(container.querySelector("[data-team-v4-cta]")?.textContent).toBe("Refresh");
  });

  it("normal keeps live aggregate tiles only — no AttentionStrip echo", () => {
    const { container } = render(shell(<TeamWorkspaceV4 view={teamV4VisualView("normal")} />));
    const text = container.textContent ?? "";
    expect(text).toContain("Team aggregate.");
    expect(text).toContain("Members covered");
    expect(text).toContain("Participation");
    expect(text).toContain("Org pulse");
    expect(text).toContain("Live aggregate · no individual scores");
    expect(container.querySelectorAll(".dash-rail-cell")).toHaveLength(3);
    expect(container.querySelector("[data-admin-attention]")).toBeNull();
    expect(container.querySelector("[data-team-v4] .v4-system-meta")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Avg score");
  });

  it("stale is honest with Retry — never invents metrics", () => {
    const { container } = render(shell(<TeamWorkspaceV4 view={teamV4VisualView("stale")} />));
    const text = container.textContent ?? "";
    expect(text).toContain("Can't refresh team.");
    expect(text).toContain("Stale · reconnect");
    expect(container.querySelector("[data-team-v4-cta]")?.textContent).toBe("Retry");
    expect(container.querySelector("[data-team-v4] .v4-system-meta")).toBeNull();
    expect(container.querySelector(".dash-rail")).toBeNull();
    expect(text).not.toContain("Clarity");
  });
});
