import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/**
 * POST /api/csp-report — collector for Content-Security-Policy-Report-Only
 * violations. Without a collector the report-only soak is theater; this makes
 * the soak real so we can see exactly what a future enforce step would break
 * before flipping it on.
 *
 * Browsers send `application/csp-report` (legacy) or `application/reports+json`
 * (Reporting API). We log a compact line server-side (→ Sentry once wired) and
 * always return 204. Rate-limited per IP so a hostile page can't flood logs.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`csp-report:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) return new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as unknown;
    const reports = Array.isArray(body) ? body : [body];
    for (const report of reports.slice(0, 10)) {
      const r = report as {
        "csp-report"?: Record<string, unknown>;
        body?: Record<string, unknown>;
      };
      const v = r["csp-report"] ?? r.body ?? r;
      const directive =
        (v as Record<string, unknown>)["violated-directive"] ??
        (v as Record<string, unknown>)["effectiveDirective"] ??
        "unknown";
      const blocked =
        (v as Record<string, unknown>)["blocked-uri"] ??
        (v as Record<string, unknown>)["blockedURL"] ??
        "unknown";
      console.warn(`[csp-report] directive=${String(directive)} blocked=${String(blocked)}`);
    }
  } catch {
    // Malformed report — ignore, never error a beacon.
  }

  return new NextResponse(null, { status: 204 });
}
