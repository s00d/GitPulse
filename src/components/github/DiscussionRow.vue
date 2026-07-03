<script setup lang="ts">
import { computed, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import type { GitHubDiscussionItem } from "@/github/types";
import { useGitHubStore } from "@/stores/githubStore";

const props = defineProps<{ discussion: GitHubDiscussionItem }>();

const store = useGitHubStore();
const isMarking = ref(false);

const ui = computed(() =>
  tv({
    slots: {
      row: "group flex w-full items-start gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
      mainButton: "flex min-w-0 flex-1 items-start gap-3 text-left",
      indicator: "mt-1 shrink-0",
      indicatorUnread: "text-indigo-500 dark:text-indigo-400",
      indicatorRead: "text-slate-300 dark:text-slate-600",
      main: "min-w-0 flex-1",
      repo: "flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400",
      title: "truncate text-sm font-medium text-slate-900 dark:text-slate-100",
      meta: "mt-0.5 text-xs text-slate-500 dark:text-slate-400",
      markRead:
        "shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
    },
  })(),
);

async function openBrowser() {
  try {
    await openUrl(props.discussion.url);
  } catch {
    // ignore
  }
}

async function markRead() {
  if (!props.discussion.unread || isMarking.value) return;
  isMarking.value = true;
  try {
    await store.markDiscussionRead(props.discussion);
  } finally {
    isMarking.value = false;
  }
}
</script>

<template>
  <div :class="ui.row()">
    <button type="button" :class="ui.mainButton()" @click="openBrowser">
      <span
        :class="[
          ui.indicator(),
          props.discussion.unread ? ui.indicatorUnread() : ui.indicatorRead(),
        ]"
      >
        <BaseIcon :name="props.discussion.unread ? 'forum' : 'forum-outline'" size="sm" />
      </span>
      <div :class="ui.main()">
        <p :class="ui.repo()">
          <BaseIcon name="source-repository" size="xs" />
          {{ props.discussion.repo }}
        </p>
        <p :class="ui.title()">{{ props.discussion.title }}</p>
        <p :class="ui.meta()">
          {{ new Date(props.discussion.updatedAt).toLocaleDateString() }}
          <span v-if="props.discussion.category"> · {{ props.discussion.category }}</span>
        </p>
      </div>
    </button>
    <button
      v-if="props.discussion.unread"
      type="button"
      :class="ui.markRead()"
      :disabled="isMarking"
      @click="markRead"
    >
      Mark read
    </button>
  </div>
</template>
