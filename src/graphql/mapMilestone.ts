import type { GitHubMilestone } from "@/github/types";
import type { GraphqlMilestoneListItem } from "@/graphql/fragments/milestoneListItem";

export function mapGraphqlMilestone(node: GraphqlMilestoneListItem): GitHubMilestone {
  return {
    id: node.number,
    number: node.number,
    title: node.title,
    state: node.state,
    open_issues: node.openIssues?.totalCount ?? 0,
    closed_issues: 0,
    due_on: node.dueOn ?? null,
    html_url: node.url,
  };
}
