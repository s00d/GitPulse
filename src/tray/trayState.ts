import type { Ref } from "vue";

/** Tray shows the minimal loading menu only until the first bootstrap pass finishes. */
export function isTrayLoadingState(input: {
  isBootstrapped: Ref<boolean> | boolean;
}): boolean {
  const bootstrapped =
    typeof input.isBootstrapped === "boolean" ? input.isBootstrapped : input.isBootstrapped.value;
  return !bootstrapped;
}
