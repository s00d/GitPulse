<script setup lang="ts">
import { computed } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import type { GitHubNotification } from "@/github/types";

const props = defineProps<{ notification: GitHubNotification }>();

const ui = computed(() =>
  tv({
    slots: {
      row: "group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
      indicator: "mt-1 shrink-0",
      indicatorUnread: "text-indigo-500 dark:text-indigo-400",
      indicatorRead: "text-slate-300 dark:text-slate-600",
      main: "min-w-0 flex-1",
      repo: "flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400",
      title: "truncate text-sm font-medium text-slate-900 dark:text-slate-100",
      meta: "mt-0.5 text-xs text-slate-500 dark:text-slate-400",
    },
  })(),
);

async function open() {
  const url = props.notification.subject.url ?? props.notification.repository.html_url;
  try {
    await openUrl(url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.row()" @click="open">
    <span
      :class="[
        ui.indicator(),
        props.notification.unread ? ui.indicatorUnread() : ui.indicatorRead(),
      ]"
    >
      <BaseIcon name="bell-outline" size="sm" />
    </span>
    <div :class="ui.main()">
      <p :class="ui.repo()">
        <BaseIcon name="source-repository" size="xs" />
        {{ props.notification.repository.full_name }}
      </p>
      <p :class="ui.title()">{{ props.notification.subject.title }}</p>
      <p :class="ui.meta()">{{ new Date(props.notification.updated_at).toLocaleDateString() }}</p>
    </div>
  </button>
</template>
