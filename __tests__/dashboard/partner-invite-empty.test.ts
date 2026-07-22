import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("partner portal invite mint failure", () => {
  it("shows an empty-state instead of a bare /shadow-score copy link", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/[locale]/(product)/partner/portal/page.tsx"),
      "utf8",
    );
    expect(source).toContain("Invite link unavailable");
    expect(source).toContain("partnerCode && inviteLink ? (");
    // Must not fall back to an unattributed shadow-score URL for CopyButton.
    expect(source).not.toMatch(/inviteLink = partnerCode[\s\S]*: `\$\{SITE_URL\}\/shadow-score`/);
  });
});
