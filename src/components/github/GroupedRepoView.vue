<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { prCategoryLabel } from "@/dashboard/labels";
import { issueRepoKey, prRepoKey } from "@/github/countDiff";
import type { GitHubIssue, PrCategoryKind, PrRepoGroup, RepoGroup } from "@/github/types";
import { repoShort } from "@/github/types";
import { useRefreshStore } from "@/stores/refreshStore";
import EmptyState from "./EmptyState.vue";
import IssueRow from "./IssueRow.vue";

const props = defineProps<{
  mode: "issues" | "prs";
  issueGroups?: RepoGroup<GitHubIssue>[];
  prGroups?: PrRepoGroup[];
  emptyTitle: string;
}>();

const { t } = useI18n();
const refreshStore = useRefreshStore();
const selectedRepo = ref<string | null>(null);
const selectedCategory = ref<PrCategoryKind | null>(null);

const repoKeys = computed(() => {
  if (props.mode === "issues") {
    return (props.issueGroups ?? []).map((group) => group.repo);
  }
  return (props.prGroups ?? []).map((group) => group.repo);
});

watch(
  repoKeys,
  (keys) => {
    if (!keys.length) {
      selectedRepo.value = null;
      return;
    }
    if (!selectedRepo.value || !keys.includes(selectedRepo.value)) {
      selectedRepo.value = keys[0] ?? null;
    }
  },
  { immediate: true },
);

const pickerEntries = computed(() => {
  if (props.mode === "issues") {
    return (props.issueGroups ?? []).map((group) => ({
      repo: group.repo,
      count: group.totalCount,
      delta: refreshStore.getCountDelta(issueRepoKey(group.repo)),
    }));
  }
  return (props.prGroups ?? []).map((group) => ({
    repo: group.repo,
    count: group.totalCount,
    delta: refreshStore.getCountDelta(prRepoKey(group.repo)),
  }));
});

const selectedIssueGroup = computed(
  () => (props.issueGroups ?? []).find((group) => group.repo === selectedRepo.value) ?? null,
);

const selectedPrGroup = computed(
  () => (props.prGroups ?? []).find((group) => group.repo === selectedRepo.value) ?? null,
);

const visibleCategories = computed(() => {
  const group = selectedPrGroup.value;
  if (!group) return [];
  return group.categories
    .filter((category) => category.items.length > 0 || category.overflowUrl)
    .map((category) => ({
      kind: category.kind,
      count: category.totalCount,
      label: prCategoryLabel(t, category.kind, category.totalCount),
      items: category.items,
      overflowUrl: category.overflowUrl,
    }));
});

const activeCategory = computed(
  () => visibleCategories.value.find((category) => category.kind === selectedCategory.value) ?? null,
);

watch(
  visibleCategories,
  (categories) => {
    if (!categories.length) {
      selectedCategory.value = null;
      return;
    }
    if (!selectedCategory.value || !categories.some((c) => c.kind === selectedCategory.value)) {
      selectedCategory.value = categories[0]?.kind ?? null;
    }
  },
  { immediate: true },
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
      badges: "flex shrink-0 items-center gap-1",
      count: "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      delta:
        "rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      detail: "min-w-0 space-y-3",
      chips: "flex flex-wrap gap-2",
      chip: "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      chipIdle:
        "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40",
      chipActive:
        "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-100",
      link: "inline-flex text-sm font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400",
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
          <span :class="ui.pickerName()" :title="entry.repo">{{ repoShort(entry.repo) }}</span>
          <span :class="ui.badges()">
            <span v-if="entry.delta > 0" :class="ui.delta()">↑{{ entry.delta }}</span>
            <span :class="ui.count()">{{ entry.count }}</span>
          </span>
        </button>
      </aside>

      <section :class="ui.detail()">
        <template v-if="mode === 'issues' && selectedIssueGroup">
          <IssueRow
            v-for="issue in selectedIssueGroup.items"
            :key="issue.id"
            :issue="issue"
          />
          <a
            v-if="selectedIssueGroup.overflowUrl"
            :class="ui.link()"
            href="#"
            @click.prevent="openOverflow(selectedIssueGroup.overflowUrl!)"
          >
            {{ t("dashboard.viewMoreOnGitHub") }}
          </a>
        </template>

        <template v-else-if="mode === 'prs' && selectedPrGroup">
          <div v-if="visibleCategories.length > 1" :class="ui.chips()" role="tablist">
            <button
              v-for="category in visibleCategories"
              :key="category.kind"
              type="button"
              role="tab"
              :aria-selected="selectedCategory === category.kind"
              :class="[
                ui.chip(),
                selectedCategory === category.kind ? ui.chipActive() : ui.chipIdle(),
              ]"
              @click="selectedCategory = category.kind"
            >
              {{ category.label }}
            </button>
          </div>

          <template v-if="activeCategory">
            <IssueRow v-for="pr in activeCategory.items" :key="pr.id" :issue="pr" />
            <a
              v-if="activeCategory.overflowUrl"
              :class="ui.link()"
              href="#"
              @click.prevent="openOverflow(activeCategory.overflowUrl!)"
            >
              {{ t("dashboard.viewMoreOnGitHub") }}
            </a>
          </template>
          <EmptyState v-else :title="t('dashboard.noPullRequests')" />
        </template>

        <EmptyState v-else :title="t('dashboard.selectRepo')" />
      </section>
    </div>
  </div>
  <EmptyState v-else :title="emptyTitle" />
</template>
