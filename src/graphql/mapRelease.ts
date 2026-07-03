import type { GitHubRelease, GitHubUser } from "@/github/types";
import type { GraphqlReleaseListItem } from "@/graphql/fragments/releaseListItem";

function mapAuthor(author: GraphqlReleaseListItem["author"]): GitHubUser {
  return {
    login: author?.login ?? "ghost",
    avatar_url: author?.avatarUrl ?? undefined,
    html_url: author?.url ?? undefined,
  };
}

export function mapGraphqlRelease(node: GraphqlReleaseListItem): GitHubRelease {
  return {
    id: node.databaseId ?? 0,
    tag_name: node.tagName,
    name: node.name ?? null,
    html_url: node.url,
    published_at: node.publishedAt ?? null,
    draft: node.isDraft,
    prerelease: node.isPrerelease,
    author: mapAuthor(node.author),
  };
}
