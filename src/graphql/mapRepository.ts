import type { StarredRepo } from "@/github/types";
import type { GraphqlRepositoryListItem } from "@/graphql/fragments/repositoryListItem";

export function mapGraphqlRepository(node: GraphqlRepositoryListItem): StarredRepo {
  return {
    id: node.databaseId ?? 0,
    full_name: node.nameWithOwner,
    html_url: node.url,
    description: node.description ?? null,
    stargazers_count: node.stargazerCount,
    updated_at: node.updatedAt,
  };
}

export function mapGraphqlRepositoryNodes(
  nodes: Array<GraphqlRepositoryListItem | null | undefined> | null | undefined,
): StarredRepo[] {
  const repos: StarredRepo[] = [];
  for (const node of nodes ?? []) {
    if (!node) continue;
    repos.push(mapGraphqlRepository(node));
  }
  return repos;
}

export interface RepositoryConnectionPage {
  repos: StarredRepo[];
  endCursor: string | null;
  hasMore: boolean;
}

export function mapRepositoryConnectionPage(input: {
  nodes?: Array<GraphqlRepositoryListItem | null> | null;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } | null;
}): RepositoryConnectionPage {
  const repos = mapGraphqlRepositoryNodes(input.nodes);
  const pageInfo = input.pageInfo;
  return {
    repos,
    endCursor: pageInfo?.endCursor ?? null,
    hasMore: Boolean(pageInfo?.hasNextPage && pageInfo.endCursor),
  };
}
