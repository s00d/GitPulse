import { ref } from "vue";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";

export interface AutostartErrorShape {
  message: string;
}

export function useAutostart() {
  const isLoading = ref(false);
  const error = ref<AutostartErrorShape | null>(null);
  const enabled = ref(false);

  async function run<T>(action: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;
    try {
      return await action();
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function syncState() {
    const state = await run(() => isAutostartEnabled());
    enabled.value = state;
    return state;
  }

  async function enable() {
    await run(() => enableAutostart());
    enabled.value = true;
  }

  async function disable() {
    await run(() => disableAutostart());
    enabled.value = false;
  }

  async function toggle(force?: boolean) {
    const next = force ?? !enabled.value;
    if (next) {
      await enable();
    } else {
      await disable();
    }
    return enabled.value;
  }

  return {
    isLoading,
    error,
    enabled,
    syncState,
    enable,
    disable,
    toggle,
  };
}
