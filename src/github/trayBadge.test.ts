import { describe, expect, it } from "vitest";
import {
  computeTrayBadgeCount,
  formatTrayBadgeLabel,
  formatTrayBadgeTitle,
} from "@/github/trayBadge";
import {
  DEFAULT_MENU_VISIBILITY,
  DEFAULT_TRAY_BADGE_SETTINGS,
} from "@/settings/appSettings";

function issue(id: number) {
  return { id } as never;
}

describe("trayBadge", () => {
  it("counts assigned, review, and unread by default", () => {
    const count = computeTrayBadgeCount({
      issues: [issue(1), issue(2)],
      reviewRequests: [issue(10)],
      myPrs: [issue(20)],
      unreadNotificationCount: 3,
      menuVisibility: DEFAULT_MENU_VISIBILITY,
      trayBadge: DEFAULT_TRAY_BADGE_SETTINGS,
    });
    expect(count).toBe(6);
  });

  it("dedupes issue ids across queues", () => {
    const count = computeTrayBadgeCount({
      issues: [issue(1)],
      reviewRequests: [issue(1)],
      myPrs: [],
      unreadNotificationCount: 0,
      menuVisibility: DEFAULT_MENU_VISIBILITY,
      trayBadge: DEFAULT_TRAY_BADGE_SETTINGS,
    });
    expect(count).toBe(1);
  });

  it("excludes my PRs when toggle is off", () => {
    const count = computeTrayBadgeCount({
      issues: [],
      reviewRequests: [],
      myPrs: [issue(5), issue(6)],
      unreadNotificationCount: 0,
      menuVisibility: DEFAULT_MENU_VISIBILITY,
      trayBadge: DEFAULT_TRAY_BADGE_SETTINGS,
    });
    expect(count).toBe(0);
  });

  it("includes my PRs when toggle is on", () => {
    const count = computeTrayBadgeCount({
      issues: [],
      reviewRequests: [],
      myPrs: [issue(5), issue(6)],
      unreadNotificationCount: 0,
      menuVisibility: DEFAULT_MENU_VISIBILITY,
      trayBadge: { ...DEFAULT_TRAY_BADGE_SETTINGS, myPullRequests: true },
    });
    expect(count).toBe(2);
  });

  it("skips unread when notifications section is hidden", () => {
    const count = computeTrayBadgeCount({
      issues: [],
      reviewRequests: [],
      myPrs: [],
      unreadNotificationCount: 4,
      menuVisibility: { ...DEFAULT_MENU_VISIBILITY, showNotifications: false },
      trayBadge: DEFAULT_TRAY_BADGE_SETTINGS,
    });
    expect(count).toBe(0);
  });

  it("formats tray badge title and label", () => {
    expect(formatTrayBadgeTitle(0)).toBe("");
    expect(formatTrayBadgeTitle(5)).toBe(" 5");
    expect(formatTrayBadgeTitle(105)).toBe(" 99+");
    expect(formatTrayBadgeLabel(105)).toBe("99+");
  });
});
