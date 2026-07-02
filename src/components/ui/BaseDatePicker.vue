<script setup lang="ts">
import BaseInput from "@/components/ui/BaseInput.vue";

const model = defineModel<string>({ default: "" });
const props = withDefaults(
  defineProps<{ disabled?: boolean; size?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" }>(),
  {
    disabled: false,
    size: "md",
  },
);
</script>

<template>
  <BaseInput v-model="model" type="date" :disabled="props.disabled" :size="props.size" />
</template>
