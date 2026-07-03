import type { ProjectBoardGroup, ProjectColumn, ProjectItem, ProjectOwnerType, TrackedProject } from "./types";

export const MAX_TRACKED_PROJECTS = 3;
export const MAX_PROJECT_RECENT_APP = 8;
export const MAX_PROJECT_RECENT_TRAY_PER_PROJECT = 3;
export const MAX_PROJECT_RECENT_TRAY_TOTAL = 6;
export const MAX_PROJECT_COLUMNS_TRAY = 5;

const MAX_PROJECT_PAGES = 10;
const PROJECT_PAGE_SIZE = 100;

export function trackedProjectId(
  ownerType: ProjectOwnerType,
  owner: string,
  number: number,
): string {
  return `${ownerType}:${owner}:${number}`;
}

export function createTrackedProject(input: {
  ownerType: ProjectOwnerType;
  owner: string;
  number: number;
}): TrackedProject {
  const owner = input.owner.trim();
  return {
    id: trackedProjectId(input.ownerType, owner, input.number),
    owner,
    number: input.number,
    ownerType: input.ownerType,
  };
}

export interface ProjectV2ItemSnapshot {
  id: string;
  number: number;
  title: string;
  url: string;
  issueState: string | null;
  statusName: string | null;
  updatedAt: string;
  repoName?: string;
}

export interface ProjectV2BoardSnapshot {
  id: string;
  title: string;
  url: string;
  items: ProjectV2ItemSnapshot[];
}

function sortOpenItems(items: ProjectItem[]): ProjectItem[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function buildProjectBoardGroup(snapshot: ProjectV2BoardSnapshot): ProjectBoardGroup | null {
  const counts = new Map<string, number>();
  const order: string[] = [];
  const openItems: ProjectItem[] = [];

  for (const item of snapshot.items) {
    if (item.issueState !== "OPEN") continue;
    const status = item.statusName?.trim();
    if (!status) continue;

    if (!counts.has(status)) {
      order.push(status);
      counts.set(status, 0);
    }
    counts.set(status, (counts.get(status) ?? 0) + 1);

    openItems.push({
      id: item.id,
      number: item.number,
      title: item.title,
      url: item.url,
      statusName: status,
      updatedAt: item.updatedAt,
      repoName: item.repoName,
    });
  }

  const columns: ProjectColumn[] = order
    .map((name) => ({
      name,
      openCount: counts.get(name) ?? 0,
    }))
    .filter((column) => column.openCount > 0);

  if (!columns.length) return null;

  const sortedItems = sortOpenItems(openItems);
  const totalOpenCount = columns.reduce((sum, column) => sum + column.openCount, 0);

  return {
    id: snapshot.id,
    title: snapshot.title,
    url: snapshot.url,
    columns,
    recentItems: sortedItems.slice(0, MAX_PROJECT_RECENT_APP),
    trayRecentItems: sortedItems.slice(0, MAX_PROJECT_RECENT_TRAY_PER_PROJECT),
    totalOpenCount,
  };
}

export function buildProjectBoardGroups(
  snapshots: ProjectV2BoardSnapshot[],
): ProjectBoardGroup[] {
  return snapshots
    .map((snapshot) => buildProjectBoardGroup(snapshot))
    .filter((group): group is ProjectBoardGroup => group != null)
    .sort((a, b) => {
      const diff = b.totalOpenCount - a.totalOpenCount;
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });
}

export const PROJECT_PAGE_LIMIT = {
  pageSize: PROJECT_PAGE_SIZE,
  maxPages: MAX_PROJECT_PAGES,
};
