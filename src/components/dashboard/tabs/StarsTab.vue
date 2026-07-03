<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { EmptyState, RepoCard } from "@/components/github";
import { BaseButton, BaseIcon } from "@/components/ui";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { tv } from "@/lib/tv";
import { filterRepos } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";

const props = defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

type StarsSubTab = "starred" | "owned";

const activeTab = ref<StarsSubTab>("starred");

const starredRepos = computed(() => filterRepos(store.viewStarredRepos, searchQuery.value));
const ownedRepos = computed(() => filterRepos(store.viewOwnedRepos, searchQuery.value));

const tabs = computed(() => [
  { id: "starred" as const, label: t("dashboard.starsStarred"), count: starredRepos.value.length },
  { id: "owned" as const, label: t("dashboard.starsOwned"), count: ownedRepos.value.length },
]);

const activeRepos = computed(() =>
  activeTab.value === "starred" ? starredRepos.value : ownedRepos.value,
);

const emptyTitle = computed(() => {
  if (props.hasSearchQuery) return t("search.noResults");
  return activeTab.value === "starred" ? t("dashboard.noStars") : t("dashboard.noOwnedRepos");
});

watch(
  [starredRepos, ownedRepos],
  () => {
    if (activeTab.value === "starred" && !starredRepos.value.length && ownedRepos.value.length) {
      activeTab.value = "owned";
      return;
    }
    if (activeTab.value === "owned" && !ownedRepos.value.length && starredRepos.value.length) {
      activeTab.value = "starred";
    }
  },
  { immediate: true },
);

const ui = computed(() =>
  tv({
    slots: {
      root: "space-y-4",
      chips: "flex flex-wrap gap-2",
      chip: "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      chipIdle:
        "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40",
      chipActive:
        "border-indigo-500 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-100",
      grid: "grid gap-2 sm:grid-cols-2",
    },
  })(),
);

async function loadMore() {
  await store.loadMore(activeTab.value === "starred" ? "stars" : "ownedRepos");
}

const canLoadMore = computed(() => {
  if (props.hasSearchQuery) return false;
  return activeTab.value === "starred"
    ? store.starsPage.hasMore
    : store.ownedReposPage.hasMore;
});

const isLoadingMore = computed(() =>
  activeTab.value === "starred"
    ? store.starsPage.isLoadingMore
    : store.ownedReposPage.isLoadingMore,
);
</script>

<template>
  <div :class="ui.root()">
    <div :class="ui.chips()" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :class="[ui.chip(), activeTab === tab.id ? ui.chipActive() : ui.chipIdle()]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }} ({{ tab.count }})
      </button>
    </div>

    <div v-if="activeRepos.length" :class="ui.grid()">
      <RepoCard v-for="repo in activeRepos" :key="`${activeTab}-${repo.id}`" :repo="repo" />
    </div>
    <EmptyState v-else :title="emptyTitle" icon="star-outline" />

    <BaseButton
      v-if="activeRepos.length && canLoadMore"
      variant="outline"
      size="sm"
      :disabled="isLoadingMore"
      @click="loadMore"
    >
      <BaseIcon name="chevron-double-down" size="xs" />
      {{ isLoadingMore ? t("dashboard.loadingMore") : t("dashboard.loadMore") }}
    </BaseButton>
  </div>
</template>
