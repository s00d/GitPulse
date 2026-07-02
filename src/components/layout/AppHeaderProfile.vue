<script setup lang="ts">
import { useGitHubStore } from "@/stores/githubStore";

defineProps<{
  title: string;
  subtitle?: string;
}>();

const store = useGitHubStore();
</script>

<template>
  <div class="flex min-w-0 items-center gap-2">
    <img
      v-if="store.viewer?.avatar_url"
      :src="store.viewer.avatar_url"
      :alt="store.viewer.login"
      class="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700"
    />
    <div class="min-w-0">
      <p class="truncate text-sm font-semibold">{{ title }}</p>
      <p v-if="subtitle" class="truncate text-xs text-slate-500">{{ subtitle }}</p>
      <p v-else-if="store.viewer" class="truncate text-xs text-slate-500">@{{ store.viewer.login }}</p>
    </div>
  </div>
</template>
