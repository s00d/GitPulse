<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { EmptyState, NotificationRow } from "@/components/github";
import { BaseButton } from "@/components/ui";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterNotifications } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const unread = computed(() =>
  filterNotifications(
    store.notifications.filter((notification) => notification.unread),
    searchQuery.value,
  ),
);

async function loadMore() {
  await store.loadMore("notifications");
}
</script>

<template>
  <div v-if="unread.length" class="space-y-3">
    <div class="space-y-1">
      <NotificationRow
        v-for="notification in unread"
        :key="notification.id"
        :notification="notification"
      />
    </div>
    <BaseButton
      v-if="store.notificationsPage.hasMore && !hasSearchQuery"
      variant="outline"
      size="sm"
      :disabled="store.notificationsPage.isLoadingMore"
      @click="loadMore"
    >
      {{
        store.notificationsPage.isLoadingMore
          ? t("dashboard.loadingMore")
          : t("dashboard.loadMore")
      }}
    </BaseButton>
  </div>
  <EmptyState
    v-else
    :title="hasSearchQuery ? t('search.noResults') : t('dashboard.noNotifications')"
  />
</template>
