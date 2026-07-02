import { onMounted, watch } from "vue";
import { listen } from "@tauri-apps/api/event";
import { useTrayMenu } from "@/composables/useTrayMenu";
import { useGitHubStore } from "@/stores/githubStore";
import { useFeedStore } from "@/stores/feedStore";
import { useRefreshStore } from "@/stores/refreshStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function useAppBootstrap() {
  const githubStore = useGitHubStore();
  const feedStore = useFeedStore();
  const trayMenu = useTrayMenu();
  const settingsStore = useSettingsStore();
  const refreshStore = useRefreshStore();

  onMounted(() => {
    githubStore.setBootstrapped(false);

    void (async () => {
      await trayMenu.init();
      watch(
        () =>
          [
            githubStore.isBootstrapped,
            githubStore.isLoading,
            githubStore.lastRefreshed,
            githubStore.hasToken,
            githubStore.badgeCount,
            githubStore.ghCliStatus,
            settingsStore.menuVisibility,
            refreshStore.events.length,
            refreshStore.events[0]?.id,
            refreshStore.signature,
          ] as const,
        () => {
          void trayMenu.rebuild();
        },
        { deep: true },
      );

      try {
        await settingsStore.init();
        await refreshStore.init();
        await feedStore.init();
        await githubStore.syncRefreshInterval();
        await githubStore.detectGhCliStatus();

        const hasToken = await githubStore.initAuth();

        if (!hasToken && githubStore.ghCliStatus === "authed") {
          try {
            await githubStore.importTokenFromGhCli();
            githubStore.didAutoImportFromCli = true;
          } catch (err) {
            githubStore.setGhCliError(err instanceof Error ? err.message : String(err));
          }
        }

        if (githubStore.hasToken) {
          try {
            await githubStore.refresh({ source: "bootstrap" });
          } catch {
            // error stored in githubStore
          }
          githubStore.reconfigurePolling();
        }

        await feedStore.maybeAutoSync();

        await listen("app://ready", async () => {
          await trayMenu.rebuild();
        });

        await listen("app://refresh-requested", async () => {
          if (!githubStore.hasToken) return;
          try {
            await githubStore.refresh({ source: "manual" });
          } catch {
            // error stored in githubStore
          }
        });
      } catch (err) {
        console.error("[GitPulse] background init failed:", err);
      } finally {
        githubStore.setBootstrapped(true);
      }
    })();
  });
}
