import type { ApiDebugEntry } from "@/github/apiDebug";
import { useApiDebugStore } from "@/stores/apiDebugStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function resolveGitHubDebugRecorder(): ((entry: ApiDebugEntry) => void) | undefined {
  try {
    const settingsStore = useSettingsStore();
    if (!settingsStore.menuVisibility.showApiDebug) return undefined;
    const debugStore = useApiDebugStore();
    return (entry) => debugStore.record(entry);
  } catch {
    return undefined;
  }
}
