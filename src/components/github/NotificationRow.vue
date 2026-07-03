<script setup lang="ts">
import { computed, ref } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseIcon } from "@/components/ui";
import ItemActionMenu from "./ItemActionMenu.vue";
import { notificationOpenUrl } from "@/github/itemActions";
import type { GitHubNotification } from "@/github/types";
import { useSettingsStore } from "@/stores/settingsStore";

const props = defineProps<{ notification: GitHubNotification }>();

const settingsStore = useSettingsStore();
const actionMenuRef = ref<InstanceType<typeof ItemActionMenu> | null>(null);

const ui = computed(() =>
  tv({
    slots: {
      row: "group flex w-full items-start gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60",
      mainButton: "flex min-w-0 flex-1 items-start gap-3 text-left",
      indicator: "mt-1 shrink-0",
      indicatorUnread: "text-indigo-500 dark:text-indigo-400",
      indicatorRead: "text-slate-300 dark:text-slate-600",
      main: "min-w-0 flex-1",
      repo: "flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400",
      title: "truncate text-sm font-medium text-slate-900 dark:text-slate-100",
      meta: "mt-0.5 text-xs text-slate-500 dark:text-slate-400",
    },
  })(),
);

const showActionButton = computed(() => settingsStore.itemActions.showRowActionButton);
const showActionMenu = computed(
  () => showActionButton.value || settingsStore.itemActions.primaryClick === "actionMenu",
);

async function openBrowser() {
  const url = notificationOpenUrl(props.notification);
  try {
    await openUrl(url);
  } catch {
    // ignore
  }
}

function onRowClick(event: MouseEvent) {
  if (settingsStore.itemActions.primaryClick === "actionMenu") {
    actionMenuRef.value?.openAt(event.clientX, event.clientY);
    return;
  }
  void openBrowser();
}
</script>

<template>
  <div :class="ui.row()">
    <button type="button" :class="ui.mainButton()" @click="onRowClick">
      <span
        :class="[
          ui.indicator(),
          props.notification.unread ? ui.indicatorUnread() : ui.indicatorRead(),
        ]"
      >
        <BaseIcon name="bell-outline" size="sm" />
      </span>
      <div :class="ui.main()">
        <p :class="ui.repo()">
          <BaseIcon name="source-repository" size="xs" />
          {{ props.notification.repository.full_name }}
        </p>
        <p :class="ui.title()">{{ props.notification.subject.title }}</p>
        <p :class="ui.meta()">{{ new Date(props.notification.updated_at).toLocaleDateString() }}</p>
      </div>
    </button>
    <ItemActionMenu
      v-if="showActionMenu"
      ref="actionMenuRef"
      kind="notification"
      :notification="props.notification"
      :show-button="showActionButton"
    />
  </div>
</template>
