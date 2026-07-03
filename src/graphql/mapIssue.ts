import type { GitHubIssue, GitHubUser } from "@/github/types";
import type { GraphqlIssueQueueItem } from "@/graphql/fragments/issueQueueItem";

function mapAuthor(author: GraphqlIssueQueueItem["author"]): GitHubUser {
  return {
    login: author?.login ?? "ghost",
    avatar_url: author?.avatarUrl ?? undefined,
    html_url: author?.url ?? undefined,
  };
}

export function mapGraphqlIssue(node: GraphqlIssueQueueItem): GitHubIssue {
  const nameWithOwner = node.repository.nameWithOwner;
  return {
    id: node.databaseId ?? node.number,
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
    updated_at: node.updatedAt,
    comments: 0,
  };
}

export function mapGraphqlIssueSearchNodes(
  nodes: Array<GraphqlIssueQueueItem | null | undefined> | null | undefined,
): GitHubIssue[] {
  const issues: GitHubIssue[] = [];
  for (const node of nodes ?? []) {
    if (!node) continue;
    issues.push(mapGraphqlIssue(node));
  }
  return issues;
}

export function mergeIssuesById(issues: GitHubIssue[]): GitHubIssue[] {
  const byId = new Map<number, GitHubIssue>();
  for (const issue of issues) {
    byId.set(issue.id, issue);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}
