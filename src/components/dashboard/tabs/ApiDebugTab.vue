<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { EmptyState } from "@/components/github";
import { BaseButton } from "@/components/ui";
import { formatApiDebugPath, formatDebugJson } from "@/github/apiDebug";
import { useApiDebugStore } from "@/stores/apiDebugStore";
import { useGitHubStore } from "@/stores/githubStore";
import { tv } from "@/lib/tv";

defineProps<{ hasSearchQuery?: boolean }>();

const { t } = useI18n();
const debugStore = useApiDebugStore();
const githubStore = useGitHubStore();

const ui = computed(() =>
  tv({
    slots: {
      header: "flex flex-wrap items-center justify-between gap-3",
      meta: "text-xs text-slate-500 dark:text-slate-400",
      list: "space-y-2",
      item: "rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      summary:
        "flex cursor-pointer list-none flex-wrap items-center gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden",
      badge:
        "inline-flex min-w-[2.5rem] justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
      badgeOk: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      badgeErr: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
      badgeNet: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      method:
        "rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
      path: "min-w-0 flex-1 truncate font-mono text-xs text-slate-700 dark:text-slate-200",
      timing: "text-xs text-slate-500 dark:text-slate-400",
      body: "space-y-3 border-t border-slate-200 px-3 py-3 dark:border-slate-800",
      sectionTitle: "text-[10px] font-semibold uppercase tracking-wide text-slate-500",
      pre: "max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:bg-slate-950 dark:text-slate-200",
    },
  })(),
);

function statusBadgeClass(status?: number) {
  if (status == null) return ui.value.badgeNet();
  if (status >= 200 && status < 300) return ui.value.badgeOk();
  return ui.value.badgeErr();
}

function statusLabel(entry: { status?: number; error?: string }) {
  if (entry.status != null) return String(entry.status);
  return entry.error ? "ERR" : "—";
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function clearLog() {
  debugStore.clear();
}
</script>

<template>
  <div class="space-y-4">
    <div :class="ui.header()">
      <div>
        <p class="text-sm font-medium text-slate-900 dark:text-slate-100">
          {{ t("apiDebug.entryCount", { count: debugStore.entries.length }) }}
        </p>
        <p :class="ui.meta()">{{ t("apiDebug.hint") }}</p>
        <p v-if="githubStore.graphqlRateLimit" :class="ui.meta()">
          GraphQL points: cost {{ githubStore.graphqlRateLimit.cost }}, remaining
          {{ githubStore.graphqlRateLimit.remaining }} / {{ githubStore.graphqlRateLimit.limit }}
        </p>
      </div>
      <BaseButton
        variant="outline"
        size="sm"
        :disabled="!debugStore.entries.length"
        @click="clearLog"
      >
        {{ t("apiDebug.clear") }}
      </BaseButton>
    </div>

    <div v-if="debugStore.entries.length" :class="ui.list()">
      <details v-for="entry in debugStore.entries" :key="entry.id" :class="ui.item()">
        <summary :class="ui.summary()">
          <span :class="[ui.badge(), statusBadgeClass(entry.status)]">
            {{ statusLabel(entry) }}
          </span>
          <span :class="ui.method()">{{ entry.method }}</span>
          <span :class="ui.path()" :title="entry.url">{{ formatApiDebugPath(entry.url) }}</span>
          <span :class="ui.timing()">
            {{ t("apiDebug.duration", { ms: entry.durationMs }) }}
          </span>
          <span :class="ui.timing()">{{ formatTime(entry.startedAt) }}</span>
        </summary>

        <div :class="ui.body()">
          <div v-if="entry.error" class="space-y-1">
            <p :class="ui.sectionTitle()">{{ t("apiDebug.error") }}</p>
            <pre :class="ui.pre()">{{ entry.error }}</pre>
          </div>

          <div class="space-y-1">
            <p :class="ui.sectionTitle()">{{ t("apiDebug.request") }}</p>
            <pre :class="ui.pre()">{{ formatDebugJson(entry.requestHeaders) }}</pre>
            <pre v-if="entry.requestBody !== undefined" :class="ui.pre()">{{
              formatDebugJson(entry.requestBody)
            }}</pre>
          </div>

          <div class="space-y-1">
            <p :class="ui.sectionTitle()">{{ t("apiDebug.response") }}</p>
            <pre v-if="entry.responseHeaders" :class="ui.pre()">{{
              formatDebugJson(entry.responseHeaders)
            }}</pre>
            <pre v-if="entry.responseBody !== undefined" :class="ui.pre()">{{
              formatDebugJson(entry.responseBody)
            }}</pre>
            <p v-if="entry.responseTruncated" :class="ui.meta()">{{ t("apiDebug.truncated") }}</p>
          </div>
        </div>
      </details>
    </div>

    <EmptyState v-else :title="t('apiDebug.empty')" icon="history" />
  </div>
</template>
