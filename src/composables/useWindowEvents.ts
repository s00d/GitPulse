import { ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTauriEventScope } from "./useTauriEventScope";

interface WindowPoint {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

export interface UseWindowEventsOptions {
  autoStart?: boolean;
  onFocusChanged?: (focused: boolean) => void;
  onResized?: (size: WindowSize) => void;
  onMoved?: (position: WindowPoint) => void;
}

export interface WindowEventsErrorShape {
  message: string;
}

export function useWindowEvents(options: UseWindowEventsOptions = {}) {
  const { track, unlistenAll } = useTauriEventScope();
  const isListening = ref(false);
  const isFocused = ref<boolean | null>(null);
  const size = ref<WindowSize | null>(null);
  const position = ref<WindowPoint | null>(null);
  const error = ref<WindowEventsErrorShape | null>(null);

  async function start() {
    if (isListening.value) return;
    error.value = null;

    try {
      const currentWindow = getCurrentWindow();

      await track(
        currentWindow.onFocusChanged((event) => {
          isFocused.value = event.payload;
          options.onFocusChanged?.(event.payload);
        }),
      );

      await track(
        currentWindow.onResized((event) => {
          size.value = { width: event.payload.width, height: event.payload.height };
          options.onResized?.(size.value);
        }),
      );

      await track(
        currentWindow.onMoved((event) => {
          position.value = { x: event.payload.x, y: event.payload.y };
          options.onMoved?.(position.value);
        }),
      );

      isListening.value = true;
    } catch (err) {
      error.value = { message: err instanceof Error ? err.message : String(err) };
    }
  }

  function stop() {
    unlistenAll();
    isListening.value = false;
  }

  if (options.autoStart !== false) {
    void start();
  }

  return {
    isListening,
    isFocused,
    size,
    position,
    error,
    start,
    stop,
    unlistenAll: stop,
  };
}
