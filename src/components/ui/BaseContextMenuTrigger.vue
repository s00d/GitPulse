<script setup lang="ts">
import { ref } from "vue";
import BaseContextMenu from "./BaseContextMenu.vue";

type MenuItem = { id: string; label: string; disabled?: boolean; danger?: boolean; icon?: string };
type TriggerMode = "right-click" | "left-click" | "both";

const props = withDefaults(
  defineProps<{
    items: MenuItem[];
    disabled?: boolean;
    trigger?: TriggerMode;
  }>(),
  {
    disabled: false,
    trigger: "right-click",
  },
);

const emit = defineEmits<{ select: [string] }>();
const open = ref(false);
const pos = ref({ x: 0, y: 0 });

function onContextMenu(event: MouseEvent) {
  if (props.disabled) return;
  if (props.trigger === "left-click") return;
  event.preventDefault();
  if (open.value) {
    open.value = false;
    return;
  }
  pos.value = { x: event.clientX, y: event.clientY };
  open.value = true;
}

function onLeftClick(event: MouseEvent) {
  if (props.disabled) return;
  if (props.trigger === "right-click") return;
  if (open.value) {
    open.value = false;
    return;
  }

  const target = event.currentTarget as HTMLElement | null;
  if (!target) return;

  const rect = target.getBoundingClientRect();
  pos.value = { x: rect.left, y: rect.bottom + 4 };
  open.value = true;
}
</script>

<template>
  <div class="contents" @contextmenu="onContextMenu" @click="onLeftClick">
    <slot />
  </div>
  <BaseContextMenu
    v-model="open"
    :x="pos.x"
    :y="pos.y"
    :items="props.items"
    @select="emit('select', $event)"
  />
</template>
