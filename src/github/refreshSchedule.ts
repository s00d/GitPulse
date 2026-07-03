import type { RefreshInterval } from "@/settings/appSettings";

const INTERVAL_MS: Record<Exclude<RefreshInterval, "manual">, number> = {
  "30s": 30_000,
  "60s": 60_000,
  "5m": 300_000,
  "1h": 3_600_000,
  "1d": 86_400_000,
};

export function refreshIntervalMs(interval: RefreshInterval): number | null {
  if (interval === "manual") return null;
  return INTERVAL_MS[interval];
}

export function isRefreshDue(
  lastRefreshed: string | null,
  interval: RefreshInterval,
  now = Date.now(),
): boolean {
  if (!lastRefreshed) return true;
  const ms = refreshIntervalMs(interval);
  if (ms == null) return false;
  const last = new Date(lastRefreshed).getTime();
  if (!Number.isFinite(last)) return true;
  return now - last >= ms;
}

export function msUntilNextRefresh(
  lastRefreshed: string | null,
  interval: RefreshInterval,
  now = Date.now(),
): number {
  const ms = refreshIntervalMs(interval);
  if (ms == null) return Number.POSITIVE_INFINITY;
  if (!lastRefreshed) return 0;
  const last = new Date(lastRefreshed).getTime();
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, ms - (now - last));
}
