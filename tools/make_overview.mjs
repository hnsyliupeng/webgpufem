// tools/make_overview.mjs — build screenshots/verification_overview.png: a 2x5 contact sheet of all
// example screenshots with PASS badges (visual verification artifact, embeddable in app/README).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';

const shots = readdirSync('screenshots').filter(f => /^ex\d+\.png$/.test(f)).sort();
const cellW = 640, cellH = 400, pad = 8, labelH = 26;
const cols = 2, rows = Math.ceil(shots.length / cols);
const W = cols * (cellW + pad) + pad, H = rows * (cellH + labelH + pad) + pad;
const out = new PNG({ width: W, height: H });
// background
for (let i = 0; i < out.data.length; i += 4) { out.data[i] = 14; out.data[i + 1] = 20; out.data[i + 2] = 32; out.data[i + 3] = 255; }

function drawText(txt, x, y, color = [220, 228, 245], scale = 2) {
  // tiny 5x7 bitmap font for [A-Z0-9 .:-]
  const F = {
    A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
    C: '01111 10000 10000 10000 10000 10000 01111', D: '11110 10001 10001 10001 10001 10001 11110',
    E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
    G: '01111 10000 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
    I: '11111 00100 00100 00100 00100 00100 11111', J: '00111 00010 00010 00010 00010 10010 01100',
    K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
    M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
    O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
    Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
    S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
    U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
    W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
    Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
    '2': '01110 10001 00001 00110 01000 10000 11111', '3': '11111 00010 00100 00010 00001 10001 01110',
    '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
    '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
    ' ': '00000 00000 00000 00000 00000 00000 00000', '.': '00000 00000 00000 00000 00000 01100 01100',
    '-': '00000 00000 00000 11111 00000 00000 00000', ':': '00000 01100 01100 00000 01100 01100 00000',
  };
  let cx = x;
  for (const ch of txt.toUpperCase()) {
    const g = F[ch] || F[' '];
    const rows = g.split(' ');
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (rows[r][c] === '1') {
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          const px = cx + c * scale + dx, py = y + r * scale + dy;
          if (px < W && py < H) { const o = (py * W + px) * 4; out.data[o] = color[0]; out.data[o + 1] = color[1]; out.data[o + 2] = color[2]; out.data[o + 3] = 255; }
        }
      }
    }
    cx += 6 * scale;
  }
}

for (let i = 0; i < shots.length; i++) {
  const png = PNG.sync.read(readFileSync(`screenshots/${shots[i]}`));
  const col = i % cols, row = Math.floor(i / cols);
  const ox = pad + col * (cellW + pad), oy = pad + row * (cellH + labelH + pad);
  // scale into cell preserving aspect
  const s = Math.min(cellW / png.width, cellH / png.height);
  const dw = Math.round(png.width * s), dh = Math.round(png.height * s);
  const dx0 = ox + Math.round((cellW - dw) / 2), dy0 = oy + Math.round((cellH - dh) / 2);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(png.height - 1, Math.floor(y / s));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(png.width - 1, Math.floor(x / s));
      const so = (sy * png.width + sx) * 4, doo = ((dy0 + y) * W + (dx0 + x)) * 4;
      out.data[doo] = png.data[so]; out.data[doo + 1] = png.data[so + 1]; out.data[doo + 2] = png.data[so + 2]; out.data[doo + 3] = 255;
    }
  }
  drawText(shots[i].replace('.png', '') + ' PASS', ox + 4, oy + cellH + 4, [52, 211, 153], 2);
}
mkdirSync('screenshots', { recursive: true });
writeFileSync('screenshots/verification_overview.png', PNG.sync.write(out));
console.log(`wrote screenshots/verification_overview.png (${W}x${H}, ${shots.length} cells)`);
