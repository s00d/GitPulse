import { graphql, type ResultOf } from "@/graphql/github";

export const MilestoneListItemFragment = graphql(`
  fragment MilestoneListItem on Milestone {
    number
    title
    url
    dueOn
    state
    openIssues: issues(states: [OPEN]) {
      totalCount
    }
  }
`);

export type GraphqlMilestoneListItem = ResultOf<typeof MilestoneListItemFragment>;
