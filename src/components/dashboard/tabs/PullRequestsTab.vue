<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { GroupedRepoView } from "@/components/github";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterPrGroups } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const groups = computed(() => filterPrGroups(store.prGroups, searchQuery.value));
</script>

<template>
  <GroupedRepoView
    mode="prs"
    :pr-groups="groups"
    :empty-title="hasSearchQuery ? t('search.noResults') : t('dashboard.noPullRequests')"
  />
</template>
