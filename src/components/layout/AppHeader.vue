<script setup lang="ts">
import { tv } from "@/lib/tv";

const headerTv = tv({
  slots: {
    root: "sticky top-0 z-[994] border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90",
    wrap: "mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6",
    left: "flex min-w-0 items-center gap-2",
    right: "flex items-center gap-2",
  },
});

const ui = headerTv();
</script>

<template>
  <header :class="ui.root()">
    <div :class="ui.wrap()">
      <div :class="ui.left()">
        <slot name="title" />
      </div>
      <div :class="ui.right()">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
