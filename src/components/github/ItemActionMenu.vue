<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseButton, BaseContextMenu, BaseModal } from "@/components/ui";
import BaseIcon from "@/components/ui/BaseIcon.vue";
import {
  buildItemActions,
  notificationOpenUrl,
  snoozeKeyForIssue,
  type ItemActionDescriptor,
  type ItemActionId,
  type ItemKind,
} from "@/github/itemActions";
import type { GitHubIssue, GitHubNotification } from "@/github/types";
import { useGitHubStore } from "@/stores/githubStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSnoozeStore } from "@/stores/snoozeStore";

const props = withDefaults(
  defineProps<{
    kind: ItemKind;
    issue?: GitHubIssue;
    notification?: GitHubNotification;
    showButton?: boolean;
  }>(),
  { showButton: true },
);

const { t } = useI18n();
const settingsStore = useSettingsStore();
const snoozeStore = useSnoozeStore();
const githubStore = useGitHubStore();

const menuOpen = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const approveOpen = ref(false);
const approving = ref(false);

const ui = computed(() =>
  tv({
    slots: {
      trigger:
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200",
    },
  })(),
);

const isSnoozed = computed(() => {
  if (!props.issue) return false;
  return snoozeStore.isKeySnoozed(snoozeKeyForIssue(props.issue));
});

const actionDescriptors = computed(() =>
  buildItemActions(props.kind, settingsStore.itemActions, {
    isSnoozed: isSnoozed.value,
    isUnread: props.notification?.unread,
  }),
);

function descriptorKey(action: ItemActionDescriptor): string {
  if (action.id === "snooze" && action.hours != null) {
    return `snooze:${action.hours}`;
  }
  return action.id;
}

function actionLabel(action: ItemActionDescriptor): string {
  switch (action.id) {
    case "open":
      return t("actions.openBrowser");
    case "markRead":
      return t("actions.markRead");
    case "snooze":
      return t("actions.snoozeHours", { hours: action.hours ?? settingsStore.itemActions.defaultSnoozeHours });
    case "unsnooze":
      return t("actions.unsnooze");
    case "openReview":
      return t("actions.openReview");
    case "approve":
      return t("actions.approve");
  }
}

const menuItems = computed(() =>
  actionDescriptors.value.map((action) => ({
    id: descriptorKey(action),
    label: actionLabel(action),
    danger: action.id === "approve",
    icon:
      action.id === "open" || action.id === "openReview"
        ? "open-in-new"
        : action.id === "markRead"
          ? "bell-outline"
          : action.id === "snooze" || action.id === "unsnooze"
            ? "timer-outline"
            : undefined,
  })),
);

const approveTitle = computed(() => {
  if (!props.issue) return t("actions.approve");
  return t("actions.approveConfirmTitle", { number: props.issue.number });
});

const approveBody = computed(() => {
  if (!props.issue) return "";
  return t("actions.approveConfirmBody", { title: props.issue.title });
});

function openAt(x?: number, y?: number) {
  if (x != null && y != null) {
    menuX.value = x;
    menuY.value = y;
  } else {
    menuX.value = window.innerWidth / 2;
    menuY.value = window.innerHeight / 2;
  }
  menuOpen.value = true;
}

function openFromButton(event: MouseEvent) {
  openAt(event.clientX, event.clientY);
}

async function openBrowser() {
  const url =
    props.kind === "notification" && props.notification
      ? notificationOpenUrl(props.notification)
      : props.issue?.html_url;
  if (!url) return;
  try {
    await openUrl(url);
  } catch {
    // ignore
  }
}

async function runAction(actionId: ItemActionId, hours?: number) {
  if (actionId === "approve") {
    approveOpen.value = true;
    return;
  }

  if (actionId === "open") {
    await openBrowser();
    return;
  }

  if (actionId === "markRead" && props.notification) {
    await githubStore.markNotificationRead(props.notification);
    return;
  }

  if (actionId === "openReview" && props.issue) {
    await githubStore.openPullRequestReview(props.issue);
    return;
  }

  if (actionId === "snooze" && props.issue) {
    const duration = hours ?? settingsStore.itemActions.defaultSnoozeHours;
    await githubStore.snoozeIssue(props.issue, duration);
    return;
  }

  if (actionId === "unsnooze" && props.issue) {
    await githubStore.unsnoozeIssue(props.issue);
  }
}

async function onMenuSelect(id: string) {
  if (id.startsWith("snooze:")) {
    const hours = Number(id.slice("snooze:".length));
    await runAction("snooze", hours);
    return;
  }
  await runAction(id as ItemActionId);
}

async function confirmApprove() {
  if (!props.issue) return;
  approving.value = true;
  try {
    await githubStore.approvePullRequest(props.issue);
    approveOpen.value = false;
  } catch {
    // error in store
  } finally {
    approving.value = false;
  }
}

defineExpose({ openAt });
</script>

<template>
  <div class="shrink-0">
    <button
      v-if="props.showButton"
      type="button"
      :class="ui.trigger()"
      :aria-label="t('actions.menu')"
      @click.stop="openFromButton"
    >
      <BaseIcon name="dots-vertical" size="sm" />
    </button>

    <BaseContextMenu
      v-model="menuOpen"
      :items="menuItems"
      :x="menuX"
      :y="menuY"
      @select="onMenuSelect"
    />

    <BaseModal v-model="approveOpen" :title="approveTitle">
      <p>{{ approveBody }}</p>
      <template #footer>
        <BaseButton variant="ghost" @click="approveOpen = false">{{ t("actions.cancel") }}</BaseButton>
        <BaseButton variant="solid" :disabled="approving" @click="confirmApprove">
          {{ t("actions.approve") }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
