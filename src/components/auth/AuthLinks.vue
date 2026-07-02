<script setup lang="ts">
import { computed } from "vue";
import { openUrl } from "@tauri-apps/plugin-opener";
import { tv } from "@/lib/tv";

const props = defineProps<{
  installLabel: string;
  patLabel: string;
  installUrl: string;
  patUrl: string;
}>();

const ui = computed(() =>
  tv({
    slots: {
      links: "flex flex-wrap justify-center gap-3 text-sm",
      link: "text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400",
    },
  })(),
);

async function openExternal(url: string) {
  try {
    await openUrl(url);
  } catch {
    // ignore
  }
}
</script>

<template>
  <div :class="ui.links()">
    <a :class="ui.link()" href="#" @click.prevent="openExternal(props.installUrl)">
      {{ props.installLabel }}
    </a>
    <a :class="ui.link()" href="#" @click.prevent="openExternal(props.patUrl)">
      {{ props.patLabel }}
    </a>
  </div>
</template>
