import type { GithubGraphqlClient } from "@/graphql/execute";
import {
  PROJECT_PAGE_LIMIT,
  type ProjectV2BoardSnapshot,
  type ProjectV2ItemSnapshot,
} from "@/github/projects";
import type { ProjectOwnerType, TrackedProject } from "@/github/types";
import { ProjectV2BoardFragment } from "@/graphql/fragments/projectV2Board";
import { ProjectV2ItemFragment } from "@/graphql/fragments/projectV2Item";
import { executeGithubGraphql, type ExecuteGithubGraphqlOptions } from "@/graphql/execute";
import { graphql, readFragment, type ResultOf, type VariablesOf } from "@/graphql/github";
import { mapGraphqlProjectItem } from "@/graphql/mapProject";

export const UserProjectQuery = graphql(
  `
    query UserProject($login: String!, $number: Int!, $pageSize: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
      }
      user(login: $login) {
        projectV2(number: $number) {
          ...ProjectV2Board
        }
      }
    }
  `,
  [ProjectV2BoardFragment],
);

export const OrgProjectQuery = graphql(
  `
    query OrgProject($login: String!, $number: Int!, $pageSize: Int!, $after: String) {
      rateLimit {
        cost
        remaining
        limit
      }
      organization(login: $login) {
        projectV2(number: $number) {
          ...ProjectV2Board
        }
      }
    }
  `,
  [ProjectV2BoardFragment],
);

type UserProjectData = ResultOf<typeof UserProjectQuery>;
type OrgProjectData = ResultOf<typeof OrgProjectQuery>;
type UserProjectVariables = VariablesOf<typeof UserProjectQuery>;

function extractProjectBoard(
  data: UserProjectData | OrgProjectData,
  ownerType: ProjectOwnerType,
) {
  const project =
    ownerType === "org"
      ? (data as OrgProjectData).organization?.projectV2
      : (data as UserProjectData).user?.projectV2;
  if (!project) return null;
  return readFragment(ProjectV2BoardFragment, project);
}

export async function fetchProjectBoardSnapshot(
  client: GithubGraphqlClient,
  project: TrackedProject,
  options?: ExecuteGithubGraphqlOptions,
): Promise<ProjectV2BoardSnapshot | null> {
  const query = project.ownerType === "org" ? OrgProjectQuery : UserProjectQuery;
  const items: ProjectV2ItemSnapshot[] = [];
  let after: string | null = null;
  let projectMeta: Pick<ProjectV2BoardSnapshot, "id" | "title" | "url"> | null = null;

  const variables = {
    login: project.owner,
    number: project.number,
    pageSize: PROJECT_PAGE_LIMIT.pageSize,
    after,
  } satisfies UserProjectVariables;

  for (let page = 0; page < PROJECT_PAGE_LIMIT.maxPages; page += 1) {
    const data = await executeGithubGraphql(
      client,
      query,
      { ...variables, after },
      "GraphQL project query failed",
      options,
    );

    const board = extractProjectBoard(data, project.ownerType);
    if (!board) return null;

    if (!projectMeta) {
      if (!board.id || !board.title || !board.url) return null;
      projectMeta = {
        id: board.id,
        title: board.title,
        url: board.url,
      };
    }

    for (const node of board.items?.nodes ?? []) {
      if (!node) continue;
      const parsed = mapGraphqlProjectItem(readFragment(ProjectV2ItemFragment, node));
      if (parsed) items.push(parsed);
    }

    const pageInfo = board.items?.pageInfo;
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break;
    after = pageInfo.endCursor;
  }

  if (!projectMeta) return null;
  return { ...projectMeta, items };
}
