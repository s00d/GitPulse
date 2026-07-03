import { defineStore } from "pinia";
import { useTauriStore } from "@/composables/useTauriStore";
import { createGitHubClient, fetchViewerSocialGraph } from "@/api/github";
import {
  FEED_LIMITS,
  finalizeFeed,
  fromCoreIssues,
  fromCoreNotifications,
  fromCoreRepos,
  fromUserEvents,
  sortFeedItemsDesc,
} from "@/github/feed";
import type { FeedItem } from "@/github/types";
import { useGitHubAuth } from "@/composables/useGitHubAuth";
import { useGitHubStore } from "@/stores/githubStore";
import { useSettingsStore } from "@/stores/settingsStore";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type FeedStatus = "idle" | "syncing" | "ready" | "error";
export type FeedStep =
  | "idle"
  | "core"
  | "following-list"
  | "following-events"
  | "followers-list"
  | "followers-events"
  | "finalize";

interface FeedProgress {
  current: number;
  total: number;
  label: string;
}

interface FeedCacheSchema extends Record<string, unknown> {
  items: FeedItem[];
  lastSyncedAt: string | null;
  nextAutoSyncAt: string | null;
}

interface FeedState {
  items: FeedItem[];
  status: FeedStatus;
  step: FeedStep;
  progress: FeedProgress;
  lastSyncedAt: string | null;
  nextAutoSyncAt: string | null;
  error: string | null;
  initialized: boolean;
  cancelRequested: boolean;
}

const feedCache = useTauriStore<FeedCacheSchema>("feed-cache.json", {
  defaults: {
    items: [],
    lastSyncedAt: null,
    nextAutoSyncAt: null,
  },
});

export const useFeedStore = defineStore("feed", {
  state: (): FeedState => ({
    items: [],
    status: "idle",
    step: "idle",
    progress: { current: 0, total: 0, label: "" },
    lastSyncedAt: null,
    nextAutoSyncAt: null,
    error: null,
    initialized: false,
    cancelRequested: false,
  }),

  getters: {
    isSyncing(state): boolean {
      return state.status === "syncing";
    },
  },

  actions: {
    async loadFromCache() {
      await feedCache.init();
      this.items = (await feedCache.get("items")) ?? [];
      this.lastSyncedAt = (await feedCache.get("lastSyncedAt")) ?? null;
      this.nextAutoSyncAt = (await feedCache.get("nextAutoSyncAt")) ?? null;
      if (this.items.length) {
        this.status = "ready";
      }
    },

    async saveToCache() {
      await feedCache.init();
      await feedCache.set("items", this.items);
      await feedCache.set("lastSyncedAt", this.lastSyncedAt);
      await feedCache.set("nextAutoSyncAt", this.nextAutoSyncAt);
    },

    async init() {
      if (this.initialized) return;
      await this.loadFromCache();
      this.initialized = true;
    },

    cancelSync() {
      this.cancelRequested = true;
    },

    ensureNotCanceled() {
      if (this.cancelRequested) {
        throw new Error("Feed sync canceled");
      }
    },

    async maybeAutoSync() {
      await this.init();
      if (!this.nextAutoSyncAt) return this.syncNow();
      if (new Date(this.nextAutoSyncAt).getTime() <= Date.now()) {
        return this.syncNow();
      }
    },

    setStep(step: FeedStep, label: string, current = 0, total = 0) {
      this.step = step;
      this.progress = { current, total, label };
    },

    async clear() {
      this.cancelSync();
      this.items = [];
      this.lastSyncedAt = null;
      this.nextAutoSyncAt = null;
      this.status = "idle";
      this.error = null;
      this.step = "idle";
      this.progress = { current: 0, total: 0, label: "" };
      await feedCache.init();
      await feedCache.set("items", []);
      await feedCache.set("lastSyncedAt", null);
      await feedCache.set("nextAutoSyncAt", null);
    },

    async syncNow() {
      if (this.status === "syncing") return;

      if (!useSettingsStore().menuVisibility.showFeed) return;

      this.status = "syncing";
      this.error = null;
      this.cancelRequested = false;

      try {
        const githubStore = useGitHubStore();
        const hasToken = await githubStore.initAuth();
        if (!hasToken) {
          throw new Error("No GitHub token");
        }

        this.setStep("core", "feed.stepCore", 0, 1);
        if (!githubStore.lastRefreshed) {
          await githubStore.refresh({ source: "manual" });
        }
        this.ensureNotCanceled();

        const coreItems = [
          ...fromCoreIssues([
            ...githubStore.issues,
            ...githubStore.reviewRequests,
            ...githubStore.myPrs,
            ...githubStore.waitingOnAuthor,
          ]),
          ...fromCoreRepos(githubStore.starredRepos, "Star"),
          ...fromCoreRepos(githubStore.watchedRepos, "Watch"),
          ...fromCoreNotifications(githubStore.notifications),
        ];

        const auth = useGitHubAuth();
        const token = auth.getTokenSync() ?? (await auth.loadToken());
        if (!token) throw new Error("No GitHub token");
        const client = createGitHubClient(() => auth.getTokenSync() ?? token);

        this.setStep("following-list", "feed.stepFollowingList", 0, FEED_LIMITS.followingUsers);
        const socialGraph = await fetchViewerSocialGraph(client, {
          followingFirst: FEED_LIMITS.followingUsers,
          followersFirst: FEED_LIMITS.followersUsers,
        });
        this.ensureNotCanceled();

        const following = socialGraph.following.slice(0, FEED_LIMITS.followingUsers);

        const followingItems: FeedItem[] = [];
        this.setStep(
          "following-events",
          "feed.stepFollowingEvents",
          0,
          following.length,
        );
        for (let idx = 0; idx < following.length; idx += 1) {
          this.ensureNotCanceled();
          const user = following[idx]!;
          this.progress.current = idx + 1;
          const events = await client.userEvents(user.login, {
            perPage: FEED_LIMITS.eventsPerUser,
            page: 1,
          });
          followingItems.push(...fromUserEvents(events, "following"));
        }

        this.setStep("followers-list", "feed.stepFollowersList", 0, FEED_LIMITS.followersUsers);
        const followers = socialGraph.followers.slice(0, FEED_LIMITS.followersUsers);
        this.ensureNotCanceled();

        const followerItems: FeedItem[] = [];
        this.setStep(
          "followers-events",
          "feed.stepFollowersEvents",
          0,
          followers.length,
        );
        for (let idx = 0; idx < followers.length; idx += 1) {
          this.ensureNotCanceled();
          const user = followers[idx]!;
          this.progress.current = idx + 1;
          const events = await client.userEvents(user.login, {
            perPage: FEED_LIMITS.eventsPerUser,
            page: 1,
          });
          followerItems.push(...fromUserEvents(events, "followers"));
        }

        this.setStep("finalize", "feed.stepFinalize", 1, 1);
        this.items = sortFeedItemsDesc(
          finalizeFeed([...coreItems, ...followingItems, ...followerItems]),
        );

        const now = new Date();
        this.lastSyncedAt = now.toISOString();
        this.nextAutoSyncAt = new Date(now.getTime() + ONE_DAY_MS).toISOString();
        await this.saveToCache();

        this.status = "ready";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Feed sync canceled") {
          this.status = this.items.length ? "ready" : "idle";
        } else {
          this.status = "error";
          this.error = message;
        }
      } finally {
        this.cancelRequested = false;
        if (this.step !== "idle") {
          this.step = "idle";
        }
      }
    },
  },
});
