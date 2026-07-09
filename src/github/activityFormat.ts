import type { ActivityChangeKind, ActivityEvent, ActivityItemKind } from "@/github/itemDiff";
import { formatTrayMenuRow, truncate, MENU_TEXT_MAX } from "@/github/menuFormat";

export const ACTIVITY_KIND_LABEL_KEYS: Record<ActivityItemKind, string> = {
  issue: "activity.kindIssue",
  pull_request: "activity.kindPullRequest",
  notification: "activity.kindNotification",
  release: "activity.kindRelease",
  discussion: "activity.kindDiscussion",
  commit: "activity.kindCommit",
  security: "activity.kindSecurity",
  check: "activity.kindCheck",
};

export function activityChangeLabelKey(change: ActivityChangeKind): string {
  return change === "added" ? "activity.changeAdded" : "activity.changeUpdated";
}

export interface ActivityEventLabels {
  changeLabel: string;
  kindLabel: string;
}

const DEFAULT_LABELS: Record<ActivityChangeKind, string> = {
  added: "New",
  updated: "Updated",
};

const DEFAULT_KIND_LABELS: Record<ActivityItemKind, string> = {
  issue: "Issue",
  pull_request: "PR",
  notification: "Notification",
  release: "Release",
  discussion: "Discussion",
  commit: "Commit",
  security: "Security",
  check: "CI",
};

export function resolveActivityLabels(
  event: ActivityEvent,
  labels?: Partial<ActivityEventLabels>,
): ActivityEventLabels {
  return {
    changeLabel: labels?.changeLabel ?? DEFAULT_LABELS[event.change],
    kindLabel: labels?.kindLabel ?? DEFAULT_KIND_LABELS[event.kind],
  };
}

/** Tray / notification line: `New PR · owner/repo` (no +/~ prefix). */
export function formatActivityLine(
  event: ActivityEvent,
  labels?: Partial<ActivityEventLabels>,
  max = MENU_TEXT_MAX,
): string {
  const resolved = resolveActivityLabels(event, labels);
  const main = `${resolved.changeLabel} ${resolved.kindLabel} · ${event.repo}`;
  return truncate(main, max);
}

export function formatActivityTrayLabel(
  event: ActivityEvent,
  labels?: Partial<ActivityEventLabels>,
  max = MENU_TEXT_MAX,
): string {
  return formatTrayMenuRow(formatActivityLine(event, labels, max), event.itemUpdatedAt, max);
}
