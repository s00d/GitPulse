import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import {
  applyClearMenuSection,
  clearDisabledMenuSections,
  dashboardTabMenuFlag,
  isDashboardTabVisible,
  MENU_SECTION_KEYS,
  shouldFetchMenuSection,
  type MenuSectionClearTarget,
} from "@/github/sectionFetch";
import { DEFAULT_MENU_VISIBILITY } from "@/settings/appSettings";
import { useApiDebugStore } from "@/stores/apiDebugStore";

function emptyClearTarget(): MenuSectionClearTarget {
  return {
    sourceIssues: [{ id: 1 } as never],
    sourceReviewRequests: [{ id: 2 } as never],
    sourceMyPrs: [{ id: 3 } as never],
    sourceWaitingOnAuthor: [{ id: 4 } as never],
    sourceStarredRepos: [{ id: "s1" } as never],
    sourceOwnedRepos: [{ id: "o1" } as never],
    sourceWatchedRepos: [{ id: "w1" } as never],
    sourceNotifications: [{ id: "n1" } as never],
    issues: [{ id: 1 } as never],
    reviewRequests: [{ id: 2 } as never],
    myPrs: [{ id: 3 } as never],
    waitingOnAuthor: [{ id: 4 } as never],
    starredRepos: [{ id: "s1" } as never],
    ownedRepos: [{ id: "o1" } as never],
    watchedRepos: [{ id: "w1" } as never],
    notifications: [{ id: "n1" } as never],
    milestoneGroups: [{ repo: "a/b", milestones: [], totalOpenIssues: 1 } as never],
    projectBoardGroups: [{ projectKey: "p1", columns: [], totalOpenCount: 1 } as never],
    releaseGroups: [{ repo: "a/b", releases: [], totalCount: 0 } as never],
    discussionItems: [{ id: "d1", repo: "a/b", title: "t", unread: true } as never],
    prCiById: { 1: { state: "success" } as never },
    starsPage: { currentPage: 2, hasMore: true, isLoadingMore: false },
    ownedReposPage: { currentPage: 2, hasMore: true, isLoadingMore: false },
    watchingPage: { currentPage: 2, hasMore: true, isLoadingMore: false },
    notificationsPage: { currentPage: 2, hasMore: true, isLoadingMore: false },
  };
}

describe("sectionFetch", () => {
  it("exposes all menu section keys", () => {
    expect(MENU_SECTION_KEYS).toEqual([
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
    ]);
  });

  it("maps dashboard tabs to menu flags", () => {
    expect(dashboardTabMenuFlag("overview")).toBeNull();
    expect(dashboardTabMenuFlag("feed")).toBe("showFeed");
    expect(dashboardTabMenuFlag("issues")).toBe("showIssues");
    expect(dashboardTabMenuFlag("milestones")).toBe("showMilestones");
    expect(dashboardTabMenuFlag("discussionsReleases")).toBe("showDiscussionsReleases");
    expect(dashboardTabMenuFlag("apiDebug")).toBe("showApiDebug");
  });

  it("shouldFetchMenuSection reflects visibility flag", () => {
    const visibility = { ...DEFAULT_MENU_VISIBILITY, showMilestones: false };
    expect(shouldFetchMenuSection(visibility, "showIssues")).toBe(true);
    expect(shouldFetchMenuSection(visibility, "showMilestones")).toBe(false);
  });

  it("isDashboardTabVisible keeps overview always visible", () => {
    const visibility = {
      ...DEFAULT_MENU_VISIBILITY,
      showFeed: false,
      showIssues: false,
      showMilestones: false,
    };
    expect(isDashboardTabVisible("overview", visibility)).toBe(true);
    expect(isDashboardTabVisible("feed", visibility)).toBe(false);
    expect(isDashboardTabVisible("issues", visibility)).toBe(false);
    expect(isDashboardTabVisible("milestones", visibility)).toBe(false);
    expect(isDashboardTabVisible("apiDebug", visibility)).toBe(false);
  });

  it("isDashboardTabVisible shows api debug when enabled", () => {
    const visibility = { ...DEFAULT_MENU_VISIBILITY, showApiDebug: true };
    expect(isDashboardTabVisible("apiDebug", visibility)).toBe(true);
  });

  it("applyClearMenuSection clears issues slice", () => {
    const target = emptyClearTarget();
    applyClearMenuSection(target, "showIssues");
    expect(target.sourceIssues).toEqual([]);
    expect(target.issues).toEqual([]);
    expect(target.reviewRequests.length).toBeGreaterThan(0);
  });

  it("applyClearMenuSection clears pull requests and CI", () => {
    const target = emptyClearTarget();
    applyClearMenuSection(target, "showPullRequests");
    expect(target.sourceReviewRequests).toEqual([]);
    expect(target.prCiById).toEqual({});
  });

  it("applyClearMenuSection clears stars pagination", () => {
    const target = emptyClearTarget();
    applyClearMenuSection(target, "showStars");
    expect(target.starredRepos).toEqual([]);
    expect(target.ownedRepos).toEqual([]);
    expect(target.starsPage).toEqual({
      currentPage: 1,
      endCursor: null,
      hasMore: false,
      isLoadingMore: false,
    });
  });

  it("applyClearMenuSection clears discussions and releases", () => {
    const target = emptyClearTarget();
    applyClearMenuSection(target, "showDiscussionsReleases");
    expect(target.releaseGroups).toEqual([]);
    expect(target.discussionItems).toEqual([]);
  });

  it("applyClearMenuSection clears api debug log", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const debugStore = useApiDebugStore();
    debugStore.record({
      id: "dbg:1",
      startedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 1,
      method: "GET",
      url: "https://api.github.com/user",
      requestHeaders: {},
    });

    applyClearMenuSection(emptyClearTarget(), "showApiDebug");
    expect(debugStore.entries).toEqual([]);
  });

  it("clearDisabledMenuSections clears only disabled sections", () => {
    const target = emptyClearTarget();
    const visibility = {
      ...DEFAULT_MENU_VISIBILITY,
      showMilestones: false,
      showProjects: false,
    };
    clearDisabledMenuSections(target, visibility);
    expect(target.issues.length).toBeGreaterThan(0);
    expect(target.milestoneGroups).toEqual([]);
    expect(target.projectBoardGroups).toEqual([]);
  });
});
