import { notificationSubjectToActivityKind } from "@/github/itemDiff";
import type { RepoVisibilityMap } from "@/github/repoVisibility";
import { isRepoEnabled } from "@/github/repoVisibility";
import type { GitHubDiscussionItem, GitHubNotification } from "@/github/types";
import { sortDiscussionsByUpdatedDesc } from "@/graphql/mapDiscussion";

export function normalizeDiscussionUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url.replace(/\/$/, "");
  }
}

export function buildUnreadDiscussionMap(
  notifications: GitHubNotification[],
): Map<string, GitHubNotification> {
  const map = new Map<string, GitHubNotification>();
  for (const notification of notifications) {
    if (!notification.unread) continue;
    if (notificationSubjectToActivityKind(notification.subject.type) !== "discussion") continue;
    const url = notification.subject.url;
    if (!url) continue;
    map.set(normalizeDiscussionUrl(url), notification);
  }
  return map;
}

export function enrichDiscussionsWithUnread(
  items: GitHubDiscussionItem[],
  notifications: GitHubNotification[],
  includeUnread: boolean,
): GitHubDiscussionItem[] {
  if (!includeUnread) {
    return items.map((item) => ({ ...item, unread: false, notificationId: undefined }));
  }
  const unreadByUrl = buildUnreadDiscussionMap(notifications);
  return sortDiscussionsByUpdatedDesc(
    items.map((item) => {
      const match = unreadByUrl.get(normalizeDiscussionUrl(item.url));
      return {
        ...item,
        unread: Boolean(match),
        notificationId: match?.id,
      };
    }),
  );
}

export function countUnreadDiscussions(items: GitHubDiscussionItem[]): number {
  return items.filter((item) => item.unread).length;
}

export function filterDiscussionItemsByRepoVisibility(
  items: GitHubDiscussionItem[],
  visibility: RepoVisibilityMap,
): GitHubDiscussionItem[] {
  return items.filter((item) => isRepoEnabled(item.repo, visibility));
}
