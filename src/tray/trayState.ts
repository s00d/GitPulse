import type { Ref } from "vue";

export function isTrayLoadingState(input: {
  isBootstrapped: Ref<boolean> | boolean;
  isLoading: Ref<boolean> | boolean;
  lastRefreshed: Ref<string | null> | string | null;
}): boolean {
  const bootstrapped =
    typeof input.isBootstrapped === "boolean" ? input.isBootstrapped : input.isBootstrapped.value;
  const loading = typeof input.isLoading === "boolean" ? input.isLoading : input.isLoading.value;
  const refreshed =
    typeof input.lastRefreshed === "string" || input.lastRefreshed === null
      ? input.lastRefreshed
      : input.lastRefreshed.value;

  return !bootstrapped || (loading && !refreshed);
}
