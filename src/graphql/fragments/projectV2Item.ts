import { graphql, type ResultOf } from "@/graphql/github";

export const ProjectV2ItemFragment = graphql(`
  fragment ProjectV2Item on ProjectV2Item {
    content {
      __typename
      ... on Issue {
        id
        number
        title
        url
        updatedAt
        state
        repository {
          name
        }
      }
    }
    fieldValues(first: 20) {
      nodes {
        ... on ProjectV2ItemFieldSingleSelectValue {
          name
          field {
            ... on ProjectV2SingleSelectField {
              name
            }
          }
        }
      }
    }
  }
`);

export type GraphqlProjectV2Item = ResultOf<typeof ProjectV2ItemFragment>;
