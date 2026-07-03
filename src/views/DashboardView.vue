<script setup lang="ts">
import { computed, provide, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import type { DashboardTab } from "@/dashboard/types";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import {
  DashboardSearchField,
  DashboardToolbar,
  DiscussionsReleasesTab,
  ApiDebugTab,
  FeedTab,
  IssuesTab,
  MilestonesTab,
  ProjectsTab,
  NotificationsTab,
  OverviewTab,
  PullRequestsTab,
  StarsTab,
  WatchingTab,
} from "@/components/dashboard";
import { BaseButton, BaseIcon } from "@/components/ui";
import { formatLastRefreshedTime } from "@/github/formatLastRefreshed";
import { normalizeSearchQuery } from "@/github/search";
import type { SavedViewId } from "@/settings/appSettings";
import { useGitHubStore } from "@/stores/githubStore";
import { useSettingsStore } from "@/stores/settingsStore";

export type { DashboardTab };

const tab = defineModel<DashboardTab>("tab", { default: "overview" });
const searchQuery = ref("");
const refreshing = ref(false);
const githubStore = useGitHubStore();
const settingsStore = useSettingsStore();
const { t, locale } = useI18n();
provide(dashboardSearchKey, searchQuery);

const viewOptions = computed(() => [
  { id: "all" as const, label: t("dashboard.viewAll") },
  { id: "myOrgs" as const, label: t("dashboard.viewMyOrgs") },
  { id: "work" as const, label: t("dashboard.viewWork") },
  { id: "urgent" as const, label: t("dashboard.viewUrgent") },
]);

const tabComponents: Record<DashboardTab, Component> = {
  overview: OverviewTab,
  feed: FeedTab,
  issues: IssuesTab,
  milestones: MilestonesTab,
  projects: ProjectsTab,
  pullRequests: PullRequestsTab,
  stars: StarsTab,
  watching: WatchingTab,
  notifications: NotificationsTab,
  discussionsReleases: DiscussionsReleasesTab,
  apiDebug: ApiDebugTab,
};

const activeTab = computed(() => tabComponents[tab.value ?? "overview"]);
const hasSearchQuery = computed(() => Boolean(normalizeSearchQuery(searchQuery.value)));

const refreshLabel = computed(() => {
  if (refreshing.value) return t("dashboard.loading");
  if (!githubStore.lastRefreshed) return t("dashboard.refresh");
  const time = formatLastRefreshedTime(githubStore.lastRefreshed, locale.value);
  return time ? t("dashboard.refreshAt", { time }) : t("dashboard.refresh");
});

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

async function onViewChange(view: SavedViewId) {
  await settingsStore.setActiveView(view);
  githubStore.recomputeGroups();
}

watch(tab, () => {
  searchQuery.value = "";
});
</script>

<template>
  <div class="space-y-4">
    <DashboardToolbar />
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex flex-wrap gap-1">
        <BaseButton
          v-for="option in viewOptions"
          :key="option.id"
          size="sm"
          :variant="settingsStore.savedViews.activeView === option.id ? 'solid' : 'outline'"
          @click="onViewChange(option.id)"
        >
          {{ option.label }}
        </BaseButton>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <DashboardSearchField v-model="searchQuery" class="min-w-0 flex-1" />
      <BaseButton variant="outline" size="sm" :disabled="refreshing" @click="refresh">
        <BaseIcon name="refresh" size="xs" :spin="refreshing" />
        {{ refreshLabel }}
      </BaseButton>
    </div>
    <component :is="activeTab" :has-search-query="hasSearchQuery" @navigate="onNavigate" />
  </div>
</template>
