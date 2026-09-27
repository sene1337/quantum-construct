// Synthesised sound, no files: a low drone, a whoosh that follows the zoom, and cues for the attack.
export function createSound(startOn) {
  const S = { ctx: null, on: startOn, master: null, whoosh: null, whooshF: null };

  function init() {
    if (S.ctx) return;
    try { S.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = S.ctx;
    S.master = c.createGain(); S.master.gain.value = S.on ? 0.5 : 0; S.master.connect(c.destination);
    const g = c.createGain(); g.gain.value = 0.04; g.connect(S.master);
    for (const [f, v] of [[55, 1], [55.4, 0.9], [82.4, 0.35], [110, 0.12]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = v; o.connect(og); og.connect(g); o.start();
    }
    const lfo = c.createOscillator(); lfo.frequency.value = 0.06;
    const lg = c.createGain(); lg.gain.value = 0.016; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
    S.whooshF = c.createBiquadFilter(); S.whooshF.type = 'lowpass'; S.whooshF.frequency.value = 300; S.whooshF.Q.value = 0.7;
    S.whoosh = c.createGain(); S.whoosh.gain.value = 0;
    n.connect(S.whooshF); S.whooshF.connect(S.whoosh); S.whoosh.connect(S.master); n.start();
  }
  function poke() {
    if (!S.on) return;
    init();
    if (S.ctx && S.ctx.state === 'suspended' && !document.hidden) S.ctx.resume();
  }
  document.addEventListener('visibilitychange', () => {
    if (!S.ctx) return;
    if (document.hidden) S.ctx.suspend(); else if (S.on) S.ctx.resume();
  });
  function tone(freq, dur = 0.2, type = 'sine', vol = 0.1, slide = 0, delay = 0) {
    if (!S.ctx || !S.on) return;
    const c = S.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), gg = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(vol, t + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gg); gg.connect(S.master); o.start(t); o.stop(t + dur + 0.05);
  }
  function sweep(from, to, dur, vol = 0.06) {
    if (!S.ctx || !S.on) return;
    const c = S.ctx, t = c.currentTime;
    const o = c.createOscillator(), gg = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    f.type = 'lowpass'; f.frequency.value = 1200; f.Q.value = 4;
    gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(vol, t + 0.4);
    gg.gain.setValueAtTime(vol, t + dur - 0.4); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(gg); gg.connect(S.master); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    poke,
    get on() { return S.on; },
    set(on) {
      S.on = on;
      if (on) { poke(); if (S.master) S.master.gain.value = 0.5; }
      else if (S.master) S.master.gain.value = 0;
    },
    zoom(v) {
      if (!S.whoosh || !S.on) return;
      const target = Math.min(0.18, Math.abs(v) * 0.28);
      S.whoosh.gain.value += (target - S.whoosh.gain.value) * 0.12;
      S.whooshF.frequency.value = 220 + Math.min(1.2, Math.abs(v)) * 1500;
    },
    level(k) { tone(220 + k * 36, 0.9, 'sine', 0.035); tone(440 + k * 72, 1.2, 'sine', 0.012, 0, 0.02); },
    select() { tone(660, 0.18, 'triangle', 0.05); tone(990, 0.3, 'triangle', 0.035, 0, 0.06); },
    deny() { tone(120, 0.5, 'sine', 0.14, -50); },
    shor() { sweep(80, 1400, 4.4, 0.05); },
    grover() { sweep(60, 180, 4.2, 0.05); },
    unlock() { tone(70, 0.6, 'sine', 0.2, -25); tone(523, 0.5, 'triangle', 0.06, 0, 0.2); tone(659, 0.6, 'triangle', 0.05, 0, 0.28); tone(784, 0.9, 'triangle', 0.05, 0, 0.36); },
    safe() { tone(392, 0.8, 'sine', 0.05); tone(587, 1.1, 'sine', 0.04, 0, 0.12); },
  };
}
