import { print, type DocumentNode } from "graphql";
import type { TadaDocumentNode } from "gql.tada";
import { useHttpClient } from "@/composables/useHttpClient";
import type { GraphqlResponse } from "@/graphql/execute";
import { notificationSchema, publicEventSchema } from "@/schemas/github";
import type { GitHubPublicEvent, GitHubNotification, RateLimitInfo } from "./types";
import { fetchRestArray } from "./restFetch";
import { resolveGitHubDebugRecorder } from "./apiDebugRecorder";
import type { MarkNotificationReadBody } from "./restEndpoints";

const GITHUB_API = "https://api.github.com";

export interface NotificationListOptions {
  perPage?: number;
  page?: number;
}

export interface SocialListOptions {
  perPage?: number;
  page?: number;
}

export interface GraphqlRequestBody<TVariables extends Record<string, unknown>> {
  query: string;
  variables?: TVariables;
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
    debugRecorder: resolveGitHubDebugRecorder(),
  });

  return {
    isLoading: http.isLoading,
    error: http.error,

    async notifications(options: NotificationListOptions = {}): Promise<GitHubNotification[]> {
      const { perPage = 30, page = 1 } = options;
      return fetchRestArray(http, "/notifications", notificationSchema, {
        participating: "true",
        per_page: perPage,
        page,
      });
    },

    async userEvents(username: string, options: SocialListOptions = {}): Promise<GitHubPublicEvent[]> {
      const { perPage = 20, page = 1 } = options;
      return fetchRestArray(http, `/users/${username}/events/public`, publicEventSchema, {
        per_page: perPage,
        page,
      });
    },

    /** Typed gql.tada entry point: document + variables → raw GraphQL envelope. */
    graphqlDocument<TData, TVariables extends Record<string, unknown>>(
      document: TadaDocumentNode<TData, TVariables> | DocumentNode,
      variables: TVariables,
    ): Promise<GraphqlResponse<TData>> {
      return http.post<GraphqlResponse<TData>, GraphqlRequestBody<TVariables>>("/graphql", {
        query: print(document),
        variables,
      });
    },

    async markNotificationRead(threadId: string): Promise<void> {
      const body: MarkNotificationReadBody = { read: true };
      await http.patch(`/notifications/threads/${threadId}`, body);
    },
  };
}

export type GitHubClient = ReturnType<typeof createGitHubClient>;
