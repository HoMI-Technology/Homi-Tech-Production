// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QuotaNotice, type QuotaNoticeData } from "@/components/advisor/QuotaNotice";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const MONTHLY: QuotaNoticeData = {
  scope: "monthly",
  title: "You've used this month's messages.",
  resetsAt: "2026-09-01T00:00:00.000Z",
  canUpgrade: true,
  upgradeHref: "/pricing",
  upgradeLabel: "See plans",
  nextTierName: "HōMI Plus",
};

const TOP_TIER: QuotaNoticeData = {
  scope: "daily",
  title: "You've used today's messages.",
  resetsAt: "2026-08-15T00:00:00.000Z",
  canUpgrade: false,
};

const UNKNOWN: QuotaNoticeData = {
  scope: null,
  title: "You've reached your message limit.",
  resetsAt: null,
  canUpgrade: true,
  upgradeHref: "/pricing",
  upgradeLabel: "See plans",
  nextTierName: "HōMI Plus",
};

afterEach(() => {
  cleanup();
  delete (window as { __homiEvents?: unknown }).__homiEvents;
});

describe("QuotaNotice", () => {
  it("is not a chat turn — no avatar, no first person", () => {
    const { container } = render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    // The Companion's turns carry the Threshold Compass avatar; this must not.
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/\b(I|I'm|I've|my)\b/);
  });

  it("names the month when the month ran out", () => {
    render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    expect(screen.getByText("You've used this month's messages.")).toBeTruthy();
  });

  it("carries NO conversion CTA — forbidden on the Companion surface", () => {
    // homi-product-ui: "Companion | Forbidden as owner: Conversion CTAs".
    // Founder took the strict reading 2026-08-23. MONTHLY still carries canUpgrade
    // and an upgradeHref on the payload; this surface must not render them.
    const { container } = render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    expect(container.querySelectorAll("a").length).toBe(0);
    expect(container.textContent ?? "").not.toMatch(/see plans|upgrade|pricing|higher limits/i);
  });

  it("offers no upgrade path at top tier either", () => {
    const { container } = render(<QuotaNotice data={TOP_TIER} onDismiss={() => {}} />);
    expect(container.querySelectorAll("a").length).toBe(0);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
  });

  it("claims no reset window when the scope is unknown", () => {
    const { container } = render(<QuotaNotice data={UNKNOWN} onDismiss={() => {}} />);
    expect(container.textContent ?? "").not.toMatch(/Resets/);
  });

  it("always leaves a way out", () => {
    for (const data of [MONTHLY, TOP_TIER, UNKNOWN]) {
      render(<QuotaNotice data={data} onDismiss={() => {}} />);
      expect(screen.getByRole("button", { name: "Dismiss" })).toBeTruthy();
      cleanup();
    }
  });

  it("carries no fabricated social proof or urgency", () => {
    const { container } = render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    const text = container.textContent ?? "";
    for (const banned of [
      /\d[\d,]*\s*(users|teams|members|people)/i,
      /join \d/i,
      /limited time|hurry|act now|expires? (in|soon)|don't miss|last chance/i,
      /less than a (coffee|latte)/i,
      /you'?ll lose|you will lose/i,
    ]) {
      expect(text).not.toMatch(banned);
    }
  });

  it("records an impression without leaking scores or PII", () => {
    render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    const events = (window as { __homiEvents?: Array<{ event: string; props?: object }> })
      .__homiEvents;
    expect(events?.some((e) => e.event === "quota_notice_shown")).toBe(true);
    const props = JSON.stringify(
      events?.find((e) => e.event === "quota_notice_shown")?.props ?? {},
    );
    // Occurrence-only contract in lib/analytics.ts.
    expect(props).not.toMatch(/score|verdict|email|@/i);
  });

  it("a monthly reset never reads as landing inside the same month", () => {
    // The quota rolls at UTC midnight, which in US Eastern is 8:00 PM the previous
    // evening — so a bare date rendered "this month's messages ... Resets Aug 31."
    // The clock time is what disambiguates it. Guard holds for any zone west of UTC.
    const { container } = render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    const reset = container.textContent ?? "";
    expect(reset).toMatch(/Resets/);
    // A time component must be present, not just a calendar date.
    expect(reset).toMatch(/\d{1,2}:\d{2}/);
  });

  it("re-fires an impression after dismiss and re-trip (unmount resets the effect)", () => {
    const { unmount } = render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    unmount();
    render(<QuotaNotice data={MONTHLY} onDismiss={() => {}} />);
    const events = (window as { __homiEvents?: Array<{ event: string }> }).__homiEvents ?? [];
    expect(events.filter((e) => e.event === "quota_notice_shown").length).toBe(2);
  });
});
