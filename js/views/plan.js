import { html, icon, raw, srOnly } from '../ui.js';
import { PlanViewer } from '../plancheck/viewer.js';
import { planSession } from '../plansession.js';
import { canvasImage } from '../plancheck/report.js';
import { planLists } from '../model/plan.js';

// Planlieferungen DWG für das Flächenmanagement (SAP RE-FX): the pieces of the Erfassung tab of a floor plan delivery (DWG-UG … DWG-DG):
// upload zone, result strip, sub tabs (40 Prüfregeln, Fehlermeldungen, Räume, Layer, Kennzahlen SIA 416) with the
// plan viewer, the list toolbar (search, toggle-all) and the status filter, and the mount logic (viewer, drag & drop,
// list interactions). The page itself is views/form.js.
// The plan is parsed and checked locally in the browser by js/plancheck (plan-check engine, LibreDWG WebAssembly).

const SEV_ICON = { pass: ['circle-check', '#2f7d63'], warn: ['triangle-alert', '#8a6100'], fail: ['circle-x', '#9b2c44'] };
const STATUS_ICON = { ok: ['circle-check', '#2f7d63'], warning: ['triangle-alert', '#8a6100'], error: ['circle-x', '#9b2c44'] };
const TABS = [['rules', 'Prüfregeln'], ['issues', 'Fehlermeldungen'], ['rooms', 'Räume'], ['areas', 'Geschossflächen'], ['layers', 'Layer'], ['kpi', 'Kennzahlen']];
const OVERLAY_OF_TAB = { rooms: 'rooms', areas: 'areas', kpi: 'areas' };   // what the viewer highlights per sub tab
const PLACEHOLDER = { rules: 'Prüfregel suchen…', issues: 'Fehler suchen…', rooms: 'Raum suchen…', areas: 'Fläche suchen…', layers: 'Layer suchen…' };
const TOGGLE_TABS = new Set(['rooms', 'areas', 'layers']);   // rows with a viewer visibility checkbox → toggle-all in the toolbar
const FILTERS = [['all', 'Alle', null], ['warnings', 'Warnungen', ['triangle-alert', '#8a6100']], ['errors', 'Fehler', ['circle-x', '#9b2c44']]];
const fmtArea = v => v.toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' m²';

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
    <button type="button" data-plan-zoom="in" title="Vergrössern">${icon('zoom-in', 14, '#1f2937')}</button>
    <button type="button" data-plan-zoom="out" title="Verkleinern">${icon('zoom-out', 14, '#1f2937')}</button>
    <button type="button" data-plan-zoom="fit" title="Gesamtansicht">${icon('maximize', 14, '#1f2937')}</button>
  </div>
  <div class="plan-coords" aria-hidden="true"></div>
  <div class="plan-popup" role="tooltip" aria-live="polite"></div>
</div>`;

const SEV_TEXT = { fail: 'Fehler', warn: 'Warnung', pass: 'Bestanden', error: 'Fehler', warning: 'Warnung', ok: 'In Ordnung' };
const sevIcon = (table, key) => html`${icon(table[key][0], 15, table[key][1])}${srOnly(SEV_TEXT[key] || key)}`;
const canLocate = it => !!(it && (it.roomId || it.handle || (it.handles && it.handles.length)));
const ruleRow = (r, plan) => html`<button type="button" class="plan-row${plan && plan.result && canLocate(plan.result.issues.find(i => i.code === r.code)) ? ' is-locatable' : ''}" data-plan-rule="${r.code}" title="${r.text}">
  ${sevIcon(SEV_ICON, r.status)}<span class="plan-code">${r.code}</span><span class="plan-row-text">${r.text}</span>${r.count ? html`<span class="plan-row-count">${r.count}×</span>` : ''}</button>`;

/** Empty list: the search or the status filter left nothing, or the plan has no such entries (per-tab text). */
const emptyNote = (L, text, hint = '') => html`<div class="plan-empty">${L.query ? html`Keine Treffer für «${L.query}».` : L.filter === 'errors' ? 'Keine Einträge mit Fehlern.' : L.filter === 'warnings' ? 'Keine Einträge mit Warnungen.' : html`${text}${hint ? html`<br><small>${hint}</small>` : ''}`}</div>`;

function listRules(plan, L) {
  const { failed, passed, total } = L.rules;
  if (!failed.length && !passed.length) return emptyNote(L, 'Keine Prüfregeln.');
  return html`
    ${failed.length ? html`<div class="plan-group"><span>Nicht bestanden</span><span>${failed.length}/${total}</span></div>${failed.map(r => ruleRow(r, plan))}` : ''}
    ${passed.length ? html`<div class="plan-group"><span>Bestanden</span><span>${passed.length}/${total}</span></div>${passed.map(r => ruleRow(r, plan))}` : ''}`;
}

function listIssues(plan, L) {
  if (!L.issues.length) return emptyNote(L, 'Keine Fehler oder Warnungen.');
  return html`<div class="plan-group"><span>Fehlermeldungen</span><span>${L.issues.length}</span></div>
    ${L.issues.map(({ it, i, ref }) => {
      const locatable = canLocate(it);
      const sev = it.severity === 'error' ? 'fail' : 'warn';
      return html`<button type="button" class="plan-row${locatable ? ' is-locatable' : ''}" data-plan-locate="${i}" title="${it.message}">
        ${sevIcon(SEV_ICON, sev)}<span class="plan-code">${it.code}</span>${ref ? html`<span class="plan-row-sub nowrap">${ref}</span>` : ''}<span class="plan-row-text">${it.message}</span></button>`;
    })}`;
}

/** Room / floor-area row: visibility checkbox (viewer), status, label, area; the row itself locates the polygon. */
const polyRow = (kind, e, label, sub) => {
  const hidden = viewer.isHidden(kind, e.id);
  return html`<div class="plan-row is-locatable${hidden ? ' is-hidden' : ''}" role="button" tabindex="0" ${raw(kind === 'rooms' ? 'data-plan-room' : 'data-plan-area')}="${e.id}">
    <input type="checkbox" ${hidden ? '' : raw('checked')} data-plan-vis="${kind}" data-id="${e.id}" aria-label="${label} im Viewer ein-/ausblenden">
    ${sevIcon(STATUS_ICON, e.status)}<span class="plan-row-text">${label}${sub ? html` <span class="plan-row-sub">${sub}</span>` : ''}</span><span class="plan-row-count">${fmtArea(e.area)}</span></div>`;
};

function listRooms(plan, L) {
  if (!L.rooms.length) return emptyNote(L, 'Keine Räume erkannt.', 'Erwartet: geschlossene Polylinien auf Layer R_RAUMPOLYGON mit AOID-Text auf R_AOID.');
  return html`<div class="plan-group"><span>Räume · AOID</span><span>${L.rooms.length}</span></div>
    ${L.rooms.map(r => polyRow('rooms', r, r.aoid, r.duplicate ? '(Duplikat)' : ''))}`;
}

/** Geschossflächen: the floor-area polygons on R_GESCHOSSPOLYGON (Bruttogeschossfläche GF), shown as polygons in the viewer. */
function listAreas(plan, L) {
  if (!L.areas.length) return emptyNote(L, 'Kein Geschosspolygon erkannt.', 'Erwartet: geschlossene Polylinie auf Layer R_GESCHOSSPOLYGON (Bruttogeschossfläche des Geschosses).');
  return html`<div class="plan-group"><span>Geschossflächen · GF</span><span>${L.areas.length}</span></div>
    ${L.areas.map(a => polyRow('areas', a, a.aoid || 'Bruttogeschossfläche', a.aoid ? 'Bruttogeschossfläche' : ''))}`;
}

function listLayers(plan, L) {
  if (!L.layers.length) return emptyNote(L, 'Keine Layer.');
  return html`<div class="plan-group"><span>Layer</span><span>${L.layers.length}</span></div>
    ${L.layers.map(l => { const hidden = viewer.hiddenLayers.has(l.name); return html`<label class="plan-row${hidden ? ' is-hidden' : ''}" style="cursor:pointer">
      <input type="checkbox" ${hidden ? '' : raw('checked')} data-plan-layer="${l.name}" aria-label="Layer ${l.name} ein-/ausblenden">
      ${icon(l.ok ? 'circle-check' : 'triangle-alert', 14, l.ok ? '#2f7d63' : '#8a6100')}<span class="plan-swatch" style="background:${l.color}"></span>
      <span class="plan-row-text" title="${l.ok ? 'Zulässiger CAFM-Layer' : 'Unbekannter Layer — nicht in der CAFM-Layerliste'}">${l.name}</span><span class="plan-row-count">${l.count} Objekte</span></label>`; })}`;
}

/** Kennzahlen: two columns like the Prüfplattform — Gebäudevolumen, Gebäudeflächen SIA 416, Flächen DIN 277 | Wirtschaftlichkeit, Donut, Objektübersicht. */
const kpiTable = (title, rows, kind, unit = 'Fläche') => html`<div class="plan-kpi-title">${title}</div><div class="plan-kpi-card"><table class="plan-kpi-table">${!kind ? html`<thead><tr><th colspan="2">${unit === 'Volumen' ? 'Kennzahl' : 'Flächenart'}</th><th class="right">${unit}</th><th class="right" title="Anteil an der Geschossfläche GF">% GF</th></tr></thead>` : ''}<tbody>${rows.map(r => (kind === 'ratio'
  ? html`<tr><td class="abbr">${r.abbr}</td><td>${r.label}</td><td class="right">${r.value}</td></tr>`
  : kind === 'entity'
    ? html`<tr><td class="abbr">${r.type}</td><td class="right" style="width:60px">${r.count}</td><td class="muted ellipsis" title="${r.layers}">${r.layers}</td></tr>`
    : html`<tr class="${r.sum ? 'is-sum' : ''}"><td class="abbr">${r.abbr}</td><td>${r.label}</td><td class="right">${r.value}</td><td class="right muted" style="width:48px">${r.share}</td></tr>`))}</tbody></table></div>`;
const donut = segs => {
  if (!segs.length) return html`<div class="plan-empty" style="padding:14px 0">Keine Flächen für das Diagramm.</div>`;
  const r = 60, c = 2 * Math.PI * r;
  let offset = 0;
  const circles = segs.map(s => { const dash = s.share * c, o = offset; offset += dash; return html`<circle cx="80" cy="80" r="${r}" fill="none" stroke="${s.bg}" stroke-width="24" stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" stroke-dashoffset="${(-o + c * 0.25).toFixed(2)}"><title>${s.text}</title></circle>`; });
  return html`<div class="plan-kpi-donut"><svg viewBox="0 0 160 160" role="img" aria-label="${segs.map(s => s.text).join(', ')}"><circle cx="80" cy="80" r="${r}" fill="none" stroke="#eef0f3" stroke-width="24"></circle>${circles}</svg>
    <div class="plan-kpi-legend">${segs.map(s => html`<span><i style="background:${s.bg}"></i>${s.label}<b>${s.pct}</b></span>`)}</div></div>`;
};
function listKpi(plan) {
  const d = plan.kpiDash;
  if (!d) return html`<div class="plan-empty">Keine Kennzahlen ohne Prüfergebnis.</div>`;
  const segs = plan.siaSegs.map(s => ({ ...s, share: parseFloat(s.pct) / 100 }));
  return html`<div class="plan-kpi-dash">
    <div>
      ${kpiTable('Gebäudevolumen', d.volume, undefined, 'Volumen')}
      ${kpiTable('Gebäudeflächen', d.areas)}
      ${kpiTable('Flächen DIN 277', d.din277)}
    </div>
    <div>
      ${kpiTable('Wirtschaftlichkeitskennzahlen', d.economy, 'ratio')}
      ${donut(segs)}
      ${d.entities.length ? kpiTable('Objektübersicht', d.entities, 'entity') : ''}
      <div class="muted fs-12" style="margin-top:12px;line-height:1.5">Raumpolygone zählen zur HNF, solange keine Nutzungsart aus dem Raumstempel vorliegt (R_RAUMSTEMPEL wird von der Prüfstelle ergänzt). GF aus R_GESCHOSSPOLYGON, KF = GF − NGF. EBF nach SIA 416/1 = GF innerhalb der thermischen Gebäudehülle: ein Geschoss gilt als beheizt, ausser es ist in der Lieferung als unbeheizt markiert (dann 0).</div>
    </div>
  </div>`;
}

/** Result strip, sub tabs and the split view (list | viewer) of a checked plan. */
export function resultPanel(ctx, plan, { height = '' } = {}) {
  const ui = ctx.state.ui;
  const tab = TABS.some(t => t[0] === ui.planTab) ? ui.planTab : 'rules';
  const L = planLists(plan, ui);
  const body = tab === 'kpi' ? listKpi(plan) : { rules: listRules, issues: listIssues, rooms: listRooms, areas: listAreas, layers: listLayers }[tab](plan, L);
  return html`
    ${resultStrip(plan)}
    <div class="plan-tabbar">
      <div class="plan-tabs" role="tablist">${TABS.map(([key, label]) => html`<button type="button" class="plan-tab${key === tab ? ' is-active' : ''}" role="tab" aria-selected="${key === tab ? 'true' : 'false'}" aria-controls="plan-list" data-action="planTab" data-arg="${key}">${label}${L.counts[key] ? html`<span class="plan-tab-count">${L.counts[key]}</span>` : ''}</button>`)}</div>
      <div class="plan-filter" role="group" aria-label="Statusfilter">${FILTERS.map(([key, label, ic]) => { const on = key === L.filter; return html`<button type="button" data-action="planFilter" data-arg="${key}" aria-pressed="${on ? 'true' : 'false'}">${ic ? icon(ic[0], 13, on ? '#fff' : ic[1]) : ''}${label}</button>`; })}</div>
    </div>
    ${tab === 'kpi'
      ? html`<div id="plan-list" role="tabpanel" data-plan-tab="kpi">${body}</div>`
      : html`<div class="plan-split" style="${raw(height ? `height:${height}` : '')}">
      <div class="plan-list" id="plan-list" role="tabpanel" data-plan-tab="${tab}">
        <div class="plan-toolbar">
          ${TOGGLE_TABS.has(tab) ? html`<input type="checkbox" class="plan-toggle-all" data-plan-toggle-all="${tab}" title="Alle im Viewer ein-/ausblenden" aria-label="Alle im Viewer ein-/ausblenden" checked>` : ''}
          <input type="search" class="plan-search" placeholder="${PLACEHOLDER[tab]}" aria-label="${PLACEHOLDER[tab]}" value="${ui.planSearch || ''}" data-input="planSearch" data-fid="plan-search" autocomplete="off" spellcheck="false">
        </div>
        <div class="plan-rows">${body}</div>
      </div>
      ${viewerBox(plan)}
    </div>`}`;
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

/** The toggle-all box mirrors the listed rows: checked, unchecked or indeterminate when only some are hidden. */
function syncToggleAll(list) {
  const all = list.querySelector('input[data-plan-toggle-all]');
  if (!all) return;
  const boxes = list.querySelectorAll('.plan-row input[type="checkbox"]');
  const hidden = [...boxes].filter(cb => !cb.checked).length;
  all.checked = hidden === 0;
  all.indeterminate = hidden > 0 && hidden < boxes.length;
  all.disabled = boxes.length === 0;
}

/** Row checkboxes follow the viewer (its hidden sets outlive the re-render; a new drawing resets them). */
function syncRows(list) {
  for (const cb of list.querySelectorAll('.plan-row input[type="checkbox"]')) {
    const hidden = cb.dataset.planLayer ? viewer.hiddenLayers.has(cb.dataset.planLayer) : viewer.isHidden(cb.dataset.planVis, Number(cb.dataset.id));
    cb.checked = !hidden;
    cb.closest('.plan-row').classList.toggle('is-hidden', hidden);
  }
  syncToggleAll(list);
}

const visKey = cb => (cb.dataset.planLayer ? cb.dataset.planLayer : Number(cb.dataset.id));

function wireList(root, plan) {
  const list = root.querySelector('.plan-list');
  if (!list) return;
  const locate = row => {
    if (!plan.result) return;
    let ok = false;
    if (row.dataset.planLocate != null) {
      const issue = plan.result.issues[Number(row.dataset.planLocate)];
      ok = !!issue && viewer.locateIssue(issue);
    } else if (row.dataset.planRule) {
      const issue = plan.result.issues.find(i => i.code === row.dataset.planRule);
      ok = !!issue && viewer.locateIssue(issue);
    } else if (row.dataset.planRoom) {
      ok = viewer.locateRoom(Number(row.dataset.planRoom));
    } else if (row.dataset.planArea) {
      ok = viewer.locateArea(Number(row.dataset.planArea));
    }
    if (!ok) return;
    markSelected(list, row);
    const cb = row.querySelector('input[data-plan-vis]');   // locating a hidden polygon shows it again
    if (cb && !cb.checked) { cb.checked = true; row.classList.remove('is-hidden'); syncToggleAll(list); }
  };
  list.addEventListener('click', e => {
    if (e.target.closest('input')) return;                 // visibility checkboxes keep their own behaviour (change)
    const row = e.target.closest('.plan-row');
    if (row) locate(row);
  });
  list.addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('.plan-row[role="button"]')) return;
    e.preventDefault();
    locate(e.target);
  });
  list.addEventListener('change', e => {
    const all = e.target.closest('input[data-plan-toggle-all]');
    if (all) {
      const boxes = [...list.querySelectorAll('.plan-row input[type="checkbox"]')];
      for (const cb of boxes) { cb.checked = all.checked; cb.closest('.plan-row').classList.toggle('is-hidden', !all.checked); }
      viewer.setVisible(all.dataset.planToggleAll, boxes.map(visKey), all.checked);
      syncToggleAll(list);
      return;
    }
    const cb = e.target.closest('.plan-row input[type="checkbox"]');
    if (!cb) return;
    viewer.setVisible(cb.dataset.planLayer ? 'layers' : cb.dataset.planVis, [visKey(cb)], cb.checked);
    cb.closest('.plan-row').classList.toggle('is-hidden', !cb.checked);
    syncToggleAll(list);
  });
}

function wireTools(box) {
  box.querySelector('.plan-tools').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.planZoom === 'in') viewer.zoomIn();
    else if (b.dataset.planZoom === 'out') viewer.zoomOut();
    else if (b.dataset.planZoom === 'fit') viewer.fit();
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
  wireTools(box);
  viewer.attach(box, box.querySelector('canvas'));
  if (attachedKey !== key) { viewer.setData(null); attachedKey = key; lastTab = null; }
  if (tab !== lastTab) { viewer.setOverlay(OVERLAY_OF_TAB[tab] || 'base'); lastTab = tab; }

  const show = entry => {
    if (viewer.drawing !== entry.drawing) viewer.setData(entry);
    setViewerState(box, 'ready', '');
  };
  const entry = planSession.get(key);
  syncRows(root.querySelector('.plan-list'));
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
