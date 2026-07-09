import { describe, expect, it } from "vitest";
import {
  formatActivityLine,
  formatActivityTrayLabel,
} from "@/github/activityFormat";
import type { ActivityEvent } from "@/github/itemDiff";

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "e1",
    itemKey: "item:1",
    kind: "pull_request",
    change: "added",
    title: "Fix auth",
    repo: "acme/widget",
    url: "https://github.com/acme/widget/pull/1",
    detectedAt: "2026-01-02T00:00:00Z",
    itemUpdatedAt: "2026-01-01T12:00:00Z",
    number: 1,
    ...overrides,
  };
}

describe("formatActivityLine", () => {
  it("uses words instead of +/~ prefixes", () => {
    expect(formatActivityLine(makeEvent())).toBe("New PR · acme/widget");
    expect(
      formatActivityLine(
        makeEvent({ kind: "issue", change: "updated" }),
      ),
    ).toBe("Updated Issue · acme/widget");
  });

  it("supports localized labels", () => {
    expect(
      formatActivityLine(makeEvent(), {
        changeLabel: "Новый",
        kindLabel: "PR",
      }),
    ).toBe("Новый PR · acme/widget");
  });
});

describe("formatActivityTrayLabel", () => {
  it("appends tab-separated date without symbol prefixes", () => {
    const label = formatActivityTrayLabel(makeEvent());
    expect(label).toContain("New PR · acme/widget");
    expect(label).not.toMatch(/^\+|~/);
    expect(label).toContain("\t");
  });
});
