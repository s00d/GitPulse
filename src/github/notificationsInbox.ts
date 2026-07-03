import type { GitHubNotification } from "./types";

/** Cutoff for inbox items hidden after the user clears notifications. */
export function resolveNotificationsClearedAt(
  notifications: GitHubNotification[],
  now = new Date(),
): string {
  if (!notifications.length) {
    return now.toISOString();
  }

  let latest = 0;
  for (const notification of notifications) {
    const time = new Date(notification.updated_at).getTime();
    if (Number.isFinite(time) && time > latest) {
      latest = time;
    }
  }

  return latest > 0 ? new Date(latest).toISOString() : now.toISOString();
}

export function filterNotificationsSinceClear(
  notifications: GitHubNotification[],
  clearedAt: string | null | undefined,
): GitHubNotification[] {
  if (!clearedAt) return notifications;

  const cutoff = new Date(clearedAt).getTime();
  if (!Number.isFinite(cutoff)) return notifications;

  return notifications.filter((notification) => {
    const updated = new Date(notification.updated_at).getTime();
    return Number.isFinite(updated) && updated > cutoff;
  });
}

export function applyNotificationsInboxFilter(
  notifications: GitHubNotification[],
  clearedAt: string | null | undefined,
): GitHubNotification[] {
  return filterNotificationsSinceClear(notifications, clearedAt);
}
