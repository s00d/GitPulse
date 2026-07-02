<script setup lang="ts">
import { onClickOutside, onKeyStroke } from "@vueuse/core";
import { computed, ref } from "vue";
import { useBottomSheetDismiss } from "@/composables/ui/useBottomSheetDismiss";
import { tv } from "@/lib/tv";
import { useFocusTrap } from "@/composables/ui/useFocusTrap";
import { useScrollLock } from "@/composables/ui/useScrollLock";
import { uiMotion } from "@/lib/ui-tv";
import BaseIcon from "./BaseIcon.vue";

const model = defineModel<boolean>({ default: false });
const props = withDefaults(
  defineProps<{ title?: string; closeOnOutside?: boolean; closeOnEscape?: boolean }>(),
  { title: "", closeOnOutside: true, closeOnEscape: true },
);

const rootRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
useScrollLock(model);
useFocusTrap(panelRef, model);
const { sheetStyle } = useBottomSheetDismiss({
  active: model,
  panelRef,
  onDismiss: () => {
    model.value = false;
  },
});
onClickOutside(rootRef, () => {
  if (!props.closeOnOutside || !model.value) return;
  model.value = false;
});
onKeyStroke("Escape", () => {
  if (!props.closeOnEscape || !model.value) return;
  model.value = false;
});

const modalTv = tv({
  slots: {
    backdrop: `fixed inset-0 z-[1090] bg-black/35 backdrop-blur-sm transition-opacity ${uiMotion.base}`,
    wrap: "fixed inset-0 z-[1100] grid items-end p-1 sm:p-2 md:place-items-center md:p-4",
    panel: `w-full overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-xl outline-none transition-all ${uiMotion.enter} max-h-[calc(100vh-0.5rem)] sm:max-h-[calc(100vh-1rem)] md:max-w-lg md:max-h-[calc(100vh-2rem)] md:rounded-2xl dark:border-slate-700 dark:bg-slate-900`,
    dragHandleWrap:
      "flex items-center justify-center border-b border-slate-200 py-2 md:hidden dark:border-slate-700",
    dragHandle: "h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600",
    header:
      "flex items-start justify-between gap-3 border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4 dark:border-slate-700",
    title: "text-base font-semibold leading-tight text-slate-900 dark:text-slate-100",
    content: "overflow-y-auto px-3 py-3 text-sm text-slate-700 sm:px-5 sm:py-4 dark:text-slate-300",
    footer:
      "flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-3 py-3 sm:px-5 sm:py-4 dark:border-slate-700",
    close:
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-indigo-500",
  },
});
const ui = computed(() => modalTv());
</script>

<template>
  <Teleport to="#overlay-root">
    <div v-if="model" :class="ui.backdrop()" />
    <div v-if="model" :class="ui.wrap()">
      <div ref="rootRef" class="contents">
        <section
          ref="panelRef"
          tabindex="-1"
          role="dialog"
          aria-modal="true"
          :class="ui.panel()"
          :style="sheetStyle"
        >
          <div :class="ui.dragHandleWrap()">
            <span :class="ui.dragHandle()" />
          </div>
          <header :class="ui.header()">
            <h3 :class="ui.title()">{{ props.title }}</h3>
            <button
              type="button"
              :class="ui.close()"
              aria-label="Close modal"
              @click="model = false"
            >
              <BaseIcon name="close" size="sm" />
            </button>
          </header>
          <div :class="ui.content()"><slot /></div>
          <footer :class="ui.footer()"><slot name="footer" /></footer>
        </section>
      </div>
    </div>
  </Teleport>
</template>
