import { describe, expect, it } from "vitest";
import {
  buildItemActions,
  parsePullRequestRepo,
  pullRequestReviewUrl,
  snoozeKeyForIssue,
} from "@/github/itemActions";
import { DEFAULT_ITEM_ACTION_SETTINGS } from "@/settings/appSettings";
import type { GitHubIssue } from "@/github/types";

function prIssue(): GitHubIssue {
  return {
    id: 10,
    number: 5,
    title: "Feature",
    state: "open",
    html_url: "https://github.com/acme/app/pull/5",
    repository_url: "https://api.github.com/repos/acme/app",
    user: { login: "alice" },
    labels: [],
    updated_at: new Date().toISOString(),
    comments: 0,
    pull_request: { html_url: "https://github.com/acme/app/pull/5" },
  };
}

describe("itemActions", () => {
  it("builds review url", () => {
    expect(pullRequestReviewUrl(prIssue())).toBe("https://github.com/acme/app/pull/5/files");
  });

  it("parses pull request repo coordinates", () => {
    expect(parsePullRequestRepo(prIssue())).toEqual({
      owner: "acme",
      repo: "app",
      number: 5,
    });
  });

  it("builds snooze key for pull requests", () => {
    expect(snoozeKeyForIssue(prIssue())).toBe("pr:10");
  });

  it("includes approve when quick approve is enabled", () => {
    const actions = buildItemActions(
      "pullRequest",
      { ...DEFAULT_ITEM_ACTION_SETTINGS, enableQuickApprove: true },
      { isSnoozed: false },
    );
    expect(actions.some((action) => action.id === "approve")).toBe(true);
    expect(actions.some((action) => action.id === "openReview")).toBe(true);
  });

  it("includes mark read for unread notifications", () => {
    const actions = buildItemActions("notification", DEFAULT_ITEM_ACTION_SETTINGS, {
      isSnoozed: false,
      isUnread: true,
    });
    expect(actions.map((action) => action.id)).toContain("markRead");
  });

  it("omits snooze presets for notifications", () => {
    const actions = buildItemActions("notification", DEFAULT_ITEM_ACTION_SETTINGS, {
      isSnoozed: false,
      isUnread: true,
    });
    expect(actions.some((action) => action.id === "snooze")).toBe(false);
  });
});
