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
import { formatActivityTrayText, activityTrayGlyph, issueTrayGlyph } from "@/tray/activityTrayIcons";
import { formatLastRefreshedTime } from "@/github/formatLastRefreshed";
import {
  formatIssueTrayLabel,
  formatNotificationTrayLabel,
  formatProjectItemTrayLabel,
  starredRepoTrayLabel,
  submenuWithCount,
} from "@/github/menuFormat";
import {
  MAX_PROJECT_COLUMNS_TRAY,
  MAX_PROJECT_RECENT_TRAY_TOTAL,
} from "@/github/projects";
import {
  issueRepoKey,
  NOTIFICATIONS_TOTAL_KEY,
  prRepoKey,
  PRS_TOTAL_KEY,
  WATCHING_TOTAL_KEY,
} from "@/github/countDiff";
import { notificationsUrl, ownedReposUrl, starredUrl, watchingUrl } from "@/github/queries";
import { milestonesIndexUrl } from "@/github/milestones";
import { sortNotificationsByUpdatedDesc, sortReposByStarsDesc, sortReposByUpdatedDesc } from "@/github/search";
import type { ItemActionSettings, MenuVisibilitySettings } from "@/settings/appSettings";
import {
  notificationOpenUrl,
  snoozeKeyForIssue,
} from "@/github/itemActions";
import { useSnoozeStore } from "@/stores/snoozeStore";
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
  itemActions: ItemActionSettings;
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

async function buildTrayActionItems(
  ctx: TrayMenuBuildContext,
  opts: {
    openUrl: string;
    ackKeys: string[];
    issue?: GitHubIssue;
    notification?: GitHubNotification;
  },
): Promise<TrayMenuEntry[]> {
  const items: TrayMenuEntry[] = [];

  items.push(
    await IconMenuItem.new({
      id: `action-open:${opts.openUrl}`,
      text: ctx.t("actions.openBrowser"),
      icon: await trayGlyphIcon("external"),
      action: () => void makeOpenAction(ctx, opts.ackKeys, opts.openUrl)(),
    }),
  );

  if (opts.notification?.unread) {
    const notification = opts.notification;
    items.push(
      await IconMenuItem.new({
        id: `action-mark:${notification.id}`,
        text: ctx.t("actions.markRead"),
        icon: await trayGlyphIcon("notification"),
        action: () =>
          void (async () => {
            await ctx.store.markNotificationRead(notification);
            await ctx.onRebuild();
          })(),
      }),
    );
  }

  if (opts.issue && isPullRequest(opts.issue)) {
    const issue = opts.issue;
    items.push(
      await IconMenuItem.new({
        id: `action-review:${issue.id}`,
        text: ctx.t("actions.openReview"),
        icon: await trayGlyphIcon("pullRequest"),
        action: () =>
          void (async () => {
            await ctx.store.openPullRequestReview(issue);
          })(),
      }),
    );
    if (ctx.itemActions.enableQuickApprove) {
      items.push(
        await IconMenuItem.new({
          id: `action-approve:${issue.id}`,
          text: ctx.t("actions.approve"),
          icon: await trayGlyphIcon("pullRequest"),
          action: () =>
            void (async () => {
              await ctx.store.approvePullRequest(issue);
              await ctx.onRebuild();
            })(),
        }),
      );
    }
  }

  if (opts.issue) {
    const issue = opts.issue;
    const snoozeStore = useSnoozeStore();
    const key = snoozeKeyForIssue(issue);
    if (snoozeStore.isKeySnoozed(key)) {
      items.push(
        await IconMenuItem.new({
          id: `action-unsnooze:${issue.id}`,
          text: ctx.t("actions.unsnooze"),
          icon: await trayGlyphIcon("issue"),
          action: () =>
            void (async () => {
              await ctx.store.unsnoozeIssue(issue);
              await ctx.onRebuild();
            })(),
        }),
      );
    } else {
      for (const hours of ctx.itemActions.snoozePresetHours) {
        items.push(
          await IconMenuItem.new({
            id: `action-snooze:${issue.id}:${hours}`,
            text: ctx.t("actions.snoozeHours", { hours }),
            icon: await trayGlyphIcon("issue"),
            action: () =>
              void (async () => {
                await ctx.store.snoozeIssue(issue, hours);
                await ctx.onRebuild();
              })(),
          }),
        );
      }
    }
  }

  return items;
}

async function issueItem(ctx: TrayMenuBuildContext, issue: GitHubIssue, keys: string[]) {
  const label = formatIssueTrayLabel(issue);
  const icon = await trayGlyphIcon(
    issueTrayGlyph({
      isPr: isPullRequest(issue),
      draft: issue.draft,
      ciStatus: ctx.store.prCiById[issue.id],
    }),
  );

  if (!ctx.itemActions.trayItemSubmenus) {
    return IconMenuItem.new({
      id: `open:${issue.html_url}`,
      text: label,
      icon,
      action: () => void makeOpenAction(ctx, keys, issue.html_url)(),
    });
  }

  return Submenu.new({
    id: `issue:${issue.id}`,
    text: label,
    icon,
    items: await buildTrayActionItems(ctx, {
      openUrl: issue.html_url,
      ackKeys: keys,
      issue,
    }),
  });
}

async function notificationItem(
  ctx: TrayMenuBuildContext,
  notification: GitHubNotification,
  keys: string[],
) {
  const url = notificationOpenUrl(notification);
  const label = formatNotificationTrayLabel(
    notification.repository.full_name,
    notification.subject.title,
    notification.updated_at,
  );

  if (!ctx.itemActions.trayItemSubmenus) {
    return IconMenuItem.new({
      id: `open:${url}`,
      text: label,
      icon: await trayGlyphIcon("notification"),
      action: () => void makeOpenAction(ctx, keys, url)(),
    });
  }

  return Submenu.new({
    id: `notif:${notification.id}`,
    text: label,
    icon: await trayGlyphIcon("notification"),
    items: await buildTrayActionItems(ctx, {
      openUrl: url,
      ackKeys: keys,
      notification,
    }),
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
    await IconMenuItem.new({
      id: "action:quit",
      text: ctx.t("menu.quit"),
      icon: await trayGlyphIcon("quit"),
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
      const label = submenuWithCount(group.repo, group.totalCount);
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
      const label = submenuWithCount(group.repo, group.totalCount);
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

async function buildMilestonesSubmenu(ctx: TrayMenuBuildContext): Promise<Submenu> {
  const groups = ctx.store.viewMilestoneGroups;
  const total = ctx.store.milestoneOpenTotal;

  if (!groups.length) {
    return glyphSubmenu({
      id: "submenu:milestones",
      text: ctx.t("menu.milestones", { count: 0 }),
      glyph: "milestone",
      items: [
        await IconMenuItem.new({
          id: "milestones-empty",
          text: ctx.t("menu.noMilestones"),
          icon: await trayGlyphIcon("milestone"),
          enabled: false,
        }),
      ],
    });
  }

  const flatItems: TrayMenuEntry[] = [];

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index]!;

    flatItems.push(
      await IconMenuItem.new({
        id: `milestone-repo:${group.repo}`,
        text: group.repo,
        icon: await trayBadgeIcon("repo", group.totalOpenIssues),
        enabled: false,
      }),
    );

    for (const milestone of group.milestones) {
      flatItems.push(
        await IconMenuItem.new({
          id: `milestone:${group.repo}:${milestone.number}`,
          text: `${milestone.title} — ${ctx.t("milestone.openCount", { count: milestone.open_issues })}`,
          icon: await trayGlyphIcon("milestone"),
          action: () => void openExternal(milestone.html_url),
        }),
      );
    }

    flatItems.push(
      await IconMenuItem.new({
        id: `milestone-overflow:${group.repo}`,
        text: ctx.t("menu.viewMilestonesOnGitHub"),
        icon: await trayGlyphIcon("external"),
        action: () => void openExternal(milestonesIndexUrl(group.repo)),
      }),
    );

    if (index < groups.length - 1) {
      flatItems.push(await sectionSeparator());
    }
  }

  return glyphSubmenu({
    id: "submenu:milestones",
    text: ctx.t("menu.milestones", { count: total }),
    glyph: "milestone",
    count: total,
    items: flatItems,
  });
}

async function buildProjectsSubmenu(ctx: TrayMenuBuildContext): Promise<Submenu> {
  const groups = ctx.store.projectBoardGroups;
  const total = ctx.store.projectOpenTotal;

  if (!groups.length) {
    return glyphSubmenu({
      id: "submenu:projects",
      text: ctx.t("menu.projects", { count: 0 }),
      glyph: "project",
      items: [
        await IconMenuItem.new({
          id: "projects-empty",
          text: ctx.t("menu.noProjects"),
          icon: await trayGlyphIcon("project"),
          enabled: false,
        }),
      ],
    });
  }

  const flatItems: TrayMenuEntry[] = [];
  let trayIssuesAdded = 0;

  for (let index = 0; index < groups.length; index++) {
    const group = groups[index]!;

    flatItems.push(
      await IconMenuItem.new({
        id: `project-header:${group.id}`,
        text: group.title,
        icon: await trayBadgeIcon("project", group.totalOpenCount),
        enabled: false,
      }),
    );

    const visibleColumns = group.columns.slice(0, MAX_PROJECT_COLUMNS_TRAY);
    for (const column of visibleColumns) {
      flatItems.push(
        await IconMenuItem.new({
          id: `project-col:${group.id}:${column.name}`,
          text: `${column.name} — ${ctx.t("project.openCount", { count: column.openCount })}`,
          icon: await trayGlyphIcon("project"),
          enabled: false,
        }),
      );
    }

    const hiddenColumnCount = group.columns.length - visibleColumns.length;
    if (hiddenColumnCount > 0) {
      flatItems.push(
        await IconMenuItem.new({
          id: `project-cols-more:${group.id}`,
          text: ctx.t("menu.projectMoreColumns", { count: hiddenColumnCount }),
          icon: await trayGlyphIcon("hint"),
          enabled: false,
        }),
      );
    }

    const remaining = MAX_PROJECT_RECENT_TRAY_TOTAL - trayIssuesAdded;
    const trayItems = group.trayRecentItems.slice(0, Math.max(0, remaining));
    for (const item of trayItems) {
      flatItems.push(
        await IconMenuItem.new({
          id: `project-item:${group.id}:${item.id}`,
          text: formatProjectItemTrayLabel(item),
          icon: await trayGlyphIcon("issue"),
          action: () => void openExternal(item.url),
        }),
      );
      trayIssuesAdded += 1;
    }

    flatItems.push(
      await IconMenuItem.new({
        id: `project-overflow:${group.id}`,
        text: ctx.t("menu.viewProjectOnGitHub"),
        icon: await trayGlyphIcon("external"),
        action: () => void openExternal(group.url),
      }),
    );

    if (index < groups.length - 1) {
      flatItems.push(await sectionSeparator());
    }
  }

  return glyphSubmenu({
    id: "submenu:projects",
    text: ctx.t("menu.projects", { count: total }),
    glyph: "project",
    count: total,
    items: flatItems,
  });
}

async function buildPrSubmenu(ctx: TrayMenuBuildContext): Promise<Submenu> {
  const prCount = new Set(
    [...ctx.store.reviewRequests, ...ctx.store.myPrs, ...ctx.store.waitingOnAuthor].map(
      (pr) => pr.id,
    ),
  ).size;
  const repoMenus = await buildPrRepoMenus(ctx);
  const prLabel = ctx.t("menu.pullRequests", { count: prCount });

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

  const label = ctx.t("menu.watchingCount", { count });

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
  const notifLabel = ctx.t("menu.notifications", { count: unread });

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
    visible.map((n) => notificationItem(ctx, n, ackKeys)),
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

async function buildDiscussionsReleasesSubmenu(ctx: TrayMenuBuildContext): Promise<Submenu> {
  const releases = ctx.store.viewReleaseGroups
    .flatMap((group) => group.releases.map((release) => ({ release, repo: group.repo })))
    .slice(0, 5);
  const discussions = ctx.store.viewDiscussionItems.slice(0, 5);
  const count = ctx.store.discussionsReleasesBadgeCount;

  if (!releases.length && !discussions.length) {
    return glyphSubmenu({
      id: "submenu:discussions-releases",
      text: ctx.t("menu.discussionsReleases", { count: 0 }),
      glyph: "repo",
      items: [
        await IconMenuItem.new({
          id: "discussions-releases-empty",
          text: ctx.t("menu.noDiscussionsReleases"),
          icon: await trayGlyphIcon("repo"),
          enabled: false,
        }),
      ],
    });
  }

  const items: TrayMenuEntry[] = [];

  for (const entry of releases) {
    const title = entry.release.name || entry.release.tag_name;
    items.push(
      await IconMenuItem.new({
        id: `release:${entry.repo}:${entry.release.id}`,
        text: `${entry.repo} — ${title}`,
        icon: await trayGlyphIcon("repo"),
        action: () => void openExternal(entry.release.html_url),
      }),
    );
  }

  if (releases.length && discussions.length) {
    items.push(await sectionSeparator());
  }

  for (const discussion of discussions) {
    items.push(
      await IconMenuItem.new({
        id: `discussion:${discussion.id}`,
        text: `${discussion.repo} — ${discussion.title}`,
        icon: await trayGlyphIcon("repo"),
        action: () => void openExternal(discussion.url),
      }),
    );
  }

  items.push(
    await IconMenuItem.new({
      id: "discussions-releases-open-app",
      text: ctx.t("menu.openApp"),
      icon: await trayGlyphIcon("open"),
      action: () => void invoke("show_main_window"),
    }),
  );

  return glyphSubmenu({
    id: "submenu:discussions-releases",
    text: ctx.t("menu.discussionsReleases", { count }),
    glyph: "discussion",
    count: count || undefined,
    items,
  });
}

async function buildRecentHistorySection(ctx: TrayMenuBuildContext): Promise<TrayMenuEntry[]> {
  const recent = ctx.refreshState.recentEvents;
  const hasStoredEvents = ctx.refreshState.events.length > 0;

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

  const items: TrayMenuEntry[] = await Promise.all(
    recent.map(async (event) =>
      IconMenuItem.new({
        id: `history:${event.id}`,
        text: formatActivityTrayText(event, ctx.t),
        icon: await trayGlyphIcon(activityTrayGlyph(event)),
        action: async () => {
          await ctx.refreshState.dismissEvent(event.id);
          void openExternal(event.url);
        },
      }),
    ),
  );

  if (hasStoredEvents) {
    items.push(
      await sectionSeparator(),
      await IconMenuItem.new({
        id: "history:clear-all",
        text: ctx.t("menu.clearRecentActivity"),
        icon: await trayGlyphIcon("activity"),
        action: () =>
          void (async () => {
            await ctx.refreshState.dismissAllEvents();
            await ctx.onRebuild();
          })(),
      }),
    );
  }

  return items;
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
    await IconMenuItem.new({
      id: "action:quit",
      text: ctx.t("menu.quit"),
      icon: await trayGlyphIcon("quit"),
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

  if (visibility.showMilestones) {
    await appendSection(items, await buildMilestonesSubmenu(ctx));
  }

  if (visibility.showProjects) {
    await appendSection(items, await buildProjectsSubmenu(ctx));
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

  if (visibility.showDiscussionsReleases) {
    await appendSection(items, await buildDiscussionsReleasesSubmenu(ctx));
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
    await IconMenuItem.new({
      id: "action:quit",
      text: ctx.t("menu.quit"),
      icon: await trayGlyphIcon("quit"),
      action: () => void invoke("quit_app"),
    }),
  );

  return Menu.new({ items: await maybePrependRefreshing(ctx, items) });
}
