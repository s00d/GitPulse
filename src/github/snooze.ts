export interface SnoozeEntry {
  until: string;
}

export type SnoozeMap = Record<string, SnoozeEntry>;

export function issueSnoozeKey(id: number, isPr: boolean): string {
  return isPr ? `pr:${id}` : `issue:${id}`;
}

export function isSnoozed(map: SnoozeMap, key: string, now = Date.now()): boolean {
  const entry = map[key];
  if (!entry) return false;
  return new Date(entry.until).getTime() > now;
}

export function pruneExpiredSnoozes(map: SnoozeMap, now = Date.now()): SnoozeMap {
  const next: SnoozeMap = {};
  for (const [key, entry] of Object.entries(map)) {
    if (new Date(entry.until).getTime() > now) {
      next[key] = entry;
    }
  }
  return next;
}

export function snoozeUntil(hours: number, now = Date.now()): string {
  return new Date(now + hours * 3_600_000).toISOString();
}

export function filterSnoozed<T>(
  items: T[],
  map: SnoozeMap,
  keyFn: (item: T) => string,
  now = Date.now(),
): T[] {
  return items.filter((item) => !isSnoozed(map, keyFn(item), now));
}
