// Wheel, pinch, drag and keys. Embedded, nothing is captured until the visitor enters the construct; the Leave
// button and Esc give the page its scroll back.
export function createInput({ canvas, onZoom, onOrbit, onTap, onKey, isCaptured, onActivity }) {
  const ptrs = new Map();
  let pinchD = 0;

  addEventListener('wheel', (e) => {
    if (!isCaptured()) return;
    e.preventDefault();
    // Trackpads send many small deltas; mouse wheels send lines. Normalise both.
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    onZoom(Math.max(-120, Math.min(120, d)) * 0.0016);
    onActivity();
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    if (!isCaptured() && e.pointerType === 'touch') return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY });
    if (ptrs.size === 2) { const p = [...ptrs.values()]; pinchD = Math.hypot(p[0].lx - p[1].lx, p[0].ly - p[1].ly); }
    onActivity();
  });
  canvas.addEventListener('pointermove', (e) => {
    const rec = ptrs.get(e.pointerId);
    if (!rec) return;
    const dx = e.clientX - rec.lx, dy = e.clientY - rec.ly;
    rec.lx = e.clientX; rec.ly = e.clientY;
    if (ptrs.size === 2) {
      const p = [...ptrs.values()];
      const d = Math.hypot(p[0].lx - p[1].lx, p[0].ly - p[1].ly);
      if (pinchD > 0 && d > 0) onZoom(Math.log(d / pinchD) * 1.6);
      pinchD = d;
    } else if (e.buttons || e.pointerType === 'touch') {
      onOrbit(dx, dy);
    }
  });
  const end = (e) => {
    const rec = ptrs.get(e.pointerId);
    if (rec && ptrs.size === 1 && Math.hypot(e.clientX - rec.x, e.clientY - rec.y) < 6) onTap(e.clientX, e.clientY);
    ptrs.delete(e.pointerId);
    pinchD = 0;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); pinchD = 0; });
  // Safari's own pinch gesture would zoom the page; the construct takes it once entered.
  for (const ev of ['gesturestart', 'gesturechange']) addEventListener(ev, (e) => { if (isCaptured()) e.preventDefault(); }, { passive: false });

  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    onKey(e);
  });
}
