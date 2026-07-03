<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import type { GitHubMilestone } from "@/github/types";

const props = defineProps<{ milestone: GitHubMilestone }>();

const { t, locale } = useI18n();

const ui = computed(() =>
  tv({
    slots: {
      row: "group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
      icon: "mt-0.5 shrink-0 text-slate-400 dark:text-slate-500",
      main: "min-w-0 flex-1",
      title: "truncate text-sm font-medium text-slate-900 dark:text-slate-100",
      meta: "mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400",
      chip:
        "inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
  })(),
);

const dueLabel = computed(() => {
  if (!props.milestone.due_on) return null;
  return t("milestone.due", {
    date: new Date(props.milestone.due_on).toLocaleDateString(locale.value),
  });
});

async function open() {
  try {
    await openUrl(props.milestone.html_url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.row()" @click="open">
    <span :class="ui.icon()">
      <BaseIcon name="flag-outline" size="sm" />
    </span>
    <div :class="ui.main()">
      <p :class="ui.title()">{{ milestone.title }}</p>
      <div :class="ui.meta()">
        <span :class="ui.chip()">
          {{ t("milestone.openCount", { count: milestone.open_issues }) }}
        </span>
        <span v-if="dueLabel">{{ dueLabel }}</span>
      </div>
    </div>
  </button>
</template>
