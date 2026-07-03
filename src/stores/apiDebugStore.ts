import { defineStore } from "pinia";
import type { ApiDebugEntry } from "@/github/apiDebug";

export const API_DEBUG_MAX_ENTRIES = 100;

interface ApiDebugState {
  entries: ApiDebugEntry[];
}

export const useApiDebugStore = defineStore("apiDebug", {
  state: (): ApiDebugState => ({
    entries: [],
  }),

  actions: {
    record(entry: ApiDebugEntry) {
      this.entries.unshift(entry);
      if (this.entries.length > API_DEBUG_MAX_ENTRIES) {
        this.entries.length = API_DEBUG_MAX_ENTRIES;
      }
    },

    clear() {
      this.entries = [];
    },
  },
});
