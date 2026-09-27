// The twelve levels of the zoom axis, outermost first. Out: the machine. In: the math.
// Every number shown comes from js/facts.js, which carries its source.
import * as THREE from 'three';
import { V, rand } from './engine.js';
import { label, drawnPanel, faceToward, fonts } from './labels.js';
import { castText, standOnWater, textBounds } from './cast.js';
import { HEX } from './world.js';
import { LEVEL_TEXT, TARGETS, CHAIN, MACHINES, NUM } from './facts.js';

/* ------------------------------------------------------------------ helpers */
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const cx = cv.getContext('2d');
  const g = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(cv);
  return _glowTex;
}
/** A point of light. Colours above 1 bloom. */
export function glow(size, rgb, op = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color().setRGB(...rgb), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}
const lineMat = (rgb, op = 1) => new THREE.LineBasicMaterial({ color: new THREE.Color().setRGB(...rgb), transparent: true, opacity: op });
function line(pts, rgb, op = 1) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => (Array.isArray(p) ? V(...p) : p))), lineMat(rgb, op));
}
function segs(pts, rgb, op = 1) {
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(rgb, op));
}
function edges(geo, rgb, op = 1) { return new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat(rgb, op)); }
function ring(r, rgb, op = 1, n = 72) {
  const pts = []; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; pts.push(V(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  return line(pts, rgb, op);
}
const C = { gold: [0.9, 0.62, 0.26], goldHot: [2.0, 1.3, 0.5], orange: [3.4, 1.15, 0.12], orangeSoft: [1.1, 0.42, 0.06], red: [2.6, 0.62, 0.5], redSoft: [0.95, 0.3, 0.25], ink: [0.86, 0.8, 0.72], muted: [0.36, 0.33, 0.29], line: [0.2, 0.16, 0.12] };

/** Place a text label in a level, turned to read from where the camera arrives. */
function say(L, text, pos, opts = {}) {
  const l = label(text, opts);
  l.position.set(...pos);
  if (!opts.billboard && opts.face !== false) faceToward(l, L.camStart.x, L.camStart.z);
  if (opts.rotY !== undefined) l.rotation.y = opts.rotY;
  L.group.add(l);
  return l;
}
/** Cast a number or words in metal and stand them on the level's water, rising as the level arrives. An array
 *  of lines is stacked, the last line on the water. */
function monument(L, kit, text, x, z, size, { rotY, face = true, metal = {} } = {}) {
  const lines = Array.isArray(text) ? text : [text];
  const mat = kit.cast(metal), mm = kit.castMirror(metal);
  const casts = lines.map((t) => castText(t, { size, depth: 0.2, bevel: 0.024, material: mat, mirrorMaterial: mm }));
  let c = casts[0];
  if (casts.length > 1) {
    const group = new THREE.Group(), mirror = new THREE.Group(), gap = size * 0.16;
    let y = 0;
    for (let i = casts.length - 1; i >= 0; i--) {
      casts[i].group.position.y = y; group.add(casts[i].group);
      casts[i].mirror.position.y = -y; mirror.add(casts[i].mirror);
      y += casts[i].height + gap;
    }
    c = { group, mirror, width: Math.max(...casts.map((k) => k.width)), height: y - gap };
  }
  const ry = rotY !== undefined ? rotY : face ? Math.atan2(L.camStart.x - x, L.camStart.z - z) : 0;
  const h = standOnWater(c, L.group, x, z, ry);
  h.userData.noAnim = true;
  L.casts.push(h);
  return h;
}
/** Instanced copies with their reflection under the water. */
function instanced(L, geo, mat, mirrorMat, mats) {
  const im = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((m, i) => im.setMatrixAt(i, m));
  im.computeBoundingSphere();
  const grp = new THREE.Group(); grp.add(im);
  if (mirrorMat) {
    const mm = new THREE.InstancedMesh(geo, mirrorMat, mats.length);
    mats.forEach((m, i) => mm.setMatrixAt(i, m));
    mm.computeBoundingSphere();
    mm.renderOrder = 1;
    const mg = new THREE.Group(); mg.scale.y = -1; mg.add(mm);
    grp.add(mg);
  }
  return grp;
}
/** A reflection under the water: the metal only (no text, no lines, no hit boxes), fading with depth. */
function mirrorClone(L, kit, obj) {
  const m = obj.clone();
  const drop = [];
  m.traverse((o) => { if (o.userData.isLabel || o.isLine || o.isPoints || (o.isMesh && o.material.visible === false)) drop.push(o); });
  for (const o of drop) o.removeFromParent();
  const cache = new Map();
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (!cache.has(o.material)) cache.set(o.material, kit.mirrorOf(o.material));
    o.material = cache.get(o.material);
    o.renderOrder = 1;
  });
  const g = new THREE.Group(); g.scale.y = -1; g.add(m);
  return g;
}
const Q = new THREE.Quaternion(), S1 = V(1, 1, 1);
const mtx = (x, y, z, s = S1, q = Q) => new THREE.Matrix4().compose(V(x, y, z), q, s);

/** A dilution refrigerator: the gold chandelier that superconducting quantum chips hang in. */
function chandelierParts() {
  return {
    disc: new THREE.CylinderGeometry(1, 1, 0.07, 20),
    rod: new THREE.CylinderGeometry(0.03, 0.03, 1.72, 6),
    can: new THREE.CylinderGeometry(0.16, 0.2, 0.34, 12),
    DR: [0.55, 0.47, 0.39, 0.31, 0.23], DY: [2.5, 2.12, 1.74, 1.36, 0.98],
  };
}
function chandelierMatrices(xs, scale = 1) {
  const P = chandelierParts();
  const discs = [], rods = [], cans = [];
  for (const [x, z] of xs) {
    for (let d = 0; d < 5; d++) discs.push(mtx(x, P.DY[d] * scale, z, V(P.DR[d] * scale, scale, P.DR[d] * scale)));
    for (let r = 0; r < 3; r++) { const a = (r / 3) * Math.PI * 2; rods.push(mtx(x + Math.cos(a) * 0.3 * scale, 1.72 * scale, z + Math.sin(a) * 0.3 * scale, V(scale, scale, scale))); }
    cans.push(mtx(x, 0.72 * scale, z, V(scale, scale, scale)));
  }
  return { P, discs, rods, cans };
}
function addChandeliers(L, kit, xs, scale = 1, mirror = true) {
  const { P, discs, rods, cans } = chandelierMatrices(xs, scale);
  const gold = kit.gold(), goldM = mirror ? kit.mirrorOf(gold) : null;
  const grp = new THREE.Group();
  grp.add(instanced(L, P.disc, gold, goldM, discs), instanced(L, P.rod, gold, goldM, rods), instanced(L, P.can, gold, goldM, cans));
  L.group.add(grp);
  return grp;
}

/* ------------------------------------------------------------------ the curve */
const CS = 1.5, CYS = 1.1;
export const curveY = (x) => Math.sqrt(x * x * x + 7);
export const cPt = (x, side = 1) => V(x * CS, side * curveY(x) * CYS, 0);
export const PUB = cPt(2.2, 1), GEN = cPt(-1.2, 1);

/* ------------------------------------------------------------------ canvas UIs */
const F = fonts;
function roundRect(cx, x, y, w, h, r) { cx.beginPath(); cx.roundRect(x, y, w, h, r); }
function drawPhone(cx, W, H, t) {
  cx.fillStyle = HEX.panel; roundRect(cx, 6, 6, W - 12, H - 12, 64); cx.fill();
  cx.strokeStyle = '#3a3129'; cx.lineWidth = 6; cx.stroke();
  const L = 72;
  cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
  cx.fillStyle = HEX.muted; cx.font = `500 34px ${F.ui}`; cx.fillText('Wallet', L, 120);
  cx.textAlign = 'right'; cx.fillText(t.app.net, W - L, 120); cx.textAlign = 'left';
  cx.fillStyle = HEX.gold; cx.font = `600 30px ${F.ui}`; cx.letterSpacing = '6px'; cx.fillText(t.app.kicker.toUpperCase(), L, 260); cx.letterSpacing = '0px';
  cx.fillStyle = HEX.ink; cx.font = `600 86px ${F.display}`; cx.fillText(t.app.title, L, 350);
  cx.fillStyle = HEX.ink; cx.font = `500 118px ${F.mono}`; cx.fillText(t.app.big, L, 540);
  cx.fillStyle = HEX.orange; cx.font = `500 54px ${F.mono}`; cx.fillText(t.app.unit, L + 4, 616);
  let y = 780;
  cx.strokeStyle = HEX.line; cx.lineWidth = 3;
  for (const [k, v, tone] of t.app.rows) {
    cx.beginPath(); cx.moveTo(L, y - 62); cx.lineTo(W - L, y - 62); cx.stroke();
    cx.fillStyle = HEX.muted; cx.font = `500 32px ${F.ui}`; cx.fillText(k, L, y);
    cx.fillStyle = tone === 'bad' ? HEX.bad : tone === 'ok' ? HEX.gold : tone === 'or' ? HEX.orange : HEX.ink;
    cx.font = `500 40px ${F.mono}`; cx.fillText(v, L, y + 58);
    y += 190;
  }
  cx.fillStyle = HEX.muted; cx.font = `500 30px ${F.ui}`;
  cx.fillText(t.app.foot, L, H - 110);
}
function drawScript(cx, W, H, t) {
  cx.fillStyle = 'rgba(16,13,10,0.92)'; roundRect(cx, 4, 4, W - 8, H - 8, 34); cx.fill();
  cx.strokeStyle = HEX.line; cx.lineWidth = 4; cx.stroke();
  const L = 56;
  cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
  cx.fillStyle = HEX.gold; cx.font = `600 24px ${F.ui}`; cx.letterSpacing = '5px'; cx.fillText(t.script.kicker.toUpperCase(), L, 76); cx.letterSpacing = '0px';
  cx.fillStyle = HEX.ink; cx.font = `600 50px ${F.display}`; cx.fillText(t.script.title, L, 138);
  let y = 222;
  for (const [txt, tone] of t.script.lines) {
    cx.fillStyle = tone === 'bad' ? HEX.bad : tone === 'ok' ? HEX.gold : tone === 'or' ? HEX.orange : HEX.ink;
    cx.font = `500 34px ${F.mono}`; cx.fillText(txt, L + 20, y); y += 54;
  }
  y = H - 40 - 44 * (t.script.note.length - 1);
  cx.fillStyle = t.exposed ? HEX.bad : t.key === 'proof' ? HEX.orange : HEX.gold; cx.font = `500 30px ${F.ui}`;
  for (const l of t.script.note) { cx.fillText(l, L, y); y += 44; }
}
/** A proof-of-work hash: the leading zeros glow orange, the rest is dim. Drawn on the bloom layer. */
function hashPlate(hash, w = 5.6) {
  const px = 50, cv = document.createElement('canvas');
  const cx0 = cv.getContext('2d'); cx0.font = `500 ${px}px ${F.mono}`;
  const cw = cx0.measureText('0').width;
  cv.width = Math.ceil(cw * hash.length + px); cv.height = 90;
  const cx = cv.getContext('2d');
  cx.font = `500 ${px}px ${F.mono}`; cx.textBaseline = 'middle';
  const z = hash.match(/^0*/)[0].length;
  let x = px / 2;
  for (let i = 0; i < hash.length; i++) {
    cx.fillStyle = i < z ? '#ffffff' : 'rgba(255,255,255,0.16)';
    cx.fillText(hash[i], x, 47); x += cw;
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, (w * cv.height) / cv.width), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color().setRGB(2.6, 0.95, 0.12), side: THREE.DoubleSide }));
  m.renderOrder = 3;
  return m;
}

/* ================================================================== levels */
export function defineLevels(engine, app) {
  const def = (d) => engine.defLevel({ ...d, ...LEVEL_TEXT[d.id] });

  /* ---------------- O4 · the dawn: the closing image ---------------- */
  // The words stand head on to a low camera, like the Sovereignty simulator's year. The view is turned so the sun
  // rises off to the left, in the open sky beside the words: it lights their rims and the water instead of shining
  // through the letters, and the key light falls on their faces from behind the viewer. Wide frames get two lines,
  // tall frames three, and the camera stands back just far enough for them to fit.
  const DAWN = { a: -0.43, size: 2.3, metal: { roughness: 0.36, clearcoat: 0.2 }, wide: ['CAN’T PRINT', 'THE PROOF'], tall: ['CAN’T', 'PRINT', 'THE PROOF'] };
  const stackBounds = (lines) => {
    const bs = lines.map((t) => textBounds(t, DAWN.size));
    return { width: Math.max(...bs.map((b) => b.width)), height: bs.reduce((sum, b) => sum + b.height, 0) + DAWN.size * 0.16 * (lines.length - 1) };
  };
  def({
    id: 'dawn', short: 'O4', side: 'out', sky: 0.96, look: { fov: 0.62, bloom: 0.3, threshold: 1.9, embers: 0.3, key: 0.85, rim: 0.55 },
    // The machine in question (O3) waits out of frame to the right; zooming in turns toward it.
    camStart: [-10, 2.5, 20], center: [0, 1.7, 0], portal: [49.6, 0, -16], water: 220,
    build(L, kit) {
      L.wide = monument(L, kit, DAWN.wide, 0, 0, DAWN.size, { rotY: DAWN.a, metal: DAWN.metal });
      L.tall = monument(L, kit, DAWN.tall, 0, 0, DAWN.size, { rotY: DAWN.a, metal: DAWN.metal });
      L.tall.visible = false;
      if (L.lastFrame) L.frame(L, ...L.lastFrame);
    },
    frame(L, aspect, fov) {
      L.lastFrame = [aspect, fov];
      const tall = aspect < 0.9;
      if (L.wide) { L.wide.visible = !tall; L.tall.visible = tall; }
      const b = stackBounds(tall ? DAWN.tall : DAWN.wide);
      const tanV = Math.tan((fov * Math.PI) / 360), tanH = tanV * aspect;
      const kw = tall ? 1.16 : Math.min(1.8, 1.25 + Math.max(0, aspect - 1) * 0.9);
      const d = Math.max((b.width * kw) / 2 / tanH, (b.height * 3.2) / 2 / tanV);
      const ty = 0.46 * b.height;
      L.camStart.set(Math.sin(DAWN.a) * d, ty + 0.035 * d, Math.cos(DAWN.a) * d);
      L.center.set(0, ty, 0);
    },
  });

  /* ---------------- O3 · machine B: the proof attacker ---------------- */
  def({
    id: 'machineB', short: 'O3', side: 'out', sky: 0.95,
    camStart: [-9, 6.5, 33], center: [0, 8, -12], portal: [6, 0, 9], water: 260,
    build(L, kit) {
      const g = L.group;
      const sx = 0, sy = 13, sz = -28;
      const core = new THREE.Group();
      core.add(glow(22, [1.5, 0.55, 0.07], 0.85), glow(8.5, [3.4, 1.7, 0.45]), glow(3.6, [5, 4, 2.4]));
      core.position.set(sx, sy, sz); g.add(core);
      const refl = new THREE.Group();
      refl.add(glow(15, [0.6, 0.22, 0.03], 0.8), glow(5.5, [1.3, 0.62, 0.18], 0.8));
      refl.position.set(sx, -sy * 0.96, sz); refl.scale.y = 0.5; refl.userData.noAnim = true; g.add(refl);
      // The swarm: collector plates around the star, with gaps where it is still being built.
      const hex = new THREE.CylinderGeometry(0.44, 0.44, 0.05, 6);
      const mats = [], N = 1300, GA = Math.PI * (3 - Math.sqrt(5)), R = 9.8, up = V(0, 1, 0);
      for (let i = 0; i < N; i++) {
        if (i % 5 === 0 || (i > 820 && i < 900)) continue;
        const yy = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - yy * yy), a = GA * i;
        const p = V(Math.cos(a) * r * R, yy * R, Math.sin(a) * r * R);
        const q = new THREE.Quaternion().setFromUnitVectors(up, p.clone().normalize());
        mats.push(new THREE.Matrix4().compose(p, q, S1));
      }
      const swarm = new THREE.Group();
      const im = new THREE.InstancedMesh(hex, kit.gold({ roughness: 0.22 }), mats.length);
      mats.forEach((m, i) => im.setMatrixAt(i, m));
      swarm.add(im);
      for (const rot of [[0, 0, 0], [Math.PI / 3, 0, 0.4], [-Math.PI / 4, 0.6, 0]]) {
        const tr = edges(new THREE.TorusGeometry(11.4, 0.05, 3, 120), C.gold, 0.3); tr.rotation.set(...rot); swarm.add(tr);
      }
      swarm.position.set(sx, sy, sz);
      g.add(swarm); L.swarm = swarm; L.core = core;
      monument(L, kit, '10²⁵ W', -9.5, -4, 2.7);
      say(L, NUM.b.cast, [-9.5, 3.4, -3.6], { size: 0.46, color: HEX.ink });
      say(L, NUM.b.grover, [9, 8.4, -6], { size: 0.64, color: HEX.ink, align: 'left' });
      say(L, NUM.b.today, [9, 4.9, -6], { size: 0.56, color: HEX.ink, align: 'left' });
      // Machine A: the whole key-breaking hall is the speck on the water.
      const sp = glow(1.4, C.goldHot); sp.position.set(6, 0.3, 9); g.add(sp);
      say(L, NUM.b.speck, [5.6, 1.4, 9], { size: 0.34, color: HEX.gold, billboard: true, align: 'right' });
    },
    tick(L, t, dt) {
      if (L.swarm && !app.still) L.swarm.rotation.y += dt * 0.02;
      if (L.core) { const f = app.attack.groverGlow(); L.core.scale.setScalar(1 + f * 0.4); }
    },
  });

  /* ---------------- O2 · machine A: the key breaker ---------------- */
  def({
    id: 'machineA', short: 'O2', side: 'out', sky: 0.86,
    camStart: [-19, 12, 31], center: [0, 2.2, -3], portal: [0, 0, -2.5], water: 100,
    build(L, kit) {
      const g = L.group;
      const pos = [];
      for (let x = -16.1; x <= 16.1; x += 2.3) {
        if (Math.abs(x) < 1.5) continue;
        for (let z = -10.35; z <= 10.35; z += 2.3) { if (Math.abs(z + 2.5) < 1.2 && Math.abs(x) < 3.5) continue; pos.push([x, z]); }
      }
      addChandeliers(L, kit, pos, 1, true);
      for (let z = -9; z <= 9; z += 4.6) g.add(line([[-19, 4.1, z], [19, 4.1, z]], C.gold, 0.3));
      // The operator's ring, where you came in from (the human, O1 and below).
      const plat = ring(1.2, C.goldHot, 0.9); plat.rotation.x = -Math.PI / 2; plat.position.set(0, 0.02, -2.5); plat.userData.noAnim = true; g.add(plat);
      // The number stands behind the hall, in view all the way in.
      monument(L, kit, '< 500,000', 23, -5, 2.6);
      say(L, NUM.a.castNote, [23, 3.3, -4.6], { size: 0.5, color: HEX.ink });
      say(L, NUM.a.spec, [10, 9.8, -6], { size: 0.56, align: 'left', panel: true });
      say(L, NUM.a.others, [-16.5, 4.4, -3.5], { size: 0.46, align: 'left', panel: true });
    },
  });

  /* ---------------- O1 · today's machines vs the machine needed ---------------- */
  def({
    id: 'today', short: 'O1', side: 'out', sky: 0.76,
    camStart: [0.5, 5.6, 18], center: [0, 1.7, -3], portal: [0.4, 0, 0.2], water: 70,
    build(L, kit) {
      const g = L.group;
      // Today's machines, in a row behind where you stand.
      MACHINES.forEach((m, i) => {
        const x = -7.2 + i * 3.6, z = -3;
        const grp = new THREE.Group();
        if (m.kind === 'sc') {
          const { P, discs, rods, cans } = chandelierMatrices([[0, 0]], 0.62);
          const gold = kit.gold();
          grp.add(instanced(L, P.disc, gold, kit.mirrorOf(gold), discs), instanced(L, P.rod, gold, kit.mirrorOf(gold), rods), instanced(L, P.can, gold, kit.mirrorOf(gold), cans));
        } else if (m.kind === 'ion') {
          const trap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.7), kit.gold()); trap.position.y = 0.9; grp.add(trap);
          for (let k = 0; k < 11; k++) { const s = glow(0.22, [2.0, 1.5, 3.0]); s.position.set(-0.55 + k * 0.11, 1.08, 0); grp.add(s); }
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 8), kit.iron()); leg.position.y = 0.45; grp.add(leg);
        } else {
          const cell = edges(new THREE.BoxGeometry(1.3, 1.3, 1.3), C.gold, 0.7); cell.position.y = 1.0; grp.add(cell);
          const pts = [];
          const nn = m.text.includes('6,100') ? 13 : 9;
          for (let a = 0; a < nn; a++) for (let b = 0; b < nn; b++) pts.push(-0.5 + a / (nn - 1), 0.5 + b / (nn - 1), 0);
          const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
          const pm = new THREE.PointsMaterial({ color: new THREE.Color().setRGB(1.6, 1.1, 2.4), size: 0.06, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
          grp.add(new THREE.Points(pg, pm));
        }
        grp.position.set(x, 0, z);
        g.add(grp);
        say(L, m.text, [x, 3.4, z], { size: 0.3, color: HEX.ink });
      });
      // The machine needed: its footprint on the water behind them, and the cranes starting on it.
      const fp = new THREE.Group();
      const R = [[-16, -7], [16, -7], [16, -26], [-16, -26], [-16, -7]];
      for (let i = 0; i < 4; i++) {
        const a = V(R[i][0], 0.03, R[i][1]), b = V(R[i + 1][0], 0.03, R[i + 1][1]);
        const n = Math.round(a.distanceTo(b) / 0.8);
        for (let k = 0; k < n; k += 2) fp.add(line([a.clone().lerp(b, k / n), a.clone().lerp(b, (k + 1) / n)], C.goldHot, 0.85));
      }
      g.add(fp);
      for (const [x, z, ry] of [[-10.5, -14, 0.5], [11, -18, 2.4]]) {
        const arm = new THREE.Group();
        const mast = new THREE.Mesh(new THREE.BoxGeometry(0.35, 9, 0.35), kit.iron()); mast.position.y = 4.5; arm.add(mast);
        const jib = new THREE.Mesh(new THREE.BoxGeometry(7, 0.28, 0.28), kit.iron()); jib.position.set(2.8, 9, 0); arm.add(jib);
        arm.add(line([[6, 8.9, 0], [6, 3.6, 0]], C.gold, 0.6));
        const hook = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), kit.gold()); hook.position.set(6, 3.3, 0); arm.add(hook);
        arm.position.set(x, 0, z); arm.rotation.y = ry; g.add(arm);
      }
      say(L, NUM.today.needed, [0, 7.6, -16], { size: 0.52, panel: true });
      monument(L, kit, NUM.today.cast, -10.5, -8, 2.0);
      say(L, NUM.today.castNote, [-10.5, 0.3, -5.6], { size: 0.34, color: HEX.ink, maxW: 6.5 });
    },
  });

  /* ---------------- L1 · a person, a wallet ---------------- */
  def({
    id: 'person', short: 'L1', side: 'in', sky: 0.66,
    camStart: [-10, 6.5, 13.5], center: [0, 3.4, 0], portal: [1.05, 4.15, 0.62], water: 42,
    build(L, kit) {
      const g = L.group;
      // The construct renders a person as sampled light.
      const human = new THREE.Group();
      const parts = [
        { a: [-0.38, 0.12, 0], b: [-0.3, 2.95, 0], r: 0.26 }, { a: [0.38, 0.12, 0], b: [0.3, 2.95, 0], r: 0.26 },
        { a: [-0.45, 3.18, 0], b: [0.45, 3.18, 0], r: 0.27 }, { a: [0, 3.4, 0], b: [0, 5.3, 0], r: 0.52, taper: 0.32 },
        { a: [-0.72, 5.15, 0], b: [-0.92, 3.15, 0.12], r: 0.13 }, { a: [0.72, 5.2, 0], b: [1.0, 4.62, 0.28], r: 0.13 },
        { a: [1.0, 4.62, 0.28], b: [1.03, 4.2, 0.52], r: 0.11 },
      ];
      const hp = [];
      for (const s of parts) {
        const A = V(...s.a), B = V(...s.b), ax = B.clone().sub(A), len = ax.length(); ax.normalize();
        const u0 = Math.abs(ax.y) < 0.92 ? V(0, 1, 0) : V(1, 0, 0);
        const e1 = u0.clone().cross(ax).normalize(), e2 = ax.clone().cross(e1).normalize();
        const n = Math.round(1700 * len * s.r);
        for (let i = 0; i < n; i++) {
          const t2 = rand(), th = rand() * Math.PI * 2, rr = s.r * (s.taper ? 1 - s.taper * t2 : 1) * (0.94 + rand() * 0.1);
          const p = A.clone().addScaledVector(ax, t2 * len).addScaledVector(e1, Math.cos(th) * rr).addScaledVector(e2, Math.sin(th) * rr);
          hp.push(p.x, p.y, p.z);
        }
      }
      for (let i = 0; i < 520; i++) { const d = V(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(); hp.push(d.x * 0.44, 5.95 + d.y * 0.5, d.z * 0.4); }
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3));
      const pm = new THREE.PointsMaterial({ color: new THREE.Color().setRGB(1.25, 0.86, 0.5), size: 0.06, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const body = new THREE.Points(pg, pm);
      human.add(body);
      const refl = new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color().setRGB(0.5, 0.33, 0.18), size: 0.06, map: glowTex(), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
      refl.scale.y = -1; human.add(refl);
      // The phone: the portal into everything below.
      const ph = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.06, 0.07), kit.iron()); ph.position.set(1.05, 4.15, 0.58); ph.rotation.x = -0.12; human.add(ph);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.96), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.6, 0.55, 0.06), transparent: true, opacity: 0.9, depthWrite: false }));
      scr.position.set(1.05, 4.155, 0.625); scr.rotation.x = -0.12; human.add(scr);
      const sg = glow(1.4, C.orange, 0.8); sg.position.set(1.05, 4.15, 0.72); human.add(sg);
      g.add(human);
      // The rack: five targets. Click one, or use the buttons.
      const rack = new THREE.Group();
      L.cases = []; L.hits = [];
      TARGETS.forEach((t, i) => {
        const cs = new THREE.Group();
        const frame = edges(new THREE.BoxGeometry(1.7, 2.3, 1.0), C.gold, 0.75); cs.add(frame); cs.userData.frame = frame;
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.0), kit.iron()); base.position.y = -1.15; cs.add(base);
        const item = new THREE.Group(); item.position.y = 0.05;
        if (t.key === 'satoshi') { const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.09, 40), kit.gold()); coin.rotation.x = Math.PI / 2; item.add(coin); }
        else if (t.key === 'reused') { const tag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.05), kit.gold()); item.add(tag); const hole = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 20), kit.iron()); hole.position.set(-0.3, 0.14, 0.03); item.add(hole); }
        else if (t.key === 'taproot') {
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8), kit.gold()); trunk.position.y = -0.2; item.add(trunk);
          for (const [a, h] of [[0.6, 0.25], [-0.6, 0.25], [0.3, 0.45], [-0.3, 0.45]]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.4, 6), kit.gold()); br.position.set(Math.sin(a) * 0.2, h - 0.1, 0); br.rotation.z = -a; item.add(br); }
        } else if (t.key === 'fresh') { const slab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.8, 0.1), kit.iron()); item.add(slab); for (let k = 0; k < 5; k++) { const l2 = line([[-0.18, -0.25 + k * 0.12, 0.06], [0.18, -0.2 + k * 0.12, 0.06]], C.gold, 0.9); item.add(l2); } }
        else { const blk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), kit.iron()); item.add(blk); const e = edges(new THREE.BoxGeometry(0.62, 0.62, 0.62), C.orange, 1); item.add(e); }
        cs.add(item); cs.userData.item = item;
        const halo = glow(1.6, t.exposed ? C.redSoft : t.key === 'proof' ? C.orangeSoft : [0.6, 0.42, 0.14], 0.8); halo.position.z = -0.3; cs.add(halo);
        const lb = label(`${t.label}\n{${t.exposed ? 'r' : t.key === 'proof' ? 'o' : 'g'}:${t.tag}}`, { size: 0.2, color: HEX.ink }); lb.position.set(0, -1.62, 0.5); cs.add(lb);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.0, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
        hit.userData.target = i; cs.add(hit); L.hits.push(hit);
        cs.position.set(-4.0 + i * 2.0, 1.25, 0);
        rack.add(cs); L.cases.push(cs);
      });
      rack.position.set(8.6, 0, 0.2); rack.scale.setScalar(0.9); rack.rotation.y = Math.atan2(L.camStart.x - 8.6, L.camStart.z - 0.2); g.add(rack);
      const rackRefl = mirrorClone(L, kit, rack); rackRefl.userData.noAnim = true; g.add(rackRefl);
      say(L, 'the target is never the device, it is the math inside ▾', [3.6, 5.6, 0.7], { size: 0.26, color: HEX.muted });
    },
    tick(L, t) {
      L.cases.forEach((cs, i) => {
        const sel = i === app.target;
        cs.userData.frame.material.color.setRGB(...(sel ? C.orange : C.gold));
        cs.userData.item.rotation.y = sel && !app.still ? t * 0.8 : 0;
      });
    },
  });

  /* ---------------- L2 · the wallet app ---------------- */
  def({
    id: 'app', short: 'L2', side: 'in', sky: 0.6,
    camStart: [5.5, 0.5, 21], center: [0, 0.5, 0], portal: [-1.2, 2.2, 0.5],
    build(L, kit) {
      const g = L.group;
      L.phones = TARGETS.map((t) => { const p = drawnPanel(7.2, 14.4, (cx, W, H) => drawPhone(cx, W, H, t), 1024); p.visible = false; g.add(p); return p; });
      const body = new THREE.Mesh(new THREE.BoxGeometry(7.7, 14.9, 0.3), kit.iron({ roughness: 0.78, metalness: 0.55 })); body.position.z = -0.2; g.add(body);
      const rim = edges(new THREE.BoxGeometry(7.7, 14.9, 0.3), C.gold, 0.55); rim.position.z = -0.2; g.add(rim);
      // The secure element: the private key lives here (or on paper) and never touches the network.
      const se = new THREE.Group();
      const chip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.3), kit.gold()); se.add(chip);
      for (let i = 0; i < 6; i++) { const pin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.06), kit.gold()); pin.position.set(-0.75 + i * 0.3, -0.95, 0); se.add(pin); }
      se.position.set(-7.4, 0.8, 1.2); g.add(se);
      say(L, 'The seed: your private keys come from it.\nIt stays here, or on paper, never on the network.\nLose the phone, keep the seed: the coins are fine.', [-7.4, 3.0, 1.2], { size: 0.32, color: HEX.ink });
      const pg = glow(1.3, C.orange); pg.position.set(-1.2, 2.2, 0.55); g.add(pg);
    },
    tick(L) { L.phones.forEach((p, i) => { p.visible = i === app.target; }); },
  });

  /* ---------------- L3 · the timechain ---------------- */
  def({
    id: 'chain', short: 'L3', side: 'in', sky: 0.54,
    camStart: [-13, 6.8, 16], center: [0, 2, 0], portal: [0, 2.05, 0.8], water: 80,
    build(L, kit) {
      const g = L.group;
      const iron = kit.iron(), ironM = kit.mirrorOf(iron);
      const blocks = CHAIN.blocks;
      const idx0 = blocks.length - 1;
      let prev = null;
      const boxes = [];
      blocks.forEach((b, j) => {
        const i = j - idx0;
        const p = V(i * 2.5, 2.05 + Math.sin(i * 0.5) * 0.25, -Math.pow(Math.abs(i), 1.35) * 0.9);
        const cur = i === 0;
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), iron); box.position.copy(p); g.add(box); boxes.push(p);
        const e = edges(new THREE.BoxGeometry(1.46, 1.46, 1.46), cur ? C.orange : C.gold, cur ? 1 : 0.55); e.position.copy(p); g.add(e);
        if (prev) g.add(line([prev, p], C.gold, 0.5));
        if (j % 2 === 0 || cur) {
          const hp = hashPlate(b.hash, cur ? 5.2 : 4.2); hp.position.copy(p).add(V(0, 1.15, 0.2)); faceToward(hp, L.camStart.x, L.camStart.z); g.add(hp);
          const hl = label(`block ${b.height.toLocaleString('en-US')}`, { size: cur ? 0.3 : 0.22, font: 'mono', color: cur ? HEX.orange : HEX.muted });
          hl.position.copy(p).add(V(0, 1.55, 0.2)); faceToward(hl, L.camStart.x, L.camStart.z); g.add(hl);
        }
        prev = p;
      });
      const mg = new THREE.Group(); mg.scale.y = -1;
      for (const p of boxes) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), ironM); m.position.copy(p); m.renderOrder = 1; mg.add(m); }
      mg.userData.noAnim = true; g.add(mg);
      const pg = glow(2.2, C.orange, 0.9); pg.position.set(0, 2.05, 0.8); g.add(pg);
      say(L, CHAIN.grover, [4.2, 0.9, 3.2], { size: 0.28, color: HEX.gold, maxW: 7 });
    },
  });

  /* ---------------- L4 · the UTXO set ---------------- */
  def({
    id: 'utxo', short: 'L4', side: 'in', sky: 0.46,
    camStart: [-13, 11.5, 19], center: [0, 0.8, -2], portal: [3.2, 0.55, 1.1], water: 70,
    build(L, kit) {
      const g = L.group;
      // Every coin a locked box. The share that shows its public key glows red.
      const cols = 40, rows = 24, sp = 0.52;
      const expShare = NUM.utxoShare;
      const all = [], hot = [];
      const box = new THREE.BoxGeometry(0.34, 0.26, 0.34);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = -10 + c * sp, z = -9.5 + r * sp;
        if (Math.abs(x - 3.2) < 0.4 && Math.abs(z - 1.1) < 0.4) continue;
        const m = mtx(x, 0.13, z);
        all.push(m);
        if (rand() < expShare) hot.push(mtx(x, 0.265, z));
      }
      g.add(instanced(L, box, kit.iron(), null, all));
      const keyGeo = new THREE.PlaneGeometry(0.16, 0.16); keyGeo.rotateX(-Math.PI / 2);
      g.add(instanced(L, keyGeo, kit.glow([1.25, 0.2, 0.15]), null, hot));
      // Your coin.
      const mine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), kit.gold()); mine.position.set(3.2, 0.3, 1.1); g.add(mine);
      L.mineGlow = glow(1.8, C.orange, 0.9); L.mineGlow.position.set(3.2, 0.75, 1.1); g.add(L.mineGlow);
      monument(L, kit, NUM.utxo.cast, -1, -12.5, 2.3);
      say(L, NUM.utxo.castNote, [-1, 0.25, -10.6], { size: 0.42, color: HEX.ink });
      say(L, NUM.utxo.breakdown, [5.5, 6.2, -11], { size: 0.36, align: 'left', panel: true });
      say(L, 'your coin', [3.2, 1.6, 1.1], { size: 0.3, color: HEX.orange, billboard: true });
    },
  });

  /* ---------------- L5 · the locking script ---------------- */
  def({
    id: 'script', short: 'L5', side: 'in', sky: 0.38,
    camStart: [8, 5.5, 15.5], center: [0, 0.8, 0], portal: [0, -2.6, 0.75],
    build(L, kit) {
      const g = L.group;
      L.scripts = TARGETS.map((t) => { const p = drawnPanel(12.5, 6.2, (cx, W, H) => drawScript(cx, W, H, t), 1100); p.position.set(0, 1.5, 0); p.visible = false; g.add(p); return p; });
      // The glyph under the script: a key you can see, or a hash wall.
      const gl = new THREE.Group();
      L.keyShown = new THREE.Group();
      L.keyShown.add(glow(2.0, C.red), ring(0.55, C.red, 0.9), ring(0.85, C.redSoft, 0.6));
      const kl = label('{r:PUBLIC KEY ON CHAIN}', { size: 0.24, font: 'ui', weight: 600, tracking: 0.12 }); kl.position.set(0, -1.15, 0.2); L.keyShown.add(kl);
      L.keyHidden = new THREE.Group();
      for (let i = 0; i < 6; i++) L.keyHidden.add(line([[-0.55, -0.45 + i * 0.18, 0.02], [0.55, -0.32 + i * 0.18, 0.02]], C.gold, 0.9));
      const hl = label('{g:ONLY A HASH}', { size: 0.24, font: 'ui', weight: 600, tracking: 0.12 }); hl.position.set(0, -1.15, 0.2); L.keyHidden.add(hl);
      L.proofShown = new THREE.Group();
      L.proofShown.add(glow(2.0, C.orange));
      const pl = label('{o:PROOF OF WORK}', { size: 0.24, font: 'ui', weight: 600, tracking: 0.12 }); pl.position.set(0, -1.15, 0.2); L.proofShown.add(pl);
      gl.add(L.keyShown, L.keyHidden, L.proofShown);
      gl.position.set(0, -2.6, 0.3); gl.userData.noAnim = true; g.add(gl);
      say(L, NUM.script.left, [-8.8, -1.6, 1.5], { size: 0.32, align: 'left', color: HEX.ink });
      say(L, NUM.script.right, [8.8, -1.6, 1.5], { size: 0.32, align: 'right', color: HEX.ink });
    },
    tick(L, t) {
      const tg = TARGETS[app.target];
      L.scripts.forEach((p, i) => { p.visible = i === app.target; });
      L.keyShown.visible = tg.exposed; L.keyHidden.visible = !tg.exposed && tg.key !== 'proof'; L.proofShown.visible = tg.key === 'proof';
      const pulse = app.attack.scriptPulse();
      L.keyShown.scale.setScalar(1 + pulse * 0.35 + (app.still ? 0 : Math.sin(t * 3) * 0.04));
      L.keyHidden.scale.setScalar(1 + pulse * 0.2);
    },
  });

  /* ---------------- L6 · secp256k1: here the water is the curve's axis ---------------- */
  def({
    id: 'curve', short: 'L6', side: 'in', sky: 0.28,
    camStart: [-12.5, 5.5, 17.5], center: [0, 3, 0], portal: [PUB.x, PUB.y, 0.55], water: 60,
    build(L, kit) {
      const g = L.group;
      // The upper branch in cast gold; the water reflects it into the lower branch, which is what the
      // curve is: symmetric about its axis.
      const pts = []; for (let x = -1.9129; x <= 4.0; x += 0.02) pts.push(cPt(x, 1));
      pts.unshift(V(-1.913 * CS, 0, 0));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.07, 10), kit.gold({ roughness: 0.22 }));
      g.add(tube);
      const tm = mirrorClone(L, kit, tube); tm.userData.noAnim = true; g.add(tm);
      g.add(line([[-6.5, 0.01, 0], [7.5, 0.01, 0]], C.gold, 0.35));
      // A cloud of points: the real curve is discrete.
      const cp = [];
      for (let i = 0; i < 700; i++) { const x = -1.9 + rand() * 5.8, p = cPt(x, 1); cp.push(p.x + (rand() - 0.5) * 0.1, p.y + (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.5); }
      const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3));
      g.add(new THREE.Points(pgeo, new THREE.PointsMaterial({ color: new THREE.Color().setRGB(1.2, 0.8, 0.35), size: 0.07, map: glowTex(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
      monument(L, kit, 'y² = x³ + 7', 9.5, -16, 1.7);
      say(L, NUM.curve.note, [0.8, 2.25, 1.0], { size: 0.24, color: HEX.muted, maxW: 4.2 });
      // G, the generator.
      const gm = new THREE.Group();
      gm.add(glow(1.2, C.goldHot), line([[-0.35, 0, 0], [0.35, 0, 0]], C.goldHot, 1), line([[0, -0.35, 0], [0, 0.35, 0]], C.goldHot, 1));
      const glb = label('G, the generator\n{m:everyone starts here}', { size: 0.24 }); glb.position.set(0, 0.95, 0); gm.add(glb);
      gm.position.copy(GEN); g.add(gm);
      // P: the public key. Exposed, a red target; hidden, a hash wall.
      L.exposedG = new THREE.Group();
      L.pCore = glow(1.4, C.red); L.exposedG.add(L.pCore);
      L.r1 = ring(0.55, C.red, 0.9); L.r2 = ring(0.95, C.redSoft, 0.6); L.exposedG.add(L.r1, L.r2);
      for (const [a, b] of [[[-1.5, 0, 0], [-0.35, 0, 0]], [[0.35, 0, 0], [1.5, 0, 0]], [[0, -1.5, 0], [0, -0.35, 0]], [[0, 0.35, 0], [0, 1.5, 0]]]) L.exposedG.add(line([a, b], C.redSoft, 0.8));
      const pl = label('P = k·G, your public key\n{r:visible on chain: a target}', { size: 0.26, align: 'left' }); pl.position.set(1.0, 1.35, 0.2); L.exposedG.add(pl);
      L.exposedG.position.copy(PUB); g.add(L.exposedG);
      L.hiddenG = new THREE.Group();
      const wall = new THREE.Group();
      for (let i = 0; i < 16; i++) wall.add(line([[-1.6, -1.9 + i * 0.25, 0.8], [1.6, -1.7 + i * 0.25, 0.8]], C.gold, 0.55));
      wall.add(edges(new THREE.BoxGeometry(3.4, 4.2, 0.02), C.gold, 0.7)); wall.children[wall.children.length - 1].position.z = 0.8;
      L.hiddenG.add(wall);
      const hw = label('{g:HASH WALL}\nonly RIPEMD160(SHA256(key)) is on chain\n{m:no point to aim at}', { size: 0.24 }); hw.position.set(0, 2.6, 0.9); L.hiddenG.add(hw);
      L.hiddenG.position.copy(PUB); g.add(L.hiddenG);
      // The attack: Shor's rings close in, then the walk back from P to G.
      L.shorFx = new THREE.Group(); L.shorFx.visible = false; L.shorFx.userData.noAnim = true;
      L.rings = [3.2, 2.5, 1.8, 1.2].map((r) => { const rr = ring(r, C.orange, 0); rr.material.userData.noFade = true; L.shorFx.add(rr); return rr; });
      const hop = []; for (let x = 2.2; x >= -1.2; x -= 0.05) hop.push(cPt(x, 1).sub(PUB).add(V(0, 0, 0.18)));
      L.hopLine = line(hop, C.orange, 0); L.hopLine.material.userData.noFade = true; L.hopN = hop.length; L.shorFx.add(L.hopLine);
      L.spark = glow(1.3, [5, 3, 1.2]); L.spark.material.userData.noFade = true; L.shorFx.add(L.spark);
      L.shorFx.position.copy(PUB); g.add(L.shorFx);
      // A padlock that opens when the key falls.
      L.lock = new THREE.Group();
      const lbody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.35), kit.gold()); L.lock.add(lbody);
      L.shackle = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 10, 28, Math.PI), kit.gold()); L.shackle.position.y = 0.35; L.lock.add(L.shackle);
      L.lock.position.set(6.2, 5.6, 0); g.add(L.lock);
      L.lockLabel = label('your coin: locked', { size: 0.22, color: HEX.muted }); L.lockLabel.position.set(6.2, 4.85, 0.2); g.add(L.lockLabel);
      L.lockOpen = label('{r:unlocked, on paper}', { size: 0.22 }); L.lockOpen.position.set(6.2, 4.85, 0.2); L.lockOpen.visible = false; g.add(L.lockOpen);
    },
    tick(L, t, dt) {
      const tg = TARGETS[app.target];
      const ex = tg.exposed;
      L.exposedG.visible = ex; L.hiddenG.visible = !ex;
      if (ex && !app.still) { L.pCore.scale.setScalar(1.4 * (1 + Math.sin(t * 4) * 0.15)); L.r1.rotation.z = t * 0.7; L.r2.rotation.z = -t * 0.45; }
      app.attack.curveTick(L, t, dt);
    },
  });

  /* ---------------- L7 · the trapdoor ---------------- */
  def({
    id: 'trapdoor', short: 'L7', side: 'in', sky: 0.18,
    camStart: [-13.5, 7.5, 16.5], center: [0, 2.8, 0], portal: [0.4, 0.4, 2.6], water: 60,
    build(L, kit) {
      const g = L.group;
      // Forward: an easy ramp.
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 2.2), kit.gold({ roughness: 0.35 }));
      ramp.position.set(-6.2, 1.3, 0); ramp.rotation.z = 0.36; g.add(ramp);
      g.add(mirrorClone(L, kit, ramp)); g.children[g.children.length - 1].userData.noAnim = true;
      say(L, NUM.trap.forward, [-7.2, 4.6, 0.6], { size: 0.36, color: HEX.ink, maxW: 8 });
      // Backward: a cliff.
      const cliff = new THREE.Mesh(new THREE.BoxGeometry(5.5, 9, 2.4), kit.iron());
      cliff.position.set(5, 4.5, -1.2); g.add(cliff);
      const cm = mirrorClone(L, kit, cliff); cm.userData.noAnim = true; g.add(cm);
      monument(L, kit, '2¹²⁸', 5, 1.6, 1.9);
      say(L, NUM.trap.back, [5, 9.6, -0.3], { size: 0.36, color: HEX.ink });
      // Shor's staircase, drawn up the cliff face.
      const st = [];
      let x = 1.8, y = 0.05;
      for (let i = 0; i < 12; i++) { st.push(V(x, y, 0.2), V(x, y + 0.72, 0.2), V(x, y + 0.72, 0.2), V(x + 0.28, y + 0.72, 0.2)); x += 0.28; y += 0.72; }
      L.stairs = segs(st, C.orange, 0.8); g.add(L.stairs);
      say(L, NUM.trap.shor, [0.4, 7.2, 1.6], { size: 0.3, color: HEX.orange, maxW: 6.5 });
      // Climbers who never get far.
      L.climbers = [0, 1, 2].map((i) => { const c = glow(0.5, C.goldHot); c.userData.off = i * 0.37; g.add(c); return c; });
      const kg = glow(1.4, C.orange); kg.position.set(0.4, 0.4, 2.6); g.add(kg);
      say(L, 'k, the number itself  ▾', [0.4, 1.3, 2.6], { size: 0.26, color: HEX.orange, billboard: true });
    },
    tick(L, t) {
      L.climbers.forEach((c, i) => {
        const f = app.still ? 0.3 : ((t * 0.3) + c.userData.off) % 1;
        const y = f < 0.75 ? (f / 0.75) * 1.8 : 1.8 * (1 - (f - 0.75) / 0.25);
        c.position.set(2.4 + i * 0.25, 0.3 + y, 0.4);
      });
    },
  });

  /* ---------------- L8 · the private key: the bottom ---------------- */
  def({
    id: 'key', short: 'L8', side: 'in', sky: 0.06,
    camStart: [9, 4.8, 17], center: [0, 4.9, 0], portal: [3.6, 4.8, 6.8], water: 60,
    build(L, kit) {
      const g = L.group;
      const mk = (ch) => {
        const cv = document.createElement('canvas'); cv.width = cv.height = 96;
        const c = cv.getContext('2d'); c.font = `500 72px ${F.mono}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText(ch, 48, 52);
        const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return tx;
      };
      const bits = []; for (let i = 0; i < 256; i++) bits.push(rand() < 0.5 ? 0 : 1);
      const geo = new THREE.PlaneGeometry(0.42, 0.42);
      const grid = new THREE.Group();
      for (const bit of [0, 1]) {
        const ids = bits.map((b, i) => (b === bit ? i : -1)).filter((i) => i >= 0);
        const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: mk(String(bit)), transparent: true, depthWrite: false, color: new THREE.Color().setRGB(...(bit ? [2.2, 0.8, 0.1] : [0.9, 0.6, 0.25])) }), ids.length);
        ids.forEach((bi, i) => im.setMatrixAt(i, mtx((bi % 16 - 7.5) * 0.55, (7.5 - Math.floor(bi / 16)) * 0.55 + 5.4, (rand() - 0.5) * 0.2)));
        grid.add(im);
      }
      g.add(grid); L.grid = grid;
      monument(L, kit, '2²⁵⁶', 0.4, 2.6, 1.5, { rotY: Math.atan2(9, 17 - 2.6) * 0.7 });
      say(L, NUM.key.sub, [0, 10.2, 0], { size: 0.3, color: HEX.muted, maxW: 14 });
      // Fenced off: an interpretation, not a security claim.
      const fence = new THREE.Group();
      const FW = 7.5, FD = 3;
      for (const [x, z] of [[-FW / 2, -FD / 2], [FW / 2, -FD / 2], [FW / 2, FD / 2], [-FW / 2, FD / 2]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), kit.gold()); post.position.set(x, 0.4, z); fence.add(post); }
      for (const y of [0.36, 0.72]) fence.add(line([[-FW / 2, y, -FD / 2], [FW / 2, y, -FD / 2], [FW / 2, y, FD / 2], [-FW / 2, y, FD / 2], [-FW / 2, y, -FD / 2]], C.gold, 0.6));
      const tree = new THREE.Group();
      const branch = (p, dir, len, d) => { if (!d) return; const q = p.clone().addScaledVector(dir, len); tree.add(line([p, q], C.gold, 0.35)); branch(q, dir.clone().applyAxisAngle(V(0, 0, 1), 0.5), len * 0.62, d - 1); branch(q, dir.clone().applyAxisAngle(V(0, 0, 1), -0.5), len * 0.62, d - 1); };
      branch(V(0, 0, 0), V(0, 1, 0), 0.9, 5);
      tree.position.set(0, 0, -0.6); fence.add(tree);
      const eg = label(NUM.key.egg, { size: 0.22, color: HEX.muted, maxW: 5.2 }); eg.position.set(0, 2.9, 0); fence.add(eg);
      fence.position.set(8.5, 0, -2.5); fence.rotation.y = -0.35; g.add(fence);
      say(L, 'the bottom: zoom out ▴', [0, 0.5, 6.5], { size: 0.24, color: HEX.muted });
    },
    tick(L, t) { if (L.grid && !app.still) L.grid.position.y = Math.sin(t * 0.6) * 0.06; },
  });
}

export function pickTarget(levels, raycaster) {
  const L1 = levels.find((l) => l.id === 'person');
  if (!L1 || !L1.group.visible || !L1.hits) return -1;
  const hit = raycaster.intersectObjects(L1.hits, false)[0];
  return hit ? hit.object.userData.target : -1;
}
