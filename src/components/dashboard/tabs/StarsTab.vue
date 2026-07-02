<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { EmptyState, RepoCard } from "@/components/github";
import { BaseButton, BaseIcon } from "@/components/ui";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterRepos } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const repos = computed(() => filterRepos(store.starredRepos, searchQuery.value));

async function loadMore() {
  await store.loadMore("stars");
}
</script>

<template>
  <div v-if="repos.length" class="space-y-3">
    <div class="grid gap-2 sm:grid-cols-2">
      <RepoCard v-for="repo in repos" :key="repo.id" :repo="repo" />
    </div>
    <BaseButton
      v-if="store.starsPage.hasMore && !hasSearchQuery"
      variant="outline"
      size="sm"
      :disabled="store.starsPage.isLoadingMore"
      @click="loadMore"
    >
      <BaseIcon name="chevron-double-down" size="xs" />
      {{ store.starsPage.isLoadingMore ? t("dashboard.loadingMore") : t("dashboard.loadMore") }}
    </BaseButton>
  </div>
  <EmptyState v-else :title="hasSearchQuery ? t('search.noResults') : t('dashboard.noStars')" icon="star-outline" />
</template>
