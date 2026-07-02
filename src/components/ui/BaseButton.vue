<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, uiSizeClasses, type UiControlSize } from "@/lib/ui-tv";

type ButtonSize = UiControlSize;
type ButtonVariant = "solid" | "outline" | "ghost" | "danger";

const props = withDefaults(
  defineProps<{
    as?: "button" | "a";
    type?: "button" | "submit" | "reset";
    size?: ButtonSize;
    variant?: ButtonVariant;
    disabled?: boolean;
    href?: string;
  }>(),
  {
    as: "button",
    type: "button",
    size: "md" as ButtonSize,
    variant: "solid",
    disabled: false,
    href: undefined,
  },
);

const buttonTv = tv({
  base: `inline-flex items-center justify-center rounded-xl font-medium transition-all ${uiMotion.base} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50`,
  variants: {
    size: {
      "2xs": uiSizeClasses.button["2xs"],
      xs: uiSizeClasses.button.xs,
      sm: uiSizeClasses.button.sm,
      md: uiSizeClasses.button.md,
      lg: uiSizeClasses.button.lg,
      xl: uiSizeClasses.button.xl,
    },
    variant: {
      solid:
        "bg-indigo-600 text-white hover:-translate-y-0.5 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400",
      outline:
        "border border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
      ghost:
        "bg-transparent text-slate-700 hover:-translate-y-0.5 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
      danger:
        "bg-rose-600 text-white hover:-translate-y-0.5 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400",
    },
  },
});

const classes = computed(() => buttonTv({ size: props.size, variant: props.variant }));
</script>

<template>
  <component
    :is="props.as"
    :href="props.as === 'a' ? props.href : undefined"
    :type="props.as === 'button' ? props.type : undefined"
    :disabled="props.as === 'button' ? props.disabled : undefined"
    :class="classes"
  >
    <slot />
  </component>
</template>
