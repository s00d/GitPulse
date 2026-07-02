import type {
  GitHubIssue,
  GitHubNotification,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";
import { repoFullFromUrl } from "@/github/types";

export type RepoVisibilityMap = Record<string, boolean>;

export function isRepoEnabled(repo: string, visibility: RepoVisibilityMap): boolean {
  if (!repo || repo === "…") return true;
  return visibility[repo] !== false;
}

export function filterIssuesByRepoVisibility(
  issues: GitHubIssue[],
  visibility: RepoVisibilityMap,
): GitHubIssue[] {
  return issues.filter((issue) => {
    const repo = repoFullFromUrl(issue.repository_url);
    return isRepoEnabled(repo, visibility);
  });
}

export function filterNotificationsByRepoVisibility(
  notifications: GitHubNotification[],
  visibility: RepoVisibilityMap,
): GitHubNotification[] {
  return notifications.filter((notification) =>
    isRepoEnabled(notification.repository.full_name, visibility),
  );
}

export function filterReposByVisibility<T extends { full_name: string }>(
  repos: T[],
  visibility: RepoVisibilityMap,
): T[] {
  return repos.filter((repo) => isRepoEnabled(repo.full_name, visibility));
}

export type WatchedRepoLike = WatchedRepo;

export function filterWatchedRepos(
  repos: WatchedRepoLike[],
  visibility: RepoVisibilityMap,
): WatchedRepoLike[] {
  return filterReposByVisibility(repos, visibility);
}

export function filterStarredRepos(
  repos: StarredRepo[],
  visibility: RepoVisibilityMap,
): StarredRepo[] {
  return filterReposByVisibility(repos, visibility);
}

export function collectReposFromSource(input: {
  issues?: GitHubIssue[];
  reviewRequests?: GitHubIssue[];
  myPrs?: GitHubIssue[];
  waitingOnAuthor?: GitHubIssue[];
  starredRepos?: StarredRepo[];
  watchedRepos?: WatchedRepo[];
  notifications?: GitHubNotification[];
}): string[] {
  const repos = new Set<string>();

  for (const issue of [
    ...(input.issues ?? []),
    ...(input.reviewRequests ?? []),
    ...(input.myPrs ?? []),
    ...(input.waitingOnAuthor ?? []),
  ]) {
    const repo = repoFullFromUrl(issue.repository_url);
    if (repo && repo !== "…") repos.add(repo);
  }
  for (const repo of input.starredRepos ?? []) {
    repos.add(repo.full_name);
  }
  for (const repo of input.watchedRepos ?? []) {
    repos.add(repo.full_name);
  }
  for (const notification of input.notifications ?? []) {
    repos.add(notification.repository.full_name);
  }

  return [...repos].sort((a, b) => a.localeCompare(b));
}

export function collectKnownRepos(input: {
  issueGroups?: Array<{ repo: string }>;
  prGroups?: Array<{ repo: string }>;
  starredRepos?: StarredRepo[];
  watchedRepos?: WatchedRepo[];
  notifications?: GitHubNotification[];
}): string[] {
  const repos = new Set<string>();

  for (const group of input.issueGroups ?? []) {
    if (group.repo && group.repo !== "…") repos.add(group.repo);
  }
  for (const group of input.prGroups ?? []) {
    if (group.repo && group.repo !== "…") repos.add(group.repo);
  }
  for (const repo of input.starredRepos ?? []) {
    repos.add(repo.full_name);
  }
  for (const repo of input.watchedRepos ?? []) {
    repos.add(repo.full_name);
  }
  for (const notification of input.notifications ?? []) {
    repos.add(notification.repository.full_name);
  }

  return [...repos].sort((a, b) => a.localeCompare(b));
}
