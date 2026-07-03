import { graphql, type ResultOf } from "@/graphql/github";

export const RepositoryListItemFragment = graphql(`
  fragment RepositoryListItem on Repository {
    databaseId
    nameWithOwner
    url
    description
    stargazerCount
    updatedAt
  }
`);

export type GraphqlRepositoryListItem = ResultOf<typeof RepositoryListItemFragment>;
