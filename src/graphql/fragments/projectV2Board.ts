import { graphql, type ResultOf } from "@/graphql/github";
import { ProjectV2ItemFragment } from "@/graphql/fragments/projectV2Item";

export const ProjectV2BoardFragment = graphql(
  `
    fragment ProjectV2Board on ProjectV2 {
      id
      title
      url
      items(first: $pageSize, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...ProjectV2Item
        }
      }
    }
  `,
  [ProjectV2ItemFragment],
);

export type GraphqlProjectV2Board = ResultOf<typeof ProjectV2BoardFragment>;
