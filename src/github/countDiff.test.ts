import { describe, expect, it } from "vitest";
import {
  buildCountSnapshot,
  computeCountDeltas,
  issueRepoKey,
  NOTIFICATIONS_TOTAL_KEY,
  PRS_TOTAL_KEY,
  prRepoKey,
  WATCHING_TOTAL_KEY,
} from "@/github/countDiff";

describe("buildCountSnapshot", () => {
  it("captures totals and per-repo counts", () => {
    const snapshot = buildCountSnapshot({
      issueGroups: [{ repo: "o/r", items: [], totalCount: 2 }],
      prGroups: [{ repo: "o/p", categories: [], totalCount: 4 }],
      prTotal: 4,
      notificationsUnread: 1,
      watchingTotal: 3,
    });

    expect(snapshot[issueRepoKey("o/r")]).toBe(2);
    expect(snapshot[prRepoKey("o/p")]).toBe(4);
    expect(snapshot[PRS_TOTAL_KEY]).toBe(4);
    expect(snapshot[NOTIFICATIONS_TOTAL_KEY]).toBe(1);
    expect(snapshot[WATCHING_TOTAL_KEY]).toBe(3);
  });
});

describe("computeCountDeltas", () => {
  it("returns empty when seen is null", () => {
    const current = buildCountSnapshot({
      issueGroups: [{ repo: "o/r", items: [], totalCount: 2 }],
      prGroups: [],
      prTotal: 0,
      notificationsUnread: 0,
      watchingTotal: 0,
    });

    expect(computeCountDeltas(current, null)).toEqual({});
  });

  it("returns positive deltas only", () => {
    const seen = buildCountSnapshot({
      issueGroups: [{ repo: "o/r", items: [], totalCount: 2 }],
      prGroups: [],
      prTotal: 1,
      notificationsUnread: 0,
      watchingTotal: 0,
    });
    const current = buildCountSnapshot({
      issueGroups: [{ repo: "o/r", items: [], totalCount: 3 }],
      prGroups: [],
      prTotal: 1,
      notificationsUnread: 2,
      watchingTotal: 0,
    });

    expect(computeCountDeltas(current, seen)).toEqual({
      [issueRepoKey("o/r")]: 1,
      [NOTIFICATIONS_TOTAL_KEY]: 2,
    });
  });

  it("ignores decreases", () => {
    const seen = buildCountSnapshot({
      issueGroups: [{ repo: "o/r", items: [], totalCount: 5 }],
      prGroups: [],
      prTotal: 0,
      notificationsUnread: 0,
      watchingTotal: 0,
    });
    const current = buildCountSnapshot({
      issueGroups: [{ repo: "o/r", items: [], totalCount: 2 }],
      prGroups: [],
      prTotal: 0,
      notificationsUnread: 0,
      watchingTotal: 0,
    });

    expect(computeCountDeltas(current, seen)).toEqual({});
  });
});
