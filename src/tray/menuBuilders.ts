import { invoke } from "@tauri-apps/api/core";
import {
  IconMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
  type SubmenuOptions,
} from "@tauri-apps/api/menu";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { useI18n } from "vue-i18n";
import { formatActivityTrayLabel } from "@/github/itemDiff";
import { formatLastRefreshedTime } from "@/github/formatLastRefreshed";
import {
  formatIssueTrayLabel,
  formatNotificationTrayLabel,
  labelWithCountAndDelta,
  starredRepoTrayLabel,
  submenuWithCountAndDelta,
} from "@/github/menuFormat";
import {
  issueRepoKey,
  NOTIFICATIONS_TOTAL_KEY,
  prRepoKey,
  PRS_TOTAL_KEY,
  WATCHING_TOTAL_KEY,
} from "@/github/countDiff";
import { notificationsUrl, ownedReposUrl, starredUrl, watchingUrl } from "@/github/queries";
import { sortNotificationsByUpdatedDesc, sortReposByStarsDesc, sortReposByUpdatedDesc } from "@/github/search";
import type { MenuVisibilitySettings } from "@/settings/appSettings";
import type { useGitHubStore } from "@/stores/githubStore";
import type { useRefreshStore } from "@/stores/refreshStore";
import type {
  GhCliStatus,
  GitHubIssue,
  GitHubNotification,
  PrCategoryKind,
  PrRepoGroup,
  RepoGroup,
  StarredRepo,
  WatchedRepo,
} from "@/github/types";
import { isPullRequest } from "@/github/types";
import {
  issueItemIcon,
  trayBadgeIcon,
  trayGlyphIcon,
  type TrayGlyph,
} from "@/tray/trayIconGenerator";

const ABOUT_URL = "https://github.com/s00d/GitPulse";
const TRAY_REPO_LIMIT = 30;

export type TrayMenuEntry = MenuItem | IconMenuItem | Submenu | PredefinedMenuItem;

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
  ownedRepos: StarredRepo[];
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

async function glyphSubmenu(opts: {
  id?: string;
  text: string;
  glyph: TrayGlyph;
  count?: number;
  items: NonNullable<SubmenuOptions["items"]>;
}): Promise<Submenu> {
  const icon =
    opts.count !== undefined && opts.count > 0
      ? await trayBadgeIcon(opts.glyph, opts.count)
      : await trayGlyphIcon(opts.glyph);

  return Submenu.new({
    id: opts.id,
    text: opts.text,
    icon,
    items: opts.items,
  });
}

function prCategoryGlyph(kind: PrCategoryKind): TrayGlyph {
  switch (kind) {
    case "needsReview":
      return "prReview";
    case "myPrs":
      return "myPr";
    case "waitingOnAuthor":
      return "prWait";
  }
}

function prCategoryTitle(t: TranslateFn, kind: PrCategoryKind): string {
  switch (kind) {
    case "needsReview":
      return t("menu.prNeedsReview");
    case "myPrs":
      return t("menu.prMine");
    case "waitingOnAuthor":
      return t("menu.prWaiting");
  }
}

function makeOpenAction(ctx: TrayMenuBuildContext, keys: string[], url: string) {
  return async () => {
    await ctx.refreshState.acknowledge(...keys);
    await openExternal(url);
    await ctx.onRebuild();
  };
}

async function issueItem(ctx: TrayMenuBuildContext, issue: GitHubIssue, keys: string[]) {
  return IconMenuItem.new({
    id: `open:${issue.html_url}`,
    text: formatIssueTrayLabel(issue),
    icon: await issueItemIcon(isPullRequest(issue)),
    action: () => void makeOpenAction(ctx, keys, issue.html_url)(),
  });
}

async function overflowItem(ctx: TrayMenuBuildContext, keys: string[], url: string, label: string) {
  return IconMenuItem.new({
    id: `open:${url}`,
    text: label,
    icon: await trayGlyphIcon("external"),
    action: () => void makeOpenAction(ctx, keys, url)(),
  });
}

export async function buildLoadingFooter(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  return [
    await sectionSeparator(),
    await IconMenuItem.new({
      id: "action:settings",
      text: ctx.t("menu.settings"),
      icon: await trayGlyphIcon("settings"),
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
      await IconMenuItem.new({
        id: "loading",
        text: ctx.t("menu.loading"),
        icon: await trayGlyphIcon("activity"),
        enabled: false,
      }),
      ...(await buildLoadingFooter(ctx)),
    ],
  });
}

async function maybePrependRefreshing(ctx: TrayMenuBuildContext, items: TrayMenuEntry[]): Promise<TrayMenuEntry[]> {
  if (ctx.isLoading && ctx.isBootstrapped && ctx.lastRefreshed) {
    return [
      await IconMenuItem.new({
        id: "refreshing",
        text: ctx.t("menu.refreshing"),
        icon: await trayGlyphIcon("refresh"),
        enabled: false,
      }),
      await sectionSeparator(),
      ...items,
    ];
  }
  return items;
}

async function buildIssueRepoMenus(ctx: TrayMenuBuildContext): Promise<Array<Submenu | IconMenuItem>> {
  if (!ctx.issues.length) {
    return [
      await IconMenuItem.new({
        id: "issues-empty",
        text: ctx.t("menu.noIssues"),
        icon: await trayGlyphIcon("issue"),
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
        return glyphSubmenu({
          id: `issue-repo:${group.repo}`,
          text: label,
          glyph: "repo",
          count: group.totalCount,
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

      return glyphSubmenu({
        id: `issue-repo:${group.repo}`,
        text: label,
        glyph: "repo",
        count: group.totalCount,
        items,
      });
    }),
  );
}

async function buildPrRepoMenus(ctx: TrayMenuBuildContext): Promise<Array<Submenu | IconMenuItem>> {
  if (!ctx.prGroups.length) {
    return [
      await IconMenuItem.new({
        id: "prs-empty",
        text: ctx.t("menu.noPullRequests"),
        icon: await trayGlyphIcon("pullRequest"),
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

      const visibleCategories = group.categories.filter(
        (category) => category.items.length > 0 || category.overflowUrl,
      );

      if (!visibleCategories.length) {
        const overflow = group.categories.find((c) => c.overflowUrl);
        if (overflow?.overflowUrl) {
          return glyphSubmenu({
            id: `pr-repo:${group.repo}`,
            text: label,
            glyph: "repo",
            count: group.totalCount,
            items: [
              await overflowItem(ctx, ackKeys, overflow.overflowUrl, ctx.t("menu.viewMoreOnGitHub")),
            ],
          });
        }
      }

      const flatItems: TrayMenuEntry[] = [];

      for (let index = 0; index < visibleCategories.length; index++) {
        const category = visibleCategories[index]!;
        const glyph = prCategoryGlyph(category.kind);

        flatItems.push(
          await IconMenuItem.new({
            id: `pr-cat:${group.repo}:${category.kind}`,
            text: prCategoryTitle(ctx.t, category.kind),
            icon: await trayBadgeIcon(glyph, category.totalCount),
            enabled: false,
          }),
        );

        const prItems = await Promise.all(
          category.items.map((item) => issueItem(ctx, item, ackKeys)),
        );
        flatItems.push(...prItems);

        if (category.overflowUrl) {
          flatItems.push(
            await overflowItem(
              ctx,
              ackKeys,
              category.overflowUrl,
              ctx.t("menu.viewMoreOnGitHub"),
            ),
          );
        }

        if (index < visibleCategories.length - 1) {
          flatItems.push(await sectionSeparator());
        }
      }

      if (!flatItems.length) {
        flatItems.push(
          await MenuItem.new({
            id: `pr-repo-empty:${group.repo}`,
            text: "—",
            enabled: false,
          }),
        );
      }

      return glyphSubmenu({
        id: `pr-repo:${group.repo}`,
        text: label,
        glyph: "repo",
        count: group.totalCount,
        items: flatItems,
      });
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

  return glyphSubmenu({
    id: "submenu:pull-requests",
    text: prLabel,
    glyph: "pullRequest",
    count: prCount,
    items: repoMenus,
  });
}

async function buildStarredSubmenu(ctx: TrayMenuBuildContext) {
  const starred = sortReposByUpdatedDesc(ctx.starredRepos).slice(0, TRAY_REPO_LIMIT);

  if (!starred.length) {
    return glyphSubmenu({
      id: "submenu:starred",
      text: ctx.t("menu.starsStarred"),
      glyph: "star",
      items: [
        await IconMenuItem.new({
          id: "starred-empty",
          text: ctx.t("menu.noStars"),
          icon: await trayGlyphIcon("star"),
          enabled: false,
        }),
      ],
    });
  }

  const items = await Promise.all(
    starred.map(async (repo) =>
      IconMenuItem.new({
        id: `open:${repo.html_url}`,
        text: starredRepoTrayLabel(repo),
        icon: await trayGlyphIcon("star"),
        action: () => void openExternal(repo.html_url),
      }),
    ),
  );
  items.push(
    await IconMenuItem.new({
      id: `open:${starredUrl()}`,
      text: ctx.t("menu.viewAllStars"),
      icon: await trayGlyphIcon("external"),
      action: () => void openExternal(starredUrl()),
    }),
  );

  return glyphSubmenu({
    id: "submenu:starred",
    text: ctx.t("menu.starsStarred"),
    glyph: "star",
    count: starred.length,
    items,
  });
}

async function buildOwnedReposSubmenu(ctx: TrayMenuBuildContext) {
  const owned = sortReposByStarsDesc(ctx.ownedRepos).slice(0, TRAY_REPO_LIMIT);
  const login = ctx.store.viewer?.login;

  if (!owned.length) {
    return glyphSubmenu({
      id: "submenu:owned-repos",
      text: ctx.t("menu.starsOwned"),
      glyph: "repo",
      items: [
        await IconMenuItem.new({
          id: "owned-repos-empty",
          text: ctx.t("menu.noOwnedRepos"),
          icon: await trayGlyphIcon("repo"),
          enabled: false,
        }),
      ],
    });
  }

  const items = await Promise.all(
    owned.map(async (repo) =>
      IconMenuItem.new({
        id: `open-owned:${repo.html_url}`,
        text: starredRepoTrayLabel(repo),
        icon: await trayGlyphIcon("repo"),
        action: () => void openExternal(repo.html_url),
      }),
    ),
  );
  if (login) {
    items.push(
      await IconMenuItem.new({
        id: `open:${ownedReposUrl(login)}`,
        text: ctx.t("menu.viewAllOwnedRepos"),
        icon: await trayGlyphIcon("external"),
        action: () => void openExternal(ownedReposUrl(login)),
      }),
    );
  }

  return glyphSubmenu({
    id: "submenu:owned-repos",
    text: ctx.t("menu.starsOwned"),
    glyph: "repo",
    count: owned.length,
    items,
  });
}

async function buildWatchingSubmenu(ctx: TrayMenuBuildContext) {
  const sortedRepos = sortReposByUpdatedDesc(ctx.watchedRepos).slice(0, TRAY_REPO_LIMIT);
  const count = sortedRepos.length;
  if (!count) {
    return glyphSubmenu({
      id: "submenu:watching",
      text: ctx.t("menu.watchingCount", { count: 0 }),
      glyph: "watch",
      items: [
        await IconMenuItem.new({
          id: "watching-empty",
          text: ctx.t("menu.noWatching"),
          icon: await trayGlyphIcon("watch"),
          enabled: false,
        }),
      ],
    });
  }

  const ackKeys = [WATCHING_TOTAL_KEY];
  const items = await Promise.all(
    sortedRepos.map(async (repo) =>
      IconMenuItem.new({
        id: `open:${repo.html_url}`,
        text: starredRepoTrayLabel(repo),
        icon: await trayGlyphIcon("watch"),
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

  return glyphSubmenu({
    id: "submenu:watching",
    text: label,
    glyph: "watch",
    count,
    items,
  });
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
    return glyphSubmenu({
      id: "submenu:notifications",
      text: notifLabel,
      glyph: "notification",
      items: [
        await IconMenuItem.new({
          id: "notif-empty",
          text: ctx.t("menu.noNotifications"),
          icon: await trayGlyphIcon("notification"),
          enabled: false,
        }),
      ],
    });
  }

  const items = await Promise.all(
    visible.map(async (n) => {
      const url = n.subject.url ?? n.repository.html_url;
      return IconMenuItem.new({
        id: `open:${url}`,
        text: formatNotificationTrayLabel(
          n.repository.full_name,
          n.subject.title,
          n.updated_at,
        ),
        icon: await trayGlyphIcon("notification"),
        action: () => void makeOpenAction(ctx, ackKeys, url)(),
      });
    }),
  );
  items.push(
    await overflowItem(ctx, ackKeys, notificationsUrl(), ctx.t("menu.viewAllNotifications")),
  );

  return glyphSubmenu({
    id: "submenu:notifications",
    text: notifLabel,
    glyph: "notification",
    count: unread,
    items,
  });
}

async function buildRecentHistorySection(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  const recent = ctx.refreshState.recentEvents;

  if (!recent.length) {
    return [
      await IconMenuItem.new({
        id: "history-empty",
        text: ctx.t("menu.noRecentActivity"),
        icon: await trayGlyphIcon("activity"),
        enabled: false,
      }),
    ];
  }

  return Promise.all(
    recent.map(async (event) =>
      IconMenuItem.new({
        id: `history:${event.id}`,
        text: formatActivityTrayLabel(event),
        icon: await trayGlyphIcon("activity"),
        action: async () => {
          await ctx.refreshState.dismissEvent(event.id);
          void openExternal(event.url);
        },
      }),
    ),
  );
}

function refreshMenuLabel(ctx: TrayMenuBuildContext): string {
  if (!ctx.lastRefreshed) return ctx.t("menu.refresh");
  const time = formatLastRefreshedTime(ctx.lastRefreshed);
  if (!time) return ctx.t("menu.refresh");
  return ctx.t("menu.refreshAt", { time });
}

async function buildActionItems(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  return [
    await IconMenuItem.new({
      id: "action:open",
      text: ctx.t("menu.openApp"),
      icon: await trayGlyphIcon("open"),
      action: () => void invoke("show_main_window"),
    }),
    await IconMenuItem.new({
      id: "action:refresh",
      text: refreshMenuLabel(ctx),
      icon: await trayGlyphIcon("refresh"),
      action: async () => {
        await ctx.store.refresh({ source: "manual" });
      },
    }),
    await sectionSeparator(),
    await IconMenuItem.new({
      id: "action:settings",
      text: ctx.t("menu.settings"),
      icon: await trayGlyphIcon("settings"),
      action: () => void invoke("show_settings_window"),
    }),
    await IconMenuItem.new({
      id: "action:about",
      text: ctx.t("menu.about"),
      icon: await trayGlyphIcon("about"),
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
  const recentCount = ctx.refreshState.recentEvents.length;

  const historyHeader = await IconMenuItem.new({
    id: "history-header",
    text: ctx.t("menu.recentActivity"),
    icon: await (recentCount > 0 ? trayBadgeIcon("activity", recentCount) : trayGlyphIcon("activity")),
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
    await appendSection(items, await buildStarredSubmenu(ctx));
    await appendSection(items, await buildOwnedReposSubmenu(ctx));
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
      await IconMenuItem.new({
        id: "hint:gh-not-installed",
        text: ctx.t("menu.ghNotInstalledHint"),
        icon: await trayGlyphIcon("hint"),
        enabled: false,
      }),
    );
  }

  items.push(
    await IconMenuItem.new({
      id: "action:open",
      text: ctx.t("menu.openApp"),
      icon: await trayGlyphIcon("open"),
      action: () => void invoke("show_main_window"),
    }),
    await IconMenuItem.new({
      id: "action:sign-in",
      text: ctx.t("menu.signIn"),
      icon: await trayGlyphIcon("signIn"),
      action: () => void invoke("show_main_window"),
    }),
    await sectionSeparator(),
    await IconMenuItem.new({
      id: "action:settings",
      text: ctx.t("menu.settings"),
      icon: await trayGlyphIcon("settings"),
      action: () => void invoke("show_settings_window"),
    }),
    await IconMenuItem.new({
      id: "action:about",
      text: ctx.t("menu.about"),
      icon: await trayGlyphIcon("about"),
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
