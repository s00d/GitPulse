import { describe, expect, it } from "vitest";
import {
  buildUnreadDiscussionMap,
  enrichDiscussionsWithUnread,
  countUnreadDiscussions,
} from "@/github/discussions";
import type { GitHubDiscussionItem, GitHubNotification } from "@/github/types";

const discussion: GitHubDiscussionItem = {
  id: "d1",
  number: 1,
  title: "RFC",
  url: "https://github.com/acme/widget/discussions/1",
  updatedAt: "2026-01-10T00:00:00Z",
  repo: "acme/widget",
  author: { login: "dev" },
  unread: false,
};

const notification = (overrides: Partial<GitHubNotification> = {}): GitHubNotification => ({
  id: "n1",
  unread: true,
  reason: "subscribed",
  updated_at: "2026-01-10T00:00:00Z",
  subject: {
    title: "RFC",
    type: "Discussion",
    url: "https://github.com/acme/widget/discussions/1",
  },
  repository: { full_name: "acme/widget", html_url: "https://github.com/acme/widget" },
  ...overrides,
});

describe("discussions hybrid unread", () => {
  it("builds unread map from discussion notifications", () => {
    const map = buildUnreadDiscussionMap([notification()]);
    expect(map.has("https://github.com/acme/widget/discussions/1")).toBe(true);
  });

  it("enriches discussions with unread flags when inbox enabled", () => {
    const enriched = enrichDiscussionsWithUnread([discussion], [notification()], true);
    expect(enriched[0]).toMatchObject({ unread: true, notificationId: "n1" });
  });

  it("clears unread when inbox disabled", () => {
    const enriched = enrichDiscussionsWithUnread([discussion], [notification()], false);
    expect(enriched[0]?.unread).toBe(false);
  });

  it("counts unread discussions", () => {
    const items = enrichDiscussionsWithUnread([discussion], [notification()], true);
    expect(countUnreadDiscussions(items)).toBe(1);
  });
});
