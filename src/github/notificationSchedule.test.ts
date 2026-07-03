import { describe, expect, it } from "vitest";
import {
  isMinuteInRange,
  isNotificationScheduleAllowed,
  parseTimeToMinutes,
} from "@/github/notificationSchedule";
import { DEFAULT_NOTIFICATION_SETTINGS } from "@/settings/appSettings";

function atLocalTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

describe("notificationSchedule", () => {
  it("parses HH:mm strings", () => {
    expect(parseTimeToMinutes("09:00")).toBe(9 * 60);
    expect(parseTimeToMinutes("22:30")).toBe(22 * 60 + 30);
    expect(parseTimeToMinutes("invalid")).toBeNull();
  });

  it("detects minute range across midnight", () => {
    const start = parseTimeToMinutes("22:00")!;
    const end = parseTimeToMinutes("07:00")!;
    expect(isMinuteInRange(23 * 60, start, end)).toBe(true);
    expect(isMinuteInRange(12 * 60, start, end)).toBe(false);
    expect(isMinuteInRange(6 * 60 + 30, start, end)).toBe(true);
  });

  it("allows any time when all days are on and notifyAllDay is true", () => {
    expect(
      isNotificationScheduleAllowed(DEFAULT_NOTIFICATION_SETTINGS, atLocalTime(2026, 7, 4, 23)),
    ).toBe(true);
    expect(
      isNotificationScheduleAllowed(DEFAULT_NOTIFICATION_SETTINGS, atLocalTime(2026, 7, 6, 8)),
    ).toBe(true);
  });

  it("blocks when the current day is disabled", () => {
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notifyDays: { ...DEFAULT_NOTIFICATION_SETTINGS.notifyDays, sat: false },
    };
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 4, 12))).toBe(false);
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 12))).toBe(true);
  });

  it("respects time window when notifyAllDay is false", () => {
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notifyAllDay: false,
      notifyTimeStart: "09:00",
      notifyTimeEnd: "22:00",
    };
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 12))).toBe(true);
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 8))).toBe(false);
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 22))).toBe(false);
  });

  it("supports overnight time window", () => {
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notifyAllDay: false,
      notifyTimeStart: "22:00",
      notifyTimeEnd: "07:00",
    };
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 23))).toBe(true);
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 12))).toBe(false);
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 6, 30))).toBe(true);
  });

  it("blocks when no days are selected", () => {
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notifyDays: {
        mon: false,
        tue: false,
        wed: false,
        thu: false,
        fri: false,
        sat: false,
        sun: false,
      },
    };
    expect(isNotificationScheduleAllowed(settings, atLocalTime(2026, 7, 6, 12))).toBe(false);
  });
});
