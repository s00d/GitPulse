import { describe, expect, it } from "vitest";
import { isRefreshDue, msUntilNextRefresh } from "@/github/refreshSchedule";

describe("refreshSchedule", () => {
  const last = "2026-01-01T12:00:00.000Z";

  it("treats missing last refresh as due", () => {
    expect(isRefreshDue(null, "1h")).toBe(true);
    expect(msUntilNextRefresh(null, "1h")).toBe(0);
  });

  it("skips auto refresh for manual interval when cache exists", () => {
    expect(isRefreshDue(last, "manual")).toBe(false);
    expect(msUntilNextRefresh(last, "manual")).toBe(Number.POSITIVE_INFINITY);
  });

  it("respects refresh interval elapsed time", () => {
    const now = new Date(last).getTime() + 30 * 60_000;
    expect(isRefreshDue(last, "1h", now)).toBe(false);
    expect(msUntilNextRefresh(last, "1h", now)).toBe(30 * 60_000);

    const later = new Date(last).getTime() + 61 * 60_000;
    expect(isRefreshDue(last, "1h", later)).toBe(true);
    expect(msUntilNextRefresh(last, "1h", later)).toBe(0);
  });
});
