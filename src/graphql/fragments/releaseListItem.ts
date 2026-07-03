import { graphql, type ResultOf } from "@/graphql/github";

export const ReleaseListItemFragment = graphql(`
  fragment ReleaseListItem on Release {
    databaseId
    tagName
    name
    url
    publishedAt
    isDraft
    isPrerelease
    author {
      login
      avatarUrl
      url
    }
  }
`);

export type GraphqlReleaseListItem = ResultOf<typeof ReleaseListItemFragment>;
