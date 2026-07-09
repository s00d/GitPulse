import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  approvePullRequestGraphql,
  createGitHubClient,
  fetchDashboardRefresh,
  fetchProjectBoardSnapshot,
  fetchRepoDerivedBatch,
  fetchRepoListPage,
  type GraphqlPointRateLimit,
  type RepoDerivedBatchSectionFlags,
} from "@/api/github";
import {
  buildWaitingOnAuthor,
  groupIssuesByRepo,
  groupPRsByRepoAndCategory,
} from "@/github/grouping";
import {
  buildMilestoneGroups,
  milestoneTrackRepos,
} from "@/github/milestones";
import {
  buildReleaseGroups,
  countVisibleReleases,
  watchedReposForReleases,
} from "@/github/releases";
import {
  enrichDiscussionsWithUnread,
  countUnreadDiscussions,
  filterDiscussionItemsByRepoVisibility,
} from "@/github/discussions";
import { buildProjectBoardGroups } from "@/github/projects";
import type {
  GhCliStatus,
  GitHubDiscussionItem,
  GitHubIssue,
  GitHubNotification,
  GitHubViewer,
  MilestoneRepoGroup,
  PrCiStatus,
  PrRepoGroup,
  ProjectBoardGroup,
  RateLimitInfo,
  ReleaseRepoGroup,
  RepoGroup,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";
import { isPullRequest } from "@/github/types";
import {
  collectReposFromSource,
  filterIssuesByRepoVisibility,
  filterNotificationsByRepoVisibility,
  filterStarredRepos,
  filterOwnedRepos,
  filterWatchedRepos,
} from "@/github/repoVisibility";
import { sortNotificationsByUpdatedDesc, sortReposByStarsDesc, sortReposByUpdatedDesc } from "@/github/search";
import {
  applyNotificationsInboxFilter,
  resolveNotificationsClearedAt,
} from "@/github/notificationsInbox";
import {
  ACTIVITY_KIND_LABEL_KEYS,
  activityChangeLabelKey,
  formatActivityLine,
} from "@/github/activityFormat";
import {
  filterNotifiableEvents,
  NOTIFICATION_APP_TITLE,
} from "@/github/changeNotifications";
import { isNotificationScheduleAllowed } from "@/github/notificationSchedule";
import { useGitHubAuth } from "@/composables/useGitHubAuth";
import { useNotification } from "@/composables/useNotification";
import { i18n } from "@/i18n";
import { computeTrayBadgeCount } from "@/github/trayBadge";
import { filterSnoozed, issueSnoozeKey } from "@/github/snooze";
import {
  pullRequestReviewUrl,
  snoozeKeyForIssue,
} from "@/github/itemActions";
import { notificationsForActivitySnapshot } from "@/github/itemDiff";
import { useSnoozeStore } from "@/stores/snoozeStore";
import {
  buildSavedViewContext,
  filterIssuesByView,
  filterNotificationsByView,
  filterPrQueuesByView,
  filterReposByView,
  matchesRepoView,
} from "@/github/savedViews";
import {
  applyClearMenuSection,
  clearDisabledMenuSections,
  type MenuSectionKey,
  type SectionPaginationState,
} from "@/github/sectionFetch";
import {
  buildGithubCacheSnapshot,
  clearGithubCache,
  loadGithubCache,
  saveGithubCache,
} from "@/github/githubCache";
import { isRefreshDue, msUntilNextRefresh } from "@/github/refreshSchedule";
import { useRefreshStore, type RefreshSource } from "@/stores/refreshStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { MenuVisibilitySettings, RefreshInterval } from "@/settings/appSettings";

let pollingTimer: ReturnType<typeof setTimeout> | null = null;
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

function filterIssuesWithSnooze(issues: GitHubIssue[], snoozeMap: Record<string, { until: string }>) {
  return filterSnoozed(issues, snoozeMap, (issue) =>
    issueSnoozeKey(issue.id, isPullRequest(issue)),
  );
}

function currentMenuVisibility(): MenuVisibilitySettings {
  return useSettingsStore().menuVisibility;
}

function normalizeIncomingNotifications(
  notifications: GitHubNotification[],
  clearedAt: string | null,
): GitHubNotification[] {
  return sortNotificationsByUpdatedDesc(
    applyNotificationsInboxFilter(notifications, clearedAt),
  );
}

interface GitHubState {
  viewer: GitHubViewer | null;
  sourceIssues: GitHubIssue[];
  sourceReviewRequests: GitHubIssue[];
  sourceMyPrs: GitHubIssue[];
  sourceWaitingOnAuthor: GitHubIssue[];
  sourceStarredRepos: StarredRepo[];
  sourceOwnedRepos: StarredRepo[];
  sourceWatchedRepos: WatchedRepo[];
  sourceNotifications: GitHubNotification[];
  notificationsClearedAt: string | null;
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  waitingOnAuthor: GitHubIssue[];
  starredRepos: StarredRepo[];
  ownedRepos: StarredRepo[];
  watchedRepos: WatchedRepo[];
  notifications: GitHubNotification[];
  issueGroups: RepoGroup<GitHubIssue>[];
  prGroups: PrRepoGroup[];
  milestoneGroups: MilestoneRepoGroup[];
  projectBoardGroups: ProjectBoardGroup[];
  releaseGroups: ReleaseRepoGroup[];
  discussionItems: GitHubDiscussionItem[];
  prCiById: Record<number, PrCiStatus>;
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
  graphqlRateLimit: GraphqlPointRateLimit | null;
  starsPage: SectionPaginationState;
  ownedReposPage: SectionPaginationState;
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
    sourceOwnedRepos: [],
    sourceWatchedRepos: [],
    sourceNotifications: [],
    notificationsClearedAt: null,
    issues: [],
    reviewRequests: [],
    myPrs: [],
    waitingOnAuthor: [],
    starredRepos: [],
    ownedRepos: [],
    watchedRepos: [],
    notifications: [],
    issueGroups: [],
    prGroups: [],
    milestoneGroups: [],
    projectBoardGroups: [],
    releaseGroups: [],
    discussionItems: [],
    prCiById: {},
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
    graphqlRateLimit: null,
    starsPage: { currentPage: 1, endCursor: null, hasMore: false, isLoadingMore: false },
    ownedReposPage: { currentPage: 1, endCursor: null, hasMore: false, isLoadingMore: false },
    watchingPage: { currentPage: 1, endCursor: null, hasMore: false, isLoadingMore: false },
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
    milestoneOpenTotal(state): number {
      return state.milestoneGroups.reduce((sum, group) => sum + group.totalOpenIssues, 0);
    },
    projectOpenTotal(state): number {
      return state.projectBoardGroups.reduce((sum, group) => sum + group.totalOpenCount, 0);
    },
    discussionsReleasesBadgeCount(state): number {
      const discussions = countUnreadDiscussions(state.discussionItems);
      const releases = countVisibleReleases(state.releaseGroups);
      const total = discussions + releases;
      return total > 0 ? total : 0;
    },
    knownRepos(state): string[] {
      return collectReposFromSource({
        issues: state.sourceIssues,
        reviewRequests: state.sourceReviewRequests,
        myPrs: state.sourceMyPrs,
        waitingOnAuthor: state.sourceWaitingOnAuthor,
        starredRepos: state.sourceStarredRepos,
        ownedRepos: state.sourceOwnedRepos,
        watchedRepos: state.sourceWatchedRepos,
        notifications: state.sourceNotifications,
      });
    },
    canLoadMoreStars(state): boolean {
      return state.starsPage.hasMore && !state.starsPage.isLoadingMore;
    },
    canLoadMoreOwnedRepos(state): boolean {
      return state.ownedReposPage.hasMore && !state.ownedReposPage.isLoadingMore;
    },
    canLoadMoreWatching(state): boolean {
      return state.watchingPage.hasMore && !state.watchingPage.isLoadingMore;
    },
    canLoadMoreNotifications(state): boolean {
      return state.notificationsPage.hasMore && !state.notificationsPage.isLoadingMore;
    },
    trayBadgeCount(): number {
      const settings = useSettingsStore();
      return computeTrayBadgeCount({
        issues: this.issues,
        reviewRequests: this.reviewRequests,
        myPrs: this.myPrs,
        unreadNotificationCount: this.unreadNotificationCount,
        menuVisibility: settings.menuVisibility,
        trayBadge: settings.trayBadge,
      });
    },
    badgeCount(): number {
      return this.trayBadgeCount;
    },
    displayIssueCount(): number {
      return this.issueGroups.reduce((sum, group) => sum + group.totalCount, 0);
    },
    displayPrCount(): number {
      return this.prGroups.reduce((sum, group) => sum + group.totalCount, 0);
    },
    viewStarredRepos(state): StarredRepo[] {
      const settings = useSettingsStore();
      return filterReposByView(
        state.starredRepos,
        settings.savedViews.activeView,
        buildSavedViewContext(settings.savedViews, this.viewer?.login),
      );
    },
    viewOwnedRepos(state): StarredRepo[] {
      const settings = useSettingsStore();
      return filterReposByView(
        state.ownedRepos,
        settings.savedViews.activeView,
        buildSavedViewContext(settings.savedViews, this.viewer?.login),
      );
    },
    viewWatchedRepos(state): WatchedRepo[] {
      const settings = useSettingsStore();
      return filterReposByView(
        state.watchedRepos,
        settings.savedViews.activeView,
        buildSavedViewContext(settings.savedViews, this.viewer?.login),
      );
    },
    viewNotifications(state): GitHubNotification[] {
      const settings = useSettingsStore();
      return filterNotificationsByView(
        state.notifications,
        settings.savedViews.activeView,
        buildSavedViewContext(settings.savedViews, this.viewer?.login),
      );
    },
    viewMilestoneGroups(state): MilestoneRepoGroup[] {
      const settings = useSettingsStore();
      const view = settings.savedViews.activeView;
      if (view === "all" || view === "urgent") return state.milestoneGroups;
      const ctx = buildSavedViewContext(settings.savedViews, this.viewer?.login);
      return state.milestoneGroups.filter((group) => matchesRepoView(group.repo, view, ctx));
    },
    viewReleaseGroups(state): ReleaseRepoGroup[] {
      const settings = useSettingsStore();
      const view = settings.savedViews.activeView;
      if (view === "all" || view === "urgent") return state.releaseGroups;
      const ctx = buildSavedViewContext(settings.savedViews, this.viewer?.login);
      return state.releaseGroups.filter((group) => matchesRepoView(group.repo, view, ctx));
    },
    viewDiscussionItems(state): GitHubDiscussionItem[] {
      const settings = useSettingsStore();
      const items = filterDiscussionItemsByRepoVisibility(
        state.discussionItems,
        settings.repoVisibility,
      );
      const view = settings.savedViews.activeView;
      if (view === "all" || view === "urgent") return items;
      const ctx = buildSavedViewContext(settings.savedViews, this.viewer?.login);
      return items.filter((item) => matchesRepoView(item.repo, view, ctx));
    },
    viewUnreadNotificationCount(): number {
      return this.viewNotifications.filter((notification) => notification.unread).length;
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
      this.starsPage = { currentPage: 1, endCursor: null, hasMore: false, isLoadingMore: false };
      this.ownedReposPage = { currentPage: 1, endCursor: null, hasMore: false, isLoadingMore: false };
      this.watchingPage = { currentPage: 1, endCursor: null, hasMore: false, isLoadingMore: false };
      this.notificationsPage = { currentPage: 1, hasMore: false, isLoadingMore: false };
    },

    recordGraphqlRateLimit(info: GraphqlPointRateLimit) {
      this.graphqlRateLimit = info;
    },

    createGraphqlOptions() {
      return { onRateLimit: (info: GraphqlPointRateLimit) => this.recordGraphqlRateLimit(info) };
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

    async resetBootstrapState() {
      const meta = this as typeof this & { __tauriPersistHydrated?: Promise<void> };
      await meta.__tauriPersistHydrated;
      this.isLoading = false;
      this.isBootstrapped = false;
    },

    isRefreshDue(): boolean {
      return isRefreshDue(this.lastRefreshed, this.refreshInterval);
    },

    async hydrateFromCache(): Promise<boolean> {
      const cache = await loadGithubCache();
      if (!cache) return false;

      this.viewer = cache.viewer;
      this.lastRefreshed = cache.lastRefreshed;
      this.sourceIssues = cache.sourceIssues;
      this.sourceReviewRequests = cache.sourceReviewRequests;
      this.sourceMyPrs = cache.sourceMyPrs;
      this.sourceWaitingOnAuthor = cache.sourceWaitingOnAuthor;
      this.sourceStarredRepos = cache.sourceStarredRepos;
      this.sourceOwnedRepos = cache.sourceOwnedRepos;
      this.sourceWatchedRepos = cache.sourceWatchedRepos;
      this.sourceNotifications = normalizeIncomingNotifications(
        cache.sourceNotifications,
        cache.notificationsClearedAt,
      );
      this.notificationsClearedAt = cache.notificationsClearedAt;
      this.milestoneGroups = cache.milestoneGroups;
      this.projectBoardGroups = cache.projectBoardGroups;
      this.releaseGroups = cache.releaseGroups;
      this.discussionItems = cache.discussionItems ?? [];
      this.prCiById = cache.prCiById;
      this.starsPage = cache.starsPage;
      this.ownedReposPage = cache.ownedReposPage;
      this.watchingPage = cache.watchingPage;
      this.notificationsPage = cache.notificationsPage;
      this.applyRepoVisibilityFilter();
      return true;
    },

    async persistToCache(): Promise<void> {
      await saveGithubCache(
        buildGithubCacheSnapshot({
          viewer: this.viewer,
          lastRefreshed: this.lastRefreshed,
          sourceIssues: this.sourceIssues,
          sourceReviewRequests: this.sourceReviewRequests,
          sourceMyPrs: this.sourceMyPrs,
          sourceWaitingOnAuthor: this.sourceWaitingOnAuthor,
          sourceStarredRepos: this.sourceStarredRepos,
          sourceOwnedRepos: this.sourceOwnedRepos,
          sourceWatchedRepos: this.sourceWatchedRepos,
          sourceNotifications: this.sourceNotifications,
          notificationsClearedAt: this.notificationsClearedAt,
          milestoneGroups: this.milestoneGroups,
          projectBoardGroups: this.projectBoardGroups,
          releaseGroups: this.releaseGroups,
          discussionItems: this.discussionItems,
          prCiById: this.prCiById,
          starsPage: this.starsPage,
          ownedReposPage: this.ownedReposPage,
          watchingPage: this.watchingPage,
          notificationsPage: this.notificationsPage,
        }),
      );
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
      await clearGithubCache();
      this.hasToken = false;
      this.viewer = null;
      this.sourceIssues = [];
      this.sourceReviewRequests = [];
      this.sourceMyPrs = [];
      this.sourceWaitingOnAuthor = [];
      this.sourceStarredRepos = [];
      this.sourceOwnedRepos = [];
      this.sourceWatchedRepos = [];
      this.sourceNotifications = [];
      this.notificationsClearedAt = null;
      this.issues = [];
      this.reviewRequests = [];
      this.myPrs = [];
      this.waitingOnAuthor = [];
      this.starredRepos = [];
      this.ownedRepos = [];
      this.watchedRepos = [];
      this.notifications = [];
      this.issueGroups = [];
      this.prGroups = [];
      this.milestoneGroups = [];
      this.projectBoardGroups = [];
      this.releaseGroups = [];
      this.discussionItems = [];
      this.prCiById = {};
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
      const { repoVisibility, menuVisibility } = useSettingsStore();
      const snoozeMap = useSnoozeStore().items;

      const visibleIssues = (list: GitHubIssue[]) =>
        filterIssuesWithSnooze(filterIssuesByRepoVisibility(list, repoVisibility), snoozeMap);

      this.issues = menuVisibility.showIssues ? visibleIssues(this.sourceIssues) : [];
      this.reviewRequests = menuVisibility.showPullRequests
        ? visibleIssues(this.sourceReviewRequests)
        : [];
      this.myPrs = menuVisibility.showPullRequests ? visibleIssues(this.sourceMyPrs) : [];
      this.waitingOnAuthor = menuVisibility.showPullRequests
        ? visibleIssues(this.sourceWaitingOnAuthor)
        : [];
      this.starredRepos = menuVisibility.showStars
        ? filterStarredRepos(this.sourceStarredRepos, repoVisibility)
        : [];
      this.ownedRepos = menuVisibility.showStars
        ? filterOwnedRepos(this.sourceOwnedRepos, repoVisibility)
        : [];
      this.watchedRepos = menuVisibility.showWatching
        ? filterWatchedRepos(this.sourceWatchedRepos, repoVisibility)
        : [];
      this.notifications = menuVisibility.showNotifications
        ? filterNotificationsByRepoVisibility(this.sourceNotifications, repoVisibility)
        : [];
      if (menuVisibility.showDiscussionsReleases) {
        this.discussionItems = filterDiscussionItemsByRepoVisibility(
          enrichDiscussionsWithUnread(
            this.discussionItems,
            this.sourceNotifications,
            menuVisibility.showNotifications,
          ),
          repoVisibility,
        );
      } else {
        this.discussionItems = [];
      }
      this.recomputeGroups();
    },

    async refreshDerivedSections(_options?: { source?: RefreshSource }) {
      const visibility = currentMenuVisibility();
      const tasks: Promise<void>[] = [];
      if (visibility.showProjects) tasks.push(this.refreshProjects());
      if (visibility.showMilestones || visibility.showDiscussionsReleases) {
        tasks.push(this.refreshDerivedRepoSections());
      }
      await Promise.all(tasks);
    },

    clearMenuSection(key: MenuSectionKey) {
      if (key === "showNotifications") {
        this.notificationsClearedAt = resolveNotificationsClearedAt(this.sourceNotifications);
      }
      applyClearMenuSection(this, key);
      this.recomputeGroups();
      void this.persistToCache();
    },

    async clearNotificationsInbox() {
      this.notificationsClearedAt = resolveNotificationsClearedAt(this.sourceNotifications);
      this.sourceNotifications = [];
      this.notifications = [];
      this.notificationsPage = {
        currentPage: 1,
        endCursor: null,
        hasMore: false,
        isLoadingMore: false,
      };
      this.applyRepoVisibilityFilter();
      await this.persistToCache();
    },

    async refreshMenuSection(key: MenuSectionKey) {
      const visibility = currentMenuVisibility();
      if (!visibility[key]) return;

      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) return;

      const client = createGitHubClient(
        () => auth.getTokenSync() ?? token,
        (info) => {
          this.rateLimit = info;
        },
      );

      switch (key) {
        case "showIssues": {
          const data = await fetchDashboardRefresh(
            client,
            LIST_PAGE_SIZE,
            {
              includeIssues: true,
              includePullRequests: false,
              includeStars: false,
              includeOwned: false,
              includeWatching: false,
            },
            this.createGraphqlOptions(),
          );
          this.sourceIssues = data.issues;
          break;
        }
        case "showPullRequests": {
          const data = await fetchDashboardRefresh(
            client,
            LIST_PAGE_SIZE,
            {
              includeIssues: false,
              includePullRequests: true,
              includeStars: false,
              includeOwned: false,
              includeWatching: false,
            },
            this.createGraphqlOptions(),
          );
          this.sourceReviewRequests = data.reviewRequests;
          this.sourceMyPrs = data.myPrs;
          this.sourceWaitingOnAuthor = buildWaitingOnAuthor(
            data.reviewedByMe,
            data.reviewRequests,
          );
          this.prCiById = data.prCiById;
          break;
        }
        case "showStars": {
          const data = await fetchDashboardRefresh(
            client,
            LIST_PAGE_SIZE,
            {
              includeIssues: false,
              includePullRequests: false,
              includeStars: true,
              includeOwned: true,
              includeWatching: false,
            },
            this.createGraphqlOptions(),
          );
          this.sourceStarredRepos = sortReposByUpdatedDesc(data.starredRepos);
          this.sourceOwnedRepos = sortReposByStarsDesc(data.ownedRepos);
          this.starsPage = {
            currentPage: 1,
            endCursor: data.starsPage.endCursor,
            hasMore: data.starsPage.hasMore,
            isLoadingMore: false,
          };
          this.ownedReposPage = {
            currentPage: 1,
            endCursor: data.ownedReposPage.endCursor,
            hasMore: data.ownedReposPage.hasMore,
            isLoadingMore: false,
          };
          break;
        }
        case "showWatching": {
          const data = await fetchDashboardRefresh(
            client,
            LIST_PAGE_SIZE,
            {
              includeIssues: false,
              includePullRequests: false,
              includeStars: false,
              includeOwned: false,
              includeWatching: true,
            },
            this.createGraphqlOptions(),
          );
          this.sourceWatchedRepos = sortReposByUpdatedDesc(data.watchedRepos);
          this.watchingPage = {
            currentPage: 1,
            endCursor: data.watchingPage.endCursor,
            hasMore: data.watchingPage.hasMore,
            isLoadingMore: false,
          };
          break;
        }
        case "showNotifications": {
          const notifications = await client.notifications({ perPage: LIST_PAGE_SIZE, page: 1 });
          this.sourceNotifications = normalizeIncomingNotifications(
            notifications,
            this.notificationsClearedAt,
          );
          this.notificationsPage = {
            currentPage: 1,
            hasMore: notifications.length === LIST_PAGE_SIZE,
            isLoadingMore: false,
          };
          break;
        }
        case "showMilestones":
          this.applyRepoVisibilityFilter();
          await this.refreshDerivedRepoSections();
          return;
        case "showProjects":
          await this.refreshProjects();
          return;
        case "showDiscussionsReleases": {
          if (!visibility.showWatching) {
            const data = await fetchDashboardRefresh(
              client,
              LIST_PAGE_SIZE,
              {
                includeIssues: false,
                includePullRequests: false,
                includeStars: false,
                includeOwned: false,
                includeWatching: true,
              },
              this.createGraphqlOptions(),
            );
            this.sourceWatchedRepos = sortReposByUpdatedDesc(data.watchedRepos);
            this.watchingPage = {
              currentPage: 1,
              endCursor: data.watchingPage.endCursor,
              hasMore: data.watchingPage.hasMore,
              isLoadingMore: false,
            };
          }
          await this.refreshDerivedRepoSections();
          return;
        }
      }

      this.applyRepoVisibilityFilter();
    },

    async refreshProjects() {
      if (!currentMenuVisibility().showProjects) {
        this.projectBoardGroups = [];
        return;
      }

      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) {
        this.projectBoardGroups = [];
        return;
      }

      const trackedProjects = useSettingsStore().trackedProjects;
      if (!trackedProjects.length) {
        this.projectBoardGroups = [];
        return;
      }

      const client = createGitHubClient(
        () => auth.getTokenSync() ?? token,
        (info) => {
          this.rateLimit = info;
        },
      );

      const results = await Promise.allSettled(
        trackedProjects.map((project) =>
          fetchProjectBoardSnapshot(client, project),
        ),
      );

      const snapshots = results
        .filter(
          (result): result is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof fetchProjectBoardSnapshot>>>> =>
            result.status === "fulfilled" && result.value != null,
        )
        .map((result) => result.value);

      this.projectBoardGroups = buildProjectBoardGroups(snapshots);
    },

    async fetchDerivedRepoBatchData(repos: string[], sections?: RepoDerivedBatchSectionFlags) {
      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) return null;

      const client = createGitHubClient(
        () => auth.getTokenSync() ?? token,
        (info) => {
          this.rateLimit = info;
        },
      );

      return fetchRepoDerivedBatch(client, repos, {
        ...this.createGraphqlOptions(),
        sections,
      });
    },

    derivedSectionFlags(): RepoDerivedBatchSectionFlags {
      const visibility = currentMenuVisibility();
      return {
        includeReleases: visibility.showDiscussionsReleases,
        includeDiscussions: visibility.showDiscussionsReleases,
        includeMilestones: visibility.showMilestones,
      };
    },

    async refreshDerivedRepoSections() {
      const visibility = currentMenuVisibility();
      const settingsStore = useSettingsStore();
      const repoVisibility = settingsStore.repoVisibility;
      const sections = this.derivedSectionFlags();

      const milestoneRepos = visibility.showMilestones
        ? milestoneTrackRepos(this.issueGroups, repoVisibility)
        : [];
      const activityRepos = visibility.showDiscussionsReleases
        ? watchedReposForReleases(this.sourceWatchedRepos, repoVisibility)
        : [];

      const repos = [...new Set([...milestoneRepos, ...activityRepos])];

      if (!repos.length) {
        if (visibility.showMilestones) this.milestoneGroups = [];
        if (visibility.showDiscussionsReleases) {
          this.releaseGroups = [];
          this.discussionItems = [];
        }
        return;
      }

      const batch = await this.fetchDerivedRepoBatchData(repos, sections);
      if (!batch) {
        if (visibility.showMilestones) this.milestoneGroups = [];
        if (visibility.showDiscussionsReleases) {
          this.releaseGroups = [];
          this.discussionItems = [];
        }
        return;
      }

      if (visibility.showMilestones) {
        const milestoneSet = new Set(milestoneRepos);
        this.milestoneGroups = buildMilestoneGroups(
          batch.milestones.filter((entry) => milestoneSet.has(entry.repo)),
        );
      }

      if (visibility.showDiscussionsReleases) {
        const activitySet = new Set(activityRepos);
        const menuVisibility = settingsStore.menuVisibility;
        this.releaseGroups = buildReleaseGroups(
          batch.releases.filter((entry) => activitySet.has(entry.repo)),
        );
        this.discussionItems = filterDiscussionItemsByRepoVisibility(
          enrichDiscussionsWithUnread(
            batch.discussions.filter((item) => activitySet.has(item.repo)),
            this.sourceNotifications,
            menuVisibility.showNotifications,
          ),
          repoVisibility,
        );
      }
    },

    async refreshMilestones() {
      if (!currentMenuVisibility().showMilestones) {
        this.milestoneGroups = [];
        return;
      }

      const visibility = useSettingsStore().repoVisibility;
      const repos = milestoneTrackRepos(this.issueGroups, visibility);
      if (!repos.length) {
        this.milestoneGroups = [];
        return;
      }

      const batch = await this.fetchDerivedRepoBatchData(repos, {
        includeReleases: false,
        includeDiscussions: false,
        includeMilestones: true,
      });
      if (!batch) {
        this.milestoneGroups = [];
        return;
      }

      this.milestoneGroups = buildMilestoneGroups(batch.milestones);
    },

    async refreshRepoActivity() {
      if (!currentMenuVisibility().showDiscussionsReleases) {
        this.releaseGroups = [];
        this.discussionItems = [];
        return;
      }

      const settingsStore = useSettingsStore();
      const visibility = settingsStore.repoVisibility;
      const menuVisibility = settingsStore.menuVisibility;
      const repos = watchedReposForReleases(this.sourceWatchedRepos, visibility);
      if (!repos.length) {
        this.releaseGroups = [];
        this.discussionItems = [];
        return;
      }

      const batch = await this.fetchDerivedRepoBatchData(repos, {
        includeReleases: true,
        includeDiscussions: true,
        includeMilestones: false,
      });
      if (!batch) {
        this.releaseGroups = [];
        this.discussionItems = [];
        return;
      }

      this.releaseGroups = buildReleaseGroups(batch.releases);
      this.discussionItems = filterDiscussionItemsByRepoVisibility(
        enrichDiscussionsWithUnread(
          batch.discussions,
          this.sourceNotifications,
          menuVisibility.showNotifications,
        ),
        visibility,
      );
    },

    async refreshReleases() {
      await this.refreshRepoActivity();
    },

    recomputeGroups() {
      const settings = useSettingsStore();
      const { activeView, pinnedRepos } = settings.savedViews;
      const ctx = buildSavedViewContext(settings.savedViews, this.viewer?.login);

      const viewIssues = filterIssuesByView(this.issues, activeView, ctx);
      const viewPrQueues = filterPrQueuesByView(
        {
          reviewRequests: this.reviewRequests,
          myPrs: this.myPrs,
          waitingOnAuthor: this.waitingOnAuthor,
        },
        activeView,
        ctx,
      );

      this.issueGroups = groupIssuesByRepo(viewIssues, pinnedRepos);
      this.prGroups = groupPRsByRepoAndCategory(viewPrQueues, pinnedRepos);
    },

    async refresh(options?: { source?: RefreshSource }) {
      const source = options?.source ?? "manual";
      if (this.isLoading && source === "poll") return;

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
        const visibility = currentMenuVisibility();
        clearDisabledMenuSections(this, visibility);

        const graphqlOptions = this.createGraphqlOptions();
        const dashboardPromise = fetchDashboardRefresh(
          client,
          LIST_PAGE_SIZE,
          {
            includeIssues: visibility.showIssues,
            includePullRequests: visibility.showPullRequests,
            includeStars: visibility.showStars,
            includeOwned: visibility.showStars,
            includeWatching:
              visibility.showWatching || visibility.showDiscussionsReleases,
          },
          graphqlOptions,
        );

        const [dashboard, notifications] = await Promise.all([
          dashboardPromise,
          visibility.showNotifications
            ? client.notifications({ perPage: LIST_PAGE_SIZE, page: 1 })
            : Promise.resolve([]),
        ]);

        this.viewer = dashboard.viewer;
        this.sourceIssues = dashboard.issues;
        this.sourceReviewRequests = dashboard.reviewRequests;
        this.sourceMyPrs = dashboard.myPrs;
        this.sourceWaitingOnAuthor = buildWaitingOnAuthor(
          dashboard.reviewedByMe,
          dashboard.reviewRequests,
        );
        this.prCiById = dashboard.prCiById;
        this.sourceStarredRepos = sortReposByUpdatedDesc(dashboard.starredRepos);
        this.sourceOwnedRepos = sortReposByStarsDesc(dashboard.ownedRepos);
        this.sourceWatchedRepos = sortReposByUpdatedDesc(dashboard.watchedRepos);
        this.sourceNotifications = normalizeIncomingNotifications(
          notifications,
          this.notificationsClearedAt,
        );
        this.starsPage = {
          currentPage: 1,
          endCursor: dashboard.starsPage.endCursor,
          hasMore: visibility.showStars && dashboard.starsPage.hasMore,
          isLoadingMore: false,
        };
        this.ownedReposPage = {
          currentPage: 1,
          endCursor: dashboard.ownedReposPage.endCursor,
          hasMore: visibility.showStars && dashboard.ownedReposPage.hasMore,
          isLoadingMore: false,
        };
        this.watchingPage = {
          currentPage: 1,
          endCursor: dashboard.watchingPage.endCursor,
          hasMore:
            (visibility.showWatching || visibility.showDiscussionsReleases) &&
            dashboard.watchingPage.hasMore,
          isLoadingMore: false,
        };
        this.notificationsPage = {
          currentPage: 1,
          hasMore: visibility.showNotifications && notifications.length === LIST_PAGE_SIZE,
          isLoadingMore: false,
        };
        this.applyRepoVisibilityFilter();
        await this.refreshDerivedSections({ source });
        this.lastRefreshed = new Date().toISOString();
        await this.persistToCache();

        const settingsStore = useSettingsStore();
        const { menuVisibility, repoVisibility } = settingsStore;
        const activityNotifications = filterNotificationsByRepoVisibility(
          notificationsForActivitySnapshot(this.sourceNotifications, {
            includeInbox: menuVisibility.showNotifications,
            includeDiscussionsReleases: menuVisibility.showDiscussionsReleases,
          }),
          repoVisibility,
        );
        const activityReleases = menuVisibility.showDiscussionsReleases
          ? this.releaseGroups.flatMap((group) =>
              group.releases.map((release) => ({ repo: group.repo, release })),
            )
          : [];

        const itemSource = {
          issues: this.issues,
          reviewRequests: this.reviewRequests,
          myPrs: this.myPrs,
          waitingOnAuthor: this.waitingOnAuthor,
          notifications: activityNotifications,
          releases: activityReleases,
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
          const notificationSettings = settingsStore.notificationSettings;
          if (isNotificationScheduleAllowed(notificationSettings)) {
            const filtered = filterNotifiableEvents(events, notificationSettings);
            if (filtered.length) {
              const payload =
                filtered.length === 1
                  ? {
                      title: NOTIFICATION_APP_TITLE,
                      body: formatActivityLine(filtered[0]!, {
                        changeLabel: i18n.global.t(activityChangeLabelKey(filtered[0]!.change)),
                        kindLabel: i18n.global.t(ACTIVITY_KIND_LABEL_KEYS[filtered[0]!.kind]),
                      }),
                    }
                  : {
                      title: NOTIFICATION_APP_TITLE,
                      body: i18n.global.t("notifications.batchBody", { count: filtered.length }),
                    };
              await useNotification().notifyQuiet(payload);
            }
          }
        }
      } catch (err) {
        this.errorMessage = formatErrorMessage(err);
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async loadMore(section: "stars" | "ownedRepos" | "watching" | "notifications") {
      const visibility = currentMenuVisibility();
      if (section === "stars" || section === "ownedRepos") {
        if (!visibility.showStars) return;
      } else if (section === "watching") {
        if (!visibility.showWatching) return;
      } else if (!visibility.showNotifications) {
        return;
      }

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
          const page = await fetchRepoListPage(
            client,
            "starred",
            LIST_PAGE_SIZE,
            this.starsPage.endCursor ?? null,
            this.createGraphqlOptions(),
          );
          this.sourceStarredRepos = sortReposByUpdatedDesc(
            this.mergeById(this.sourceStarredRepos, page.repos),
          );
          this.starsPage.endCursor = page.endCursor;
          this.starsPage.hasMore = page.hasMore;
          this.applyRepoVisibilityFilter();
        } finally {
          this.starsPage.isLoadingMore = false;
        }
        return;
      }

      if (section === "ownedRepos") {
        if (!this.ownedReposPage.hasMore || this.ownedReposPage.isLoadingMore) return;
        this.ownedReposPage.isLoadingMore = true;
        try {
          const page = await fetchRepoListPage(
            client,
            "owned",
            LIST_PAGE_SIZE,
            this.ownedReposPage.endCursor ?? null,
            this.createGraphqlOptions(),
          );
          this.sourceOwnedRepos = sortReposByStarsDesc(
            this.mergeById(this.sourceOwnedRepos, page.repos),
          );
          this.ownedReposPage.endCursor = page.endCursor;
          this.ownedReposPage.hasMore = page.hasMore;
          this.applyRepoVisibilityFilter();
        } finally {
          this.ownedReposPage.isLoadingMore = false;
        }
        return;
      }

      if (section === "watching") {
        if (!this.watchingPage.hasMore || this.watchingPage.isLoadingMore) return;
        this.watchingPage.isLoadingMore = true;
        try {
          const page = await fetchRepoListPage(
            client,
            "watching",
            LIST_PAGE_SIZE,
            this.watchingPage.endCursor ?? null,
            this.createGraphqlOptions(),
          );
          this.sourceWatchedRepos = sortReposByUpdatedDesc(
            this.mergeById(this.sourceWatchedRepos, page.repos),
          );
          this.watchingPage.endCursor = page.endCursor;
          this.watchingPage.hasMore = page.hasMore;
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
        this.sourceNotifications = normalizeIncomingNotifications(
          this.mergeById(this.sourceNotifications, next),
          this.notificationsClearedAt,
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

    async markNotificationRead(notification: GitHubNotification) {
      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) return;

      const previous = this.sourceNotifications.find((entry) => entry.id === notification.id);
      this.sourceNotifications = this.sourceNotifications.map((entry) =>
        entry.id === notification.id ? { ...entry, unread: false } : entry,
      );
      this.applyRepoVisibilityFilter();

      const client = createGitHubClient(() => auth.getTokenSync() ?? token);
      try {
        await client.markNotificationRead(notification.id);
        this.discussionItems = this.discussionItems.map((entry) =>
          entry.notificationId === notification.id ? { ...entry, unread: false } : entry,
        );
      } catch (err) {
        if (previous) {
          this.sourceNotifications = this.sourceNotifications.map((entry) =>
            entry.id === notification.id ? previous : entry,
          );
          this.applyRepoVisibilityFilter();
        }
        this.errorMessage = formatErrorMessage(err);
        throw err;
      }
    },

    async markDiscussionRead(discussion: GitHubDiscussionItem) {
      if (discussion.notificationId) {
        const notification = this.sourceNotifications.find(
          (entry) => entry.id === discussion.notificationId,
        );
        if (notification) {
          await this.markNotificationRead(notification);
          return;
        }
      }
      this.discussionItems = this.discussionItems.map((entry) =>
        entry.id === discussion.id ? { ...entry, unread: false, notificationId: undefined } : entry,
      );
    },

    async snoozeIssue(issue: GitHubIssue, hours: number) {
      const snoozeStore = useSnoozeStore();
      await snoozeStore.init();
      await snoozeStore.snooze(snoozeKeyForIssue(issue), hours);
      this.applyRepoVisibilityFilter();
    },

    async unsnoozeIssue(issue: GitHubIssue) {
      const snoozeStore = useSnoozeStore();
      await snoozeStore.init();
      await snoozeStore.unsnooze(snoozeKeyForIssue(issue));
      this.applyRepoVisibilityFilter();
    },

    async openPullRequestReview(issue: GitHubIssue) {
      try {
        await openUrl(pullRequestReviewUrl(issue));
      } catch {
        // ignore opener failures
      }
    },

    async approvePullRequest(issue: GitHubIssue) {
      const settings = useSettingsStore();
      if (!settings.itemActions.enableQuickApprove) return;

      if (!issue.graphql_id) return;

      const auth = useGitHubAuth();
      const token = await auth.loadToken();
      if (!token) return;

      const client = createGitHubClient(
        () => auth.getTokenSync() ?? token,
        (info) => {
          this.rateLimit = info;
        },
      );
      try {
        await approvePullRequestGraphql(client, issue.graphql_id, this.createGraphqlOptions());
        this.sourceReviewRequests = this.sourceReviewRequests.filter(
          (entry) => entry.id !== issue.id,
        );
        this.applyRepoVisibilityFilter();
      } catch (err) {
        this.errorMessage = formatErrorMessage(err);
        throw err;
      }
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

      const delay = msUntilNextRefresh(this.lastRefreshed, this.refreshInterval);
      pollingTimer = setTimeout(() => {
        void this.refresh({ source: "poll" })
          .catch(() => {
            // errors stored in state
          })
          .finally(() => {
            this.reconfigurePolling();
          });
      }, delay);
    },
  },
});
