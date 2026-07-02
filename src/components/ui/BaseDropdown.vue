<script setup lang="ts">
import { computed, ref } from "vue";
import { tv } from "@/lib/tv";
import { useOverlay } from "@/composables/ui/useOverlay";
import { useFloating } from "@/composables/ui/useFloating";
import { type UiControlSize, uiMotion, uiSizeClasses } from "@/lib/ui-tv";
import BaseIcon from "./BaseIcon.vue";

const props = withDefaults(
  defineProps<{
    label?: string;
    items: Array<{ label: string; value: string }>;
    size?: UiControlSize;
  }>(),
  { label: "Open", items: () => [], size: "md" },
);

const emit = defineEmits<{ select: [string] }>();
const { isOpen, rootRef, toggle, close } = useOverlay({
  closeOnEscape: true,
  closeOnOutside: true,
});
const triggerRef = ref<HTMLElement | null>(null);
const listRef = ref<HTMLElement | null>(null);
const { floatingStyle } = useFloating(triggerRef, listRef, {
  active: isOpen,
  placement: "bottom-start",
});

const dropdownTv = tv({
  slots: {
    trigger: `inline-flex items-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-all ${uiMotion.base} hover:-translate-y-0.5 hover:bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`,
    panel: `rounded-xl border border-slate-200 bg-white p-1 shadow-lg transition-all ${uiMotion.enter} max-h-[min(20rem,calc(100vh-1rem))] overflow-y-auto dark:border-slate-700 dark:bg-slate-900`,
    item: "w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-all duration-150 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  },
  variants: {
    size: {
      "2xs": { trigger: uiSizeClasses.button["2xs"] },
      xs: { trigger: uiSizeClasses.button.xs },
      sm: { trigger: uiSizeClasses.button.sm },
      md: { trigger: uiSizeClasses.button.md },
      lg: { trigger: uiSizeClasses.button.lg },
      xl: { trigger: uiSizeClasses.button.xl },
    },
  },
});
const ui = computed(() => dropdownTv({ size: props.size }));
const iconName = "chevron-down";
</script>

<template>
  <div>
    <button
      ref="triggerRef"
      type="button"
      :class="ui.trigger()"
      @pointerdown.stop
      @click="toggle()"
    >
      <span>{{ props.label }}</span>
      <BaseIcon
        :name="iconName"
        size="xs"
        :class="[
          'ml-2 transition-transform duration-200 ease-out',
          isOpen ? 'rotate-180' : 'rotate-0',
        ]"
      />
    </button>
    <Teleport to="#overlay-root">
      <div v-if="isOpen" ref="rootRef">
        <div ref="listRef" :style="floatingStyle" :class="ui.panel()">
          <button
            v-for="item in props.items"
            :key="item.value"
            type="button"
            :class="ui.item()"
            @click="
              emit('select', item.value);
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
