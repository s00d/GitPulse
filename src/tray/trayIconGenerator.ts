import { Image } from "@tauri-apps/api/image";

export type TrayGlyph =
  | "issue"
  | "pullRequest"
  | "star"
  | "watch"
  | "notification"
  | "repo"
  | "settings"
  | "refresh"
  | "open"
  | "about"
  | "signIn"
  | "activity"
  | "external"
  | "hint"
  | "prReview"
  | "myPr"
  | "prWait"
  | "milestone"
  | "project";

const glyphUrls = import.meta.glob<string>("./icons/glyph/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const badgeUrls = import.meta.glob<string>("./icons/badge/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const glyphs = {} as Record<TrayGlyph, Image>;
const badges = {} as Record<string, Image>;

let loadPromise: Promise<void> | null = null;

function parseName(path: string, folder: string): string | null {
  const match = path.match(new RegExp(`${folder}/(.+)\\.png$`));
  return match?.[1] ?? null;
}

async function bytesFromUrl(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load tray icon: ${url}`);
  }
  return response.arrayBuffer();
}

async function loadTrayIcons(): Promise<void> {
  await Promise.all([
    ...Object.entries(glyphUrls).map(async ([path, url]) => {
      const kind = parseName(path, "glyph") as TrayGlyph | null;
      if (!kind) return;
      glyphs[kind] = await Image.fromBytes(await bytesFromUrl(url));
    }),
    ...Object.entries(badgeUrls).map(async ([path, url]) => {
      const key = parseName(path, "badge");
      if (!key) return;
      badges[key] = await Image.fromBytes(await bytesFromUrl(url));
    }),
  ]);
}

function ensureLoaded(): Promise<void> {
  loadPromise ??= loadTrayIcons();
  return loadPromise;
}

function badgeKey(kind: TrayGlyph, count: number): string {
  const label = count > 9 ? "9plus" : String(Math.max(1, count));
  return `${kind}-${label}`;
}

export async function trayGlyphIcon(kind: TrayGlyph): Promise<Image> {
  await ensureLoaded();
  const icon = glyphs[kind];
  if (!icon) throw new Error(`Missing tray glyph icon: ${kind}`);
  return icon;
}

export async function trayBadgeIcon(kind: TrayGlyph, count: number): Promise<Image> {
  await ensureLoaded();
  if (count <= 0) return trayGlyphIcon(kind);
  const icon = badges[badgeKey(kind, count)];
  if (!icon) throw new Error(`Missing tray badge icon: ${badgeKey(kind, count)}`);
  return icon;
}

export function issueItemIcon(issueIsPr: boolean): Promise<Image> {
  return trayGlyphIcon(issueIsPr ? "pullRequest" : "issue");
}
