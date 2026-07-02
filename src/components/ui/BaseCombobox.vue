<script setup lang="ts">
import { computed, ref } from "vue";
import { tv } from "@/lib/tv";
import BaseInput from "@/components/ui/BaseInput.vue";
import { useOverlay } from "@/composables/ui/useOverlay";
import { useFloating } from "@/composables/ui/useFloating";
import { type UiControlSize, uiMotion } from "@/lib/ui-tv";

const model = defineModel<string | null>({ default: null });
const props = withDefaults(
  defineProps<{
    options: Array<{ label: string; value: string }>;
    placeholder?: string;
    size?: UiControlSize;
  }>(),
  { options: () => [], placeholder: "Search...", size: "md" },
);

const query = ref("");
const { isOpen, rootRef, open, close } = useOverlay({ closeOnOutside: true, closeOnEscape: true });
const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const { floatingStyle } = useFloating(triggerRef, panelRef, {
  active: isOpen,
});

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((opt) => opt.label.toLowerCase().includes(q));
});

const comboTv = tv({
  slots: {
    panel: `rounded-xl border border-slate-200 bg-white p-1 shadow-lg transition-all ${uiMotion.enter} max-h-[min(20rem,calc(100vh-1rem))] overflow-y-auto dark:border-slate-700 dark:bg-slate-900`,
    item: "w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-all duration-150 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    empty: "px-3 py-2 text-sm text-slate-500 dark:text-slate-400",
  },
});
const ui = computed(() => comboTv());
</script>

<template>
  <div ref="triggerRef">
    <BaseInput
      v-model="query"
      :size="props.size"
      :placeholder="props.placeholder"
      @focus="open()"
      @input="open()"
    />
  </div>
  <Teleport to="#overlay-root">
    <div v-if="isOpen" ref="rootRef">
      <div ref="panelRef" :style="floatingStyle" :class="ui.panel()">
        <button
          v-for="item in filtered"
          :key="item.value"
          type="button"
          :class="ui.item()"
          @click="
            model = item.value;
            query = item.label;
            close();
          "
        >
          {{ item.label }}
        </button>
        <p v-if="!filtered.length" :class="ui.empty()">No results</p>
      </div>
    </div>
  </Teleport>
</template>
