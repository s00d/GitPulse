import type { GithubGraphqlClient } from "@/graphql/execute";
import { GITHUB_SEARCH } from "@/github/queries";
import type { GitHubIssue, GitHubViewer, PrCiStatus, StarredRepo, WatchedRepo } from "@/github/types";
import { IssueQueueItemFragment } from "@/graphql/fragments/issueQueueItem";
import { PullRequestQueueItemFragment } from "@/graphql/fragments/pullRequestQueueItem";
import { RepositoryListItemFragment } from "@/graphql/fragments/repositoryListItem";
import { executeGithubGraphql, type ExecuteGithubGraphqlOptions } from "@/graphql/execute";
import { graphql, readFragment, type ResultOf, type VariablesOf } from "@/graphql/github";
import { mapGraphqlIssueSearchNodes, mergeIssuesById } from "@/graphql/mapIssue";
import {
  mapGraphqlPullRequestSearchNodes,
  mergePrCiMaps,
} from "@/graphql/mapPullRequest";
import { mapRepositoryConnectionPage } from "@/graphql/mapRepository";

export const DASHBOARD_REFRESH_PAGE_SIZE = 50;

export const DashboardRefreshQuery = graphql(
  `
    query DashboardRefresh(
      $first: Int!
      $assignedIssuesQuery: String!
      $unassignedOwnedIssuesQuery: String!
      $reviewRequestsQuery: String!
      $myPrsQuery: String!
      $reviewedByMeQuery: String!
      $skipIssues: Boolean!
      $skipPullRequests: Boolean!
      $skipStars: Boolean!
      $skipOwned: Boolean!
      $skipWatching: Boolean!
    ) {
      rateLimit {
        cost
        remaining
        limit
      }
      viewer {
        login
        avatarUrl
      }
      assignedIssues: search(query: $assignedIssuesQuery, type: ISSUE, first: $first)
        @skip(if: $skipIssues) {
        nodes {
          __typename
          ... on Issue {
            ...IssueQueueItem
          }
        }
      }
      unassignedOwnedIssues: search(query: $unassignedOwnedIssuesQuery, type: ISSUE, first: $first)
        @skip(if: $skipIssues) {
        nodes {
          __typename
          ... on Issue {
            ...IssueQueueItem
          }
        }
      }
      reviewRequests: search(query: $reviewRequestsQuery, type: ISSUE, first: $first)
        @skip(if: $skipPullRequests) {
        nodes {
          __typename
          ... on PullRequest {
            ...PullRequestQueueItem
          }
        }
      }
      myPrs: search(query: $myPrsQuery, type: ISSUE, first: $first) @skip(if: $skipPullRequests) {
        nodes {
          __typename
          ... on PullRequest {
            ...PullRequestQueueItem
          }
        }
      }
      reviewedByMe: search(query: $reviewedByMeQuery, type: ISSUE, first: $first)
        @skip(if: $skipPullRequests) {
        nodes {
          __typename
          ... on PullRequest {
            ...PullRequestQueueItem
          }
        }
      }
      starred: viewer @skip(if: $skipStars) {
        starredRepositories(
          first: $first
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
      owned: viewer @skip(if: $skipOwned) {
        repositories(
          first: $first
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
      watched: viewer @skip(if: $skipWatching) {
        watching(first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
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
  [IssueQueueItemFragment, PullRequestQueueItemFragment, RepositoryListItemFragment],
);

export interface DashboardRefreshFlags {
  includeIssues?: boolean;
  includePullRequests?: boolean;
  includeStars?: boolean;
  includeOwned?: boolean;
  includeWatching?: boolean;
}

export interface DashboardRefreshResult {
  viewer: GitHubViewer;
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  reviewedByMe: GitHubIssue[];
  prCiById: Record<number, PrCiStatus>;
  starredRepos: StarredRepo[];
  ownedRepos: StarredRepo[];
  watchedRepos: WatchedRepo[];
  starsPage: { endCursor: string | null; hasMore: boolean };
  ownedReposPage: { endCursor: string | null; hasMore: boolean };
  watchingPage: { endCursor: string | null; hasMore: boolean };
}

type DashboardRefreshData = ResultOf<typeof DashboardRefreshQuery>;
type DashboardRefreshVariables = VariablesOf<typeof DashboardRefreshQuery>;
type IssueSearchNodes = NonNullable<DashboardRefreshData["assignedIssues"]>["nodes"];
type PrSearchNodes = NonNullable<DashboardRefreshData["reviewRequests"]>["nodes"];

function mapIssueSearchNodes(nodes: IssueSearchNodes | null | undefined) {
  const issues = (nodes ?? [])
    .map((node) => {
      if (!node || node.__typename !== "Issue") return null;
      return readFragment(IssueQueueItemFragment, node);
    })
    .filter((node) => node != null);
  return mapGraphqlIssueSearchNodes(issues);
}

function mapPrSearchNodes(nodes: PrSearchNodes | null | undefined) {
  const pullRequests = (nodes ?? [])
    .map((node) => {
      if (!node || node.__typename !== "PullRequest") return null;
      return readFragment(PullRequestQueueItemFragment, node);
    })
    .filter((node) => node != null);
  return mapGraphqlPullRequestSearchNodes(pullRequests);
}

function mapViewer(viewer: DashboardRefreshData["viewer"]): GitHubViewer {
  return {
    login: viewer.login,
    avatar_url: viewer.avatarUrl,
  };
}

export async function fetchDashboardRefresh(
  client: GithubGraphqlClient,
  first: number,
  flags: DashboardRefreshFlags = {},
  options?: ExecuteGithubGraphqlOptions,
): Promise<DashboardRefreshResult> {
  const includeIssues = flags.includeIssues ?? true;
  const includePullRequests = flags.includePullRequests ?? true;
  const includeStars = flags.includeStars ?? true;
  const includeOwned = flags.includeOwned ?? true;
  const includeWatching = flags.includeWatching ?? true;

  const data = await executeGithubGraphql(
    client,
    DashboardRefreshQuery,
    {
      first,
      assignedIssuesQuery: GITHUB_SEARCH.assignedIssues,
      unassignedOwnedIssuesQuery: GITHUB_SEARCH.unassignedOwnedIssues,
      reviewRequestsQuery: GITHUB_SEARCH.reviewRequests,
      myPrsQuery: GITHUB_SEARCH.myPrs,
      reviewedByMeQuery: GITHUB_SEARCH.reviewedByMe,
      skipIssues: !includeIssues,
      skipPullRequests: !includePullRequests,
      skipStars: !includeStars,
      skipOwned: !includeOwned,
      skipWatching: !includeWatching,
    } satisfies DashboardRefreshVariables,
    "GraphQL dashboard refresh query failed",
    options,
  );

  const assigned = includeIssues ? mapIssueSearchNodes(data.assignedIssues?.nodes) : [];
  const unassigned = includeIssues ? mapIssueSearchNodes(data.unassignedOwnedIssues?.nodes) : [];
  const reviewRequests = includePullRequests
    ? mapPrSearchNodes(data.reviewRequests?.nodes)
    : { issues: [], prCiById: {} };
  const myPrs = includePullRequests
    ? mapPrSearchNodes(data.myPrs?.nodes)
    : { issues: [], prCiById: {} };
  const reviewedByMe = includePullRequests
    ? mapPrSearchNodes(data.reviewedByMe?.nodes)
    : { issues: [], prCiById: {} };

  const starredPage = includeStars
    ? mapRepositoryConnectionPage({
        nodes: data.starred?.starredRepositories?.nodes?.map((node) =>
          readFragment(RepositoryListItemFragment, node),
        ),
        pageInfo: data.starred?.starredRepositories?.pageInfo,
      })
    : { repos: [], endCursor: null, hasMore: false };

  const ownedPage = includeOwned
    ? mapRepositoryConnectionPage({
        nodes: data.owned?.repositories?.nodes?.map((node) =>
          readFragment(RepositoryListItemFragment, node),
        ),
        pageInfo: data.owned?.repositories?.pageInfo,
      })
    : { repos: [], endCursor: null, hasMore: false };

  const watchingPage = includeWatching
    ? mapRepositoryConnectionPage({
        nodes: data.watched?.watching?.nodes?.map((node) =>
          readFragment(RepositoryListItemFragment, node),
        ),
        pageInfo: data.watched?.watching?.pageInfo,
      })
    : { repos: [], endCursor: null, hasMore: false };

  return {
    viewer: mapViewer(data.viewer),
    issues: mergeIssuesById([...assigned, ...unassigned]),
    reviewRequests: reviewRequests.issues,
    myPrs: myPrs.issues,
    reviewedByMe: reviewedByMe.issues,
    prCiById: mergePrCiMaps(reviewRequests.prCiById, myPrs.prCiById, reviewedByMe.prCiById),
    starredRepos: starredPage.repos,
    ownedRepos: ownedPage.repos,
    watchedRepos: watchingPage.repos,
    starsPage: { endCursor: starredPage.endCursor, hasMore: starredPage.hasMore },
    ownedReposPage: { endCursor: ownedPage.endCursor, hasMore: ownedPage.hasMore },
    watchingPage: { endCursor: watchingPage.endCursor, hasMore: watchingPage.hasMore },
  };
}
