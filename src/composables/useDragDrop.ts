import { ref } from "vue";
import { getCurrentWebview, type DragDropEvent } from "@tauri-apps/api/webview";
import { useTauriEventScope } from "./useTauriEventScope";

interface DragDropPoint {
  x: number;
  y: number;
}

export interface UseDragDropOptions {
  autoStart?: boolean;
  onOver?: (position: DragDropPoint) => void;
  onDrop?: (paths: string[], position: DragDropPoint) => void;
  onCancel?: () => void;
}

export interface DragDropErrorShape {
  message: string;
}

export function useDragDrop(options: UseDragDropOptions = {}) {
  const { track, unlistenAll } = useTauriEventScope();
  const isDragging = ref(false);
  const isListening = ref(false);
  const position = ref<DragDropPoint | null>(null);
  const droppedPaths = ref<string[]>([]);
  const lastEventType = ref<DragDropEvent["type"] | null>(null);
  const error = ref<DragDropErrorShape | null>(null);

  async function start() {
    if (isListening.value) return;
    error.value = null;
    try {
      await track(
        getCurrentWebview().onDragDropEvent((event) => {
          lastEventType.value = event.payload.type;

          if (event.payload.type === "enter" || event.payload.type === "over") {
            isDragging.value = true;
            position.value = {
              x: event.payload.position.x,
              y: event.payload.position.y,
            };
            if (event.payload.type === "over") {
              options.onOver?.(position.value);
            }
            return;
          }

          if (event.payload.type === "drop") {
            isDragging.value = false;
            droppedPaths.value = [...event.payload.paths];
            position.value = {
              x: event.payload.position.x,
              y: event.payload.position.y,
            };
            options.onDrop?.(droppedPaths.value, position.value);
            return;
          }

          isDragging.value = false;
          options.onCancel?.();
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
    isDragging.value = false;
  }

  if (options.autoStart !== false) {
    void start();
  }

  return {
    isDragging,
    isListening,
    position,
    droppedPaths,
    lastEventType,
    error,
    start,
    stop,
  };
}
