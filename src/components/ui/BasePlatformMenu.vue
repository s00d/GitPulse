<script setup lang="ts">
import { onClickOutside, useMediaQuery } from "@vueuse/core";
import { computed, ref } from "vue";
import { tv } from "@/lib/tv";
import { uiMotion } from "@/lib/ui-tv";
import BaseIcon from "./BaseIcon.vue";

type MenuItem = {
  label: string;
  value: string;
  icon: string;
};

const model = defineModel<string>({ default: "" });
const desktopOpenModel = defineModel<boolean>("desktopOpen", { default: false });
const props = defineProps<{
  items: MenuItem[];
  showDesktopToggle?: boolean;
}>();

const isDesktop = useMediaQuery("(min-width: 1024px)");
const panelRef = ref<HTMLElement | null>(null);

onClickOutside(panelRef, () => {
  if (!isDesktop.value) return;
  desktopOpenModel.value = false;
});

const menuTv = tv({
  slots: {
    desktopToggle:
      "fixed left-3 top-3 z-[995] inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/95 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:hover:bg-slate-900",
    desktopBackdrop: `fixed inset-0 z-[989] bg-black/25 transition-opacity ${uiMotion.base}`,
    desktopPanel:
      "fixed inset-y-2 left-2 z-[990] w-[min(20rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900",
    desktopPanelInline:
      "w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900",
    desktopTitle:
      "mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
    desktopList: "space-y-1",
    desktopItem:
      "inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    desktopItemActive:
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-500",
    mobileBar:
      "fixed inset-x-2 bottom-2 z-[995] rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95",
    mobileList: "grid grid-cols-3 gap-1",
    mobileItem:
      "inline-flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium text-slate-600 transition-all duration-200 active:scale-95 dark:text-slate-300",
    mobileItemActive: "bg-indigo-600 text-white shadow-sm dark:bg-indigo-500",
  },
});

const ui = computed(() => menuTv());

function select(value: string) {
  model.value = value;
  if (isDesktop.value) desktopOpenModel.value = false;
}
</script>

<template>
  <template v-if="isDesktop">
    <button
      v-if="props.showDesktopToggle !== false"
      type="button"
      :class="ui.desktopToggle()"
      @click="desktopOpenModel = !desktopOpenModel"
    >
      <BaseIcon :name="desktopOpenModel ? 'close' : 'menu'" size="sm" />
      <span>Меню</span>
    </button>
    <div v-if="props.showDesktopToggle !== false && desktopOpenModel" :class="ui.desktopBackdrop()" />
    <aside
      v-if="props.showDesktopToggle === false || desktopOpenModel"
      ref="panelRef"
      :class="props.showDesktopToggle === false ? ui.desktopPanelInline() : ui.desktopPanel()"
    >
      <p :class="ui.desktopTitle()">Разделы</p>
      <nav :class="ui.desktopList()">
        <button
          v-for="item in props.items"
          :key="item.value"
          type="button"
          :class="[ui.desktopItem(), model === item.value ? ui.desktopItemActive() : '']"
          @click="select(item.value)"
        >
          <BaseIcon :name="item.icon" size="sm" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>
  </template>

  <Teleport to="#overlay-root">
    <nav v-if="!isDesktop" :class="ui.mobileBar()">
      <div :class="ui.mobileList()">
        <button
          v-for="item in props.items"
          :key="item.value"
          type="button"
          :class="[ui.mobileItem(), model === item.value ? ui.mobileItemActive() : '']"
          @click="select(item.value)"
        >
          <BaseIcon :name="item.icon" size="sm" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </nav>
  </Teleport>
</template>
