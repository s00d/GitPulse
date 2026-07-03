import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/composables/useTauriStore", () => ({
  useTauriStore: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { resolveGitHubDebugRecorder } from "@/github/apiDebugRecorder";
import { DEFAULT_MENU_VISIBILITY } from "@/settings/appSettings";
import { useApiDebugStore } from "@/stores/apiDebugStore";
import { useSettingsStore } from "@/stores/settingsStore";

describe("resolveGitHubDebugRecorder", () => {
  it("returns undefined when api debug section is disabled", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settingsStore = useSettingsStore();
    settingsStore.menuVisibility = { ...DEFAULT_MENU_VISIBILITY, showApiDebug: false };

    expect(resolveGitHubDebugRecorder()).toBeUndefined();
  });

  it("records entries when api debug section is enabled", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const settingsStore = useSettingsStore();
    const debugStore = useApiDebugStore();
    settingsStore.menuVisibility = { ...DEFAULT_MENU_VISIBILITY, showApiDebug: true };

    const recorder = resolveGitHubDebugRecorder();
    expect(recorder).toBeTypeOf("function");

    recorder?.({
      id: "dbg:1",
      startedAt: "2026-01-01T00:00:00.000Z",
      durationMs: 12,
      method: "GET",
      url: "https://api.github.com/user",
      requestHeaders: {},
    });

    expect(debugStore.entries).toHaveLength(1);
    expect(debugStore.entries[0]?.url).toContain("/user");
  });
});
