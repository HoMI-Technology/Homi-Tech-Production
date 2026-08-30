// @vitest-environment jsdom
/**
 * First Moment handoff copy and continue/account CTAs stay locked to first-moment-copy.
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstMoment } from "@/components/marketing/FirstMoment";
import {
  ACCOUNT_THEN_ASSESSMENT_HREF,
  CONTINUE_ASSESSMENT_HREF,
  FIRST_MOMENT_BEATS,
  FIRST_MOMENT_HANDOFF_LINE,
} from "@/components/marketing/first-moment-copy";

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

afterEach(() => {
  cleanup();
});

describe("FirstMoment", () => {
  it("walks five locked beats and hands off to account then 45-q", async () => {
    const user = userEvent.setup();
    render(<FirstMoment />);

    expect(
      screen.getByRole("heading", { name: FIRST_MOMENT_BEATS[0].line }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: FIRST_MOMENT_BEATS[0].cta }));
    expect(
      screen.getByRole("heading", { name: FIRST_MOMENT_BEATS[1].line }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: FIRST_MOMENT_BEATS[1].cta }));
    expect(
      screen.getByRole("heading", { name: FIRST_MOMENT_BEATS[2].line }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: FIRST_MOMENT_BEATS[2].cta }));
    expect(
      screen.getByRole("heading", { name: FIRST_MOMENT_BEATS[3].line }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: FIRST_MOMENT_BEATS[3].cta }));
    expect(screen.getByRole("heading", { name: FIRST_MOMENT_HANDOFF_LINE })).toBeTruthy();

    const create = screen.getByRole("link", { name: "Create account" });
    const cont = screen.getByRole("link", { name: "Continue" });
    expect(create).toHaveAttribute("href", ACCOUNT_THEN_ASSESSMENT_HREF);
    expect(cont).toHaveAttribute("href", CONTINUE_ASSESSMENT_HREF);
    expect(screen.queryByRole("button", { name: FIRST_MOMENT_BEATS[0].cta })).toBeNull();
  });
});
