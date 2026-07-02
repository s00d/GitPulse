import { ref } from "vue";
import { emit, emitTo, listen, once, type EventTarget } from "@tauri-apps/api/event";
import { useTauriEventScope } from "./useTauriEventScope";

export interface AppEventBusErrorShape {
  message: string;
}

export function useAppEventBus() {
  const { track, unlistenAll } = useTauriEventScope();
  const error = ref<AppEventBusErrorShape | null>(null);

  async function emitEvent<TPayload>(event: string, payload?: TPayload) {
    error.value = null;
    try {
      await emit(event, payload);
    } catch (err) {
      error.value = { message: err instanceof Error ? err.message : String(err) };
      throw err;
    }
  }

  async function emitEventTo<TPayload>(
    target: EventTarget | string,
    event: string,
    payload?: TPayload,
  ) {
    error.value = null;
    try {
      await emitTo(target, event, payload);
    } catch (err) {
      error.value = { message: err instanceof Error ? err.message : String(err) };
      throw err;
    }
  }

  async function listenEvent<TPayload>(event: string, handler: (payload: TPayload) => void) {
    error.value = null;
    try {
      return await track(
        listen<TPayload>(event, (eventPayload) => {
          handler(eventPayload.payload);
        }),
      );
    } catch (err) {
      error.value = { message: err instanceof Error ? err.message : String(err) };
      throw err;
    }
  }

  async function onceEvent<TPayload>(event: string, handler: (payload: TPayload) => void) {
    error.value = null;
    try {
      return await track(
        once<TPayload>(event, (eventPayload) => {
          handler(eventPayload.payload);
        }),
      );
    } catch (err) {
      error.value = { message: err instanceof Error ? err.message : String(err) };
      throw err;
    }
  }

  return {
    error,
    emitEvent,
    emitEventTo,
    listenEvent,
    onceEvent,
    unlistenAll,
  };
}
