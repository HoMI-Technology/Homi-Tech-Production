// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { pillarIntroCopy } from "@/lib/questions/flow";
import { HOME_PATH_ESTIMATE, pathProgressLabel } from "@/lib/questions/adaptive-home";
import { PathProgressChrome } from "@/components/assessment/ProgressBar";

describe("assessment progress chrome honesty", () => {
  it("never renders Question N of 45 or of 45 on the adaptive path label", () => {
    for (const dimension of ["financial", "emotional", "timing"] as const) {
      const label = pathProgressLabel(dimension, 1, HOME_PATH_ESTIMATE[dimension]);
      expect(label).toMatch(/ of ~\d+ this path$/);
      expect(label).not.toMatch(/of 45/);
      expect(label).not.toMatch(/Question \d+ of/);
      expect(label).not.toContain("Fifteen");
    }
  });

  it("pillar intros on the adaptive path use this-path estimates, not Fifteen", () => {
    const financial = pillarIntroCopy("financial", "home_buying", {
      pathQuestionEstimate: HOME_PATH_ESTIMATE.financial,
    });
    expect(financial.description).toBe(
      "~8 questions on this path · money you can prove. Count may shorten after a branch.",
    );
    expect(financial.description).not.toContain("Fifteen");
    expect(financial.question).toBe("Can you afford it?");

    const emotional = pillarIntroCopy("emotional", "home_buying", {
      pathQuestionEstimate: HOME_PATH_ESTIMATE.emotional,
    });
    expect(emotional.description.startsWith("~4 questions on this path")).toBe(true);
    expect(emotional.description).not.toContain("Fifteen");
  });

  it("PathProgressChrome exposes the honesty label and no 45", () => {
    const { container } = render(
      <PathProgressChrome
        dimension="financial"
        label="Financial Reality · 4 of ~8 this path"
        current={4}
        estimate={8}
      />,
    );
    const node = container.querySelector("[data-path-progress]");
    expect(node?.textContent).toBe("Financial Reality · 4 of ~8 this path");
    expect(container.textContent).not.toMatch(/45/);
    expect(container.querySelector("[data-progress-chrome='path']")).not.toBeNull();
  });
});
