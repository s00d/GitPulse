import { DiscussionListItemFragment } from "@/graphql/fragments/discussionListItem";
import { MilestoneListItemFragment } from "@/graphql/fragments/milestoneListItem";
import { ReleaseListItemFragment } from "@/graphql/fragments/releaseListItem";
import { graphql } from "@/graphql/github";

export const RELEASES_PER_REPO = 5 as const;
export const DISCUSSIONS_PER_REPO = 10 as const;
export const MILESTONES_PER_REPO = 30 as const;

export const RepoDerivedFieldsFragment = graphql(
  `
    fragment RepoDerivedFields on Repository {
      releases(first: 5, orderBy: { field: CREATED_AT, direction: DESC }) @skip(if: $skipReleases) {
        nodes {
          ...ReleaseListItem
        }
      }
      discussions(
        first: 10
        states: [OPEN]
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) @skip(if: $skipDiscussions) {
        nodes {
          ...DiscussionListItem
        }
      }
      milestones(
        first: 30
        states: [OPEN]
        orderBy: { field: DUE_DATE, direction: ASC }
      ) @skip(if: $skipMilestones) {
        nodes {
          ...MilestoneListItem
        }
      }
    }
  `,
  [ReleaseListItemFragment, DiscussionListItemFragment, MilestoneListItemFragment],
);
