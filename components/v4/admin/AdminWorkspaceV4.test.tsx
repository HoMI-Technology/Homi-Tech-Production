// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { AdminWorkspaceV4 } from "@/components/v4/admin/AdminWorkspaceV4";
import { AdminMarketingV4 } from "@/components/v4/admin/AdminMarketingV4";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { V4_PRIMARY_NAV } from "@/lib/layout/v4-shell";
import {
  ADMIN_V4_USERS_EMPTY,
  adminV4VisualDrafts,
  adminV4VisualView,
} from "@/lib/v4/admin-workspace";

const nav = vi.hoisted(() => ({ pathname: "/admin" }));

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
  nav.pathname = "/admin";
});

function shell(child: ReactNode) {
  return (
    <ShellV4 greeting="Welcome back" firstName={null}>
      {child}
    </ShellV4>
  );
}

describe("Admin v4 in Shell v4", () => {
  it("empty selects Admin Home, no Ask, no Assess, no fake KPI", () => {
    const { container } = render(
      shell(<AdminWorkspaceV4 view={adminV4VisualView("empty")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-admin-v4-kind='empty']")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='home']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelector("[data-v4-workspace-chip='admin']")?.textContent).toMatch(
      /Admin\s*ops/,
    );
    expect(container.querySelector("[data-v4-rail-primary]")).toBeNull();
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Admin")).toBe(false);
    expect(text).toContain("Nothing needs attention.");
    expect(text).toContain("Nothing queued.");
    expect(text).not.toContain("Live ops only");
    expect(text).not.toContain("Attention above KPI");
    expect(container.querySelector("[data-admin-v4] .v4-system-meta")).toBeNull();
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
  });

  it("normal keeps Attention above KPI and uses live ops CTAs", () => {
    const { container } = render(
      shell(<AdminWorkspaceV4 view={adminV4VisualView("normal")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-admin-attention]")).not.toBeNull();
    expect(container.querySelector("[data-admin-v4-jobs]")).not.toBeNull();
    expect(text).toContain("Ops home.");
    expect(text).toContain("Open waitlist");
    expect(text).toContain("Users");
    expect(text).toContain("Orgs");
    expect(text).toContain("Assessments 7d");
    expect(text).toContain("Waitlist");
    expect(container.querySelectorAll(".dash-rail-cell")).toHaveLength(4);
    expect(text).not.toContain("Live ops only");
    expect(text).not.toContain("Attention above KPI");
    expect(container.querySelector("[data-admin-v4] .v4-system-meta")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(container.querySelector("[data-admin-v4-job='waitlist']")).not.toBeNull();
  });

  it("room empty is honest with a Refresh CTA — never a Clarity question", () => {
    nav.pathname = "/admin/users";
    const { container } = render(
      shell(
        <AdminRoomEmptyV4 title={ADMIN_V4_USERS_EMPTY} />,
      ),
    );
    const text = container.textContent ?? "";
    expect(text).toContain("No users yet.");
    expect(container.querySelector("[data-admin-v4-empty] button")?.textContent).toBe("Refresh");
    expect(container.querySelector("[data-admin-v4-empty] .v4-system-meta")).toBeNull();
    expect(text).not.toContain("Calm empty");
    expect(text).not.toMatch(/\?$/);
    expect(text).not.toContain("Clarity");
  });

  it("marketing lock shows Queue/Approve and disables Publish", () => {
    nav.pathname = "/admin/marketing";
    const { container } = render(
      shell(<AdminMarketingV4 assets={[]} drafts={adminV4VisualDrafts("normal")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-admin-v4-marketing]")).not.toBeNull();
    expect(text).toContain("Queue");
    expect(text).toContain("Approve");
    expect(text).toContain("Publish");
    expect(container.querySelector(".v4-admin-stage-pill.is-off")?.textContent).toBe("Publish");
    expect(container.querySelector("[data-admin-v4-draft='x']")).not.toBeNull();
    expect(container.querySelector("[data-admin-v4-draft='tiktok']")).not.toBeNull();
    expect(container.querySelector("[data-v4-ask-homi]")).toBeNull();
  });
});
