import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export const metadata = {
  title: "Employee Portal | HōMI",
  description: "Redirects to the employee benefits home.",
};

/**
 * Portal folded into Employee Home (operate program D2).
 */
export default async function EmployeePortalRedirectPage() {
  const locale = (await getLocale()) as AppLocale;
  redirect({ href: "/employee/dashboard", locale });
}
