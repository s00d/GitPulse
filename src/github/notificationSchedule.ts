import type { NotificationDayId, NotificationSettings } from "@/settings/appSettings";
import { resolveNotificationSettings } from "@/settings/appSettings";

const JS_DAY_TO_ID: Record<number, NotificationDayId> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export function isMinuteInRange(minute: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) {
    return minute >= start && minute < end;
  }
  return minute >= start || minute < end;
}

function hasAnyNotifyDay(settings: ReturnType<typeof resolveNotificationSettings>): boolean {
  return Object.values(settings.notifyDays).some(Boolean);
}

export function isNotificationScheduleAllowed(
  settings: NotificationSettings,
  now = new Date(),
): boolean {
  const resolved = resolveNotificationSettings(settings);
  if (!hasAnyNotifyDay(resolved)) return false;

  const dayId = JS_DAY_TO_ID[now.getDay()];
  if (!dayId || !resolved.notifyDays[dayId]) return false;

  if (resolved.notifyAllDay) return true;

  const start = parseTimeToMinutes(resolved.notifyTimeStart);
  const end = parseTimeToMinutes(resolved.notifyTimeEnd);
  if (start == null || end == null) return true;

  const minute = now.getHours() * 60 + now.getMinutes();
  return isMinuteInRange(minute, start, end);
}
