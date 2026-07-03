<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import {
  BaseButton,
  BaseCheckbox,
  BaseField,
  BaseInput,
  BaseSelect,
  BaseSwitch,
  BaseTimeInput,
  BaseToast,
} from "@/components/ui";
import { useAutostart } from "@/composables/useAutostart";
import { useGitHubAuthFlow } from "@/composables/useGitHubAuthFlow";
import { useNotification } from "@/composables/useNotification";
import { useTheme } from "@/composables/useTheme";
import { SettingsCard } from "@/components/settings";
import { DashboardSearchField } from "@/components/dashboard";
import type {
  MenuVisibilitySettings,
  NotificationDayId,
  NotificationSettings,
  PrimaryClickBehavior,
  RefreshInterval,
  TrayBadgeSettings,
} from "@/settings/appSettings";
import { NOTIFICATION_DAY_IDS } from "@/settings/appSettings";
import { MAX_TRACKED_PROJECTS } from "@/github/projects";
import type { ProjectOwnerType } from "@/github/types";
import { matchesSearch } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";
import { useSettingsStore } from "@/stores/settingsStore";

type NotificationBooleanFlag = {
  [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
}[keyof NotificationSettings];

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const CLASSIC_TOKEN_URL =
  "https://github.com/settings/tokens/new?description=GitPulse&scopes=repo,read:project";
const CLASSIC_TOKEN_PROJECTS_URL = CLASSIC_TOKEN_URL;
const FINE_GRAINED_TOKEN_URL =
  "https://github.com/settings/personal-access-tokens/new?name=GitPulse&description=GitPulse";
const GH_INSTALL_URL = "https://cli.github.com";

const { t } = useI18n();
const store = useGitHubStore();
const settingsStore = useSettingsStore();
const autostart = useAutostart();
const authFlow = useGitHubAuthFlow();
const systemNotifications = useNotification();
const { theme } = useTheme();

const tokenInput = ref("");
const showToken = ref(false);
const importingGh = ref(false);
const toastItems = ref<Array<{ id: number; message: string; tone?: "info" | "success" | "error" }>>(
  [],
);
const refreshInterval = ref<RefreshInterval>("60s");
const settingsSearchQuery = ref("");
const repoSearchQuery = ref("");
const projectOwnerType = ref<ProjectOwnerType>("user");
const projectOwner = ref("");
const projectNumber = ref("");
let toastId = 1;

function showSettingsSection(...labels: string[]) {
  return matchesSearch(labels, settingsSearchQuery.value);
}

const pageTv = tv({
  slots: {
    root: "min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100",
    rootEmbedded: "space-y-5",
    header:
      "flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800",
    title: "text-lg font-semibold",
    body: "mx-auto max-w-lg space-y-5 p-5 pb-8",
    card: "space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900",
    sectionTitle: "text-sm font-semibold uppercase tracking-wide text-slate-500",
    meta: "text-sm text-slate-600 dark:text-slate-400",
    row: "flex flex-wrap gap-2",
    accountRow: "flex items-center gap-3",
    avatar: "h-10 w-10 rounded-full border border-slate-200 dark:border-slate-700",
    link: "text-sm text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400",
    banner:
      "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    footer: "text-center text-xs text-slate-500 dark:text-slate-400",
    checks: "space-y-2",
    repoActions: "flex flex-wrap gap-2",
    repoList: "max-h-64 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-800",
    notifyPanel: "space-y-4 rounded-xl border border-slate-200 p-3 dark:border-slate-800",
    notifyMaster: "space-y-3",
  },
});
const ui = computed(() => pageTv());

const rootClass = computed(() => (props.embedded ? ui.value.rootEmbedded() : ui.value.root()));

const intervalOptions = computed(() => [
  { label: t("settings.interval30s"), value: "30s" },
  { label: t("settings.interval60s"), value: "60s" },
  { label: t("settings.interval5m"), value: "5m" },
  { label: t("settings.interval1h"), value: "1h" },
  { label: t("settings.interval1d"), value: "1d" },
  { label: t("settings.intervalManual"), value: "manual" },
]);

const themeOptions = computed(() => [
  { label: t("settings.themeLight"), value: "light" },
  { label: t("settings.themeDark"), value: "dark" },
]);

const NOTIFY_DAY_LABEL_KEYS: Record<NotificationDayId, string> = {
  mon: "settings.notifyDayMon",
  tue: "settings.notifyDayTue",
  wed: "settings.notifyDayWed",
  thu: "settings.notifyDayThu",
  fri: "settings.notifyDayFri",
  sat: "settings.notifyDaySat",
  sun: "settings.notifyDaySun",
};

const notificationDayOptions = computed(() =>
  NOTIFICATION_DAY_IDS.map((day) => ({
    day,
    label: t(NOTIFY_DAY_LABEL_KEYS[day]),
  })),
);

const primaryClickChoices = computed(() => [
  {
    value: "openBrowser" as const,
    title: t("settings.itemActionsPrimaryBrowserTitle"),
    description: t("settings.itemActionsPrimaryBrowserDesc"),
  },
  {
    value: "actionMenu" as const,
    title: t("settings.itemActionsPrimaryMenuTitle"),
    description: t("settings.itemActionsPrimaryMenuDesc"),
  },
]);

const itemActionChoiceUi = computed(() =>
  tv({
    slots: {
      list: "space-y-2",
      option:
        "w-full rounded-xl border px-3 py-3 text-left transition-colors hover:border-slate-300 dark:hover:border-slate-600",
      optionActive:
        "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/40",
      optionIdle: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
      row: "flex gap-3",
      radio:
        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 dark:border-slate-600",
      radioActive: "!border-indigo-600 dark:!border-indigo-500",
      radioDot: "h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400",
      optionTitle: "text-sm font-medium text-slate-900 dark:text-slate-100",
      optionDesc: "mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400",
    },
  })(),
);

const showDashboardActionButtonSetting = computed(
  () => settingsStore.itemActions.primaryClick === "openBrowser",
);

const itemActionsUnavailable = computed(
  () =>
    settingsStore.itemActions.primaryClick === "openBrowser" &&
    !settingsStore.itemActions.showRowActionButton &&
    !settingsStore.itemActions.trayItemSubmenus,
);

const projectOwnerTypeOptions = computed(() => [
  { label: t("settings.projectOwnerUser"), value: "user" },
  { label: t("settings.projectOwnerOrg"), value: "org" },
]);

const canAddTrackedProject = computed(
  () =>
    settingsStore.trackedProjects.length < MAX_TRACKED_PROJECTS &&
    projectOwner.value.trim().length > 0 &&
    Number(projectNumber.value) > 0,
);

const lastRefreshedLabel = computed(() => {
  if (!store.lastRefreshed) return t("settings.neverRefreshed");
  return t("settings.lastRefreshed", {
    time: new Date(store.lastRefreshed).toLocaleString(),
  });
});

const rateLimitLabel = computed(() => {
  if (!store.rateLimit) return null;
  return t("settings.rateLimit", {
    remaining: store.rateLimit.remaining,
    limit: store.rateLimit.limit,
  });
});

const ghScopeError = computed(() => {
  const msg = store.ghCliErrorMessage;
  if (!msg) return null;
  return msg.includes("repo") ? msg : null;
});

const knownRepos = computed(() => store.knownRepos);

function sortReposWithSelectedFirst(repos: string[], selected: readonly string[]): string[] {
  const selectedOrder = selected.filter((repo) => repos.includes(repo));
  const selectedSet = new Set(selectedOrder);
  const rest = repos.filter((repo) => !selectedSet.has(repo)).sort((a, b) => a.localeCompare(b));
  return [...selectedOrder, ...rest];
}

const filteredKnownRepos = computed(() =>
  knownRepos.value.filter(
    (repo) =>
      matchesSearch([repo], settingsSearchQuery.value) &&
      matchesSearch([repo], repoSearchQuery.value),
  ),
);

const sortedReposForVisibility = computed(() =>
  sortReposWithSelectedFirst(
    filteredKnownRepos.value,
    filteredKnownRepos.value.filter((repo) => settingsStore.isRepoEnabled(repo)),
  ),
);

const sortedReposForWork = computed(() =>
  sortReposWithSelectedFirst(filteredKnownRepos.value, settingsStore.savedViews.workRepos),
);

const sortedReposForPinned = computed(() =>
  sortReposWithSelectedFirst(filteredKnownRepos.value, settingsStore.savedViews.pinnedRepos),
);

const urgentLabelsInput = ref(settingsStore.savedViews.urgentPriorityLabels.join(", "));

function pushToast(message: string, tone: "info" | "success" | "error" = "info") {
  const id = toastId++;
  toastItems.value.push({ id, message, tone });
  setTimeout(() => {
    toastItems.value = toastItems.value.filter((item) => item.id !== id);
  }, 2500);
}

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    // ignore
  }
}

async function closeWindow() {
  try {
    await getCurrentWindow().hide();
  } catch {
    // no-op in browser
  }
}

async function saveToken() {
  if (!tokenInput.value.trim()) {
    pushToast(t("settings.tokenRequired"), "error");
    return;
  }
  try {
    await authFlow.verifyToken(tokenInput.value.trim());
    await store.signInWithToken(tokenInput.value);
    tokenInput.value = "";
    pushToast(t("settings.tokenSaved"), "success");
  } catch {
    pushToast(store.errorMessage ?? t("settings.error", { message: "save failed" }), "error");
  }
}

async function removeToken() {
  await store.signOut();
  pushToast(t("settings.tokenRemoved"), "success");
}

async function refreshNow() {
  try {
    await store.refresh({ source: "manual" });
  } catch {
    pushToast(store.errorMessage ?? t("settings.error", { message: "refresh failed" }), "error");
  }
}

async function importFromGh() {
  try {
    importingGh.value = true;
    await store.importTokenFromGhCli();
    pushToast(t("settings.autoImported"), "success");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.setGhCliError(message);
    pushToast(t("settings.error", { message }), "error");
  } finally {
    importingGh.value = false;
  }
}

async function onIntervalChange(value: string | null) {
  if (!value) return;
  const interval = value as RefreshInterval;
  refreshInterval.value = interval;
  await settingsStore.setRefreshInterval(interval);
  await store.syncRefreshInterval();
}

async function onThemeChange(value: string | null) {
  if (!value) return;
  theme.value = value as "light" | "dark";
}

async function onMenuVisibilityChange(key: keyof MenuVisibilitySettings, value: boolean) {
  await settingsStore.setMenuFlag(key, value);
  if (value) {
    if (key === "showApiDebug" || key === "showFeed") return;
    try {
      await store.refreshMenuSection(key);
    } catch {
      // error stored in githubStore
    }
  } else {
    store.clearMenuSection(key);
  }
}

async function onTrayBadgeChange(key: keyof TrayBadgeSettings, value: boolean) {
  await settingsStore.setTrayBadgeFlag(key, value);
}

async function onItemActionFlagChange(
  key: "showRowActionButton" | "trayItemSubmenus" | "enableQuickApprove",
  value: boolean,
) {
  await settingsStore.setItemActionFlag(key, value);
}

async function onPrimaryClickChange(value: PrimaryClickBehavior) {
  await settingsStore.setPrimaryClick(value);
}

async function onWorkRepoChange(repo: string, enabled: boolean) {
  const isWork = settingsStore.savedViews.workRepos.includes(repo);
  if (enabled === isWork) return;
  await settingsStore.toggleWorkRepo(repo);
  store.recomputeGroups();
}

async function onPinnedRepoChange(repo: string, pinned: boolean) {
  const isPinned = settingsStore.savedViews.pinnedRepos.includes(repo);
  if (pinned === isPinned) return;
  if (pinned) {
    await settingsStore.pinRepo(repo);
  } else {
    await settingsStore.unpinRepo(repo);
  }
  store.recomputeGroups();
}

async function onUrgentDaysChange(value: string) {
  await settingsStore.setUrgentPrAgeDays(Number(value));
  store.recomputeGroups();
}

async function onUrgentLabelsBlur() {
  await settingsStore.setUrgentPriorityLabels(urgentLabelsInput.value.split(","));
  store.recomputeGroups();
}

function trackedProjectLabel(ownerType: ProjectOwnerType, owner: string, number: number) {
  const kind = ownerType === "org" ? t("settings.projectOwnerOrg") : t("settings.projectOwnerUser");
  return `${kind}: ${owner} #${number}`;
}

async function addTrackedProject() {
  const added = await settingsStore.addTrackedProject({
    ownerType: projectOwnerType.value,
    owner: projectOwner.value,
    number: Number(projectNumber.value),
  });
  if (!added) {
    pushToast(t("settings.projectAddFailed"), "error");
    return;
  }
  projectOwner.value = "";
  projectNumber.value = "";
  pushToast(t("settings.projectAdded"), "success");
  try {
    await store.refreshProjects();
  } catch {
    pushToast(store.errorMessage ?? t("settings.error", { message: "refresh failed" }), "error");
  }
}

async function removeTrackedProject(id: string) {
  await settingsStore.removeTrackedProject(id);
  try {
    await store.refreshProjects();
  } catch {
    pushToast(store.errorMessage ?? t("settings.error", { message: "refresh failed" }), "error");
  }
}

async function onNotificationFlagChange(key: NotificationBooleanFlag, value: boolean) {
  await settingsStore.setNotificationFlag(key, value);
}

async function onNotifyDayChange(day: NotificationDayId, enabled: boolean) {
  await settingsStore.setNotifyDay(day, enabled);
}

async function onNotifyAllDayChange(value: boolean) {
  await settingsStore.setNotifyAllDay(value);
}

async function onNotifyTimeStartChange(value: string) {
  await settingsStore.setNotifyTimeStart(value);
}

async function onNotifyTimeEndChange(value: string) {
  await settingsStore.setNotifyTimeEnd(value);
}

async function requestNotificationPermission() {
  const granted = await systemNotifications.requestNotificationPermission();
  pushToast(
    granted ? t("settings.notificationsPermissionGranted") : t("settings.notificationsPermissionDenied"),
    granted ? "success" : "error",
  );
}

async function onAutostartToggle(value: boolean) {
  await autostart.toggle(value);
}

async function onRepoEnabledChange(repo: string, enabled: boolean) {
  await settingsStore.setRepoEnabled(repo, enabled);
  store.applyRepoVisibilityFilter();
  await store.refreshDerivedSections();
}

async function enableAllRepos() {
  await settingsStore.setRepoVisibilityBulk(knownRepos.value, true);
  store.applyRepoVisibilityFilter();
  await store.refreshDerivedSections();
}

async function disableAllRepos() {
  await settingsStore.setRepoVisibilityBulk(knownRepos.value, false);
  store.applyRepoVisibilityFilter();
  await store.refreshDerivedSections();
}

onMounted(async () => {
  await settingsStore.init();
  urgentLabelsInput.value = settingsStore.savedViews.urgentPriorityLabels.join(", ");
  refreshInterval.value = settingsStore.refreshInterval;
  await store.syncRefreshInterval();
  await autostart.syncState();
  await store.detectGhCliStatus();
  await systemNotifications.syncPermission();
});
</script>

<template>
  <div :class="rootClass">
    <header v-if="!props.embedded" :class="ui.header()">
      <h1 :class="ui.title()">{{ t("settings.title") }}</h1>
      <BaseButton size="sm" variant="outline" @click="closeWindow">{{
        t("settings.close")
      }}</BaseButton>
    </header>

    <main :class="ui.body()">
      <DashboardSearchField
        v-model="settingsSearchQuery"
        :placeholder="t('search.settingsPlaceholder')"
      />

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.account'),
            t('settings.signedInAs'),
            t('settings.notSignedIn'),
            t('settings.removeToken'),
          )
        "
        :title="t('settings.account')"
      >
        <div :class="ui.accountRow()">
          <img
            v-if="store.viewer?.avatar_url"
            :src="store.viewer.avatar_url"
            :alt="store.viewer.login"
            :class="ui.avatar()"
          />
          <p :class="ui.meta()">
            {{
              store.viewer
                ? t("settings.signedInAs", { login: store.viewer.login })
                : t("settings.notSignedIn")
            }}
          </p>
        </div>
        <BaseButton variant="outline" :disabled="!store.hasToken" @click="removeToken">
          {{ t("settings.removeToken") }}
        </BaseButton>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            'GitHub CLI',
            t('settings.ghNotInstalled'),
            t('settings.ghNotAuthed'),
            t('settings.ghAuthed'),
            t('settings.ghImport'),
          )
        "
        title="GitHub CLI"
      >

        <template v-if="store.ghCliStatus === 'not_installed'">
          <p :class="ui.meta()">{{ t("settings.ghNotInstalled") }}</p>
          <p :class="ui.meta()">{{ t("settings.ghNotInstalledHint") }}</p>
          <a :class="ui.link()" href="#" @click.prevent="openExternal(GH_INSTALL_URL)">
            {{ t("settings.ghInstallLink") }}
          </a>
        </template>

        <template v-else-if="store.ghCliStatus === 'installed_not_authed'">
          <p :class="ui.meta()">{{ t("settings.ghNotAuthed") }}</p>
          <p :class="ui.meta()">{{ t("settings.ghNotAuthedHint") }}</p>
          <p :class="ui.meta()">{{ t("auth.patHint") }}</p>
        </template>

        <template v-else>
          <p :class="ui.meta()">{{ t("settings.ghAuthed") }}</p>
          <p :class="ui.meta()">{{ t("settings.ghAuthedHint") }}</p>
          <BaseButton :disabled="importingGh" @click="importFromGh">
            {{ importingGh ? t("settings.ghImporting") : t("settings.ghImport") }}
          </BaseButton>
        </template>

        <p v-if="ghScopeError" :class="ui.banner()">{{ ghScopeError }}</p>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.tokenLabel'),
            t('settings.tokenHelper'),
            t('settings.createClassicToken'),
            t('settings.createFineGrainedToken'),
            t('settings.scopesTitle'),
            t('settings.saveToken'),
          )
        "
        :title="t('settings.tokenLabel')"
      >
        <p :class="ui.meta()">{{ t("settings.tokenHelper") }}</p>
        <div :class="ui.row()">
          <a :class="ui.link()" href="#" @click.prevent="openExternal(CLASSIC_TOKEN_URL)">
            {{ t("settings.createClassicToken") }}
          </a>
          <a :class="ui.link()" href="#" @click.prevent="openExternal(FINE_GRAINED_TOKEN_URL)">
            {{ t("settings.createFineGrainedToken") }}
          </a>
        </div>
        <div :class="ui.checks()">
          <p :class="ui.meta()">{{ t("settings.scopesTitle") }}</p>
          <p :class="ui.meta()">• {{ t("settings.scopePr") }}</p>
          <p :class="ui.meta()">• {{ t("settings.scopeIssues") }}</p>
          <p :class="ui.meta()">• {{ t("settings.scopeMetadata") }}</p>
          <p :class="ui.meta()">• {{ t("settings.scopeProjects") }}</p>
        </div>
        <BaseField :label="t('settings.tokenLabel')">
          <BaseInput
            v-model="tokenInput"
            :type="showToken ? 'text' : 'password'"
            :placeholder="t('settings.tokenPlaceholder')"
          />
        </BaseField>
        <div :class="ui.row()">
          <BaseButton @click="saveToken">{{ t("settings.saveToken") }}</BaseButton>
          <BaseButton variant="outline" @click="showToken = !showToken">
            {{ showToken ? t("settings.hideToken") : t("settings.showToken") }}
          </BaseButton>
        </div>
        <p v-if="store.errorMessage" :class="ui.meta()">
          {{ t("settings.error", { message: store.errorMessage }) }}
        </p>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.menuVisibility'),
            t('settings.showFeed'),
            t('settings.showIssues'),
            t('settings.showMilestones'),
            t('settings.showProjects'),
            t('settings.showPullRequests'),
            t('settings.showStars'),
            t('settings.showWatching'),
            t('settings.showNotifications'),
            t('settings.showDiscussionsReleases'),
            t('settings.showApiDebug'),
          )
        "
        :title="t('settings.menuVisibility')"
      >
        <div :class="ui.checks()">
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showFeed"
            :label="t('settings.showFeed')"
            @update:model-value="(v) => onMenuVisibilityChange('showFeed', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showIssues"
            :label="t('settings.showIssues')"
            @update:model-value="(v) => onMenuVisibilityChange('showIssues', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showMilestones"
            :label="t('settings.showMilestones')"
            @update:model-value="(v) => onMenuVisibilityChange('showMilestones', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showProjects"
            :label="t('settings.showProjects')"
            @update:model-value="(v) => onMenuVisibilityChange('showProjects', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showPullRequests"
            :label="t('settings.showPullRequests')"
            @update:model-value="(v) => onMenuVisibilityChange('showPullRequests', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showStars"
            :label="t('settings.showStars')"
            @update:model-value="(v) => onMenuVisibilityChange('showStars', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showWatching"
            :label="t('settings.showWatching')"
            @update:model-value="(v) => onMenuVisibilityChange('showWatching', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showNotifications"
            :label="t('settings.showNotifications')"
            @update:model-value="(v) => onMenuVisibilityChange('showNotifications', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showDiscussionsReleases"
            :label="t('settings.showDiscussionsReleases')"
            @update:model-value="(v) => onMenuVisibilityChange('showDiscussionsReleases', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.menuVisibility.showApiDebug"
            :label="t('settings.showApiDebug')"
            @update:model-value="(v) => onMenuVisibilityChange('showApiDebug', v)"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.trayBadgeTitle'),
            t('settings.trayBadgeHint'),
            t('settings.trayBadgeAssignedIssues'),
            t('settings.trayBadgeReviewRequests'),
            t('settings.trayBadgeMyPullRequests'),
            t('settings.trayBadgeUnreadNotifications'),
          )
        "
        :title="t('settings.trayBadgeTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.trayBadgeHint") }}</p>
        <div :class="ui.checks()">
          <BaseCheckbox
            full-width
            :model-value="settingsStore.trayBadge.assignedIssues"
            :label="t('settings.trayBadgeAssignedIssues')"
            @update:model-value="(v) => onTrayBadgeChange('assignedIssues', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.trayBadge.reviewRequests"
            :label="t('settings.trayBadgeReviewRequests')"
            @update:model-value="(v) => onTrayBadgeChange('reviewRequests', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.trayBadge.myPullRequests"
            :label="t('settings.trayBadgeMyPullRequests')"
            @update:model-value="(v) => onTrayBadgeChange('myPullRequests', v)"
          />
          <BaseCheckbox
            full-width
            :model-value="settingsStore.trayBadge.unreadNotifications"
            :label="t('settings.trayBadgeUnreadNotifications')"
            @update:model-value="(v) => onTrayBadgeChange('unreadNotifications', v)"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.itemActionsTitle'),
            t('settings.itemActionsHint'),
            t('settings.itemActionsDashboardSection'),
            t('settings.itemActionsDashboardIntro'),
            t('settings.itemActionsPrimaryBrowserTitle'),
            t('settings.itemActionsPrimaryMenuTitle'),
            t('settings.itemActionsTraySection'),
            t('settings.itemActionsShowRowButton'),
            t('settings.itemActionsTraySubmenus'),
            t('settings.itemActionsPrSection'),
            t('settings.itemActionsEnableQuickApprove'),
          )
        "
        :title="t('settings.itemActionsTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.itemActionsHint") }}</p>

        <p :class="ui.sectionTitle()">{{ t("settings.itemActionsDashboardSection") }}</p>
        <p :class="ui.meta()">{{ t("settings.itemActionsDashboardIntro") }}</p>
        <div :class="itemActionChoiceUi.list()">
          <button
            v-for="choice in primaryClickChoices"
            :key="choice.value"
            type="button"
            :class="[
              itemActionChoiceUi.option(),
              settingsStore.itemActions.primaryClick === choice.value
                ? itemActionChoiceUi.optionActive()
                : itemActionChoiceUi.optionIdle(),
            ]"
            @click="onPrimaryClickChange(choice.value)"
          >
            <div :class="itemActionChoiceUi.row()">
              <span
                :class="[
                  itemActionChoiceUi.radio(),
                  settingsStore.itemActions.primaryClick === choice.value &&
                    itemActionChoiceUi.radioActive(),
                ]"
              >
                <span
                  v-if="settingsStore.itemActions.primaryClick === choice.value"
                  :class="itemActionChoiceUi.radioDot()"
                />
              </span>
              <div>
                <p :class="itemActionChoiceUi.optionTitle()">{{ choice.title }}</p>
                <p :class="itemActionChoiceUi.optionDesc()">{{ choice.description }}</p>
              </div>
            </div>
          </button>
        </div>
        <div v-if="showDashboardActionButtonSetting" :class="ui.checks()">
          <BaseCheckbox
            full-width
            :model-value="settingsStore.itemActions.showRowActionButton"
            :label="t('settings.itemActionsShowRowButton')"
            @update:model-value="(v) => onItemActionFlagChange('showRowActionButton', v)"
          />
        </div>
        <p v-else :class="ui.meta()">{{ t("settings.itemActionsDashboardMenuActiveNote") }}</p>
        <p v-if="itemActionsUnavailable" :class="ui.banner()">
          {{ t("settings.itemActionsNoAccessWarning") }}
        </p>

        <p :class="ui.sectionTitle()">{{ t("settings.itemActionsTraySection") }}</p>
        <p :class="ui.meta()">{{ t("settings.itemActionsTrayIntro") }}</p>
        <div :class="ui.checks()">
          <BaseCheckbox
            full-width
            :model-value="settingsStore.itemActions.trayItemSubmenus"
            :label="t('settings.itemActionsTraySubmenus')"
            @update:model-value="(v) => onItemActionFlagChange('trayItemSubmenus', v)"
          />
        </div>

        <p :class="ui.sectionTitle()">{{ t("settings.itemActionsPrSection") }}</p>
        <div :class="ui.checks()">
          <BaseCheckbox
            full-width
            :model-value="settingsStore.itemActions.enableQuickApprove"
            :label="t('settings.itemActionsEnableQuickApprove')"
            @update:model-value="(v) => onItemActionFlagChange('enableQuickApprove', v)"
          />
        </div>
        <p :class="ui.meta()">{{ t("settings.itemActionsEnableQuickApproveHint") }}</p>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.notificationsTitle'),
            t('settings.notificationsEnabled'),
            t('settings.notificationsEnabledHint'),
            t('settings.notifyAdded'),
            t('settings.notifyUpdated'),
            t('settings.notifyIssues'),
            t('settings.notifyPullRequests'),
            t('settings.notifyInbox'),
            t('settings.notifyReleases'),
            t('settings.notifyDiscussions'),
            t('settings.notifyCommits'),
            t('settings.notifySecurityAlerts'),
            t('settings.notifyChecks'),
            t('settings.notifyScheduleSection'),
            t('settings.notifyScheduleDays'),
            t('settings.notifyScheduleAllDay'),
            t('settings.notifyDayMon'),
            t('settings.notifyDayTue'),
            t('settings.notifyDayWed'),
            t('settings.notifyDayThu'),
            t('settings.notifyDayFri'),
            t('settings.notifyDaySat'),
            t('settings.notifyDaySun'),
          )
        "
        :title="t('settings.notificationsTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.notificationsEnabledHint") }}</p>

        <div :class="ui.notifyPanel()">
          <div :class="ui.notifyMaster()">
            <BaseSwitch
              :model-value="settingsStore.notifications.enabled"
              :label="t('settings.notificationsEnabled')"
              @update:model-value="(v) => onNotificationFlagChange('enabled', v)"
            />
            <div class="flex flex-wrap items-center gap-2">
              <BaseButton variant="outline" size="sm" @click="requestNotificationPermission">
                {{ t("settings.notificationsRequestPermission") }}
              </BaseButton>
              <p
                v-if="systemNotifications.permissionGranted.value"
                :class="ui.meta()"
              >
                {{ t("settings.notificationsPermissionGranted") }}
              </p>
            </div>
          </div>

          <fieldset
            class="space-y-4 border-0 p-0"
            :disabled="!settingsStore.notifications.enabled"
            :class="!settingsStore.notifications.enabled ? 'opacity-50' : ''"
          >
            <div>
              <p :class="ui.sectionTitle()">{{ t("settings.notificationsWhenSection") }}</p>
              <div :class="ui.checks()">
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.notifyAdded"
                  :label="t('settings.notifyAdded')"
                  @update:model-value="(v) => onNotificationFlagChange('notifyAdded', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.notifyUpdated"
                  :label="t('settings.notifyUpdated')"
                  @update:model-value="(v) => onNotificationFlagChange('notifyUpdated', v)"
                />
              </div>
            </div>
            <div>
              <p :class="ui.sectionTitle()">{{ t("settings.notificationsWhatSection") }}</p>
              <div :class="ui.checks()">
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.issues"
                  :label="t('settings.notifyIssues')"
                  @update:model-value="(v) => onNotificationFlagChange('issues', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.pullRequests"
                  :label="t('settings.notifyPullRequests')"
                  @update:model-value="(v) => onNotificationFlagChange('pullRequests', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.notifications"
                  :label="t('settings.notifyInbox')"
                  @update:model-value="(v) => onNotificationFlagChange('notifications', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.releases"
                  :label="t('settings.notifyReleases')"
                  @update:model-value="(v) => onNotificationFlagChange('releases', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.discussions"
                  :label="t('settings.notifyDiscussions')"
                  @update:model-value="(v) => onNotificationFlagChange('discussions', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.commits"
                  :label="t('settings.notifyCommits')"
                  @update:model-value="(v) => onNotificationFlagChange('commits', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.securityAlerts"
                  :label="t('settings.notifySecurityAlerts')"
                  @update:model-value="(v) => onNotificationFlagChange('securityAlerts', v)"
                />
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.checks"
                  :label="t('settings.notifyChecks')"
                  @update:model-value="(v) => onNotificationFlagChange('checks', v)"
                />
              </div>
            </div>
            <div>
              <p :class="ui.sectionTitle()">{{ t("settings.notifyScheduleSection") }}</p>
              <p :class="ui.meta()">{{ t("settings.notifyScheduleHint") }}</p>
              <p :class="[ui.sectionTitle(), 'mt-3']">{{ t("settings.notifyScheduleDays") }}</p>
              <div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <BaseCheckbox
                  v-for="option in notificationDayOptions"
                  :key="option.day"
                  full-width
                  :model-value="settingsStore.notifications.notifyDays[option.day]"
                  :label="option.label"
                  @update:model-value="(v) => onNotifyDayChange(option.day, v)"
                />
              </div>
              <div :class="[ui.checks(), 'mt-3']">
                <BaseCheckbox
                  full-width
                  :model-value="settingsStore.notifications.notifyAllDay"
                  :label="t('settings.notifyScheduleAllDay')"
                  @update:model-value="onNotifyAllDayChange"
                />
              </div>
              <div
                v-if="!settingsStore.notifications.notifyAllDay"
                class="mt-2 grid gap-3 sm:grid-cols-2"
              >
                <BaseField :label="t('settings.notifyScheduleFrom')">
                  <BaseTimeInput
                    :model-value="settingsStore.notifications.notifyTimeStart"
                    @update:model-value="onNotifyTimeStartChange"
                  />
                </BaseField>
                <BaseField :label="t('settings.notifyScheduleTo')">
                  <BaseTimeInput
                    :model-value="settingsStore.notifications.notifyTimeEnd"
                    @update:model-value="onNotifyTimeEndChange"
                  />
                </BaseField>
              </div>
            </div>
          </fieldset>
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.projectsTitle'),
            t('settings.projectsHint'),
            t('settings.projectsTokenHint'),
            t('settings.projectAdd'),
            t('settings.projectEmpty'),
            ...settingsStore.trackedProjects.map((project) => project.owner),
          )
        "
        :title="t('settings.projectsTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.projectsHint") }}</p>
        <div :class="ui.banner()">
          <p :class="ui.meta()">{{ t("settings.projectsTokenHint") }}</p>
          <p :class="ui.meta()">• {{ t("settings.scopeProjects") }}</p>
          <p :class="ui.meta()">{{ t("settings.projectsTokenFineGrainedHint") }}</p>
          <p :class="ui.meta()">
            <code class="rounded bg-amber-100/80 px-1 py-0.5 text-xs dark:bg-amber-900/50">
              {{ t("settings.projectsTokenGhCommand") }}
            </code>
          </p>
          <a
            :class="ui.link()"
            href="#"
            @click.prevent="openExternal(CLASSIC_TOKEN_PROJECTS_URL)"
          >
            {{ t("settings.createClassicTokenWithProjects") }}
          </a>
        </div>
        <p :class="ui.meta()">{{ t("settings.projectNumberHelper") }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <BaseField :label="t('settings.projectOwnerType')">
            <BaseSelect
              v-model="projectOwnerType"
              :options="projectOwnerTypeOptions"
            />
          </BaseField>
          <BaseField :label="t('settings.projectNumber')">
            <BaseInput
              v-model="projectNumber"
              type="number"
              min="1"
              :placeholder="t('settings.projectNumberPlaceholder')"
            />
          </BaseField>
        </div>
        <BaseField :label="t('settings.projectOwner')">
          <BaseInput
            v-model="projectOwner"
            :placeholder="t('settings.projectOwnerPlaceholder')"
          />
        </BaseField>
        <div :class="ui.row()">
          <BaseButton
            size="sm"
            :disabled="!canAddTrackedProject"
            @click="addTrackedProject"
          >
            {{ t("settings.projectAdd") }}
          </BaseButton>
        </div>
        <p v-if="!settingsStore.trackedProjects.length" :class="ui.meta()">
          {{ t("settings.projectEmpty") }}
        </p>
        <div v-else :class="ui.checks()">
          <div
            v-for="project in settingsStore.trackedProjects"
            :key="project.id"
            class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
          >
            <span class="min-w-0 truncate text-sm">
              {{ trackedProjectLabel(project.ownerType, project.owner, project.number) }}
            </span>
            <BaseButton variant="outline" size="sm" @click="removeTrackedProject(project.id)">
              {{ t("settings.projectRemove") }}
            </BaseButton>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.repositoriesTitle'),
            t('settings.repositoriesEnableAll'),
            t('settings.repositoriesDisableAll'),
            t('settings.repositoriesEmpty'),
            ...knownRepos,
          )
        "
        :title="t('settings.repositoriesTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.repositoriesHint") }}</p>
        <div :class="ui.repoActions()">
          <BaseButton
            variant="outline"
            size="sm"
            :disabled="!knownRepos.length"
            @click="enableAllRepos"
          >
            {{ t("settings.repositoriesEnableAll") }}
          </BaseButton>
          <BaseButton
            variant="outline"
            size="sm"
            :disabled="!knownRepos.length"
            @click="disableAllRepos"
          >
            {{ t("settings.repositoriesDisableAll") }}
          </BaseButton>
        </div>
        <BaseField :label="t('settings.repositoriesSearchPlaceholder')">
          <BaseInput
            v-model="repoSearchQuery"
            :placeholder="t('settings.repositoriesSearchPlaceholder')"
          />
        </BaseField>
        <p v-if="!knownRepos.length" :class="ui.meta()">
          {{ t("settings.repositoriesEmpty") }}
        </p>
        <div v-else :class="ui.repoList()">
          <BaseCheckbox
            v-for="repo in sortedReposForVisibility"
            :key="repo"
            full-width
            :model-value="settingsStore.isRepoEnabled(repo)"
            :label="repo"
            @update:model-value="(value) => onRepoEnabledChange(repo, value)"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.workReposTitle'),
            t('settings.workReposHint'),
            ...knownRepos,
          )
        "
        :title="t('settings.workReposTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.workReposHint") }}</p>
        <p v-if="!knownRepos.length" :class="ui.meta()">{{ t("settings.repositoriesEmpty") }}</p>
        <div v-else :class="ui.repoList()">
          <BaseCheckbox
            v-for="repo in sortedReposForWork"
            :key="`work-${repo}`"
            full-width
            :model-value="settingsStore.savedViews.workRepos.includes(repo)"
            :label="repo"
            @update:model-value="(value) => onWorkRepoChange(repo, value)"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.pinnedReposTitle'),
            t('settings.pinnedReposHint'),
            ...settingsStore.savedViews.pinnedRepos,
            ...knownRepos,
          )
        "
        :title="t('settings.pinnedReposTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.pinnedReposHint") }}</p>
        <p v-if="!knownRepos.length" :class="ui.meta()">{{ t("settings.repositoriesEmpty") }}</p>
        <div v-else :class="ui.repoList()">
          <BaseCheckbox
            v-for="repo in sortedReposForPinned"
            :key="`pin-${repo}`"
            full-width
            :model-value="settingsStore.savedViews.pinnedRepos.includes(repo)"
            :label="repo"
            @update:model-value="(value) => onPinnedRepoChange(repo, value)"
          />
        </div>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.urgentTitle'),
            t('settings.urgentPrAgeDays'),
            t('settings.urgentPriorityLabels'),
          )
        "
        :title="t('settings.urgentTitle')"
      >
        <BaseField :label="t('settings.urgentPrAgeDays')">
          <BaseInput
            type="number"
            min="1"
            :model-value="String(settingsStore.savedViews.urgentPrAgeDays)"
            @update:model-value="onUrgentDaysChange"
          />
        </BaseField>
        <BaseField :label="t('settings.urgentPriorityLabels')">
          <BaseInput
            v-model="urgentLabelsInput"
            :placeholder="t('settings.urgentPriorityLabelsPlaceholder')"
            @blur="onUrgentLabelsBlur"
          />
        </BaseField>
      </SettingsCard>

      <SettingsCard
        v-show="
          showSettingsSection(
            t('settings.refreshInterval'),
            t('settings.refreshNow'),
            t('settings.neverRefreshed'),
            t('settings.lastRefreshed', { time: '' }),
          )
        "
        :title="t('settings.refreshInterval')"
      >
        <BaseSelect
          v-model="refreshInterval"
          :options="intervalOptions"
          @update:model-value="onIntervalChange"
        />
        <p :class="ui.meta()">{{ lastRefreshedLabel }}</p>
        <BaseButton variant="outline" :disabled="!store.hasToken" @click="refreshNow">
          {{ t("settings.refreshNow") }}
        </BaseButton>
      </SettingsCard>

      <SettingsCard
        v-show="showSettingsSection(t('settings.theme'), t('settings.launchAtLogin'))"
        :title="t('settings.theme')"
      >
        <BaseSelect
          :model-value="theme"
          :options="themeOptions"
          @update:model-value="onThemeChange"
        />
        <BaseSwitch
          :model-value="autostart.enabled.value"
          :label="t('settings.launchAtLogin')"
          @update:model-value="onAutostartToggle"
        />
      </SettingsCard>

      <p v-if="rateLimitLabel" :class="ui.footer()">{{ rateLimitLabel }}</p>
    </main>

    <BaseToast
      :items="toastItems"
      @dismiss="(id) => (toastItems = toastItems.filter((i) => i.id !== id))"
    />
  </div>
</template>
