// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";

const updates: Record<string, unknown>[] = [];

vi.stubGlobal(
  "fetch",
  vi.fn(async (_url: string, init?: RequestInit) => {
    updates.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
    return { ok: true, json: async () => ({ saved: true }) };
  }),
);

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
    expect(updates[0]).toMatchObject({
      surveyId: "survey-1",
      outcome: "moved",
      notes: "we closed",
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
