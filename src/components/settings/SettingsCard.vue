<script setup lang="ts">
import { computed } from "vue";
import { tv } from "@/lib/tv";

defineProps<{ title?: string }>();

const ui = computed(() =>
  tv({
    slots: {
      card: "space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
      sectionTitle: "text-sm font-semibold uppercase tracking-wide text-slate-500",
    },
  })(),
);
</script>

<template>
  <section :class="ui.card()">
    <h2 v-if="title" :class="ui.sectionTitle()">{{ title }}</h2>
    <slot />
  </section>
</template>
