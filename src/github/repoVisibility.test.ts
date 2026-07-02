import { describe, expect, it } from "vitest";
import {
  collectReposFromSource,
  filterIssuesByRepoVisibility,
  isRepoEnabled,
} from "@/github/repoVisibility";
import type { GitHubIssue } from "@/github/types";

function issue(repoUrl: string, id: number): GitHubIssue {
  return {
    id,
    number: id,
    title: "test",
    html_url: "https://github.com/o/r/issues/1",
    repository_url: repoUrl,
    state: "open",
    assignees: [],
    labels: [],
    user: { login: "user" },
    updated_at: "2026-01-01T00:00:00Z",
    comments: 0,
  };
}

describe("repoVisibility", () => {
  it("treats missing keys as enabled", () => {
    expect(isRepoEnabled("owner/repo", {})).toBe(true);
    expect(isRepoEnabled("owner/repo", { "owner/repo": false })).toBe(false);
  });

  it("filters issues by repository", () => {
    const issues = [
      issue("https://api.github.com/repos/owner/a", 1),
      issue("https://api.github.com/repos/owner/b", 2),
    ];
    const filtered = filterIssuesByRepoVisibility(issues, { "owner/b": false });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.repository_url).toContain("/owner/a");
  });

  it("collects unique repos from source collections", () => {
    const repos = collectReposFromSource({
      issues: [issue("https://api.github.com/repos/owner/a", 1)],
      myPrs: [issue("https://api.github.com/repos/owner/b", 2)],
      starredRepos: [{ full_name: "owner/c" } as never],
    });
    expect(repos).toEqual(["owner/a", "owner/b", "owner/c"]);
  });
});
