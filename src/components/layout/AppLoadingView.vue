<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { tv } from "@/lib/tv";

const { t } = useI18n();

const ui = computed(() =>
  tv({
    slots: {
      root: "flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center text-slate-900 dark:bg-slate-950 dark:text-slate-100",
      logo:
        "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-blue-600/30",
      title: "text-lg font-semibold",
      hint: "text-sm text-slate-500 dark:text-slate-400",
      spinner:
        "h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200",
    },
  })(),
);
</script>

<template>
  <div :class="ui.root()" role="status" aria-live="polite" :aria-label="t('app.loading')">
    <div :class="ui.logo()" aria-hidden="true">G</div>
    <p :class="ui.title()">GitPulse</p>
    <div :class="ui.spinner()" aria-hidden="true" />
    <p :class="ui.hint()">{{ t("app.loading") }}</p>
  </div>
</template>
