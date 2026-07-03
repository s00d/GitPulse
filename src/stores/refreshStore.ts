import { defineStore } from "pinia";
import { useTauriStore } from "@/composables/useTauriStore";
import {
  buildCountSnapshot,
  computeCountDeltas,
  countSignature,
  type CountSnapshot,
  type CountSource,
} from "@/github/countDiff";
import {
  buildItemSnapshot,
  diffItemSnapshots,
  ITEM_EVENTS_DISPLAY_MAX,
  ITEM_EVENTS_STORE_MAX,
  mergeActivityEvents,
  type ActivityEvent,
  type GitHubItemSource,
  type ItemSnapshot,
} from "@/github/itemDiff";

export type RefreshSource = "bootstrap" | "poll" | "manual";
export interface RefreshRecordInput extends GitHubItemSource, CountSource {}

interface RefreshStateSchema extends Record<string, unknown> {
  events: ActivityEvent[];
  itemSnapshot: ItemSnapshot | null;
  seenCounts: CountSnapshot | null;
}

const defaults: RefreshStateSchema = {
  events: [],
  itemSnapshot: null,
  seenCounts: null,
};

interface RefreshState {
  events: ActivityEvent[];
  itemSnapshot: ItemSnapshot | null;
  seenCounts: CountSnapshot | null;
  currentCounts: CountSnapshot;
  countDeltas: Record<string, number>;
  signature: string;
  initialized: boolean;
}

const tauriStore = useTauriStore<RefreshStateSchema>("refresh-state.json", {
  defaults,
});

let mutationQueue: Promise<unknown> = Promise.resolve();

function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(task, task);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function ensureInitialized(store: RefreshState) {
  if (store.initialized) return;
  await tauriStore.init();
  store.events = (await tauriStore.get("events")) ?? [];
  store.itemSnapshot = (await tauriStore.get("itemSnapshot")) ?? null;
  store.seenCounts = (await tauriStore.get("seenCounts")) ?? null;
  store.initialized = true;
}

export const useRefreshStore = defineStore("refresh", {
  state: (): RefreshState => ({
    events: [],
    itemSnapshot: null,
    seenCounts: null,
    currentCounts: {},
    countDeltas: {},
    signature: "",
    initialized: false,
  }),

  getters: {
    recentEvents(state): ActivityEvent[] {
      return state.events.slice(0, ITEM_EVENTS_DISPLAY_MAX);
    },
  },

  actions: {
    async init() {
      return runExclusive(async () => {
        await ensureInitialized(this);
      });
    },

    async persist() {
      await tauriStore.set("events", this.events);
      await tauriStore.set("itemSnapshot", this.itemSnapshot);
      await tauriStore.set("seenCounts", this.seenCounts);
    },

    recomputeSignature() {
      this.signature = countSignature(this.currentCounts);
    },

    async recordRefresh(
      source: RefreshRecordInput,
      _refreshSource: RefreshSource,
    ): Promise<{ events: ActivityEvent[]; deltas: Record<string, number> }> {
      return runExclusive(async () => {
        await ensureInitialized(this);

        const detectedAt = new Date().toISOString();
        const nextItemSnapshot = buildItemSnapshot(source);
        const nextCounts = buildCountSnapshot(source);

        let incoming: ActivityEvent[] = [];
        if (this.itemSnapshot === null) {
          this.itemSnapshot = nextItemSnapshot;
          this.seenCounts = { ...nextCounts };
          this.countDeltas = {};
        } else {
          incoming = diffItemSnapshots(this.itemSnapshot, nextItemSnapshot, detectedAt);
          this.itemSnapshot = nextItemSnapshot;
          this.countDeltas = computeCountDeltas(nextCounts, this.seenCounts);
        }

        this.currentCounts = nextCounts;
        this.recomputeSignature();

        if (incoming.length) {
          this.events = mergeActivityEvents(this.events, incoming, ITEM_EVENTS_STORE_MAX);
        }

        await this.persist();
        return { events: incoming, deltas: this.countDeltas };
      });
    },

    getCountDelta(key: string): number {
      return this.countDeltas[key] ?? 0;
    },

    async dismissEvent(eventId: string) {
      return runExclusive(async () => {
        await ensureInitialized(this);

        const next = this.events.filter((event) => event.id !== eventId);
        if (next.length === this.events.length) return;
        this.events = next;
        await this.persist();
      });
    },

    async acknowledge(...keys: string[]) {
      return runExclusive(async () => {
        await ensureInitialized(this);

        if (!this.seenCounts) {
          this.seenCounts = {};
        }

        let changed = false;
        for (const key of keys) {
          const value = this.currentCounts[key];
          if (value === undefined) continue;
          if (this.seenCounts[key] !== value) {
            this.seenCounts[key] = value;
            changed = true;
          }
        }

        if (changed) {
          this.countDeltas = computeCountDeltas(this.currentCounts, this.seenCounts);
          this.recomputeSignature();
          await this.persist();
        }
      });
    },

    async clear() {
      return runExclusive(async () => {
        await tauriStore.init();

        this.events = [];
        this.itemSnapshot = null;
        this.seenCounts = null;
        this.currentCounts = {};
        this.countDeltas = {};
        this.signature = "";
        this.initialized = true;
        await this.persist();
      });
    },
  },
});
