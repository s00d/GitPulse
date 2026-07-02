export type RefreshInterval = "30s" | "60s" | "5m" | "manual";

export interface MenuVisibilitySettings {
  showIssues: boolean;
  showPullRequests: boolean;
  showStars: boolean;
  showWatching: boolean;
  showNotifications: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  notifyAdded: boolean;
  notifyUpdated: boolean;
  issues: boolean;
  pullRequests: boolean;
  notifications: boolean;
}

export type RepoVisibilitySettings = Record<string, boolean>;

export interface AppSettings extends Record<string, unknown> {
  refreshInterval: RefreshInterval;
  menuVisibility: MenuVisibilitySettings;
  notifications: NotificationSettings;
  repoVisibility: RepoVisibilitySettings;
}

export const DEFAULT_MENU_VISIBILITY: MenuVisibilitySettings = {
  showIssues: true,
  showPullRequests: true,
  showStars: true,
  showWatching: true,
  showNotifications: true,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyAdded: true,
  notifyUpdated: true,
  issues: true,
  pullRequests: true,
  notifications: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  refreshInterval: "60s",
  menuVisibility: DEFAULT_MENU_VISIBILITY,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  repoVisibility: {},
};
