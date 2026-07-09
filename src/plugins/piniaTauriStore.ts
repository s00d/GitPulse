import type { PiniaPluginContext } from "pinia";
import { LazyStore } from "@tauri-apps/plugin-store";

interface PersistedStoreOptions {
  keyPrefix?: string;
  storePath?: string;
  autoSave?: boolean | number;
}

type InternalStoreMeta = {
  __tauriPersistHydrated?: Promise<void>;
};

const defaultOptions: Required<PersistedStoreOptions> = {
  keyPrefix: "pinia",
  storePath: "pinia-store.json",
  autoSave: 200,
};

/** Session-only fields that must not survive app restarts. */
const EPHEMERAL_STORE_KEYS: Record<string, readonly string[]> = {
  github: ["isLoading", "isBootstrapped"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function omitEphemeralKeys(storeId: string, state: Record<string, unknown>): Record<string, unknown> {
  const omit = EPHEMERAL_STORE_KEYS[storeId];
  if (!omit?.length) return state;

  const next = { ...state };
  for (const key of omit) {
    delete next[key];
  }
  return next;
}

export function createTauriPiniaPersistPlugin(options: PersistedStoreOptions = {}) {
  const resolved = { ...defaultOptions, ...options };
  const tauriStore = new LazyStore(resolved.storePath, {
    defaults: {},
    autoSave: resolved.autoSave,
  });

  return ({ store }: PiniaPluginContext) => {
    const storageKey = `${resolved.keyPrefix}:${store.$id}`;
    const withMeta = store as typeof store & InternalStoreMeta;

    withMeta.__tauriPersistHydrated = (async () => {
      await tauriStore.init();
      const savedState = await tauriStore.get<unknown>(storageKey);

      if (isRecord(savedState)) {
        store.$patch((state) => {
          Object.assign(state, omitEphemeralKeys(store.$id, savedState));
        });
      }
    })();

    store.$subscribe(
      async (_mutation, state) => {
        await withMeta.__tauriPersistHydrated;
        await tauriStore.set(
          storageKey,
          isRecord(state) ? omitEphemeralKeys(store.$id, state) : state,
        );
      },
      { detached: true },
    );
  };
}
