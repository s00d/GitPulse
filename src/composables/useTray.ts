import { computed, onBeforeUnmount, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type TrayMenuId = "show_hide" | "quit" | string;

interface TrayMenuPayload {
  id: TrayMenuId;
}

export function useTray() {
  const isLoading = ref(false);
  const isWindowVisible = ref(true);
  const lastMenuAction = ref<TrayMenuId | null>(null);
  const error = ref<string | null>(null);
  const isSupported = computed(() => true);

  let unlistenMenu: (() => void) | null = null;

  async function run<T>(task: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;
    try {
      return await task();
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function syncState() {
    const visible = await run<boolean>(() => invoke("tray_is_window_visible"));
    isWindowVisible.value = visible;
    return visible;
  }

  async function toggleWindow() {
    const visible = await run<boolean>(() => invoke("tray_toggle_window"));
    isWindowVisible.value = visible;
    return visible;
  }

  async function setTooltip(_text: string) {
    // Optional placeholder: backend tray tooltip command can be added later.
    // Kept intentionally to provide stable composable API.
    return Promise.resolve();
  }

  async function init() {
    if (unlistenMenu) return;
    await syncState();
    unlistenMenu = await listen<TrayMenuPayload>("tray://menu", async (event) => {
      lastMenuAction.value = event.payload.id;
      if (event.payload.id === "show_hide") {
        await syncState();
      }
    });
  }

  onBeforeUnmount(() => {
    if (unlistenMenu) {
      unlistenMenu();
      unlistenMenu = null;
    }
  });

  return {
    isSupported,
    isLoading,
    isWindowVisible,
    lastMenuAction,
    error,
    init,
    syncState,
    toggleWindow,
    setTooltip,
  };
}
