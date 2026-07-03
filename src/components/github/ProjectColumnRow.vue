<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import type { ProjectColumn } from "@/github/types";

const props = defineProps<{ column: ProjectColumn; projectUrl: string }>();

const { t } = useI18n();

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

async function open() {
  try {
    await openUrl(props.projectUrl);
  } catch {
    // ignore
  }
}
</script>

<template>
  <button type="button" :class="ui.row()" @click="open">
    <span :class="ui.icon()">
      <BaseIcon name="view-column-outline" size="sm" />
    </span>
    <div :class="ui.main()">
      <p :class="ui.title()">{{ column.name }}</p>
      <div :class="ui.meta()">
        <span :class="ui.chip()">
          {{ t("project.openCount", { count: column.openCount }) }}
        </span>
      </div>
    </div>
  </button>
</template>
