#!/usr/bin/env node
/**
 * Generates tray menu PNG icons into src/tray/icons/.
 * Run: pnpm icons:tray
 */
import { createCanvas, loadImage } from "canvas";
import { icons } from "lucide";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "src", "tray", "icons");

/**
 * Tray menu icon bitmap size (Retina @2x).
 *
 * Tauri uses `muda` for menu icons. On macOS every item icon is forced to 18pt
 * height (`muda` → `to_nsimage(Some(18.))`). On Retina that is 36 physical px —
 * same idea as web `width: 18px` + `srcset` / 2× asset at 36px.
 *
 * Linux (GTK) scales to 16×16; Windows uses the bitmap as-is (~16px). A 36px
 * source is sharp on macOS and still downscales cleanly elsewhere.
 *
 * @see https://developer.apple.com/design/human-interface-guidelines/menus
 */
const MENU_ICON_PT = 18;
const MENU_ICON_RETINA_SCALE = 2;
const ICON_SIZE = MENU_ICON_PT * MENU_ICON_RETINA_SCALE;

const TILE_CORNER_RADIUS_RATIO = 0.2;
/** Lucide viewBox has stroke inset — scale glyph to fill the tile. */
const TILE_GLYPH_SCALE = 0.92;
const TILE_GLYPH_STROKE = 2.35;
/** Plain +/- on transparent canvas (recent changes) — bold strokes for 18pt menu. */
const PLAIN_GLYPH_SCALE = 0.9;
const PLAIN_GLYPH_STROKE = 4;
const MIN_TILE_TINT_DELTA = 0.14;
const MIN_COUNT_FONT_PX = 10;
const COUNT_FONT = (px) => `800 ${px}px Arial, Helvetica, sans-serif`;

/** Tile tint by count + large corner count badge. */
const BADGE_STYLE = "tile+corner";

/** count 1 = brand tile, 9+ = deeper same hue (no washed-out pastels). */
function badgeWeight(count) {
  const capped = count > 9 ? 10 : Math.max(1, count);
  return (capped - 1) / 9;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / delta + 2) * 60;
        break;
      default:
        h = ((rn - gn) / delta + 4) * 60;
    }
  }

  return { h, s, l };
}

function hslToHex(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toByte = (v) => Math.round((v + m) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

/** count 1 keeps the brand color; higher counts deepen saturation on the same hue. */
function tileColorForCount(baseHex, count) {
  const weight = badgeWeight(count);
  if (weight === 0) return baseHex;

  const { h, s, l } = rgbToHsl(hexToRgb(baseHex));

  if (l < 0.22) {
    return hslToHex(h, Math.min(0.72, s + weight * 0.28), Math.max(0.1, l - weight * 0.09));
  }
  if (s < 0.2) {
    return hslToHex(h, s + weight * 0.42, l - weight * 0.16);
  }

  const saturation = Math.min(0.98, s + weight * 0.12);
  const lightness = Math.max(0.24, l - weight * 0.26);
  return hslToHex(h, saturation, lightness);
}

function tileTintDelta(baseHex, tintedHex) {
  const base = rgbToHsl(hexToRgb(baseHex)).l;
  const tinted = rgbToHsl(hexToRgb(tintedHex)).l;
  return Math.abs(base - tinted);
}

function countLabel(count) {
  return count > 9 ? "9+" : String(count);
}

function cornerBadgeMetrics(size, label) {
  const wide = label.length > 1;
  const height = Math.round(size * 0.38);
  const width = wide ? Math.round(height * 1.38) : height;
  const x = size - width + 1;
  const y = 1;
  const fontSize = Math.max(
    MIN_COUNT_FONT_PX,
    Math.round(height * (wide ? 0.5 : 0.54)),
  );
  return { width, height, x, y, fontSize, radius: height / 2 };
}

/** Large top-right pill — readable after macOS scales the menu icon to 18pt. */
function drawCornerCountBadge(ctx, size, count) {
  const label = countLabel(count);
  const { width, height, x, y, fontSize, radius } = cornerBadgeMetrics(size, label);

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.35)";
  ctx.shadowBlur = 1.5;
  ctx.shadowOffsetY = 0.5;

  if (label.length > 1) {
    roundRect(ctx, x, y, width, height, radius);
  } else {
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  }
  ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.font = COUNT_FONT(fontSize);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 1.25;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, y + height / 2 + 0.5);
  ctx.shadowColor = "transparent";
  ctx.restore();

  return { label, fontSize, badgeW: width, badgeH: height };
}

/** Base tray glyphs — Lucide icon name + mockup background color. */
const GLYPH_DEFS = {
  issue: { lucide: "CircleDot", color: "#ea580c" },
  pullRequest: { lucide: "GitPullRequest", color: "#7c3aed" },
  star: { lucide: "Star", color: "#ca8a04" },
  watch: { lucide: "Eye", color: "#16a34a" },
  notification: { lucide: "Bell", color: "#e11d48" },
  repo: { lucide: "Folder", color: "#1d4ed8", scale: 0.88, stroke: 2.7 },
  settings: { lucide: "Settings", color: "#475569" },
  refresh: { lucide: "RefreshCw", color: "#2563eb" },
  open: { lucide: "ExternalLink", color: "#0f172a" },
  about: { lucide: "Info", color: "#0369a1" },
  quit: { lucide: "Power", color: "#64748b" },
  signIn: { lucide: "KeyRound", color: "#059669" },
  activity: { lucide: "Activity", color: "#2563eb" },
  external: { lucide: "ExternalLink", color: "#4f46e5" },
  hint: { lucide: "CircleAlert", color: "#ea580c" },
  prReview: { lucide: "Users", color: "#ca8a04" },
  myPr: { lucide: "User", color: "#7c3aed" },
  prWait: { lucide: "Clock", color: "#94a3b8" },
  milestone: { lucide: "Flag", color: "#7c3aed" },
  project: { lucide: "Columns3", color: "#0d9488" },
  discussion: { lucide: "MessageSquare", color: "#ea580c" },
  pullRequestCiSuccess: { lucide: "CircleCheck", color: "#16a34a" },
  pullRequestCiFailure: { lucide: "CircleX", color: "#dc2626" },
  pullRequestCiPending: { lucide: "LoaderCircle", color: "#64748b" },
  issueDraft: { lucide: "GitPullRequestDraft", color: "#94a3b8" },
};

const ACTIVITY_KINDS = [
  "issue",
  "pullRequest",
  "notification",
  "discussion",
  "release",
  "commit",
  "security",
  "check",
];

const ACTIVITY_KIND_DEF = {
  issue: GLYPH_DEFS.issue,
  pullRequest: GLYPH_DEFS.pullRequest,
  notification: GLYPH_DEFS.notification,
  discussion: GLYPH_DEFS.discussion,
  release: { lucide: "Tag", color: "#2563eb" },
  commit: { lucide: "GitCommitHorizontal", color: "#0d9488" },
  security: { lucide: "ShieldAlert", color: "#dc2626" },
  check: { lucide: "CircleCheck", color: "#16a34a" },
};

const CHANGE_CENTER_GLYPH = {
  added: "Plus",
  updated: "Minus",
};

const ACTIVITY_GLYPHS = ACTIVITY_KINDS.flatMap((kind) => [`${kind}Added`, `${kind}Updated`]);

const GLYPHS = [...Object.keys(GLYPH_DEFS), ...ACTIVITY_GLYPHS];

const iconImageCache = new Map();

function iconToSvg(lucideName, size = 24, color = "#ffffff", stroke = 2) {
  const nodes = icons[lucideName];
  if (!nodes) throw new Error(`Unknown lucide icon: ${lucideName}`);

  const body = nodes
    .map(([tag, attrs]) => {
      const attrStr = Object.entries(attrs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `<${tag} ${attrStr}/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

async function loadLucideIcon(lucideName, size, color, stroke = 2) {
  const key = `${lucideName}:${size}:${color}:${stroke}`;
  if (iconImageCache.has(key)) return iconImageCache.get(key);

  const svg = iconToSvg(lucideName, size, color, stroke);
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const image = await loadImage(dataUrl);
  iconImageCache.set(key, image);
  return image;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRoundedBackground(ctx, size, color) {
  const radius = size * TILE_CORNER_RADIUS_RATIO;
  roundRect(ctx, 0, 0, size, size, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

async function drawLucideGlyph(
  ctx,
  size,
  lucideName,
  { color = "#ffffff", scale = TILE_GLYPH_SCALE, stroke = 2, areaHeight = size, yOffset = 0 } = {},
) {
  const glyphSize = Math.round(areaHeight * scale);
  const offsetX = (size - glyphSize) / 2;
  const offsetY = yOffset + (areaHeight - glyphSize) / 2;
  const image = await loadLucideIcon(lucideName, 24, color, stroke);
  ctx.drawImage(image, offsetX, offsetY, glyphSize, glyphSize);
}

function glyphDrawOpts(def) {
  return {
    stroke: def.stroke ?? TILE_GLYPH_STROKE,
    scale: def.scale ?? TILE_GLYPH_SCALE,
  };
}

async function drawGlyph(ctx, size, kind, tileColor) {
  const def = GLYPH_DEFS[kind];
  if (!def) throw new Error(`Missing glyph definition: ${kind}`);

  drawRoundedBackground(ctx, size, tileColor ?? def.color);
  await drawLucideGlyph(ctx, size, def.lucide, glyphDrawOpts(def));
}

async function drawActivityChangeIcon(ctx, size, kind, change) {
  const base = ACTIVITY_KIND_DEF[kind];
  if (!base) throw new Error(`Missing activity kind: ${kind}`);

  await drawLucideGlyph(ctx, size, CHANGE_CENTER_GLYPH[change], {
    color: base.color,
    scale: PLAIN_GLYPH_SCALE,
    stroke: PLAIN_GLYPH_STROKE,
  });
}

function resolveGlyphDraw(kind) {
  const addedMatch = kind.match(/^(.+)Added$/);
  if (addedMatch) {
    return (ctx, size) => drawActivityChangeIcon(ctx, size, addedMatch[1], "added");
  }
  const updatedMatch = kind.match(/^(.+)Updated$/);
  if (updatedMatch) {
    return (ctx, size) => drawActivityChangeIcon(ctx, size, updatedMatch[1], "updated");
  }
  return (ctx, size) => drawGlyph(ctx, size, kind);
}

async function drawBadge(ctx, size, kind, count) {
  const def = GLYPH_DEFS[kind];
  const baseHex = def.color;
  const tileHex = tileColorForCount(baseHex, count);

  drawRoundedBackground(ctx, size, tileHex);
  await drawLucideGlyph(ctx, size, def.lucide, glyphDrawOpts(def));
  const badge = drawCornerCountBadge(ctx, size, count);

  return { count, baseHex, tileHex, style: BADGE_STYLE, ...badge };
}

async function render(draw) {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  const meta = await draw(ctx, ICON_SIZE);
  return { png: canvas.toBuffer("image/png"), meta };
}

await mkdir(path.join(outDir, "glyph"), { recursive: true });
await mkdir(path.join(outDir, "badge"), { recursive: true });

for (const kind of GLYPHS) {
  const draw = resolveGlyphDraw(kind);
  const { png } = await render(draw);
  await writeFile(path.join(outDir, "glyph", `${kind}.png`), png);
}

const badgeKinds = Object.keys(GLYPH_DEFS);

const badgeCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const qaSamples = [];
const tintWarnings = new Set();

for (const kind of badgeKinds) {
  const baseHex = GLYPH_DEFS[kind].color;
  const tintLo = tileColorForCount(baseHex, 1);
  const tintHi = tileColorForCount(baseHex, 10);
  const range = tileTintDelta(tintLo, tintHi);
  if (range < MIN_TILE_TINT_DELTA * 2) {
    tintWarnings.add(`${kind}: range ${range.toFixed(2)} (${tintLo} → ${tintHi})`);
  }

  for (const count of badgeCounts) {
    const suffix = count > 9 ? "9plus" : String(count);
    const { png, meta } = await render((ctx, size) => drawBadge(ctx, size, kind, count));
    await writeFile(path.join(outDir, "badge", `${kind}-${suffix}.png`), png);

    if (kind === "issue" && [1, 5, 10].includes(count) && meta) {
      qaSamples.push({ ...meta });
    }
  }
}

if (tintWarnings.size > 0) {
  console.warn("Weak tile tint range:");
  for (const warning of tintWarnings) console.warn(`  ${warning}`);
}

for (const sample of qaSamples) {
  const { count, baseHex, tileHex, label, fontSize, style } = sample;
  console.log(`QA issue-${count}: ${style} ${baseHex} → ${tileHex}, "${label}" ${fontSize}px`);
}

const gridZoom = 4;
const weightPreviewKinds = [
  "notification",
  "issue",
  "pullRequest",
  "watch",
  "open",
  "pullRequestCiFailure",
];
const weightPreviewCounts = [1, 3, 5, 7, 9, 10];
const weightPreview = createCanvas(
  ICON_SIZE * gridZoom * weightPreviewCounts.length,
  ICON_SIZE * gridZoom * weightPreviewKinds.length,
);
const wpctx = weightPreview.getContext("2d");
wpctx.fillStyle = "#111";
wpctx.fillRect(0, 0, weightPreview.width, weightPreview.height);

for (let row = 0; row < weightPreviewKinds.length; row++) {
  for (let col = 0; col < weightPreviewCounts.length; col++) {
    const kind = weightPreviewKinds[row];
    const count = weightPreviewCounts[col];
    const { png } = await render((ctx, size) => drawBadge(ctx, size, kind, count));
    const img = await loadImage(png);
    wpctx.drawImage(
      img,
      col * ICON_SIZE * gridZoom,
      row * ICON_SIZE * gridZoom,
      ICON_SIZE * gridZoom,
      ICON_SIZE * gridZoom,
    );
  }
}

await writeFile(path.join(outDir, "_preview-weight-grid.png"), weightPreview.toBuffer("image/png"));

const zoom = 6;
const preview = createCanvas(ICON_SIZE * zoom * qaSamples.length, ICON_SIZE * zoom);
const pctx = preview.getContext("2d");
pctx.fillStyle = "#111";
pctx.fillRect(0, 0, preview.width, preview.height);

for (let i = 0; i < qaSamples.length; i++) {
  const count = qaSamples[i].count;
  const { png } = await render((ctx, size) => drawBadge(ctx, size, "issue", count));
  const img = await loadImage(png);
  pctx.drawImage(img, i * ICON_SIZE * zoom, 0, ICON_SIZE * zoom, ICON_SIZE * zoom);
}

await writeFile(path.join(outDir, "_preview-badge.png"), preview.toBuffer("image/png"));

console.log(`Wrote ${GLYPHS.length} glyphs and ${badgeKinds.length * badgeCounts.length} badges to ${outDir}`);
console.log(`Style: ${BADGE_STYLE} (tile tint + corner badge)`);
console.log(`Preview: ${path.join(outDir, "_preview-badge.png")}`);
console.log(`Weight grid: ${path.join(outDir, "_preview-weight-grid.png")}`);
