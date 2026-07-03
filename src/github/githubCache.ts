import { useTauriStore } from "@/composables/useTauriStore";
import type { SectionPaginationState } from "@/github/sectionFetch";
import type {
  GitHubDiscussionItem,
  GitHubIssue,
  GitHubNotification,
  GitHubViewer,
  MilestoneRepoGroup,
  PrCiStatus,
  ProjectBoardGroup,
  ReleaseRepoGroup,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";

const CACHE_VERSION = 3;

export interface GitHubDataCache extends Record<string, unknown> {
  version: number;
  viewer: GitHubViewer | null;
  lastRefreshed: string | null;
  sourceIssues: GitHubIssue[];
  sourceReviewRequests: GitHubIssue[];
  sourceMyPrs: GitHubIssue[];
  sourceWaitingOnAuthor: GitHubIssue[];
  sourceStarredRepos: StarredRepo[];
  sourceOwnedRepos: StarredRepo[];
  sourceWatchedRepos: WatchedRepo[];
  sourceNotifications: GitHubNotification[];
  notificationsClearedAt: string | null;
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

const EMPTY_PAGINATION: SectionPaginationState = {
  currentPage: 1,
  endCursor: null,
  hasMore: false,
  isLoadingMore: false,
};

const EMPTY_CACHE: GitHubDataCache = {
  version: CACHE_VERSION,
  viewer: null,
  lastRefreshed: null,
  sourceIssues: [],
  sourceReviewRequests: [],
  sourceMyPrs: [],
  sourceWaitingOnAuthor: [],
  sourceStarredRepos: [],
  sourceOwnedRepos: [],
  sourceWatchedRepos: [],
  sourceNotifications: [],
  notificationsClearedAt: null,
  milestoneGroups: [],
  projectBoardGroups: [],
  releaseGroups: [],
  discussionItems: [],
  prCiById: {},
  starsPage: { ...EMPTY_PAGINATION },
  ownedReposPage: { ...EMPTY_PAGINATION },
  watchingPage: { ...EMPTY_PAGINATION },
  notificationsPage: { ...EMPTY_PAGINATION },
};

const githubDataCache = useTauriStore<GitHubDataCache>("github-data-cache.json", {
  defaults: EMPTY_CACHE,
});

export interface GitHubCacheSnapshot {
  viewer: GitHubViewer | null;
  lastRefreshed: string | null;
  sourceIssues: GitHubIssue[];
  sourceReviewRequests: GitHubIssue[];
  sourceMyPrs: GitHubIssue[];
  sourceWaitingOnAuthor: GitHubIssue[];
  sourceStarredRepos: StarredRepo[];
  sourceOwnedRepos: StarredRepo[];
  sourceWatchedRepos: WatchedRepo[];
  sourceNotifications: GitHubNotification[];
  notificationsClearedAt: string | null;
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

export function buildGithubCacheSnapshot(state: GitHubCacheSnapshot): GitHubDataCache {
  return {
    version: CACHE_VERSION,
    viewer: state.viewer,
    lastRefreshed: state.lastRefreshed,
    sourceIssues: state.sourceIssues,
    sourceReviewRequests: state.sourceReviewRequests,
    sourceMyPrs: state.sourceMyPrs,
    sourceWaitingOnAuthor: state.sourceWaitingOnAuthor,
    sourceStarredRepos: state.sourceStarredRepos,
    sourceOwnedRepos: state.sourceOwnedRepos,
    sourceWatchedRepos: state.sourceWatchedRepos,
    sourceNotifications: state.sourceNotifications,
    notificationsClearedAt: state.notificationsClearedAt,
    milestoneGroups: state.milestoneGroups,
    projectBoardGroups: state.projectBoardGroups,
    releaseGroups: state.releaseGroups,
    discussionItems: state.discussionItems,
    prCiById: state.prCiById,
    starsPage: state.starsPage,
    ownedReposPage: state.ownedReposPage,
    watchingPage: state.watchingPage,
    notificationsPage: state.notificationsPage,
  };
}

function normalizePagination(page: SectionPaginationState | undefined): SectionPaginationState {
  return {
    currentPage: page?.currentPage ?? 1,
    endCursor: page?.endCursor ?? null,
    hasMore: page?.hasMore ?? false,
    isLoadingMore: page?.isLoadingMore ?? false,
  };
}

export async function loadGithubCache(): Promise<GitHubDataCache | null> {
  await githubDataCache.init();
  const lastRefreshed = await githubDataCache.get("lastRefreshed");
  if (!lastRefreshed) return null;

  const version = (await githubDataCache.get("version")) ?? 1;
  const discussionItems =
    version >= 2
      ? ((await githubDataCache.get("discussionItems")) ?? [])
      : [];

  return {
    version: CACHE_VERSION,
    viewer: (await githubDataCache.get("viewer")) ?? null,
    lastRefreshed,
    sourceIssues: (await githubDataCache.get("sourceIssues")) ?? [],
    sourceReviewRequests: (await githubDataCache.get("sourceReviewRequests")) ?? [],
    sourceMyPrs: (await githubDataCache.get("sourceMyPrs")) ?? [],
    sourceWaitingOnAuthor: (await githubDataCache.get("sourceWaitingOnAuthor")) ?? [],
    sourceStarredRepos: (await githubDataCache.get("sourceStarredRepos")) ?? [],
    sourceOwnedRepos: (await githubDataCache.get("sourceOwnedRepos")) ?? [],
    sourceWatchedRepos: (await githubDataCache.get("sourceWatchedRepos")) ?? [],
    sourceNotifications: (await githubDataCache.get("sourceNotifications")) ?? [],
    notificationsClearedAt:
      version >= 3 ? ((await githubDataCache.get("notificationsClearedAt")) ?? null) : null,
    milestoneGroups: (await githubDataCache.get("milestoneGroups")) ?? [],
    projectBoardGroups: (await githubDataCache.get("projectBoardGroups")) ?? [],
    releaseGroups: (await githubDataCache.get("releaseGroups")) ?? [],
    discussionItems,
    prCiById: (await githubDataCache.get("prCiById")) ?? {},
    starsPage: normalizePagination(await githubDataCache.get("starsPage")),
    ownedReposPage: normalizePagination(await githubDataCache.get("ownedReposPage")),
    watchingPage: normalizePagination(await githubDataCache.get("watchingPage")),
    notificationsPage: normalizePagination(await githubDataCache.get("notificationsPage")),
  };
}

export async function saveGithubCache(cache: GitHubDataCache): Promise<void> {
  await githubDataCache.init();
  await githubDataCache.set("version", cache.version);
  await githubDataCache.set("viewer", cache.viewer);
  await githubDataCache.set("lastRefreshed", cache.lastRefreshed);
  await githubDataCache.set("sourceIssues", cache.sourceIssues);
  await githubDataCache.set("sourceReviewRequests", cache.sourceReviewRequests);
  await githubDataCache.set("sourceMyPrs", cache.sourceMyPrs);
  await githubDataCache.set("sourceWaitingOnAuthor", cache.sourceWaitingOnAuthor);
  await githubDataCache.set("sourceStarredRepos", cache.sourceStarredRepos);
  await githubDataCache.set("sourceOwnedRepos", cache.sourceOwnedRepos);
  await githubDataCache.set("sourceWatchedRepos", cache.sourceWatchedRepos);
  await githubDataCache.set("sourceNotifications", cache.sourceNotifications);
  await githubDataCache.set("notificationsClearedAt", cache.notificationsClearedAt);
  await githubDataCache.set("milestoneGroups", cache.milestoneGroups);
  await githubDataCache.set("projectBoardGroups", cache.projectBoardGroups);
  await githubDataCache.set("releaseGroups", cache.releaseGroups);
  await githubDataCache.set("discussionItems", cache.discussionItems);
  await githubDataCache.set("prCiById", cache.prCiById);
  await githubDataCache.set("starsPage", cache.starsPage);
  await githubDataCache.set("ownedReposPage", cache.ownedReposPage);
  await githubDataCache.set("watchingPage", cache.watchingPage);
  await githubDataCache.set("notificationsPage", cache.notificationsPage);
}

export async function clearGithubCache(): Promise<void> {
  await githubDataCache.init();
  await saveGithubCache({ ...EMPTY_CACHE });
}
