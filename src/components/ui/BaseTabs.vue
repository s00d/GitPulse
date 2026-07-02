<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, type UiControlSize } from "@/lib/ui-tv";

const model = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{ items: Array<{ label: string; value: string }>; size?: UiControlSize }>(),
  { size: "md" },
);

const tabsTv = tv({
  slots: {
    root: "inline-flex w-full max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900",
    tab: `shrink-0 rounded-lg text-slate-600 transition-all ${uiMotion.base} hover:-translate-y-0.5 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`,
    active:
      "bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-500",
  },
  variants: {
    size: {
      "2xs": { tab: "px-2 py-1 text-[10px] sm:px-2 sm:py-1 sm:text-[10px]" },
      xs: { tab: "px-2.5 py-1 text-xs sm:px-2.5 sm:py-1 sm:text-xs" },
      sm: { tab: "px-2.5 py-1.5 text-xs sm:px-3 sm:py-1.5 sm:text-sm" },
      md: { tab: "px-3 py-1.5 text-sm sm:px-3.5 sm:py-1.5 sm:text-sm" },
      lg: { tab: "px-3.5 py-1.5 text-sm sm:px-4 sm:py-2 sm:text-base" },
      xl: { tab: "px-4 py-2 text-base sm:px-5 sm:py-2 sm:text-lg" },
    },
  },
});
const ui = computed(() => tabsTv({ size: props.size }));
</script>

<template>
  <div :class="ui.root()">
    <button
      v-for="item in props.items"
      :key="item.value"
      type="button"
      :class="[ui.tab(), model === item.value ? ui.active() : '']"
      @click="model = item.value"
    >
      {{ item.label }}
    </button>
  </div>
</template>
