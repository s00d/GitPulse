import type { GitHubIssue, PrCiStatus, ProjectItem, StarredRepo, WatchedRepo } from "./types";

export const MENU_TEXT_MAX = 58;

export function truncate(text: string, max = MENU_TEXT_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function submenuWithCount(label: string, count: number): string {
  return `${label} (${count})`;
}

export function countDeltaSuffix(delta?: number): string {
  if (!delta || delta <= 0) return "";
  return ` ↑${delta}`;
}

export function submenuWithCountAndDelta(label: string, count: number, delta?: number): string {
  return `${submenuWithCount(label, count)}${countDeltaSuffix(delta)}`;
}

export function labelWithCountAndDelta(label: string, delta?: number): string {
  if (!delta || delta <= 0) return label;
  return `${label}${countDeltaSuffix(delta)}`;
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

export function formatPrCiSuffix(status?: PrCiStatus): string {
  if (!status || status.state === "none") return "";
  if (status.state === "success") return " ✓";
  if (status.state === "failure") return " ✗";
  return " · CI…";
}

export function formatIssueMainLabel(issue: GitHubIssue, max = MENU_TEXT_MAX): string {
  const parts: string[] = [`#${issue.number}`];
  if (issue.draft) parts.push("[draft]");
  const labels = issue.labels.slice(0, 2).map((l) => l.name);
  if (labels.length) parts.push(`${labels.join(",")}:`);
  parts.push(issue.title);
  return truncate(parts.join(" "), max);
}

export function formatIssueTrayLabel(
  issue: GitHubIssue,
  max = MENU_TEXT_MAX,
  ciStatus?: PrCiStatus,
): string {
  const main = `${formatIssueMainLabel(issue, max)}${formatPrCiSuffix(ciStatus)}`;
  return formatTrayMenuRow(main, issue.updated_at, max);
}

export function formatProjectItemTrayLabel(item: ProjectItem, max = MENU_TEXT_MAX): string {
  const main = truncate(`#${item.number} ${item.title} · ${item.statusName}`, max);
  return formatTrayMenuRow(main, item.updatedAt, max);
}

export function starredRepoLabel(repo: StarredRepo | WatchedRepo): string {
  return withDateSuffix(`${repo.full_name} ★ ${compactCount(repo.stargazers_count)}`, repo.updated_at);
}

export function starredRepoTrayLabel(repo: StarredRepo | WatchedRepo, max = MENU_TEXT_MAX): string {
  return formatTrayMenuRow(
    `${repo.full_name} ★ ${compactCount(repo.stargazers_count)}`,
    repo.updated_at,
    max,
  );
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
