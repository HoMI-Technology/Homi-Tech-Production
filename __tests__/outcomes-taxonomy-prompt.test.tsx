// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";

const updates: Record<string, unknown>[] = [];

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table !== "outcome_surveys") throw new Error(`unexpected table ${table}`);
      return {
        update: (payload: Record<string, unknown>) => {
          updates.push(payload);
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
  }),
}));

describe("OutcomeSurveyPrompt Gate 6 taxonomy", () => {
  afterEach(() => {
    cleanup();
    updates.length = 0;
  });

  it("saves a taxonomy answer and an optional note", async () => {
    render(<OutcomeSurveyPrompt surveyId="survey-1" kind="day30" />);

    fireEvent.click(screen.getByRole("button", { name: "Moved" }));
    fireEvent.change(screen.getByPlaceholderText(/Optional note/), {
      target: { value: "we closed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({
      outcome: "moved",
      notes: "we closed",
      completed_at: expect.any(String),
    });
    expect(updates[0]).not.toHaveProperty("score");
    expect(updates[0]).not.toHaveProperty("verdict");
    expect(screen.getByText(/recorded honestly/i)).toBeTruthy();
  });

  it("stores no_answer when the due prompt is dismissed", async () => {
    render(<OutcomeSurveyPrompt surveyId="survey-2" kind="day30" />);
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));

    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0].outcome).toBe("no_answer");
    expect(updates[0].completed_at).toEqual(expect.any(String));
  });
});
