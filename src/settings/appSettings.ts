import type { TrackedProject } from "@/github/types";

export type RefreshInterval = "30s" | "60s" | "5m" | "1h" | "1d" | "manual";

export interface MenuVisibilitySettings {
  showFeed: boolean;
  showIssues: boolean;
  showMilestones: boolean;
  showProjects: boolean;
  showPullRequests: boolean;
  showStars: boolean;
  showWatching: boolean;
  showNotifications: boolean;
  showDiscussionsReleases: boolean;
  showApiDebug: boolean;
}

export type NotificationDayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const NOTIFICATION_DAY_IDS: NotificationDayId[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export const DEFAULT_NOTIFY_DAYS: Record<NotificationDayId, boolean> = {
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: true,
  sun: true,
};

export interface NotificationSettings {
  enabled: boolean;
  notifyAdded: boolean;
  notifyUpdated: boolean;
  issues: boolean;
  pullRequests: boolean;
  notifications: boolean;
  releases: boolean;
  discussions: boolean;
  commits: boolean;
  securityAlerts: boolean;
  checks: boolean;
  notifyDays: Record<NotificationDayId, boolean>;
  notifyAllDay: boolean;
  notifyTimeStart: string;
  notifyTimeEnd: string;
}

export interface TrayBadgeSettings {
  assignedIssues: boolean;
  reviewRequests: boolean;
  myPullRequests: boolean;
  unreadNotifications: boolean;
}

export type RepoVisibilitySettings = Record<string, boolean>;

export type SavedViewId = "all" | "myOrgs" | "work" | "urgent";

export interface SavedViewSettings {
  activeView: SavedViewId;
  workRepos: string[];
  pinnedRepos: string[];
  urgentPrAgeDays: number;
  urgentPriorityLabels: string[];
}

export type PrimaryClickBehavior = "openBrowser" | "actionMenu";

export interface ItemActionSettings {
  primaryClick: PrimaryClickBehavior;
  showRowActionButton: boolean;
  trayItemSubmenus: boolean;
  defaultSnoozeHours: number;
  snoozePresetHours: number[];
  enableQuickApprove: boolean;
}

export interface AppSettings extends Record<string, unknown> {
  refreshInterval: RefreshInterval;
  menuVisibility: MenuVisibilitySettings;
  trayBadge: TrayBadgeSettings;
  savedViews: SavedViewSettings;
  itemActions: ItemActionSettings;
  notifications: NotificationSettings;
  repoVisibility: RepoVisibilitySettings;
  trackedProjects: TrackedProject[];
}

export const DEFAULT_MENU_VISIBILITY: MenuVisibilitySettings = {
  showFeed: true,
  showIssues: true,
  showMilestones: false,
  showProjects: false,
  showPullRequests: true,
  showStars: true,
  showWatching: true,
  showNotifications: true,
  showDiscussionsReleases: false,
  showApiDebug: false,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  notifyAdded: true,
  notifyUpdated: true,
  issues: true,
  pullRequests: true,
  notifications: true,
  releases: true,
  discussions: true,
  commits: true,
  securityAlerts: true,
  checks: true,
  notifyDays: { ...DEFAULT_NOTIFY_DAYS },
  notifyAllDay: true,
  notifyTimeStart: "09:00",
  notifyTimeEnd: "22:00",
};

export function createNotificationSettings(): NotificationSettings {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    notifyDays: { ...DEFAULT_NOTIFY_DAYS },
  };
}

export function isNotificationSettings(value: unknown): value is NotificationSettings {
  if (!value || typeof value !== "object") return false;

  const settings = value as NotificationSettings;
  const booleans: Array<keyof NotificationSettings> = [
    "enabled",
    "notifyAdded",
    "notifyUpdated",
    "issues",
    "pullRequests",
    "notifications",
    "releases",
    "discussions",
    "commits",
    "securityAlerts",
    "checks",
    "notifyAllDay",
  ];

  for (const key of booleans) {
    if (typeof settings[key] !== "boolean") return false;
  }

  if (!settings.notifyDays || typeof settings.notifyDays !== "object") return false;
  for (const day of NOTIFICATION_DAY_IDS) {
    if (typeof settings.notifyDays[day] !== "boolean") return false;
  }

  if (typeof settings.notifyTimeStart !== "string" || typeof settings.notifyTimeEnd !== "string") {
    return false;
  }

  return true;
}

export function cloneNotificationSettings(settings: NotificationSettings): NotificationSettings {
  return {
    enabled: settings.enabled,
    notifyAdded: settings.notifyAdded,
    notifyUpdated: settings.notifyUpdated,
    issues: settings.issues,
    pullRequests: settings.pullRequests,
    notifications: settings.notifications,
    releases: settings.releases,
    discussions: settings.discussions,
    commits: settings.commits,
    securityAlerts: settings.securityAlerts,
    checks: settings.checks,
    notifyDays: { ...settings.notifyDays },
    notifyAllDay: settings.notifyAllDay,
    notifyTimeStart: settings.notifyTimeStart,
    notifyTimeEnd: settings.notifyTimeEnd,
  };
}

type NotificationBooleanKey = {
  [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
}[keyof NotificationSettings];

const NOTIFICATION_BOOLEAN_KEYS: NotificationBooleanKey[] = [
  "enabled",
  "notifyAdded",
  "notifyUpdated",
  "issues",
  "pullRequests",
  "notifications",
  "releases",
  "discussions",
  "commits",
  "securityAlerts",
  "checks",
  "notifyAllDay",
];

export function resolveNotificationSettings(value?: unknown): NotificationSettings {
  const defaults = createNotificationSettings();
  if (!value || typeof value !== "object") return defaults;

  const raw = value as Record<string, unknown>;
  const result = { ...defaults };

  for (const key of NOTIFICATION_BOOLEAN_KEYS) {
    if (typeof raw[key] === "boolean") {
      result[key] = raw[key];
    }
  }

  if (raw.notifyDays && typeof raw.notifyDays === "object") {
    const days = raw.notifyDays as Record<string, unknown>;
    for (const day of NOTIFICATION_DAY_IDS) {
      if (typeof days[day] === "boolean") {
        result.notifyDays[day] = days[day];
      }
    }
  }

  if (typeof raw.notifyTimeStart === "string") result.notifyTimeStart = raw.notifyTimeStart;
  if (typeof raw.notifyTimeEnd === "string") result.notifyTimeEnd = raw.notifyTimeEnd;

  return result;
}

export const DEFAULT_TRAY_BADGE_SETTINGS: TrayBadgeSettings = {
  assignedIssues: true,
  reviewRequests: true,
  myPullRequests: false,
  unreadNotifications: true,
};

export const DEFAULT_SAVED_VIEW_SETTINGS: SavedViewSettings = {
  activeView: "all",
  workRepos: [],
  pinnedRepos: [],
  urgentPrAgeDays: 3,
  urgentPriorityLabels: ["priority"],
};

export const DEFAULT_ITEM_ACTION_SETTINGS: ItemActionSettings = {
  primaryClick: "openBrowser",
  showRowActionButton: true,
  trayItemSubmenus: false,
  defaultSnoozeHours: 4,
  snoozePresetHours: [1, 4, 8, 24],
  enableQuickApprove: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  refreshInterval: "60s",
  menuVisibility: DEFAULT_MENU_VISIBILITY,
  trayBadge: DEFAULT_TRAY_BADGE_SETTINGS,
  savedViews: DEFAULT_SAVED_VIEW_SETTINGS,
  itemActions: DEFAULT_ITEM_ACTION_SETTINGS,
  notifications: createNotificationSettings(),
  repoVisibility: {},
  trackedProjects: [],
};
