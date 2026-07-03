import type { ProjectV2ItemSnapshot } from "@/github/projects";
import type { GraphqlProjectV2Item } from "@/graphql/fragments/projectV2Item";

export function parseProjectStatusName(node: GraphqlProjectV2Item): string | null {
  for (const fieldValue of node.fieldValues?.nodes ?? []) {
    if (fieldValue?.__typename !== "ProjectV2ItemFieldSingleSelectValue") continue;
    if (!fieldValue.name) continue;
    const fieldName =
      fieldValue.field?.__typename === "ProjectV2SingleSelectField"
        ? fieldValue.field.name?.trim()
        : undefined;
    if (fieldName?.toLowerCase() !== "status") continue;
    return fieldValue.name.trim();
  }
  return null;
}

export function mapGraphqlProjectItem(node: GraphqlProjectV2Item): ProjectV2ItemSnapshot | null {
  const content = node.content;
  if (!content || content.__typename !== "Issue") return null;
  if (
    !content.id ||
    content.number == null ||
    !content.title ||
    !content.url ||
    !content.updatedAt
  ) {
    return null;
  }

  return {
    id: content.id,
    number: content.number,
    title: content.title,
    url: content.url,
    updatedAt: content.updatedAt,
    issueState: content.state ?? null,
    statusName: parseProjectStatusName(node),
    repoName: content.repository?.name ?? undefined,
  };
}
