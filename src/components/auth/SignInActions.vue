<script setup lang="ts">
import { BaseButton, BaseIcon } from "@/components/ui";

defineProps<{
  showGhImport?: boolean;
  ghLoading?: boolean;
}>();

const emit = defineEmits<{
  signIn: [];
  importGh: [];
}>();
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <BaseButton class="w-full" @click="emit('signIn')">
      <BaseIcon name="github" size="sm" />
      <slot name="primary-label" />
    </BaseButton>
    <BaseButton
      v-if="showGhImport"
      class="w-full"
      variant="outline"
      :disabled="ghLoading"
      @click="emit('importGh')"
    >
      <BaseIcon name="download-outline" size="sm" />
      <slot name="gh-label" />
    </BaseButton>
  </div>
</template>
