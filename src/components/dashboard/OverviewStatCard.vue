<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { BaseIcon, type BaseIconName } from "@/components/ui";
import type { DashboardTab } from "@/dashboard/types";

const props = defineProps<{
  label: string;
  value: number | string;
  targetTab: DashboardTab;
  icon: BaseIconName;
}>();

const emit = defineEmits<{ navigate: [DashboardTab] }>();

const ui = computed(() =>
  tv({
    slots: {
      card: "rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition-colors hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800",
      head: "flex items-center gap-2",
      icon: "text-slate-400 dark:text-slate-500",
      label: "text-xs font-medium text-slate-500 dark:text-slate-400",
      value: "mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100",
    },
  })(),
);
</script>

<template>
  <button type="button" :class="ui.card()" @click="emit('navigate', props.targetTab)">
    <div :class="ui.head()">
      <span :class="ui.icon()">
        <BaseIcon :name="props.icon" size="xs" />
      </span>
      <p :class="ui.label()">{{ props.label }}</p>
    </div>
    <p :class="ui.value()">{{ props.value }}</p>
  </button>
</template>
