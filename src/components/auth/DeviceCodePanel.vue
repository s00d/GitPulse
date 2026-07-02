<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";
import { BaseButton } from "@/components/ui";

const props = defineProps<{
  deviceCode: string | null;
  verificationUrl: string | null;
  waiting?: boolean;
}>();

const emit = defineEmits<{ cancel: [] }>();

const { t } = useI18n();

const ui = computed(() =>
  tv({
    slots: {
      subtitle: "text-sm text-slate-600 dark:text-slate-400",
      codeBox:
        "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 font-mono text-2xl font-bold tracking-widest dark:border-slate-700 dark:bg-slate-800",
      hint: "text-xs text-slate-500 dark:text-slate-400",
    },
  })(),
);

async function openBrowser() {
  try {
    await openUrl(props.verificationUrl ?? "https://github.com/login/device");
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4">
    <p :class="ui.subtitle()">{{ t("auth.enterCode") }}</p>
    <div :class="ui.codeBox()">{{ props.deviceCode ?? "····-····" }}</div>
    <BaseButton @click="openBrowser">{{ t("auth.openBrowser") }}</BaseButton>
    <p v-if="props.waiting" :class="ui.hint()">{{ t("auth.waiting") }}</p>
    <BaseButton variant="outline" @click="emit('cancel')">{{ t("auth.cancel") }}</BaseButton>
  </div>
</template>
