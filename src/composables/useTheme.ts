import { useDark, useToggle } from "@vueuse/core";
import { computed } from "vue";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "app-theme";
const isDark = useDark({
  storageKey: STORAGE_KEY,
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "",
});
const theme = computed<ThemeMode>({
  get: () => (isDark.value ? "dark" : "light"),
  set: (value) => {
    isDark.value = value === "dark";
  },
});
const toggleDark = useToggle(isDark);

export function useTheme() {
  function toggleTheme() {
    toggleDark();
  }

  return {
    theme,
    toggleTheme,
  };
}

export function initTheme() {
  void isDark.value;
}
