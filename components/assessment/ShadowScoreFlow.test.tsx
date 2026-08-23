// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShadowScoreFlow } from "./ShadowScoreFlow";
import {
  SHADOW_READ_DISCLAIMER,
  SHADOW_READ_HELPER,
  SHADOW_READ_KICKER,
  SHADOW_READ_PRIMARY_CTA,
  SHADOW_READ_PRIMARY_HREF,
  SHADOW_READ_SECONDARY_CTA,
  SHADOW_READ_SEE_BUTTON,
  SHADOW_READ_TITLE,
} from "@/lib/assessment/shadow-read";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

async function completeRead() {
  const user = userEvent.setup();
  const [income, debt] = screen.getAllByRole("textbox");
  await user.type(income, "6500");
  await user.type(debt, "800");
  await user.click(screen.getByRole("button", { name: /continue/i }));

  await user.click(screen.getByRole("button", { name: /continue/i }));

  await user.click(screen.getByRole("radio", { name: /6–12 months/i }));
  await user.click(screen.getByRole("button", { name: SHADOW_READ_SEE_BUTTON }));
}

describe("ShadowScoreFlow — 90-second read", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("lets a guest finish three questions and stay on the read", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<ShadowScoreFlow />);

    expect(screen.getAllByText(SHADOW_READ_TITLE).length).toBeGreaterThan(0);
    expect(screen.getByText(SHADOW_READ_KICKER)).toBeInTheDocument();
    expect(screen.getByText(/question 1 of 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/question 1 of 6/i)).not.toBeInTheDocument();

    await completeRead();

    expect(
      screen.getByText("You put monthly income at $6,500 and monthly debt payments at $800."),
    ).toBeInTheDocument();
    expect(screen.getByText(/On whether buying is the right move, you marked/)).toBeInTheDocument();
    expect(screen.getByText("You’re planning to buy in 6–12 months.")).toBeInTheDocument();
    expect(screen.getByText(SHADOW_READ_DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByText(SHADOW_READ_HELPER)).toBeInTheDocument();

    const primary = screen.getByRole("link", { name: SHADOW_READ_PRIMARY_CTA });
    expect(primary).toHaveAttribute("href", SHADOW_READ_PRIMARY_HREF);
    expect(primary.getAttribute("href")).not.toContain("/results");
    expect(screen.getByRole("link", { name: SHADOW_READ_SECONDARY_CTA })).toHaveAttribute(
      "href",
      "/",
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("homi:last-assessment")).toBeNull();
    expect(screen.queryByText(/Decision Readiness Score/)).not.toBeInTheDocument();
    expect(screen.queryByText(/out of 100/)).not.toBeInTheDocument();
    expect(screen.queryByText(/See my Shadow Score/)).not.toBeInTheDocument();
    expect(screen.queryByText(/READY/)).not.toBeInTheDocument();
  });

  it("does not navigate to /results on submit", async () => {
    render(<ShadowScoreFlow />);
    await completeRead();
    expect(screen.getByText(SHADOW_READ_DISCLAIMER)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /results/i })).not.toBeInTheDocument();
  });

  it("does not render unused stems", () => {
    render(<ShadowScoreFlow />);
    expect(screen.queryByText(/emergency/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/credit score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/outside pressure/i)).not.toBeInTheDocument();
  });
});
