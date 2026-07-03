import { describe, expect, it } from "vitest";
import type { GitHubNotification } from "@/github/types";
import {
  applyNotificationsInboxFilter,
  filterNotificationsSinceClear,
  resolveNotificationsClearedAt,
} from "@/github/notificationsInbox";

function notification(updatedAt: string, id = "1"): GitHubNotification {
  return {
    id,
    unread: true,
    reason: "mention",
    updated_at: updatedAt,
    subject: { title: "Test", type: "Issue", url: null },
    repository: { full_name: "acme/widget", html_url: "https://github.com/acme/widget" },
  };
}

describe("resolveNotificationsClearedAt", () => {
  it("uses the latest updated_at from visible notifications", () => {
    const clearedAt = resolveNotificationsClearedAt([
      notification("2026-01-01T00:00:00Z", "a"),
      notification("2026-01-03T12:00:00Z", "b"),
    ]);
    expect(clearedAt).toBe("2026-01-03T12:00:00.000Z");
  });

  it("falls back to now when the inbox is already empty", () => {
    const now = new Date("2026-02-01T08:00:00Z");
    expect(resolveNotificationsClearedAt([], now)).toBe(now.toISOString());
  });
});

describe("filterNotificationsSinceClear", () => {
  it("keeps only notifications newer than the clear cutoff", () => {
    const items = [
      notification("2026-01-01T00:00:00Z", "old"),
      notification("2026-01-05T00:00:00Z", "new"),
    ];
    const filtered = filterNotificationsSinceClear(items, "2026-01-03T00:00:00Z");
    expect(filtered.map((item) => item.id)).toEqual(["new"]);
  });

  it("returns all notifications when nothing was cleared", () => {
    const items = [notification("2026-01-01T00:00:00Z")];
    expect(applyNotificationsInboxFilter(items, null)).toEqual(items);
  });
});
