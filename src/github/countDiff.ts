import type { GitHubIssue, PrRepoGroup, RepoGroup } from "@/github/types";

export type CountSnapshot = Record<string, number>;

export const PRS_TOTAL_KEY = "prs:total";
export const NOTIFICATIONS_TOTAL_KEY = "notifications:total";
export const WATCHING_TOTAL_KEY = "watching:total";

export interface CountSource {
  issueGroups: RepoGroup<GitHubIssue>[];
  prGroups: PrRepoGroup[];
  prTotal: number;
  notificationsUnread: number;
  watchingTotal: number;
}

export function issueRepoKey(repo: string): string {
  return `issues:${repo}`;
}

export function prRepoKey(repo: string): string {
  return `prs:${repo}`;
}

export function buildCountSnapshot(source: CountSource): CountSnapshot {
  const snapshot: CountSnapshot = {
    [PRS_TOTAL_KEY]: source.prTotal,
    [NOTIFICATIONS_TOTAL_KEY]: source.notificationsUnread,
    [WATCHING_TOTAL_KEY]: source.watchingTotal,
  };

  for (const group of source.issueGroups) {
    snapshot[issueRepoKey(group.repo)] = group.totalCount;
  }

  for (const group of source.prGroups) {
    snapshot[prRepoKey(group.repo)] = group.totalCount;
  }

  return snapshot;
}

export function computeCountDeltas(
  current: CountSnapshot,
  seen: CountSnapshot | null,
): Record<string, number> {
  if (!seen) return {};

  const deltas: Record<string, number> = {};
  for (const [key, count] of Object.entries(current)) {
    const previous = seen[key] ?? 0;
    const delta = count - previous;
    if (delta > 0) {
      deltas[key] = delta;
    }
  }

  return deltas;
}

export function countSignature(snapshot: CountSnapshot): string {
  return Object.entries(snapshot)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}:${count}`)
    .join("|");
}
