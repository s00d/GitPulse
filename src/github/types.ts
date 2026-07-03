export interface GitHubUser {
  login: string;
  avatar_url?: string;
  html_url?: string;
}

export interface GitHubViewer {
  login: string;
  avatar_url?: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
}

export interface GitHubPullRequestRef {
  html_url: string;
  merged_at?: string | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  repository_url: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignees?: GitHubUser[] | null;
  draft?: boolean | null;
  pull_request?: GitHubPullRequestRef | null;
  created_at?: string;
  updated_at: string;
  comments: number;
  /** GitHub GraphQL node ID — set for pull requests loaded via GraphQL. */
  graphql_id?: string;
}

export interface StarredRepo {
  id: number;
  full_name: string;
  html_url: string;
  description?: string | null;
  stargazers_count: number;
  updated_at: string;
}

export type WatchedRepo = StarredRepo;

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject: {
    title: string;
    type: string;
    url: string | null;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

export type PrCategoryKind = "needsReview" | "myPrs" | "waitingOnAuthor";

export interface RepoGroup<T> {
  repo: string;
  items: T[];
  totalCount: number;
  overflowUrl?: string;
}

export interface PrCategoryGroup {
  kind: PrCategoryKind;
  items: GitHubIssue[];
  totalCount: number;
  overflowUrl?: string;
}

export interface PrRepoGroup {
  repo: string;
  categories: PrCategoryGroup[];
  totalCount: number;
}

export type PrCiState = "success" | "failure" | "pending" | "none";

export interface PrCiStatus {
  state: PrCiState;
  totalCount: number;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  state: string;
  open_issues: number;
  closed_issues: number;
  due_on: string | null;
  html_url: string;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  author: GitHubUser;
}

export interface GitHubDiscussionItem {
  id: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  repo: string;
  author: GitHubUser;
  category?: string;
  commentCount?: number;
  unread: boolean;
  notificationId?: string;
}

export interface ReleaseRepoGroup {
  repo: string;
  releases: GitHubRelease[];
  totalCount: number;
}

export interface MilestoneRepoGroup {
  repo: string;
  milestones: GitHubMilestone[];
  totalOpenIssues: number;
}

export type ProjectOwnerType = "user" | "org";

export interface TrackedProject {
  id: string;
  owner: string;
  number: number;
  ownerType: ProjectOwnerType;
}

export interface ProjectColumn {
  name: string;
  openCount: number;
}

export interface ProjectItem {
  id: string;
  number: number;
  title: string;
  url: string;
  statusName: string;
  updatedAt: string;
  repoName?: string;
}

export interface ProjectBoardGroup {
  id: string;
  title: string;
  url: string;
  columns: ProjectColumn[];
  recentItems: ProjectItem[];
  trayRecentItems: ProjectItem[];
  totalOpenCount: number;
}

export type GhCliStatus = "not_installed" | "installed_not_authed" | "authed";

export type GitHubAuthStatus = "no_token" | "valid" | "invalid_scope";

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetAt: string | null;
}

export interface GitHubSocialUser {
  id: number;
  login: string;
  avatar_url?: string;
  html_url?: string;
}

export interface GitHubPublicEvent {
  id: string;
  type: string;
  actor?: {
    id?: number;
    login?: string;
    avatar_url?: string;
    url?: string;
  };
  repo?: {
    id?: number;
    name?: string;
    url?: string;
  };
  payload?: Record<string, unknown> | null;
  public?: boolean;
  created_at: string;
}

export type FeedSourceKind = "core" | "following" | "followers";

export interface FeedItem {
  id: string;
  source: FeedSourceKind;
  title: string;
  subtitle: string;
  description?: string;
  url: string;
  createdAt: string;
  actorLogin?: string;
  repoName?: string;
  eventType: string;
}

export function repoFullFromUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.split("/");
  if (parts.length < 2) return "";
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

export function repoShort(repo: string): string {
  const idx = repo.lastIndexOf("/");
  return idx >= 0 ? repo.slice(idx + 1) : repo;
}

export function isPullRequest(issue: GitHubIssue): boolean {
  return issue.pull_request != null;
}
