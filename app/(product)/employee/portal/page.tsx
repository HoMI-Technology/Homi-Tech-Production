import { redirect } from "next/navigation";

export const metadata = {
  title: "Employee Portal | HōMI",
  description: "Redirects to the employee benefits home.",
};

/**
 * Portal folded into Employee Home (operate program D2).
 */
export default async function EmployeePortalRedirectPage() {
  redirect("/employee/dashboard");
}
