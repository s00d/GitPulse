import type { GitHubIssue, StarredRepo, WatchedRepo } from "./types";

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

export function starredRepoLabel(repo: StarredRepo | WatchedRepo): string {
  return truncate(`${repo.full_name} ★ ${compactCount(repo.stargazers_count)}`);
}

export function formatItemLabel(issue: GitHubIssue, max = MENU_TEXT_MAX): string {
  const parts: string[] = [`#${issue.number}`];
  if (issue.draft) parts.push("[draft]");
  const labels = issue.labels.slice(0, 2).map((l) => l.name);
  if (labels.length) parts.push(`${labels.join(",")}:`);
  parts.push(issue.title);
  return truncate(parts.join(" "), max);
}
