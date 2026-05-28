#!/usr/bin/env node
// Generates icon-192.png and icon-512.png for the Streetfeed PWA.
// Pure Node.js — no dependencies beyond built-in zlib.
//
// Design: three rounded pill-shaped bars on a dark background.
//   Dark bg  #0F0F0F  → RGB(15, 15, 15)
//   Accent   #E8FF47  → RGB(232, 255, 71)
//
// The three bars (varying widths) represent a "feed" of street posts.
// Safe-zone compliant for maskable icons (important content within 80% circle).

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32 ──────────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG builder ────────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, c]);
}

function buildPNG(size, pixels /* Uint8Array RGBA */) {
  const rowLen = size * 4 + 1; // filter byte + RGBA
  const raw    = Buffer.alloc(size * rowLen);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      const d = y * rowLen + 1 + x * 4;
      raw[d] = pixels[s]; raw[d+1] = pixels[s+1];
      raw[d+2] = pixels[s+2]; raw[d+3] = pixels[s+3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Drawing primitives ─────────────────────────────────────────────────────────
function setPixel(px, size, x, y, r, g, b, a = 255) {
  x = ~~x; y = ~~y;
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
}

function fillRect(px, size, x1, y1, x2, y2, r, g, b) {
  for (let y = Math.max(0, ~~y1); y <= Math.min(size-1, ~~y2); y++)
    for (let x = Math.max(0, ~~x1); x <= Math.min(size-1, ~~x2); x++)
      setPixel(px, size, x, y, r, g, b);
}

function fillCircle(px, size, cx, cy, radius, r, g, b) {
  const r2 = radius * radius;
  const x0 = Math.max(0, ~~(cx - radius));
  const x1 = Math.min(size-1, ~~(cx + radius + 1));
  const y0 = Math.max(0, ~~(cy - radius));
  const y1 = Math.min(size-1, ~~(cy + radius + 1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx*dx + dy*dy <= r2) setPixel(px, size, x, y, r, g, b);
  }
}

// Horizontal pill (fully rounded rectangle)
function pill(px, size, cx, cy, halfW, halfH, r, g, b) {
  const innerHalfW = halfW - halfH; // distance from center to edge of straight section
  if (innerHalfW > 0) fillRect(px, size, cx - innerHalfW, cy - halfH, cx + innerHalfW, cy + halfH, r, g, b);
  fillCircle(px, size, cx - innerHalfW, cy, halfH, r, g, b);
  fillCircle(px, size, cx + innerHalfW, cy, halfH, r, g, b);
}

// ── Icon drawing ───────────────────────────────────────────────────────────────
function drawIcon(px, size) {
  const BG = [15, 15, 15];    // #0F0F0F
  const AC = [232, 255, 71];  // #E8FF47

  // Background fill
  fillRect(px, size, 0, 0, size-1, size-1, ...BG);

  const cx = size / 2;
  const cy = size / 2;

  // Bar dimensions (relative to icon size)
  const barH   = size * 0.105;  // bar height (pill radius = barH/2)
  const gap    = size * 0.072;  // vertical gap between bars
  const totalH = 3 * barH + 2 * gap;
  const startY = cy - totalH / 2;

  // Bar widths as fraction of usable width (usable = size * 0.72)
  const usableW = size * 0.72;
  const widths  = [1.0, 0.67, 0.84]; // top, middle, bottom

  const halfH = barH / 2;

  for (let i = 0; i < 3; i++) {
    const barCY  = startY + halfH + i * (barH + gap);
    const halfW  = (usableW * widths[i]) / 2;
    pill(px, size, cx, barCY, halfW, halfH, ...AC);
  }
}

// ── Generate files ─────────────────────────────────────────────────────────────
const OUT = path.resolve(__dirname, '../frontend/public');

for (const size of [192, 512]) {
  const px  = new Uint8Array(size * size * 4);
  drawIcon(px, size);
  const buf = buildPNG(size, px);
  const out = path.join(OUT, `icon-${size}.png`);
  fs.writeFileSync(out, buf);
  console.log(`✓  icon-${size}.png  (${(buf.length / 1024).toFixed(1)} KB)`);
}
