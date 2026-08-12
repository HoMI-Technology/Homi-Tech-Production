/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { HouseholdJointPanel } from "@/components/household/HouseholdJointPanel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mockHouseholdGet(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/household") && !url.includes("invite")) {
        return new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
}

describe("HouseholdJointPanel", () => {
  it("labels the empty-state household name field", async () => {
    mockHouseholdGet({ household: null, members: [], configured: true });
    render(<HouseholdJointPanel />);
    expect(
      await screen.findByLabelText("Household name"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create household" }),
    ).toBeInTheDocument();
  });

  it("labels the invite email field after a household exists", async () => {
    mockHouseholdGet({
      household: { id: "hh-1", name: "Ours" },
      members: [
        {
          user_id: "u1",
          role: "owner",
          display_name: "Kim",
          last_score: null,
          last_verdict: null,
          last_assessment_at: null,
        },
      ],
      configured: true,
    });
    render(<HouseholdJointPanel />);
    expect(await screen.findByText("Ours")).toBeInTheDocument();
    expect(screen.getByLabelText("Partner email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create invite link" }),
    ).toBeInTheDocument();
  });

  it("labels the accept-invite display name when a token is present", async () => {
    window.history.replaceState({}, "", "/household?invite=abc123token");
    mockHouseholdGet({ household: null, members: [], configured: true });
    render(<HouseholdJointPanel />);
    expect(
      await screen.findByLabelText("Your display name"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Join household" }),
    ).toBeInTheDocument();
  });

  it("surfaces a sign-in error when the session is missing", async () => {
    mockHouseholdGet({ error: "Not authenticated." }, 401);
    render(<HouseholdJointPanel />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Sign in to manage a household.",
      );
    });
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=/household",
    );
  });
});
