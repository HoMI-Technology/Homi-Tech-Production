import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Recovered from PR #81 (adapted for Partner Home after portal redirect).
 * When mint fails, never fall back to an unattributed /shadow-score URL.
 */
describe("partner home invite mint failure", () => {
  it("only builds invite URLs when a partner code exists", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(product)/partner/dashboard/page.tsx"),
      "utf8",
    );
    expect(source).toContain("const inviteUrl = partnerCode ?");
    expect(source).toContain("shadow-score?ref=");
    // Must not fall back to a bare shadow-score URL for CopyButton.
    expect(source).not.toMatch(
      /inviteUrl\s*=\s*partnerCode[\s\S]*:\s*`\$\{SITE_URL\}\/shadow-score`/,
    );
    expect(source).toContain("Could not mint an invite code");
  });
});
