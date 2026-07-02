#!/usr/bin/env node
/**
 * Generates tray menu PNG icons into src/tray/icons/.
 * Run: pnpm icons:tray
 */
import { createCanvas, loadImage } from "canvas";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "src", "tray", "icons");

const ICON_SIZE = 44;
const BADGE_FONT = (px) => `bold ${px}px Arial, Helvetica, sans-serif`;
const MIN_BADGE_PX_HEIGHT = Math.round(ICON_SIZE * 0.34);
/** circle | chip | outline */
const BADGE_STYLE = "outline";

const GLYPHS = [
  "issue",
  "pullRequest",
  "star",
  "watch",
  "notification",
  "repo",
  "settings",
  "refresh",
  "open",
  "about",
  "signIn",
  "activity",
  "external",
  "hint",
  "prReview",
  "myPr",
  "prWait",
];

const GLYPH_COLORS = {
  issue: "#d97706",
  pullRequest: "#7c3aed",
  star: "#ca8a04",
  watch: "#0891b2",
  notification: "#4f46e5",
  repo: "#64748b",
  settings: "#475569",
  refresh: "#2563eb",
  open: "#0f172a",
  about: "#0369a1",
  signIn: "#059669",
  activity: "#6366f1",
  external: "#4f46e5",
  hint: "#ea580c",
  prReview: "#ca8a04",
  myPr: "#7c3aed",
  prWait: "#94a3b8",
};

const GLYPH_LETTERS = {
  issue: "●",
  pullRequest: "⇄",
  star: "★",
  watch: "◎",
  notification: "◉",
  repo: "▣",
  settings: "⚙",
  refresh: "↻",
  open: "⧉",
  about: "i",
  signIn: "@",
  activity: "≡",
  external: "↗",
  hint: "!",
  prReview: "◎",
  myPr: "M",
  prWait: "…",
};

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

function drawGlyph(ctx, size, kind) {
  const color = GLYPH_COLORS[kind];
  const pad = size * 0.18;

  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.22);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = BADGE_FONT(Math.round(size * 0.34));
  ctx.fillText(GLYPH_LETTERS[kind], size / 2, size / 2 + 0.5);
}

function badgeFontSize(label, size) {
  return Math.round(size * (label.length > 1 ? 0.4 : 0.5));
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

const BADGE_STYLES = {
  circle: drawBadgeCircle,
  chip: drawBadgeChip,
  outline: drawBadgeOutline,
  pill: drawBadgeLegacyPill,
};

function drawBadgeWithStyle(ctx, size, kind, count, style) {
  drawGlyph(ctx, size, kind);
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);
  const fontSize = badgeFontSize(label, size);
  const drawStyle = BADGE_STYLES[style] ?? BADGE_STYLES.outline;
  const { badgeW, badgeH } = drawStyle(ctx, size, label, fontSize);

  return { label, fontSize, style, badgeW, badgeH };
}

function drawBadge(ctx, size, kind, count) {
  return drawBadgeWithStyle(ctx, size, kind, count, BADGE_STYLE);
}

function render(draw) {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  const meta = draw(ctx, ICON_SIZE);
  return { png: canvas.toBuffer("image/png"), meta };
}

await mkdir(path.join(outDir, "glyph"), { recursive: true });
await mkdir(path.join(outDir, "badge"), { recursive: true });

for (const kind of GLYPHS) {
  const { png } = render((ctx, size) => {
    drawGlyph(ctx, size, kind);
    return null;
  });
  await writeFile(path.join(outDir, "glyph", `${kind}.png`), png);
}

const badgeCounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const qaSamples = [];

for (const kind of GLYPHS) {
  for (const count of badgeCounts) {
    const suffix = count > 9 ? "9plus" : String(count);
    const { png, meta } = render((ctx, size) => drawBadge(ctx, size, kind, count));
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
const variantStyles = ["circle", "chip", "outline", "pill"];
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
    const { png } = render((ctx, size) => drawBadgeWithStyle(ctx, size, "issue", count, style));
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
  const { png } = render((ctx, size) => drawBadge(ctx, size, "issue", count));
  const img = await loadImage(png);
  pctx.drawImage(img, i * ICON_SIZE * zoom, 0, ICON_SIZE * zoom, ICON_SIZE * zoom);
}

await writeFile(path.join(outDir, "_preview-badge.png"), preview.toBuffer("image/png"));

console.log(`Wrote ${GLYPHS.length} glyphs and ${GLYPHS.length * badgeCounts.length} badges to ${outDir}`);
console.log(`Style: ${BADGE_STYLE}`);
console.log(`Preview: ${path.join(outDir, "_preview-badge.png")}`);
console.log(`Variants: ${path.join(outDir, "_preview-variants.png")}`);
