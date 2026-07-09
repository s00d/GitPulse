import type { ActivityChangeKind, ActivityEvent, ActivityItemKind } from "@/github/itemDiff";
import {
  ACTIVITY_KIND_LABEL_KEYS,
  activityChangeLabelKey,
  formatActivityTrayLabel,
} from "@/github/activityFormat";
import type { PrCiStatus } from "@/github/types";
import type { TrayGlyph } from "@/tray/trayIconGenerator";

const ACTIVITY_KIND_GLYPH: Record<
  ActivityItemKind,
  | "issue"
  | "pullRequest"
  | "notification"
  | "discussion"
  | "release"
  | "commit"
  | "security"
  | "check"
> = {
  issue: "issue",
  pull_request: "pullRequest",
  notification: "notification",
  discussion: "discussion",
  release: "release",
  commit: "commit",
  security: "security",
  check: "check",
};

function activityGlyphName(kind: ActivityItemKind, change: ActivityChangeKind): TrayGlyph {
  const base = ACTIVITY_KIND_GLYPH[kind];
  const suffix = change === "added" ? "Added" : "Updated";
  return `${base}${suffix}` as TrayGlyph;
}

export function activityTrayGlyph(event: ActivityEvent): TrayGlyph {
  return activityGlyphName(event.kind, event.change);
}

export function issueTrayGlyph(input: {
  isPr: boolean;
  draft?: boolean | null;
  ciStatus?: PrCiStatus;
}): TrayGlyph {
  if (input.draft) return "issueDraft";
  if (input.isPr && input.ciStatus?.state === "success") return "pullRequestCiSuccess";
  if (input.isPr && input.ciStatus?.state === "failure") return "pullRequestCiFailure";
  if (input.isPr && input.ciStatus?.state === "pending") return "pullRequestCiPending";
  return input.isPr ? "pullRequest" : "issue";
}

type TranslateFn = (key: string) => string;

export function formatActivityTrayText(event: ActivityEvent, t: TranslateFn): string {
  return formatActivityTrayLabel(event, {
    changeLabel: t(activityChangeLabelKey(event.change)),
    kindLabel: t(ACTIVITY_KIND_LABEL_KEYS[event.kind]),
  });
}
