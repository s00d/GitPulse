<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion } from "@/lib/ui-tv";

const props = defineProps<{
  items: Array<{ id: number; message: string; tone?: "info" | "success" | "error" }>;
}>();
const emit = defineEmits<{ dismiss: [number] }>();

const toastTv = tv({
  slots: {
    stack:
      "fixed left-2 right-2 top-2 z-[100] flex max-h-[calc(100vh-1rem)] w-auto flex-col gap-2 overflow-y-auto sm:left-auto sm:right-4 sm:top-4 sm:w-80",
    item: `rounded-xl border p-3 text-sm shadow-lg transition-all ${uiMotion.enter}`,
  },
  variants: {
    tone: {
      info: {
        item: "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
      },
      success: {
        item: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-200",
      },
      error: {
        item: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/60 dark:text-rose-200",
      },
    },
  },
});
const ui = computed(() => toastTv());
</script>

<template>
  <Teleport to="#overlay-root">
    <div :class="ui.stack()">
      <div
        v-for="item in props.items"
        :key="item.id"
        :class="toastTv({ tone: item.tone ?? 'info' }).item()"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="break-words">{{ item.message }}</span>
          <button type="button" class="text-xs opacity-70" @click="emit('dismiss', item.id)">
            close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
