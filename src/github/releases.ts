import { notificationSubjectToActivityKind } from "@/github/itemDiff";
import type { RepoVisibilitySettings } from "@/settings/appSettings";
import { isRepoEnabled } from "@/github/repoVisibility";
import type { GitHubNotification, GitHubRelease, ReleaseRepoGroup, WatchedRepo } from "@/github/types";

export const MAX_RELEASE_TRACK_REPOS = 30;
export const DEFAULT_RELEASE_MAX_AGE_DAYS = 30;

export function watchedReposForReleases(
  watchedRepos: WatchedRepo[],
  visibility: RepoVisibilitySettings,
  max = MAX_RELEASE_TRACK_REPOS,
): string[] {
  return watchedRepos
    .map((repo) => repo.full_name)
    .filter((repo) => isRepoEnabled(repo, visibility))
    .slice(0, max);
}

export function isDiscussionNotification(notification: GitHubNotification): boolean {
  return notificationSubjectToActivityKind(notification.subject.type) === "discussion";
}

export function filterDiscussionNotifications(
  notifications: GitHubNotification[],
): GitHubNotification[] {
  return notifications.filter(
    (notification) => notification.unread && isDiscussionNotification(notification),
  );
}

function releasePublishedAt(release: GitHubRelease): number {
  if (!release.published_at) return 0;
  const time = new Date(release.published_at).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function buildReleaseGroups(
  results: Array<{ repo: string; releases: GitHubRelease[] }>,
  options: { maxAgeDays?: number; now?: Date } = {},
): ReleaseRepoGroup[] {
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_RELEASE_MAX_AGE_DAYS;
  const now = options.now ?? new Date();
  const minPublishedAt = now.getTime() - maxAgeDays * 86_400_000;
  const groups: ReleaseRepoGroup[] = [];

  for (const { repo, releases } of results) {
    const visible = releases
      .filter((release) => !release.draft)
      .filter((release) => {
        const publishedAt = releasePublishedAt(release);
        return publishedAt > 0 && publishedAt >= minPublishedAt;
      })
      .sort((a, b) => releasePublishedAt(b) - releasePublishedAt(a));

    if (!visible.length) continue;
    groups.push({ repo, releases: visible, totalCount: visible.length });
  }

  return groups.sort((a, b) => {
    const latestA = releasePublishedAt(a.releases[0]!);
    const latestB = releasePublishedAt(b.releases[0]!);
    if (latestA !== latestB) return latestB - latestA;
    return a.repo.localeCompare(b.repo);
  });
}

export function countVisibleReleases(groups: ReleaseRepoGroup[]): number {
  return groups.reduce((sum, group) => sum + group.releases.length, 0);
}
