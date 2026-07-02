import { ref } from "vue";
import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
  type DirEntry,
} from "@tauri-apps/plugin-fs";

export interface FsErrorShape {
  message: string;
  path?: string;
}

export interface UseFsOptions {
  defaultBaseDir?: BaseDirectory;
}

export function useFs(options: UseFsOptions = {}) {
  const isLoading = ref(false);
  const error = ref<FsErrorShape | null>(null);

  const defaultBaseDir = options.defaultBaseDir ?? BaseDirectory.AppLocalData;

  async function withState<T>(path: string, action: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;

    try {
      return await action();
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
        path,
      };
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function readText(path: string, baseDir = defaultBaseDir) {
    return withState(path, () => readTextFile(path, { baseDir }));
  }

  function writeText(path: string, content: string, baseDir = defaultBaseDir) {
    return withState(path, () => writeTextFile(path, content, { baseDir }));
  }

  function pathExists(path: string, baseDir = defaultBaseDir) {
    return withState(path, () => exists(path, { baseDir }));
  }

  function makeDir(path: string, recursive = true, baseDir = defaultBaseDir) {
    return withState(path, () => mkdir(path, { recursive, baseDir }));
  }

  function removePath(path: string, recursive = false, baseDir = defaultBaseDir) {
    return withState(path, () => remove(path, { recursive, baseDir }));
  }

  function listDir(path: string, baseDir = defaultBaseDir): Promise<DirEntry[]> {
    return withState(path, () => readDir(path, { baseDir }));
  }

  return {
    isLoading,
    error,
    defaultBaseDir,
    readText,
    writeText,
    pathExists,
    makeDir,
    removePath,
    listDir,
  };
}
