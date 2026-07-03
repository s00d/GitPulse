import { describe, expect, it } from "vitest";
import {
  buildItemSnapshot,
  diffItemSnapshots,
  type GitHubItemSource,
  type ItemSnapshot,
} from "@/github/itemDiff";
import type { GitHubIssue, GitHubNotification } from "@/github/types";

function issue(id: number, updatedAt: string): GitHubIssue {
  return {
    id,
    number: id,
    title: `Issue ${id}`,
    state: "open",
    html_url: `https://github.com/o/r/issues/${id}`,
    repository_url: "https://api.github.com/repos/o/r",
    user: { login: "dev" },
    labels: [],
    updated_at: updatedAt,
    comments: 0,
  };
}

function emptySource(issues: GitHubIssue[] = []): GitHubItemSource {
  return {
    issues,
    reviewRequests: [],
    myPrs: [],
    waitingOnAuthor: [],
    notifications: [],
  };
}

describe("diffItemSnapshots", () => {
  it("returns no events when previous snapshot is null", () => {
    const current = buildItemSnapshot(emptySource([issue(1, "2026-01-01T00:00:00Z")]));
    expect(diffItemSnapshots(null, current, "2026-01-02T00:00:00Z")).toEqual([]);
  });

  it("detects added items", () => {
    const previous = buildItemSnapshot(emptySource());
    const current = buildItemSnapshot(emptySource([issue(1, "2026-01-01T00:00:00Z")]));
    const events = diffItemSnapshots(previous, current, "2026-01-02T00:00:00Z");

    expect(events).toHaveLength(1);
    expect(events[0]?.change).toBe("added");
    expect(events[0]?.itemKey).toBe("item:1");
  });

  it("detects updated items when updated_at changes", () => {
    const previous = buildItemSnapshot(emptySource([issue(1, "2026-01-01T00:00:00Z")]));
    const current = buildItemSnapshot(emptySource([issue(1, "2026-01-02T00:00:00Z")]));
    const events = diffItemSnapshots(previous, current, "2026-01-03T00:00:00Z");

    expect(events).toHaveLength(1);
    expect(events[0]?.change).toBe("updated");
    expect(events[0]?.itemUpdatedAt).toBe("2026-01-02T00:00:00Z");
  });

  it("detects changes on bootstrap-style diff against persisted snapshot", () => {
    const persisted: ItemSnapshot = {
      "item:42": {
        kind: "issue",
        title: "Old title",
        repo: "o/r",
        url: "https://github.com/o/r/issues/42",
        updatedAt: "2026-01-01T00:00:00Z",
        number: 42,
      },
    };
    const current = buildItemSnapshot(emptySource([issue(42, "2026-01-05T12:00:00Z")]));
    const events = diffItemSnapshots(persisted, current, "2026-01-05T12:01:00Z");

    expect(events).toHaveLength(1);
    expect(events[0]?.change).toBe("updated");
  });

  it("returns no events when snapshot is unchanged", () => {
    const source = emptySource([issue(1, "2026-01-01T00:00:00Z")]);
    const snapshot = buildItemSnapshot(source);
    expect(diffItemSnapshots(snapshot, snapshot, "2026-01-02T00:00:00Z")).toEqual([]);
  });

  it("includes unread notifications only", () => {
    const notifications: GitHubNotification[] = [
      {
        id: "n1",
        unread: true,
        reason: "mention",
        updated_at: "2026-01-01T00:00:00Z",
        subject: { title: "Ping", type: "Issue", url: "https://github.com/o/r/issues/1" },
        repository: { full_name: "o/r", html_url: "https://github.com/o/r" },
      },
      {
        id: "n2",
        unread: false,
        reason: "subscribed",
        updated_at: "2026-01-01T00:00:00Z",
        subject: { title: "Read", type: "Issue", url: "https://github.com/o/r/issues/2" },
        repository: { full_name: "o/r", html_url: "https://github.com/o/r" },
      },
    ];

    const previous = buildItemSnapshot({ ...emptySource(), notifications: [] });
    const current = buildItemSnapshot({ ...emptySource(), notifications });
    const events = diffItemSnapshots(previous, current, "2026-01-02T00:00:00Z");

    expect(events).toHaveLength(1);
    expect(events[0]?.itemKey).toBe("notif:n1");
    expect(events[0]?.kind).toBe("issue");
  });

  it("maps inbox notification subject types to activity kinds", () => {
    const cases: Array<[string, string]> = [
      ["PullRequest", "pull_request"],
      ["Commit", "commit"],
      ["RepositoryVulnerabilityAlert", "security"],
      ["CheckSuite", "check"],
      ["RepositoryInvitation", "notification"],
    ];

    for (const [type, kind] of cases) {
      const notifications: GitHubNotification[] = [
        {
          id: type,
          unread: true,
          reason: "subscribed",
          updated_at: "2026-01-01T00:00:00Z",
          subject: { title: type, type, url: "https://github.com/o/r" },
          repository: { full_name: "o/r", html_url: "https://github.com/o/r" },
        },
      ];
      const snapshot = buildItemSnapshot({ ...emptySource(), notifications });
      expect(snapshot[`notif:${type}`]?.kind).toBe(kind);
    }
  });

  it("maps discussion notifications to discussion kind", () => {
    const notifications: GitHubNotification[] = [
      {
        id: "d1",
        unread: true,
        reason: "subscribed",
        updated_at: "2026-01-01T00:00:00Z",
        subject: { title: "RFC", type: "Discussion", url: "https://github.com/o/r/discussions/1" },
        repository: { full_name: "o/r", html_url: "https://github.com/o/r" },
      },
    ];

    const snapshot = buildItemSnapshot({ ...emptySource(), notifications });
    expect(snapshot["notif:d1"]?.kind).toBe("discussion");
  });

  it("includes watched repo releases in snapshot", () => {
    const snapshot = buildItemSnapshot({
      ...emptySource(),
      releases: [
        {
          repo: "o/r",
          release: {
            id: 9,
            tag_name: "v1.0.0",
            name: "Launch",
            html_url: "https://github.com/o/r/releases/tag/v1.0.0",
            published_at: "2026-01-01T00:00:00Z",
            draft: false,
            prerelease: false,
            author: { login: "dev" },
          },
        },
      ],
    });

    expect(snapshot["release:9"]?.kind).toBe("release");
    expect(snapshot["release:9"]?.title).toBe("Launch");
  });
});
