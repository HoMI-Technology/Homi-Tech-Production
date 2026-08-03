// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BudgetTab } from "@/components/finance/BudgetTab";

/**
 * Component-level coverage for the Budget tab: empty states, the add →
 * list → soft-delete flow, draft reset between modal opens, and goal
 * lifecycle — the wiring the pure-function tests cannot see.
 */

describe("BudgetTab", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // jsdom ships no matchMedia; useReducedMotion (framer-motion, via Modal)
    // calls it. Minimal stub — same pattern as Modal.test.tsx.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function renderTab() {
    render(<BudgetTab />);
    // The tab renders nothing until the ledger loads in an effect.
    await screen.findByRole("button", { name: "Add transaction" });
  }

  function addExpense(amount: string, description: string) {
    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: amount } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: description },
    });
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "cat-groceries" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
  }

  it("renders honest empty states with zeroed summary cards", async () => {
    await renderTab();

    expect(screen.getByText("Income")).toBeDefined();
    expect(screen.getByText("No transactions yet", { exact: false })).toBeDefined();
    expect(screen.getByText("No goal yet")).toBeDefined();
    expect(screen.getByText(/· in progress/)).toBeDefined();
    // A first visit must not write seed data.
    expect(window.localStorage.getItem("homi:budget-ledger")).toBeNull();
  });

  it("adds an expense, updates totals, persists, and soft-deletes", async () => {
    await renderTab();

    addExpense("1200", "Rent share");

    // Row and derived total both appear.
    expect(await screen.findByText("Rent share")).toBeDefined();
    expect(screen.getByText("Net expenses")).toBeDefined();
    expect(screen.getAllByText("−$1,200.00").length).toBeGreaterThan(0);

    // Persisted — and as a soft delete survivor set, not a hard wipe.
    const raw = window.localStorage.getItem("homi:budget-ledger");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).transactions).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Delete Rent share" }));
    expect(screen.queryByText("Rent share")).toBeNull();
    const after = JSON.parse(window.localStorage.getItem("homi:budget-ledger")!);
    expect(after.transactions).toHaveLength(1);
    expect(after.transactions[0].deletedAt).not.toBeNull();
  });

  it("blocks an uncategorized expense with an inline error", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Mystery" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    expect(screen.getByText("Expenses need a category.")).toBeDefined();
    expect(window.localStorage.getItem("homi:budget-ledger")).toBeNull();
  });

  it("resets the add form between opens — a cancelled draft never leaks", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "abandoned draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    expect((screen.getByLabelText("Description") as HTMLInputElement).value).toBe("");
  });

  it("creates a goal, shows pacing, and archives it reversibly", async () => {
    await renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Set a savings goal" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Down payment" } });
    fireEvent.change(screen.getByLabelText("Target amount"), { target: { value: "60000" } });
    fireEvent.change(screen.getByLabelText("Current balance"), { target: { value: "15000" } });
    fireEvent.change(screen.getByLabelText("Planned monthly contribution"), {
      target: { value: "1500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save goal" }));

    expect(await screen.findByText("Down payment")).toBeDefined();
    expect(screen.getByText("25%")).toBeDefined();
    expect(screen.getByText(/About 30 months to go/)).toBeDefined();

    // Archive is the way out — the record survives with status archived.
    fireEvent.click(screen.getByRole("button", { name: "Edit goal" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove goal" }));
    expect(await screen.findByText("No goal yet")).toBeDefined();
    const raw = JSON.parse(window.localStorage.getItem("homi:budget-ledger")!);
    expect(raw.goal.status).toBe("archived");
  });
});
