import { describe, expect, it } from "vitest";
import { mapGraphqlIssue } from "@/graphql/mapIssue";
import type { GraphqlIssueQueueItem } from "@/graphql/fragments/issueQueueItem";
import { mapGraphqlRepository } from "@/graphql/mapRepository";
import type { GraphqlRepositoryListItem } from "@/graphql/fragments/repositoryListItem";

const sampleIssue: GraphqlIssueQueueItem = {
  databaseId: 11,
  number: 3,
  title: "Fix bug",
  url: "https://github.com/acme/widget/issues/3",
  updatedAt: "2026-01-10T10:00:00Z",
  state: "OPEN",
  repository: { nameWithOwner: "acme/widget" },
  author: { login: "dev", avatarUrl: "https://avatars.githubusercontent.com/u/1", url: "https://github.com/dev" },
  labels: { nodes: [{ name: "bug", color: "ff0000" }] },
};

const sampleRepo: GraphqlRepositoryListItem = {
  databaseId: 99,
  nameWithOwner: "acme/widget",
  url: "https://github.com/acme/widget",
  description: "Widget repo",
  stargazerCount: 42,
  updatedAt: "2026-01-12T10:00:00Z",
};

describe("mapGraphqlIssue", () => {
  it("maps issue search node to GitHubIssue", () => {
    const issue = mapGraphqlIssue(sampleIssue);
    expect(issue).toMatchObject({
      id: 11,
      number: 3,
      title: "Fix bug",
      repository_url: "https://api.github.com/repos/acme/widget",
      user: { login: "dev" },
    });
  });
});

describe("mapGraphqlRepository", () => {
  it("maps repository node to StarredRepo", () => {
    const repo = mapGraphqlRepository(sampleRepo);
    expect(repo).toEqual({
      id: 99,
      full_name: "acme/widget",
      html_url: "https://github.com/acme/widget",
      description: "Widget repo",
      stargazers_count: 42,
      updated_at: "2026-01-12T10:00:00Z",
    });
  });
});
