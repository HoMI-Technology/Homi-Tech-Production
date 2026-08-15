// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./WaitlistForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WaitlistForm", () => {
  it("posts email, interest, and source then shows the confirmation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<WaitlistForm source="landing" idPrefix="landing-waitlist" />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.click(screen.getByRole("button", { name: "Get notified" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "person@example.com",
        interest: "home-buying",
        source: "landing",
      }),
    });
    expect(
      await screen.findByText(/You’re on the list|You're on the list/i),
    ).toBeTruthy();
  });

  it("whisper surface keeps the same fields without a glass card", () => {
    const { container } = render(
      <WaitlistForm source="landing" idPrefix="landing-waitlist" surface="whisper" />,
    );
    expect(container.querySelector(".glass")).toBeNull();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("What brings you here?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Get notified" })).toBeTruthy();
  });
});
