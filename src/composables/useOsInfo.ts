import { ref } from "vue";
import {
  arch,
  exeExtension,
  family,
  locale,
  platform,
  type as osType,
  version,
  type Arch,
  type Family,
  type OsType,
  type Platform,
} from "@tauri-apps/plugin-os";

export interface OsInfo {
  platform: Platform;
  type: OsType;
  family: Family;
  version: string;
  arch: Arch;
  exeExtension: string;
  locale: string | null;
}

export interface OsInfoErrorShape {
  message: string;
}

export function useOsInfo() {
  const isLoading = ref(false);
  const error = ref<OsInfoErrorShape | null>(null);
  const info = ref<OsInfo | null>(null);

  async function loadOsInfo() {
    isLoading.value = true;
    error.value = null;

    try {
      const currentLocale = await locale();
      const osInfo: OsInfo = {
        platform: platform(),
        type: osType(),
        family: family(),
        version: version(),
        arch: arch(),
        exeExtension: exeExtension(),
        locale: currentLocale,
      };

      info.value = osInfo;
      return osInfo;
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading,
    error,
    info,
    loadOsInfo,
  };
}
