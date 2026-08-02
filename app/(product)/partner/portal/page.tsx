import { redirect } from "next/navigation";

export const metadata = {
  title: "Partner Portal | HōMI",
  description: "Redirects to the partner home.",
};

/**
 * Portal folded into Partner Home (operate program D2).
 * Keep route for bookmarks and command-palette legacy links.
 */
export default async function PartnerPortalRedirectPage() {
  redirect("/partner/dashboard");
}
