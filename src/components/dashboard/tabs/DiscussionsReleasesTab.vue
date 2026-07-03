<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";
import { DiscussionRow, EmptyState, ReleaseRow } from "@/components/github";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterDiscussions, filterReleaseGroups } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const store = useGitHubStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const releaseGroups = computed(() =>
  filterReleaseGroups(store.viewReleaseGroups, searchQuery.value),
);
const flatReleases = computed(() =>
  releaseGroups.value.flatMap((group) =>
    group.releases.map((release) => ({ release, repo: group.repo })),
  ),
);
const discussions = computed(() =>
  filterDiscussions(store.viewDiscussionItems, searchQuery.value),
);
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {{ t("dashboard.releasesSection") }}
      </h2>
      <div v-if="flatReleases.length" class="space-y-1">
        <ReleaseRow
          v-for="entry in flatReleases"
          :key="`${entry.repo}-${entry.release.id}`"
          :release="entry.release"
          :repo="entry.repo"
        />
      </div>
      <EmptyState
        v-else
        :title="hasSearchQuery ? t('search.noResults') : t('dashboard.noReleases')"
        icon="tag-outline"
      />
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {{ t("dashboard.discussionsSection") }}
      </h2>
      <div v-if="discussions.length" class="space-y-1">
        <DiscussionRow
          v-for="discussion in discussions"
          :key="discussion.id"
          :discussion="discussion"
        />
      </div>
      <EmptyState
        v-else
        :title="hasSearchQuery ? t('search.noResults') : t('dashboard.noDiscussions')"
        icon="forum-outline"
      />
    </section>
  </div>
</template>
