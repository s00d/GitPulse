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
  badge?: number;
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
      "flex h-full min-h-0 w-full flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900",
    desktopTitle:
      "mb-2 shrink-0 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400",
    desktopList: "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto",
    desktopItem:
      "inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
    desktopItemActive:
      "bg-indigo-600 text-white shadow-sm hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-500",
    itemMain: "inline-flex min-w-0 items-center gap-2",
    badge:
      "rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200",
    badgeActive: "bg-white/20 text-white dark:bg-white/20",
    mobileBar:
      "fixed inset-x-2 bottom-2 z-[995] rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95",
    mobileList:
      "flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]",
    mobileItem:
      "relative inline-flex min-h-14 w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-medium text-slate-600 transition-all duration-200 active:scale-95 dark:text-slate-300",
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
    <div
      v-if="props.showDesktopToggle !== false && desktopOpenModel"
      :class="ui.desktopBackdrop()"
    />
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
          <span :class="ui.itemMain()">
            <BaseIcon :name="item.icon" size="sm" />
            <span>{{ item.label }}</span>
          </span>
          <span
            v-if="item.badge"
            :class="[ui.badge(), model === item.value ? ui.badgeActive() : '']"
          >
            {{ item.badge }}
          </span>
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
          <span
            v-if="item.badge"
            class="absolute right-2 top-1 rounded-full bg-indigo-600 px-1 text-[9px] font-semibold text-white"
          >
            {{ item.badge }}
          </span>
          <BaseIcon :name="item.icon" size="sm" />
          <span class="w-full truncate text-center">{{ item.label }}</span>
        </button>
      </div>
    </nav>
  </Teleport>
</template>
