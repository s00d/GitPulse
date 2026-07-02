import type { GitHubIssue, GitHubNotification } from "./types";
import { formatTrayMenuRow } from "./menuFormat";
import { isPullRequest, repoFullFromUrl } from "./types";

export type ActivityItemKind = "issue" | "pull_request" | "notification";
export type ActivityChangeKind = "added" | "updated";

export interface ActivityEvent {
  id: string;
  itemKey: string;
  kind: ActivityItemKind;
  change: ActivityChangeKind;
  title: string;
  repo: string;
  url: string;
  detectedAt: string;
  itemUpdatedAt: string;
  number?: number;
}

export interface ItemSnapshotEntry {
  kind: ActivityItemKind;
  title: string;
  repo: string;
  url: string;
  updatedAt: string;
  number?: number;
}

export type ItemSnapshot = Record<string, ItemSnapshotEntry>;

export const ITEM_EVENTS_STORE_MAX = 30;
export const ITEM_EVENTS_DISPLAY_MAX = 5;

export interface GitHubItemSource {
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  waitingOnAuthor: GitHubIssue[];
  notifications: GitHubNotification[];
}

function issueEntry(issue: GitHubIssue): ItemSnapshotEntry {
  return {
    kind: isPullRequest(issue) ? "pull_request" : "issue",
    title: issue.title,
    repo: repoFullFromUrl(issue.repository_url),
    url: issue.html_url,
    updatedAt: issue.updated_at,
    number: issue.number,
  };
}

function notificationEntry(notification: GitHubNotification): ItemSnapshotEntry {
  return {
    kind: "notification",
    title: notification.subject.title,
    repo: notification.repository.full_name,
    url: notification.subject.url ?? notification.repository.html_url,
    updatedAt: notification.updated_at,
  };
}

export function buildItemSnapshot(source: GitHubItemSource): ItemSnapshot {
  const snapshot: ItemSnapshot = {};

  const issues = [
    ...source.issues,
    ...source.reviewRequests,
    ...source.myPrs,
    ...source.waitingOnAuthor,
  ];

  for (const issue of issues) {
    snapshot[`item:${issue.id}`] = issueEntry(issue);
  }

  for (const notification of source.notifications) {
    if (!notification.unread) continue;
    snapshot[`notif:${notification.id}`] = notificationEntry(notification);
  }

  return snapshot;
}

export function diffItemSnapshots(
  previous: ItemSnapshot | null,
  current: ItemSnapshot,
  detectedAt: string,
): ActivityEvent[] {
  if (!previous) return [];

  const events: ActivityEvent[] = [];

  for (const [itemKey, entry] of Object.entries(current)) {
    const prev = previous[itemKey];
    if (!prev) {
      events.push({
        id: `${itemKey}:added:${detectedAt}`,
        itemKey,
        kind: entry.kind,
        change: "added",
        title: entry.title,
        repo: entry.repo,
        url: entry.url,
        detectedAt,
        itemUpdatedAt: entry.updatedAt,
        number: entry.number,
      });
      continue;
    }

    if (prev.updatedAt !== entry.updatedAt) {
      events.push({
        id: `${itemKey}:updated:${detectedAt}`,
        itemKey,
        kind: entry.kind,
        change: "updated",
        title: entry.title,
        repo: entry.repo,
        url: entry.url,
        detectedAt,
        itemUpdatedAt: entry.updatedAt,
        number: entry.number,
      });
    }
  }

  return events.sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  );
}

export function mergeActivityEvents(
  existing: ActivityEvent[],
  incoming: ActivityEvent[],
  max = ITEM_EVENTS_STORE_MAX,
): ActivityEvent[] {
  const seen = new Set<string>();
  const merged: ActivityEvent[] = [];

  for (const event of [...incoming, ...existing]) {
    const dedupeKey = `${event.itemKey}:${event.change}:${event.itemUpdatedAt}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    merged.push(event);
    if (merged.length >= max) break;
  }

  return merged;
}

export function formatActivityTrayLabel(event: ActivityEvent, max = 58): string {
  const prefix = event.change === "added" ? "+" : "~";
  const number = event.number ? `#${event.number} ` : "";
  const repoShort = event.repo.includes("/") ? event.repo.split("/").pop() : event.repo;
  const main = `${prefix} ${repoShort} ${number}${event.title}`;
  return formatTrayMenuRow(main, event.itemUpdatedAt, max);
}
