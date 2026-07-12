import { describe, expect, it } from "vitest";
import { visibleNav } from "./navigation";

describe("visibleNav", () => {
  it("keeps organization setup admin-only", () => {
    expect(visibleNav("ADMIN").map((item) => item.label)).toContain("Organization Setup");
    expect(visibleNav("EMPLOYEE").map((item) => item.label)).not.toContain("Organization Setup");
  });

  it("gives employees a reduced nav", () => {
    expect(visibleNav("EMPLOYEE").map((item) => item.label)).toEqual(["Dashboard", "Resource Booking", "Maintenance", "Notifications", "Settings"]);
  });
});
