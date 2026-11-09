/**
 * Self-contained PNG line charts for customer emails.
 * No external chart service, tracking pixel, or browser scripting.
 * Output is embedded as CID attachments, so client measurements are not
 * published to a third-party URL.
 */
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name, payload) {
  const tag = Buffer.from(name, 'ascii');
  const size = Buffer.alloc(4);
  size.writeUInt32BE(payload.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, payload])));
  return Buffer.concat([size, tag, payload, crc]);
}
function canvas(width, height) {
  const bytes = Buffer.alloc(width * height * 3, 255);
  function pixel(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    bytes[i] = color[0]; bytes[i + 1] = color[1]; bytes[i + 2] = color[2];
  }
  function line(x1, y1, x2, y2, color, radius = 1) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.3));
    for (let n = 0; n <= steps; n++) {
      const x = x1 + (x2 - x1) * n / steps;
      const y = y1 + (y2 - y1) * n / steps;
      for (let dx = -radius; dx <= radius; dx++)
        for (let dy = -radius; dy <= radius; dy++)
          if (dx * dx + dy * dy <= radius * radius + 0.5) pixel(x + dx, y + dy, color);
    }
  }
  function dot(x, y, color) {
    for (let dx = -4; dx <= 4; dx++)
      for (let dy = -4; dy <= 4; dy++)
        if (dx * dx + dy * dy <= 16) pixel(x + dx, y + dy, color);
  }
  return { bytes, line, dot };
}
function png(width, height, rgb) {
  const rows = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++)
    rgb.copy(rows, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4);
  head[8] = 8; head[9] = 2; // RGB / 8 bits
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(rows, { level: 8 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
/**
 * Render comparably sampled points. Missing weeks remain gaps, not zeroes.
 * Do not infer employee wellbeing or productivity from these images.
 */
export function createTrendPng(points, key, { baseline = null, width = 600, height = 190 } = {}) {
  if (!Array.isArray(points) || points.filter(p => Number.isFinite(p?.[key])).length < 3) return null;
  const values = points.map(p => Number.isFinite(p?.[key]) ? Number(p[key]) : null);
  const base = Number.isFinite(baseline) && baseline >= 0 ? baseline : null;
  const max = Math.max(1, ...values.filter(v => v != null), ...(base == null ? [] : [base]));
  const w = width, h = height;
  const x0 = 22, x1 = w - 20, y0 = 14, y1 = h - 28;
  const X = i => x0 + (x1 - x0) * (i / Math.max(1, values.length - 1));
  const Y = v => y1 - v / max * (y1 - y0);
  const ink = [37, 99, 235], grid = [226, 232, 240], guide = [14, 116, 144];
  const { bytes, line, dot } = canvas(w, h);
  for (let tick = 0; tick <= 4; tick++) {
    const gy = y0 + (y1 - y0) * tick / 4;
    line(x0, gy, x1, gy, grid, 0);
  }
  if (base != null) for (let x = x0; x <= x1; x += 12)
    line(x, Y(base), Math.min(x + 7, x1), Y(base), guide, 0);
  for (let i = 1; i < values.length; i++)
    if (values[i - 1] != null && values[i] != null)
      line(X(i - 1), Y(values[i - 1]), X(i), Y(values[i]), ink, 2);
  for (let i = 0; i < values.length; i++)
    if (values[i] != null) dot(X(i), Y(values[i]), ink);
  line(x0, y1, x1, y1, [148, 163, 184], 0);
  return png(w, h, bytes);
}
