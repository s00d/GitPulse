import { describe, expect, it } from "vitest";
import {
  buildSavedViewContext,
  filterIssuesByView,
  filterPrQueuesByView,
  filterReposByView,
  isOrgRepo,
  isUrgentIssue,
  isUrgentPr,
  sortRepoNames,
} from "@/github/savedViews";
import { DEFAULT_SAVED_VIEW_SETTINGS } from "@/settings/appSettings";
import type { StarredRepo } from "@/github/types";

const ctx = buildSavedViewContext(DEFAULT_SAVED_VIEW_SETTINGS, "alice");

function issue(
  id: number,
  repo: string,
  opts: { labels?: string[]; created_at?: string; updated_at?: string; pr?: boolean } = {},
) {
  return {
    id,
    repository_url: `https://api.github.com/repos/${repo}`,
    labels: (opts.labels ?? []).map((name, index) => ({ id: index, name, color: "ffffff" })),
    created_at: opts.created_at,
    updated_at: opts.updated_at ?? new Date().toISOString(),
    pull_request: opts.pr ? { html_url: "https://github.com/x/y/pull/1" } : null,
  } as never;
}

function repo(fullName: string): StarredRepo {
  return { full_name: fullName } as StarredRepo;
}

describe("savedViews", () => {
  it("detects org repos from viewer login", () => {
    expect(isOrgRepo("alice/personal", "alice")).toBe(false);
    expect(isOrgRepo("acme/work", "alice")).toBe(true);
  });

  it("filters my org repos", () => {
    const filtered = filterReposByView(
      [repo("alice/personal"), repo("acme/work")],
      "myOrgs",
      ctx,
    );
    expect(filtered.map((entry) => entry.full_name)).toEqual(["acme/work"]);
  });

  it("filters work repos only", () => {
    const workCtx = buildSavedViewContext(
      { ...DEFAULT_SAVED_VIEW_SETTINGS, workRepos: ["acme/one", "acme/two"] },
      "alice",
    );
    const filtered = filterReposByView(
      [repo("alice/personal"), repo("acme/one"), repo("acme/other")],
      "work",
      workCtx,
    );
    expect(filtered.map((entry) => entry.full_name)).toEqual(["acme/one"]);
  });

  it("flags urgent PRs by age", () => {
    const old = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(isUrgentPr(issue(1, "acme/r", { created_at: old, pr: true }), ctx.urgentSettings)).toBe(
      true,
    );
    expect(
      isUrgentPr(issue(2, "acme/r", { created_at: recent, pr: true }), ctx.urgentSettings),
    ).toBe(false);
  });

  it("flags urgent issues by priority label", () => {
    expect(isUrgentIssue(issue(1, "acme/r", { labels: ["priority"] }), ctx.urgentSettings)).toBe(
      true,
    );
    expect(isUrgentIssue(issue(2, "acme/r", { labels: ["P0-priority"] }), ctx.urgentSettings)).toBe(
      true,
    );
    expect(isUrgentIssue(issue(3, "acme/r", { labels: ["bug"] }), ctx.urgentSettings)).toBe(false);
  });

  it("filters urgent issues and PR queues", () => {
    const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const issues = [
      issue(1, "acme/r", { labels: ["priority"] }),
      issue(2, "acme/r", { labels: ["bug"] }),
    ];
    const queues = filterPrQueuesByView(
      {
        reviewRequests: [issue(10, "acme/r", { created_at: old, pr: true })],
        myPrs: [issue(11, "acme/r", { created_at: new Date().toISOString(), pr: true })],
        waitingOnAuthor: [],
      },
      "urgent",
      ctx,
    );
    expect(filterIssuesByView(issues, "urgent", ctx).map((item) => item.id)).toEqual([1]);
    expect(queues.reviewRequests.map((item) => item.id)).toEqual([10]);
    expect(queues.myPrs).toEqual([]);
  });

  it("sorts pinned repos ahead of count", () => {
    const counts = new Map([
      ["acme/big", 10],
      ["acme/small", 1],
      ["acme/pinned", 1],
    ]);
    expect(sortRepoNames(["acme/big", "acme/small", "acme/pinned"], counts, ["acme/pinned"])).toEqual(
      ["acme/pinned", "acme/big", "acme/small"],
    );
  });
});
