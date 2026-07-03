import type { GithubGraphqlClient } from "@/graphql/execute";
import { RepositoryListItemFragment } from "@/graphql/fragments/repositoryListItem";
import { executeGithubGraphql, type ExecuteGithubGraphqlOptions } from "@/graphql/execute";
import { graphql, readFragment, type ResultOf } from "@/graphql/github";
import { mapRepositoryConnectionPage } from "@/graphql/mapRepository";

export type RepoListKind = "starred" | "owned" | "watching";

const StarredReposPageQuery = graphql(
  `
    query StarredReposPage($first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
      }
      viewer {
        starredRepositories(
          first: $first
          after: $after
          orderBy: { field: STARRED_AT, direction: DESC }
        ) {
          nodes {
            ...RepositoryListItem
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,
  [RepositoryListItemFragment],
);

const OwnedReposPageQuery = graphql(
  `
    query OwnedReposPage($first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
      }
      viewer {
        repositories(
          first: $first
          after: $after
          affiliations: OWNER
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            ...RepositoryListItem
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,
  [RepositoryListItemFragment],
);

const WatchingReposPageQuery = graphql(
  `
    query WatchingReposPage($first: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
      }
      viewer {
        watching(first: $first, after: $after, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            ...RepositoryListItem
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,
  [RepositoryListItemFragment],
);

type StarredPageData = ResultOf<typeof StarredReposPageQuery>;
type OwnedPageData = ResultOf<typeof OwnedReposPageQuery>;
type WatchingPageData = ResultOf<typeof WatchingReposPageQuery>;

export async function fetchRepoListPage(
  client: GithubGraphqlClient,
  kind: RepoListKind,
  first: number,
  after: string | null,
  options?: ExecuteGithubGraphqlOptions,
) {
  if (kind === "starred") {
    const data = await executeGithubGraphql<StarredPageData, Record<string, unknown>>(
      client,
      StarredReposPageQuery,
      { first, after },
      "GraphQL starred repos page failed",
      options,
    );
    return mapRepositoryConnectionPage({
      nodes: data.viewer.starredRepositories.nodes?.map((node) =>
        readFragment(RepositoryListItemFragment, node),
      ),
      pageInfo: data.viewer.starredRepositories.pageInfo,
    });
  }

  if (kind === "owned") {
    const data = await executeGithubGraphql<OwnedPageData, Record<string, unknown>>(
      client,
      OwnedReposPageQuery,
      { first, after },
      "GraphQL owned repos page failed",
      options,
    );
    return mapRepositoryConnectionPage({
      nodes: data.viewer.repositories.nodes?.map((node) =>
        readFragment(RepositoryListItemFragment, node),
      ),
      pageInfo: data.viewer.repositories.pageInfo,
    });
  }

  const data = await executeGithubGraphql<WatchingPageData, Record<string, unknown>>(
    client,
    WatchingReposPageQuery,
    { first, after },
    "GraphQL watching repos page failed",
    options,
  );
  return mapRepositoryConnectionPage({
    nodes: data.viewer.watching.nodes?.map((node) => readFragment(RepositoryListItemFragment, node)),
    pageInfo: data.viewer.watching.pageInfo,
  });
}
