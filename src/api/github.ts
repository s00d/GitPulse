export { createGitHubClient, type GitHubClient } from "@/github/client";
export { fetchRestArray } from "@/github/restFetch";
export type { MarkNotificationReadBody } from "@/github/restEndpoints";
export type { GitHubNotificationApi, GitHubPublicEventApi } from "@/schemas/github";

export { graphql, readFragment } from "@/graphql/github";
export type { FragmentOf, ResultOf, VariablesOf } from "@/graphql/types";
export {
  assertGraphqlData,
  executeGithubGraphql,
  type ExecuteGithubGraphqlOptions,
  type GraphqlPointRateLimit,
  type GraphqlResponse,
} from "@/graphql/execute";
export type { GithubGraphqlClient } from "@/graphql/execute";

export { fetchDashboardRefresh, DashboardRefreshQuery } from "@/graphql/queries/dashboardRefresh";
export type { DashboardRefreshFlags } from "@/graphql/queries/dashboardRefresh";
export { fetchRepoListPage, type RepoListKind } from "@/graphql/queries/repoListPage";
export {
  fetchRepoDerivedBatch,
  type FetchRepoDerivedBatchOptions,
  type RepoDerivedBatchSectionFlags,
} from "@/graphql/queries/repoDerivedBatch";
export { fetchProjectBoardSnapshot } from "@/graphql/queries/projectBoard";
export { fetchViewerSocialGraph } from "@/graphql/queries/viewerSocialGraph";
export { approvePullRequestGraphql } from "@/graphql/mutations/addPullRequestReview";
