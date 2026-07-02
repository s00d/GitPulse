import { useScrollLock as useVueUseScrollLock } from "@vueuse/core";
import { watch, type Ref } from "vue";

export function useScrollLock(locked: Ref<boolean>) {
  if (typeof document === "undefined") return;

  const isBodyLocked = useVueUseScrollLock(document.body);
  watch(
    locked,
    (next) => {
      isBodyLocked.value = next;
    },
    { immediate: true },
  );
}
