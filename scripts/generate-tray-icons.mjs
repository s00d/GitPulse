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
const MIN_BADGE_PX_HEIGHT = Math.round(ICON_SIZE * 0.38);

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
  return Math.round(size * (label.length > 1 ? 0.56 : 0.72));
}

function drawBadge(ctx, size, kind, count) {
  drawGlyph(ctx, size, kind);
  if (count <= 0) return null;

  const label = count > 9 ? "9+" : String(count);
  const fontSize = badgeFontSize(label, size);

  ctx.font = BADGE_FONT(fontSize);
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  const x = size - 1;
  const y = 0;

  ctx.lineWidth = Math.max(1.5, Math.round(fontSize * 0.08));
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.strokeText(label, x, y);

  ctx.fillStyle = "#dc2626";
  ctx.fillText(label, x, y);

  return { label, fontSize, appliedFont: ctx.font };
}

function render(draw) {
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  const meta = draw(ctx, ICON_SIZE);
  return { png: canvas.toBuffer("image/png"), meta };
}

/** Measure red badge ink on the PNG — not font metadata fantasy. */
async function measureBadgeInk(png) {
  const img = await loadImage(png);
  const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, ICON_SIZE, ICON_SIZE);

  let minX = ICON_SIZE;
  let minY = ICON_SIZE;
  let maxX = 0;
  let maxY = 0;
  let pixels = 0;

  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const i = (y * ICON_SIZE + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > 160 && g < 90 && b < 90) {
        pixels++;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!pixels) return { pixels: 0, width: 0, height: 0 };

  return {
    pixels,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
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
      const ink = await measureBadgeInk(png);
      qaSamples.push({ count, ...meta, ink });
    }
  }
}

for (const sample of qaSamples) {
  const { ink, label, fontSize, appliedFont } = sample;
  if (ink.height < MIN_BADGE_PX_HEIGHT) {
    console.error(
      `Badge ink too small on PNG: issue-${label} ${ink.width}x${ink.height}px (need height >= ${MIN_BADGE_PX_HEIGHT}), font=${appliedFont}`,
    );
    process.exit(1);
  }
  console.log(
    `QA issue-${label}: font ${fontSize}px (${appliedFont}), ink ${ink.width}x${ink.height}px`,
  );
}

const zoom = 6;
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
console.log(`Preview: ${path.join(outDir, "_preview-badge.png")}`);
