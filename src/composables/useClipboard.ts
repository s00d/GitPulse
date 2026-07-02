import { ref } from "vue";
import {
  readText as readClipboardText,
  writeText as writeClipboardText,
} from "@tauri-apps/plugin-clipboard-manager";

export function useClipboard() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastText = ref("");

  async function copyText(text: string) {
    isLoading.value = true;
    error.value = null;

    try {
      await writeClipboardText(text);
      lastText.value = text;
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function pasteText() {
    isLoading.value = true;
    error.value = null;

    try {
      const text = await readClipboardText();
      lastText.value = text;
      return text;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading,
    error,
    lastText,
    copyText,
    pasteText,
  };
}
