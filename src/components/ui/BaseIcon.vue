<script setup lang="ts">
import { computed } from "vue";
import { uiSizeClasses, type UiControlSize } from "@/lib/ui-tv";

const ICON_CLASS_MAP = {
  translate: "i-mdi-translate",
  "weather-night": "i-mdi-weather-night",
  "white-balance-sunny": "i-mdi-white-balance-sunny",
  "chevron-down": "i-mdi-chevron-down",
  "chevron-right": "i-mdi-chevron-right",
  "chevron-up": "i-mdi-chevron-up",
  "chevron-double-down": "i-mdi-chevron-double-down",
  "pencil-outline": "i-mdi-pencil-outline",
  "content-copy": "i-mdi-content-copy",
  "delete-outline": "i-mdi-delete-outline",
  "help-circle-outline": "i-mdi-help-circle-outline",
  menu: "i-mdi-menu",
  close: "i-mdi-close",
  "format-list-bulleted": "i-mdi-format-list-bulleted",
  "layers-outline": "i-mdi-layers-outline",
  "rocket-launch-outline": "i-mdi-rocket-launch-outline",
  "view-dashboard-outline": "i-mdi-view-dashboard-outline",
  rss: "i-mdi-rss",
  "circle-outline": "i-mdi-circle-outline",
  "source-pull": "i-mdi-source-pull",
  "star-outline": "i-mdi-star-outline",
  star: "i-mdi-star",
  "eye-outline": "i-mdi-eye-outline",
  "bell-outline": "i-mdi-bell-outline",
  "cog-outline": "i-mdi-cog-outline",
  refresh: "i-mdi-refresh",
  sync: "i-mdi-sync",
  magnify: "i-mdi-magnify",
  github: "i-mdi-github",
  "open-in-new": "i-mdi-open-in-new",
  "window-minimize": "i-mdi-window-minimize",
  plus: "i-mdi-plus",
  minus: "i-mdi-minus",
  "account-outline": "i-mdi-account-outline",
  "source-repository": "i-mdi-source-repository",
  "inbox-outline": "i-mdi-inbox-outline",
  "package-variant-closed": "i-mdi-package-variant-closed",
  "key-outline": "i-mdi-key-outline",
  "timer-outline": "i-mdi-timer-outline",
  "bell-ring-outline": "i-mdi-bell-ring-outline",
  "palette-outline": "i-mdi-palette-outline",
  "link-variant": "i-mdi-link-variant",
  "close-circle-outline": "i-mdi-close-circle-outline",
  "source-commit": "i-mdi-source-commit",
  "tag-outline": "i-mdi-tag-outline",
  "forum-outline": "i-mdi-forum-outline",
  "flag-outline": "i-mdi-flag-outline",
  "view-column-outline": "i-mdi-view-column-outline",
  "history": "i-mdi-history",
  "download-outline": "i-mdi-download-outline",
  "dots-vertical": "i-mdi-dots-vertical",
  "check-circle-outline": "i-mdi-check-circle-outline",
} as const;

export type BaseIconName = keyof typeof ICON_CLASS_MAP;

const props = withDefaults(
  defineProps<{
    name: BaseIconName | (string & {});
    size?: UiControlSize;
    ariaLabel?: string;
    spin?: boolean;
  }>(),
  {
    size: "sm",
    ariaLabel: "",
    spin: false,
  },
);

const iconClass = computed(
  () =>
    ICON_CLASS_MAP[props.name as BaseIconName] ?? ICON_CLASS_MAP["help-circle-outline"],
);
const sizeStyle = computed(() => {
  const value = uiSizeClasses.icon[props.size];
  return { width: value, height: value };
});
</script>

<template>
  <span
    :class="[iconClass, spin ? 'animate-spin' : '']"
    :style="sizeStyle"
    :aria-label="ariaLabel || undefined"
    :role="ariaLabel ? 'img' : undefined"
  />
</template>
