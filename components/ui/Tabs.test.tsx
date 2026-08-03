// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Tabs, TabPanel, type TabItem } from "./Tabs";

const TABS: TabItem<"overview" | "cashflow" | "debt">[] = [
  { key: "overview", label: "Overview" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "debt", label: "Debt" },
];

function Harness({ hashSync = false }: { hashSync?: boolean }) {
  const [value, setValue] = useState<(typeof TABS)[number]["key"]>("overview");
  return (
    <>
      <Tabs
        tabs={TABS}
        value={value}
        onChange={setValue}
        idPrefix="t"
        ariaLabel="Test sections"
        hashSync={hashSync}
      />
      <TabPanel idPrefix="t" value={value}>
        panel: {value}
      </TabPanel>
    </>
  );
}

describe("Tabs", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("wires tablist / tab / tabpanel ARIA correctly", () => {
    render(<Harness />);

    const tablist = screen.getByRole("tablist", { name: "Test sections" });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);

    const selected = screen.getByRole("tab", { name: "Overview" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("aria-selected", "false");

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "t-panel-overview");
    expect(panel).toHaveAttribute("aria-labelledby", "t-tab-overview");
    expect(selected).toHaveAttribute("aria-controls", "t-panel-overview");
  });

  it("uses a roving tabindex — only the selected tab is tabbable", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Cash Flow" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("tabindex", "-1");
  });

  it("selects on click and swaps the panel", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("tab", { name: "Debt" }));
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("panel: debt");
  });

  it("moves selection and focus with ArrowRight / ArrowLeft, wrapping at the ends", () => {
    render(<Harness />);
    const overview = screen.getByRole("tab", { name: "Overview" });

    fireEvent.keyDown(overview, { key: "ArrowRight" });
    const cashflow = screen.getByRole("tab", { name: "Cash Flow" });
    expect(cashflow).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(cashflow);

    fireEvent.keyDown(cashflow, { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("tab", { name: "Debt" }), { key: "ArrowRight" });
    // wrapped: debt → overview
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowLeft" });
    // wrapped backwards: overview → debt
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("aria-selected", "true");
  });

  it("jumps to first/last with Home / End", () => {
    render(<Harness />);
    const overview = screen.getByRole("tab", { name: "Overview" });

    fireEvent.keyDown(overview, { key: "End" });
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Debt" }), { key: "Home" });
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("hashSync: initializes the active tab from the URL hash", () => {
    window.history.replaceState(null, "", "#debt");
    render(<Harness hashSync />);
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("aria-selected", "true");
  });

  it("hashSync: mirrors tab changes into the hash", () => {
    render(<Harness hashSync />);
    fireEvent.click(screen.getByRole("tab", { name: "Cash Flow" }));
    expect(window.location.hash).toBe("#cashflow");
  });

  it("hashSync: follows external hashchange navigation", () => {
    render(<Harness hashSync />);
    window.history.replaceState(null, "", "#debt");
    fireEvent(window, new Event("hashchange"));
    expect(screen.getByRole("tab", { name: "Debt" })).toHaveAttribute("aria-selected", "true");
  });

  it("without hashSync, never touches the URL", () => {
    window.history.replaceState(null, "", "#debt");
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Cash Flow" }));
    expect(window.location.hash).toBe("#debt");
  });
});
