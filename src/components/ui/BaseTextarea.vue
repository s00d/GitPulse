<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { type UiControlSize, uiMotion } from "@/lib/ui-tv";

const model = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    size?: UiControlSize;
  }>(),
  { placeholder: "", rows: 4, disabled: false, size: "md" },
);
const rows = computed(() => props.rows);
const placeholder = computed(() => props.placeholder);
const disabled = computed(() => props.disabled);

const textareaTv = tv({
  base: `w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 transition-all ${uiMotion.base} outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus-visible:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed`,
  variants: {
    size: {
      "2xs": "px-2 py-1 text-[10px] sm:px-2 sm:py-1 sm:text-[10px]",
      xs: "px-2.5 py-1.5 text-xs sm:px-2.5 sm:py-1.5 sm:text-xs",
      sm: "px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm",
      md: "px-3 py-2 text-sm sm:px-3.5 sm:py-2.5 sm:text-sm",
      lg: "px-3.5 py-2.5 text-sm sm:px-4 sm:py-3 sm:text-base",
      xl: "px-4 py-3 text-base sm:px-4.5 sm:py-3.5 sm:text-lg",
    },
  },
});

const classes = computed(() => textareaTv({ size: props.size }));
</script>

<template>
  <textarea
    v-model="model"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="classes"
  />
</template>
