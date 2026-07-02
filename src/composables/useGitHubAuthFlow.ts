import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type GitHubAuthStatus = "no_token" | "valid" | "invalid_scope";

export function useGitHubAuthFlow() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const deviceCode = ref<string | null>(null);
  const verificationUrl = ref<string | null>(null);

  let unlisteners: Array<() => void> = [];

  async function cleanupListeners() {
    for (const unlisten of unlisteners) {
      unlisten();
    }
    unlisteners = [];
  }

  async function checkStatus(token: string | null): Promise<GitHubAuthStatus> {
    return invoke<GitHubAuthStatus>("github_auth_status", { token });
  }

  async function verifyToken(token: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await invoke("github_auth_verify_token", { token });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error.value = message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function startDeviceLogin(): Promise<string> {
    deviceCode.value = null;
    verificationUrl.value = null;
    error.value = null;
    isLoading.value = true;

    await cleanupListeners();

    return new Promise<string>((resolve, reject) => {
      const onError = (message: string) => {
        error.value = message;
        isLoading.value = false;
        reject(new Error(message));
      };

      void (async () => {
        try {
          unlisteners.push(
            await listen<{ code: string }>("auth://device-code", (event) => {
              deviceCode.value = event.payload.code;
            }),
          );
          unlisteners.push(
            await listen<{ url: string }>("auth://verification-url", (event) => {
              verificationUrl.value = event.payload.url;
            }),
          );
          unlisteners.push(
            await listen<{ token: string }>("auth://device-completed", (event) => {
              isLoading.value = false;
              resolve(event.payload.token);
            }),
          );
          unlisteners.push(
            await listen<{ message: string }>("auth://device-error", (event) => {
              onError(event.payload.message);
            }),
          );

          await invoke("github_auth_device_start");
        } catch (err) {
          onError(err instanceof Error ? err.message : String(err));
        }
      })();
    });
  }

  async function cancelDeviceLogin() {
    try {
      await invoke("github_auth_device_cancel");
    } catch {
      // ignore
    }
    await cleanupListeners();
    deviceCode.value = null;
    verificationUrl.value = null;
    isLoading.value = false;
  }

  return {
    isLoading,
    error,
    deviceCode,
    verificationUrl,
    checkStatus,
    verifyToken,
    startDeviceLogin,
    cancelDeviceLogin,
    cleanupListeners,
  };
}
