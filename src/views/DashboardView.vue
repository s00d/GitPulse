<script setup lang="ts">
import { computed, provide, ref, watch, type Component } from "vue";
import type { DashboardTab } from "@/dashboard/types";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import {
  DashboardSearchField,
  DashboardToolbar,
  FeedTab,
  IssuesTab,
  NotificationsTab,
  OverviewTab,
  PullRequestsTab,
  StarsTab,
  WatchingTab,
} from "@/components/dashboard";
import { BaseButton, BaseIcon } from "@/components/ui";
import { normalizeSearchQuery } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";

export type { DashboardTab };

const tab = defineModel<DashboardTab>("tab", { default: "overview" });
const searchQuery = ref("");
const refreshing = ref(false);
const githubStore = useGitHubStore();
provide(dashboardSearchKey, searchQuery);

const tabComponents: Record<DashboardTab, Component> = {
  overview: OverviewTab,
  feed: FeedTab,
  issues: IssuesTab,
  pullRequests: PullRequestsTab,
  stars: StarsTab,
  watching: WatchingTab,
  notifications: NotificationsTab,
};

const activeTab = computed(() => tabComponents[tab.value ?? "overview"]);
const hasSearchQuery = computed(() => Boolean(normalizeSearchQuery(searchQuery.value)));

function onNavigate(next: DashboardTab) {
  tab.value = next;
}

async function refresh() {
  refreshing.value = true;
  try {
    await githubStore.refresh({ source: "manual" });
  } finally {
    refreshing.value = false;
  }
}

watch(tab, () => {
  searchQuery.value = "";
});
</script>

<template>
  <div class="space-y-4">
    <DashboardToolbar />
    <div class="flex items-center gap-2">
      <DashboardSearchField v-model="searchQuery" class="min-w-0 flex-1" />
      <BaseButton variant="outline" size="sm" :disabled="refreshing" @click="refresh">
        <BaseIcon name="refresh" size="xs" :spin="refreshing" />
        {{ refreshing ? `${$t("dashboard.loading")}` : $t("dashboard.refresh") }}
      </BaseButton>
    </div>
    <component :is="activeTab" :has-search-query="hasSearchQuery" @navigate="onNavigate" />
  </div>
</template>
