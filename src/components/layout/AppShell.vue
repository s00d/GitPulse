<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useMediaQuery } from "@vueuse/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppHeaderProfile from "@/components/layout/AppHeaderProfile.vue";
import TwoPaneLayout from "@/components/layout/TwoPaneLayout.vue";
import { BaseButton, BaseIcon, BasePlatformMenu } from "@/components/ui";
import type { AppScreen, DashboardTab } from "@/dashboard/types";
import { useGitHubStore } from "@/stores/githubStore";

type NavMenuItem = {
  label: string;
  value: string;
  icon: string;
  badge?: number;
};

const screen = defineModel<AppScreen>("screen", { default: "dashboard" });
const tab = defineModel<DashboardTab>("tab", { default: "overview" });

const props = defineProps<{ signedIn: boolean }>();

const { t } = useI18n();
const isDesktop = useMediaQuery("(min-width: 1024px)");
const store = useGitHubStore();
const navOpen = ref(false);

const dashboardItems = computed(() => [
  { value: "overview" as const, label: t("dashboard.overview"), icon: "view-dashboard-outline" },
  { value: "feed" as const, label: t("dashboard.feed"), icon: "rss" },
  { value: "issues" as const, label: t("dashboard.issues"), icon: "circle-outline" },
  { value: "pullRequests" as const, label: t("dashboard.pullRequests"), icon: "source-pull" },
  { value: "stars" as const, label: t("dashboard.stars"), icon: "star-outline" },
  { value: "watching" as const, label: t("dashboard.watching"), icon: "eye-outline" },
  { value: "notifications" as const, label: t("dashboard.notifications"), icon: "bell-outline" },
]);

function tabBadge(tab: DashboardTab): number | undefined {
  switch (tab) {
    case "issues":
      return store.issues.length || undefined;
    case "pullRequests":
      return store.prCount || undefined;
    case "stars":
      return store.starredRepos.length || undefined;
    case "watching":
      return store.watchedRepos.length || undefined;
    case "notifications":
      return store.unreadNotificationCount || undefined;
    default:
      return undefined;
  }
}

const navItems = computed<NavMenuItem[]>(() => [
  ...dashboardItems.value.map((item) => ({
    label: item.label,
    value: item.value,
    icon: item.icon,
    badge: tabBadge(item.value),
  })),
  {
    label: t("dashboard.settings"),
    value: "settings",
    icon: "cog-outline",
  },
]);

const headerTitle = computed(() => {
  if (screen.value === "settings") return t("settings.title");
  return dashboardItems.value.find((item) => item.value === (tab.value ?? "overview"))?.label ?? t("dashboard.title");
});

const platformValue = computed({
  get: () => (screen.value === "settings" ? "settings" : tab.value),
  set: (value: string) => {
    if (value === "settings") {
      screen.value = "settings";
      return;
    }
    screen.value = "dashboard";
    tab.value = value as DashboardTab;
  },
});

async function hideOnDesktop() {
  if (!isDesktop.value) return;
  try {
    await getCurrentWindow().hide();
  } catch {
    // browser
  }
}

onMounted(() => {
  void listen<string>("app://screen", (event) => {
    if (event.payload === "settings") screen.value = "settings";
    else if (event.payload === "dashboard") screen.value = "dashboard";
  });
});
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    :class="props.signedIn ? 'lg:h-screen lg:overflow-hidden' : ''"
  >
    <AppHeader>
      <template #title>
        <AppHeaderProfile :title="headerTitle" />
      </template>
      <template #actions>
        <slot name="header-actions" />
        <BaseButton
          v-if="props.signedIn && screen !== 'settings'"
          size="sm"
          variant="outline"
          @click="screen = 'settings'"
        >
          <BaseIcon name="cog-outline" size="xs" />
          {{ t("dashboard.settings") }}
        </BaseButton>
        <BaseButton v-if="isDesktop" size="sm" variant="outline" @click="hideOnDesktop">
          <BaseIcon name="window-minimize" size="xs" />
          {{ t("settings.close") }}
        </BaseButton>
      </template>
    </AppHeader>

    <slot v-if="!props.signedIn" />

    <template v-else>
      <div v-if="isDesktop" class="h-[calc(100vh-3.5rem)] overflow-hidden">
        <TwoPaneLayout>
          <template #nav>
            <BasePlatformMenu
              v-model="platformValue"
              v-model:desktop-open="navOpen"
              :items="navItems"
              :show-desktop-toggle="false"
            />
          </template>
          <slot />
        </TwoPaneLayout>
      </div>

      <template v-else>
        <main class="px-3 pb-24 pt-4">
          <slot />
        </main>
        <BasePlatformMenu v-model="platformValue" :items="navItems" />
      </template>
    </template>
  </div>
</template>
