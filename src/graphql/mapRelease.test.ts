import { describe, expect, it } from "vitest";
import type { GraphqlDiscussionListItem } from "@/graphql/fragments/discussionListItem";
import type { GraphqlReleaseListItem } from "@/graphql/fragments/releaseListItem";
import { mapGraphqlRelease } from "@/graphql/mapRelease";
import { mapGraphqlDiscussion } from "@/graphql/mapDiscussion";

describe("mapGraphqlRelease", () => {
  it("maps GraphQL release fields", () => {
    const node: GraphqlReleaseListItem = {
      databaseId: 5,
      tagName: "v1.0.0",
      name: "Release 1",
      url: "https://github.com/acme/widget/releases/tag/v1.0.0",
      publishedAt: "2026-01-01T00:00:00Z",
      isDraft: false,
      isPrerelease: false,
      author: { login: "dev", avatarUrl: "", url: "" },
    };
    const release = mapGraphqlRelease(node);
    expect(release.tag_name).toBe("v1.0.0");
    expect(release.draft).toBe(false);
  });
});

describe("mapGraphqlDiscussion", () => {
  it("maps GraphQL discussion fields", () => {
    const node: GraphqlDiscussionListItem = {
      id: "DIS_1",
      number: 2,
      title: "RFC",
      url: "https://github.com/acme/widget/discussions/2",
      updatedAt: "2026-01-02T00:00:00Z",
      author: { login: "dev", avatarUrl: "", url: "" },
      category: { name: "Ideas" },
      comments: { totalCount: 3 },
    };
    const item = mapGraphqlDiscussion(node, "acme/widget");
    expect(item).toMatchObject({
      id: "DIS_1",
      repo: "acme/widget",
      category: "Ideas",
      commentCount: 3,
      unread: false,
    });
  });
});
