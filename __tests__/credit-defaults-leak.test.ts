import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { creditDisplay, DEFAULT_CREDIT_STATE } from "@/lib/credit/store";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("creditDisplay — defaults-leak gate", () => {
  it("does not present 680 as the user's score before they have numbers", () => {
    const shown = creditDisplay(false, true, DEFAULT_CREDIT_STATE);
    expect(shown.value).toBe("—");
    expect(shown.label).toBe("Not your score yet");
    expect(shown.showInterpretation).toBe(false);
    expect(shown.persist).toBe(false);
  });

  it("stays blank until hydrate finishes", () => {
    const shown = creditDisplay(true, false, { score: 710, utilization: 22, onTimeStreakMonths: 18 });
    expect(shown.value).toBe("—");
    expect(shown.persist).toBe(false);
  });

  it("quotes a saved reading as theirs", () => {
    const shown = creditDisplay(true, true, { score: 710, utilization: 22, onTimeStreakMonths: 18 });
    expect(shown.value).toBe("710");
    expect(shown.label).toBe("Your score");
    expect(shown.showInterpretation).toBe(true);
    expect(shown.persist).toBe(true);
  });

  it("visiting /credit does not persist until ownNumbers", () => {
    const page = read("app/(product)/credit/page.tsx");
    expect(page).toContain("if (!hydrated || !ownNumbers) return");
    expect(page).toContain("saveCreditState(state)");
    expect(page).not.toMatch(/useEffect\(\(\) => \{\s*saveCreditState/);
  });
});
