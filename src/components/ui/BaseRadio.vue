<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion, type UiControlSize } from "@/lib/ui-tv";

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    value: string | number;
    label?: string;
    disabled?: boolean;
    size?: UiControlSize;
  }>(),
  { modelValue: undefined, label: "", disabled: false, size: "md" },
);

const emit = defineEmits<{ "update:modelValue": [string | number] }>();
const checked = computed(() => props.modelValue === props.value);
const radioTv = tv({
  slots: {
    wrapper: "inline-flex min-h-8 items-center gap-2 sm:min-h-9",
    outer: `rounded-full border border-slate-300 bg-white grid place-items-center transition-all ${uiMotion.base} data-[checked=true]:border-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:data-[checked=true]:border-indigo-500`,
    inner: "h-2.5 w-2.5 rounded-full bg-indigo-600",
    label: "text-sm leading-tight text-slate-700 dark:text-slate-200",
  },
  variants: {
    size: {
      "2xs": { outer: "h-3 w-3", inner: "h-1.5 w-1.5" },
      xs: { outer: "h-3.5 w-3.5", inner: "h-1.5 w-1.5" },
      sm: { outer: "h-4 w-4", inner: "h-2 w-2" },
      md: { outer: "h-5 w-5", inner: "h-2.5 w-2.5" },
      lg: { outer: "h-5.5 w-5.5", inner: "h-3 w-3" },
      xl: { outer: "h-6 w-6", inner: "h-3 w-3" },
    },
  },
});
const ui = computed(() => radioTv({ size: props.size }));
</script>

<template>
  <label :class="ui.wrapper()">
    <button
      type="button"
      :disabled="props.disabled"
      :data-checked="checked"
      :class="ui.outer()"
      @click="emit('update:modelValue', props.value)"
    >
      <span v-if="checked" :class="ui.inner()" />
    </button>
    <span v-if="props.label" :class="ui.label()">{{ props.label }}</span>
  </label>
</template>
