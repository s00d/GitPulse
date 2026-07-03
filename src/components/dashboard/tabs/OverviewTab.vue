<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import OverviewStatCard from "@/components/dashboard/OverviewStatCard.vue";
import { ActivityEventRow, EmptyState } from "@/components/github";
import { BaseButton, BaseIcon } from "@/components/ui";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import type { DashboardTab } from "@/dashboard/types";
import { filterActivityEvents } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";
import { useRefreshStore } from "@/stores/refreshStore";

const props = defineProps<{ hasSearchQuery?: boolean }>();

const emit = defineEmits<{ navigate: [DashboardTab] }>();

const { t } = useI18n();
const store = useGitHubStore();
const refreshStore = useRefreshStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const recentEvents = computed(() =>
  filterActivityEvents(refreshStore.recentEvents, searchQuery.value),
);

const showStats = computed(() => !props.hasSearchQuery);

const hasStoredActivity = computed(() => refreshStore.events.length > 0);

async function clearAllActivity() {
  await refreshStore.dismissAllEvents();
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="showStats" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <OverviewStatCard
        :label="t('dashboard.overviewIssues')"
        :value="store.displayIssueCount"
        target-tab="issues"
        icon="circle-outline"
        @navigate="emit('navigate', $event)"
      />
      <OverviewStatCard
        :label="t('dashboard.overviewMilestones')"
        :value="store.milestoneOpenTotal"
        target-tab="milestones"
        icon="flag-outline"
        @navigate="emit('navigate', $event)"
      />
      <OverviewStatCard
        :label="t('dashboard.overviewProjects')"
        :value="store.projectOpenTotal"
        target-tab="projects"
        icon="view-column-outline"
        @navigate="emit('navigate', $event)"
      />
      <OverviewStatCard
        :label="t('dashboard.overviewPrs')"
        :value="store.displayPrCount"
        target-tab="pullRequests"
        icon="source-pull"
        @navigate="emit('navigate', $event)"
      />
      <OverviewStatCard
        :label="t('dashboard.overviewStars')"
        :value="store.viewStarredRepos.length"
        target-tab="stars"
        icon="star-outline"
        @navigate="emit('navigate', $event)"
      />
      <OverviewStatCard
        :label="t('dashboard.overviewWatching')"
        :value="store.viewWatchedRepos.length"
        target-tab="watching"
        icon="eye-outline"
        @navigate="emit('navigate', $event)"
      />
      <OverviewStatCard
        :label="t('dashboard.overviewNotifications')"
        :value="store.viewUnreadNotificationCount"
        target-tab="notifications"
        icon="bell-outline"
        @navigate="emit('navigate', $event)"
      />
    </div>

    <section class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <BaseIcon name="history" size="xs" />
          {{ t("dashboard.recentActivity") }}
        </h2>
        <div class="flex items-center gap-2">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t("activity.historyHint") }}
          </p>
          <BaseButton
            v-if="hasStoredActivity"
            variant="ghost"
            size="sm"
            @click="clearAllActivity"
          >
            {{ t("activity.clearAll") }}
          </BaseButton>
        </div>
      </div>
      <div v-if="recentEvents.length" class="space-y-1">
        <ActivityEventRow v-for="event in recentEvents" :key="event.id" :event="event" />
      </div>
      <EmptyState
        v-else
        :title="props.hasSearchQuery ? t('search.noResults') : t('activity.empty')"
        icon="history"
      />
    </section>
  </div>
</template>
