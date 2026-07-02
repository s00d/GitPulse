<script setup lang="ts">
import { computed, ref } from "vue";
import { tv } from "@/lib/tv";
import { useOverlay } from "@/composables/ui/useOverlay";
import { useFloating } from "@/composables/ui/useFloating";
import { type UiControlSize, uiMotion, uiSizeClasses } from "@/lib/ui-tv";
import BaseIcon from "./BaseIcon.vue";

const model = defineModel<string | null>({ default: null });
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    options: Array<{ label: string; value: string }>;
    size?: UiControlSize;
    disabled?: boolean;
  }>(),
  { placeholder: "Select...", size: "md", disabled: false, options: () => [] },
);

const { isOpen, rootRef, toggle, close } = useOverlay({
  closeOnEscape: true,
  closeOnOutside: true,
});
const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const { floatingStyle } = useFloating(triggerRef, panelRef, {
  active: isOpen,
});

const selectedLabel = computed(
  () => props.options.find((o) => o.value === model.value)?.label ?? props.placeholder,
);

const selectTv = tv({
  slots: {
    trigger: `w-full rounded-xl border border-slate-300 bg-white text-left text-slate-700 transition-all ${uiMotion.base} hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-60`,
    panel: `rounded-xl border border-slate-200 bg-white p-1 shadow-lg transition-all ${uiMotion.enter} max-h-[min(20rem,calc(100vh-1rem))] overflow-y-auto dark:border-slate-700 dark:bg-slate-900`,
    item: "w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  },
  variants: {
    size: {
      "2xs": { trigger: uiSizeClasses.input["2xs"] },
      xs: { trigger: uiSizeClasses.input.xs },
      sm: { trigger: uiSizeClasses.input.sm },
      md: { trigger: uiSizeClasses.input.md },
      lg: { trigger: uiSizeClasses.input.lg },
      xl: { trigger: uiSizeClasses.input.xl },
    },
  },
});
const ui = computed(() => selectTv({ size: props.size }));
const iconName = "chevron-down";
</script>

<template>
  <div>
    <button
      ref="triggerRef"
      type="button"
      :disabled="props.disabled"
      :class="`${ui.trigger()} inline-flex items-center justify-between`"
      @pointerdown.stop
      @click="toggle()"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <BaseIcon
        :name="iconName"
        size="xs"
        :class="[
          'ml-2 shrink-0 transition-transform duration-200 ease-out',
          isOpen ? 'rotate-180' : 'rotate-0',
        ]"
      />
    </button>
    <Teleport to="#overlay-root">
      <div v-if="isOpen" ref="rootRef">
        <div ref="panelRef" :style="floatingStyle" :class="ui.panel()">
          <button
            v-for="item in props.options"
            :key="item.value"
            type="button"
            :class="ui.item()"
            @click="
              model = item.value;
              close();
            "
          >
            {{ item.label }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
