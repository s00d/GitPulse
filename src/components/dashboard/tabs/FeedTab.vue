<script setup lang="ts">
import { computed, inject, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { BaseButton } from "@/components/ui";
import { EmptyState } from "@/components/github";
import { dashboardSearchKey } from "@/dashboard/searchContext";
import { filterFeedItems } from "@/github/search";
import { useFeedStore } from "@/stores/feedStore";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const feedStore = useFeedStore();
const searchQuery = inject(dashboardSearchKey, ref(""));

const visibleItems = computed(() => filterFeedItems(feedStore.items, searchQuery.value));
const feedCards = computed(() =>
  visibleItems.value.map((item) => {
    const actor = item.actorLogin?.trim() || "GitHub";
    const actorInitial = actor.slice(0, 1).toUpperCase();
    const tone = eventTone(item.eventType);
    return {
      ...item,
      actor,
      actorInitial,
      relativeTime: formatRelativeTime(item.createdAt),
      toneClass: tone.className,
      toneLabel: tone.label,
    };
  }),
);
const statusLabel = computed(() => {
  if (feedStore.status === "syncing") return t("feed.statusSyncing");
  if (feedStore.status === "error") return t("feed.statusError");
  if (feedStore.status === "ready") return t("feed.statusReady");
  return t("feed.statusIdle");
});

function formatRelativeTime(value: string): string {
  const ts = new Date(value).getTime();
  if (!Number.isFinite(ts)) return "";

  const diffMs = Date.now() - ts;
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const absMinutes = Math.floor(absMs / (60 * 1000));
  const absHours = Math.floor(absMs / (60 * 60 * 1000));
  const absDays = Math.floor(absMs / (24 * 60 * 60 * 1000));

  if (absMinutes < 1) return future ? "<1m" : "just now";
  if (absMinutes < 60) return future ? `in ${absMinutes}m` : `${absMinutes}m ago`;
  if (absHours < 24) return future ? `in ${absHours}h` : `${absHours}h ago`;
  if (absDays < 7) return future ? `in ${absDays}d` : `${absDays}d ago`;
  return new Date(value).toLocaleString();
}

function eventTone(eventType: string): { label: string; className: string } {
  const type = eventType.toLowerCase();
  if (type.includes("pullrequest")) {
    return {
      label: "PR",
      className:
        "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200",
    };
  }
  if (type.includes("issue")) {
    return {
      label: "Issue",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
    };
  }
  if (type.includes("push")) {
    return {
      label: "Push",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
    };
  }
  if (type.includes("release")) {
    return {
      label: "Release",
      className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200",
    };
  }
  if (type.includes("notification")) {
    return {
      label: "Inbox",
      className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
    };
  }
  return {
    label: "Event",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  };
}

async function syncNow() {
  await feedStore.syncNow();
}

function cancelSync() {
  feedStore.cancelSync();
}

async function openItem(url: string) {
  try {
    await openUrl(url);
  } catch {
    // ignore outside tauri
  }
}

onMounted(async () => {
  await feedStore.init();
  await feedStore.maybeAutoSync();
});
</script>

<template>
  <section class="space-y-4">
    <div class="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t("feed.title") }}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ statusLabel }}</p>
          <p v-if="feedStore.lastSyncedAt" class="text-xs text-slate-500 dark:text-slate-400">
            {{ t("feed.lastSyncedAt", { time: new Date(feedStore.lastSyncedAt).toLocaleString() }) }}
          </p>
          <p v-if="feedStore.nextAutoSyncAt" class="text-xs text-slate-500 dark:text-slate-400">
            {{
              t("feed.nextAutoSyncAt", { time: new Date(feedStore.nextAutoSyncAt).toLocaleString() })
            }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton
            variant="outline"
            size="sm"
            :disabled="feedStore.isSyncing"
            @click="syncNow"
          >
            {{ t("feed.syncNow") }}
          </BaseButton>
          <BaseButton
            v-if="feedStore.isSyncing"
            variant="outline"
            size="sm"
            @click="cancelSync"
          >
            {{ t("feed.cancelSync") }}
          </BaseButton>
        </div>
      </div>
      <div v-if="feedStore.isSyncing" class="mt-3 space-y-2">
        <p class="text-xs font-medium text-slate-700 dark:text-slate-300">
          {{ t(feedStore.progress.label) }}
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          {{ feedStore.progress.current }} / {{ feedStore.progress.total }}
        </p>
      </div>
      <p v-if="feedStore.error" class="mt-2 text-xs text-red-600 dark:text-red-400">
        {{ feedStore.error }}
      </p>
    </div>

    <div v-if="feedCards.length" class="space-y-3">
      <button
        v-for="item in feedCards"
        :key="item.id"
        type="button"
        class="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
        @click="openItem(item.url)"
      >
        <div class="flex items-start gap-3">
          <div
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
          >
            {{ item.actorInitial }}
          </div>

          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="item.toneClass"
              >
                {{ item.toneLabel }}
              </span>
              <span class="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                {{ item.repoName || item.subtitle }}
              </span>
            </div>

            <p class="text-sm font-semibold leading-5 text-slate-900 dark:text-slate-100">
              {{ item.title }}
            </p>

            <p class="text-xs leading-5 text-slate-600 dark:text-slate-300">
              {{ item.description || item.subtitle }}
            </p>

            <div class="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
              <span class="font-medium">{{ item.actor }}</span>
              <span>•</span>
              <span>{{ t(`feed.source.${item.source}`) }}</span>
              <span>•</span>
              <span>{{ item.relativeTime }}</span>
            </div>
            <div class="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {{ item.eventType }}
            </div>
          </div>
        </div>
      </button>
    </div>

    <EmptyState v-else :title="hasSearchQuery ? t('search.noResults') : t('feed.empty')" />
  </section>
</template>
