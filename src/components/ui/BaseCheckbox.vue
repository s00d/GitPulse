<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { type UiControlSize, uiMotion } from "@/lib/ui-tv";

const model = defineModel<boolean>({ default: false });
const props = withDefaults(
  defineProps<{ disabled?: boolean; size?: UiControlSize; label?: string; fullWidth?: boolean }>(),
  { disabled: false, size: "md", label: "", fullWidth: false },
);

function toggle() {
  if (props.disabled) return;
  model.value = !model.value;
}

const checkTv = tv({
  slots: {
    wrapper:
      "inline-flex min-h-8 cursor-pointer select-none items-center gap-2 sm:min-h-9",
    box: `grid shrink-0 place-items-center rounded border border-slate-300 bg-white transition-all ${uiMotion.base} data-[checked=true]:border-indigo-600 data-[checked=true]:bg-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:data-[checked=true]:border-indigo-500 dark:data-[checked=true]:bg-indigo-500`,
    tick: "h-2.5 w-2.5 text-white",
    label: "text-sm leading-tight text-slate-700 dark:text-slate-200",
  },
  variants: {
    size: {
      "2xs": { box: "h-3 w-3", tick: "h-1.5 w-1.5" },
      xs: { box: "h-3.5 w-3.5", tick: "h-1.5 w-1.5" },
      sm: { box: "h-4 w-4", tick: "h-2 w-2" },
      md: { box: "h-5 w-5", tick: "h-2.5 w-2.5" },
      lg: { box: "h-5.5 w-5.5", tick: "h-3 w-3" },
      xl: { box: "h-6 w-6", tick: "h-3 w-3" },
    },
    fullWidth: {
      true: { wrapper: "flex w-full" },
      false: {},
    },
  },
});
const ui = computed(() => checkTv({ size: props.size, fullWidth: props.fullWidth }));
</script>

<template>
  <label
    :class="ui.wrapper()"
    :aria-disabled="props.disabled || undefined"
    @click.prevent="toggle"
  >
    <span
      role="checkbox"
      :aria-checked="model"
      :data-checked="model"
      :class="ui.box()"
    >
      <svg v-if="model" viewBox="0 0 16 16" fill="none" :class="ui.tick()">
        <path d="M3 8L6.5 11.5L13 5" stroke="currentColor" stroke-width="2" />
      </svg>
    </span>
    <span v-if="props.label" :class="ui.label()">{{ props.label }}</span>
  </label>
</template>
