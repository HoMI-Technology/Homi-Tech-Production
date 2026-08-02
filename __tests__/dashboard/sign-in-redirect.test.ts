import { beforeEach, describe, expect, it, vi } from "vitest";

/** `redirect()` throws in Next; mock it so we can read the URL it was handed. */
const redirect = vi.fn((_url: string): never => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

const { signInNextParam, signInRedirect } = await import("@/lib/auth/signInRedirect");

describe("signInNextParam", () => {
  it("passes an already-rooted path through untouched", () => {
    expect(signInNextParam("/team")).toBe("/team");
    expect(signInNextParam("/partner/dashboard")).toBe("/partner/dashboard");
    expect(signInNextParam("/analytics")).toBe("/analytics");
  });

  it("normalizes missing leading slashes", () => {
    expect(signInNextParam("team")).toBe("/team");
    expect(signInNextParam("partner/dashboard")).toBe("/partner/dashboard");
  });
});

describe("signInRedirect", () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it("redirects to /auth/sign-in with the return path in `next`", async () => {
    await expect(signInRedirect("/partner/dashboard")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      "/auth/sign-in?next=%2Fpartner%2Fdashboard",
    );
  });

  it("normalizes the return path before encoding it", async () => {
    await expect(signInRedirect("team")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/auth/sign-in?next=%2Fteam");
  });

  it("encodes query strings in the return path so `next` survives the round trip", async () => {
    await expect(signInRedirect("/report/abc?tab=print")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(
      "/auth/sign-in?next=%2Freport%2Fabc%3Ftab%3Dprint",
    );
    const next = new URL(
      redirect.mock.calls[0][0],
      "https://homitechnology.com",
    ).searchParams.get("next");
    expect(next).toBe("/report/abc?tab=print");
  });
});
