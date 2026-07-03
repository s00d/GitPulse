<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, type UiControlSize } from "@/lib/ui-tv";

const model = defineModel<boolean>({ default: false });
const props = withDefaults(
  defineProps<{ disabled?: boolean; label?: string; size?: UiControlSize; fullWidth?: boolean }>(),
  {
    disabled: false,
    label: "",
    size: "md",
    fullWidth: false,
  },
);

function toggle() {
  if (props.disabled) return;
  model.value = !model.value;
}

const switchTv = tv({
  slots: {
    wrapper:
      "inline-flex min-h-8 cursor-pointer select-none items-center gap-2 sm:min-h-9",
    track: `relative shrink-0 rounded-full transition-all ${uiMotion.base} bg-slate-300 data-[on=true]:bg-indigo-600 dark:bg-slate-700 dark:data-[on=true]:bg-indigo-500`,
    thumb: `absolute rounded-full bg-white transition-all ${uiMotion.base}`,
    label: "text-sm leading-tight text-slate-700 dark:text-slate-200",
  },
  variants: {
    size: {
      "2xs": {
        track: "h-3.5 w-7",
        thumb: "top-0.5 left-0.5 h-2.5 w-2.5 data-[on=true]:translate-x-3",
      },
      xs: {
        track: "h-4 w-8",
        thumb: "top-0.5 left-0.5 h-3 w-3 data-[on=true]:translate-x-4",
      },
      sm: {
        track: "h-5 w-9",
        thumb: "top-0.5 left-0.5 h-4 w-4 data-[on=true]:translate-x-4",
      },
      md: {
        track: "h-6 w-11",
        thumb: "top-0.5 left-0.5 h-5 w-5 data-[on=true]:translate-x-5",
      },
      lg: {
        track: "h-7 w-12",
        thumb: "top-0.5 left-0.5 h-6 w-6 data-[on=true]:translate-x-5",
      },
      xl: {
        track: "h-8 w-14",
        thumb: "top-1 left-1 h-6 w-6 data-[on=true]:translate-x-6",
      },
    },
    fullWidth: {
      true: { wrapper: "flex w-full" },
      false: {},
    },
  },
});
const ui = computed(() => switchTv({ size: props.size, fullWidth: props.fullWidth }));
</script>

<template>
  <label
    :class="ui.wrapper()"
    :aria-disabled="props.disabled || undefined"
    @click.prevent="toggle"
  >
    <span
      role="switch"
      :aria-checked="model"
      :data-on="model"
      :class="ui.track()"
    >
      <span :data-on="model" :class="ui.thumb()" />
    </span>
    <span v-if="props.label" :class="ui.label()">{{ props.label }}</span>
  </label>
</template>
