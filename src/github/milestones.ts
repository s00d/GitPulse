import type { RepoVisibilityMap } from "./repoVisibility";
import { isRepoEnabled } from "./repoVisibility";
import type { GitHubIssue, GitHubMilestone, MilestoneRepoGroup, RepoGroup } from "./types";

export const MAX_MILESTONE_TRACK_REPOS = 8;

export function milestoneTrackRepos(
  issueGroups: RepoGroup<GitHubIssue>[],
  visibility: RepoVisibilityMap,
  max = MAX_MILESTONE_TRACK_REPOS,
): string[] {
  return issueGroups
    .map((group) => group.repo)
    .filter((repo) => repo && repo !== "…" && isRepoEnabled(repo, visibility))
    .slice(0, max);
}

export function milestonesIndexUrl(repo: string): string {
  return `https://github.com/${repo}/milestones`;
}

export function buildMilestoneGroups(
  results: Array<{ repo: string; milestones: GitHubMilestone[] }>,
): MilestoneRepoGroup[] {
  const groups: MilestoneRepoGroup[] = [];

  for (const { repo, milestones } of results) {
    const open = milestones.filter((milestone) => milestone.open_issues > 0);
    if (!open.length) continue;
    const totalOpenIssues = open.reduce((sum, milestone) => sum + milestone.open_issues, 0);
    groups.push({ repo, milestones: open, totalOpenIssues });
  }

  return groups.sort((a, b) => {
    const diff = b.totalOpenIssues - a.totalOpenIssues;
    if (diff !== 0) return diff;
    return a.repo.localeCompare(b.repo);
  });
}
