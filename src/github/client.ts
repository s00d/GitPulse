import { useHttpClient } from "@/composables/useHttpClient";
import {
  notificationSchema,
  publicEventSchema,
  searchResponseSchema,
  socialUserSchema,
  starredRepoSchema,
  watchedRepoSchema,
  viewerSchema,
} from "@/schemas/github";
import type {
  GitHubPublicEvent,
  GitHubIssue,
  GitHubNotification,
  GitHubSocialUser,
  GitHubViewer,
  RateLimitInfo,
  StarredRepo,
  WatchedRepo,
} from "./types";
import { GITHUB_SEARCH } from "./queries";

const GITHUB_API = "https://api.github.com";
export interface RepoListOptions {
  perPage?: number;
  page?: number;
  sort?: "created" | "updated";
}

export interface NotificationListOptions {
  perPage?: number;
  page?: number;
}

export interface SocialListOptions {
  perPage?: number;
  page?: number;
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const remaining = headers.get("x-ratelimit-remaining");
  const limit = headers.get("x-ratelimit-limit");
  const reset = headers.get("x-ratelimit-reset");
  if (remaining == null || limit == null) return null;
  const remainingNum = Number(remaining);
  const limitNum = Number(limit);
  if (Number.isNaN(remainingNum) || Number.isNaN(limitNum)) return null;
  const resetAt =
    reset && !Number.isNaN(Number(reset))
      ? new Date(Number(reset) * 1000).toISOString()
      : null;
  return { remaining: remainingNum, limit: limitNum, resetAt };
}

export function createGitHubClient(
  getToken: () => string | null | undefined,
  onRateLimit?: (info: RateLimitInfo) => void,
) {
  const http = useHttpClient({
    baseUrl: GITHUB_API,
    defaultHeaders: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    getAuthToken: getToken,
    onRateLimitHeaders: (headers) => {
      const info = parseRateLimitHeaders(headers);
      if (info) onRateLimit?.(info);
    },
  });

  async function searchIssues(q: string, perPage = 50): Promise<GitHubIssue[]> {
    const data = await http.get<unknown>("/search/issues", { q, per_page: perPage });
    const parsed = searchResponseSchema.parse(data);
    return parsed.items;
  }

  function mergeIssuesById(issues: GitHubIssue[]): GitHubIssue[] {
    const byId = new Map<number, GitHubIssue>();
    for (const issue of issues) {
      byId.set(issue.id, issue);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }

  return {
    isLoading: http.isLoading,
    error: http.error,

    async viewer(): Promise<GitHubViewer> {
      const data = await http.get<unknown>("/user");
      return viewerSchema.parse(data);
    },

    async assignedIssues() {
      const [assigned, unassignedOwned] = await Promise.all([
        searchIssues(GITHUB_SEARCH.assignedIssues),
        searchIssues(GITHUB_SEARCH.unassignedOwnedIssues),
      ]);
      return mergeIssuesById([...assigned, ...unassignedOwned]);
    },

    reviewRequests() {
      return searchIssues(GITHUB_SEARCH.reviewRequests);
    },

    myPrs() {
      return searchIssues(GITHUB_SEARCH.myPrs);
    },

    reviewedByMe() {
      return searchIssues(GITHUB_SEARCH.reviewedByMe);
    },

    async starredRepos(options: RepoListOptions = {}): Promise<StarredRepo[]> {
      const { perPage = 30, page = 1, sort = "updated" } = options;
      const data = await http.get<unknown[]>("/user/starred", {
        sort,
        per_page: perPage,
        page,
      });
      return (data ?? []).map((item) => starredRepoSchema.parse(item));
    },

    async ownedRepos(options: RepoListOptions = {}): Promise<StarredRepo[]> {
      const { perPage = 30, page = 1 } = options;
      const data = await http.get<unknown[]>("/user/repos", {
        affiliation: "owner",
        per_page: perPage,
        page,
        sort: "updated",
      });
      return (data ?? []).map((item) => starredRepoSchema.parse(item));
    },

    async watchedRepos(options: RepoListOptions = {}): Promise<WatchedRepo[]> {
      const { perPage = 30, page = 1, sort = "updated" } = options;
      const data = await http.get<unknown[]>("/user/subscriptions", {
        sort,
        per_page: perPage,
        page,
      });
      return (data ?? []).map((item) => watchedRepoSchema.parse(item));
    },

    async notifications(options: NotificationListOptions = {}): Promise<GitHubNotification[]> {
      const { perPage = 30, page = 1 } = options;
      const data = await http.get<unknown[]>("/notifications", {
        participating: "true",
        per_page: perPage,
        page,
      });
      return (data ?? []).map((item) => notificationSchema.parse(item));
    },

    async following(options: SocialListOptions = {}): Promise<GitHubSocialUser[]> {
      const { perPage = 30, page = 1 } = options;
      const data = await http.get<unknown[]>("/user/following", {
        per_page: perPage,
        page,
      });
      return (data ?? []).map((item) => socialUserSchema.parse(item));
    },

    async followers(options: SocialListOptions = {}): Promise<GitHubSocialUser[]> {
      const { perPage = 30, page = 1 } = options;
      const data = await http.get<unknown[]>("/user/followers", {
        per_page: perPage,
        page,
      });
      return (data ?? []).map((item) => socialUserSchema.parse(item));
    },

    async userEvents(username: string, options: SocialListOptions = {}): Promise<GitHubPublicEvent[]> {
      const { perPage = 20, page = 1 } = options;
      const data = await http.get<unknown[]>(`/users/${username}/events/public`, {
        per_page: perPage,
        page,
      });
      return (data ?? []).map((item) => publicEventSchema.parse(item));
    },

    async validateToken(): Promise<boolean> {
      try {
        await http.get("/user");
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;
