#!/usr/bin/env node
/**
 * Generates the built-in pet sprite sets in the classic Shimeji layout:
 * 46 frames (shime1.png … shime46.png), 128x128, character facing LEFT.
 *
 * Frame anchoring follows the engine's playground rules:
 *  - standing frames: feet touch the bottom edge (y = 127)
 *  - wall-climb frames (11-13): hands at x ≈ 42 (the engine lets the sprite overhang by width/3)
 *  - ceiling frames (22-24): hands at y ≈ 42
 *
 * Usage: node scripts/generate-sprites.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SPRITE = 128;
const SS = 3; // supersampling factor
const OUTLINE = [58, 40, 40, 255];

// ---------- tiny vector rasteriser ----------
class Canvas {
  constructor(size = SPRITE, ss = SS) {
    this.size = size;
    this.ss = ss;
    this.W = size * ss;
    this.buf = new Float32Array(this.W * this.W * 4);
    this.stack = [[1, 0, 0, 1, 0, 0]];
  }
  get m() { return this.stack[this.stack.length - 1]; }
  save() { this.stack.push(this.m.slice()); }
  restore() { this.stack.pop(); }
  mul(n) {
    const [a, b, c, d, e, f] = this.m;
    const [A, B, C, D, E, F] = n;
    this.stack[this.stack.length - 1] = [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
  }
  translate(x, y) { this.mul([1, 0, 0, 1, x, y]); }
  rotate(deg) { const r = (deg * Math.PI) / 180; this.mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]); }
  scale(sx, sy = sx) { this.mul([sx, 0, 0, sy, 0, 0]); }

  // fill a local-space shape described by inside(x, y, grow) and a local bounding box
  shape(bbox, inside, color, outline = true, ow = 2.4) {
    const { W, ss: SS } = this;
    const [a, b, c, d, e, f] = this.m;
    const det = a * d - b * c;
    const ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
    const pad = ow + 1;
    const corners = [
      [bbox[0] - pad, bbox[1] - pad], [bbox[2] + pad, bbox[1] - pad],
      [bbox[0] - pad, bbox[3] + pad], [bbox[2] + pad, bbox[3] + pad],
    ].map(([x, y]) => [(a * x + c * y + e) * SS, (b * x + d * y + f) * SS]);
    const x0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p[0]))));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(...corners.map((p) => p[0]))));
    const y0 = Math.max(0, Math.floor(Math.min(...corners.map((p) => p[1]))));
    const y1 = Math.min(W - 1, Math.ceil(Math.max(...corners.map((p) => p[1]))));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const sx = (px + 0.5) / SS - e, sy = (py + 0.5) / SS - f;
        const lx = ia * sx + ic * sy, ly = ib * sx + id * sy;
        let col = null;
        if (inside(lx, ly, 0)) col = color;
        else if (outline && inside(lx, ly, ow)) col = OUTLINE;
        if (col) {
          const i = (py * W + px) * 4;
          this.buf[i] = col[0]; this.buf[i + 1] = col[1]; this.buf[i + 2] = col[2]; this.buf[i + 3] = col[3] ?? 255;
        }
      }
    }
  }
  ellipse(cx, cy, rx, ry, color, outline = true, ow) {
    this.shape([cx - rx, cy - ry, cx + rx, cy + ry], (x, y, g) => {
      const dx = (x - cx) / (rx + g), dy = (y - cy) / (ry + g);
      return dx * dx + dy * dy <= 1;
    }, color, outline, ow);
  }
  circle(cx, cy, r, color, outline = true, ow) { this.ellipse(cx, cy, r, r, color, outline, ow); }
  capsule(x1, y1, x2, y2, r, color, outline = true, ow) {
    const vx = x2 - x1, vy = y2 - y1, len2 = vx * vx + vy * vy || 1;
    this.shape([Math.min(x1, x2) - r, Math.min(y1, y2) - r, Math.max(x1, x2) + r, Math.max(y1, y2) + r], (x, y, g) => {
      let t = ((x - x1) * vx + (y - y1) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const dx = x - (x1 + t * vx), dy = y - (y1 + t * vy);
      return dx * dx + dy * dy <= (r + g) * (r + g);
    }, color, outline, ow);
  }
  poly(pts, color, outline = true, ow) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const segDist = (x, y, [ax, ay], [bx, by]) => {
      const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1;
      let t = ((x - ax) * vx + (y - ay) * vy) / l; t = Math.max(0, Math.min(1, t));
      return Math.hypot(x - (ax + t * vx), y - (ay + t * vy));
    };
    this.shape([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], (x, y, g) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
      if (g === 0) return false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) if (segDist(x, y, pts[j], pts[i]) <= g) return true;
      return false;
    }, color, outline, ow);
  }
  line(x1, y1, x2, y2, w, color) { this.capsule(x1, y1, x2, y2, w / 2, color, false); }

  toPNG() {
    const { W, ss: SS, size: SIZE } = this;
    const png = new PNG({ width: SIZE, height: SIZE });
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * W + (x * SS + sx)) * 4;
          const al = this.buf[i + 3] / 255;
          r += this.buf[i] * al; g += this.buf[i + 1] * al; b += this.buf[i + 2] * al; a += al;
        }
        const o = (y * SIZE + x) * 4;
        png.data[o] = a ? r / a : 0; png.data[o + 1] = a ? g / a : 0; png.data[o + 2] = a ? b / a : 0;
        png.data[o + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
    return PNG.sync.write(png);
  }
}

// ---------- species ----------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k, 255];

const SPECIES = [
  { id: 1, name: 'Mochi', category: 'Cats', ears: 'cat', tail: 'cat', fur: '#f6a35b', belly: '#ffe3c4', stripes: true },
  { id: 2, name: 'Smokey', category: 'Cats', ears: 'cat', tail: 'cat', fur: '#9aa3ad', belly: '#e9edf1' },
  { id: 3, name: 'Bun', category: 'Bunnies', ears: 'bunny', tail: 'puff', fur: '#fbf6f2', belly: '#ffffff', inner: '#ffb8c6' },
  { id: 4, name: 'Biscuit', category: 'Dogs', ears: 'floppy', tail: 'dog', fur: '#c98a54', belly: '#f4dcc0', earColor: '#8a5530' },
  { id: 5, name: 'Bao', category: 'Bears', ears: 'round', tail: 'puff', fur: '#fafafa', belly: '#ffffff', earColor: '#2e2e33', patches: true, limbColor: '#2e2e33' },
  { id: 6, name: 'Kero', category: 'Frogs', ears: 'frog', tail: 'none', fur: '#7ccf6a', belly: '#e4f7c8' },
  { id: 7, name: 'Foxy', category: 'Foxes', ears: 'fox', tail: 'fox', fur: '#f07a3a', belly: '#fff4ea', earColor: '#3a2a26' },
];

// ---------- the pet painter (pet space: origin at ground under body, +y down, facing left) ----------
function drawPet(cv, sp, p) {
  const fur = hex(sp.fur), belly = hex(sp.belly);
  const limb = sp.limbColor ? hex(sp.limbColor) : fur;
  const back = shade(limb, 0.82);
  const earC = sp.earColor ? hex(sp.earColor) : fur;
  const inner = sp.inner ? hex(sp.inner) : hex('#ffc2cf');
  const pose = {
    body: [0, -17], squash: 1, head: [0, -47], tilt: 0, headR: 22,
    armF: 100, armB: 80, legF: 95, legB: 85, armLen: 13, legLen: 10,
    tail: -35, eyes: 'open', mouth: 'smile', look: 0, ...p,
  };
  const [bx, by] = pose.body;
  const [hx, hy] = pose.head;
  const rad = (d) => (d * Math.PI) / 180;
  const limbEnd = (ax, ay, ang, len) => [ax + Math.cos(rad(ang)) * len, ay + Math.sin(rad(ang)) * len];

  const armAnchorF = [bx - 9, by - 6], armAnchorB = [bx + 9, by - 6];
  const legAnchorF = [bx - 8, by + 8 * pose.squash], legAnchorB = [bx + 8, by + 8 * pose.squash];

  // tail (behind everything, on the right because we face left)
  cv.save(); cv.translate(bx + 15, by + 4); cv.rotate(pose.tail);
  if (sp.tail === 'cat') { cv.capsule(0, 0, 18, 0, 4.2, fur); if (sp.stripes) cv.capsule(10, 0, 13, 0, 4.2, shade(fur, 0.8), false); }
  else if (sp.tail === 'dog') cv.capsule(0, 0, 14, 0, 4.5, fur);
  else if (sp.tail === 'fox') { cv.ellipse(14, 0, 16, 8, fur); cv.ellipse(26, 0, 5, 5.5, belly, false); }
  else if (sp.tail === 'puff') cv.circle(2, 0, 7, belly);
  cv.restore();

  // back limbs
  if (!pose.hideBackLimbs) {
    cv.capsule(...armAnchorB, ...limbEnd(...armAnchorB, pose.armB, pose.armLen), 4.6, back);
    cv.capsule(...legAnchorB, ...limbEnd(...legAnchorB, pose.legB, pose.legLen), 5.6, back);
  }
  // body
  cv.ellipse(bx, by, 18, 16 * pose.squash, fur);
  cv.ellipse(bx - 3, by + 2, 11, 11 * pose.squash, belly, false);
  if (sp.stripes) { cv.line(bx + 6, by - 14, bx + 9, by - 6, 2.4, shade(fur, 0.8)); cv.line(bx + 12, by - 11, bx + 14, by - 4, 2.4, shade(fur, 0.8)); }
  // front limbs
  cv.capsule(...legAnchorF, ...limbEnd(...legAnchorF, pose.legF, pose.legLen), 5.6, limb);
  cv.capsule(...armAnchorF, ...limbEnd(...armAnchorF, pose.armF, pose.armLen), 4.6, limb);

  // head
  cv.save(); cv.translate(hx, hy); cv.rotate(pose.tilt);
  const R = pose.headR;
  if (sp.ears === 'cat' || sp.ears === 'fox') {
    for (const s of [-1, 1]) {
      cv.poly([[s * 6, -R + 6], [s * 19, -R - 9], [s * 21, -R + 12]], earC);
      cv.poly([[s * 9, -R + 6], [s * 17, -R - 3], [s * 18, -R + 9]], inner, false);
    }
  } else if (sp.ears === 'bunny') {
    for (const [s, a] of [[-1, -12], [1, 14]]) {
      cv.save(); cv.translate(s * 8, -R + 4); cv.rotate(a + (pose.earFlop || 0) * s);
      cv.ellipse(0, -17, 6.5, 18, earC); cv.ellipse(0, -16, 3, 13, inner, false);
      cv.restore();
    }
  } else if (sp.ears === 'round') {
    for (const s of [-1, 1]) cv.circle(s * 16, -R + 5, 7.5, earC);
  } else if (sp.ears === 'frog') {
    for (const s of [-1, 1]) cv.circle(s * 10, -R + 3, 9, fur);
  }
  cv.ellipse(0, 0, R, R * 0.9, fur);
  if (sp.ears === 'floppy') {
    for (const s of [-1, 1]) { cv.save(); cv.translate(s * 17, -10); cv.rotate(s * 18); cv.ellipse(0, 9, 7, 14, earC); cv.restore(); }
  }
  if (sp.patches) for (const s of [-1, 1]) { cv.save(); cv.translate(-3 + s * 8, 1); cv.rotate(s * -25); cv.ellipse(0, 0, 5.5, 7, hex('#2e2e33'), false); cv.restore(); }
  if (sp.tail === 'fox') cv.ellipse(-5, 9, 11, 7, belly, false);

  // face (shifted towards the left = facing direction)
  const fx = -5 + pose.look;
  const eyeY = sp.ears === 'frog' ? -R + 3 : 1;
  const eyeXs = sp.ears === 'frog' ? [-10, 10] : [fx - 7, fx + 7];
  const black = hex('#2b1d1d'), white = hex('#ffffff');
  const eye = (x, kind) => {
    if (kind === 'open') { cv.ellipse(x, eyeY, 3.4, 4.2, black, false); cv.circle(x - 1, eyeY - 1.6, 1.3, white, false); }
    else if (kind === 'wide') { cv.circle(x, eyeY, 4.6, white); cv.circle(x, eyeY, 2.2, black, false); }
    else if (kind === 'up') { cv.ellipse(x, eyeY, 3.4, 4.2, black, false); cv.circle(x - 0.5, eyeY - 2.6, 1.3, white, false); }
    else if (kind === 'closed') cv.line(x - 3.5, eyeY + 1, x + 3.5, eyeY + 1, 1.8, black);
    else if (kind === 'happy') { cv.line(x - 3.5, eyeY + 1.5, x, eyeY - 1.8, 1.8, black); cv.line(x, eyeY - 1.8, x + 3.5, eyeY + 1.5, 1.8, black); }
    else if (kind === 'squeeze') { cv.line(x - 3.5, eyeY - 2.5, x + 2.5, eyeY, 1.8, black); cv.line(x + 2.5, eyeY, x - 3.5, eyeY + 2.5, 1.8, black); }
    else if (kind === 'swirl') { cv.circle(x, eyeY, 3.6, black, false); cv.circle(x, eyeY, 2.2, fur, false); cv.circle(x, eyeY, 1, black, false); }
  };
  const [eL, eR] = Array.isArray(pose.eyes) ? pose.eyes : [pose.eyes, pose.eyes];
  eye(eyeXs[0], eL); eye(eyeXs[1], eR);
  if (sp.ears !== 'frog') { cv.ellipse(fx - 12, eyeY + 7, 3.5, 2, hex('#ff9fb0'), false); cv.ellipse(fx + 11, eyeY + 7, 3.5, 2, hex('#ff9fb0'), false); }
  const my = sp.ears === 'frog' ? 6 : 8;
  if (sp.ears !== 'frog') cv.ellipse(fx, eyeY + 5, 1.8, 1.3, hex('#e0707f'), false);
  if (pose.mouth === 'smile') { cv.line(fx - 3, my + 1, fx, my + 2.5, 1.5, black); cv.line(fx, my + 2.5, fx + 3, my + 1, 1.5, black); }
  else if (pose.mouth === 'o') cv.ellipse(fx, my + 3, 2.6, 3.2, hex('#7a2c36'));
  else if (pose.mouth === 'open') { cv.ellipse(fx, my + 3, 4.5, 4, hex('#7a2c36')); cv.ellipse(fx, my + 5, 2.5, 1.6, hex('#ff8d9e'), false); }
  else if (pose.mouth === 'flat') cv.line(fx - 3, my + 2, fx + 3, my + 2, 1.5, black);
  cv.restore();

  if (pose.armsOver) {
    cv.capsule(...armAnchorB, ...limbEnd(...armAnchorB, pose.armB, pose.armLen), 4.6, limb);
    cv.capsule(...armAnchorF, ...limbEnd(...armAnchorF, pose.armF, pose.armLen), 4.6, limb);
  }

  // extras
  for (const h of pose.hearts || []) heart(cv, h[0], h[1], h[2] || 5);
  for (const z of pose.zzz || []) zee(cv, z[0], z[1], z[2] || 5);
  if (pose.sweat) cv.ellipse(hx + 18, hy - 12, 2.6, 4, hex('#8fd3ff'));
}

function heart(cv, x, y, s) {
  const red = hex('#ff4f7b');
  cv.circle(x - s * 0.5, y - s * 0.3, s * 0.6, red);
  cv.circle(x + s * 0.5, y - s * 0.3, s * 0.6, red);
  cv.poly([[x - s * 1.08, y - s * 0.1], [x + s * 1.08, y - s * 0.1], [x, y + s * 1.1]], red);
}
function zee(cv, x, y, s) {
  const c = hex('#6a7fd6');
  cv.line(x - s, y - s, x + s, y - s, 1.8, c); cv.line(x + s, y - s, x - s, y + s, 1.8, c); cv.line(x - s, y + s, x + s, y + s, 1.8, c);
}

// ---------- frames ----------
// Each frame: place(cv) sets the transform from canvas to pet space, then pose overrides.
const ground = (dx = 0) => (cv) => cv.translate(64 + dx, 127);
const FRAMES = {};
const def = (i, place, pose = {}) => { FRAMES[i] = { place, pose }; };

def(0, ground(), {});
def(1, ground(), { legF: 120, legB: 65, armF: 70, armB: 110, body: [0, -18], head: [-1, -48] });
def(2, ground(), { legF: 65, legB: 120, armF: 115, armB: 70, body: [0, -18], head: [1, -48] });
def(3, (cv) => cv.translate(64, 110), { armF: 215, armB: 325, legF: 120, legB: 60, eyes: 'wide', mouth: 'o', tilt: -6 });
// dragging: held by the scruff, dangling
const dangle = { armF: 120, armB: 60, legF: 98, legB: 82, legLen: 13, eyes: 'wide', mouth: 'o' };
def(4, (cv) => cv.translate(64, 116), dangle);
def(5, (cv) => { cv.translate(64, 44); cv.rotate(-14); cv.translate(0, 72); }, { ...dangle, legF: 110, legB: 95 });
def(6, (cv) => { cv.translate(64, 44); cv.rotate(14); cv.translate(0, 72); }, { ...dangle, legF: 80, legB: 70 });
def(7, (cv) => { cv.translate(64, 44); cv.rotate(24); cv.translate(0, 72); }, { ...dangle, armF: 200, armB: 340, eyes: 'squeeze', mouth: 'open', sweat: true });
def(8, ground(), {}); def(9, ground(), {});
// sit
const sit = { body: [0, -14], head: [-2, -43], legF: 175, legB: 160, legLen: 11, armF: 120, armB: 100, armLen: 11 };
def(10, ground(), sit);
// wall climb (wall on the left at x = 42)
const climb = (aF, aB, lF, lB) => ({
  body: [0, -17], head: [-1, -47], armF: aF, armB: aB, legF: lF, legB: lB, armLen: 15, legLen: 11, look: -2, mouth: 'flat', tail: 30,
});
const wall = (cv) => cv.translate(64, 100);
def(11, wall, climb(215, 230, 160, 150));
def(12, wall, climb(235, 205, 150, 165));
def(13, wall, climb(205, 240, 170, 145));
def(14, ground(), { look: 4, eyes: 'open', mouth: 'smile' });
def(15, ground(), {});
def(16, ground(), { look: 4, eyes: ['open', 'happy'], mouth: 'open' });
def(17, ground(), { squash: 0.72, body: [0, -12], head: [0, -36], legF: 150, legB: 30, armF: 150, armB: 30, eyes: 'squeeze', mouth: 'flat' });
def(18, ground(), { squash: 0.88, body: [0, -15], head: [-2, -43], legF: 120, legB: 60, armF: 130, armB: 60, eyes: 'closed' });
// lying on belly (trip / creep)
def(19, (cv) => { cv.translate(66, 127); }, { body: [6, -15], squash: 0.8, head: [-20, -18], tilt: -10, armF: 180, armB: 165, legF: 10, legB: 0, legLen: 12, eyes: 'swirl', mouth: 'flat' });
def(20, (cv) => { cv.translate(66, 127); }, { body: [6, -15], squash: 0.8, head: [-18, -20], tilt: -4, armF: 175, armB: 190, armLen: 17, legF: 5, legB: 355, legLen: 12, eyes: 'open', mouth: 'flat' });
def(21, (cv) => { cv.translate(64, 104); cv.rotate(-28); }, { armF: 200, armB: 215, armLen: 15, legF: 40, legB: 60, eyes: 'open', mouth: 'open' });
// hanging from the ceiling (hands at y = 42)
const ceil = (aF, aB, look) => ({ body: [0, 22], head: [0, -4], armF: aF, armB: aB, armLen: 40, armsOver: true, legF: 95, legB: 85, legLen: 12, look, mouth: 'flat', tail: 40 });
const hang = (cv) => cv.translate(64, 72);
def(22, hang, ceil(250, 290, 0));
def(23, hang, ceil(238, 288, -3));
def(24, hang, ceil(252, 302, 2));
def(25, ground(), { ...sit, tilt: 18, eyes: 'up', look: 2 });
for (const i of [26, 27, 28, 29]) def(i, ground(), {});
// sitting on a ledge, legs dangling
const ledge = { body: [0, -10], head: [-2, -39], armF: 110, armB: 80, armLen: 11, legLen: 13 };
def(30, ground(-2), { ...ledge, legF: 100, legB: 80 });
def(31, ground(-2), { ...ledge, legF: 70, legB: 110, mouth: 'open' });
for (const i of [32, 33, 34, 35, 36]) def(i, ground(), {});
// special: stretch -> yawn -> nap
def(37, ground(), { armF: 250, armB: 290, armLen: 17, head: [0, -49], eyes: 'closed', mouth: 'smile' });
def(38, ground(), { armF: 240, armB: 300, armLen: 17, head: [0, -49], tilt: 10, eyes: 'closed', mouth: 'open' });
def(39, ground(), { ...sit, head: [-3, -40], tilt: -14, eyes: 'closed', mouth: 'flat', zzz: [[24, -66, 4]] });
def(40, ground(), { ...sit, head: [-3, -40], tilt: -14, eyes: 'closed', mouth: 'flat', zzz: [[24, -66, 4], [34, -80, 5.5]] });
// special2: happy hop with hearts
def(41, ground(), { squash: 0.85, body: [0, -14], head: [0, -41], legF: 135, legB: 45, armF: 130, armB: 50, eyes: 'happy' });
def(42, (cv) => cv.translate(64, 116), { armF: 230, armB: 310, legF: 105, legB: 75, eyes: 'happy', mouth: 'open', earFlop: 10 });
def(43, (cv) => { cv.translate(64, 110); cv.rotate(10); }, { armF: 210, armB: 330, legF: 110, legB: 70, eyes: 'happy', mouth: 'open', hearts: [[-26, -70, 4]] });
def(44, ground(), { armF: 200, armB: 340, eyes: 'happy', mouth: 'smile', hearts: [[-26, -76, 4.5], [26, -82, 4]] });
def(45, ground(), { armF: 235, armB: 305, armLen: 15, eyes: 'happy', mouth: 'open', hearts: [[-28, -80, 5.5], [28, -86, 5], [0, -98, 4]] });

// ---------- main ----------
const outRoot = path.join(__dirname, '..', 'assets', 'pets');
// The native overlay service reads built-in sprites straight from the APK's assets/ folder.
const nativeRoot = path.join(__dirname, '..', 'modules', 'pet-overlay', 'android', 'src', 'main', 'assets', 'pets');
const manifest = [];
for (const sp of SPECIES) {
  const dir = path.join(outRoot, String(sp.id));
  const nativeDir = path.join(nativeRoot, String(sp.id));
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(nativeDir, { recursive: true });
  for (let i = 0; i < 46; i++) {
    const cv = new Canvas();
    const fr = FRAMES[i];
    fr.place(cv);
    drawPet(cv, sp, fr.pose);
    const png = cv.toPNG();
    fs.writeFileSync(path.join(dir, `shime${i + 1}.png`), png);
    fs.writeFileSync(path.join(nativeDir, `shime${i + 1}.png`), png);
  }
  manifest.push({ id: sp.id, name: sp.name, category: sp.category });
  console.log(`generated ${sp.name}`);
}

// ---------- app icons (Mochi winking) ----------
function icon(file, size, withBg, petScale) {
  const cv = new Canvas(size, 2);
  if (withBg) cv.ellipse(size / 2, size / 2, size * 0.75, size * 0.75, hex('#fff3ee'), false);
  cv.scale(size / 128);
  cv.translate(64, 64 + 50 * petScale);
  cv.scale(petScale);
  drawPet(cv, SPECIES[0], FRAMES[16].pose);
  fs.writeFileSync(path.join(__dirname, '..', 'assets', file), cv.toPNG());
}
icon('icon.png', 1024, true, 0.95);
icon('android-icon-foreground.png', 512, false, 0.6);
icon('splash-icon.png', 512, false, 0.95);
console.log('wrote app icons');

// Metro needs static require() calls, so emit a module listing every frame.
const lines = ['// AUTO-GENERATED by scripts/generate-sprites.js — do not edit.', 'export const BUILTIN_PETS = ['];
for (const m of manifest) {
  const frames = Array.from({ length: 46 }, (_, i) => `require('../../assets/pets/${m.id}/shime${i + 1}.png')`).join(',\n      ');
  lines.push(`  {\n    id: ${m.id},\n    name: ${JSON.stringify(m.name)},\n    category: ${JSON.stringify(m.category)},\n    frames: [\n      ${frames},\n    ],\n  },`);
}
lines.push('] as const;', '');
fs.mkdirSync(path.join(__dirname, '..', 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'builtinPets.ts'), lines.join('\n'));
console.log('wrote src/data/builtinPets.ts');
