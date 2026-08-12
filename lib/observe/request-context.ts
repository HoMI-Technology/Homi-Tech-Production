import { NextResponse } from "next/server";

const REQUEST_ID_RE = /^[\w.:-]{8,128}$/;

/** Accept a caller-supplied id, or mint one. Never echo tokens/spaces. */
export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id")?.trim() ?? "";
  if (REQUEST_ID_RE.test(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}

export function withRequestId(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set("x-request-id", requestId);
  return response;
}
