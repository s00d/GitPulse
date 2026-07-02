<script setup lang="ts">
import { computed } from "vue";
import { fieldStyles } from "@/lib/ui-tv";

const props = withDefaults(
  defineProps<{
    label?: string;
    helper?: string;
    error?: string;
  }>(),
  {
    label: undefined,
    helper: undefined,
    error: undefined,
  },
);
const label = computed(() => props.label);
const helper = computed(() => props.helper);
const error = computed(() => props.error);
const ui = computed(() => fieldStyles());
</script>

<template>
  <label :class="ui.wrapper()">
    <span v-if="label" :class="ui.label()">{{ label }}</span>
    <slot />
    <span v-if="error" :class="ui.error()">{{ error }}</span>
    <span v-else-if="helper" :class="ui.helper()">{{ helper }}</span>
  </label>
</template>
