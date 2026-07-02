import { defineStore } from "pinia";
import { useTauriStore } from "@/composables/useTauriStore";
import { isRepoEnabled } from "@/github/repoVisibility";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_MENU_VISIBILITY,
  DEFAULT_NOTIFICATION_SETTINGS,
  type AppSettings,
  type MenuVisibilitySettings,
  type NotificationSettings,
  type RefreshInterval,
  type RepoVisibilitySettings,
} from "@/settings/appSettings";

interface SettingsState {
  menuVisibility: MenuVisibilitySettings;
  notificationSettings: NotificationSettings;
  repoVisibility: RepoVisibilitySettings;
  refreshInterval: RefreshInterval;
  initialized: boolean;
}

const settingsStorage = useTauriStore<AppSettings>("app-settings.json", {
  defaults: DEFAULT_APP_SETTINGS,
});

export const useSettingsStore = defineStore("settings", {
  state: (): SettingsState => ({
    menuVisibility: { ...DEFAULT_MENU_VISIBILITY },
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS },
    repoVisibility: {},
    refreshInterval: DEFAULT_APP_SETTINGS.refreshInterval,
    initialized: false,
  }),

  actions: {
    async init() {
      if (this.initialized) return;

      await settingsStorage.init();

      const savedMenu = await settingsStorage.get("menuVisibility");
      if (savedMenu) {
        this.menuVisibility = { ...DEFAULT_MENU_VISIBILITY, ...savedMenu };
      }

      const savedNotifications = await settingsStorage.get("notifications");
      if (savedNotifications) {
        this.notificationSettings = {
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...savedNotifications,
        };
      }

      const savedRepoVisibility = await settingsStorage.get("repoVisibility");
      if (savedRepoVisibility) {
        this.repoVisibility = { ...savedRepoVisibility };
      }

      const savedRefreshInterval = await settingsStorage.get("refreshInterval");
      if (savedRefreshInterval) {
        this.refreshInterval = savedRefreshInterval;
      }

      this.initialized = true;
    },

    async persist() {
      await settingsStorage.init();
      await settingsStorage.set("menuVisibility", this.menuVisibility);
      await settingsStorage.set("notifications", this.notificationSettings);
      await settingsStorage.set("repoVisibility", this.repoVisibility);
      await settingsStorage.set("refreshInterval", this.refreshInterval);
    },

    isRepoEnabled(repo: string): boolean {
      return isRepoEnabled(repo, this.repoVisibility);
    },

    async setMenuFlag(key: keyof MenuVisibilitySettings, value: boolean) {
      this.menuVisibility = { ...this.menuVisibility, [key]: value };
      await this.persist();
    },

    async setNotificationFlag(key: keyof NotificationSettings, value: boolean) {
      this.notificationSettings = { ...this.notificationSettings, [key]: value };
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
  },
});
