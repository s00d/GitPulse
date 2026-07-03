import { graphql, type ResultOf } from "@/graphql/github";

export const PullRequestQueueItemFragment = graphql(`
  fragment PullRequestQueueItem on PullRequest {
    id
    fullDatabaseId
    number
    title
    url
    updatedAt
    state
    isDraft
    repository {
      nameWithOwner
    }
    author {
      login
      avatarUrl
      url
    }
    labels(first: 20) {
      nodes {
        name
        color
      }
    }
    statusCheckRollup {
      state
    }
  }
`);

export type GraphqlPullRequestQueueItem = ResultOf<typeof PullRequestQueueItemFragment>;
