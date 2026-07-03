import { graphql, type ResultOf } from "@/graphql/github";

export const DiscussionListItemFragment = graphql(`
  fragment DiscussionListItem on Discussion {
    id
    number
    title
    url
    updatedAt
    author {
      login
      avatarUrl
      url
    }
    category {
      name
    }
    comments {
      totalCount
    }
  }
`);

export type GraphqlDiscussionListItem = ResultOf<typeof DiscussionListItemFragment>;
