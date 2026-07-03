import type { GitHubIssue, GitHubUser, PrCiStatus } from "@/github/types";
import { mapStatusCheckRollup, isVisiblePrCiState } from "@/graphql/mapStatusCheckRollup";
import type { GraphqlPullRequestQueueItem } from "@/graphql/fragments/pullRequestQueueItem";

export interface MappedPullRequestQueueItem {
  issue: GitHubIssue;
  ciStatus: PrCiStatus;
}

function mapAuthor(author: GraphqlPullRequestQueueItem["author"]): GitHubUser {
  return {
    login: author?.login ?? "ghost",
    avatar_url: author?.avatarUrl ?? undefined,
    html_url: author?.url ?? undefined,
  };
}

function parsePullRequestId(fullDatabaseId: string | null | undefined, number: number): number {
  if (!fullDatabaseId) return number;
  const parsed = Number(fullDatabaseId);
  return Number.isSafeInteger(parsed) ? parsed : number;
}

export function mapGraphqlPullRequest(node: GraphqlPullRequestQueueItem): MappedPullRequestQueueItem {
  const nameWithOwner = node.repository.nameWithOwner;
  const ciStatus = mapStatusCheckRollup(node.statusCheckRollup?.state);

  const issue: GitHubIssue = {
    id: parsePullRequestId(node.fullDatabaseId, node.number),
    number: node.number,
    title: node.title,
    state: node.state,
    html_url: node.url,
    repository_url: `https://api.github.com/repos/${nameWithOwner}`,
    user: mapAuthor(node.author),
    labels:
      node.labels?.nodes
        ?.filter((label): label is NonNullable<typeof label> => Boolean(label?.name))
        .map((label, index) => ({
          id: index,
          name: label.name!,
          color: label.color ?? "",
        })) ?? [],
    draft: node.isDraft ?? false,
    pull_request: { html_url: node.url },
    updated_at: node.updatedAt,
    comments: 0,
    graphql_id: node.id,
  };

  return { issue, ciStatus };
}

export function mapGraphqlPullRequestSearchNodes(
  nodes: Array<GraphqlPullRequestQueueItem | null | undefined> | null | undefined,
): { issues: GitHubIssue[]; prCiById: Record<number, PrCiStatus> } {
  const issues: GitHubIssue[] = [];
  const prCiById: Record<number, PrCiStatus> = {};

  for (const node of nodes ?? []) {
    if (!node) continue;
    const mapped = mapGraphqlPullRequest(node);
    issues.push(mapped.issue);
    if (isVisiblePrCiState(mapped.ciStatus.state)) {
      prCiById[mapped.issue.id] = mapped.ciStatus;
    }
  }

  return { issues, prCiById };
}

export function mergePrCiMaps(
  ...maps: Array<Record<number, PrCiStatus>>
): Record<number, PrCiStatus> {
  return Object.assign({}, ...maps);
}
