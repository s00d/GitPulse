import { ref } from "vue";
import {
  ask,
  confirm,
  message,
  open,
  save,
  type ConfirmDialogOptions,
  type MessageDialogOptions,
  type MessageDialogResult,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from "@tauri-apps/plugin-dialog";

export interface DialogErrorShape {
  message: string;
}

export function useDialog() {
  const isLoading = ref(false);
  const error = ref<DialogErrorShape | null>(null);

  async function runWithState<T>(action: () => Promise<T>) {
    isLoading.value = true;
    error.value = null;

    try {
      return await action();
    } catch (err) {
      error.value = {
        message: err instanceof Error ? err.message : String(err),
      };
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  function showAsk(text: string, options?: string | ConfirmDialogOptions) {
    return runWithState(() => ask(text, options));
  }

  function showConfirm(text: string, options?: string | ConfirmDialogOptions) {
    return runWithState(() => confirm(text, options));
  }

  function showMessage(
    text: string,
    options?: string | MessageDialogOptions,
  ): Promise<MessageDialogResult> {
    return runWithState(() => message(text, options));
  }

  function pickOpen<T extends OpenDialogOptions>(options?: T) {
    return runWithState(() => open(options));
  }

  function pickSave(options?: SaveDialogOptions) {
    return runWithState(() => save(options));
  }

  return {
    isLoading,
    error,
    showAsk,
    showConfirm,
    showMessage,
    pickOpen,
    pickSave,
  };
}
