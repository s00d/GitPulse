import { describe, expect, it } from "vitest";
import type { GraphqlProjectV2Item } from "@/graphql/fragments/projectV2Item";
import {
  mapGraphqlProjectItem,
  parseProjectStatusName,
} from "@/graphql/mapProject";

function makeItem(overrides: Partial<GraphqlProjectV2Item> = {}): GraphqlProjectV2Item {
  return {
    content: {
      __typename: "Issue",
      id: "I_1",
      number: 42,
      title: "Ship feature",
      url: "https://github.com/acme/widget/issues/42",
      updatedAt: "2026-01-03T00:00:00Z",
      state: "OPEN",
      repository: { name: "widget" },
    },
    fieldValues: {
      nodes: [
        {
          __typename: "ProjectV2ItemFieldSingleSelectValue",
          name: "In Progress",
          field: {
            __typename: "ProjectV2SingleSelectField",
            name: "Status",
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("parseProjectStatusName", () => {
  it("reads the Status single-select field", () => {
    expect(parseProjectStatusName(makeItem())).toBe("In Progress");
  });

  it("ignores non-status fields", () => {
    const item = makeItem({
      fieldValues: {
        nodes: [
          {
            __typename: "ProjectV2ItemFieldSingleSelectValue",
            name: "High",
            field: {
              __typename: "ProjectV2SingleSelectField",
              name: "Priority",
            },
          },
        ],
      },
    });
    expect(parseProjectStatusName(item)).toBeNull();
  });
});

describe("mapGraphqlProjectItem", () => {
  it("maps open project issues with status and repo", () => {
    const item = mapGraphqlProjectItem(makeItem());
    expect(item).toMatchObject({
      id: "I_1",
      number: 42,
      title: "Ship feature",
      issueState: "OPEN",
      statusName: "In Progress",
      repoName: "widget",
    });
  });

  it("skips non-issue content", () => {
    const item = makeItem({
      content: { __typename: "PullRequest" } as GraphqlProjectV2Item["content"],
    });
    expect(mapGraphqlProjectItem(item)).toBeNull();
  });
});
