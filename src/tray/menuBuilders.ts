import { invoke } from "@tauri-apps/api/core";
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from "@tauri-apps/api/menu";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { useI18n } from "vue-i18n";
import { formatActivityTrayLabel } from "@/github/itemDiff";
import {
  formatItemLabel,
  labelWithCountAndDelta,
  starredRepoLabel,
  submenuWithCountAndDelta,
  truncate,
} from "@/github/menuFormat";
import {
  issueRepoKey,
  NOTIFICATIONS_TOTAL_KEY,
  prRepoKey,
  PRS_TOTAL_KEY,
  WATCHING_TOTAL_KEY,
} from "@/github/countDiff";
import { notificationsUrl, starredUrl, watchingUrl } from "@/github/queries";
import { sortNotificationsByUpdatedDesc, sortReposByUpdatedDesc } from "@/github/search";
import type { MenuVisibilitySettings } from "@/settings/appSettings";
import type { useGitHubStore } from "@/stores/githubStore";
import type { useRefreshStore } from "@/stores/refreshStore";
import type { GhCliStatus, GitHubIssue, GitHubNotification, PrCategoryKind, PrRepoGroup, RepoGroup, StarredRepo, WatchedRepo } from "@/github/types";

const ABOUT_URL = "https://github.com/s00d/GitPulse";
const TRAY_REPO_LIMIT = 30;

export type TrayMenuEntry = MenuItem | Submenu | PredefinedMenuItem;

type TranslateFn = ReturnType<typeof useI18n>["t"];

export interface TrayMenuBuildContext {
  t: TranslateFn;
  store: ReturnType<typeof useGitHubStore>;
  menuVisibility: MenuVisibilitySettings;
  refreshState: ReturnType<typeof useRefreshStore>;
  hasToken: boolean;
  issueGroups: RepoGroup<GitHubIssue>[];
  prGroups: PrRepoGroup[];
  issues: GitHubIssue[];
  starredRepos: StarredRepo[];
  watchedRepos: WatchedRepo[];
  notifications: GitHubNotification[];
  unreadNotificationCount: number;
  ghCliStatus: GhCliStatus;
  isLoading: boolean;
  isBootstrapped: boolean;
  lastRefreshed: string | null;
  onRebuild: () => Promise<void>;
}

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    // ignore opener failures outside Tauri
  }
}

async function sectionSeparator() {
  return PredefinedMenuItem.new({ item: "Separator" });
}

function prCategoryLabel(t: TranslateFn, kind: PrCategoryKind, count: number): string {
  switch (kind) {
    case "needsReview":
      return t("menu.prNeedsReviewCount", { count });
    case "myPrs":
      return t("menu.prMineCount", { count });
    case "waitingOnAuthor":
      return t("menu.prWaitingCount", { count });
  }
}

function makeOpenAction(ctx: TrayMenuBuildContext, keys: string[], url: string) {
  return async () => {
    await ctx.refreshState.acknowledge(...keys);
    await openExternal(url);
    await ctx.onRebuild();
  };
}

function issueItem(ctx: TrayMenuBuildContext, issue: GitHubIssue, keys: string[]) {
  return MenuItem.new({
    id: `open:${issue.html_url}`,
    text: formatItemLabel(issue),
    action: () => void makeOpenAction(ctx, keys, issue.html_url)(),
  });
}

function overflowItem(ctx: TrayMenuBuildContext, keys: string[], url: string, label: string) {
  return MenuItem.new({
    id: `open:${url}`,
    text: label,
    action: () => void makeOpenAction(ctx, keys, url)(),
  });
}

export async function buildLoadingFooter(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  return [
    await sectionSeparator(),
    await MenuItem.new({
      id: "action:settings",
      text: ctx.t("menu.settings"),
      action: () => void invoke("show_settings_window"),
    }),
    await MenuItem.new({
      id: "action:quit",
      text: ctx.t("menu.quit"),
      action: () => void invoke("quit_app"),
    }),
  ];
}

export async function buildLoadingMenu(ctx: TrayMenuBuildContext) {
  return Menu.new({
    items: [
      await MenuItem.new({
        id: "loading",
        text: ctx.t("menu.loading"),
        enabled: false,
      }),
      ...(await buildLoadingFooter(ctx)),
    ],
  });
}

async function maybePrependRefreshing(ctx: TrayMenuBuildContext, items: TrayMenuEntry[]): Promise<TrayMenuEntry[]> {
  if (ctx.isLoading && ctx.isBootstrapped && ctx.lastRefreshed) {
    return [
      await MenuItem.new({
        id: "refreshing",
        text: ctx.t("menu.refreshing"),
        enabled: false,
      }),
      await sectionSeparator(),
      ...items,
    ];
  }
  return items;
}

async function buildIssueRepoMenus(ctx: TrayMenuBuildContext): Promise<Array<Submenu | MenuItem>> {
  if (!ctx.issues.length) {
    return [
      await MenuItem.new({
        id: "issues-empty",
        text: ctx.t("menu.noIssues"),
        enabled: false,
      }),
    ];
  }

  return Promise.all(
    ctx.issueGroups.map(async (group) => {
      const repoKey = issueRepoKey(group.repo);
      const label = submenuWithCountAndDelta(
        group.repo,
        group.totalCount,
        ctx.refreshState.getCountDelta(repoKey),
      );
      const ackKeys = [repoKey];

      if (!group.items.length && group.overflowUrl) {
        return Submenu.new({
          text: label,
          items: [
            await overflowItem(ctx, ackKeys, group.overflowUrl, ctx.t("menu.viewMoreOnGitHub")),
          ],
        });
      }

      const items = await Promise.all(
        group.items.map((item) => issueItem(ctx, item, ackKeys)),
      );
      if (group.overflowUrl) {
        items.push(
          await overflowItem(ctx, ackKeys, group.overflowUrl, ctx.t("menu.viewMoreOnGitHub")),
        );
      }

      return Submenu.new({ text: label, items });
    }),
  );
}

async function buildPrRepoMenus(ctx: TrayMenuBuildContext): Promise<Array<Submenu | MenuItem>> {
  if (!ctx.prGroups.length) {
    return [
      await MenuItem.new({
        id: "prs-empty",
        text: ctx.t("menu.noPullRequests"),
        enabled: false,
      }),
    ];
  }

  return Promise.all(
    ctx.prGroups.map(async (group) => {
      const repoKey = prRepoKey(group.repo);
      const label = submenuWithCountAndDelta(
        group.repo,
        group.totalCount,
        ctx.refreshState.getCountDelta(repoKey),
      );
      const ackKeys = [repoKey, PRS_TOTAL_KEY];

      if (!group.categories.some((c) => c.items.length)) {
        const overflow = group.categories.find((c) => c.overflowUrl);
        if (overflow?.overflowUrl) {
          return Submenu.new({
            text: label,
            items: [
              await overflowItem(ctx, ackKeys, overflow.overflowUrl, ctx.t("menu.viewMoreOnGitHub")),
            ],
          });
        }
      }

      const categoryMenus = await Promise.all(
        group.categories.map(async (category) => {
          const items = await Promise.all(
            category.items.map((item) => issueItem(ctx, item, ackKeys)),
          );
          if (category.overflowUrl) {
            items.push(
              await overflowItem(
                ctx,
                ackKeys,
                category.overflowUrl,
                ctx.t("menu.viewMoreOnGitHub"),
              ),
            );
          }
          return Submenu.new({
            text: prCategoryLabel(ctx.t, category.kind, category.totalCount),
            items: items.length
              ? items
              : [await MenuItem.new({ id: "cat-empty", text: "—", enabled: false })],
          });
        }),
      );

      return Submenu.new({ text: label, items: categoryMenus });
    }),
  );
}

async function buildPrSubmenu(ctx: TrayMenuBuildContext): Promise<Submenu> {
  const prCount = new Set(
    [...ctx.store.reviewRequests, ...ctx.store.myPrs, ...ctx.store.waitingOnAuthor].map(
      (pr) => pr.id,
    ),
  ).size;
  const repoMenus = await buildPrRepoMenus(ctx);
  const prLabel = labelWithCountAndDelta(
    ctx.t("menu.pullRequests", { count: prCount }),
    ctx.refreshState.getCountDelta(PRS_TOTAL_KEY),
  );

  return Submenu.new({
    text: prLabel,
    items: repoMenus,
  });
}

async function buildStarsSubmenu(ctx: TrayMenuBuildContext) {
  const sortedRepos = sortReposByUpdatedDesc(ctx.starredRepos).slice(0, TRAY_REPO_LIMIT);
  if (!sortedRepos.length) {
    return Submenu.new({
      text: ctx.t("menu.stars"),
      items: [
        await MenuItem.new({
          id: "stars-empty",
          text: ctx.t("menu.noStars"),
          enabled: false,
        }),
      ],
    });
  }

  const items = await Promise.all(
    sortedRepos.map((repo) =>
      MenuItem.new({
        id: `open:${repo.html_url}`,
        text: starredRepoLabel(repo),
        action: () => void openExternal(repo.html_url),
      }),
    ),
  );
  items.push(
    await MenuItem.new({
      id: `open:${starredUrl()}`,
      text: ctx.t("menu.viewAllStars"),
      action: () => void openExternal(starredUrl()),
    }),
  );

  return Submenu.new({
    text: ctx.t("menu.stars"),
    items,
  });
}

async function buildWatchingSubmenu(ctx: TrayMenuBuildContext) {
  const sortedRepos = sortReposByUpdatedDesc(ctx.watchedRepos).slice(0, TRAY_REPO_LIMIT);
  const count = sortedRepos.length;
  if (!count) {
    return Submenu.new({
      text: ctx.t("menu.watchingCount", { count: 0 }),
      items: [
        await MenuItem.new({
          id: "watching-empty",
          text: ctx.t("menu.noWatching"),
          enabled: false,
        }),
      ],
    });
  }

  const ackKeys = [WATCHING_TOTAL_KEY];
  const items = await Promise.all(
    sortedRepos.map((repo) =>
      MenuItem.new({
        id: `open:${repo.html_url}`,
        text: starredRepoLabel(repo),
        action: () => void makeOpenAction(ctx, ackKeys, repo.html_url)(),
      }),
    ),
  );
  items.push(
    await overflowItem(ctx, ackKeys, watchingUrl(), ctx.t("menu.viewAllWatching")),
  );

  const label = labelWithCountAndDelta(
    ctx.t("menu.watchingCount", { count }),
    ctx.refreshState.getCountDelta(WATCHING_TOTAL_KEY),
  );

  return Submenu.new({ text: label, items });
}

async function buildNotificationsSubmenu(ctx: TrayMenuBuildContext) {
  const unread = ctx.unreadNotificationCount;
  const visible = sortNotificationsByUpdatedDesc(ctx.notifications)
    .filter((n) => n.unread)
    .slice(0, 15);
  const ackKeys = [NOTIFICATIONS_TOTAL_KEY];
  const notifLabel = labelWithCountAndDelta(
    ctx.t("menu.notifications", { count: unread }),
    ctx.refreshState.getCountDelta(NOTIFICATIONS_TOTAL_KEY),
  );

  if (!visible.length) {
    return Submenu.new({
      text: notifLabel,
      items: [
        await MenuItem.new({
          id: "notif-empty",
          text: ctx.t("menu.noNotifications"),
          enabled: false,
        }),
      ],
    });
  }

  const items = await Promise.all(
    visible.map((n) => {
      const url = n.subject.url ?? n.repository.html_url;
      return MenuItem.new({
        id: `open:${url}`,
        text: truncate(`${n.repository.full_name}: ${n.subject.title}`),
        action: () => void makeOpenAction(ctx, ackKeys, url)(),
      });
    }),
  );
  items.push(
    await overflowItem(ctx, ackKeys, notificationsUrl(), ctx.t("menu.viewAllNotifications")),
  );

  return Submenu.new({ text: notifLabel, items });
}

async function buildRecentHistorySection(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  const recent = ctx.refreshState.recentEvents;

  if (!recent.length) {
    return [
      await MenuItem.new({
        id: "history-empty",
        text: ctx.t("menu.noRecentActivity"),
        enabled: false,
      }),
    ];
  }

  return Promise.all(
    recent.map((event) =>
      MenuItem.new({
        id: `open:${event.url}`,
        text: formatActivityTrayLabel(event),
        action: () => void openExternal(event.url),
      }),
    ),
  );
}

async function buildActionItems(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  return [
    await MenuItem.new({
      id: "action:open",
      text: ctx.t("menu.openApp"),
      action: () => void invoke("show_main_window"),
    }),
    await MenuItem.new({
      id: "action:refresh",
      text: ctx.t("menu.refresh"),
      action: async () => {
        await ctx.store.refresh({ source: "manual" });
      },
    }),
    await sectionSeparator(),
    await MenuItem.new({
      id: "action:settings",
      text: ctx.t("menu.settings"),
      action: () => void invoke("show_settings_window"),
    }),
    await MenuItem.new({
      id: "action:about",
      text: ctx.t("menu.about"),
      action: () => void openExternal(ABOUT_URL),
    }),
    await sectionSeparator(),
    await MenuItem.new({
      id: "action:quit",
      text: ctx.t("menu.quit"),
      action: () => void invoke("quit_app"),
    }),
  ];
}

async function appendSection(items: TrayMenuEntry[], section: TrayMenuEntry | TrayMenuEntry[]) {
  if (!items.length) {
    if (Array.isArray(section)) {
      items.push(...section);
    } else {
      items.push(section);
    }
    return;
  }

  items.push(await sectionSeparator());
  if (Array.isArray(section)) {
    items.push(...section);
  } else {
    items.push(section);
  }
}

export async function buildSignedInMenu(ctx: TrayMenuBuildContext) {
  const visibility = ctx.menuVisibility;
  const items: TrayMenuEntry[] = [];

  const historyHeader = await MenuItem.new({
    id: "history-header",
    text: ctx.t("menu.recentActivity"),
    enabled: false,
  });
  items.push(historyHeader, ...(await buildRecentHistorySection(ctx)));

  if (visibility.showIssues) {
    await appendSection(items, await buildIssueRepoMenus(ctx));
  }

  if (visibility.showPullRequests) {
    await appendSection(items, await buildPrSubmenu(ctx));
  }

  if (visibility.showStars) {
    await appendSection(items, await buildStarsSubmenu(ctx));
  }

  if (visibility.showWatching) {
    await appendSection(items, await buildWatchingSubmenu(ctx));
  }

  if (visibility.showNotifications) {
    await appendSection(items, await buildNotificationsSubmenu(ctx));
  }

  await appendSection(items, await buildActionItems(ctx));

  return Menu.new({ items: await maybePrependRefreshing(ctx, items) });
}

export async function buildSignedOutMenu(ctx: TrayMenuBuildContext) {
  const items: TrayMenuEntry[] = [];

  if (ctx.ghCliStatus === "not_installed") {
    items.push(
      await MenuItem.new({
        id: "hint:gh-not-installed",
        text: ctx.t("menu.ghNotInstalledHint"),
        enabled: false,
      }),
    );
  }

  items.push(
    await MenuItem.new({
      id: "action:open",
      text: ctx.t("menu.openApp"),
      action: () => void invoke("show_main_window"),
    }),
    await MenuItem.new({
      id: "action:sign-in",
      text: ctx.t("menu.signIn"),
      action: () => void invoke("show_main_window"),
    }),
    await sectionSeparator(),
    await MenuItem.new({
      id: "action:settings",
      text: ctx.t("menu.settings"),
      action: () => void invoke("show_settings_window"),
    }),
    await MenuItem.new({
      id: "action:about",
      text: ctx.t("menu.about"),
      action: () => void openExternal(ABOUT_URL),
    }),
    await sectionSeparator(),
    await MenuItem.new({
      id: "action:quit",
      text: ctx.t("menu.quit"),
      action: () => void invoke("quit_app"),
    }),
  );

  return Menu.new({ items: await maybePrependRefreshing(ctx, items) });
}
