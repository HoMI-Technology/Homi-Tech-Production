import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation APIs. `Link`/`useRouter` automatically prepend
 * the `/es` prefix when Spanish is active (default `en` stays unprefixed),
 * and `usePathname` returns the path without the locale prefix so
 * active-route checks keep working.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
