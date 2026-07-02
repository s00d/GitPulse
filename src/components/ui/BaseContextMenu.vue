<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";
import { tv } from "@/lib/tv";
import { useOverlay } from "@/composables/ui/useOverlay";
import { uiMotion } from "@/lib/ui-tv";
import BaseIcon from "./BaseIcon.vue";

const props = withDefaults(
  defineProps<{
    items: Array<{
      id: string;
      label: string;
      disabled?: boolean;
      danger?: boolean;
      icon?: string;
    }>;
    x?: number;
    y?: number;
    modelValue?: boolean;
  }>(),
  {
    x: 0,
    y: 0,
    modelValue: false,
  },
);
const emit = defineEmits<{ "update:modelValue": [boolean]; select: [string] }>();
const { isOpen, rootRef, toggle, close } = useOverlay({
  closeOnOutside: true,
  closeOnEscape: true,
  initialOpen: props.modelValue,
});
const panelRef = ref<HTMLElement | null>(null);
const resolvedPos = ref({ x: props.x ?? 0, y: props.y ?? 0 });

function resolvePosition() {
  const panel = panelRef.value;
  if (!panel) return;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const padding = 8;

  const maxX = Math.max(padding, viewportWidth - panelWidth - padding);
  const maxY = Math.max(padding, viewportHeight - panelHeight - padding);

  resolvedPos.value = {
    x: Math.min(Math.max(props.x ?? 0, padding), maxX),
    y: Math.min(Math.max(props.y ?? 0, padding), maxY),
  };
}

function onViewportResize() {
  if (!isOpen.value) return;
  resolvePosition();
}

watch(
  () => props.modelValue,
  (next) => {
    toggle(next);
  },
  { immediate: true },
);
watch(isOpen, (next) => emit("update:modelValue", next));
watch(
  [isOpen, () => props.x, () => props.y],
  async ([open]) => {
    if (!open) return;
    await nextTick();
    resolvePosition();
  },
  { immediate: true },
);
useEventListener(window, "resize", onViewportResize);

const menuTv = tv({
  slots: {
    panel: `fixed z-[90] min-w-44 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl transition-all ${uiMotion.enter} dark:border-slate-700 dark:bg-slate-900`,
    item: "inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800",
    danger: "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50",
  },
});
const ui = computed(() => menuTv());
</script>

<template>
  <Teleport to="#overlay-root">
    <div v-if="isOpen">
      <div ref="rootRef" class="fixed inset-0 z-[89]" @contextmenu.prevent @click="close()" />
      <div
        ref="panelRef"
        :class="ui.panel()"
        :style="{ top: `${resolvedPos.y}px`, left: `${resolvedPos.x}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          :disabled="item.disabled"
          :class="[ui.item(), item.danger ? ui.danger() : '']"
          @click="
            emit('select', item.id);
            close();
          "
        >
          <BaseIcon v-if="item.icon" :name="item.icon" size="xs" />
          {{ item.label }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
