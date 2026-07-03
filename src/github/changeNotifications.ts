import type { ActivityEvent } from "@/github/itemDiff";
import type { NotificationSettings } from "@/settings/appSettings";

export const NOTIFICATION_APP_TITLE = "GitPulse";

export function filterNotifiableEvents(
  events: ActivityEvent[],
  settings: NotificationSettings,
): ActivityEvent[] {
  if (!settings.enabled) return [];

  return events.filter((event) => {
    if (event.change === "added" && !settings.notifyAdded) return false;
    if (event.change === "updated" && !settings.notifyUpdated) return false;
    if (event.kind === "issue" && !settings.issues) return false;
    if (event.kind === "pull_request" && !settings.pullRequests) return false;
    if (event.kind === "notification" && !settings.notifications) return false;
    if (event.kind === "discussion" && !settings.discussions) return false;
    if (event.kind === "release" && !settings.releases) return false;
    if (event.kind === "commit" && !settings.commits) return false;
    if (event.kind === "security" && !settings.securityAlerts) return false;
    if (event.kind === "check" && !settings.checks) return false;
    return true;
  });
}

export function formatSingleEventBody(event: ActivityEvent): string {
  const prefix = event.change === "added" ? "+" : "~";
  const number = event.number ? `#${event.number} ` : "";
  return `${prefix} ${event.repo} ${number}${event.title}`;
}

export function formatBatchEventBody(count: number): string {
  return `${count} changes detected`;
}

export function buildNotificationPayload(
  events: ActivityEvent[],
): { title: string; body: string } | null {
  if (!events.length) return null;

  if (events.length === 1) {
    return {
      title: NOTIFICATION_APP_TITLE,
      body: formatSingleEventBody(events[0]!),
    };
  }

  return {
    title: NOTIFICATION_APP_TITLE,
    body: formatBatchEventBody(events.length),
  };
}
