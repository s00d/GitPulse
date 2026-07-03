import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { TrayIcon } from "@tauri-apps/api/tray";
import { openUrl } from "@tauri-apps/plugin-opener";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useGitHubStore } from "@/stores/githubStore";
import { useRefreshStore } from "@/stores/refreshStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  buildLoadingMenu,
  buildSignedInMenu,
  buildSignedOutMenu,
  type TrayMenuBuildContext,
} from "@/tray/menuBuilders";
import { isTrayLoadingState } from "@/tray/trayState";

const TRAY_ID = "main-tray";

let trayHandle: TrayIcon | null = null;
let trayInitPromise: Promise<TrayIcon | null> | null = null;

async function getTray(): Promise<TrayIcon | null> {
  if (trayHandle) return trayHandle;
  if (!trayInitPromise) {
    trayInitPromise = TrayIcon.getById(TRAY_ID).then((tray) => {
      trayHandle = tray;
      return tray;
    });
  }
  return trayInitPromise;
}

export function useTrayMenu() {
  const store = useGitHubStore();
  const settingsStore = useSettingsStore();
  const refreshStore = useRefreshStore();
  const { t } = useI18n();
  const {
    hasToken,
    issueGroups,
    prGroups,
    viewStarredRepos,
    viewOwnedRepos,
    viewWatchedRepos,
    viewNotifications,
    viewUnreadNotificationCount,
    trayBadgeCount,
    issues,
    ghCliStatus,
    isBootstrapped,
    isLoading,
    lastRefreshed,
  } = storeToRefs(store);
  const { menuVisibility, itemActions } = storeToRefs(settingsStore);

  function buildContext(): TrayMenuBuildContext {
    return {
      t,
      store,
      menuVisibility: menuVisibility.value,
      itemActions: itemActions.value,
      refreshState: refreshStore,
      hasToken: hasToken.value,
      issueGroups: issueGroups.value,
      prGroups: prGroups.value,
      issues: issues.value,
      starredRepos: viewStarredRepos.value,
      ownedRepos: viewOwnedRepos.value,
      watchedRepos: viewWatchedRepos.value,
      notifications: viewNotifications.value,
      unreadNotificationCount: viewUnreadNotificationCount.value,
      ghCliStatus: ghCliStatus.value,
      isLoading: isLoading.value,
      isBootstrapped: isBootstrapped.value,
      lastRefreshed: lastRefreshed.value,
      onRebuild: rebuild,
    };
  }

  async function updateBadge() {
    try {
      await invoke("tray_set_badge", { count: trayBadgeCount.value });
    } catch {
      // no-op outside Tauri
    }
  }

  async function rebuild() {
    const tray = await getTray();
    if (!tray) return;

    const ctx = buildContext();

    if (isTrayLoadingState({ isBootstrapped })) {
      await tray.setMenu(await buildLoadingMenu(ctx));
      await updateBadge();
      return;
    }

    const menu = hasToken.value ? await buildSignedInMenu(ctx) : await buildSignedOutMenu(ctx);
    await tray.setMenu(menu);
    await updateBadge();
  }

  async function init() {
    await listen<string>("tray://open", (event) => {
      void openUrl(event.payload).catch(() => {
        // ignore opener failures outside Tauri
      });
    });
    await listen("tray://action", async (event) => {
      if (event.payload === "refresh") {
        await store.refresh({ source: "manual" });
      }
    });
    await rebuild();
  }

  return {
    rebuild,
    init,
    updateBadge,
  };
}
