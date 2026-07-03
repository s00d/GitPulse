<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { invoke } from "@tauri-apps/api/core";
import { tv } from "@/lib/tv";
import { AuthLinks, DeviceCodePanel, SignInActions } from "@/components/auth";
import { useGitHubAuthFlow } from "@/composables/useGitHubAuthFlow";
import { useGitHubStore } from "@/stores/githubStore";

const emit = defineEmits<{ signedIn: [] }>();

const GH_INSTALL_URL = "https://cli.github.com";
const CLASSIC_TOKEN_URL =
  "https://github.com/settings/tokens/new?description=GitPulse&scopes=repo,read:project";

const { t } = useI18n();
const store = useGitHubStore();
const authFlow = useGitHubAuthFlow();
const ghImportLoading = ref(false);

type Phase = "idle" | "code" | "waiting" | "success" | "error";

const phase = ref<Phase>("idle");
const errorMessage = ref<string | null>(null);
const oauthConfigured = ref(true);

const ui = computed(() =>
  tv({
    slots: {
      root: "mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-5 py-10 text-center",
      title: "text-2xl font-bold text-slate-900 dark:text-slate-100",
      subtitle: "text-sm text-slate-600 dark:text-slate-400",
      error:
        "w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
      hint: "text-xs text-slate-500 dark:text-slate-400",
    },
  })(),
);

async function completeSignIn(token: string) {
  await store.signInWithToken(token);
  phase.value = "success";
  emit("signedIn");
}

async function startDeviceLogin() {
  phase.value = "code";
  errorMessage.value = null;
  try {
    const token = await authFlow.startDeviceLogin();
    phase.value = "waiting";
    await completeSignIn(token);
  } catch (err) {
    phase.value = "error";
    errorMessage.value = err instanceof Error ? err.message : String(err);
  }
}

async function importFromGh() {
  errorMessage.value = null;
  try {
    ghImportLoading.value = true;
    await store.importTokenFromGhCli();
    phase.value = "success";
    emit("signedIn");
  } catch (err) {
    phase.value = "error";
    errorMessage.value = err instanceof Error ? err.message : String(err);
  } finally {
    ghImportLoading.value = false;
  }
}

function cancelDeviceLogin() {
  void authFlow.cancelDeviceLogin();
  phase.value = "idle";
}

onBeforeUnmount(() => {
  void authFlow.cancelDeviceLogin();
});

void store.detectGhCliStatus();

onMounted(async () => {
  try {
    oauthConfigured.value = await invoke<boolean>("github_oauth_is_configured");
  } catch {
    oauthConfigured.value = false;
  }
});
</script>

<template>
  <div :class="ui.root()">
    <div>
      <h1 :class="ui.title()">{{ t("signIn.title") }}</h1>
      <p :class="ui.subtitle()">{{ t("signIn.subtitle") }}</p>
    </div>

    <template v-if="phase === 'idle' || phase === 'error'">
      <p v-if="!oauthConfigured" :class="ui.hint()">{{ t("auth.oauthNotConfigured") }}</p>
      <SignInActions
        :show-gh-import="store.ghCliStatus === 'authed'"
        :gh-loading="ghImportLoading"
        @sign-in="startDeviceLogin"
        @import-gh="importFromGh"
      >
        <template #primary-label>{{ t("signIn.signInButton") }}</template>
        <template #gh-label>{{ t("signIn.importGh") }}</template>
      </SignInActions>
      <p :class="ui.hint()">{{ t("signIn.noGhHint") }}</p>
      <AuthLinks
        :install-label="t('signIn.installGh')"
        :pat-label="t('signIn.createPat')"
        :install-url="GH_INSTALL_URL"
        :pat-url="CLASSIC_TOKEN_URL"
      />
      <p v-if="phase === 'error'" :class="ui.error()">
        {{ errorMessage ?? authFlow.error.value }}
      </p>
    </template>

    <DeviceCodePanel
      v-else-if="phase === 'code' || phase === 'waiting'"
      :device-code="authFlow.deviceCode.value"
      :verification-url="authFlow.verificationUrl.value"
      :waiting="phase === 'waiting'"
      @cancel="cancelDeviceLogin"
    />

    <p v-else-if="phase === 'success'" :class="ui.subtitle()">{{ t("auth.success") }}</p>
  </div>
</template>
