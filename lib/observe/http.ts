import { NextResponse } from "next/server";
import { logEvent, type LogLevel } from "@/lib/observe/log";
import {
  resolveRequestId,
  withRequestId,
} from "@/lib/observe/request-context";

export function startRequest(
  request: Request,
  route: string,
): {
  requestId: string;
  json: (
    body: unknown,
    init?: {
      status?: number;
      event?: string;
      level?: LogLevel;
      code?: string;
    },
  ) => NextResponse;
} {
  const requestId = resolveRequestId(request);

  function json(
    body: unknown,
    init: {
      status?: number;
      event?: string;
      level?: LogLevel;
      code?: string;
    } = {},
  ): NextResponse {
    const status = init.status ?? 200;
    if (init.event) {
      const level =
        init.level ??
        (status >= 500 ? "error" : status >= 400 ? "warn" : "info");
      logEvent({
        event: init.event,
        level,
        requestId,
        route,
        status,
        code: init.code,
      });
    }
    return withRequestId(NextResponse.json(body, { status }), requestId);
  }

  return { requestId, json };
}
