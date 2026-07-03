import type { GitHubIssue, StarredRepo, WatchedRepo } from "@/github/types";
import { repoFullFromUrl } from "@/github/types";
import type { SavedViewId, SavedViewSettings } from "@/settings/appSettings";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface SavedViewContext {
  viewerLogin?: string | null;
  workRepos: string[];
  urgentSettings: Pick<SavedViewSettings, "urgentPrAgeDays" | "urgentPriorityLabels">;
}

export function repoOwner(fullName: string): string {
  const slash = fullName.indexOf("/");
  return slash === -1 ? fullName : fullName.slice(0, slash);
}

export function isOrgRepo(repo: string, viewerLogin?: string | null): boolean {
  if (!viewerLogin) return false;
  return repoOwner(repo) !== viewerLogin;
}

export function isWorkRepo(repo: string, workRepos: string[]): boolean {
  return workRepos.includes(repo);
}

export function matchesRepoView(repo: string, view: SavedViewId, ctx: SavedViewContext): boolean {
  if (view === "all" || view === "urgent") return true;
  if (view === "myOrgs") return isOrgRepo(repo, ctx.viewerLogin);
  if (view === "work") return isWorkRepo(repo, ctx.workRepos);
  return true;
}

export function isUrgentIssue(
  issue: GitHubIssue,
  urgentSettings: SavedViewContext["urgentSettings"],
): boolean {
  if (issue.pull_request) return false;
  const needles = urgentSettings.urgentPriorityLabels.map((label) => label.trim().toLowerCase()).filter(Boolean);
  if (!needles.length) return false;
  return issue.labels.some((label) => {
    const name = label.name.toLowerCase();
    return needles.some((needle) => name.includes(needle));
  });
}

export function isUrgentPr(
  pr: GitHubIssue,
  urgentSettings: SavedViewContext["urgentSettings"],
): boolean {
  const anchor = pr.created_at ?? pr.updated_at;
  const ageDays = (Date.now() - new Date(anchor).getTime()) / MS_PER_DAY;
  return ageDays >= urgentSettings.urgentPrAgeDays;
}

export function filterReposByView<T extends { full_name: string }>(
  repos: T[],
  view: SavedViewId,
  ctx: SavedViewContext,
): T[] {
  if (view === "all" || view === "urgent") return repos;
  return repos.filter((repo) => matchesRepoView(repo.full_name, view, ctx));
}

function issueRepo(issue: GitHubIssue): string {
  return repoFullFromUrl(issue.repository_url);
}

export function filterIssuesByView(
  issues: GitHubIssue[],
  view: SavedViewId,
  ctx: SavedViewContext,
): GitHubIssue[] {
  if (view === "all") return issues;
  if (view === "urgent") {
    return issues.filter((issue) => isUrgentIssue(issue, ctx.urgentSettings));
  }
  return issues.filter((issue) => {
    const repo = issueRepo(issue);
    return repo ? matchesRepoView(repo, view, ctx) : false;
  });
}

export interface PrQueues {
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  waitingOnAuthor: GitHubIssue[];
}

export function filterPrQueuesByView(
  queues: PrQueues,
  view: SavedViewId,
  ctx: SavedViewContext,
): PrQueues {
  const filterQueue = (items: GitHubIssue[]) => {
    if (view === "all") return items;
    if (view === "urgent") {
      return items.filter((pr) => isUrgentPr(pr, ctx.urgentSettings));
    }
    return items.filter((pr) => {
      const repo = issueRepo(pr);
      return repo ? matchesRepoView(repo, view, ctx) : false;
    });
  };

  return {
    reviewRequests: filterQueue(queues.reviewRequests),
    myPrs: filterQueue(queues.myPrs),
    waitingOnAuthor: filterQueue(queues.waitingOnAuthor),
  };
}

export function filterNotificationsByView<T extends { repository: { full_name: string } }>(
  notifications: T[],
  view: SavedViewId,
  ctx: SavedViewContext,
): T[] {
  if (view === "all" || view === "urgent") return notifications;
  return notifications.filter((notification) =>
    matchesRepoView(notification.repository.full_name, view, ctx),
  );
}

export function buildSavedViewContext(
  savedViews: SavedViewSettings,
  viewerLogin?: string | null,
): SavedViewContext {
  return {
    viewerLogin,
    workRepos: savedViews.workRepos,
    urgentSettings: {
      urgentPrAgeDays: savedViews.urgentPrAgeDays,
      urgentPriorityLabels: savedViews.urgentPriorityLabels,
    },
  };
}

export function sortRepoNames(
  repos: string[],
  repoCounts: Map<string, number>,
  pinnedRepos: string[] = [],
): string[] {
  const pinnedIndex = new Map(pinnedRepos.map((repo, index) => [repo, index]));
  return [...repos].sort((a, b) => {
    const aPin = pinnedIndex.get(a);
    const bPin = pinnedIndex.get(b);
    if (aPin !== undefined || bPin !== undefined) {
      if (aPin === undefined) return 1;
      if (bPin === undefined) return -1;
      return aPin - bPin;
    }
    const diff = (repoCounts.get(b) ?? 0) - (repoCounts.get(a) ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
}

export type { StarredRepo, WatchedRepo };
