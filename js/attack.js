// Run the attack: a short guided flight to where the target is decided, the attack itself, then a verdict.
// Keys: the locking script (L5), then the curve (L6), where Shor's algorithm either finds a point to aim at
// or finds only a hash. The proof: out to machine B (O3), where Grover's search meets the size of the network.
import { TARGETS } from './facts.js';
import { clamp } from './engine.js';

const Z_SCRIPT = 8.3, Z_CURVE = 9.3, Z_MACHINE_B = 1.12;

export function createAttack(app) {
  // app: { flyTo(z, cut), getZ(), hud, sound, still, target (getter) }
  let steps = null, si = 0, stepT = 0, running = false;
  let phase = '', phaseT = 0, pulse = 0, grover = 0;
  let lockOpen = false, hop = 0, rings = 0, shake = 0;

  function reset() {
    steps = null; running = false; phase = ''; phaseT = 0; pulse = 0; grover = 0; lockOpen = false; hop = 0; rings = 0; shake = 0;
    app.hud.setRunning(false);
    app.hud.ticker('');
  }

  function fly(z) { return { kind: 'fly', z }; }
  function hold(sec, name, enter) { return { kind: 'hold', sec, name, enter }; }

  function run() {
    if (running) return;
    const t = TARGETS[app.target];
    reset();
    app.hud.hideVerdict();
    running = true;
    app.hud.setRunning(true);
    const cut = app.still;
    if (t.key === 'proof') {
      steps = [
        { kind: 'say', text: 'Target: the proof of work.\nFlying out to the machine that would have to out-mine the network…' },
        fly(Z_MACHINE_B),
        hold(cut ? 0.6 : 4.6, 'grover', () => { app.sound.grover(); }),
        { kind: 'verdict' },
      ];
    } else {
      steps = [
        { kind: 'say', text: `Target: ${t.label} (${t.tag}).\nReading what the chain stores for it…` },
        fly(Z_SCRIPT),
        hold(cut ? 0.8 : 2.2, 'script', () => {
          app.hud.ticker(t.exposed ? 'A public key is on chain.\nLoading it into Shor’s algorithm…' : 'No public key on chain: only its hash.\nThere is nothing to aim at yet.');
          if (t.exposed) app.sound.select(); else app.sound.safe();
        }),
        fly(Z_CURVE),
        t.exposed
          ? hold(cut ? 0.6 : 5.4, 'shor', () => app.sound.shor())
          : hold(cut ? 0.6 : 1.8, 'nokey', () => { app.sound.deny(); app.hud.ticker('Shor’s algorithm needs a point to aim at.\nThis coin shows none.'); }),
        { kind: 'verdict' },
      ];
    }
    si = 0; stepT = 0;
    enter();
  }

  function enter() {
    const s = steps[si];
    stepT = 0;
    if (s.kind === 'say') { app.hud.ticker(s.text); next(); return; }
    if (s.kind === 'fly') { app.flyTo(s.z, app.still); return; }
    if (s.kind === 'hold') { phase = s.name; phaseT = 0; if (s.enter) s.enter(); return; }
    if (s.kind === 'verdict') {
      const t = TARGETS[app.target];
      if (t.exposed) app.sound.unlock();
      app.hud.ticker('');
      app.hud.showVerdict(t.verdict);
      app.hud.setRunning(false);
      running = false;
      steps = null;
    }
  }
  function next() { si++; if (steps && si < steps.length) enter(); }

  function update(t, dt) {
    pulse = Math.max(0, pulse - dt * 0.8);
    shake = Math.max(0, shake - dt);
    if (!running || !steps) return;
    const s = steps[si];
    stepT += dt;
    if (s.kind === 'fly') {
      if (Math.abs(app.getZ() - s.z) < 0.035 || stepT > 5) next();
      return;
    }
    if (s.kind === 'hold') {
      phaseT += dt;
      const f = clamp(phaseT / s.sec, 0, 1);
      if (phase === 'script') pulse = Math.sin(f * Math.PI);
      if (phase === 'grover') {
        grover = app.still ? 1 : Math.sin(Math.min(1, f * 1.3) * Math.PI * 0.5);
        const lines = ['Grover’s search over every nonce:\nat best the square root of the work.',
          'At today’s difficulty that takes about\n10²³ qubits and 10²⁵ watts.',
          'The network does it with about 10 to 15 gigawatts.\nThe proof holds.'];
        app.hud.ticker(lines[Math.min(2, Math.floor(f * 3))]);
      }
      if (phase === 'shor') {
        const e = app.still ? 5.4 : phaseT;
        rings = e < 2.2 ? e / 2.2 : 1;
        hop = clamp((e - 2.0) / 2.4, 0, 1);
        if (e < 2.0) app.hud.ticker('Shor’s algorithm: interference over every possible k\nreveals the period of the walk around the curve…');
        else if (e < 4.4) app.hud.ticker('The period gives k.\nWalking P back to G…');
        else { app.hud.ticker('Private key recovered, on paper.\nThe coin can be moved by whoever holds it.'); lockOpen = true; }
      }
      if (phase === 'nokey') shake = Math.max(shake, 0.4);
      if (phaseT >= s.sec) { if (phase === 'grover') grover = 0; phase = phase === 'shor' ? 'shorDone' : ''; next(); }
    }
  }

  // Drives the effects on the curve level (called from its tick).
  function curveTick(L, t, dt) {
    const active = phase === 'shor' || phase === 'shorDone' || lockOpen;
    L.shorFx.visible = active && TARGETS[app.target].exposed;
    const op = L.lastOp < 0 ? 1 : L.lastOp;
    if (L.shorFx.visible) {
      L.rings.forEach((r, i) => {
        const ph = clamp((rings * 2.2 - i * 0.22) / 1.6, 0, 1);
        r.material.opacity = op * Math.sin(ph * Math.PI) * 0.95 * (phase === 'shor' ? 1 : 0);
        r.scale.setScalar(1 - 0.85 * ph);
        if (!app.still) r.rotation.z = t * (0.5 + i * 0.3);
      });
      const n = Math.max(2, Math.round(hop * L.hopN));
      L.hopLine.geometry.setDrawRange(0, n);
      L.hopLine.material.opacity = hop > 0 ? op : 0;
      const pos = L.hopLine.geometry.attributes.position, i = Math.min(n - 1, L.hopN - 1);
      L.spark.visible = hop > 0 && hop < 1;
      L.spark.position.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const target = lockOpen ? 2.2 : 0;
    L.shackle.rotation.z += (target - L.shackle.rotation.z) * Math.min(1, dt * 4);
    L.lockLabel.visible = !lockOpen; L.lockOpen.visible = lockOpen;
    // The hash wall shudders when the attack finds nothing to aim at.
    const hg = L.hiddenG, u = hg.userData;
    if (u.x0 === undefined) { u.x0 = hg.position.x; u.y0 = hg.position.y; }
    if (shake > 0 && !app.still) hg.position.set(u.x0 + (Math.random() - 0.5) * 0.12, u.y0 + (Math.random() - 0.5) * 0.12, 0);
    else hg.position.set(u.x0, u.y0, 0);
  }

  return {
    run, update, reset, curveTick,
    cancel() { if (running) { reset(); } },
    get running() { return running; },
    groverGlow: () => grover,
    scriptPulse: () => pulse,
  };
}
