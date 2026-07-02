<script setup lang="ts">
import { tv } from "@/lib/tv";

const layoutTv = tv({
  slots: {
    root: "mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-3 pb-24 pt-4 sm:px-4 sm:pt-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:pb-10 lg:pt-6",
    nav: "space-y-3 lg:sticky lg:top-20 lg:self-start",
    content: "min-w-0 space-y-4 sm:space-y-5 md:space-y-6",
  },
});

const ui = layoutTv();
</script>

<template>
  <div :class="ui.root()">
    <aside :class="ui.nav()">
      <slot name="nav" />
    </aside>
    <section :class="ui.content()">
      <slot />
    </section>
  </div>
</template>
