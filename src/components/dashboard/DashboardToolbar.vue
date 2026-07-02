<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useGitHubStore } from "@/stores/githubStore";

const { t } = useI18n();
const store = useGitHubStore();
</script>

<template>
  <div class="space-y-2">
    <div v-if="store.isLoading && !store.lastRefreshed" class="text-sm text-slate-500">
      {{ t("dashboard.loading") }}
    </div>
    <p v-else-if="store.errorMessage" class="text-sm text-red-600 dark:text-red-400">
      {{ t("dashboard.error", { message: store.errorMessage }) }}
    </p>
  </div>
</template>
