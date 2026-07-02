import { onScopeDispose, ref, shallowRef, watch, type Ref } from "vue";
import { LazyStore, type StoreOptions } from "@tauri-apps/plugin-store";

export interface TauriStoreErrorShape {
  message: string;
}

export interface UseTauriStoreOptions {
  defaults?: Record<string, unknown>;
  autoSave?: StoreOptions["autoSave"];
}

export interface UseTauriStoreKeyOptions {
  syncToStore?: boolean;
  debounceMs?: number;
}

type StoreCacheEntry = {
  store: LazyStore;
  initPromise: Promise<void>;
};

const STORES_CACHE: Record<string, StoreCacheEntry> = {};

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function useTauriStore<TSchema extends Record<string, unknown>>(
  path: string,
  options: UseTauriStoreOptions = {},
) {
  if (!STORES_CACHE[path]) {
    const store = new LazyStore(path, {
      defaults: options.defaults ?? {},
      autoSave: options.autoSave ?? 200,
    });
    STORES_CACHE[path] = {
      store,
      initPromise: store.init(),
    };
  }

  const { store, initPromise } = STORES_CACHE[path];
  const isReady = ref(false);
  const isLoading = ref(false);
  const error = ref<TauriStoreErrorShape | null>(null);

  async function run<T>(action: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;
    try {
      return await action();
    } catch (err) {
      error.value = { message: toErrorMessage(err) };
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function ensureReady() {
    try {
      await initPromise;
      isReady.value = true;
    } catch (err) {
      error.value = { message: toErrorMessage(err) };
      throw err;
    }
  }

  async function runStore<T>(operation: () => Promise<T>) {
    await ensureReady();
    return run(operation);
  }

  async function init() {
    await ensureReady();
  }

  async function useKey<K extends keyof TSchema>(
    key: K,
    keyOptions: UseTauriStoreKeyOptions = {},
  ): Promise<Ref<TSchema[K]>> {
    await ensureReady();

    const { syncToStore = true, debounceMs = 150 } = keyOptions;
    const keyName = String(key);
    const initialValue = ((await store.get<TSchema[K]>(keyName)) ??
      options.defaults?.[keyName]) as TSchema[K];
    const data = shallowRef(initialValue) as Ref<TSchema[K]>;
    let skipNextSync = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unlisten = await store.onKeyChange<TSchema[K]>(keyName, (newValue) => {
      skipNextSync = true;
      data.value = (newValue ??
        (options.defaults?.[keyName] as TSchema[K] | undefined)) as TSchema[K];
    });

    const stopWatch = watch(
      data,
      (value) => {
        if (!syncToStore) {
          return;
        }

        if (skipNextSync) {
          skipNextSync = false;
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }

        timer = setTimeout(() => {
          void runStore(() => store.set(keyName, value));
        }, debounceMs);
      },
      { deep: true },
    );

    onScopeDispose(() => {
      stopWatch();
      if (timer) {
        clearTimeout(timer);
      }
      void unlisten();
    });

    return data;
  }

  function get<K extends keyof TSchema>(key: K) {
    return runStore(() => store.get<TSchema[K]>(String(key)));
  }

  function set<K extends keyof TSchema>(key: K, value: TSchema[K]) {
    return runStore(() => store.set(String(key), value));
  }

  function has<K extends keyof TSchema>(key: K) {
    return runStore(() => store.has(String(key)));
  }

  function remove<K extends keyof TSchema>(key: K) {
    return runStore(() => store.delete(String(key)));
  }

  function clear() {
    return runStore(() => store.clear());
  }

  function reset() {
    return runStore(() => store.reset());
  }

  function keys() {
    return runStore(() => store.keys());
  }

  function values<TValue = TSchema[keyof TSchema]>() {
    return runStore(() => store.values<TValue>());
  }

  function entries<TValue = TSchema[keyof TSchema]>() {
    return runStore(() => store.entries<TValue>());
  }

  function save() {
    return runStore(() => store.save());
  }

  function reload(ignoreDefaults = false) {
    return runStore(() => store.reload({ ignoreDefaults }));
  }

  return {
    isReady,
    isLoading,
    error,
    init,
    useKey,
    get,
    set,
    has,
    remove,
    clear,
    reset,
    keys,
    values,
    entries,
    save,
    reload,
  };
}
