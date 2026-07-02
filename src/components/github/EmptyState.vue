<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";
import { BaseButton } from "@/components/ui";

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    actionLabel?: string;
  }>(),
  { description: "", actionLabel: "" },
);

const emit = defineEmits<{ action: [] }>();

const ui = computed(() =>
  tv({
    slots: {
      root: "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50",
      title: "text-base font-semibold text-slate-800 dark:text-slate-100",
      description: "max-w-sm text-sm text-slate-500 dark:text-slate-400",
    },
  })(),
);
</script>

<template>
  <div :class="ui.root()">
    <p :class="ui.title()">{{ props.title }}</p>
    <p v-if="props.description" :class="ui.description()">{{ props.description }}</p>
    <BaseButton v-if="props.actionLabel" size="sm" @click="emit('action')">
      {{ props.actionLabel }}
    </BaseButton>
    <slot />
  </div>
</template>
