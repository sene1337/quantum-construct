// Headless checks for the construct: console errors, bytes loaded before the first frame, frame rate,
// and screenshots, at 1440x900 and 390x844, full page and embedded. Needs Node 22+ and Google Chrome.
//   node tools/check.mjs [--out docs/screenshots] [--chrome "/path/to/Chrome"] [--only name,name]
// It serves the repository itself with gzip, as GitHub Pages does, on a free local port.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('--out', path.join(os.tmpdir(), 'construct-check')));
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);
const CHROME = arg('--chrome', ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => fs.existsSync(p)));
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- static server with gzip
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(file), body = fs.readFileSync(file);
  const type = TYPES[ext] || 'application/octet-stream';
  const gz = /gzip/.test(req.headers['accept-encoding'] || '') && !/woff2|png|jpg/.test(ext);
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', ...(gz ? { 'content-encoding': 'gzip' } : {}) });
  res.end(gz ? zlib.gzipSync(body, { level: 6 }) : body);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- Chrome over the DevTools protocol
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'construct-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=metal', '--autoplay-policy=user-gesture-required', '--mute-audio', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
  setTimeout(() => rej(new Error('Chrome did not start')), 15000);
});
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map(), listeners = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
  else for (const l of listeners) l(m);
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(w, h, { mobile = false, dsf = 2, still = false } = {}) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  const log = [];
  listeners.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') log.push({ level: 'error', text: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text });
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning' || m.params.type === 'assert')) log.push({ level: m.params.type, text: m.params.args.map((a) => a.value ?? a.description).join(' ') });
    if (m.method === 'Log.entryAdded' && (m.params.entry.level === 'error' || m.params.entry.level === 'warning')) log.push({ level: m.params.entry.level, text: m.params.entry.text + (m.params.entry.url ? ' ' + m.params.entry.url : '') });
  });
  await S('Page.enable'); await S('Runtime.enable'); await S('Log.enable'); await S('Network.enable');
  await S('Network.setCacheDisabled', { cacheDisabled: true });
  await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile });
  if (mobile) await S('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  if (still) await S('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const ev = async (expr) => { const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval failed'); return r.result.value; };
  const shot = async (name) => { const { data } = await S('Page.captureScreenshot', { format: 'jpeg', quality: 82 }); fs.writeFileSync(path.join(OUT, name + '.jpg'), Buffer.from(data, 'base64')); return name + '.jpg'; };
  return { S, ev, shot, log, close: () => send('Target.closeTarget', { targetId }) };
}
async function load(pg, url, frameExpr = 'window.__firstFrame') {
  await pg.S('Page.navigate', { url });
  for (let i = 0; i < 200; i++) { await sleep(100); try { if (await pg.ev(`!!(${frameExpr})`)) return true; } catch (e) { /* not ready */ } }
  throw new Error('no first frame: ' + url);
}
// Bytes before the first frame, from the page's own resource timing.
const BYTES = `(() => {
  const ff = window.__firstFrame, nav = performance.getEntriesByType('navigation')[0];
  const rs = performance.getEntriesByType('resource').filter((r) => r.responseEnd <= ff);
  const all = [nav, ...rs];
  const sum = (k) => all.reduce((a, r) => a + (r[k] || 0), 0);
  return { firstFrameMs: Math.round(ff), requests: all.length, transfer: sum('transferSize'), encoded: sum('encodedBodySize'), decoded: sum('decodedBodySize'),
    later: performance.getEntriesByType('resource').filter((r) => r.responseEnd > ff).map((r) => r.name.split('/').pop()) };
})()`;
// Frames per second while flying through the zoom axis (the heaviest case: levels building and fading).
const FPS = (from, to, ms) => `(async () => {
  const c = window.__construct; c.z = ${from}; await new Promise((r) => setTimeout(r, 400));
  c.tz = ${to};
  let n = 0, worst = 0, last = performance.now(); const t0 = last;
  await new Promise((res) => { const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ${ms}) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  const secs = (performance.now() - t0) / 1000;
  return { fps: +(n / secs).toFixed(1), worstFrameMs: +worst.toFixed(1), dpr: c.dpr, gpu: (() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })() };
})()`;

const report = { base: BASE, chrome: CHROME, runs: [] };
const want = (n) => !ONLY.length || ONLY.includes(n);

async function fullPage(name, w, h, opts) {
  const pg = await newPage(w, h, opts);
  const r = { name, viewport: `${w}x${h}`, shots: [] };
  await load(pg, BASE + '/');
  r.bytes = await pg.ev(BYTES);
  await sleep(1200);
  r.shots.push(await pg.shot(`${name}-start`));
  await pg.ev(`document.getElementById('introGo')?.click()`);
  await sleep(900);
  // Zoomed in: the curve, the trapdoor, the key. Zoomed out: the machines and the dawn.
  for (const [z, tag] of [[4.05, 'L1-person'], [6.2, 'L3-timechain'], [7.25, 'L4-utxo'], [9.35, 'L6-curve'], [11.55, 'L8-key'], [3.06, 'O1-today'], [2.06, 'O2-machineA'], [1.06, 'O3-machineB'], [0, 'O4-dawn']]) {
    await pg.ev(`window.__construct.z = ${z}`);
    await sleep(1600);
    r.shots.push(await pg.shot(`${name}-${tag}`));
  }
  // Attacks with verdicts.
  for (const [i, tag] of [[0, 'attack-satoshi'], [3, 'attack-fresh'], [4, 'attack-proof']]) {
    await pg.ev(`(document.getElementById('verdictClose').click(), window.__construct.select(${i}), window.__construct.z = 4.05)`);
    await sleep(600);
    await pg.ev(`window.__construct.run()`);
    for (let k = 0; k < 120 && (await pg.ev('window.__construct.attacking')); k++) await sleep(250);
    await sleep(900);
    r.shots.push(await pg.shot(`${name}-${tag}`));
  }
  r.fps = await pg.ev(FPS(3.5, 10.5, 6000));
  r.fpsIdle = await pg.ev(`(async () => { window.__construct.z = 2.2; const t0 = performance.now(); let n = 0; await new Promise((res) => { const f = (t) => { n++; if (t - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return +(n / ((performance.now() - t0) / 1000)).toFixed(1); })()`);
  r.console = pg.log.slice();
  await pg.close();
  report.runs.push(r);
}

async function embedded(name, w, h, frameH, opts) {
  const pg = await newPage(w, h, opts);
  const r = { name, viewport: `${w}x${h}`, shots: [] };
  await load(pg, `${BASE}/tools/embed-demo.html`, `document.readyState === 'complete'`);
  await pg.ev(`document.querySelector('iframe').scrollIntoView({ block: 'center' })`);
  for (let i = 0; i < 200 && !(await pg.ev(`!!(document.querySelector('iframe').contentWindow && document.querySelector('iframe').contentWindow.__firstFrame)`)); i++) await sleep(100);
  await sleep(1500);
  r.frameSize = await pg.ev(`(() => { const b = document.querySelector('iframe').getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); })()`);
  r.bytes = await pg.ev(`(() => { const w = document.querySelector('iframe').contentWindow; return w.eval(${JSON.stringify(BYTES)}); })()`);
  r.shots.push(await pg.shot(`${name}-before-enter`));
  // Before entering, the wheel over the frame scrolls the page, not the construct.
  const box = await pg.ev(`(() => { const b = document.querySelector('iframe').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  const z0 = await pg.ev(`document.querySelector('iframe').contentWindow.__construct.z`);
  const y0 = await pg.ev('scrollY');
  await pg.S('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: 240 });
  await sleep(700);
  r.beforeEnter = { pageScrolled: (await pg.ev('scrollY')) - y0, constructZChange: +((await pg.ev(`document.querySelector('iframe').contentWindow.__construct.z`)) - z0).toFixed(3) };
  await pg.ev(`document.querySelector('iframe').scrollIntoView({ block: 'center' })`);
  await sleep(500);
  const box2 = await pg.ev(`(() => { const d = document.querySelector('iframe').contentDocument, b = d.getElementById('enterBtn').getBoundingClientRect(), f = document.querySelector('iframe').getBoundingClientRect(); return { x: f.left + b.left + b.width / 2, y: f.top + b.top + b.height / 2 }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await pg.S('Input.dispatchMouseEvent', { type, x: box2.x, y: box2.y, button: 'left', clickCount: 1 });
  await sleep(1200);
  r.shots.push(await pg.shot(`${name}-after-enter`));
  const f = await pg.ev(`(() => { const b = document.querySelector('iframe').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  const y1 = await pg.ev('scrollY'), z1 = await pg.ev(`document.querySelector('iframe').contentWindow.__construct.z`);
  for (let i = 0; i < 4; i++) { await pg.S('Input.dispatchMouseEvent', { type: 'mouseWheel', x: f.x, y: f.y, deltaX: 0, deltaY: 120 }); await sleep(80); }
  await sleep(1500);
  r.afterEnter = { pageScrolled: (await pg.ev('scrollY')) - y1, constructZChange: +((await pg.ev(`document.querySelector('iframe').contentWindow.__construct.z`)) - z1).toFixed(3) };
  r.shots.push(await pg.shot(`${name}-entered-zoomed`));
  await pg.S('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await pg.S('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(400);
  r.afterEsc = await pg.ev(`document.querySelector('iframe').contentDocument.documentElement.classList.contains('entered') ? 'still entered' : 'left'`);
  // Off screen, the frame stops drawing.
  r.framesOnScreen = await pg.ev(`(async () => { const w = document.querySelector('iframe').contentWindow; const c0 = w.__construct.frames; await new Promise((r) => setTimeout(r, 1000)); return w.__construct.frames - c0; })()`);
  await pg.ev(`scrollTo(0, document.body.scrollHeight)`);
  await sleep(800);
  r.framesOffScreen = await pg.ev(`(async () => { const w = document.querySelector('iframe').contentWindow; const c0 = w.__construct.frames; await new Promise((r) => setTimeout(r, 1500)); return { frames: w.__construct.frames - c0, running: w.__construct.running }; })()`);
  r.console = pg.log.slice();
  await pg.close();
  report.runs.push(r);
}

// Reduced motion: no flights, no drifting; the attack cuts straight to its verdict.
async function reduced(name, w, h) {
  const pg = await newPage(w, h, { dsf: 1, still: true });
  const r = { name, viewport: `${w}x${h}`, shots: [] };
  await load(pg, BASE + '/');
  r.matches = await pg.ev(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
  await pg.ev(`document.getElementById('introGo').click()`);
  const t0 = Date.now();
  await pg.ev(`(window.__construct.select(0), window.__construct.run())`);
  for (let k = 0; k < 120 && (await pg.ev('window.__construct.attacking')); k++) await sleep(100);
  r.attackSeconds = +((Date.now() - t0) / 1000).toFixed(1);
  await sleep(300);
  r.shots.push(await pg.shot(`${name}-attack-satoshi`));
  r.console = pg.log.slice();
  await pg.close();
  report.runs.push(r);
}

try {
  if (want('reduced')) await reduced('reduced', 1440, 900);
  if (want('desktop')) await fullPage('desktop', 1440, 900, { dsf: 2 });
  if (want('phone')) await fullPage('phone', 390, 844, { mobile: true, dsf: 3 });
  if (want('embed-desktop')) await embedded('embed-desktop', 1440, 900, 810, { dsf: 2 });
  if (want('embed-phone')) await embedded('embed-phone', 390, 844, 600, { mobile: true, dsf: 3 });
} catch (e) {
  report.error = String(e.stack || e);
} finally {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  ws.close(); chrome.kill(); server.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
