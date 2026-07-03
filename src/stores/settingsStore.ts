import { defineStore } from "pinia";
import { useTauriStore } from "@/composables/useTauriStore";
import { isRepoEnabled } from "@/github/repoVisibility";
import type { TrackedProject } from "@/github/types";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_ITEM_ACTION_SETTINGS,
  DEFAULT_MENU_VISIBILITY,
  DEFAULT_SAVED_VIEW_SETTINGS,
  DEFAULT_TRAY_BADGE_SETTINGS,
  createNotificationSettings,
  isNotificationSettings,
  resolveNotificationSettings,
  type AppSettings,
  type ItemActionSettings,
  type MenuVisibilitySettings,
  type NotificationDayId,
  type NotificationSettings,
  type PrimaryClickBehavior,
  type RefreshInterval,
  type RepoVisibilitySettings,
  type SavedViewId,
  type SavedViewSettings,
  type TrayBadgeSettings,
} from "@/settings/appSettings";
import { MAX_TRACKED_PROJECTS, createTrackedProject } from "@/github/projects";
import { useApiDebugStore } from "@/stores/apiDebugStore";
import { useFeedStore } from "@/stores/feedStore";

let settingsInitPromise: Promise<void> | null = null;

type NotificationBooleanFlag = {
  [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
}[keyof NotificationSettings];

interface SettingsState {
  menuVisibility: MenuVisibilitySettings;
  trayBadge: TrayBadgeSettings;
  savedViews: SavedViewSettings;
  itemActions: ItemActionSettings;
  notificationSettings: NotificationSettings;
  repoVisibility: RepoVisibilitySettings;
  trackedProjects: TrackedProject[];
  refreshInterval: RefreshInterval;
  initialized: boolean;
}

const settingsStorage = useTauriStore<AppSettings>("app-settings.json", {
  defaults: DEFAULT_APP_SETTINGS,
});

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    menuVisibility: { ...DEFAULT_MENU_VISIBILITY },
    trayBadge: { ...DEFAULT_TRAY_BADGE_SETTINGS },
    savedViews: { ...DEFAULT_SAVED_VIEW_SETTINGS },
    itemActions: { ...DEFAULT_ITEM_ACTION_SETTINGS },
    notificationSettings: createNotificationSettings(),
    repoVisibility: {},
    trackedProjects: [],
    refreshInterval: DEFAULT_APP_SETTINGS.refreshInterval,
    initialized: false,
  }),

  getters: {
    notifications(): NotificationSettings {
      return resolveNotificationSettings(this.notificationSettings);
    },
  },

  actions: {
    async init() {
      if (settingsInitPromise) {
        await settingsInitPromise;
        return;
      }

      settingsInitPromise = this.loadSettings();
      try {
        await settingsInitPromise;
      } finally {
        settingsInitPromise = null;
      }
    },

    async loadSettings() {
      if (this.initialized) {
        this.notificationSettings = resolveNotificationSettings(this.notificationSettings);
        return;
      }

      await settingsStorage.init();

      const savedMenu = await settingsStorage.get("menuVisibility");
      if (savedMenu) {
        this.menuVisibility = { ...DEFAULT_MENU_VISIBILITY, ...savedMenu };
      }

      const savedTrayBadge = await settingsStorage.get("trayBadge");
      if (savedTrayBadge) {
        this.trayBadge = { ...DEFAULT_TRAY_BADGE_SETTINGS, ...savedTrayBadge };
      }

      const savedViews = await settingsStorage.get("savedViews");
      if (savedViews) {
        this.savedViews = {
          ...DEFAULT_SAVED_VIEW_SETTINGS,
          ...savedViews,
          workRepos: savedViews.workRepos ?? DEFAULT_SAVED_VIEW_SETTINGS.workRepos,
          pinnedRepos: savedViews.pinnedRepos ?? DEFAULT_SAVED_VIEW_SETTINGS.pinnedRepos,
          urgentPriorityLabels:
            savedViews.urgentPriorityLabels ?? DEFAULT_SAVED_VIEW_SETTINGS.urgentPriorityLabels,
        };
      }

      const savedItemActions = await settingsStorage.get("itemActions");
      if (savedItemActions) {
        this.itemActions = {
          ...DEFAULT_ITEM_ACTION_SETTINGS,
          ...savedItemActions,
          snoozePresetHours:
            savedItemActions.snoozePresetHours ?? DEFAULT_ITEM_ACTION_SETTINGS.snoozePresetHours,
        };
      }

      const savedNotifications = await settingsStorage.get("notifications");
      this.notificationSettings = resolveNotificationSettings(savedNotifications);
      if (!isNotificationSettings(savedNotifications)) {
        await settingsStorage.set("notifications", this.notificationSettings);
      }

      const savedRepoVisibility = await settingsStorage.get("repoVisibility");
      if (savedRepoVisibility) {
        this.repoVisibility = { ...savedRepoVisibility };
      }

      const savedRefreshInterval = await settingsStorage.get("refreshInterval");
      if (savedRefreshInterval) {
        this.refreshInterval = savedRefreshInterval;
      }

      const savedTrackedProjects = await settingsStorage.get("trackedProjects");
      if (savedTrackedProjects) {
        this.trackedProjects = savedTrackedProjects;
      }

      this.initialized = true;
    },

    async persist() {
      await settingsStorage.init();
      await settingsStorage.set("menuVisibility", this.menuVisibility);
      await settingsStorage.set("trayBadge", this.trayBadge);
      await settingsStorage.set("savedViews", this.savedViews);
      await settingsStorage.set("itemActions", this.itemActions);
      await settingsStorage.set(
        "notifications",
        resolveNotificationSettings(this.notificationSettings),
      );
      await settingsStorage.set("repoVisibility", this.repoVisibility);
      await settingsStorage.set("refreshInterval", this.refreshInterval);
      await settingsStorage.set("trackedProjects", this.trackedProjects);
    },

    isRepoEnabled(repo: string): boolean {
      return isRepoEnabled(repo, this.repoVisibility);
    },

    async setMenuFlag(key: keyof MenuVisibilitySettings, value: boolean) {
      this.menuVisibility = { ...this.menuVisibility, [key]: value };
      if (key === "showApiDebug" && !value) {
        useApiDebugStore().clear();
      }
      if (key === "showFeed" && !value) {
        void useFeedStore().clear();
      }
      await this.persist();
    },

    async setTrayBadgeFlag(key: keyof TrayBadgeSettings, value: boolean) {
      this.trayBadge = { ...this.trayBadge, [key]: value };
      await this.persist();
    },

    async setItemActionFlag(
      key: "showRowActionButton" | "trayItemSubmenus" | "enableQuickApprove",
      value: boolean,
    ) {
      this.itemActions = { ...this.itemActions, [key]: value };
      await this.persist();
    },

    async setPrimaryClick(behavior: PrimaryClickBehavior) {
      this.itemActions = { ...this.itemActions, primaryClick: behavior };
      await this.persist();
    },

    async setDefaultSnoozeHours(hours: number) {
      const defaultSnoozeHours = Number.isFinite(hours) ? Math.max(1, Math.trunc(hours)) : 4;
      this.itemActions = { ...this.itemActions, defaultSnoozeHours };
      await this.persist();
    },

    async setActiveView(view: SavedViewId) {
      this.savedViews = { ...this.savedViews, activeView: view };
      await this.persist();
    },

    async toggleWorkRepo(repo: string) {
      const workRepos = [...this.savedViews.workRepos];
      const index = workRepos.indexOf(repo);
      if (index >= 0) {
        workRepos.splice(index, 1);
      } else {
        workRepos.unshift(repo);
      }
      this.savedViews = { ...this.savedViews, workRepos };
      await this.persist();
    },

    async pinRepo(repo: string) {
      if (this.savedViews.pinnedRepos.includes(repo)) return;
      this.savedViews = {
        ...this.savedViews,
        pinnedRepos: [repo, ...this.savedViews.pinnedRepos],
      };
      await this.persist();
    },

    async unpinRepo(repo: string) {
      const pinnedRepos = this.savedViews.pinnedRepos.filter((entry) => entry !== repo);
      if (pinnedRepos.length === this.savedViews.pinnedRepos.length) return;
      this.savedViews = { ...this.savedViews, pinnedRepos };
      await this.persist();
    },

    async reorderPinnedRepos(repos: string[]) {
      this.savedViews = { ...this.savedViews, pinnedRepos: repos };
      await this.persist();
    },

    async setUrgentPrAgeDays(days: number) {
      const urgentPrAgeDays = Number.isFinite(days) ? Math.max(1, Math.trunc(days)) : 3;
      this.savedViews = { ...this.savedViews, urgentPrAgeDays };
      await this.persist();
    },

    async setUrgentPriorityLabels(labels: string[]) {
      const urgentPriorityLabels = labels.map((label) => label.trim()).filter(Boolean);
      this.savedViews = {
        ...this.savedViews,
        urgentPriorityLabels: urgentPriorityLabels.length
          ? urgentPriorityLabels
          : DEFAULT_SAVED_VIEW_SETTINGS.urgentPriorityLabels,
      };
      await this.persist();
    },

    commitNotificationSettings(patch: Partial<NotificationSettings>) {
      const base = resolveNotificationSettings(this.notificationSettings);
      const next: NotificationSettings = {
        ...base,
        ...patch,
        notifyDays: patch.notifyDays ? { ...base.notifyDays, ...patch.notifyDays } : base.notifyDays,
      };
      this.notificationSettings = resolveNotificationSettings(next);
    },

    async setNotificationFlag(key: NotificationBooleanFlag, value: boolean) {
      this.commitNotificationSettings({ [key]: value });
      await this.persist();
    },

    async setNotifyDay(day: NotificationDayId, enabled: boolean) {
      const base = resolveNotificationSettings(this.notificationSettings);
      this.commitNotificationSettings({
        notifyDays: { ...base.notifyDays, [day]: enabled },
      });
      await this.persist();
    },

    async setNotifyAllDay(value: boolean) {
      this.commitNotificationSettings({ notifyAllDay: value });
      await this.persist();
    },

    async setNotifyTimeStart(value: string) {
      this.commitNotificationSettings({ notifyTimeStart: value });
      await this.persist();
    },

    async setNotifyTimeEnd(value: string) {
      this.commitNotificationSettings({ notifyTimeEnd: value });
      await this.persist();
    },

    async setRefreshInterval(interval: RefreshInterval) {
      this.refreshInterval = interval;
      await this.persist();
    },

    async setRepoEnabled(repo: string, enabled: boolean) {
      const next = { ...this.repoVisibility };
      if (enabled) {
        delete next[repo];
      } else {
        next[repo] = false;
      }
      this.repoVisibility = next;
      await this.persist();
    },

    async setRepoVisibilityBulk(repos: string[], enabled: boolean) {
      const next = { ...this.repoVisibility };
      for (const repo of repos) {
        if (enabled) {
          delete next[repo];
        } else {
          next[repo] = false;
        }
      }
      this.repoVisibility = next;
      await this.persist();
    },

    async setTrackedProjects(projects: TrackedProject[]) {
      this.trackedProjects = projects.slice(0, MAX_TRACKED_PROJECTS);
      await this.persist();
    },

    async addTrackedProject(input: {
      ownerType: TrackedProject["ownerType"];
      owner: string;
      number: number;
    }) {
      if (this.trackedProjects.length >= MAX_TRACKED_PROJECTS) return false;
      const owner = input.owner.trim();
      if (!owner || !Number.isFinite(input.number) || input.number < 1) return false;

      const project = createTrackedProject({
        ownerType: input.ownerType,
        owner,
        number: Math.trunc(input.number),
      });

      if (this.trackedProjects.some((entry) => entry.id === project.id)) return false;

      this.trackedProjects = [...this.trackedProjects, project];
      await this.persist();
      return true;
    },

    async removeTrackedProject(id: string) {
      const next = this.trackedProjects.filter((project) => project.id !== id);
      if (next.length === this.trackedProjects.length) return;
      this.trackedProjects = next;
      await this.persist();
    },
  },
});
