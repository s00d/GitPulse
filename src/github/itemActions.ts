import type { ItemActionSettings } from "@/settings/appSettings";
import type { GitHubIssue, GitHubNotification } from "./types";
import { isPullRequest, repoFullFromUrl } from "./types";
import { issueSnoozeKey } from "./snooze";

export type ItemKind = "issue" | "pullRequest" | "notification";

export type ItemActionId =
  | "open"
  | "markRead"
  | "snooze"
  | "unsnooze"
  | "openReview"
  | "approve";

export interface ItemActionDescriptor {
  id: ItemActionId;
  hours?: number;
}

export function itemKindFromIssue(issue: GitHubIssue): ItemKind {
  return isPullRequest(issue) ? "pullRequest" : "issue";
}

export function pullRequestReviewUrl(issue: GitHubIssue): string {
  return `${issue.html_url}/files`;
}

export function parsePullRequestRepo(
  issue: GitHubIssue,
): { owner: string; repo: string; number: number } | null {
  if (!isPullRequest(issue)) return null;
  const full = repoFullFromUrl(issue.repository_url);
  const slash = full.indexOf("/");
  if (slash < 0) return null;
  return {
    owner: full.slice(0, slash),
    repo: full.slice(slash + 1),
    number: issue.number,
  };
}

export function snoozeKeyForIssue(issue: GitHubIssue): string {
  return issueSnoozeKey(issue.id, isPullRequest(issue));
}

export function notificationOpenUrl(notification: GitHubNotification): string {
  return notification.subject.url ?? notification.repository.html_url;
}

export function buildItemActions(
  kind: ItemKind,
  settings: ItemActionSettings,
  opts: { isSnoozed: boolean; isUnread?: boolean },
): ItemActionDescriptor[] {
  const actions: ItemActionDescriptor[] = [{ id: "open" }];

  if (kind === "notification" && opts.isUnread !== false) {
    actions.push({ id: "markRead" });
  }

  if (kind === "pullRequest") {
    actions.push({ id: "openReview" });
    if (settings.enableQuickApprove) {
      actions.push({ id: "approve" });
    }
  }

  if (kind !== "notification") {
    if (opts.isSnoozed) {
      actions.push({ id: "unsnooze" });
    } else {
      for (const hours of settings.snoozePresetHours) {
        actions.push({ id: "snooze", hours });
      }
    }
  }

  return actions;
}
