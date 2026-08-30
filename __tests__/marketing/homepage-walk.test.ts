/**
 * Homepage walk-copy constants stay character-exact; page wiring is T3 policy.
 */
import { describe, expect, it } from "vitest";
import { TAGLINES } from "@/lib/brand";
import {
  WALK_CLARITY,
  WALK_COMPANION,
  WALK_INVERSION,
  WALK_LINES,
  WALK_OBJECT,
  WALK_PRIMARY,
  WALK_QUESTION,
  WALK_NOT_YET,
} from "@/components/home/walk-copy";

describe("homepage front door — locked copy is character-exact", () => {
  it("pins the seven locked lines and invents no others", () => {
    expect(WALK_LINES).toEqual([
      "Will you be okay?",
      "A Decision Companion.",
      "Everyone else tells you how. HōMI tells you if.",
      "Know when you're ready. Move when it matters.",
      "Clarity, not commission.",
      "Not yet is not no.",
      "The compass that becomes a key when you're finally ready to turn it.",
    ]);
    expect(WALK_PRIMARY).toBe(TAGLINES.primary);
    expect(WALK_QUESTION).toBe("Will you be okay?");
    expect(WALK_COMPANION).toBe("A Decision Companion.");
    expect(TAGLINES.companion).toBe("A Decision Companion");
    expect(WALK_COMPANION).not.toBe(TAGLINES.companion);
    expect(WALK_INVERSION).toBe("Everyone else tells you how. HōMI tells you if.");
    expect(WALK_CLARITY).toBe("Clarity, not commission.");
    expect(WALK_NOT_YET).toBe("Not yet is not no.");
    expect(WALK_OBJECT).toBe(
      "The compass that becomes a key when you're finally ready to turn it.",
    );
  });
});
