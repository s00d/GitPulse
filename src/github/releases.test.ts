import { describe, expect, it } from "vitest";
import {
  buildReleaseGroups,
  filterDiscussionNotifications,
  watchedReposForReleases,
} from "@/github/releases";
import type { GitHubNotification, GitHubRelease } from "@/github/types";

function release(overrides: Partial<GitHubRelease> = {}): GitHubRelease {
  return {
    id: 1,
    tag_name: "v1.0.0",
    name: "Release 1",
    html_url: "https://github.com/acme/app/releases/tag/v1.0.0",
    published_at: "2026-06-15T12:00:00Z",
    draft: false,
    prerelease: false,
    author: { login: "octo" },
    ...overrides,
  };
}

function notification(overrides: Partial<GitHubNotification> = {}): GitHubNotification {
  return {
    id: "n1",
    unread: true,
    reason: "subscribed",
    updated_at: "2026-06-15T12:00:00Z",
    subject: { title: "Discussion title", type: "Discussion", url: null },
    repository: { full_name: "acme/app", html_url: "https://github.com/acme/app" },
    ...overrides,
  };
}

describe("releases", () => {
  it("caps watched repos for release fetch", () => {
    const repos = Array.from({ length: 40 }, (_, index) => ({
      id: index,
      full_name: `org/repo-${index}`,
      html_url: `https://github.com/org/repo-${index}`,
      stargazers_count: 0,
      updated_at: "2026-06-01T00:00:00Z",
    }));
    expect(watchedReposForReleases(repos, {}, 30)).toHaveLength(30);
  });

  it("filters unread discussion notifications", () => {
    const items = [
      notification(),
      notification({ unread: false }),
      notification({ subject: { title: "Issue", type: "Issue", url: null } }),
    ];
    expect(filterDiscussionNotifications(items)).toHaveLength(1);
  });

  it("builds release groups and drops drafts and old releases", () => {
    const now = new Date("2026-07-01T00:00:00Z");
    const groups = buildReleaseGroups(
      [
        {
          repo: "acme/app",
          releases: [
            release({ id: 1, published_at: "2026-06-20T00:00:00Z" }),
            release({ id: 2, draft: true, published_at: "2026-06-25T00:00:00Z" }),
            release({ id: 3, published_at: "2026-01-01T00:00:00Z" }),
          ],
        },
      ],
      { now },
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.releases).toHaveLength(1);
    expect(groups[0]?.releases[0]?.id).toBe(1);
  });
});
