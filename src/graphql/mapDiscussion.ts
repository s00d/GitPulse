import type { GitHubDiscussionItem, GitHubUser } from "@/github/types";
import type { GraphqlDiscussionListItem } from "@/graphql/fragments/discussionListItem";

function mapAuthor(author: GraphqlDiscussionListItem["author"]): GitHubUser {
  return {
    login: author?.login ?? "ghost",
    avatar_url: author?.avatarUrl ?? undefined,
    html_url: author?.url ?? undefined,
  };
}

export function mapGraphqlDiscussion(
  node: GraphqlDiscussionListItem,
  repo: string,
): GitHubDiscussionItem {
  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    updatedAt: node.updatedAt,
    repo,
    author: mapAuthor(node.author),
    category: node.category?.name ?? undefined,
    commentCount: node.comments?.totalCount ?? undefined,
    unread: false,
  };
}

export function sortDiscussionsByUpdatedDesc(items: GitHubDiscussionItem[]): GitHubDiscussionItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
