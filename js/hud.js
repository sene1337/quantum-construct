// The page around the scene: where you are, the depth meter, the targets, the verdict and the sources.
import { SOURCES, TIMELINE } from './facts.js';

const $ = (id) => document.getElementById(id);

/** Replace {n:id} marks in HTML text with links into the Sources list. */
export function refs(html) {
  return html.replace(/\{n:([a-z0-9-]+)\}/g, (_, id) => {
    const i = SOURCES.findIndex((s) => s.id === id);
    if (i < 0) { console.warn('unknown source', id); return ''; }
    return `<a class="ref" href="#src-${id}" data-src="${id}" aria-label="Source ${i + 1}: ${SOURCES[i].short}">[${i + 1}]</a>`;
  });
}

export function createHud({ levels, targets, onLevel, onTarget, onRun, onZoomStep, onSources, onSound, onLeave, onEnter }) {
  // Depth meter: outermost at the top, the private key at the bottom.
  const meter = $('meter');
  const rows = levels.map((L, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = L.side;
    b.innerHTML = `<span>${L.short} · ${L.name}</span><i aria-hidden="true"></i>`;
    b.setAttribute('aria-label', `${L.short}: ${L.name}`);
    b.onclick = () => onLevel(i);
    li.appendChild(b); meter.appendChild(li);
    return b;
  });

  const seg = $('targets');
  const tbtns = targets.map((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${t.label}<small class="${t.cls}">${t.tag}</small>`;
    b.title = t.title;
    b.onclick = () => onTarget(i);
    seg.appendChild(b);
    return b;
  });

  $('runBtn').onclick = () => onRun();
  $('zoomIn').onclick = () => onZoomStep(+1);
  $('zoomOut').onclick = () => onZoomStep(-1);
  $('sndBtn').onclick = () => onSound();
  $('leaveBtn').onclick = () => onLeave();
  $('enterBtn').onclick = () => onEnter();
  $('verdictClose').onclick = () => hideVerdict();

  // Sources: one numbered list, opened from any [n] mark or the Sources button.
  const list = $('sourceList');
  list.innerHTML = SOURCES.map((s) => `<li id="src-${s.id}"><b>${s.short}</b>. ${s.title}${s.note ? ` <span>${s.note}</span>` : ''} <a href="${s.url}" target="_blank" rel="noopener">${s.host}</a></li>`).join('');
  const dlg = $('sources');
  let lastFocus = null;
  function openSources(id) {
    lastFocus = document.activeElement;
    dlg.hidden = false;
    onSources(true);
    const el = id ? document.getElementById('src-' + id) : null;
    if (el) { el.scrollIntoView({ block: 'center' }); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); location.hash = ''; }
    else $('sourcesClose').focus();
    for (const li of list.children) li.classList.toggle('hit', !!el && li === el);
  }
  function closeSources() { dlg.hidden = true; onSources(false); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('srcBtn').onclick = () => openSources(null);
  $('sourcesClose').onclick = closeSources;
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeSources(); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a.ref');
    if (!a) return;
    e.preventDefault();
    openSources(a.dataset.src);
  });

  // The timeline shows with the outermost level.
  $('timelineList').innerHTML = TIMELINE.items.map((t) => `<li><b>${t.year}</b><span>${refs(t.text)}</span></li>`).join('');
  $('timelineOdds').innerHTML = refs(TIMELINE.odds);
  // Open where it fits in the bottom row of a full page; embedded or on smaller screens it starts closed, so the
  // closing image stays in view.
  $('timeline').open = !document.documentElement.classList.contains('embed') && !!(window.matchMedia && matchMedia('(min-width: 1241px) and (min-height: 800px)').matches);

  let curLevel = -1;
  function setLevel(i) {
    if (i === curLevel) return;
    curLevel = i;
    const L = levels[i];
    $('timeline').hidden = L.id !== 'dawn';
    $('whereKicker').textContent = L.kicker;
    $('whereTitle').textContent = L.name;
    $('whereText').innerHTML = refs(L.text);
    rows.forEach((r, j) => r.setAttribute('aria-current', j === i ? 'true' : 'false'));
  }
  function setTarget(i) {
    tbtns.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));
    $('runNote').innerHTML = targets[i].note;
  }
  function showVerdict(v) {
    const badge = $('verdictBadge');
    badge.textContent = v.badge;
    badge.className = 'badge ' + v.tone;
    $('verdictTitle').textContent = v.title;
    $('verdictBody').innerHTML = refs(v.body);
    $('verdict').classList.add('show');
  }
  function hideVerdict() { $('verdict').classList.remove('show'); }
  function ticker(text) { $('ticker').textContent = text || ''; }
  function setRunning(on) { $('runBtn').disabled = on; $('runBtn').textContent = on ? 'Attack running…' : 'Run the attack'; }
  function setSound(on) { const b = $('sndBtn'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.querySelector('.l').textContent = on ? 'Sound on' : 'Sound off'; b.classList.toggle('off', !on); }
  return { setLevel, setTarget, showVerdict, hideVerdict, ticker, setRunning, setSound, openSources, closeSources, get sourcesOpen() { return !dlg.hidden; } };
}
