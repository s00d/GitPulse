<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterMilestoneGroups } from "@/github/search";
import { milestonesIndexUrl } from "@/github/milestones";
import { repoShort } from "@/github/types";
import { useGitHubStore } from "@/stores/githubStore";
import { EmptyState, MilestoneRow } from "@/components/github";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const groups = computed(() => filterMilestoneGroups(store.viewMilestoneGroups, searchQuery.value));
const selectedRepo = ref<string | null>(null);

const pickerEntries = computed(() =>
  groups.value.map((group) => ({
    repo: group.repo,
    count: group.totalOpenIssues,
  })),
);

watch(
  pickerEntries,
  (entries) => {
    if (!entries.length) {
      selectedRepo.value = null;
      return;
    }
    if (!selectedRepo.value || !entries.some((entry) => entry.repo === selectedRepo.value)) {
      selectedRepo.value = entries[0]?.repo ?? null;
    }
  },
  { immediate: true },
);

const selectedGroup = computed(
  () => groups.value.find((group) => group.repo === selectedRepo.value) ?? null,
);

const ui = computed(() =>
  tv({
    slots: {
      root: "grid grid-cols-1 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start",
      picker:
        "flex gap-2 overflow-x-auto pb-1 lg:max-h-[min(70vh,32rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0",
      pickerItem:
        "flex shrink-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors lg:w-full",
      pickerIdle:
        "border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/40",
      pickerActive:
        "border-indigo-500 bg-indigo-50 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-100",
      pickerName: "min-w-0 truncate font-medium",
      count: "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      detail: "min-w-0 space-y-3",
      link: "inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400",
    },
  })(),
);

async function openOverflow(url: string) {
  try {
    await openUrl(url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <div v-if="pickerEntries.length">
    <div :class="ui.root()">
      <aside :class="ui.picker()" role="listbox">
        <button
          v-for="entry in pickerEntries"
          :key="entry.repo"
          type="button"
          role="option"
          :aria-selected="selectedRepo === entry.repo"
          :class="[
            ui.pickerItem(),
            selectedRepo === entry.repo ? ui.pickerActive() : ui.pickerIdle(),
          ]"
          @click="selectedRepo = entry.repo"
        >
          <span :class="ui.pickerName()" :title="entry.repo">
            <span class="inline-flex items-center gap-1.5">
              <BaseIcon name="source-repository" size="xs" />
              {{ repoShort(entry.repo) }}
            </span>
          </span>
          <span :class="ui.count()">{{ entry.count }}</span>
        </button>
      </aside>

      <section :class="ui.detail()">
        <template v-if="selectedGroup">
          <MilestoneRow
            v-for="milestone in selectedGroup.milestones"
            :key="milestone.id"
            :milestone="milestone"
          />
          <a
            :class="ui.link()"
            href="#"
            @click.prevent="openOverflow(milestonesIndexUrl(selectedGroup.repo))"
          >
            <BaseIcon name="open-in-new" size="xs" />
            {{ t("dashboard.viewMilestonesOnGitHub") }}
          </a>
        </template>
        <EmptyState v-else :title="t('dashboard.selectRepo')" icon="source-repository" />
      </section>
    </div>
  </div>
  <EmptyState
    v-else
    :title="hasSearchQuery ? t('search.noResults') : t('dashboard.noMilestones')"
    icon="flag-outline"
  />
</template>
