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
  "pencil-outline": "i-mdi-pencil-outline",
  "content-copy": "i-mdi-content-copy",
  "delete-outline": "i-mdi-delete-outline",
  "help-circle-outline": "i-mdi-help-circle-outline",
  menu: "i-mdi-menu",
  close: "i-mdi-close",
  "format-list-bulleted": "i-mdi-format-list-bulleted",
  "layers-outline": "i-mdi-layers-outline",
  "rocket-launch-outline": "i-mdi-rocket-launch-outline",
} as const;

const props = withDefaults(
  defineProps<{
    name: string;
    size?: UiControlSize;
    ariaLabel?: string;
  }>(),
  {
    size: "sm",
    ariaLabel: "",
  },
);

const iconClass = computed(
  () =>
    ICON_CLASS_MAP[props.name as keyof typeof ICON_CLASS_MAP] ??
    ICON_CLASS_MAP["help-circle-outline"],
);
const sizeStyle = computed(() => {
  const value = uiSizeClasses.icon[props.size];
  return { width: value, height: value };
});
</script>

<template>
  <span
    :class="iconClass"
    :style="sizeStyle"
    :aria-label="ariaLabel || undefined"
    :role="ariaLabel ? 'img' : undefined"
  />
</template>
