import { describe, expect, it } from "vitest";
import {
  activeDashboardHref,
  ALL_DASHBOARDS,
  visibleDashboards,
} from "@/lib/dashboard/switcher-visibility";

describe("visibleDashboards", () => {
  it("hides the switcher set to Personal-only for a plain user", () => {
    const visible = visibleDashboards({ role: "user" });
    expect(visible.map((d) => d.href)).toEqual(["/dashboard"]);
  });

  it("shows Partner for partners", () => {
    const hrefs = visibleDashboards({ role: "partner" }).map((d) => d.href);
    expect(hrefs).toEqual(["/dashboard", "/partner/dashboard"]);
  });

  it("shows Employee for employer-linked users without conflating Team", () => {
    const hrefs = visibleDashboards({
      role: "user",
      employerId: "emp-1",
    }).map((d) => d.href);
    expect(hrefs).toEqual(["/dashboard", "/employee/dashboard"]);
  });

  it("shows Team for organization members without conflating Employee", () => {
    const hrefs = visibleDashboards({
      role: "user",
      organizationId: "org-1",
    }).map((d) => d.href);
    expect(hrefs).toEqual(["/dashboard", "/team"]);
  });

  it("shows Employee via role even without employer_id", () => {
    const hrefs = visibleDashboards({ role: "employee" }).map((d) => d.href);
    expect(hrefs).toContain("/employee/dashboard");
    expect(hrefs).not.toContain("/team");
  });

  it("lets admins see every dashboard including Analytics at /admin/analytics", () => {
    const hrefs = visibleDashboards({ role: "admin" }).map((d) => d.href);
    expect(hrefs).toEqual(ALL_DASHBOARDS.map((d) => d.href));
    expect(hrefs).toContain("/admin/analytics");
    expect(hrefs).not.toContain("/analytics");
  });

  it("honors legacy orgMember for both employer and organization gates", () => {
    const hrefs = visibleDashboards({
      role: "user",
      orgMember: true,
    }).map((d) => d.href);
    expect(hrefs).toEqual(["/dashboard", "/employee/dashboard", "/team"]);
  });

  it("does not conflate employer and organization when IDs are passed separately", () => {
    // Regression: AppHeader previously passed orgMember=Boolean(employer||org),
    // which made employer-only users see Team (and org-only users see Employee).
    expect(
      visibleDashboards({ role: "user", employerId: "e1", organizationId: null }).map(
        (d) => d.href,
      ),
    ).toEqual(["/dashboard", "/employee/dashboard"]);
    expect(
      visibleDashboards({ role: "user", employerId: null, organizationId: "o1" }).map(
        (d) => d.href,
      ),
    ).toEqual(["/dashboard", "/team"]);
  });
});

describe("activeDashboardHref", () => {
  const adminVisible = visibleDashboards({ role: "admin" });

  it("prefers Analytics over Admin on /admin/analytics", () => {
    expect(activeDashboardHref("/admin/analytics", adminVisible)).toBe("/admin/analytics");
  });

  it("marks Admin active on other /admin routes", () => {
    expect(activeDashboardHref("/admin/users", adminVisible)).toBe("/admin");
  });

  it("matches the longest dashboard prefix", () => {
    const partnerVisible = visibleDashboards({ role: "partner" });
    expect(activeDashboardHref("/partner/dashboard", partnerVisible)).toBe("/partner/dashboard");
  });
});
