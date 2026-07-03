<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import { EmptyState, ProjectColumnRow, ProjectItemRow } from "@/components/github";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterProjectBoardGroups } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";
import { useSettingsStore } from "@/stores/settingsStore";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const settingsStore = useSettingsStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const groups = computed(() => filterProjectBoardGroups(store.projectBoardGroups, searchQuery.value));
const selectedProjectId = ref<string | null>(null);

const pickerEntries = computed(() =>
  groups.value.map((group) => ({
    id: group.id,
    title: group.title,
    count: group.totalOpenCount,
  })),
);

watch(
  pickerEntries,
  (entries) => {
    if (!entries.length) {
      selectedProjectId.value = null;
      return;
    }
    if (!selectedProjectId.value || !entries.some((entry) => entry.id === selectedProjectId.value)) {
      selectedProjectId.value = entries[0]?.id ?? null;
    }
  },
  { immediate: true },
);

const selectedGroup = computed(
  () => groups.value.find((group) => group.id === selectedProjectId.value) ?? null,
);

const needsSetup = computed(
  () => !settingsStore.trackedProjects.length && !groups.value.length,
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
      sectionTitle: "text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
      link: "inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400",
      hint: "text-sm text-slate-500 dark:text-slate-400",
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
  <EmptyState
    v-if="needsSetup"
    :title="t('dashboard.noProjects')"
    :description="t('dashboard.noProjectsHint')"
    icon="view-column-outline"
  />
  <div v-else-if="pickerEntries.length">
    <div :class="ui.root()">
      <aside :class="ui.picker()" role="listbox">
        <button
          v-for="entry in pickerEntries"
          :key="entry.id"
          type="button"
          role="option"
          :aria-selected="selectedProjectId === entry.id"
          :class="[
            ui.pickerItem(),
            selectedProjectId === entry.id ? ui.pickerActive() : ui.pickerIdle(),
          ]"
          @click="selectedProjectId = entry.id"
        >
          <span :class="ui.pickerName()" :title="entry.title">
            <span class="inline-flex items-center gap-1.5">
              <BaseIcon name="view-column-outline" size="xs" />
              {{ entry.title }}
            </span>
          </span>
          <span :class="ui.count()">{{ entry.count }}</span>
        </button>
      </aside>

      <section :class="ui.detail()">
        <template v-if="selectedGroup">
          <ProjectColumnRow
            v-for="column in selectedGroup.columns"
            :key="column.name"
            :column="column"
            :project-url="selectedGroup.url"
          />
          <template v-if="selectedGroup.recentItems.length">
            <h3 :class="ui.sectionTitle()">{{ t("dashboard.projectRecent") }}</h3>
            <ProjectItemRow
              v-for="item in selectedGroup.recentItems"
              :key="item.id"
              :item="item"
            />
          </template>
          <a
            :class="ui.link()"
            href="#"
            @click.prevent="openOverflow(selectedGroup.url)"
          >
            <BaseIcon name="open-in-new" size="xs" />
            {{ t("dashboard.viewProjectOnGitHub") }}
          </a>
        </template>
        <EmptyState v-else :title="t('dashboard.selectProject')" icon="view-column-outline" />
      </section>
    </div>
  </div>
  <EmptyState
    v-else
    :title="hasSearchQuery ? t('search.noResults') : t('dashboard.noProjectColumns')"
    icon="view-column-outline"
  />
</template>
