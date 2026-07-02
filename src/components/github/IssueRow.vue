<script setup lang="ts">
import { computed } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import type { GitHubIssue } from "@/github/types";
import { formatItemLabel } from "@/github/menuFormat";
import { isPullRequest, repoFullFromUrl } from "@/github/types";

const props = defineProps<{ issue: GitHubIssue; showRepo?: boolean }>();

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
      draft:
        "rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200",
      label:
        "rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
    },
  })(),
);

const label = computed(() => formatItemLabel(props.issue, 120));
const repoLabel = computed(() => repoFullFromUrl(props.issue.repository_url));
const rowIcon = computed(() => (isPullRequest(props.issue) ? "source-pull" : "circle-outline"));

async function open() {
  try {
    await openUrl(props.issue.html_url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.row()" @click="open">
    <span :class="ui.icon()">
      <BaseIcon :name="rowIcon" size="sm" />
    </span>
    <div :class="ui.main()">
      <p :class="ui.title()">{{ label }}</p>
      <div :class="ui.meta()">
        <span v-if="props.showRepo && repoLabel" :class="ui.chip()">
          <BaseIcon name="source-repository" size="xs" />
          {{ repoLabel }}
        </span>
        <span v-if="props.issue.draft" :class="ui.draft()">draft</span>
        <span v-for="l in props.issue.labels.slice(0, 2)" :key="l.id" :class="ui.label()">{{ l.name }}</span>
        <span>{{ new Date(props.issue.updated_at).toLocaleDateString() }}</span>
      </div>
    </div>
  </button>
</template>
