import { APEX_ORIGIN, WWW_HOST } from "./site";

/**
 * Host-conditioned www → apex. Permanent (308 in Next.js). Path + query
 * are preserved. Root is a separate rule because `/:path*` does not match `/`.
 */
export const WWW_REDIRECTS = [
  {
    source: "/",
    has: [{ type: "host" as const, value: WWW_HOST }],
    destination: `${APEX_ORIGIN}/`,
    permanent: true,
  },
  {
    source: "/:path*",
    has: [{ type: "host" as const, value: WWW_HOST }],
    destination: `${APEX_ORIGIN}/:path*`,
    permanent: true,
  },
];

/** Retired public paths → current legal / Assess URLs. Permanent (308). */
export const LEGACY_PATH_REDIRECTS = [
  { source: "/privacy", destination: "/legal/privacy", permanent: true },
  { source: "/subprocessors", destination: "/legal/subprocessors", permanent: true },
  { source: "/assess/new", destination: "/first-moment", permanent: true },
];
