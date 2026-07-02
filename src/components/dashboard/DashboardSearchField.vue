<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { BaseIcon, BaseInput } from "@/components/ui";

const query = defineModel<string>({ default: "" });
const props = withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: undefined,
});
const { t } = useI18n();
</script>

<template>
  <div class="relative min-w-0 [&_input]:pl-9">
    <span
      class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 dark:text-slate-500"
    >
      <BaseIcon name="magnify" size="xs" />
    </span>
    <BaseInput
      v-model="query"
      type="search"
      :placeholder="props.placeholder ?? t('search.placeholder')"
      autocomplete="off"
      spellcheck="false"
    />
  </div>
</template>
