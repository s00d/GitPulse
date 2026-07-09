import type { GitHubIssue, ProjectItem, StarredRepo, WatchedRepo } from "./types";

export const MENU_TEXT_MAX = 58;

export function truncate(text: string, max = MENU_TEXT_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function submenuWithCount(label: string, count: number): string {
  return `${label} (${count})`;
}

export function labelWithCount(label: string, count: number): string {
  return submenuWithCount(label, count);
}

export function categoryWithCount(label: string, count: number): string {
  return `${label} (${count})`;
}

export function compactCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

/** Compact date for tray menu rows, e.g. `3/24`. */
export function formatTrayMenuDate(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleDateString(undefined, {
    month: "numeric",
    day: "numeric",
  });
}

function withDateSuffix(label: string, iso: string, max = MENU_TEXT_MAX): string {
  const date = formatTrayMenuDate(iso);
  if (!date) return truncate(label, max);
  const suffix = ` · ${date}`;
  return truncate(`${label}${suffix}`, max);
}

/** Left column + tab + right-aligned date for native tray menus (macOS). */
export function formatTrayMenuRow(main: string, updatedAt?: string, max = MENU_TEXT_MAX): string {
  const left = truncate(main, max);
  const date = updatedAt ? formatTrayMenuDate(updatedAt) : "";
  if (!date) return left;
  return `${left}\t${date}`;
}

export function formatIssueMainLabel(issue: GitHubIssue, max = MENU_TEXT_MAX): string {
  const parts: string[] = [`#${issue.number}`];
  const labels = issue.labels.slice(0, 2).map((l) => l.name);
  if (labels.length) parts.push(`${labels.join(",")}:`);
  parts.push(issue.title);
  return truncate(parts.join(" "), max);
}

export function formatIssueTrayLabel(issue: GitHubIssue, max = MENU_TEXT_MAX): string {
  return formatTrayMenuRow(formatIssueMainLabel(issue, max), issue.updated_at, max);
}

export function formatProjectItemTrayLabel(item: ProjectItem, max = MENU_TEXT_MAX): string {
  const main = truncate(`#${item.number} ${item.title} · ${item.statusName}`, max);
  return formatTrayMenuRow(main, item.updatedAt, max);
}

export function starredRepoLabel(repo: StarredRepo | WatchedRepo): string {
  return withDateSuffix(repo.full_name, repo.updated_at);
}

export function starredRepoTrayLabel(repo: StarredRepo | WatchedRepo, max = MENU_TEXT_MAX): string {
  const left = truncate(repo.full_name, max);
  const count = compactCount(repo.stargazers_count);
  const date = formatTrayMenuDate(repo.updated_at);
  if (date) return `${left}\t${count} · ${date}`;
  return `${left}\t${count}`;
}

export function formatItemLabel(issue: GitHubIssue, max = MENU_TEXT_MAX): string {
  return withDateSuffix(formatIssueMainLabel(issue, max), issue.updated_at, max);
}

export function formatNotificationLabel(
  repo: string,
  title: string,
  updatedAt: string,
  max = MENU_TEXT_MAX,
): string {
  return withDateSuffix(`${repo}: ${title}`, updatedAt, max);
}

export function formatNotificationTrayLabel(
  repo: string,
  title: string,
  updatedAt: string,
  max = MENU_TEXT_MAX,
): string {
  return formatTrayMenuRow(`${repo}: ${title}`, updatedAt, max);
}
