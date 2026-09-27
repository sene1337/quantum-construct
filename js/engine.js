// The zoom axis. Each level is a scene of its own; the next level in sits inside the current one's portal at
// 1/16 scale, the next level out holds the current one in its portal at 16x. Z runs from 0 (outermost) to 11.7
// (the private key); the integer part is the level you are in, the fraction how far you have flown toward its
// portal. (Kept from the first version of the construct, which this refresh builds on.)
import * as THREE from 'three';
import { makeFx, materialKit } from './world.js';

export const BASE = 16, B2 = BASE * BASE;
export const ZMIN = 0.02, ZMAX = 11.72;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = (t) => t * t * (3 - 2 * t);
let seed = 1337;
export const rand = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// Wet ground: dark near the viewer, a mirror toward the horizon, soft at its edge so the far water takes over.
function makeWater(radius, opU, sun) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x080605, roughness: 0.55, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 0.35 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uOp = opU;
    sh.uniforms.uR = { value: radius };
    sh.uniforms.uSunV = sun.viewDir;
    sh.uniforms.uSunK = sun.strength;
    sh.uniforms.uSunC = sun.color;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWr;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWr = length(position.xy);\nvWp = position.xy;');
    sh.vertexShader = sh.vertexShader.replace('varying float vWr;', 'varying float vWr;\nvarying vec2 vWp;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWr;\nvarying vec2 vWp;\nuniform float uOp, uR, uSunK;\nuniform vec3 uSunV, uSunC;')
      .replace('#include <opaque_fragment>', `
        float fres = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 3.0);
        float edgeFade = (1.0 - smoothstep(uR * 0.45, uR, vWr)) * uOp;
        diffuseColor.a = mix(0.93, 0.4, fres) * edgeFade;
        // The sun's path on the water: a mirror glint, broken up by a gentle ripple.
        vec2 rp = vWp * 2.3;
        vec3 rn = normalize(normal + vec3(sin(rp.x * 2.1 + sin(rp.y * 1.7)) + sin(rp.y * 3.3 - rp.x * 0.9), 0.0, cos(rp.y * 2.9 + sin(rp.x * 1.3)) + cos(rp.x * 3.7 + rp.y * 1.1)) * 0.011);
        vec3 rv = reflect(-normalize(vViewPosition), rn);
        float glint = pow(max(dot(rv, uSunV), 0.0), 200.0) * uSunK;
        outgoingLight += uSunC * glint * 1.0;
        diffuseColor.a = max(diffuseColor.a, min(1.0, glint * 1.2) * edgeFade);
        #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'cx-water';
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 72), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  m.userData.noAnim = true;
  mat.userData.noFade = true;
  return m;
}

export function createEngine(world, { still }) {
  const { camera } = world;
  const levels = [];

  function defLevel(def) {
    const fx = makeFx();
    const L = {
      ...def, idx: levels.length, group: new THREE.Group(), fx, kit: materialKit(fx), fadeMats: [], labelMats: [], pointMats: [], anim: [], casts: [],
      lastOp: -1, lastLabelOp: -1, curScale: 1, snapped: false, built: false, opU: { value: 1 },
    };
    L.camStart = V(...def.camStart); L.portal = V(...def.portal); L.center = V(...(def.center || [0, 0.6, 0]));
    L.group.visible = false;
    levels.push(L);
    world.scene.add(L.group);
    return L;
  }

  function finish(L) {
    L.group.traverse((o) => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) {
        if (m.userData.reg) continue;
        m.userData.reg = true;
        if (m.userData.hooked || m.userData.noFade) continue;
        m.transparent = true;
        m.userData.op0 = m.opacity;
        (o.userData.isLabel ? L.labelMats : L.fadeMats).push(m);
        if (o.isPoints) { m.userData.size0 = m.size; L.pointMats.push(m); }
      }
    });
    for (const c of L.group.children) {
      if (c.userData.noAnim) continue;
      const dir = V(rand() * 2 - 1, (rand() * 2 - 1) * 0.6, rand() * 2 - 1).normalize();
      L.anim.push({ o: c, p0: c.position.clone(), s0: c.scale.clone(), off: dir.multiplyScalar(6 + rand() * 9), d: rand() * 0.5 });
    }
  }

  function build(L) {
    if (L.built) return;
    if (L.water) { L.waterMesh = makeWater(L.water, L.opU, world.sun); L.group.add(L.waterMesh); }
    L.build(L, L.kit);
    finish(L);
    L.built = true;
  }

  function applyAssembly(L, p) {
    if (p >= 1 || still) {
      if (!L.snapped) { for (const a of L.anim) { a.o.position.copy(a.p0); a.o.scale.copy(a.s0); } L.snapped = true; }
      return;
    }
    L.snapped = false;
    for (const a of L.anim) {
      const t = clamp((p * 1.5 - a.d) / 0.5, 0, 1), e = 1 - Math.pow(1 - t, 3);
      a.o.position.copy(a.p0).addScaledVector(a.off, 1 - e);
      a.o.scale.copy(a.s0).multiplyScalar(0.6 + 0.4 * e);
    }
  }

  // op: the level's presence. labelOp and metalOp: the same, except for the level you have just flown out
  // of, whose huge text and metal clear away quickly so they never clutter the level you are in.
  function setOpacity(L, op, labelOp, metalOp) {
    if (Math.abs(labelOp - L.lastLabelOp) >= 0.003) {
      L.lastLabelOp = labelOp;
      for (const m of L.labelMats) m.opacity = m.userData.op0 * labelOp;
    }
    if (Math.abs(op - L.lastOp) < 0.003 && Math.abs(metalOp - L.fx.reveal.value) < 0.003) return;
    L.lastOp = op;
    L.fx.reveal.value = metalOp >= 0.999 ? 1 : metalOp;
    L.opU.value = op;
    for (const m of L.fadeMats) m.opacity = m.userData.op0 * op;
    const r = ease(clamp(metalOp * 1.25 - 0.15, 0, 1));
    for (const c of L.casts) c.userData.setRise(still ? 1 : r);
  }

  function camPose(k, t) {
    const L = levels[k], child = levels[k + 1];
    const A = L.camStart, P = L.portal;
    const Bv = child ? P.clone().addScaledVector(child.camStart, 1 / BASE) : P.clone().add(A.clone().sub(P).multiplyScalar(0.055));
    const a = A.clone().sub(P), b = Bv.clone().sub(P);
    const la = a.length(), lb = Math.max(b.length(), 1e-4);
    const len = la * Math.pow(lb / la, t);
    const dir = a.normalize().lerp(b.normalize(), ease(t)).normalize();
    const pos = P.clone().addScaledVector(dir, len);
    const look = L.center.clone().lerp(P, ease(clamp(t * 1.2 + 0.06, 0, 1)));
    return { pos, look, len };
  }

  let smoothLook = null, lastK = -1;
  const orb = { x: 0, y: 0, sx: 0, sy: 0 };
  const V0 = V();
  const tmp = V();

  function place(i, s, p) {
    const L = levels[i];
    if (!L) return;
    build(L);
    L.curScale = s;
    L.group.visible = true;
    L.group.scale.setScalar(s);
    L.group.position.copy(p);
    const fx = L.fx;
    fx.edge.value = s > 1.5 ? 0 : 1; // no burning edges on the huge level you are leaving behind
    fx.floorY.value = p.y;
    fx.fadeLen.value = 2.4 * s;
    fx.clipUp.constant = -p.y;
    fx.clipDown.constant = p.y;
  }

  /** Lay out the levels around Z, fade them, point the camera. Returns the current level index and fraction. */
  function update(Z, t, dt, zv) {
    const k = clamp(Math.floor(Z), 0, levels.length - 1), f = clamp(Z - k, 0, 1);
    if (lastK !== -1 && k !== lastK && smoothLook) {
      if (k === lastK + 1) smoothLook.sub(levels[lastK].portal).multiplyScalar(BASE);
      else if (k === lastK - 1) smoothLook.multiplyScalar(1 / BASE).add(levels[k].portal);
      else smoothLook = null;
    }
    lastK = k;
    for (const L of levels) L.group.visible = false;
    place(k, 1, V0);
    const Pk = levels[k].portal;
    if (levels[k + 1]) {
      place(k + 1, 1 / BASE, Pk);
      if (levels[k + 2]) place(k + 2, 1 / B2, Pk.clone().addScaledVector(levels[k + 1].portal, 1 / BASE));
    }
    if (levels[k - 1]) {
      place(k - 1, BASE, levels[k - 1].portal.clone().multiplyScalar(-BASE));
      if (levels[k - 2]) place(k - 2, B2, levels[k - 2].portal.clone().multiplyScalar(-B2).addScaledVector(levels[k - 1].portal, -BASE));
    }
    for (let i = Math.max(0, k - 2); i <= Math.min(levels.length - 1, k + 2); i++) {
      const L = levels[i];
      const p = L.side === 'in' ? clamp((Z - (i - 0.78)) / 0.68, 0, 1) : clamp((i + 0.78 - Z) / 0.68, 0, 1);
      const behind = clamp(1 - (Z - i - 0.96) * 2.8, 0, 1);
      const op = ease(p) * behind;
      if (op < 0.012) { L.group.visible = false; continue; }
      applyAssembly(L, p);
      const parent = L.curScale > 1.5;
      const labelOp = parent ? op * clamp(1 - (Z - i - 1) / 0.1, 0, 1) : op;
      const metalOp = parent ? op * clamp(1 - (Z - i - 1) / 0.15, 0, 1) : op;
      setOpacity(L, parent ? labelOp : op, labelOp, metalOp);
      for (const m of L.pointMats) m.size = m.userData.size0 * Math.min(L.curScale, 3);
      if (L.tick) L.tick(L, t, dt, op);
    }
    const { pos, look, len } = camPose(k, f);
    if (!smoothLook) smoothLook = look.clone();
    smoothLook.lerp(look, still ? 1 : 1 - Math.exp(-dt * 5));
    orb.sx += (orb.x - orb.sx) * (1 - Math.exp(-dt * 8));
    orb.sy += (orb.y - orb.sy) * (1 - Math.exp(-dt * 8));
    const off = tmp.copy(pos).sub(smoothLook);
    off.applyAxisAngle(camera.up, orb.sx);
    const raxis = camera.up.clone().cross(off).normalize();
    if (raxis.lengthSq() > 0.5) off.applyAxisAngle(raxis, orb.sy);
    camera.position.copy(smoothLook).add(off);
    camera.lookAt(smoothLook);
    camera.near = Math.max(1e-4, len * 0.004);
    camera.far = len * 4000;
    camera.updateProjectionMatrix();
    const dec = Math.exp(-dt * (0.1 + Math.abs(zv) * 1.2));
    orb.x *= dec; orb.y *= dec;
    return { k, f, len };
  }

  return {
    levels, defLevel, update, build, orb,
    resetLook() { smoothLook = null; },
    lookTarget: () => smoothLook,
  };
}
