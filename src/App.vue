<script setup lang="ts">
import { computed, ref } from "vue";
import AppLoadingView from "@/components/layout/AppLoadingView.vue";
import AppShell from "@/components/layout/AppShell.vue";
import type { AppScreen, DashboardTab } from "@/dashboard/types";
import DashboardView from "@/views/DashboardView.vue";
import SettingsView from "@/views/SettingsView.vue";
import SignInView from "@/views/SignInView.vue";
import { useAppBootstrap } from "@/composables/useAppBootstrap";
import { useGitHubStore } from "@/stores/githubStore";

useAppBootstrap();

const store = useGitHubStore();
const screen = ref<AppScreen>("dashboard");
const dashboardTab = ref<DashboardTab>("overview");

function onSignedIn() {
  screen.value = "dashboard";
  void store.refresh({ source: "manual" });
}

const showApp = computed(() => store.isBootstrapped);
</script>

<template>
  <AppLoadingView v-if="!showApp" />

  <AppShell
    v-else
    v-model:screen="screen"
    v-model:tab="dashboardTab"
    :signed-in="store.hasToken"
  >
    <template v-if="!store.hasToken">
      <SignInView @signed-in="onSignedIn" />
    </template>

    <template v-else>
      <SettingsView v-if="screen === 'settings'" embedded />
      <DashboardView v-else v-model:tab="dashboardTab" />
    </template>

    <template #header-actions>
      <span
        v-if="store.badgeCount > 0"
        class="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white"
      >
        {{ store.badgeCount }}
      </span>
    </template>
  </AppShell>
</template>
