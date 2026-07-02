<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import type { ActivityEvent } from "@/github/itemDiff";

const props = defineProps<{ event: ActivityEvent }>();

const { t } = useI18n();

const ui = computed(() =>
  tv({
    slots: {
      row: "group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
      badge:
        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
      badgeAdded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      badgeUpdated: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
      main: "min-w-0 flex-1",
      title: "truncate text-sm font-medium text-slate-900 dark:text-slate-100",
      meta: "mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400",
      chip:
        "rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      kind:
        "rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
    },
  })(),
);

const changeLabel = computed(() =>
  props.event.change === "added"
    ? t("activity.changeAdded")
    : t("activity.changeUpdated"),
);

const kindLabel = computed(() => {
  switch (props.event.kind) {
    case "issue":
      return t("activity.kindIssue");
    case "pull_request":
      return t("activity.kindPullRequest");
    case "notification":
      return t("activity.kindNotification");
  }
});

const detectedLabel = computed(() =>
  new Date(props.event.detectedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
);

async function open() {
  try {
    await openUrl(props.event.url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.row()" @click="open">
    <span
      :class="[
        ui.badge(),
        event.change === 'added' ? ui.badgeAdded() : ui.badgeUpdated(),
      ]"
      :title="changeLabel"
    >
      {{ event.change === "added" ? "+" : "~" }}
    </span>
    <div :class="ui.main()">
      <p :class="ui.title()">
        <span v-if="event.number">#{{ event.number }} </span>{{ event.title }}
      </p>
      <div :class="ui.meta()">
        <span :class="ui.chip()">{{ event.repo }}</span>
        <span :class="ui.kind()">{{ kindLabel }}</span>
        <span>{{ changeLabel }}</span>
        <span>{{ detectedLabel }}</span>
      </div>
    </div>
  </button>
</template>
