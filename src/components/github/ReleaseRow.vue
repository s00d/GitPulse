<script setup lang="ts">
import { computed } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import type { GitHubRelease } from "@/github/types";

const props = defineProps<{ release: GitHubRelease; repo: string }>();

const ui = computed(() =>
  tv({
    slots: {
      row: "flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
      main: "min-w-0 flex-1",
      repo: "flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400",
      title: "truncate text-sm font-medium text-slate-900 dark:text-slate-100",
      meta: "mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400",
      badge:
        "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    },
  })(),
);

const displayTitle = computed(() => props.release.name || props.release.tag_name);

async function openRelease() {
  try {
    await openUrl(props.release.html_url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.row()" @click="openRelease">
    <BaseIcon name="tag-outline" size="sm" class="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
    <div :class="ui.main()">
      <p :class="ui.repo()">
        <BaseIcon name="source-repository" size="xs" />
        {{ props.repo }}
      </p>
      <p :class="ui.title()">{{ displayTitle }}</p>
      <p :class="ui.meta()">
        <span>{{ props.release.tag_name }}</span>
        <span v-if="props.release.published_at">
          {{ new Date(props.release.published_at).toLocaleDateString() }}
        </span>
        <span v-if="props.release.prerelease" :class="ui.badge()">Pre-release</span>
      </p>
    </div>
  </button>
</template>
