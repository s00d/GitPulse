import { describe, expect, it } from "vitest";
import {
  filterSnoozed,
  isSnoozed,
  issueSnoozeKey,
  pruneExpiredSnoozes,
  snoozeUntil,
  type SnoozeMap,
} from "@/github/snooze";

describe("snooze", () => {
  const now = Date.parse("2026-07-03T12:00:00.000Z");

  it("builds issue and pr keys", () => {
    expect(issueSnoozeKey(42, false)).toBe("issue:42");
    expect(issueSnoozeKey(42, true)).toBe("pr:42");
  });

  it("detects active snooze", () => {
    const map: SnoozeMap = {
      "issue:1": { until: snoozeUntil(2, now) },
    };
    expect(isSnoozed(map, "issue:1", now)).toBe(true);
    expect(isSnoozed(map, "issue:2", now)).toBe(false);
  });

  it("prunes expired entries", () => {
    const map: SnoozeMap = {
      "issue:1": { until: new Date(now - 1_000).toISOString() },
      "issue:2": { until: snoozeUntil(1, now) },
    };
    expect(pruneExpiredSnoozes(map, now)).toEqual({
      "issue:2": map["issue:2"],
    });
  });

  it("filters snoozed items", () => {
    const map: SnoozeMap = {
      "issue:2": { until: snoozeUntil(4, now) },
    };
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(
      filterSnoozed(items, map, (item) => issueSnoozeKey(item.id, false), now),
    ).toEqual([{ id: 1 }, { id: 3 }]);
  });
});
