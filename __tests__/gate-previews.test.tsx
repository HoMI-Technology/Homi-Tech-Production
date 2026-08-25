// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { UpgradePanel } from "@/components/ui/UpgradePanel";
import {
  AdvancedToolsPreview,
  CouplesPreview,
  HouseholdPreview,
} from "@/components/entitlements/GatePreviews";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe("gate previews", () => {
  it.each([
    ["advanced tools", <AdvancedToolsPreview key="a" />],
    ["couples", <CouplesPreview key="c" />],
    ["household", <HouseholdPreview key="h" />],
  ] as const)("%s preview is labelled as an example", (_name, preview) => {
    render(<UpgradePanel feature="f" minTier="pro" body="b" preview={preview} />);
    expect(screen.getByText(/Example — not your numbers/i)).toBeTruthy();
  });

  it("the label is NOT inside the aria-hidden region", () => {
    // Marking the whole figure decorative would hide "Example" from screen readers
    // while still showing the numbers to everyone else — the unlabeled-number problem
    // with extra steps. homi-product-ui: "Unlabeled numbers ship."
    const { container } = render(
      <UpgradePanel feature="f" minTier="pro" body="b" preview={<HouseholdPreview />} />,
    );
    const caption = screen.getByText(/Example — not your numbers/i);
    expect(caption.closest("[aria-hidden]")).toBeNull();
    // ...while the drawing itself stays out of the accessibility tree.
    expect(container.querySelector("figure [aria-hidden]")).not.toBeNull();
  });

  it("renders no preview chrome when no preview is supplied", () => {
    const { container } = render(<UpgradePanel feature="f" minTier="pro" body="b" />);
    expect(container.querySelector("figure")).toBeNull();
    expect(screen.queryByText(/Example/i)).toBeNull();
  });

  it("previews import no charting library or tool engine", () => {
    // UpgradePanel sits in the static import graph of all seven /tools/* pages plus
    // the report and household surfaces. Pulling a chart library through it would
    // ship recharts to /tools/mortgage, which has almost no Lighthouse script
    // headroom. These are drawings, not computations.
    const src = readFileSync("components/entitlements/GatePreviews.tsx", "utf8");
    const importLines = (src.match(/^import .*$/gm) ?? []).join(" ");
    expect(importLines).not.toMatch(/recharts|chart\.js|d3-|victory|nivo/);
    expect(importLines).not.toMatch(/lib\/tools|lib\/scoring/);
  });

  it("carries no fabricated social proof or urgency", () => {
    const { container } = render(
      <UpgradePanel
        feature="advanced-tools"
        minTier="pro"
        body="Advanced finance tools are part of HōMI Pro."
        preview={<AdvancedToolsPreview />}
      />,
    );
    const text = container.textContent ?? "";
    for (const banned of [
      /\d[\d,]*\s*(users|teams|members|people)/i,
      /join \d/i,
      /limited time|hurry|act now|expires? (in|soon)|last chance/i,
      /less than a (coffee|latte)/i,
      /you'?ll lose|you will lose/i,
    ]) {
      expect(text).not.toMatch(banned);
    }
  });
});
