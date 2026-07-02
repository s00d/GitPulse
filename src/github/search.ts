import type { ActivityEvent } from "./itemDiff";
import type {
  FeedItem,
  GitHubIssue,
  GitHubNotification,
  PrRepoGroup,
  RepoGroup,
  StarredRepo,
} from "./types";
import { repoFullFromUrl } from "./types";

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function matchesSearch(
  haystacks: Array<string | number | null | undefined>,
  query: string,
): boolean {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return true;
  return haystacks.some((value) => String(value ?? "").toLowerCase().includes(normalized));
}

export function issueSearchHaystacks(
  issue: GitHubIssue,
  repo?: string,
): Array<string | number> {
  return [
    issue.title,
    issue.number,
    repo ?? repoFullFromUrl(issue.repository_url),
    ...issue.labels.map((label) => label.name),
    issue.user.login,
  ];
}

export function repoSearchHaystacks(repo: StarredRepo): string[] {
  return [repo.full_name, repo.description ?? ""];
}

export function notificationSearchHaystacks(notification: GitHubNotification): string[] {
  return [
    notification.subject.title,
    notification.repository.full_name,
    notification.reason,
    notification.subject.type,
  ];
}

export function activitySearchHaystacks(event: ActivityEvent): Array<string | number> {
  return [event.title, event.repo, event.kind, event.change, event.number ?? ""];
}

export function filterIssueGroups(
  groups: RepoGroup<GitHubIssue>[],
  query: string,
): RepoGroup<GitHubIssue>[] {
  if (!normalizeSearchQuery(query)) return groups;

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((issue) =>
        matchesSearch(issueSearchHaystacks(issue, group.repo), query),
      ),
      totalCount: group.items.filter((issue) =>
        matchesSearch(issueSearchHaystacks(issue, group.repo), query),
      ).length,
    }))
    .filter((group) => group.items.length > 0);
}

export function filterPrGroups(groups: PrRepoGroup[], query: string): PrRepoGroup[] {
  if (!normalizeSearchQuery(query)) return groups;

  return groups
    .map((group) => {
      const categories = group.categories
        .map((category) => ({
          ...category,
          items: category.items.filter((pr) =>
            matchesSearch(issueSearchHaystacks(pr, group.repo), query),
          ),
          totalCount: category.items.filter((pr) =>
            matchesSearch(issueSearchHaystacks(pr, group.repo), query),
          ).length,
        }))
        .filter((category) => category.items.length > 0);

      const totalCount = categories.reduce((sum, category) => sum + category.totalCount, 0);
      return { ...group, categories, totalCount };
    })
    .filter((group) => group.categories.length > 0);
}

export function filterRepos<T extends StarredRepo>(repos: T[], query: string): T[] {
  if (!normalizeSearchQuery(query)) return repos;
  return repos.filter((repo) => matchesSearch(repoSearchHaystacks(repo), query));
}

export function filterNotifications(
  notifications: GitHubNotification[],
  query: string,
): GitHubNotification[] {
  if (!normalizeSearchQuery(query)) return notifications;
  return notifications.filter((notification) =>
    matchesSearch(notificationSearchHaystacks(notification), query),
  );
}

export function filterActivityEvents(events: ActivityEvent[], query: string): ActivityEvent[] {
  if (!normalizeSearchQuery(query)) return events;
  return events.filter((event) => matchesSearch(activitySearchHaystacks(event), query));
}

export function filterFeedItems(items: FeedItem[], query: string): FeedItem[] {
  if (!normalizeSearchQuery(query)) return items;
  return items.filter((item) =>
    matchesSearch(
      [
        item.title,
        item.subtitle,
        item.description ?? "",
        item.actorLogin ?? "",
        item.repoName ?? "",
        item.eventType,
      ],
      query,
    ),
  );
}

export function sortReposByUpdatedDesc<T extends Pick<StarredRepo, "updated_at">>(repos: T[]): T[] {
  return [...repos].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export function sortReposByStarsDesc<T extends Pick<StarredRepo, "stargazers_count" | "full_name">>(
  repos: T[],
): T[] {
  return [...repos].sort(
    (a, b) =>
      b.stargazers_count - a.stargazers_count || a.full_name.localeCompare(b.full_name),
  );
}

export function sortNotificationsByUpdatedDesc(
  notifications: GitHubNotification[],
): GitHubNotification[] {
  return [...notifications].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}
