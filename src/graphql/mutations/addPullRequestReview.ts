import type { GithubGraphqlClient } from "@/graphql/execute";
import { executeGithubGraphql, type ExecuteGithubGraphqlOptions } from "@/graphql/execute";
import { graphql, type ResultOf, type VariablesOf } from "@/graphql/github";

const AddPullRequestReviewMutation = graphql(`
  mutation AddPullRequestReview($input: AddPullRequestReviewInput!) {
    addPullRequestReview(input: $input) {
      pullRequestReview {
        id
      }
    }
  }
`);

export type AddPullRequestReviewVariables = VariablesOf<typeof AddPullRequestReviewMutation>;

export async function approvePullRequestGraphql(
  client: GithubGraphqlClient,
  pullRequestId: string,
  options?: ExecuteGithubGraphqlOptions,
): Promise<void> {
  await executeGithubGraphql(
    client,
    AddPullRequestReviewMutation,
    {
      input: {
        pullRequestId,
        event: "APPROVE",
      },
    },
    "GraphQL approve pull request failed",
    options,
  );
}

export type AddPullRequestReviewData = ResultOf<typeof AddPullRequestReviewMutation>;
