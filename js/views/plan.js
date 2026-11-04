import { html, icon, raw, srOnly } from '../ui.js';
import { PlanViewer } from '../plancheck/viewer.js';
import { planSession } from '../plansession.js';
import { canvasImage } from '../plancheck/report.js';

// Planlieferungen DWG für das CAFM: the pieces of the Erfassung tab of a floor plan delivery (DWG-UG … DWG-DG):
// upload zone, result strip, sub tabs (40 Prüfregeln, Fehlermeldungen, Räume, Layer, Kennzahlen SIA 416) with the
// plan viewer, and the mount logic (viewer, drag & drop, list interactions). The page itself is views/form.js.
// The plan is parsed and checked locally in the browser by js/plancheck (plan-check engine, LibreDWG WebAssembly).

const SEV_ICON = { pass: ['circle-check', '#2f7d63'], warn: ['triangle-alert', '#8a6100'], fail: ['circle-x', '#9b2c44'] };
const STATUS_ICON = { ok: ['circle-check', '#2f7d63'], warning: ['triangle-alert', '#8a6100'], error: ['circle-x', '#9b2c44'] };
const TABS = [['rules', 'Prüfregeln'], ['issues', 'Fehlermeldungen'], ['rooms', 'Räume'], ['layers', 'Layer'], ['kpi', 'Kennzahlen']];

// ---- Pieces ----

export const dropZone = (plan, compact = false) => html`
  <label class="plan-drop" data-plan-drop="${plan.key}" style="${raw(compact ? 'padding:22px 16px' : '')}">
    ${icon('upload', compact ? 22 : 30, '#5b6573')}
    <div class="plan-drop-title">DWG-Datei für ${plan.name} hierher ziehen oder auswählen</div>
    <div class="plan-drop-hint">.dwg, max. 50 MB · geprüft wird lokal im Browser nach CAD-Richtlinie BBL V1.0, nichts wird hochgeladen</div>
    <span class="btn btn-primary">Datei auswählen</span>
    <input type="file" accept=".dwg" data-change="planFile" data-key="${plan.key}" aria-label="DWG-Datei für ${plan.name} auswählen">
    <div class="plan-drop-hint">Keine Datei? <button type="button" class="btn-link" data-action="planLoadSample" data-key="${plan.key}">${plan.sampleLabel} laden</button></div>
  </label>`;

const resultStrip = plan => html`<div class="plan-result">
  <div><div class="plan-kpi-label">Räume</div><div class="plan-kpi">${plan.roomCount}</div></div>
  <div><div class="plan-kpi-label">NGF</div><div class="plan-kpi">${plan.ngf}</div></div>
  <div><div class="plan-kpi-label">${plan.scoreLabel}</div><div class="plan-kpi" style="color:${plan.scoreC}">${plan.score}</div></div>
  <div><div class="plan-kpi-label">Fehler</div><div class="plan-kpi" style="color:${plan.errors ? '#9b2c44' : '#2f7d63'}">${plan.errors}</div></div>
  <div><div class="plan-kpi-label">Warnungen</div><div class="plan-kpi" style="color:${plan.warnings ? '#8a6100' : '#2f7d63'}">${plan.warnings}</div></div>
</div>`;

const viewerBox = plan => html`<div class="plan-viewer" data-plan-viewer="${plan.drawingKey || ''}" data-plan-src="${plan.src || ''}" data-plan-status="idle">
  <canvas role="img" aria-label="Grundrissplan ${plan.name}"></canvas>
  <div class="plan-viewer-state"><span class="plan-spin">${icon('loader-circle', 22, '#5b6573')}</span><div class="plan-state-text">Plan wird geladen…</div><div class="plan-state-sub"></div></div>
  <div class="plan-tools" role="toolbar" aria-label="Viewer">
    <button type="button" data-plan-overlay="base" class="is-on" title="Zeichnung">${icon('layers', 14, 'currentColor')}</button>
    <button type="button" data-plan-overlay="rooms" title="Räume nach Prüfstatus">${icon('layout-grid', 14, 'currentColor')}</button>
    <button type="button" data-plan-overlay="areas" title="Geschossfläche">${icon('scan', 14, 'currentColor')}</button>
    <span class="plan-tools-sep"></span>
    <button type="button" data-plan-zoom="in" title="Vergrössern">${icon('zoom-in', 14, '#1f2937')}</button>
    <button type="button" data-plan-zoom="out" title="Verkleinern">${icon('zoom-out', 14, '#1f2937')}</button>
    <button type="button" data-plan-zoom="fit" title="Gesamtansicht">${icon('maximize', 14, '#1f2937')}</button>
  </div>
  <div class="plan-coords" aria-hidden="true"></div>
  <div class="plan-popup" role="tooltip" aria-live="polite"></div>
</div>`;

const SEV_TEXT = { fail: 'Fehler', warn: 'Warnung', pass: 'Bestanden', error: 'Fehler', warning: 'Warnung', ok: 'In Ordnung' };
const sevIcon = (table, key) => html`${icon(table[key][0], 15, table[key][1])}${srOnly(SEV_TEXT[key] || key)}`;
const ruleRow = r => html`<button type="button" class="plan-row${r.count ? ' is-locatable' : ''}" data-plan-rule="${r.code}" title="${r.text}">
  ${sevIcon(SEV_ICON, r.status)}<span class="plan-code">${r.code}</span><span class="plan-row-text">${r.text}</span>${r.count ? html`<span class="plan-row-count">${r.count}×</span>` : ''}</button>`;

function listRules(plan) {
  const { failed, passed, total } = plan.rules;
  return html`
    ${failed.length ? html`<div class="plan-group"><span>Nicht bestanden</span><span>${failed.length}/${total}</span></div>${failed.map(ruleRow)}` : ''}
    <div class="plan-group"><span>Bestanden</span><span>${passed.length}/${total}</span></div>${passed.map(ruleRow)}`;
}

function listIssues(plan) {
  const issues = plan.result.issues;
  if (!issues.length) return html`<div class="plan-empty">Keine Fehler oder Warnungen.</div>`;
  const rooms = new Map(plan.result.rooms.map(r => [r.id, r]));
  const order = issues.map((it, i) => ({ it, i })).sort((a, b) => (a.it.severity === b.it.severity ? 0 : a.it.severity === 'error' ? -1 : 1));
  return html`<div class="plan-group"><span>Fehlermeldungen</span><span>${issues.length}</span></div>
    ${order.map(({ it, i }) => {
      const ref = it.roomId ? (rooms.get(it.roomId) || {}).aoid : it.layer ? it.layer : it.handle ? 'H:' + it.handle : it.handles ? `${it.handles.length} Elemente` : '';
      const locatable = !!(it.roomId || it.handle || (it.handles && it.handles.length));
      const sev = it.severity === 'error' ? 'fail' : 'warn';
      return html`<button type="button" class="plan-row${locatable ? ' is-locatable' : ''}" data-plan-locate="${i}" title="${it.message}">
        ${sevIcon(SEV_ICON, sev)}<span class="plan-code">${it.code}</span>${ref ? html`<span class="plan-row-sub nowrap">${ref}</span>` : ''}<span class="plan-row-text">${it.message}</span></button>`;
    })}`;
}

function listRooms(plan) {
  const rooms = plan.result.rooms;
  if (!rooms.length) return html`<div class="plan-empty">Keine Räume erkannt.<br><small>Erwartet: geschlossene Polylinien auf Layer R_RAUMPOLYGON mit AOID-Text auf R_AOID.</small></div>`;
  const rank = { error: 0, warning: 1, ok: 2 };
  return html`<div class="plan-group"><span>Räume · AOID</span><span>${rooms.length}</span></div>
    ${rooms.slice().sort((a, b) => rank[a.status] - rank[b.status] || a.aoid.localeCompare(b.aoid)).map(r => html`<button type="button" class="plan-row is-locatable" data-plan-room="${r.id}">
      ${sevIcon(STATUS_ICON, r.status)}<span class="plan-row-text">${r.aoid}${r.duplicate ? html` <span class="plan-row-sub">(Duplikat)</span>` : ''}</span><span class="plan-row-count">${r.area.toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²</span></button>`)}`;
}

function listLayers(plan) {
  const layers = plan.result.layers;
  return html`<div class="plan-group"><span>Layer</span><span>${layers.length}</span></div>
    ${layers.map(l => html`<label class="plan-row" style="cursor:pointer">
      <input type="checkbox" ${viewer.hiddenLayers.has(l.name) ? '' : raw('checked')} data-plan-layer="${l.name}" aria-label="Layer ${l.name} ein-/ausblenden" style="margin:0">
      ${icon(l.ok ? 'circle-check' : 'triangle-alert', 14, l.ok ? '#2f7d63' : '#8a6100')}<span class="plan-swatch" style="background:${l.color}"></span>
      <span class="plan-row-text" title="${l.ok ? 'Zulässiger CAFM-Layer' : 'Unbekannter Layer — nicht in der CAFM-Layerliste'}">${l.name}</span><span class="plan-row-count">${l.count}</span></label>`)}`;
}

function listKpi(plan) {
  return html`<div class="plan-kpi-section">
    <div class="plan-kpi-title">Gebäudeflächen SIA 416</div>
    <table class="plan-kpi-table"><tbody>${plan.siaRows.map(r => html`<tr class="${r.sum ? 'is-sum' : ''}"><td class="abbr">${r.abbr}</td><td>${r.label}</td><td class="right">${r.value}</td><td class="right muted" style="width:48px">${r.share}</td></tr>`)}</tbody></table>
    ${plan.siaSegs.length ? html`<div class="plan-bar">${plan.siaSegs.map(g => html`<span style="width:${g.pct};background:${g.bg}" title="${g.text}">${g.text}</span>`)}</div>
    <div class="plan-legend">${plan.siaSegs.map(g => html`<span style="--c:${g.bg}">${g.label}</span>`)}</div>` : html`<div class="plan-empty">Keine Flächen für das Diagramm.</div>`}
    <div class="plan-kpi-title" style="margin-top:14px">Wirtschaftlichkeitskennzahlen</div>
    <table class="plan-kpi-table"><tbody>${plan.ratios.map(([k, v]) => html`<tr><td class="abbr" style="width:90px">${k}</td><td class="right">${v}</td></tr>`)}</tbody></table>
    <div class="muted fs-12" style="margin-top:10px;line-height:1.5">Raumpolygone zählen zur HNF, solange keine Nutzungsart aus dem Raumstempel vorliegt (R_RAUMSTEMPEL wird von der Prüfstelle ergänzt). GF aus R_GESCHOSSPOLYGON, KF = GF − NGF.</div>
  </div>`;
}

/** Result strip, sub tabs and the split view (list | viewer) of a checked plan. */
export function resultPanel(ctx, plan, { height = '' } = {}) {
  const tab = TABS.some(t => t[0] === ctx.state.ui.planTab) ? ctx.state.ui.planTab : 'rules';
  const counts = { rules: `${plan.rules.failed.length ? plan.rules.failed.length + ' offen' : 'alle'}`, issues: String(plan.issueCount), rooms: String(plan.roomCount), layers: String(plan.layerCount), kpi: '' };
  const body = { rules: listRules, issues: listIssues, rooms: listRooms, layers: listLayers, kpi: listKpi }[tab](plan);
  return html`
    ${resultStrip(plan)}
    <div class="plan-tabs" role="tablist">${TABS.map(([key, label]) => html`<button type="button" class="plan-tab${key === tab ? ' is-active' : ''}" role="tab" aria-selected="${key === tab ? 'true' : 'false'}" aria-controls="plan-list" data-action="planTab" data-arg="${key}">${label}${counts[key] ? html`<span class="plan-tab-count">${counts[key]}</span>` : ''}</button>`)}</div>
    <div class="plan-split" style="${raw(height ? `height:${height}` : '')}">
      <div class="plan-list" id="plan-list" role="tabpanel" data-plan-tab="${tab}">${body}</div>
      ${viewerBox(plan)}
    </div>`;
}

// ---- Mount: viewer, drag & drop, list interactions (viewer-local, no store round trip) ----

const viewer = new PlanViewer();
let attachedKey = null;
let lastTab = null;

function setViewerState(box, status, text, sub = '') {
  box.dataset.planStatus = status;
  const el = box.querySelector('.plan-viewer-state');
  if (!el) return;
  el.classList.toggle('is-hidden', status === 'ready');
  el.querySelector('.plan-state-text').textContent = text || '';
  el.querySelector('.plan-state-sub').textContent = sub || '';
  const spin = el.querySelector('.plan-spin');
  if (spin) spin.style.display = status === 'loading' ? '' : 'none';
}

/** Image of the attached drawing at full extent with an overlay ('base', 'rooms', 'areas') for the Prüfbericht; the view is restored. */
export function captureViewerImage(overlay) {
  if (!viewer.canvas || !viewer.drawing) return null;
  const prev = { overlay: viewer.overlay, cam: { ...viewer.cam } };
  try {
    viewer.setOverlay(overlay);
    viewer.zoomExtents();
    viewer.render();
    return canvasImage(viewer.canvas);
  } finally {
    viewer.overlay = prev.overlay;
    viewer.cam = prev.cam;
    viewer.render();
  }
}

function wireDrop(root, ctx) {
  for (const zone of root.querySelectorAll('[data-plan-drop]')) {
    const key = zone.dataset.planDrop;
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('is-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) ctx.actions.planFile({ key }, { files: [file] });
    });
  }
}

function markSelected(list, row) {
  for (const r of list.querySelectorAll('.plan-row.is-selected')) r.classList.remove('is-selected');
  if (row) row.classList.add('is-selected');
}

function wireList(root, plan) {
  const list = root.querySelector('.plan-list');
  if (!list) return;
  list.addEventListener('click', e => {
    const row = e.target.closest('.plan-row');
    if (!row || !plan.result) return;
    if (row.dataset.planLocate != null) {
      const issue = plan.result.issues[Number(row.dataset.planLocate)];
      if (issue && viewer.locateIssue(issue)) markSelected(list, row);
    } else if (row.dataset.planRule) {
      const issue = plan.result.issues.find(i => i.code === row.dataset.planRule);
      if (issue && viewer.locateIssue(issue)) markSelected(list, row);
    } else if (row.dataset.planRoom) {
      if (viewer.locateRoom(Number(row.dataset.planRoom))) markSelected(list, row);
    }
    syncTools(root);
  });
  list.addEventListener('change', e => {
    const cb = e.target.closest('input[data-plan-layer]');
    if (cb) viewer.setLayerVisible(cb.dataset.planLayer, cb.checked);
  });
}

function syncTools(root) {
  for (const b of root.querySelectorAll('[data-plan-overlay]')) {
    const on = b.dataset.planOverlay === viewer.overlay;
    b.classList.toggle('is-on', on);
    const ic = b.querySelector('.ic');
    if (ic) ic.style.background = on ? '#fff' : '#1f2937';
  }
}

function wireTools(box, root) {
  box.querySelector('.plan-tools').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.planZoom === 'in') viewer.zoomIn();
    else if (b.dataset.planZoom === 'out') viewer.zoomOut();
    else if (b.dataset.planZoom === 'fit') viewer.fit();
    else if (b.dataset.planOverlay) { viewer.setOverlay(b.dataset.planOverlay); syncTools(root); }
  });
}

/** Called by the delivery page after every render of the Erfassung tab of a DWG delivery. */
export function mountPlan(root, ctx, plan) {
  wireDrop(root, ctx);
  document.addEventListener('dragover', blockDrop);
  document.addEventListener('drop', blockDrop);
  const box = root.querySelector('.plan-viewer');
  if (!box) { viewer.detach(); attachedKey = null; return; }
  const key = box.dataset.planViewer, src = box.dataset.planSrc;
  const tab = ctx.state.ui.planTab || 'rules';
  wireList(root, plan);
  wireTools(box, root);
  viewer.attach(box, box.querySelector('canvas'));
  if (attachedKey !== key) { viewer.setData(null); attachedKey = key; lastTab = null; }
  if (tab !== lastTab) { viewer.setOverlay({ rooms: 'rooms', kpi: 'areas' }[tab] || 'base'); lastTab = tab; }
  syncTools(root);

  const show = entry => {
    if (viewer.drawing !== entry.drawing) viewer.setData(entry);
    setViewerState(box, 'ready', '');
  };
  const entry = planSession.get(key);
  if (entry && entry.status === 'ready') show(entry);
  else if (entry && entry.status === 'error') setViewerState(box, 'error', 'Plan konnte nicht geladen werden', entry.error);
  else if (src) {
    setViewerState(box, 'loading', 'Plan wird geladen und geprüft…', 'LibreDWG WebAssembly (~10 MB) beim ersten Mal, danach aus dem Zwischenspeicher.');
    planSession.loadAsset(src)
      .then(e => { if (box.isConnected && attachedKey === key) show(e); })
      .catch(err => { if (box.isConnected) setViewerState(box, 'error', 'Plan konnte nicht geladen werden', err.message); });
  } else {
    setViewerState(box, 'missing', 'Zeichnung nicht mehr im Speicher', 'Die Datei wurde lokal im Browser geprüft und nicht gespeichert. Prüfergebnis bleibt erhalten; für die Ansicht die DWG-Datei erneut auswählen.');
  }
}

export function unmountPlan() { viewer.detach(); viewer.setData(null); attachedKey = null; lastTab = null; document.removeEventListener('dragover', blockDrop); document.removeEventListener('drop', blockDrop); }
/** A DWG dropped outside the drop zone must not navigate the browser away from the prototype. */
function blockDrop(e) { if (!e.target.closest || !e.target.closest('[data-plan-drop]')) e.preventDefault(); }
