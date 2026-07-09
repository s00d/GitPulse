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

const ICON_SIZE = 44;
const BADGE_FONT = (px) => `bold ${px}px Arial, Helvetica, sans-serif`;
const MIN_BADGE_PX_HEIGHT = Math.round(ICON_SIZE * 0.28);
/** circle | chip | outline | pill | numeral */
const BADGE_STYLE = "numeral";

/** Base tray glyphs — Lucide icon name + mockup background color. */
const GLYPH_DEFS = {
  issue: { lucide: "CircleDot", color: "#ea580c" },
  pullRequest: { lucide: "GitPullRequest", color: "#7c3aed" },
  star: { lucide: "Star", color: "#ca8a04" },
  watch: { lucide: "Eye", color: "#16a34a" },
  notification: { lucide: "Bell", color: "#e11d48" },
  repo: { lucide: "FolderGit2", color: "#ea580c" },
  settings: { lucide: "Settings", color: "#475569" },
  refresh: { lucide: "RefreshCw", color: "#2563eb" },
  open: { lucide: "ExternalLink", color: "#0f172a" },
  about: { lucide: "Info", color: "#0369a1" },
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
  const pad = size * 0.18;
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.22);
  ctx.fillStyle = color;
  ctx.fill();
}

async function drawLucideGlyph(ctx, size, lucideName, iconSize = null) {
  const pad = size * 0.18;
  const inner = size - pad * 2;
  const glyphSize = iconSize ?? Math.round(inner * 0.62);
  const offset = (size - glyphSize) / 2;
  const image = await loadLucideIcon(lucideName, 24, "#ffffff", 2);
  ctx.drawImage(image, offset, offset, glyphSize, glyphSize);
}

async function drawGlyph(ctx, size, kind) {
  const def = GLYPH_DEFS[kind];
  if (!def) throw new Error(`Missing glyph definition: ${kind}`);

  drawRoundedBackground(ctx, size, def.color);
  await drawLucideGlyph(ctx, size, def.lucide);
}

async function drawActivityChangeIcon(ctx, size, kind, change) {
  const base = ACTIVITY_KIND_DEF[kind];
  if (!base) throw new Error(`Missing activity kind: ${kind}`);

  drawRoundedBackground(ctx, size, base.color);
  await drawLucideGlyph(ctx, size, CHANGE_CENTER_GLYPH[change]);
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

function badgeFontSize(label, size) {
  return Math.round(size * (label.length > 1 ? 0.36 : 0.42));
}

function badgeBox(ctx, label, fontSize, size) {
  const padX = Math.max(2, Math.round(fontSize * 0.16));
  const padY = Math.max(2, Math.round(fontSize * 0.1));
  ctx.font = BADGE_FONT(fontSize);
  const textW = ctx.measureText(label).width;
  const w = Math.ceil(textW + padX * 2);
  const h = Math.ceil(fontSize + padY * 2);
  return { w, h, x: size - w, y: 0, radius: h / 2 };
}

function drawBadgeCircle(ctx, size, label, fontSize) {
  const pad = Math.max(2, Math.round(fontSize * 0.2));
  ctx.font = BADGE_FONT(fontSize);
  const textW = ctx.measureText(label).width;
  const diam = Math.ceil(Math.max(textW, fontSize * 0.85) + pad * 2);
  const r = diam / 2;
  const cx = size - r + 1;
  const cy = r - 1;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#e11d48";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 0.5);

  return { badgeW: diam, badgeH: diam };
}

function drawBadgeChip(ctx, size, label, fontSize) {
  const { w, h, x, y, radius } = badgeBox(ctx, label, fontSize, size);

  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#0f172a";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);

  return { badgeW: w, badgeH: h };
}

function drawBadgeOutline(ctx, size, label, fontSize) {
  const { w, h, x, y, radius } = badgeBox(ctx, label, fontSize, size);

  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e11d48";
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.fillStyle = "#be123c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);

  return { badgeW: w, badgeH: h };
}

function drawBadgeLegacyPill(ctx, size, label, fontSize) {
  const { w, h, x, y, radius } = badgeBox(ctx, label, fontSize, size);

  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#dc2626";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);

  return { badgeW: w, badgeH: h };
}

/** Outlined numerals in the corner — no solid chip covering the glyph. */
function drawBadgeNumeral(ctx, size, label, fontSize) {
  const insetX = Math.round(size * 0.1);
  const insetY = Math.round(size * 0.08);
  const strokeWidth = Math.max(2.5, Math.round(fontSize * 0.22));

  ctx.font = BADGE_FONT(fontSize);
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = strokeWidth;

  const x = size - insetX;
  const y = insetY;

  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(label, x, y);

  ctx.fillStyle = "#e11d48";
  ctx.fillText(label, x, y);

  const textW = ctx.measureText(label).width;
  const badgeH = Math.ceil(fontSize * 1.05 + strokeWidth);
  const badgeW = Math.ceil(textW + strokeWidth);

  return { badgeW, badgeH };
}

const BADGE_STYLES = {
  circle: drawBadgeCircle,
  chip: drawBadgeChip,
  outline: drawBadgeOutline,
  pill: drawBadgeLegacyPill,
  numeral: drawBadgeNumeral,
};

async function drawBadgeWithStyle(ctx, size, kind, count, style) {
  await drawGlyph(ctx, size, kind);
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);
  const fontSize = badgeFontSize(label, size);
  const drawStyle = BADGE_STYLES[style] ?? BADGE_STYLES.outline;
  const { badgeW, badgeH } = drawStyle(ctx, size, label, fontSize);

  return { label, fontSize, style, badgeW, badgeH };
}

async function drawBadge(ctx, size, kind, count) {
  return drawBadgeWithStyle(ctx, size, kind, count, BADGE_STYLE);
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

for (const kind of badgeKinds) {
  for (const count of badgeCounts) {
    const suffix = count > 9 ? "9plus" : String(count);
    const { png, meta } = await render((ctx, size) => drawBadge(ctx, size, kind, count));
    await writeFile(path.join(outDir, "badge", `${kind}-${suffix}.png`), png);

    if (kind === "issue" && [1, 5, 10].includes(count) && meta) {
      qaSamples.push({ count, ...meta });
    }
  }
}

for (const sample of qaSamples) {
  const { label, fontSize, style, badgeW, badgeH } = sample;
  if (badgeH < MIN_BADGE_PX_HEIGHT) {
    console.error(
      `Badge too small: issue-${label} ${badgeW}x${badgeH}px (${style}, need >= ${MIN_BADGE_PX_HEIGHT})`,
    );
    process.exit(1);
  }
  console.log(`QA issue-${label}: ${style} ${badgeW}x${badgeH}px, font ${fontSize}px`);
}

const zoom = 6;
const variantStyles = ["numeral", "outline", "circle", "chip"];
const variantCounts = [1, 5, 10];
const variantPreview = createCanvas(
  ICON_SIZE * zoom * variantStyles.length,
  ICON_SIZE * zoom * variantCounts.length,
);
const vpctx = variantPreview.getContext("2d");
vpctx.fillStyle = "#111";
vpctx.fillRect(0, 0, variantPreview.width, variantPreview.height);

for (let row = 0; row < variantCounts.length; row++) {
  for (let col = 0; col < variantStyles.length; col++) {
    const count = variantCounts[row];
    const style = variantStyles[col];
    const { png } = await render((ctx, size) => drawBadgeWithStyle(ctx, size, "issue", count, style));
    const img = await loadImage(png);
    vpctx.drawImage(
      img,
      col * ICON_SIZE * zoom,
      row * ICON_SIZE * zoom,
      ICON_SIZE * zoom,
      ICON_SIZE * zoom,
    );
  }
}

await writeFile(path.join(outDir, "_preview-variants.png"), variantPreview.toBuffer("image/png"));

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
console.log(`Style: ${BADGE_STYLE}`);
console.log(`Preview: ${path.join(outDir, "_preview-badge.png")}`);
console.log(`Variants: ${path.join(outDir, "_preview-variants.png")}`);
