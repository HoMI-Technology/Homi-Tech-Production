/** @vitest-environment jsdom */

/**
 * SecuritySection authenticator enrollment: the path admins are sent to when
 * the console asks for two-factor setup. Enroll → QR + setup key → verify
 * code must work end to end against the Supabase MFA client surface.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecuritySection } from "@/components/settings/SecuritySection";

const mocks = vi.hoisted(() => ({
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      updateUser: mocks.updateUser,
      mfa: {
        listFactors: mocks.listFactors,
        enroll: mocks.enroll,
        challengeAndVerify: mocks.challengeAndVerify,
        unenroll: mocks.unenroll,
      },
    },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SecuritySection authenticator enrollment", () => {
  it("offers enrollment when no authenticator is connected", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] } });
    render(<SecuritySection />);
    expect(
      await screen.findByRole("button", { name: "Add an authenticator app" }),
    ).toBeInTheDocument();
  });

  it("walks enroll → QR/setup key → verify → done", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] } });
    mocks.enroll.mockResolvedValue({
      data: {
        id: "factor-1",
        totp: { qr_code: "<svg data-testid='qr'></svg>", secret: "JBSWY3DPEHPK3PXP" },
      },
      error: null,
    });
    mocks.challengeAndVerify.mockResolvedValue({ data: {}, error: null });

    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(await screen.findByRole("button", { name: "Add an authenticator app" }));

    expect(mocks.enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    // Setup key visible for manual entry, and the code field is ready.
    expect(await screen.findByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();

    await user.type(screen.getByLabelText("6-digit code"), "654321");
    await user.click(screen.getByRole("button", { name: "Verify and finish" }));

    await waitFor(() => {
      expect(mocks.challengeAndVerify).toHaveBeenCalledWith({
        factorId: "factor-1",
        code: "654321",
      });
    });
    expect(await screen.findByText(/Authenticator added/i)).toBeInTheDocument();
  });

  it("shows a clear error when the enrollment code doesn't match", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] } });
    mocks.enroll.mockResolvedValue({
      data: {
        id: "factor-1",
        totp: { qr_code: "<svg></svg>", secret: "JBSWY3DPEHPK3PXP" },
      },
      error: null,
    });
    mocks.challengeAndVerify.mockResolvedValue({
      data: null,
      error: new Error("invalid"),
    });

    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(await screen.findByRole("button", { name: "Add an authenticator app" }));
    await user.type(await screen.findByLabelText("6-digit code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify and finish" }));

    expect(await screen.findByText(/didn't match/i)).toBeInTheDocument();
  });

  it("cancel sweeps up the half-created factor", async () => {
    mocks.listFactors.mockResolvedValue({ data: { totp: [] } });
    mocks.enroll.mockResolvedValue({
      data: {
        id: "factor-1",
        totp: { qr_code: "<svg></svg>", secret: "JBSWY3DPEHPK3PXP" },
      },
      error: null,
    });
    mocks.unenroll.mockResolvedValue({ data: {}, error: null });

    const user = userEvent.setup();
    render(<SecuritySection />);
    await user.click(await screen.findByRole("button", { name: "Add an authenticator app" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(mocks.unenroll).toHaveBeenCalledWith({ factorId: "factor-1" });
    });
  });
});
