import type { GitHubIssue, PrCategoryKind, PrRepoGroup, RepoGroup } from "./types";
import { repoFullFromUrl } from "./types";
import { issuesOverflowUrl, myPrsOverflowUrl, reviewOverflowUrl } from "./queries";

export const MAX_REPOS_PER_SECTION = 20;
export const MAX_ITEMS_PER_CATEGORY = 15;

function sortRepos<T>(groups: RepoGroup<T>[]): RepoGroup<T>[] {
  return [...groups].sort((a, b) => {
    const diff = b.totalCount - a.totalCount;
    if (diff !== 0) return diff;
    return a.repo.localeCompare(b.repo);
  });
}

function groupByRepo(issues: GitHubIssue[]): Map<string, GitHubIssue[]> {
  const map = new Map<string, GitHubIssue[]>();
  for (const issue of issues) {
    const repo = repoFullFromUrl(issue.repository_url);
    if (!repo) continue;
    const list = map.get(repo) ?? [];
    list.push(issue);
    map.set(repo, list);
  }
  return map;
}

function buildOverflowUrl(base: string, repo: string, extra?: string): string {
  const q = extra ? `${base}+repo:${repo}+${extra}` : `${base}+repo:${repo}`;
  return `https://github.com/search?q=${encodeURIComponent(q)}&type=issues`;
}

export function groupIssuesByRepo(issues: GitHubIssue[]): RepoGroup<GitHubIssue>[] {
  const map = groupByRepo(issues);
  const groups: RepoGroup<GitHubIssue>[] = [];

  for (const [repo, items] of map) {
    const sorted = [...items].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
    const totalCount = sorted.length;
    const visible = sorted.slice(0, MAX_ITEMS_PER_CATEGORY);
    const group: RepoGroup<GitHubIssue> = { repo, items: visible, totalCount };
    if (totalCount > MAX_ITEMS_PER_CATEGORY) {
      group.overflowUrl = buildOverflowUrl(
        "is:issue+is:open+(assignee:@me+OR+no:assignee)",
        repo,
      );
    }
    groups.push(group);
  }

  const sorted = sortRepos(groups).slice(0, MAX_REPOS_PER_SECTION);
  if (map.size > MAX_REPOS_PER_SECTION) {
    sorted.push({
      repo: "…",
      items: [],
      totalCount: 0,
      overflowUrl: issuesOverflowUrl(),
    });
  }
  return sorted;
}

export interface PrQueues {
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  waitingOnAuthor: GitHubIssue[];
}

export function buildWaitingOnAuthor(
  reviewedByMe: GitHubIssue[],
  reviewRequests: GitHubIssue[],
): GitHubIssue[] {
  const pendingIds = new Set(reviewRequests.map((pr) => pr.id));
  return reviewedByMe.filter((pr) => !pendingIds.has(pr.id));
}

const CATEGORY_ORDER: PrCategoryKind[] = ["needsReview", "myPrs", "waitingOnAuthor"];

const CATEGORY_OVERFLOW: Record<PrCategoryKind, string> = {
  needsReview: "is:pr+is:open+review-requested:@me",
  myPrs: "is:pr+is:open+author:@me",
  waitingOnAuthor: "is:pr+is:open+reviewed-by:@me+-author:@me",
};

export function groupPRsByRepoAndCategory(queues: PrQueues): PrRepoGroup[] {
  const byRepo = new Map<string, Map<PrCategoryKind, GitHubIssue[]>>();

  const add = (kind: PrCategoryKind, prs: GitHubIssue[]) => {
    for (const pr of prs) {
      const repo = repoFullFromUrl(pr.repository_url);
      if (!repo) continue;
      if (!byRepo.has(repo)) byRepo.set(repo, new Map());
      const cats = byRepo.get(repo)!;
      const list = cats.get(kind) ?? [];
      list.push(pr);
      cats.set(kind, list);
    }
  };

  add("needsReview", queues.reviewRequests);
  add("myPrs", queues.myPrs);
  add("waitingOnAuthor", queues.waitingOnAuthor);

  const repoCounts = new Map<string, number>();
  for (const [repo, cats] of byRepo) {
    let count = 0;
    for (const items of cats.values()) count += items.length;
    repoCounts.set(repo, count);
  }

  const sortedRepos = [...byRepo.keys()].sort((a, b) => {
    const diff = (repoCounts.get(b) ?? 0) - (repoCounts.get(a) ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });

  const result: PrRepoGroup[] = [];

  for (const repo of sortedRepos.slice(0, MAX_REPOS_PER_SECTION)) {
    const cats = byRepo.get(repo)!;
    const categories = CATEGORY_ORDER.flatMap((kind) => {
      const items = cats.get(kind);
      if (!items?.length) return [];
      const sorted = [...items].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      const totalCount = sorted.length;
      const visible = sorted.slice(0, MAX_ITEMS_PER_CATEGORY);
      const group = { kind, items: visible, totalCount };
      if (totalCount > MAX_ITEMS_PER_CATEGORY) {
        return [{ ...group, overflowUrl: buildOverflowUrl(CATEGORY_OVERFLOW[kind], repo) }];
      }
      return [group];
    });

    if (categories.length) {
      const totalCount = categories.reduce((sum, c) => sum + c.totalCount, 0);
      result.push({ repo, categories, totalCount });
    }
  }

  if (sortedRepos.length > MAX_REPOS_PER_SECTION) {
    result.push({
      repo: "…",
      totalCount: 0,
      categories: [
        {
          kind: "needsReview",
          items: [],
          totalCount: 0,
          overflowUrl: reviewOverflowUrl(),
        },
        {
          kind: "myPrs",
          items: [],
          totalCount: 0,
          overflowUrl: myPrsOverflowUrl(),
        },
      ],
    });
  }

  return result;
}

export function countBadgeItems(queues: {
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
}): number {
  const ids = new Set<number>();
  for (const item of [...queues.issues, ...queues.reviewRequests, ...queues.myPrs]) {
    ids.add(item.id);
  }
  return ids.size;
}
