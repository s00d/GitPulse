import type { DashboardTab } from "@/dashboard/types";
import type { MenuVisibilitySettings } from "@/settings/appSettings";
import { useApiDebugStore } from "@/stores/apiDebugStore";
import type {
  GitHubIssue,
  GitHubDiscussionItem,
  GitHubNotification,
  MilestoneRepoGroup,
  PrCiStatus,
  ProjectBoardGroup,
  ReleaseRepoGroup,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";

export type MenuSectionKey = keyof MenuVisibilitySettings;

export const MENU_SECTION_KEYS: MenuSectionKey[] = [
  "showFeed",
  "showIssues",
  "showMilestones",
  "showProjects",
  "showPullRequests",
  "showStars",
  "showWatching",
  "showNotifications",
  "showDiscussionsReleases",
  "showApiDebug",
];

const DASHBOARD_TAB_FLAGS: Partial<Record<DashboardTab, MenuSectionKey>> = {
  feed: "showFeed",
  issues: "showIssues",
  milestones: "showMilestones",
  projects: "showProjects",
  pullRequests: "showPullRequests",
  stars: "showStars",
  watching: "showWatching",
  notifications: "showNotifications",
  discussionsReleases: "showDiscussionsReleases",
  apiDebug: "showApiDebug",
};

export interface SectionPaginationState {
  currentPage: number;
  endCursor?: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const EMPTY_PAGINATION: SectionPaginationState = {
  currentPage: 1,
  endCursor: null,
  hasMore: false,
  isLoadingMore: false,
};

export interface MenuSectionClearTarget {
  sourceIssues: GitHubIssue[];
  sourceReviewRequests: GitHubIssue[];
  sourceMyPrs: GitHubIssue[];
  sourceWaitingOnAuthor: GitHubIssue[];
  sourceStarredRepos: StarredRepo[];
  sourceOwnedRepos: StarredRepo[];
  sourceWatchedRepos: WatchedRepo[];
  sourceNotifications: GitHubNotification[];
  issues: GitHubIssue[];
  reviewRequests: GitHubIssue[];
  myPrs: GitHubIssue[];
  waitingOnAuthor: GitHubIssue[];
  starredRepos: StarredRepo[];
  ownedRepos: StarredRepo[];
  watchedRepos: WatchedRepo[];
  notifications: GitHubNotification[];
  milestoneGroups: MilestoneRepoGroup[];
  projectBoardGroups: ProjectBoardGroup[];
  releaseGroups: ReleaseRepoGroup[];
  discussionItems: GitHubDiscussionItem[];
  prCiById: Record<number, PrCiStatus>;
  starsPage: SectionPaginationState;
  ownedReposPage: SectionPaginationState;
  watchingPage: SectionPaginationState;
  notificationsPage: SectionPaginationState;
}

export function shouldFetchMenuSection(
  visibility: MenuVisibilitySettings,
  key: MenuSectionKey,
): boolean {
  return visibility[key];
}

export function dashboardTabMenuFlag(tab: DashboardTab): MenuSectionKey | null {
  return DASHBOARD_TAB_FLAGS[tab] ?? null;
}

export function isDashboardTabVisible(
  tab: DashboardTab,
  visibility: MenuVisibilitySettings,
): boolean {
  const flag = dashboardTabMenuFlag(tab);
  if (!flag) return true;
  return visibility[flag];
}

export function applyClearMenuSection(target: MenuSectionClearTarget, key: MenuSectionKey): void {
  switch (key) {
    case "showFeed":
      void import("@/stores/feedStore").then(({ useFeedStore }) => useFeedStore().clear());
      break;
    case "showIssues":
      target.sourceIssues = [];
      target.issues = [];
      break;
    case "showPullRequests":
      target.sourceReviewRequests = [];
      target.sourceMyPrs = [];
      target.sourceWaitingOnAuthor = [];
      target.reviewRequests = [];
      target.myPrs = [];
      target.waitingOnAuthor = [];
      target.prCiById = {};
      break;
    case "showStars":
      target.sourceStarredRepos = [];
      target.sourceOwnedRepos = [];
      target.starredRepos = [];
      target.ownedRepos = [];
      target.starsPage = { ...EMPTY_PAGINATION };
      target.ownedReposPage = { ...EMPTY_PAGINATION };
      break;
    case "showWatching":
      target.sourceWatchedRepos = [];
      target.watchedRepos = [];
      target.watchingPage = { ...EMPTY_PAGINATION };
      break;
    case "showNotifications":
      target.sourceNotifications = [];
      target.notifications = [];
      target.notificationsPage = { ...EMPTY_PAGINATION };
      break;
    case "showMilestones":
      target.milestoneGroups = [];
      break;
    case "showProjects":
      target.projectBoardGroups = [];
      break;
    case "showDiscussionsReleases":
      target.releaseGroups = [];
      target.discussionItems = [];
      break;
    case "showApiDebug":
      useApiDebugStore().clear();
      break;
  }
}

export function clearDisabledMenuSections(
  target: MenuSectionClearTarget,
  visibility: MenuVisibilitySettings,
): void {
  for (const key of MENU_SECTION_KEYS) {
    if (!visibility[key]) {
      applyClearMenuSection(target, key);
    }
  }
}
