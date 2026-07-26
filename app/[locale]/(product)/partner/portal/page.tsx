import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export const metadata = {
  title: "Partner Portal | HōMI",
  description: "Redirects to the partner home.",
};

/**
 * Portal folded into Partner Home (operate program D2).
 * Keep route for bookmarks and command-palette legacy links.
 */
export default async function PartnerPortalRedirectPage() {
  const locale = (await getLocale()) as AppLocale;
  redirect({ href: "/partner/dashboard", locale });
}
