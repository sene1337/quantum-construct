// THE CONSTRUCT: boot, the zoom loop, embed mode.
import * as THREE from 'three';
import { createWorld } from './world.js';
import { createEngine, ZMIN, ZMAX, clamp } from './engine.js';
import { loadGlyphs } from './cast.js';
import { setLabelResolution } from './labels.js';
import { defineLevels, pickTarget } from './levels.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { createSound } from './sound.js';
import { createAttack } from './attack.js';
import { TARGETS } from './facts.js';

const params = new URLSearchParams(location.search);
const EMBED = params.get('embed') === '1';
const root = document.documentElement;
const mqStill = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const still = !!(mqStill && mqStill.matches) || params.has('still');
const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const small = Math.min(innerWidth, innerHeight) < 600;
const $ = (id) => document.getElementById(id);

async function boot() {
  const canvas = $('c');
  // Text in the scene is drawn with the page's fonts, so they must be ready first.
  try {
    await Promise.race([
      Promise.all(['400 20px Figtree', '500 20px Figtree', '600 20px Figtree', '600 20px "Cormorant Garamond"', '500 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) { /* fall back to system fonts */ }
  const glyphs = loadGlyphs('data/glyphs.json');
  setLabelResolution(small ? 34 : 44);

  const dprCap = 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const world = createWorld(canvas, { dpr, msaa: coarse ? 2 : 4, still });
  if (!world) { root.classList.add('no-webgl'); return; }
  await glyphs;

  const engine = createEngine(world, { still });
  let Z = 3.45, targetZ = 4.02, target = 0;
  if (still) Z = targetZ;
  let captured = !EMBED;
  let introGone = EMBED;

  const sound = createSound(!EMBED);
  const app = {
    still,
    get target() { return target; },
    getZ: () => Z,
    flyTo(z, cut) { targetZ = clamp(z, ZMIN, ZMAX); if (cut) { Z = targetZ; engine.resetLook(); } },
    hud: null, sound, attack: null,
  };
  defineLevels(engine, app);
  const levels = engine.levels;

  const hud = createHud({
    levels, targets: TARGETS,
    onLevel: (i) => { attack.cancel(); dismissIntro(); app.flyTo(i + (levels[i].side === 'out' ? 0.06 : 0.15), still); },
    onTarget: (i) => selectTarget(i, true),
    onRun: () => { dismissIntro(); if (EMBED && !captured) enter(); sound.poke(); attack.run(); },
    onZoomStep: (d) => { dismissIntro(); attack.cancel(); app.flyTo(targetZ + d * 0.5, false); sound.poke(); },
    onSources: () => {},
    onSound: () => { sound.set(!sound.on); hud.setSound(sound.on); },
    onLeave: () => leave(),
    onEnter: () => enter(),
  });
  app.hud = hud;
  hud.setSound(sound.on);
  const attack = createAttack(app);
  app.attack = attack;

  function selectTarget(i, fromUser) {
    target = i;
    hud.setTarget(i);
    attack.reset();
    hud.hideVerdict();
    if (fromUser) sound.select();
  }
  selectTarget(0, false);

  // Embed mode: the page keeps its scroll until the visitor enters.
  function enter() {
    captured = true;
    root.classList.add('entered');
    canvas.focus({ preventScroll: true });
    sound.poke();
  }
  function leave() {
    captured = false;
    root.classList.remove('entered');
    attack.cancel();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  canvas.tabIndex = -1;

  function dismissIntro() {
    if (introGone) return;
    introGone = true;
    $('intro').classList.add('gone');
    setTimeout(() => { $('hint').classList.add('gone'); }, 9000);
  }
  if (!EMBED) {
    $('introGo').onclick = () => { dismissIntro(); sound.poke(); };
    setTimeout(dismissIntro, 9000);
  } else {
    $('intro').remove();
  }

  const raycaster = new THREE.Raycaster();
  createInput({
    canvas,
    isCaptured: () => captured,
    onActivity: () => { dismissIntro(); sound.poke(); },
    onZoom: (d) => { attack.cancel(); targetZ = clamp(targetZ + d, ZMIN, ZMAX); if (still) Z = targetZ; },
    onOrbit: (dx, dy) => { if (!captured) return; engine.orb.x = clamp(engine.orb.x - dx * 0.0042, -1.25, 1.25); engine.orb.y = clamp(engine.orb.y - dy * 0.0034, -0.35, 0.6); },
    onTap: (x, y) => {
      const r = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), world.camera);
      const i = pickTarget(levels, raycaster);
      if (i >= 0) selectTarget(i, true);
    },
    onKey: (e) => {
      if (e.key === 'Escape') {
        if (hud.sourcesOpen) { hud.closeSources(); return; }
        if (EMBED && captured) { leave(); return; }
        hud.hideVerdict();
        return;
      }
      if (!captured || hud.sourcesOpen) return;
      const zoom = (d) => { e.preventDefault(); attack.cancel(); dismissIntro(); app.flyTo(targetZ + d, still); };
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === '+' || e.key === '=') zoom(0.5);
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === '-' || e.key === '_') zoom(-0.5);
      else if (e.key === 'ArrowLeft') { e.preventDefault(); engine.orb.x = clamp(engine.orb.x + 0.3, -1.25, 1.25); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); engine.orb.x = clamp(engine.orb.x - 0.3, -1.25, 1.25); }
      else if (e.key >= '1' && e.key <= String(TARGETS.length)) selectTarget(+e.key - 1, true);
    },
  });

  // Size: the frame or the window. Portrait screens get a wider lens.
  function resize(force) {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    const aspect = w / h;
    world.camera.fov = aspect < 1 ? 50 + (1 - aspect) * 30 : 50;
    world.resize(w, h, dpr);
    if (force) render(0);
  }
  window.addEventListener('resize', () => resize(!running));

  // The sky follows the zoom: night at the private key, sunrise at the outermost level.
  const skyAt = (z) => {
    const k = clamp(Math.floor(z), 0, levels.length - 1), f = clamp(z - k, 0, 1);
    const a = levels[k].sky, b = levels[Math.min(k + 1, levels.length - 1)].sky;
    return a + (b - a) * f;
  };

  // The loop. It runs only while the canvas is on screen and the tab is visible.
  let running = false, raf = 0, last = 0, time = 0, prevZ = Z, prevK = -1;
  let frames = 0, slow = 0, fpsT = 0, fpsN = 0, fps = 0;
  function render(dt) {
    const zk = still ? 14 : 3.2;
    Z += (targetZ - Z) * (1 - Math.exp(-dt * zk));
    if (Math.abs(targetZ - Z) < 1e-4) Z = targetZ;
    const zv = dt > 0 ? (Z - prevZ) / dt : 0;
    prevZ = Z;
    sound.zoom(zv);
    attack.update(time, dt);
    if (!captured && !still && EMBED) engine.orb.x = Math.sin(time * 0.07) * 0.25;
    const { k } = engine.update(Z, time, dt, zv);
    if (prevK !== -1 && k !== prevK) sound.level(k);
    prevK = k;
    world.setSky(skyAt(Z));
    world.tick(time, dt, zv);
    hud.setLevel(clamp(Math.round(Z - 0.35), 0, levels.length - 1));
    world.render();
  }
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    time += dt;
    render(dt);
    // Frame-rate watch: if the device cannot keep up, draw fewer pixels.
    frames++; fpsN++; fpsT += dt;
    if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    if (frames > 90 && dt > 1 / 40) slow++; else if (slow > 0) slow -= 0.25;
    if (slow > 45 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); slow = 0; resize(false); }
  }
  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  let onScreen = true;
  const sync = () => (onScreen && !document.hidden ? start() : stop());
  new IntersectionObserver((es) => { onScreen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0 }).observe(canvas);
  document.addEventListener('visibilitychange', sync);

  // Compile the shaders the way they will be used: the metal draws into the bloom's HDR target (no tone
  // mapping in the shader), the text straight to the screen. Compiling them ahead keeps zooming smooth.
  async function compileAll() {
    const R = world.renderer;
    try {
      R.setRenderTarget(world.composer.readBuffer);
      const a = R.compileAsync(world.scene, world.camera);
      R.setRenderTarget(null);
      const b = R.compileAsync(world.scene, world.camera);
      await Promise.all([a, b]);
    } catch (e) { R.setRenderTarget(null); /* compile on first draw instead */ }
  }

  resize(false);
  // Build the levels around the start, compile their shaders, then show the first frame.
  engine.update(Z, 0, 0, 0);
  world.setSky(skyAt(Z));
  await compileAll();
  render(0);
  root.classList.add('ready');
  window.__firstFrame = performance.now();
  sync();

  // Build the remaining levels while idle, then compile their shaders and upload their text, so zooming never
  // waits on any of it.
  const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 60));
  const queue = levels.slice();
  const uploads = [];
  const upload = (dl) => {
    while (uploads.length && dl.timeRemaining() > 3) world.renderer.initTexture(uploads.shift());
    if (uploads.length) idle(upload);
  };
  const buildNext = (dl) => {
    while (queue.length && dl.timeRemaining() > 4) engine.build(queue.shift());
    if (queue.length) { idle(buildNext); return; }
    compileAll().then(() => {
      const seen = new Set();
      for (const L of levels) L.group.traverse((o) => { const t = o.material && o.material.map; if (t && !seen.has(t)) { seen.add(t); uploads.push(t); } });
      idle(upload);
      window.__warm = true;
    });
  };
  idle(buildNext);

  // A small hook for tests and for the host page.
  window.__construct = {
    get z() { return Z; }, set z(v) { Z = targetZ = clamp(v, ZMIN, ZMAX); engine.resetLook(); },
    set tz(v) { targetZ = clamp(v, ZMIN, ZMAX); },
    get fps() { return fps; }, get dpr() { return dpr; }, get frames() { return frames; }, get running() { return running; },
    select: (i) => selectTarget(i, false), run: () => attack.run(), enter, leave,
    get attacking() { return attack.running; }, levels, world,
  };
}

boot().catch((e) => {
  console.error(e);
  root.classList.add('no-webgl');
});
