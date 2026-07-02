import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { createGitHubClient } from "@/github/client";
import {
  buildWaitingOnAuthor,
  countBadgeItems,
  groupIssuesByRepo,
  groupPRsByRepoAndCategory,
} from "@/github/grouping";
import type {
  GhCliStatus,
  GitHubIssue,
  GitHubNotification,
  GitHubViewer,
  PrRepoGroup,
  RateLimitInfo,
  RepoGroup,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";
import {
  collectReposFromSource,
  filterIssuesByRepoVisibility,
  filterNotificationsByRepoVisibility,
  filterStarredRepos,
  filterWatchedRepos,
} from "@/github/repoVisibility";
import { sortNotificationsByUpdatedDesc, sortReposByUpdatedDesc } from "@/github/search";
import {
  filterNotifiableEvents,
  formatSingleEventBody,
  NOTIFICATION_APP_TITLE,
} from "@/github/changeNotifications";
import { useGitHubAuth } from "@/composables/useGitHubAuth";
import { useNotification } from "@/composables/useNotification";
import { i18n } from "@/i18n";
import { useRefreshStore, type RefreshSource } from "@/stores/refreshStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { RefreshInterval } from "@/settings/appSettings";

const INTERVAL_MS: Record<Exclude<RefreshInterval, "manual">, number> = {
  "30s": 30_000,
  "60s": 60_000,
  "5m": 300_000,
};

let pollingTimer: ReturnType<typeof setInterval> | null = null;
const LIST_PAGE_SIZE = 30;

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }

  if (typeof err === "string" && err.trim().length > 0) {
    return err;
  }

  if (err && typeof err === "object") {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const maybeDetails = (err as { details?: unknown }).details;
    if (maybeDetails && typeof maybeDetails === "object") {
      const detailMessage = (maybeDetails as { message?: unknown }).message;
      if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
        return detailMessage;
      }
      const detailError = (maybeDetails as { error?: unknown }).error;
      if (typeof detailError === "string" && detailError.trim().length > 0) {
        return detailError;
      }
    }

    const status = (err as { status?: unknown }).status;
    const statusText = (err as { statusText?: unknown }).statusText;
    if (typeof status === "number") {
      if (typeof statusText === "string" && statusText.trim().length > 0) {
        return `HTTP ${status} ${statusText}`;
      }
      return `HTTP ${status}`;
    }
  }

  return "Unknown error";
}

interface SectionPaginationState {
  currentPage: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface GitHubState {
  viewer: GitHubViewer | null;
  sourceIssues: GitHubIssue[];
  sourceReviewRequests: GitHubIssue[];
  sourceMyPrs: GitHubIssue[];
  sourceWaitingOnAuthor: GitHubIssue[];
  sourceStarredRepos: StarredRepo[];
  sourceWatchedRepos: WatchedRepo[];
  sourceNotifications: GitHubNotification[];
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  waitingOnAuthor: GitHubIssue[];
  starredRepos: StarredRepo[];
  watchedRepos: WatchedRepo[];
  notifications: GitHubNotification[];
  issueGroups: RepoGroup<GitHubIssue>[];
  prGroups: PrRepoGroup[];
  badgeCount: number;
  isLoading: boolean;
  lastRefreshed: string | null;
  errorMessage: string | null;
  hasToken: boolean;
  isBootstrapped: boolean;
  refreshInterval: RefreshInterval;
  ghCliStatus: GhCliStatus;
  ghCliErrorMessage: string | null;
  didAutoImportFromCli: boolean;
  rateLimit: RateLimitInfo | null;
  starsPage: SectionPaginationState;
  watchingPage: SectionPaginationState;
  notificationsPage: SectionPaginationState;
}

export const useGitHubStore = defineStore("github", {
  state: (): GitHubState => ({
    viewer: null,
    sourceIssues: [],
    sourceReviewRequests: [],
    sourceMyPrs: [],
    sourceWaitingOnAuthor: [],
    sourceStarredRepos: [],
    sourceWatchedRepos: [],
    sourceNotifications: [],
    issues: [],
    reviewRequests: [],
    myPrs: [],
    waitingOnAuthor: [],
    starredRepos: [],
    watchedRepos: [],
    notifications: [],
    issueGroups: [],
    prGroups: [],
    badgeCount: 0,
    isLoading: false,
    lastRefreshed: null,
    errorMessage: null,
    hasToken: false,
    isBootstrapped: false,
    refreshInterval: "60s",
    ghCliStatus: "not_installed",
    ghCliErrorMessage: null,
    didAutoImportFromCli: false,
    rateLimit: null,
    starsPage: { currentPage: 1, hasMore: false, isLoadingMore: false },
    watchingPage: { currentPage: 1, hasMore: false, isLoadingMore: false },
    notificationsPage: { currentPage: 1, hasMore: false, isLoadingMore: false },
  }),

  getters: {
    unreadNotificationCount(state): number {
      return state.notifications.filter((n) => n.unread).length;
    },
    prCount(state): number {
      return new Set([...state.reviewRequests, ...state.myPrs, ...state.waitingOnAuthor].map((pr) => pr.id))
        .size;
    },
    knownRepos(state): string[] {
      return collectReposFromSource({
        issues: state.sourceIssues,
        reviewRequests: state.sourceReviewRequests,
        myPrs: state.sourceMyPrs,
        waitingOnAuthor: state.sourceWaitingOnAuthor,
        starredRepos: state.sourceStarredRepos,
        watchedRepos: state.sourceWatchedRepos,
        notifications: state.sourceNotifications,
      });
    },
    canLoadMoreStars(state): boolean {
      return state.starsPage.hasMore && !state.starsPage.isLoadingMore;
    },
    canLoadMoreWatching(state): boolean {
      return state.watchingPage.hasMore && !state.watchingPage.isLoadingMore;
    },
    canLoadMoreNotifications(state): boolean {
      return state.notificationsPage.hasMore && !state.notificationsPage.isLoadingMore;
    },
  },

  actions: {
    mergeById<T extends { id: string | number }>(prev: T[], incoming: T[]): T[] {
      const byId = new Map<string | number, T>();
      for (const item of prev) byId.set(item.id, item);
      for (const item of incoming) byId.set(item.id, item);
      return [...byId.values()];
    },

    resetPagination() {
      this.starsPage = { currentPage: 1, hasMore: false, isLoadingMore: false };
      this.watchingPage = { currentPage: 1, hasMore: false, isLoadingMore: false };
      this.notificationsPage = { currentPage: 1, hasMore: false, isLoadingMore: false };
    },

    setGhCliStatus(status: GhCliStatus) {
      this.ghCliStatus = status;
    },

    setGhCliError(message: string | null) {
      this.ghCliErrorMessage = message;
    },

    setRateLimit(info: RateLimitInfo) {
      this.rateLimit = info;
    },

    setBootstrapped(value: boolean) {
      this.isBootstrapped = value;
    },

    async initAuth() {
      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      this.hasToken = Boolean(token);
      return Boolean(token);
    },

    async saveToken(token: string) {
      await this.signInWithToken(token, "manual");
    },

    async clearToken() {
      const auth = useGitHubAuth();
      await auth.clearToken();
      await useRefreshStore().clear();
      this.hasToken = false;
      this.viewer = null;
      this.sourceIssues = [];
      this.sourceReviewRequests = [];
      this.sourceMyPrs = [];
      this.sourceWaitingOnAuthor = [];
      this.sourceStarredRepos = [];
      this.sourceWatchedRepos = [];
      this.sourceNotifications = [];
      this.issues = [];
      this.reviewRequests = [];
      this.myPrs = [];
      this.waitingOnAuthor = [];
      this.starredRepos = [];
      this.watchedRepos = [];
      this.notifications = [];
      this.issueGroups = [];
      this.prGroups = [];
      this.badgeCount = 0;
      this.errorMessage = null;
      this.lastRefreshed = null;
      this.didAutoImportFromCli = false;
      this.resetPagination();
    },

    async syncRefreshInterval() {
      const settings = useSettingsStore();
      await settings.init();
      this.refreshInterval = settings.refreshInterval;
      this.reconfigurePolling();
    },

    applyRepoVisibilityFilter() {
      const visibility = useSettingsStore().repoVisibility;
      this.issues = filterIssuesByRepoVisibility(this.sourceIssues, visibility);
      this.reviewRequests = filterIssuesByRepoVisibility(this.sourceReviewRequests, visibility);
      this.myPrs = filterIssuesByRepoVisibility(this.sourceMyPrs, visibility);
      this.waitingOnAuthor = filterIssuesByRepoVisibility(this.sourceWaitingOnAuthor, visibility);
      this.starredRepos = filterStarredRepos(this.sourceStarredRepos, visibility);
      this.watchedRepos = filterWatchedRepos(this.sourceWatchedRepos, visibility);
      this.notifications = filterNotificationsByRepoVisibility(
        this.sourceNotifications,
        visibility,
      );
      this.recomputeGroups();
    },

    recomputeGroups() {
      this.issueGroups = groupIssuesByRepo(this.issues);
      this.prGroups = groupPRsByRepoAndCategory({
        reviewRequests: this.reviewRequests,
        myPrs: this.myPrs,
        waitingOnAuthor: this.waitingOnAuthor,
      });
      this.badgeCount = countBadgeItems({
        issues: this.issues,
        reviewRequests: this.reviewRequests,
        myPrs: this.myPrs,
      });
    },

    async refresh(options?: { source?: RefreshSource }) {
      const source = options?.source ?? "manual";
      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) {
        this.hasToken = false;
        this.errorMessage = null;
        return;
      }

      this.hasToken = true;
      this.isLoading = true;
      this.errorMessage = null;

      const client = createGitHubClient(
        () => auth.getTokenSync() ?? token,
        (info) => {
          this.rateLimit = info;
        },
      );

      try {
        const [
          viewer,
          issues,
          reviewRequests,
          myPrs,
          reviewedByMe,
          starredRepos,
          watchedRepos,
          notifications,
        ] = await Promise.all([
          client.viewer(),
          client.assignedIssues(),
          client.reviewRequests(),
          client.myPrs(),
          client.reviewedByMe(),
          client.starredRepos({ perPage: LIST_PAGE_SIZE, page: 1, sort: "updated" }),
          client.watchedRepos({ perPage: LIST_PAGE_SIZE, page: 1, sort: "updated" }),
          client.notifications({ perPage: LIST_PAGE_SIZE, page: 1 }),
        ]);

        this.viewer = viewer;
        this.sourceIssues = issues;
        this.sourceReviewRequests = reviewRequests;
        this.sourceMyPrs = myPrs;
        this.sourceWaitingOnAuthor = buildWaitingOnAuthor(reviewedByMe, reviewRequests);
        this.sourceStarredRepos = sortReposByUpdatedDesc(starredRepos);
        this.sourceWatchedRepos = sortReposByUpdatedDesc(watchedRepos);
        this.sourceNotifications = sortNotificationsByUpdatedDesc(notifications);
        this.starsPage = {
          currentPage: 1,
          hasMore: starredRepos.length === LIST_PAGE_SIZE,
          isLoadingMore: false,
        };
        this.watchingPage = {
          currentPage: 1,
          hasMore: watchedRepos.length === LIST_PAGE_SIZE,
          isLoadingMore: false,
        };
        this.notificationsPage = {
          currentPage: 1,
          hasMore: notifications.length === LIST_PAGE_SIZE,
          isLoadingMore: false,
        };
        this.applyRepoVisibilityFilter();
        this.lastRefreshed = new Date().toISOString();

        const itemSource = {
          issues: this.issues,
          reviewRequests: this.reviewRequests,
          myPrs: this.myPrs,
          waitingOnAuthor: this.waitingOnAuthor,
          notifications: this.notifications,
        };

        const { events } = await useRefreshStore().recordRefresh(
          {
            ...itemSource,
            issueGroups: this.issueGroups,
            prGroups: this.prGroups,
            prTotal: this.prCount,
            notificationsUnread: this.notifications.filter((n) => n.unread).length,
            watchingTotal: this.watchedRepos.length,
          },
          source,
        );

        if (source === "poll") {
          const settingsStore = useSettingsStore();
          const filtered = filterNotifiableEvents(events, settingsStore.notificationSettings);
          if (filtered.length) {
            const payload =
              filtered.length === 1
                ? {
                    title: NOTIFICATION_APP_TITLE,
                    body: formatSingleEventBody(filtered[0]!),
                  }
                : {
                    title: NOTIFICATION_APP_TITLE,
                    body: i18n.global.t("notifications.batchBody", { count: filtered.length }),
                  };
            await useNotification().notifyQuiet(payload);
          }
        }
      } catch (err) {
        this.errorMessage = formatErrorMessage(err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async loadMore(section: "stars" | "watching" | "notifications") {
      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) return;

      const client = createGitHubClient(
        () => auth.getTokenSync() ?? token,
        (info) => {
          this.rateLimit = info;
        },
      );

      if (section === "stars") {
        if (!this.starsPage.hasMore || this.starsPage.isLoadingMore) return;
        this.starsPage.isLoadingMore = true;
        try {
          const page = this.starsPage.currentPage + 1;
          const next = await client.starredRepos({ perPage: LIST_PAGE_SIZE, page, sort: "updated" });
          this.sourceStarredRepos = sortReposByUpdatedDesc(
            this.mergeById(this.sourceStarredRepos, next),
          );
          this.starsPage.currentPage = page;
          this.starsPage.hasMore = next.length === LIST_PAGE_SIZE;
          this.applyRepoVisibilityFilter();
        } finally {
          this.starsPage.isLoadingMore = false;
        }
        return;
      }

      if (section === "watching") {
        if (!this.watchingPage.hasMore || this.watchingPage.isLoadingMore) return;
        this.watchingPage.isLoadingMore = true;
        try {
          const page = this.watchingPage.currentPage + 1;
          const next = await client.watchedRepos({
            perPage: LIST_PAGE_SIZE,
            page,
            sort: "updated",
          });
          this.sourceWatchedRepos = sortReposByUpdatedDesc(
            this.mergeById(this.sourceWatchedRepos, next),
          );
          this.watchingPage.currentPage = page;
          this.watchingPage.hasMore = next.length === LIST_PAGE_SIZE;
          this.applyRepoVisibilityFilter();
        } finally {
          this.watchingPage.isLoadingMore = false;
        }
        return;
      }

      if (!this.notificationsPage.hasMore || this.notificationsPage.isLoadingMore) return;
      this.notificationsPage.isLoadingMore = true;
      try {
        const page = this.notificationsPage.currentPage + 1;
        const next = await client.notifications({ perPage: LIST_PAGE_SIZE, page });
        this.sourceNotifications = sortNotificationsByUpdatedDesc(
          this.mergeById(this.sourceNotifications, next),
        );
        this.notificationsPage.currentPage = page;
        this.notificationsPage.hasMore = next.length === LIST_PAGE_SIZE;
        this.applyRepoVisibilityFilter();
      } finally {
        this.notificationsPage.isLoadingMore = false;
      }
    },

    async detectGhCliStatus() {
      const ghStatus = await invoke<string>("gh_cli_status").catch(() => "not_installed");
      this.ghCliStatus = ghStatus as GhCliStatus;
    },

    async importTokenFromGhCli() {
      const token = await invoke<string>("gh_cli_import_token");
      await this.signInWithToken(token, "manual");
      this.ghCliStatus = "authed";
      this.ghCliErrorMessage = null;
      return token;
    },

    async signInWithToken(token: string, source: RefreshSource = "manual") {
      const auth = useGitHubAuth();
      const trimmed = await auth.saveToken(token);
      this.hasToken = Boolean(trimmed);
      this.ghCliErrorMessage = null;
      if (trimmed) {
        await this.refresh({ source });
        this.reconfigurePolling();
      }
      return trimmed;
    },

    async signOut() {
      await this.clearToken();
      this.stopPolling();
    },

    stopPolling() {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    },

    reconfigurePolling() {
      this.stopPolling();
      if (!this.hasToken || this.refreshInterval === "manual") {
        return;
      }
      const ms = INTERVAL_MS[this.refreshInterval];
      pollingTimer = setInterval(() => {
        void this.refresh({ source: "poll" }).catch(() => {
          // errors stored in state
        });
      }, ms);
    },
  },
});
