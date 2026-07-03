import { defineStore } from "pinia";
import { useTauriStore } from "@/composables/useTauriStore";
import {
  isSnoozed,
  pruneExpiredSnoozes,
  snoozeUntil,
  type SnoozeMap,
} from "@/github/snooze";

interface SnoozeSchema extends Record<string, unknown> {
  items: SnoozeMap;
}

const snoozeStorage = useTauriStore<SnoozeSchema>("snooze.json", {
  defaults: { items: {} },
});

export const useSnoozeStore = defineStore("snooze", {
  state: () => ({
    items: {} as SnoozeMap,
    initialized: false,
  }),

  getters: {
    isKeySnoozed: (state) => (key: string) => isSnoozed(state.items, key),
  },

  actions: {
    async init() {
      if (this.initialized) return;

      await snoozeStorage.init();
      const saved = await snoozeStorage.get("items");
      this.items = pruneExpiredSnoozes(saved ?? {});
      if (saved && Object.keys(saved).length !== Object.keys(this.items).length) {
        await this.persist();
      }
      this.initialized = true;
    },

    async persist() {
      await snoozeStorage.init();
      await snoozeStorage.set("items", this.items);
    },

    async snooze(key: string, hours: number) {
      await this.init();
      this.items = { ...this.items, [key]: { until: snoozeUntil(hours) } };
      await this.persist();
    },

    async unsnooze(key: string) {
      await this.init();
      if (!this.items[key]) return;
      const next = { ...this.items };
      delete next[key];
      this.items = next;
      await this.persist();
    },

    async pruneExpired() {
      await this.init();
      const pruned = pruneExpiredSnoozes(this.items);
      if (Object.keys(pruned).length !== Object.keys(this.items).length) {
        this.items = pruned;
        await this.persist();
      }
    },
  },
});
