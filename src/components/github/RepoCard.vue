<script setup lang="ts">
import { computed } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import { compactCount } from "@/github/menuFormat";
import type { StarredRepo, WatchedRepo } from "@/github/types";

const props = defineProps<{ repo: StarredRepo | WatchedRepo }>();

const ui = computed(() =>
  tv({
    slots: {
      card: "group w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800",
      name: "flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100",
      meta: "mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400",
      stars: "inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400",
      desc: "mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-400",
    },
  })(),
);

async function open() {
  try {
    await openUrl(props.repo.html_url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.card()" @click="open">
    <p :class="ui.name()">
      <BaseIcon name="source-repository" size="xs" />
      {{ props.repo.full_name }}
    </p>
    <div :class="ui.meta()">
      <span :class="ui.stars()">
        <BaseIcon name="star" size="xs" />
        {{ compactCount(props.repo.stargazers_count) }}
      </span>
      <span>{{ new Date(props.repo.updated_at).toLocaleDateString() }}</span>
    </div>
    <p v-if="props.repo.description" :class="ui.desc()">{{ props.repo.description }}</p>
  </button>
</template>
