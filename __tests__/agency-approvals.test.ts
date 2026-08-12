import { describe, expect, it } from "vitest";
import {
  canTransition,
  isCronSafeStatus,
  isPublishable,
  queueDepth,
  requiresSecondConfirm,
} from "@/lib/admin/agency-approvals";

describe("canTransition", () => {
  it("allows draft → approved", () => {
    expect(canTransition("draft", "approved")).toBe(true);
  });

  it("allows approved → published", () => {
    expect(canTransition("approved", "published")).toBe(true);
  });

  it("blocks draft → published (must approve first)", () => {
    expect(canTransition("draft", "published")).toBe(false);
  });

  it("blocks published from moving", () => {
    expect(canTransition("published", "draft")).toBe(false);
  });
});

describe("requiresSecondConfirm", () => {
  it("flags competitor_derived", () => {
    expect(requiresSecondConfirm({ kind: "competitor_derived", flagged: [] })).toBe(true);
  });

  it("flags claim-law hits", () => {
    expect(requiresSecondConfirm({ kind: "post", flagged: ["approved"] })).toBe(true);
  });

  it("clean post does not require second confirm", () => {
    expect(requiresSecondConfirm({ kind: "post", flagged: [] })).toBe(false);
  });
});

describe("queueDepth", () => {
  it("counts draft and in_review", () => {
    expect(
      queueDepth([
        { status: "draft" },
        { status: "in_review" },
        { status: "approved" },
        { status: "published" },
      ]),
    ).toBe(2);
  });
});

describe("isPublishable", () => {
  it("only approved", () => {
    expect(isPublishable("approved")).toBe(true);
    expect(isPublishable("draft")).toBe(false);
  });
});

describe("isCronSafeStatus", () => {
  it("forbids approved/published for cron rows", () => {
    expect(isCronSafeStatus("draft")).toBe(true);
    expect(isCronSafeStatus("approved")).toBe(false);
    expect(isCronSafeStatus("published")).toBe(false);
  });
});
