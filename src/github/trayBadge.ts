import type { GitHubIssue } from "@/github/types";
import type { MenuVisibilitySettings, TrayBadgeSettings } from "@/settings/appSettings";

const TRAY_BADGE_CAP = 99;

export function formatTrayBadgeLabel(count: number): string {
  if (count <= 0) return "";
  if (count > TRAY_BADGE_CAP) return `${TRAY_BADGE_CAP}+`;
  return String(count);
}

export function formatTrayBadgeTitle(count: number): string {
  const label = formatTrayBadgeLabel(count);
  return label ? ` ${label}` : "";
}

export function computeTrayBadgeCount(input: {
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  unreadNotificationCount: number;
  menuVisibility: MenuVisibilitySettings;
  trayBadge: TrayBadgeSettings;
}): number {
  const ids = new Set<number>();

  if (input.trayBadge.assignedIssues && input.menuVisibility.showIssues) {
    for (const item of input.issues) ids.add(item.id);
  }

  if (input.trayBadge.reviewRequests && input.menuVisibility.showPullRequests) {
    for (const item of input.reviewRequests) ids.add(item.id);
  }

  if (input.trayBadge.myPullRequests && input.menuVisibility.showPullRequests) {
    for (const item of input.myPrs) ids.add(item.id);
  }

  let notificationPart = 0;
  if (input.trayBadge.unreadNotifications && input.menuVisibility.showNotifications) {
    notificationPart = Math.max(0, input.unreadNotificationCount);
  }

  return ids.size + notificationPart;
}
