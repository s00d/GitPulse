import type {
  FeedItem,
  FeedSourceKind,
  GitHubIssue,
  GitHubNotification,
  GitHubPublicEvent,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";

export const FEED_LIMITS = {
  followingUsers: 50,
  followersUsers: 50,
  eventsPerUser: 20,
  hardCap: 1000,
} as const;

function toTime(value: string): number {
  return new Date(value).getTime();
}

function trimToCap(items: FeedItem[], cap = FEED_LIMITS.hardCap): FeedItem[] {
  if (items.length <= cap) return items;
  return items.slice(0, cap);
}

export function sortFeedItemsDesc(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
}

export function dedupeFeedItems(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  const result: FeedItem[] = [];
  for (const item of sortFeedItemsDesc(items)) {
    const key = `${item.id}:${item.eventType}:${item.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function finalizeFeed(items: FeedItem[]): FeedItem[] {
  return trimToCap(dedupeFeedItems(items));
}

export function fromCoreIssues(issues: GitHubIssue[]): FeedItem[] {
  return issues.map((issue) => ({
    id: `core-issue-${issue.id}`,
    source: "core",
    title: issue.pull_request ? `Pull request #${issue.number}` : `Issue #${issue.number}`,
    subtitle: issue.repository_url.split("/").slice(-2).join("/"),
    description: issue.title,
    url: issue.html_url,
    createdAt: issue.updated_at,
    actorLogin: issue.user.login,
    eventType: issue.pull_request ? "PullRequest" : "Issue",
  }));
}

export function fromCoreRepos(
  repos: Array<StarredRepo | WatchedRepo>,
  kind: "Star" | "Watch",
): FeedItem[] {
  return repos.map((repo) => ({
    id: `core-${kind.toLowerCase()}-${repo.id}`,
    source: "core",
    title: kind === "Star" ? "Starred repository updated" : "Watching repository updated",
    subtitle: kind === "Star" ? "Starred repository updated" : "Watched repository updated",
    description: repo.full_name,
    url: repo.html_url,
    createdAt: repo.updated_at,
    repoName: repo.full_name,
    eventType: kind,
  }));
}

export function fromCoreNotifications(notifications: GitHubNotification[]): FeedItem[] {
  return notifications.map((notification) => ({
    id: `core-notification-${notification.id}`,
    source: "core",
    title: notification.subject.title,
    subtitle: `${notification.repository.full_name} · ${notification.reason}`,
    description: `${notification.subject.type} in ${notification.repository.full_name}`,
    url: notification.subject.url ?? notification.repository.html_url,
    createdAt: notification.updated_at,
    repoName: notification.repository.full_name,
    eventType: "Notification",
  }));
}

function resolveEventUrl(event: GitHubPublicEvent): string {
  const repoName = event.repo?.name;
  if (repoName) {
    return `https://github.com/${repoName}`;
  }
  const actor = event.actor?.login;
  if (actor) {
    return `https://github.com/${actor}`;
  }
  return "https://github.com";
}

function eventSubtitle(event: GitHubPublicEvent): string {
  const actor = event.actor?.login ?? "unknown";
  const repo = event.repo?.name ?? "unknown repo";
  return `${actor} in ${repo}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function humanizeEventType(type: string): string {
  switch (type) {
    case "PushEvent":
      return "Pushed commits";
    case "PullRequestEvent":
      return "Updated a pull request";
    case "PullRequestReviewEvent":
      return "Reviewed a pull request";
    case "PullRequestReviewCommentEvent":
      return "Commented on a pull request";
    case "IssuesEvent":
      return "Updated an issue";
    case "IssueCommentEvent":
      return "Commented on an issue";
    case "WatchEvent":
      return "Starred a repository";
    case "ForkEvent":
      return "Forked a repository";
    case "CreateEvent":
      return "Created a branch or tag";
    case "DeleteEvent":
      return "Deleted a branch or tag";
    case "ReleaseEvent":
      return "Published a release";
    case "PublicEvent":
      return "Made a repository public";
    default:
      return type.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/Event$/, "").trim();
  }
}

function eventDescription(event: GitHubPublicEvent): string {
  const payload = asRecord(event.payload);
  if (!payload) return eventSubtitle(event);

  if (event.type === "PushEvent") {
    const commits = Array.isArray(payload.commits) ? payload.commits.length : 0;
    const refRaw = typeof payload.ref === "string" ? payload.ref : "";
    const branch = refRaw.replace("refs/heads/", "");
    if (commits > 0 && branch) {
      return `${commits} ${pluralize(commits, "commit", "commits")} to ${branch}`;
    }
    if (commits > 0) {
      return `${commits} ${pluralize(commits, "commit", "commits")} pushed`;
    }
    return branch ? `Pushed to ${branch}` : "Pushed new commits";
  }

  if (event.type === "PullRequestEvent") {
    const action = typeof payload.action === "string" ? payload.action : "updated";
    const pr = asRecord(payload.pull_request);
    const number = pr && typeof pr.number === "number" ? `#${pr.number}` : "";
    const title = pr && typeof pr.title === "string" ? pr.title : "";
    return [action, number, title].filter(Boolean).join(" ");
  }

  if (event.type === "IssuesEvent") {
    const action = typeof payload.action === "string" ? payload.action : "updated";
    const issue = asRecord(payload.issue);
    const number = issue && typeof issue.number === "number" ? `#${issue.number}` : "";
    const title = issue && typeof issue.title === "string" ? issue.title : "";
    return [action, number, title].filter(Boolean).join(" ");
  }

  if (event.type === "IssueCommentEvent") {
    const action = typeof payload.action === "string" ? payload.action : "commented";
    const issue = asRecord(payload.issue);
    const number = issue && typeof issue.number === "number" ? `#${issue.number}` : "";
    const title = issue && typeof issue.title === "string" ? issue.title : "";
    return [action, "on issue", number, title].filter(Boolean).join(" ");
  }

  if (event.type === "ReleaseEvent") {
    const action = typeof payload.action === "string" ? payload.action : "published";
    const release = asRecord(payload.release);
    const tag = release && typeof release.tag_name === "string" ? release.tag_name : "";
    const name = release && typeof release.name === "string" ? release.name : "";
    return [action, tag, name].filter(Boolean).join(" ");
  }

  if (event.type === "CreateEvent" || event.type === "DeleteEvent") {
    const refType = typeof payload.ref_type === "string" ? payload.ref_type : "ref";
    const ref = typeof payload.ref === "string" ? payload.ref : "";
    return ref ? `${refType} ${ref}` : refType;
  }

  if (event.type === "ForkEvent") {
    const forkee = asRecord(payload.forkee);
    const fullName = forkee && typeof forkee.full_name === "string" ? forkee.full_name : "";
    return fullName ? `Forked to ${fullName}` : "Created a fork";
  }

  if (event.type === "WatchEvent") {
    return "Started watching the repository";
  }

  return eventSubtitle(event);
}

export function fromUserEvents(
  events: GitHubPublicEvent[],
  source: Exclude<FeedSourceKind, "core">,
): FeedItem[] {
  return events.map((event) => ({
    id: `social-${source}-${event.id}`,
    source,
    title: humanizeEventType(event.type),
    subtitle: eventSubtitle(event),
    description: eventDescription(event),
    url: resolveEventUrl(event),
    createdAt: event.created_at,
    actorLogin: event.actor?.login,
    repoName: event.repo?.name,
    eventType: event.type,
  }));
}
