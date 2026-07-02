<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, uiSizeClasses, type UiControlSize } from "@/lib/ui-tv";

const model = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    size?: UiControlSize;
    variant?: "default" | "ghost";
    disabled?: boolean;
    type?: string;
  }>(),
  {
    placeholder: "",
    size: "md",
    variant: "default",
    disabled: false,
    type: "text",
  },
);

const inputTv = tv({
  base: `w-full rounded-xl border transition-all ${uiMotion.base} outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed`,
  variants: {
    size: {
      "2xs": uiSizeClasses.input["2xs"],
      xs: uiSizeClasses.input.xs,
      sm: uiSizeClasses.input.sm,
      md: uiSizeClasses.input.md,
      lg: uiSizeClasses.input.lg,
      xl: uiSizeClasses.input.xl,
    },
    variant: {
      default:
        "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600",
      ghost:
        "border-transparent bg-slate-100 text-slate-900 placeholder:text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:bg-slate-700",
    },
  },
});

const classes = computed(() => inputTv({ size: props.size, variant: props.variant }));
</script>

<template>
  <input
    v-model="model"
    :class="classes"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :type="props.type"
  />
</template>
