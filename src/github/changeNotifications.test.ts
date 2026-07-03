import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "@/github/itemDiff";
import {
  buildNotificationPayload,
  filterNotifiableEvents,
  formatBatchEventBody,
  formatSingleEventBody,
  NOTIFICATION_APP_TITLE,
} from "@/github/changeNotifications";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/settings/appSettings";

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "item:1:added:2026-01-01T00:00:00.000Z",
    itemKey: "item:1",
    kind: "issue",
    change: "added",
    title: "Fix login",
    repo: "owner/repo",
    url: "https://github.com/owner/repo/issues/1",
    detectedAt: "2026-01-01T00:00:00.000Z",
    itemUpdatedAt: "2026-01-01T00:00:00.000Z",
    number: 1,
    ...overrides,
  };
}

describe("filterNotifiableEvents", () => {
  it("returns empty when notifications are disabled", () => {
    const events = [makeEvent()];
    const result = filterNotifiableEvents(events, {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: false,
    });
    expect(result).toEqual([]);
  });

  it("filters by change kind", () => {
    const events = [
      makeEvent({ change: "added" }),
      makeEvent({ id: "item:2:updated:...", itemKey: "item:2", change: "updated" }),
    ];
    const result = filterNotifiableEvents(events, {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notifyUpdated: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.change).toBe("added");
  });

  it("filters by item kind", () => {
    const events = [
      makeEvent({ kind: "issue" }),
      makeEvent({
        id: "notif:1:added:...",
        itemKey: "notif:1",
        kind: "notification",
        number: undefined,
      }),
    ];
    const result = filterNotifiableEvents(events, {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notifications: false,
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("issue");
  });

  it("filters releases and discussions separately from inbox", () => {
    const events = [
      makeEvent({ kind: "release", title: "v1.0.0" }),
      makeEvent({
        id: "notif:1:added:...",
        itemKey: "notif:1",
        kind: "discussion",
        number: undefined,
        title: "RFC",
      }),
      makeEvent({
        id: "notif:2:added:...",
        itemKey: "notif:2",
        kind: "notification",
        number: undefined,
        title: "Repo invite",
      }),
      makeEvent({
        id: "notif:3:added:...",
        itemKey: "notif:3",
        kind: "commit",
        number: undefined,
        title: "Fix typo",
      }),
    ];
    expect(
      filterNotifiableEvents(events, {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        releases: false,
        discussions: false,
        notifications: true,
        commits: true,
      }),
    ).toEqual([events[2], events[3]]);
    expect(
      filterNotifiableEvents(events, {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        releases: true,
        discussions: true,
        notifications: false,
        commits: false,
      }),
    ).toEqual([events[0], events[1]]);
  });

  it("routes inbox issue threads through the issues filter", () => {
    const events = [
      makeEvent({ kind: "issue", title: "Assigned" }),
      makeEvent({
        id: "notif:1:added:...",
        itemKey: "notif:1",
        kind: "issue",
        number: undefined,
        title: "Mention on issue",
      }),
    ];
    expect(
      filterNotifiableEvents(events, {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        issues: false,
      }),
    ).toEqual([]);
  });
});

describe("formatSingleEventBody", () => {
  it("formats added issue with number", () => {
    expect(formatSingleEventBody(makeEvent())).toBe("+ owner/repo #1 Fix login");
  });

  it("formats updated pull request without number", () => {
    expect(
      formatSingleEventBody(
        makeEvent({
          kind: "pull_request",
          change: "updated",
          number: undefined,
          title: "Refactor auth",
        }),
      ),
    ).toBe("~ owner/repo Refactor auth");
  });
});

describe("buildNotificationPayload", () => {
  it("returns null for empty events", () => {
    expect(buildNotificationPayload([])).toBeNull();
  });

  it("builds single-event payload", () => {
    expect(buildNotificationPayload([makeEvent()])).toEqual({
      title: NOTIFICATION_APP_TITLE,
      body: "+ owner/repo #1 Fix login",
    });
  });

  it("builds batch payload", () => {
    expect(
      buildNotificationPayload([
        makeEvent(),
        makeEvent({ id: "item:2:added:...", itemKey: "item:2", number: 2, title: "Other" }),
      ]),
    ).toEqual({
      title: NOTIFICATION_APP_TITLE,
      body: formatBatchEventBody(2),
    });
  });
});
