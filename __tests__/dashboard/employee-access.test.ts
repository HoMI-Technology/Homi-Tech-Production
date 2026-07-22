import { describe, expect, it } from "vitest";
import { canAccessEmployeeHub } from "@/lib/dashboard/employee-access";

describe("canAccessEmployeeHub", () => {
  it("denies null profiles", () => {
    expect(canAccessEmployeeHub(null)).toBe(false);
  });

  it("admits employer-linked users even when role is still user", () => {
    expect(canAccessEmployeeHub({ role: "user", employer_id: "org-1" })).toBe(true);
  });

  it("admits employee role without employer_id", () => {
    expect(canAccessEmployeeHub({ role: "employee", employer_id: null })).toBe(true);
  });

  it("admits admins", () => {
    expect(canAccessEmployeeHub({ role: "admin", employer_id: null })).toBe(true);
  });

  it("denies plain users with no employer link", () => {
    expect(canAccessEmployeeHub({ role: "user", employer_id: null })).toBe(false);
  });
});
