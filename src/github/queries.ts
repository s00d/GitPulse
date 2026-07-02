export const GITHUB_SEARCH = {
  assignedIssues: "type:issue state:open assignee:@me sort:updated-desc",
  unassignedOwnedIssues:
    "type:issue state:open user:@me no:assignee sort:updated-desc",
  reviewRequests: "type:pr state:open review-requested:@me sort:updated-desc",
  myPrs: "type:pr state:open author:@me sort:updated-desc",
  reviewedByMe: "type:pr state:open reviewed-by:@me -author:@me sort:updated-desc",
} as const;

export function issuesOverflowUrl(): string {
  const q = encodeURIComponent(
    "type:issue state:open (assignee:@me OR (user:@me no:assignee))",
  );
  return `https://github.com/search?q=${q}&type=issues`;
}

export function watchingUrl(): string {
  return "https://github.com/watching";
}

export function reviewOverflowUrl(): string {
  return `https://github.com/pulls/review-requested`;
}

export function myPrsOverflowUrl(): string {
  return `https://github.com/pulls`;
}

export function notificationsUrl(): string {
  return "https://github.com/notifications";
}

export function starredUrl(): string {
  return "https://github.com/stars";
}

export function ownedReposUrl(login: string): string {
  return `https://github.com/${login}?tab=repositories&type=source&sort=stargazers`;
}
