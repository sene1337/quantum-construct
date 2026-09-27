// Text in the scene: drawn on canvases in the page's own fonts, on the label layer (see world.js).
// Markup inside a line: {o:orange} {g:gold} {r:red} {m:muted} {i:ink} {b:bold ink} and {n:3} for a source mark.
import * as THREE from 'three';
import { LABELS, HEX } from './world.js';
import { SOURCES } from './facts.js';

const srcNum = (id) => {
  const i = SOURCES.findIndex((s) => s.id === id);
  if (i < 0) console.warn('unknown source', id);
  return i + 1;
};

const FAM = { ui: '"Figtree", system-ui, sans-serif', display: '"Cormorant Garamond", Georgia, serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
const COL = { i: HEX.ink, b: HEX.ink, m: HEX.muted, g: HEX.gold, o: HEX.orange, r: HEX.bad };
let PX = 44;
export function setLabelResolution(px) { PX = px; }

function parse(line, base) {
  const out = [];
  const re = /\{([ibmgorn]):([^}]*)\}/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), c: base });
    if (m[1] === 'n') out.push({ t: '[' + srcNum(m[2]) + ']', c: HEX.gold, sup: true });
    else out.push({ t: m[2], c: COL[m[1]], bold: m[1] === 'b' });
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ t: line.slice(last), c: base });
  return out;
}

const measureCv = document.createElement('canvas').getContext('2d');
function fontOf(o, px, seg) {
  const w = seg && seg.bold ? 600 : o.weight;
  return `${w} ${seg && seg.sup ? Math.round(px * 0.55) : px}px ${FAM[o.font]}`;
}

/**
 * A text label. `size` is the line height in world units.
 * Options: font ui|display|mono, color (hex), weight, align left|center|right, panel (bool), tracking (em),
 * billboard (bool), opacity, upper (bool), maxW (world units; the text wraps at word gaps).
 */
export function label(text, opts = {}) {
  const o = { size: 0.3, font: 'ui', color: HEX.ink, weight: 500, align: 'center', panel: false, tracking: 0, billboard: false, opacity: 1, upper: false, lh: 1.3, maxW: 0, ...opts };
  if (o.font === 'display' && opts.weight === undefined) o.weight = 600;
  const px = PX;
  let src = String(text);
  if (o.upper) src = src.toUpperCase();
  const lines = src.split('\n').map((l) => parse(l, o.color));
  const lineW = (segs) => {
    let w = 0;
    for (const s of segs) {
      measureCv.font = fontOf(o, px, s);
      measureCv.letterSpacing = o.tracking ? `${o.tracking * px}px` : '0px';
      w += measureCv.measureText(s.t).width;
    }
    return w;
  };
  // Wrap long lines at spaces when a world width is given.
  if (o.maxW > 0) {
    const maxPx = (o.maxW / o.size) * px * o.lh;
    const wrapped = [];
    for (const segs of lines) {
      if (lineW(segs) <= maxPx) { wrapped.push(segs); continue; }
      let cur = [];
      for (const s of segs) {
        const words = s.t.split(/(\s+)/);
        for (const wd of words) {
          const piece = { ...s, t: wd };
          if (cur.length && lineW([...cur, piece]) > maxPx && wd.trim()) { wrapped.push(cur); cur = []; if (!wd.trim()) continue; }
          if (!cur.length && !wd.trim()) continue;
          cur.push(piece);
        }
      }
      if (cur.length) wrapped.push(cur);
    }
    lines.length = 0; lines.push(...wrapped);
  }
  const widths = lines.map(lineW);
  const padX = o.panel ? px * 0.7 : px * 0.25, padY = o.panel ? px * 0.55 : px * 0.18;
  const lineH = px * o.lh;
  const cw = Math.ceil(Math.max(8, ...widths) + padX * 2), ch = Math.ceil(lines.length * lineH + padY * 2);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d');
  if (o.panel) {
    cx.fillStyle = 'rgba(16, 13, 10, 0.88)';
    cx.strokeStyle = HEX.line;
    cx.lineWidth = Math.max(2, px * 0.06);
    const r = px * 0.35;
    cx.beginPath(); cx.roundRect(1, 1, cw - 2, ch - 2, r); cx.fill(); cx.stroke();
  }
  cx.textBaseline = 'middle';
  lines.forEach((segs, i) => {
    let x = o.align === 'left' ? padX : o.align === 'right' ? cw - padX - widths[i] : (cw - widths[i]) / 2;
    const y = padY + lineH * (i + 0.54);
    for (const s of segs) {
      cx.font = fontOf(o, px, s);
      cx.letterSpacing = o.tracking ? `${o.tracking * px}px` : '0px';
      cx.fillStyle = s.c;
      if (!o.panel) { cx.shadowColor = 'rgba(6, 5, 4, 0.85)'; cx.shadowBlur = px * 0.28; }
      cx.fillText(s.t, x, s.sup ? y - px * 0.28 : y);
      x += cx.measureText(s.t).width;
    }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const hW = (ch / lineH) * o.size, wW = (hW * cw) / ch;
  let obj;
  if (o.billboard) {
    obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: o.opacity, depthWrite: false, toneMapped: false }));
    obj.scale.set(wW, hW, 1);
    if (o.align === 'left') obj.center.set(0, 0.5);
    if (o.align === 'right') obj.center.set(1, 0.5);
  } else {
    const geo = new THREE.PlaneGeometry(wW, hW);
    if (o.align === 'left') geo.translate(wW / 2, 0, 0);
    if (o.align === 'right') geo.translate(-wW / 2, 0, 0);
    obj = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: o.opacity, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  }
  obj.layers.set(LABELS);
  obj.renderOrder = 5;
  obj.userData.isLabel = true;
  obj.userData.w = wW; obj.userData.h = hW;
  return obj;
}

/** A canvas panel you draw yourself (the wallet screen, the locking script). Redraw with panel.userData.redraw(). */
export function drawnPanel(w, h, draw, pxW = 1024) {
  const cv = document.createElement('canvas');
  cv.width = pxW; cv.height = Math.round((pxW * h) / w);
  const cx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  mesh.layers.set(LABELS);
  mesh.renderOrder = 4;
  mesh.userData.isLabel = true;
  mesh.userData.redraw = (...a) => { cx.clearRect(0, 0, cv.width, cv.height); draw(cx, cv.width, cv.height, ...a); tex.needsUpdate = true; };
  mesh.userData.redraw();
  return mesh;
}

export const fonts = FAM;

/** Turn a label to face a point in its level (yaw only), so it reads from where the camera arrives. */
export function faceToward(obj, x, z) {
  obj.rotation.y = Math.atan2(x - obj.position.x, z - obj.position.z);
  return obj;
}
