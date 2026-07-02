<script setup lang="ts">
import { useElementHover } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { tv } from "@/lib/tv";
import { useFloating } from "@/composables/ui/useFloating";
import { uiMotion } from "@/lib/ui-tv";

const props = withDefaults(defineProps<{ text: string }>(), { text: "" });
const open = ref(false);
const triggerRef = ref<HTMLElement | null>(null);
const tipRef = ref<HTMLElement | null>(null);
const isHovered = useElementHover(triggerRef);
const { floatingStyle, updatePosition } = useFloating(triggerRef, tipRef, {
  active: open,
  placement: "top-start",
  minWidthFromAnchor: false,
});

const tooltipTv = tv({
  slots: {
    tooltip: `max-w-[min(18rem,calc(100vw-1rem))] break-words rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg transition-all ${uiMotion.enter} dark:bg-slate-800`,
  },
});
const ui = computed(() => tooltipTv());

watch(isHovered, (hovered) => {
  open.value = hovered;
  if (hovered) updatePosition();
});
</script>

<template>
  <span ref="triggerRef" class="inline-flex">
    <slot />
  </span>
  <Teleport to="#overlay-root">
    <div v-if="open" ref="tipRef" :style="floatingStyle" :class="ui.tooltip()">
      {{ props.text }}
    </div>
  </Teleport>
</template>
