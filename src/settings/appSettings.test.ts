import { describe, expect, it } from "vitest";
import {
  createNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  isNotificationSettings,
  resolveNotificationSettings,
} from "@/settings/appSettings";

describe("notification settings", () => {
  it("creates defaults with all days enabled", () => {
    const settings = createNotificationSettings();
    expect(settings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    expect(settings.notifyDays).not.toBe(DEFAULT_NOTIFICATION_SETTINGS.notifyDays);
  });

  it("accepts only the current schema", () => {
    expect(isNotificationSettings(createNotificationSettings())).toBe(true);
    expect(isNotificationSettings(null)).toBe(false);
    expect(
      isNotificationSettings({
        enabled: true,
        notifyAdded: true,
      }),
    ).toBe(false);
  });

  it("resolves invalid values to defaults", () => {
    const settings = resolveNotificationSettings({ enabled: true });
    expect(isNotificationSettings(settings)).toBe(true);
    expect(settings.notifyDays.mon).toBe(true);
  });
});
