<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, uiSizeClasses, type UiControlSize } from "@/lib/ui-tv";

const model = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{
    size?: UiControlSize;
    disabled?: boolean;
  }>(),
  {
    size: "md",
    disabled: false,
  },
);

const inputTv = tv({
  base: `w-full rounded-xl border border-slate-300 bg-white text-slate-900 transition-all ${uiMotion.base} outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:ring-indigo-500`,
  variants: {
    size: {
      "2xs": uiSizeClasses.input["2xs"],
      xs: uiSizeClasses.input.xs,
      sm: uiSizeClasses.input.sm,
      md: uiSizeClasses.input.md,
      lg: uiSizeClasses.input.lg,
      xl: uiSizeClasses.input.xl,
    },
  },
});

const classes = computed(() => inputTv({ size: props.size }));
</script>

<template>
  <input
    v-model="model"
    type="time"
    :class="classes"
    :disabled="props.disabled"
  />
</template>
