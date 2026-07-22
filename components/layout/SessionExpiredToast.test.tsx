// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { SessionExpiredToast } from "./SessionExpiredToast";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/dashboard",
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * The toast watches same-origin /api/* responses for 401 (session died
 * mid-visit) and must never fire on other statuses or foreign origins —
 * a false positive would tell a signed-in user they were signed out.
 */
describe("SessionExpiredToast", () => {
  let realFetch: typeof fetch;

  beforeEach(() => {
    realFetch = window.fetch;
  });

  afterEach(() => {
    cleanup();
    window.fetch = realFetch;
  });

  function stubFetch(status: number) {
    window.fetch = vi.fn(async () => new Response(null, { status }));
  }

  it("stays hidden until a request fails with 401", () => {
    stubFetch(200);
    render(<SessionExpiredToast />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("appears when a same-origin /api request returns 401, linking back to the current page", async () => {
    stubFetch(401);
    render(<SessionExpiredToast />);
    await window.fetch("/api/assessments");

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Fdashboard",
    );
  });

  it("ignores 401s from foreign origins", async () => {
    stubFetch(401);
    render(<SessionExpiredToast />);
    await window.fetch("https://api.stripe.com/v1/prices");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores non-401 API failures", async () => {
    stubFetch(500);
    render(<SessionExpiredToast />);
    await window.fetch("/api/assessments");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("passes the response through untouched", async () => {
    stubFetch(401);
    render(<SessionExpiredToast />);
    const res = await window.fetch("/api/assessments");
    expect(res.status).toBe(401);
  });

  it("restores the original fetch on unmount", () => {
    stubFetch(200);
    const patched = window.fetch;
    const { unmount } = render(<SessionExpiredToast />);
    expect(window.fetch).not.toBe(patched);
    unmount();
    expect(window.fetch).toBe(patched);
  });
});
