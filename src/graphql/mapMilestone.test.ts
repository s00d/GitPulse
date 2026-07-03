import { describe, expect, it } from "vitest";
import type { GraphqlMilestoneListItem } from "@/graphql/fragments/milestoneListItem";
import { mapGraphqlMilestone } from "@/graphql/mapMilestone";

const sample: GraphqlMilestoneListItem = {
  number: 7,
  title: "v1.0",
  url: "https://github.com/acme/widget/milestone/7",
  dueOn: "2026-03-01T00:00:00Z",
  state: "OPEN",
  openIssues: { totalCount: 3 },
};

describe("mapGraphqlMilestone", () => {
  it("uses milestone number as stable id", () => {
    const milestone = mapGraphqlMilestone(sample);
    expect(milestone.id).toBe(7);
    expect(milestone.number).toBe(7);
    expect(milestone.open_issues).toBe(3);
  });
});
