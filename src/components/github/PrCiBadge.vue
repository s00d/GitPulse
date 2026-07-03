<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { tv } from "@/lib/tv";
import type { PrCiStatus } from "@/github/types";

const props = defineProps<{ status: PrCiStatus }>();

const { t } = useI18n();

const ui = computed(() =>
  tv({
    slots: {
      chip:
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
      failure: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
      pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    },
  })(),
);

const label = computed(() => {
  switch (props.status.state) {
    case "success":
      return t("pr.ciSuccess");
    case "failure":
      return t("pr.ciFailed");
    case "pending":
      return t("pr.ciPending");
    default:
      return "";
  }
});

const toneClass = computed(() => {
  switch (props.status.state) {
    case "success":
      return ui.value.success();
    case "failure":
      return ui.value.failure();
    case "pending":
      return ui.value.pending();
    default:
      return "";
  }
});
</script>

<template>
  <span v-if="status.state !== 'none'" :class="[ui.chip(), toneClass]">
    {{ label }}
  </span>
</template>
