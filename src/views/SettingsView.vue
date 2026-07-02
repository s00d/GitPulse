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
  BaseToast,
} from "@/components/ui";
import { useAutostart } from "@/composables/useAutostart";
import { useGitHubAuthFlow } from "@/composables/useGitHubAuthFlow";
import { useNotification } from "@/composables/useNotification";
import { useTheme } from "@/composables/useTheme";
import { SettingsCard } from "@/components/settings";
import { DashboardSearchField } from "@/components/dashboard";
import type { MenuVisibilitySettings, NotificationSettings, RefreshInterval } from "@/settings/appSettings";
import { matchesSearch } from "@/github/search";
import { useGitHubStore } from "@/stores/githubStore";
import { useSettingsStore } from "@/stores/settingsStore";

const props = withDefaults(defineProps<{ embedded?: boolean }>(), { embedded: false });

const CLASSIC_TOKEN_URL =
  "https://github.com/settings/tokens/new?description=GitPulse&scopes=repo";
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
    repoList: "max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-800",
  },
});
const ui = computed(() => pageTv());

const rootClass = computed(() => (props.embedded ? ui.value.rootEmbedded() : ui.value.root()));

const intervalOptions = computed(() => [
  { label: t("settings.interval30s"), value: "30s" },
  { label: t("settings.interval60s"), value: "60s" },
  { label: t("settings.interval5m"), value: "5m" },
  { label: t("settings.intervalManual"), value: "manual" },
]);

const themeOptions = computed(() => [
  { label: t("settings.themeLight"), value: "light" },
  { label: t("settings.themeDark"), value: "dark" },
]);

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

const filteredKnownRepos = computed(() =>
  knownRepos.value.filter(
    (repo) =>
      matchesSearch([repo], settingsSearchQuery.value) &&
      matchesSearch([repo], repoSearchQuery.value),
  ),
);

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
}

async function onNotificationFlagChange(key: keyof NotificationSettings, value: boolean) {
  await settingsStore.setNotificationFlag(key, value);
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
}

async function enableAllRepos() {
  await settingsStore.setRepoVisibilityBulk(knownRepos.value, true);
  store.applyRepoVisibilityFilter();
}

async function disableAllRepos() {
  await settingsStore.setRepoVisibilityBulk(knownRepos.value, false);
  store.applyRepoVisibilityFilter();
}

onMounted(async () => {
  await settingsStore.init();
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
            t('settings.showIssues'),
            t('settings.showPullRequests'),
            t('settings.showStars'),
            t('settings.showWatching'),
            t('settings.showNotifications'),
          )
        "
        :title="t('settings.menuVisibility')"
      >
        <BaseCheckbox
          :model-value="settingsStore.menuVisibility.showIssues"
          :label="t('settings.showIssues')"
          @update:model-value="(v) => onMenuVisibilityChange('showIssues', v)"
        />
        <BaseCheckbox
          :model-value="settingsStore.menuVisibility.showPullRequests"
          :label="t('settings.showPullRequests')"
          @update:model-value="(v) => onMenuVisibilityChange('showPullRequests', v)"
        />
        <BaseCheckbox
          :model-value="settingsStore.menuVisibility.showStars"
          :label="t('settings.showStars')"
          @update:model-value="(v) => onMenuVisibilityChange('showStars', v)"
        />
        <BaseCheckbox
          :model-value="settingsStore.menuVisibility.showWatching"
          :label="t('settings.showWatching')"
          @update:model-value="(v) => onMenuVisibilityChange('showWatching', v)"
        />
        <BaseCheckbox
          :model-value="settingsStore.menuVisibility.showNotifications"
          :label="t('settings.showNotifications')"
          @update:model-value="(v) => onMenuVisibilityChange('showNotifications', v)"
        />
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
          )
        "
        :title="t('settings.notificationsTitle')"
      >
        <p :class="ui.meta()">{{ t("settings.notificationsEnabledHint") }}</p>
        <BaseSwitch
          :model-value="settingsStore.notificationSettings.enabled"
          :label="t('settings.notificationsEnabled')"
          @update:model-value="(v) => onNotificationFlagChange('enabled', v)"
        />
        <BaseButton variant="outline" @click="requestNotificationPermission">
          {{ t("settings.notificationsRequestPermission") }}
        </BaseButton>
        <p v-if="systemNotifications.permissionGranted.value" :class="ui.meta()">
          {{ t("settings.notificationsPermissionGranted") }}
        </p>
        <div :class="ui.checks()">
          <BaseCheckbox
            :model-value="settingsStore.notificationSettings.notifyAdded"
            :label="t('settings.notifyAdded')"
            :disabled="!settingsStore.notificationSettings.enabled"
            @update:model-value="(v) => onNotificationFlagChange('notifyAdded', v)"
          />
          <BaseCheckbox
            :model-value="settingsStore.notificationSettings.notifyUpdated"
            :label="t('settings.notifyUpdated')"
            :disabled="!settingsStore.notificationSettings.enabled"
            @update:model-value="(v) => onNotificationFlagChange('notifyUpdated', v)"
          />
          <BaseCheckbox
            :model-value="settingsStore.notificationSettings.issues"
            :label="t('settings.notifyIssues')"
            :disabled="!settingsStore.notificationSettings.enabled"
            @update:model-value="(v) => onNotificationFlagChange('issues', v)"
          />
          <BaseCheckbox
            :model-value="settingsStore.notificationSettings.pullRequests"
            :label="t('settings.notifyPullRequests')"
            :disabled="!settingsStore.notificationSettings.enabled"
            @update:model-value="(v) => onNotificationFlagChange('pullRequests', v)"
          />
          <BaseCheckbox
            :model-value="settingsStore.notificationSettings.notifications"
            :label="t('settings.notifyInbox')"
            :disabled="!settingsStore.notificationSettings.enabled"
            @update:model-value="(v) => onNotificationFlagChange('notifications', v)"
          />
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
            v-for="repo in filteredKnownRepos"
            :key="repo"
            :model-value="settingsStore.isRepoEnabled(repo)"
            :label="repo"
            @update:model-value="(value) => onRepoEnabledChange(repo, value)"
          />
        </div>
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
