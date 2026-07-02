<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { BaseInput } from "@/components/ui";

const query = defineModel<string>({ default: "" });
const props = withDefaults(defineProps<{ placeholder?: string }>(), {
  placeholder: undefined,
});
const { t } = useI18n();
</script>

<template>
  <BaseInput
    v-model="query"
    type="search"
    :placeholder="props.placeholder ?? t('search.placeholder')"
    autocomplete="off"
    spellcheck="false"
  />
</template>
