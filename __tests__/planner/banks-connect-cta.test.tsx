// @vitest-environment jsdom
/**
 * Track Banks — Connect bank → /connections; demo Add account opens Institution + Account name.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => ({
  default: ({
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

const storeState = {
  accounts: [] as {
    id: string;
    institution: "chase";
    name: string;
    type: "checking";
    balance: number;
    available: number;
    mask: string;
    currency: string;
    lastSyncedAt: string | null;
    status: "linked";
  }[],
  bills: [] as unknown[],
  bankLinkStatus: "disconnected" as const,
  lastBankSyncAt: null as string | null,
  lastImpact: null,
  syncBanks: vi.fn(),
  disconnectAccount: vi.fn(),
  connectBank: vi.fn(),
  addBill: vi.fn(),
  updateBill: vi.fn(),
  deleteBill: vi.fn(),
  scheduleBill: vi.fn(),
};

vi.mock("@/lib/planner/store", () => {
  const usePlannerStore = (sel: (s: typeof storeState) => unknown) => sel(storeState);
  usePlannerStore.getState = () => storeState;
  return { usePlannerStore };
});

vi.mock("@/lib/planner/closed-loop", () => ({
  payBillWithImpact: vi.fn(),
}));

afterEach(() => {
  cleanup();
  storeState.accounts = [];
});

describe("BankingCommand Connect bank CTA", () => {
  it("keeps demo Add account and adds Connect bank → /connections", async () => {
    const { BankingCommand } = await import("@/components/planner/banking/BankingCommand");
    render(<BankingCommand />);

    expect(screen.getAllByRole("button", { name: /add account/i }).length).toBeGreaterThan(0);

    const connect = screen.getByRole("link", { name: /^connect bank$/i });
    expect(connect.getAttribute("href")).toBe("/connections");
  });

  it("keeps demo Link bank when accounts exist, still offers Connect bank", async () => {
    storeState.accounts = [
      {
        id: "a1",
        institution: "chase",
        name: "Checking",
        type: "checking",
        balance: 1200,
        available: 1200,
        mask: "1234",
        currency: "USD",
        lastSyncedAt: null,
        status: "linked",
      },
    ];
    const { BankingCommand } = await import("@/components/planner/banking/BankingCommand");
    render(<BankingCommand />);

    expect(screen.getByRole("button", { name: /link bank/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /^connect bank$/i }).getAttribute("href")).toBe(
      "/connections",
    );
  });

  it("opens demo Add account with Institution and Account name", async () => {
    const user = userEvent.setup();
    const { BankingCommand } = await import("@/components/planner/banking/BankingCommand");
    render(<BankingCommand />);

    await user.click(screen.getAllByRole("button", { name: /add account/i })[0]);
    expect(screen.getByLabelText("Institution")).toBeTruthy();
    expect(screen.getByLabelText("Account name")).toBeTruthy();
  });
});
