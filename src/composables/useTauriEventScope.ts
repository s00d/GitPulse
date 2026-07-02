import { onScopeDispose } from "vue";
import type { UnlistenFn } from "@tauri-apps/api/event";

type MaybePromiseUnlisten = UnlistenFn | Promise<UnlistenFn>;

export function useTauriEventScope() {
  const unlistenCallbacks = new Set<UnlistenFn>();

  async function track(unlisten: MaybePromiseUnlisten) {
    const resolved = await unlisten;
    unlistenCallbacks.add(resolved);
    return resolved;
  }

  function unlistenAll() {
    for (const unlisten of unlistenCallbacks) {
      unlisten();
    }
    unlistenCallbacks.clear();
  }

  onScopeDispose(() => {
    unlistenAll();
  });

  return {
    track,
    unlistenAll,
  };
}
