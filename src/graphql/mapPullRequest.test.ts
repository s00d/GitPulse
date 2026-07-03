import { describe, expect, it } from "vitest";
import {
  mapGraphqlPullRequest,
  mapGraphqlPullRequestSearchNodes,
  mergePrCiMaps,
} from "@/graphql/mapPullRequest";
import type { GraphqlPullRequestQueueItem } from "@/graphql/fragments/pullRequestQueueItem";

const samplePr: GraphqlPullRequestQueueItem = {
  id: "PR_kwDOExample",
  fullDatabaseId: "42",
  number: 7,
  title: "Fix CI",
  url: "https://github.com/acme/widget/pull/7",
  updatedAt: "2026-01-15T10:00:00Z",
  state: "OPEN",
  isDraft: false,
  repository: { nameWithOwner: "acme/widget" },
  author: {
    login: "dev",
    avatarUrl: "https://avatars.githubusercontent.com/u/1",
    url: "https://github.com/dev",
  },
  labels: {
    nodes: [{ name: "bug", color: "ff0000" }],
  },
  statusCheckRollup: { state: "SUCCESS" },
};

describe("mapGraphqlPullRequest", () => {
  it("maps GraphQL PR node to GitHubIssue and CI status", () => {
    const mapped = mapGraphqlPullRequest(samplePr);
    expect(mapped.issue).toMatchObject({
      id: 42,
      number: 7,
      title: "Fix CI",
      html_url: "https://github.com/acme/widget/pull/7",
      repository_url: "https://api.github.com/repos/acme/widget",
      draft: false,
      pull_request: { html_url: "https://github.com/acme/widget/pull/7" },
      user: {
        login: "dev",
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        html_url: "https://github.com/dev",
      },
      graphql_id: "PR_kwDOExample",
    });
    expect(mapped.issue.labels).toEqual([{ id: 0, name: "bug", color: "ff0000" }]);
    expect(mapped.ciStatus).toEqual({ state: "success", totalCount: 1 });
  });

  it("falls back to number when fullDatabaseId is missing", () => {
    const mapped = mapGraphqlPullRequest({ ...samplePr, fullDatabaseId: null });
    expect(mapped.issue.id).toBe(7);
  });
});

describe("mapGraphqlPullRequestSearchNodes", () => {
  it("builds issues list and prCiById for visible CI states", () => {
    const pendingPr = {
      ...samplePr,
      fullDatabaseId: "99",
      statusCheckRollup: { state: "PENDING" as const },
    };
    const noCiPr = {
      ...samplePr,
      fullDatabaseId: "100",
      statusCheckRollup: null,
    };

    const result = mapGraphqlPullRequestSearchNodes([samplePr, pendingPr, noCiPr]);
    expect(result.issues).toHaveLength(3);
    expect(result.prCiById).toEqual({
      42: { state: "success", totalCount: 1 },
      99: { state: "pending", totalCount: 1 },
    });
  });
});

describe("mergePrCiMaps", () => {
  it("merges multiple maps with later keys winning", () => {
    expect(
      mergePrCiMaps(
        { 1: { state: "success", totalCount: 1 } },
        { 2: { state: "pending", totalCount: 1 } },
        { 1: { state: "failure", totalCount: 1 } },
      ),
    ).toEqual({
      1: { state: "failure", totalCount: 1 },
      2: { state: "pending", totalCount: 1 },
    });
  });
});
