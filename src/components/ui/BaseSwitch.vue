<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, type UiControlSize } from "@/lib/ui-tv";

const model = defineModel<boolean>({ default: false });
const props = withDefaults(
  defineProps<{ disabled?: boolean; label?: string; size?: UiControlSize }>(),
  {
    disabled: false,
    label: "",
    size: "md",
  },
);
const disabled = computed(() => props.disabled);
const label = computed(() => props.label);

const switchTv = tv({
  slots: {
    wrapper: "inline-flex min-h-8 items-center gap-2 sm:min-h-9",
    track: `relative rounded-full transition-all ${uiMotion.base} bg-slate-300 data-[on=true]:bg-indigo-600 dark:bg-slate-700 dark:data-[on=true]:bg-indigo-500`,
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
  },
});
const ui = computed(() => switchTv({ size: props.size }));
</script>

<template>
  <label :class="ui.wrapper()">
    <button
      type="button"
      :disabled="disabled"
      :data-on="model"
      :class="ui.track()"
      @click="model = !model"
    >
      <span :data-on="model" :class="ui.thumb()" />
    </button>
    <span v-if="label" :class="ui.label()">{{ label }}</span>
  </label>
</template>
