import { graphql, type ResultOf } from "@/graphql/github";

export const IssueQueueItemFragment = graphql(`
  fragment IssueQueueItem on Issue {
    databaseId
    number
    title
    url
    updatedAt
    state
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
  }
`);

export type GraphqlIssueQueueItem = ResultOf<typeof IssueQueueItemFragment>;
