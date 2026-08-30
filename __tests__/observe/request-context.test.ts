/**
 * Request IDs echo a safe incoming header, otherwise mint a UUID, and stamp the response.
 */
import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import {
  resolveRequestId,
  withRequestId,
} from "@/lib/observe/request-context";

describe("resolveRequestId", () => {
  it("echoes a well-formed incoming x-request-id", () => {
    const request = new Request("http://localhost/api/household", {
      headers: { "x-request-id": "req-abc-123" },
    });
    expect(resolveRequestId(request)).toBe("req-abc-123");
  });

  it("generates a uuid when the header is missing", () => {
    const request = new Request("http://localhost/api/household");
    expect(resolveRequestId(request)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("rejects tokens and other unsafe header values", () => {
    const request = new Request("http://localhost/api/household", {
      headers: { "x-request-id": "Bearer secret.token.value" },
    });
    expect(resolveRequestId(request)).not.toContain("secret");
  });
});

describe("withRequestId", () => {
  it("sets x-request-id on the response", () => {
    const res = withRequestId(NextResponse.json({ ok: true }), "req-1");
    expect(res.headers.get("x-request-id")).toBe("req-1");
  });
});
