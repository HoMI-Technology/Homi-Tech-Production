/** @vitest-environment jsdom */

/**
 * AdminAccessWall contract: the two MFA denial states are guided paths, not
 * dead ends. Temporary founder waiver (2026-09-08) skips these walls in
 * evaluateAdminAccess when requireMfa is off — this file proves the
 * enrollment UX is kept, not deleted. needs-enrollment links to authenticator
 * setup in settings; needs-stepup verifies the second factor inline.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminAccessWall } from "@/components/admin/AdminAccessWall";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      mfa: {
        listFactors: mocks.listFactors,
        challengeAndVerify: mocks.challengeAndVerify,
      },
    },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminAccessWall", () => {
  it("keeps Settings → Security authenticator setup (waiver must not delete this UX)", () => {
    render(<AdminAccessWall reason="needs-enrollment" signedIn />);
    expect(screen.getByRole("link", { name: "Set up two-factor" })).toHaveAttribute(
      "href",
      "/settings#security",
    );
  });

  it("needs-enrollment is a guided setup state with steps, not a dead 403", () => {
    render(<AdminAccessWall reason="needs-enrollment" signedIn />);
    expect(
      screen.getByRole("heading", { name: "Set up your authenticator" }),
    ).toBeInTheDocument();
    // Clear, actionable steps in the body copy.
    expect(screen.getByText(/scan the QR code/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set up two-factor" })).toHaveAttribute(
      "href",
      "/settings#security",
    );
  });

  it("needs-stepup verifies the code inline and refreshes into the console", async () => {
    mocks.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });
    mocks.challengeAndVerify.mockResolvedValue({ data: {}, error: null });

    const user = userEvent.setup();
    render(<AdminAccessWall reason="needs-stepup" signedIn />);

    expect(screen.getByRole("heading", { name: "One more step" })).toBeInTheDocument();
    const input = screen.getByLabelText("Authenticator code");
    await user.type(input, "123456");
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() => {
      expect(mocks.challengeAndVerify).toHaveBeenCalledWith({
        factorId: "factor-1",
        code: "123456",
      });
    });
    await waitFor(() => {
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("needs-stepup shows a clear error and stays put when the code is wrong", async () => {
    mocks.listFactors.mockResolvedValue({
      data: { totp: [{ id: "factor-1", status: "verified" }] },
      error: null,
    });
    mocks.challengeAndVerify.mockResolvedValue({
      data: null,
      error: new Error("invalid code"),
    });

    const user = userEvent.setup();
    render(<AdminAccessWall reason="needs-stepup" signedIn />);
    await user.type(screen.getByLabelText("Authenticator code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/didn't match/i);
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("not-admin stays a firm denial with a way back", () => {
    render(<AdminAccessWall reason="not-admin" signedIn />);
    expect(screen.getByRole("heading", { name: "Admin access required" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
