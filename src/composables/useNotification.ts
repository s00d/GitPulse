import { ref } from "vue";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  type Options as NotificationOptions,
} from "@tauri-apps/plugin-notification";

export interface NotifyPayload {
  title: string;
  body?: string;
}

export interface NotificationErrorShape {
  message: string;
}

export function useNotification() {
  const isLoading = ref(false);
  const permissionGranted = ref(false);
  const error = ref<NotificationErrorShape | null>(null);

  async function syncPermission() {
    try {
      permissionGranted.value = await isPermissionGranted();
    } catch {
      permissionGranted.value = false;
    }
    return permissionGranted.value;
  }

  async function requestNotificationPermission() {
    isLoading.value = true;
    error.value = null;

    try {
      const permission = await requestPermission();
      permissionGranted.value = permission === "granted";
      return permissionGranted.value;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function ensurePermission() {
    const granted = await syncPermission();
    if (granted) {
      return true;
    }

    return requestNotificationPermission();
  }

  async function notifyQuiet(payload: NotifyPayload | NotificationOptions) {
    try {
      const granted = await ensurePermission();
      if (!granted) {
        return false;
      }

      sendNotification(payload);
      return true;
    } catch {
      return false;
    }
  }

  async function notify(payload: NotifyPayload | NotificationOptions) {
    isLoading.value = true;
    error.value = null;

    try {
      const granted = await ensurePermission();
      if (!granted) {
        error.value = {
          message: "Notification permission was not granted",
        };
        return false;
      }

      sendNotification(payload);
      return true;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading,
    permissionGranted,
    error,
    syncPermission,
    requestNotificationPermission,
    ensurePermission,
    notify,
    notifyQuiet,
  };
}
