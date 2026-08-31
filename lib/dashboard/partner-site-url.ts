/**
 * Partner invite origin. Never silently default to https://homitechnology.com.
 * Prefer NEXT_PUBLIC_SITE_URL; otherwise derive from the request host.
 * Fail loud when neither is available.
 */

export class PartnerSiteUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerSiteUrlError";
  }
}

export function resolvePartnerInviteOrigin(args: {
  envUrl?: string | null;
  host?: string | null;
  proto?: string | null;
}): string {
  const explicit = args.envUrl?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const host = args.host?.split(",")[0]?.trim();
  if (host) {
    const rawProto = (args.proto?.split(",")[0]?.trim() || "https").replace(/:$/, "");
    const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https";
    return `${proto}://${host}`;
  }

  throw new PartnerSiteUrlError(
    "[HōMI] NEXT_PUBLIC_SITE_URL is unset and the request host is unavailable. " +
      "Partner invite links must not silently default to https://homitechnology.com.",
  );
}
