export type LogLevel = "info" | "warn" | "error";

export interface ObserveFields {
  event: string;
  requestId: string;
  route: string;
  level?: LogLevel;
  status?: number;
  code?: string;
}

const SECRET_KEYS = new Set([
  "token",
  "email",
  "authorization",
  "password",
  "secret",
  "cookie",
]);

function pickSafeFields(fields: ObserveFields): Record<string, unknown> {
  const out: Record<string, unknown> = {
    event: fields.event,
    level: fields.level ?? "info",
    requestId: fields.requestId,
    route: fields.route,
  };
  if (typeof fields.status === "number") {
    out.status = fields.status;
  }
  if (typeof fields.code === "string") {
    out.code = fields.code;
  }
  return out;
}

/** Structured JSON log. Never serializes tokens, emails, or auth headers. */
export function logEvent(fields: ObserveFields): void {
  const payload = pickSafeFields(fields);
  for (const key of Object.keys(fields as unknown as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key.toLowerCase())) {
      delete payload[key];
    }
  }
  const line = JSON.stringify(payload);
  const level = fields.level ?? "info";
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}
