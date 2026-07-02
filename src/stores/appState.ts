import { defineStore } from "pinia";

interface AppState {
  launchCount: number;
  lastOpenedAt: string | null;
}

export const useAppStateStore = defineStore("app-state", {
  state: (): AppState => ({
    launchCount: 0,
    lastOpenedAt: null,
  }),
  actions: {
    initSession() {
      this.launchCount += 1;
      this.lastOpenedAt = new Date().toISOString();
    },
    increment() {
      this.launchCount += 1;
    },
  },
});
