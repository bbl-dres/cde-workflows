import { html, icon, btn, linkBtn, checkbox, avatar, metaRows, progress, raw, card, headLink, hint } from '../ui.js';
import { emptyState } from '../shell.js';
import { dropZone, resultPanel } from './plan.js';

// Datenformular (design 04.11.2026): the tab bodies of KV-32, KS-31, THG-32 and the floor plans DWG, rendered from the
// view model of model/form.js (F). Übersicht: KPIs, table/chart or plan figures, Lieferung, Verlauf, Beteiligte.
// Erfassung: Hauptgruppen (direct amount or positions, Kostenelemente added/removed) or the Emissionsquellen of the
// Ökobilanz with the Grundlagen card, sticky submit bar. Prüfung: comparison or plan result, Prüfung BBL, Übergabe.
// Beteiligte, Dokumente, Verlauf: tables.

const COLS = 'grid-template-columns:96px minmax(0,1fr) 72px 120px 140px 100px 36px';   // code column holds the fixed-width code control
const SIA_COLS = 'grid-template-columns:52px minmax(0,1fr) 90px 56px';   // Flächen SIA 416: the same grid table as Projektaufgaben
const COLS_THG = 'grid-template-columns:96px minmax(0,1fr) 72px 88px 60px 96px 96px 56px 92px 36px';
const check = c => html`<div class="rv-check">${icon(c.icon, 16, c.color)}<span class="flex-1">${c.label}</span></div>`;
const devCell = c => html`<span class="right${c.hi ? ' is-over' : ''}" ${c.hi ? raw('title="Abweichung über dem Schwellenwert, Begründung nötig"') : ''}>${c.delta}</span>`;
const kvRow = (k, v) => html`<div class="rv-kv"><span class="rv-kv-k">${k}</span><span>${v}</span></div>`;
const RO = F => (F.locked ? raw('readonly') : '');
const DIS = F => (F.locked ? raw('disabled') : '');

export const tabBadge = b => (b ? html`<span class="tab-badge" style="background:${b.bg};color:${b.fg}">${b.n}</span>` : '');

export function renderForm(ctx, F, tab) {
  switch (tab) {
    case 'erfassung': return erfassung(ctx, F);
    case 'pruefung': return pruefung(ctx, F);
    case 'beteiligte': return beteiligte(F);
    case 'dokumente': return dokumente(F);
    case 'verlauf': return verlauf(F);
    default: return uebersicht(ctx, F);
  }
}

// ---- Übersicht ----
function uebersicht(ctx, F) {
  const L = tab => ctx.link.delivery(F.codeLc, tab);
  return html`<div class="fm-cols">
    <div class="fm-main">
      <div class="kpi-grid">
        ${F.kpis.map(k => html`<div class="card kpi"><span class="kpi-k">${k.k}</span><span class="kpi-row"><span class="kpi-v">${k.v}</span><span class="kpi-u">${k.u}</span></span></div>`)}
        <div class="card kpi"><span class="kpi-k">${F.comp.label}</span><span class="kpi-v">${F.comp.pct}</span>${progress(F.comp.w, F.comp.bar)}<span class="fs-12" style="color:${F.comp.fg}">${F.comp.text}</span></div>
      </div>
      ${F.kind === 'plan' ? planOverview(F, L) : costOverview(F, L)}
    </div>
    <div class="fm-side">
      ${card('Lieferung', html`<div style="padding:4px 0 6px">${metaRows(F.meta)}</div>`)}
      ${card(html`<span class="flex-1">Verlauf</span>${headLink('Alle Ereignisse', L('verlauf'))}`, stepsList(F, L))}
      ${card(html`<span class="flex-1">Beteiligte</span>${headLink('Verwalten', L('beteiligte'))}`, html`<div class="pp-list">${F.people.map(p => html`<div class="pp-row">${avatar(p.ini, 28, '#e5e7eb', '#374151')}<div class="flex-1 min-w-0 flex-col"><span class="pp-name">${p.name}</span><span class="pp-firm">${p.firm}</span></div><span class="pp-role">${p.role}</span></div>`)}</div>`)}
    </div>
  </div>`;
}

const stepsList = (F, L) => html`<div class="st-list">${F.steps.map(s => html`<div class="st-row" style="background:${s.rowBg}">
  <span class="st-dot" style="border-color:${s.bd};background:${s.bg};color:${s.fg}">${s.sym}</span>
  <span class="st-label" style="color:${s.lc};font-weight:${s.fw}">${s.label}</span>
  <span class="st-sub">${s.sub}</span>
  ${s.isCur ? html`<div class="st-next"><span class="st-next-text">${F.next.text}</span>${F.next.btn ? html`<div>${btn({ label: F.next.btn, kind: 'primary', nav: L(F.next.tab) })}</div>` : ''}</div>` : ''}
</div>`)}</div>`;

function costOverview(F, L) {
  const C = 'grid-template-columns:52px minmax(0,1fr) 130px 130px 110px';
  return html`
    ${card(html`<span class="flex-1">${F.ov.tableTitle}</span>${headLink('Zur Erfassung', L('erfassung'))}`, html`<div class="fm-table"><div style="min-width:520px">
      <div class="fm-th" style="${C}"><span>Code</span><span>Hauptgruppe</span><span class="right">${F.ov.colCur}</span><span class="right">${F.ov.colPrev}</span><span class="right">${F.ov.colKw}</span></div>
      ${F.costRows.map(c => html`<div class="fm-tr" style="${C};background:${c.bg}"><span class="fm-code">${c.code}</span><span class="ellipsis">${c.name}</span><span class="right">${c.cur}</span><span class="right muted">${c.prev}</span><span class="right muted">${c.kw}</span></div>`)}
      <div class="fm-total" style="${C}"><span></span><span>Total</span><span class="right">${F.totalRow.cur}</span><span class="right muted">${F.totalRow.prev}</span><span class="right muted">${F.totalRow.kw}</span></div>
      ${F.subtotals.length ? html`<div class="fm-space"></div>${F.subtotals.map(u => html`<div class="fm-sub" style="${C}"><span>${u.code}</span><span>${u.name}</span><span class="right">${u.cur}</span><span class="right muted fw-400">${u.prev}</span><span class="right">${u.kw}</span></div>`)}` : ''}
    </div></div>`)}
    ${card(html`<span class="flex-1">${F.ov.chartTitle}</span>${hint(F.ov.chartHint)}`, targetChart(F))}`;
}

const targetChart = F => {
  const K = F.chart;
  return html`<div class="tgt-body">
    <div class="tgt-ist"><span class="kpi-v">${K.ist}</span><span class="kpi-u">${F.ov.istLabel}</span></div>
    <div class="tgt" role="img" aria-label="${K.ist} im Vergleich mit ${K.targets.map(m => m.label + ' ' + m.val).join(', ')}"><div class="tgt-track"></div>${K.hasBand ? html`<div class="tgt-band" style="left:${K.bandL};width:${K.bandW}"></div>` : ''}<div class="tgt-bar" style="width:${K.istW}"></div>
      ${K.targets.map(m => html`<div class="tgt-mark" style="left:${m.x};background:${m.c}"></div><span class="tgt-dot" style="top:${m.ly};left:${m.x};background:${m.c}">${m.n}</span>`)}</div>
    <div class="tgt-axis"><span>${K.min}</span><span>${K.max}</span></div>
    <div class="tgt-legend"><span></span><span class="muted fs-12">Ziel</span><span class="muted fs-12 right">Wert</span><span class="muted fs-12 right">Ist zum Ziel</span>
      ${K.targets.map(m => html`<span class="tgt-n" style="background:${m.c}">${m.n}</span><span class="ellipsis">${m.label}</span><span class="right">${m.val}</span><span class="right" style="color:${m.dc}">${m.delta}</span>`)}
      ${K.hasBand ? html`<span class="tgt-bandsw"></span><span style="color:#374151">Genauigkeit ±${K.acc} % um Kostenziel</span><span class="right" style="color:#374151">${K.band}</span><span></span>` : ''}
    </div>
  </div>`;
};

function planOverview(F, L) {
  const P = F.planOv;
  return html`
    ${card(html`<span class="flex-1">Flächen SIA 416</span>${headLink('Zur Erfassung', L('erfassung'))}`, html`<div class="sia-tbl"><div class="grid-head" style="${SIA_COLS};background:#f4f5f7;height:34px;font-size:12.5px"><span style="grid-column:1/3">Flächenart</span><span class="right">Fläche</span><span class="right" title="Anteil an der Geschossfläche GF">% GF</span></div>${P.sia.map((a, i) => html`<div class="grid-row" style="${SIA_COLS};height:30px;background:${i % 2 ? '#f6f7f9' : '#fff'};border:0;font-weight:${a.fw}"><span class="fw-600">${a.ab}</span><span class="ellipsis">${a.name}</span><span class="right">${a.val}</span><span class="right muted">${a.share}</span></div>`)}</div>`)}
    ${card(html`<span class="flex-1">Prüfregeln nach Kategorie</span>${hint('CAD-Richtlinie BBL V1.0')}`, html`<div class="cat-list">${P.cats.map(c => html`<div class="cat-row"><span>${c.name}</span><div class="cat-bar"><div style="width:${c.wOk};background:#7fb69a"></div><div style="width:${c.wWarn};background:#e0b54a"></div><div style="width:${c.wErr};background:#cf1322"></div></div><span class="right muted">${c.ratio}</span></div>`)}
      <div class="cat-legend"><span><span class="cat-sw" style="background:#7fb69a"></span>Bestanden</span><span><span class="cat-sw" style="background:#e0b54a"></span>Warnung</span><span><span class="cat-sw" style="background:#cf1322"></span>Fehler</span></div></div>`)}`;
}

// ---- Erfassung ----
function erfassung(ctx, F) {
  const body = F.kind === 'plan' ? planEntry(ctx, F) : F.erf.isTHG ? html`${thgHeadCard(F)}${dataEntry(ctx, F)}` : dataEntry(ctx, F);
  return html`<div class="fm-stack">${body}${submitBar(F)}</div>`;
}

/** Card head with title, Importieren menu and Excel export, shared by the cost forms and the Ökobilanz. */
function entryHead(ctx, F) {
  const E = F.erf, open = !!ctx.state.ui.importMenu;
  return html`<div class="card-head" style="flex-wrap:wrap">
      <span class="flex-1" style="flex-basis:220px">${E.tableTitle}</span>
      ${F.locked ? '' : html`<div class="dd">
        <button type="button" class="btn btn-secondary" data-action="toggleImportMenu" aria-haspopup="menu" aria-expanded="${open ? 'true' : 'false'}">Importieren ${icon('chevron-down', 12, 'currentColor')}</button>
        ${open ? html`<div class="dd-menu" role="menu">${E.importItems.map(([key, label]) => html`<button type="button" role="menuitem" class="dd-item" data-action="importItem" data-arg="${key}" data-form="${F.id}">${label}</button>`)}</div>` : ''}
      </div>`}
      <button type="button" class="btn btn-secondary">Excel herunterladen</button>
    </div>
    ${open ? html`<div class="backdrop backdrop-clear" data-action="closeMenus"></div>` : ''}`;
}

function dataEntry(ctx, F) {
  const E = F.erf;
  return html`<div class="card">
    ${entryHead(ctx, F)}
    <div class="fm-table">${E.isTHG ? thgTable(F) : costTable(F)}</div>
    ${E.foot ? html`<div class="card-foot">${E.foot}</div>` : ''}
  </div>`;
}

const costTable = F => {
  const E = F.erf, ro = RO(F);
  return html`<div class="ent">
    <div class="ent-th" style="${COLS}"><span>Code</span><span>Bezeichnung</span><span>Einheit</span><span class="right">${E.qtyLabel}</span><span class="right">${E.valLabel}</span><span class="right">${E.kwLabel}</span><span></span></div>
    ${E.rows.map(r => (r.isGroupRow ? groupRow(F, r, ro) : r.isAdd ? addRow(F, r, 'formAddPos') : r.isNewPos ? newPosRow(F, r, ro) : posRow(F, r, ro)))}
    ${E.rows.length === 0 ? html`<div class="muted fs-13" style="padding:18px 14px">Keine fehlenden Werte.</div>` : ''}
    <div class="ent-total" style="${COLS}"><span></span><span>${E.totalLabel}</span><span></span><span></span><span class="right pr18">${E.totalStr}</span><span class="right muted">${E.totalKw}</span><span></span></div>
    ${F.subtotals.length ? html`<div class="fm-space"></div>${F.subtotals.map(u => html`<div class="ent-subtotal" style="${COLS}"><span>${u.code}</span><span>${u.name}</span><span></span><span></span><span class="right pr18">${u.cur}</span><span class="right">${u.kw}</span><span></span></div>`)}<div style="height:8px"></div>` : ''}
  </div>`;
};

/** Hauptgruppe: the whole row toggles «Aufschlüsseln / Zusammenfassen» (not on locked forms), the chevron is the keyboard target. */
const chevron = (F, r) => (r.canToggle
  ? html`<button type="button" class="ent-toggle" data-action="formMode" data-form="${F.id}" data-group="${r.code}" aria-label="${r.toggleLabel} ${r.code}" aria-expanded="${r.direct ? 'false' : 'true'}">${icon(r.chev, 16, '#374151')}</button>`
  : html`<span class="ent-toggle" aria-hidden="true">${icon(r.chev, 16, '#9ca3af')}</span>`);
const groupAttrs = (F, r) => (r.canToggle ? html`data-action="formMode" data-form="${F.id}" data-group="${r.code}"` : '');
const delBtn = (action, attrs, label) => html`<span class="ent-del-cell"><button type="button" class="ent-del" data-action="${action}" ${attrs} aria-label="${label}" title="${label}">${icon('trash-2', 15, '#6b7280')}</button></span>`;
const addRow = (F, r, action) => html`<div class="ent-add"><button type="button" class="btn-link" data-action="${action}" data-form="${F.id}" data-group="${r.grp}">${r.label}</button></div>`;
const optionList = (r, empty) => html`${r.code ? '' : html`<option value="" selected>${empty}</option>`}${r.opts.map(o => html`<option value="${o.v}" ${o.sel ? raw('selected') : ''}>${o.label}</option>`)}`;
/** Fixed-width code control: the code as label with a chevron, the native select (list «D01 Elektroanlage») invisibly on top. */
const codeControl = (code, select) => html`<span class="ent-code-wrap${code ? '' : ' is-missing'}"><span class="ent-code-fake"><span class="ellipsis">${code || '–'}</span>${icon('chevron-down', 12, 'currentColor')}</span>${select}</span>`;
/** Code of a position: dropdown over the eBKP-H element groups of its Hauptgruppe in the Code column, the name as text in Bezeichnung. */
const codeSelect = (F, r, attrs, fid) => html`<span class="ent-cell-input ent-code-cell">${codeControl(r.code, html`<select class="ent-select ent-code-select" aria-label="Kostenelement${r.code ? ' ' + r.code : ''}" ${attrs} data-form="${F.id}" data-group="${r.grp}" data-fid="${fid}" ${DIS(F)}>${optionList(r, 'Kostenelement wählen…')}</select>`)}</span><span class="ellipsis${r.code ? '' : ' muted'}">${r.code ? r.name : 'Kostenelement wählen…'}</span>`;

const groupRow = (F, r, ro) => html`<div class="ent-group${r.canToggle ? ' is-toggle' : ''}" style="${COLS};background:${r.bg}" ${groupAttrs(F, r)}>
  <span class="ent-code">${chevron(F, r)}${r.code}</span>
  <span class="ent-name"><span class="fw-600">${r.name}</span></span>
  <span class="muted fs-12">${r.unit}</span>
  <span class="right muted">${r.bez}</span>
  ${r.direct
    ? html`<span class="ent-cell-input"><input class="ent-input fw-600" aria-label="${F.erf.valLabel} ${r.code} ${r.name}" value="${r.gStr}" placeholder="fehlt" style="border-color:${r.gBd};background:${F.erf.inputBg}" ${r.gKey ? html`data-change="setMap" data-key="${r.gKey}" data-code="${r.code}" data-fid="${r.gKey}-${r.code}"` : html`data-change="formGroupVal" data-form="${F.id}" data-group="${r.code}" data-fid="${F.id}-g-${r.code}"`} ${ro}></span>`
    : html`<span class="right fw-600 pr18">${r.sum}</span>`}
  <span class="right muted fs-125">${r.kw}</span>
  <span></span>
</div>`;

/** A position: base position of the eBKP-H, or the Pauschalbetrag of a Hauptgruppe without positions (not removable). */
const posRow = (F, r, ro) => html`<div class="ent-pos${r.pauschal ? ' ent-pauschal' : ''}" style="${COLS}">
  ${r.pauschal || F.locked
    ? html`<span class="ent-pos-code">${r.pauschal ? '' : r.code}</span><span class="ellipsis${r.pauschal ? ' muted' : ''}">${r.name}</span>`
    : codeSelect(F, r, html`data-change="formPosCode" data-code="${r.code}"`, `${r.vKey}-code-${r.code}`)}
  <span class="muted fs-12">${r.unit}</span>
  ${r.hasQty ? html`<span class="ent-cell-input"><input class="ent-input" aria-label="Menge ${r.code}" value="${r.qStr}" placeholder="fehlt" style="border-color:${r.qBd};background:${F.erf.inputBg}" data-change="setMap" data-key="${r.qKey}" data-code="${r.code}" data-fid="${r.qKey}-${r.code}" ${ro}></span>` : html`<span class="right muted fs-12">–</span>`}
  <span class="ent-cell-input"><input class="ent-input" aria-label="${F.erf.valLabel} ${r.pauschal ? r.name + ' ' : ''}${r.code}" value="${r.vStr}" placeholder="fehlt" style="border-color:${r.vBd};background:${F.erf.inputBg}" data-change="setMap" data-key="${r.vKey}" data-code="${r.code}" data-fid="${r.vKey}-${r.code}" ${ro}></span>
  <span class="right muted fs-125">${r.kw}</span>
  ${r.canDel ? delBtn('formRemovePos', html`data-form="${F.id}" data-code="${r.code}"`, `Kostenelement ${r.code} entfernen`) : html`<span></span>`}
</div>`;

/** A Kostenelement added in the Erfassung: eBKP-H element group from the list, Menge and Kosten. */
const newPosRow = (F, r, ro) => html`<div class="ent-pos ent-new" style="${COLS}">
  ${codeSelect(F, r, html`data-change="formNewVal" data-id="${r.id}" data-field="code"`, `${F.id}-new-${r.id}-code`)}
  <span class="muted fs-12">${r.unit}</span>
  ${r.hasQty ? html`<span class="ent-cell-input"><input class="ent-input" aria-label="Menge" value="${r.qStr}" placeholder="fehlt" style="border-color:${r.qBd};background:${F.erf.inputBg}" data-change="formNewVal" data-form="${F.id}" data-id="${r.id}" data-field="q" data-fid="${F.id}-new-${r.id}-q" ${ro}></span>` : html`<span class="right muted fs-12">–</span>`}
  <span class="ent-cell-input"><input class="ent-input" aria-label="${F.erf.valLabel}" value="${r.vStr}" placeholder="fehlt" style="border-color:${r.vBd};background:${F.erf.inputBg}" data-change="formNewVal" data-form="${F.id}" data-id="${r.id}" data-field="v" data-fid="${F.id}-new-${r.id}-v" ${ro}></span>
  <span class="right muted fs-125">${r.kw}</span>
  ${!F.locked ? delBtn('formDropNew', html`data-form="${F.id}" data-id="${r.id}"`, 'Neue Zeile verwerfen') : html`<span></span>`}
</div>`;

// ---- Erfassung: Ökobilanz (Emissionsquellen je eBKP-H-Elementgruppe) ----
const thgHeadCard = F => card('Grundlagen der Ökobilanz', html`<div class="thg-head">${F.erf.head.map(h => html`<label class="thg-field"><span>${h.label}</span>
  ${h.isSelect
    ? html`<select class="ent-select" aria-label="${h.label}" style="background:${h.bg}" data-change="thgHead" data-key="${h.key}" data-fid="thg-head-${h.key}" ${h.ro ? raw('disabled') : ''}>${h.opts.map(o => html`<option value="${o.v}" ${o.sel ? raw('selected') : ''}>${o.v}</option>`)}</select>`
    : html`<input class="ent-text" aria-label="${h.label}" value="${h.val}" style="background:${h.bg}" readonly>`}
</label>`)}</div>`);

const thgTable = F => {
  const E = F.erf, ro = RO(F);
  return html`<div class="ent ent-thg">
    <div class="ent-th" style="${COLS_THG}"><span>Code</span><span title="Position der gewählten Ökobilanzdaten (Bezeichnung · ID), z. B. KBOB/ecobau-Liste 2022">Ökobilanzdaten</span><span class="center" title="Herstellerspezifischer Datensatz oder EPD statt KBOB-Durchschnitt">Hersteller</span><span class="right">Menge</span><span>Einheit</span><span class="right">Herstellung</span><span class="right">Entsorgung</span><span class="right">Amort.</span><span class="right">kg/m² EBF·a</span><span></span></div>
    ${E.rows.map(r => (r.isGroupRow ? thgGroupRow(F, r) : r.isAdd ? addRow(F, r, 'thgAdd') : thgSrcRow(F, r, ro)))}
    ${E.rows.length === 0 ? html`<div class="muted fs-13" style="padding:18px 14px">Keine fehlenden Werte.</div>` : ''}
    <div class="ent-total" style="${COLS_THG}"><span></span><span>${E.totalLabel}</span><span></span><span></span><span></span><span class="right pr18">${E.tot.h}</span><span class="right pr18">${E.tot.e}</span><span></span><span class="right muted">${E.tot.kw}</span><span></span></div>
    <div class="fm-space"></div>
    ${E.derived.map(u => html`<div class="ent-subtotal" style="${COLS_THG}"><span></span><span>${u.name}</span><span class="right pr18" style="grid-column:4 / span 4" title="${u.u}">${u.v}</span><span class="right" style="grid-column:8 / span 2" title="${u.ku}">${u.kw}</span><span></span></div>`)}
    <div style="height:8px"></div>
  </div>`;
};

const thgGroupRow = (F, r) => html`<div class="ent-group${r.canToggle ? ' is-toggle' : ''}" style="${COLS_THG};background:${r.bg}" ${groupAttrs(F, r)}>
  <span class="ent-code">${chevron(F, r)}${r.code}</span>
  <span class="ent-name"><span class="fw-600">${r.name}</span><span class="ent-sub">${r.sub}</span></span>
  <span></span><span></span><span></span>
  <span class="right fw-600 pr18">${r.h}</span>
  <span class="right fw-600 pr18">${r.e}</span>
  <span></span>
  <span class="right muted fs-125">${r.kw}</span>
  <span></span>
</div>`;

const hsBox = (F, r) => html`<span class="center"><button type="button" class="hs-box${r.hs ? ' is-on' : ''}" role="checkbox" aria-checked="${r.hs ? 'true' : 'false'}" aria-label="Herstellerspezifisch ${r.code || ''}" title="Herstellerspezifischer Datensatz oder EPD statt KBOB-Durchschnitt" data-action="thgToggleHs" data-id="${r.id}" ${DIS(F)}>${r.hs ? '✓' : ''}</button></span>`;
const numCell = (F, r, field, label, str, bdc, ro) => html`<span class="ent-cell-input"><input class="ent-input" aria-label="${label} ${r.code || ''}" value="${str}" placeholder="fehlt" style="border-color:${bdc};background:${F.erf.inputBg}" data-change="thgVal" data-id="${r.id}" data-field="${field}" data-fid="thg-${r.id}-${field}" ${ro}></span>`;

/** An Emissionsquelle: existing (code, KBOB dataset) or new (element group from the list, KBOB dataset to search). */
const thgSrcRow = (F, r, ro) => html`<div class="ent-pos ent-src${r.isNew ? ' ent-new' : ''}" style="${COLS_THG}">
  ${!F.locked
    ? html`<span class="ent-cell-input ent-code-cell">${codeControl(r.code, html`<select class="ent-select" aria-label="Elementgruppe${r.code ? ' ' + r.code : ''}" data-change="thgVal" data-id="${r.id}" data-field="code" data-fid="thg-${r.id}-code" ${DIS(F)}>${optionList(r, 'wählen…')}</select>`)}</span>
      <span class="ent-cell-input pl6"><input class="ent-text" aria-label="Ökobilanzdaten-Position" value="${r.dataset}" placeholder="Position der Ökobilanzdaten (Bezeichnung oder ID)…" style="border-color:${r.kbobBd};background:${F.erf.inputBg}" data-change="thgVal" data-id="${r.id}" data-field="dataset" data-fid="thg-${r.id}-kbob" ${ro}></span>`
    : html`<span class="ent-pos-code">${r.code}</span>
      <span class="ent-two"><span class="ellipsis">${r.name}</span><span class="fs-12 muted ellipsis" title="${r.kbob}">${r.kbob}</span></span>`}
  ${hsBox(F, r)}
  ${numCell(F, r, 'q', 'Menge', r.qStr, r.qBd, ro)}
  <span class="muted fs-12">${r.unit}</span>
  ${numCell(F, r, 'h', 'Herstellung', r.hStr, r.hBd, ro)}
  ${numCell(F, r, 'e', 'Entsorgung', r.eStr, r.eBd, ro)}
  <span class="right muted fs-125">${r.amort}</span>
  <span class="right muted fs-125">${r.kw}</span>
  ${!F.locked ? delBtn('thgRemove', html`data-id="${r.id}"`, r.isNew ? 'Neue Zeile verwerfen' : 'Emissionsquelle entfernen') : html`<span></span>`}
</div>`;

function planEntry(ctx, F) {
  const p = F.plan;
  return html`<div class="card">
    <div class="card-head" style="flex-wrap:wrap">
      <span class="flex-1 min-w-0" style="flex-basis:220px">${F.erf.tableTitle}${p.fileName ? html` <span class="card-hint">· ${p.fileName}${F.erf.fileMeta ? ' · ' + F.erf.fileMeta : ''}</span>` : ''}</span>
      ${p.result ? btn({ label: 'Prüfbericht', icon: 'download', action: 'planReport', key: p.key, title: 'Prüfbericht als PDF herunterladen' }) : ''}
      ${p.result && !F.locked ? html`<label class="btn btn-secondary btn-file">${icon('upload', 13, 'currentColor')}Neu hochladen<input type="file" accept=".dwg" class="vh" data-change="planFile" data-key="${p.key}" aria-label="DWG-Datei neu hochladen"></label>
        <button type="button" class="btn btn-secondary" data-action="planLoadSample" data-key="${p.key}">Musterplan laden</button>
        ${linkBtn({ label: 'Entfernen', cls: 'fs-12', action: 'planRemove', key: p.key })}` : ''}
      ${F.locked ? html`<span class="muted fs-12">Erfassung gesperrt</span>` : ''}
    </div>
    ${p.busy ? html`<div class="note note-grey" style="margin:10px 12px 6px"><span class="plan-spin">${icon('loader-circle', 14, '#5b6573')}</span>${p.busy}</div>` : ''}
    ${p.error ? html`<div class="note note-rose" style="margin:10px 12px 6px">${icon('circle-alert', 14, '#9b2c44')}${p.error}</div>` : ''}
    ${!p.result ? html`<div style="padding:40px 20px 36px">${dropZone(p)}</div>` : resultPanel(ctx, p)}
  </div>`;
}

function submitBar(F) {
  const B = F.bar, A = F.act;
  if (B.locked) return html`<div class="submit-bar"><span class="fs-13 flex-1" style="min-width:240px">${B.lockedText}</span>${linkBtn({ label: 'Erfassung wieder öffnen (Prototyp)', cls: 'fs-125', action: A.reopen, key: F.id })}</div>`;
  return html`<div class="submit-bar">
    <div class="submit-comp"><span class="fs-125" style="color:#374151">${B.compText}</span>${progress(B.compW, B.compBar)}</div>
    ${B.canFilter ? checkbox({ checked: F.erf.missingOnly, label: 'Nur fehlende Werte anzeigen', action: 'formToggleMissing', key: F.id }) : ''}
    <span class="flex-1"></span>
    ${B.reason ? html`<span class="submit-reason">${B.reason}</span>` : ''}
    ${btn({ label: B.label, kind: 'primary', cls: 'btn-lg', action: A.submit, key: F.id, disabled: !B.canSubmit })}
  </div>`;
}

// ---- Prüfung ----
function pruefung(ctx, F) {
  const L = tab => ctx.link.delivery(F.codeLc, tab), A = F.act;
  return html`<div class="fm-cols">
    <div class="fm-main">${F.kind === 'plan' ? planResult(F, L) : compareCard(F)}</div>
    <div class="fm-side">
      ${card(html`<span class="flex-1">Prüfung BBL</span>${hint(`${F.reviewer}, BBL`)}`, html`<div class="card-body flex-col" style="gap:10px">
        ${F.rv.notSubmitted ? html`<div class="note note-grey">Wartet auf die Einreichung durch ${F.leadName}.</div>` : F.autoChecks.map(check)}
        <div class="rv-manual">${F.manual.map(m => checkbox({ checked: m.checked, label: m.label, action: A.toggle, key: m.key, arg: F.id, disabled: m.disabled }))}</div>
        <textarea class="rv-textarea" placeholder="Kommentar an Lieferant (bei Rückweisung Pflicht)" aria-label="Kommentar an Lieferant" data-change="${A.comment}" data-key="${F.id}" data-fid="${F.id}-comment" ${F.rv.decide ? '' : raw('readonly')}>${F.rv.comment}</textarea>
        ${F.rv.decide ? html`<div class="rv-actions">
          <span class="fs-12 muted flex-1" style="min-width:120px">${F.rv.reason}</span>
          ${btn({ label: 'Zurückweisen', action: A.reject, key: F.id, disabled: !F.rv.canReview })}
          ${btn({ label: 'Freigeben', kind: 'primary', action: A.approve, key: F.id, disabled: !F.rv.canApprove })}
        </div>` : ''}
        ${F.rv.done ? html`<div class="rv-note rv-note-green">${F.rv.doneText} ${linkBtn({ label: 'Zurücksetzen', action: A.reset, key: F.id })}</div>` : ''}
      </div>`)}
      ${card('Übergabe', html`<div style="padding:4px 0 6px">${kvRow('Zielsystem', F.handover.ziel)}${kvRow('Wert', F.handover.value)}${kvRow('Status', F.handover.status)}</div>${F.canTransfer ? html`<div style="padding:0 14px 14px">${btn({ label: `An ${F.target} übertragen`, kind: 'primary', action: A.transfer, key: F.id })}</div>` : ''}`)}
    </div>
  </div>`;
}

function compareCard(F) {
  const C = 'grid-template-columns:64px minmax(0,1fr) 130px 130px 100px';
  return card(`Vergleich mit Vorphase ${F.cmpPrevLabel}`, html`<div class="fm-table"><div style="min-width:540px">
    <div class="fm-th" style="${C}"><span>Code</span><span>Bezeichnung</span><span class="right">${F.code} ${F.cmpUnit}</span><span class="right">${F.cmpPrevLabel} ${F.cmpUnit}</span><span class="right">Abweichung</span></div>
    ${F.cmp.map(c => html`<div class="fm-tr" style="${C}"><span class="fw-600">${c.code}</span><span class="ellipsis">${c.name}</span><span class="right">${c.cur}</span><span class="right muted">${c.prev}</span>${devCell(c)}</div>`)}
    <div class="fm-total" style="${C}"><span></span><span>Total</span><span class="right">${F.cmpT.cur}</span><span class="right muted">${F.cmpT.prev}</span>${devCell(F.cmpT)}</div>
    ${F.subtotals.length ? html`<div class="fm-space"></div>${F.subtotals.map(u => html`<div class="fm-sub" style="${C}"><span>${u.code}</span><span>${u.name}</span><span class="right">${u.cur}</span><span class="right muted fw-400">${u.prev}</span>${devCell(u)}</div>`)}<div style="height:8px"></div>` : ''}
  </div></div><div class="card-foot">Abweichungen ab ${F.devPct} % sind rot markiert und brauchen eine Begründung.</div>`);
}

function planResult(F, L) {
  const R = F.res, p = F.plan;
  return card(html`<span class="flex-1">Prüfergebnis</span>${p.fileName ? hint(p.fileName) : ''}`, F.rv.notSubmitted
    ? html`<div class="muted fs-125" style="padding:28px 16px">Die Lieferung wurde noch nicht eingereicht (Status ${F.status}). Das Prüfergebnis ist nach der Einreichung durch den Lieferverantwortlichen sichtbar.</div>`
    : html`<div class="res-row"><span class="res-sym" style="background:${R.bg};color:${R.fg}">${R.sym}</span><div class="flex-col" style="gap:2px"><span class="res-title">${R.title}</span><span class="res-sub">${R.sub}</span></div></div>
      <div style="padding:0 14px 6px">${F.reviewIssues.map(it => html`<div class="res-issue">${icon(it.icon, 16, it.color)}<span>${it.text}</span><span class="res-code">${it.code}${it.count ? ` · ${it.count}×` : ''}</span></div>`)}</div>
      <div style="padding:8px 14px 12px"><a class="fs-125" href="#${L('erfassung')}" data-nav="${L('erfassung')}">Im Plan anzeigen</a></div>`);
}

// ---- Beteiligte · Dokumente · Verlauf ----
function beteiligte(F) {
  const C = 'grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) 150px minmax(0,1.2fr) 130px 80px';
  return html`<div class="fm-stack">${card(html`<span class="flex-1">Beteiligte an dieser Lieferung</span><button type="button" class="btn btn-secondary">Bearbeitende hinzufügen</button>`, html`<div class="fm-table"><div style="min-width:760px">
    <div class="fm-th" style="${C};padding:0 12px;gap:0 12px"><span>Person</span><span>Firma</span><span>Rolle</span><span>Bereich</span><span>Status</span><span></span></div>
    ${F.peopleRows.map(p => html`<div class="fm-tr" style="${C};min-height:46px;padding:0 12px;gap:0 12px;background:${p.bg}">
      <span class="flex items-center gap-8 min-w-0">${avatar(p.ini, 24, '#aab2bc')}<span class="ellipsis">${p.name}</span></span><span class="ellipsis">${p.firm}</span><span class="fw-500">${p.role}</span><span class="ellipsis" style="color:#3d4650">${p.scope}</span><span style="color:${p.stC}">${p.st}</span>
      <span class="flex justify-end gap-6"><button type="button" class="btn-icon" title="Rolle und Bereich bearbeiten" aria-label="Rolle und Bereich bearbeiten">${icon('pencil', 14, '#374151')}</button>${p.editable ? html`<button type="button" class="btn-icon btn-icon-danger" title="Aus Lieferung entfernen" aria-label="Aus Lieferung entfernen">${icon('trash-2', 14, '#374151')}</button>` : ''}</span>
    </div>`)}
  </div></div>`)}</div>`;
}

function dokumente(F) {
  const C = 'grid-template-columns:minmax(0,2fr) 70px 90px minmax(0,1fr) 100px';
  return card(html`<span class="flex-1">Dokumente</span><button type="button" class="btn btn-secondary">Hochladen</button>`, html`<div class="fm-table"><div style="min-width:620px">
    <div class="fm-th" style="${C}"><span>Name</span><span>Typ</span><span>Pflicht</span><span>Hochgeladen von</span><span>Datum</span></div>
    ${F.docs.map(d => html`<div class="fm-tr" style="${C};min-height:40px"><a class="ellipsis" title="${d.name}">${d.name}</a><span>${d.type}</span><span style="color:${d.reqFg};font-weight:${d.reqFw}">${d.req}</span><span class="ellipsis">${d.by}</span><span>${d.date}</span></div>`)}
    ${F.docs.length === 0 ? html`<div style="padding:28px 0">${emptyState('Keine Dokumente')}</div>` : ''}
  </div></div><div class="card-foot">Pflichtdokumente sind Teil der Einreichung. Fehlt eines, ist «Einreichen» gesperrt.</div>`);
}

function verlauf(F) {
  const C = 'grid-template-columns:140px 170px minmax(0,1fr) minmax(0,1.5fr)';
  return card(html`<span class="flex-1">Verlauf</span>${hint(`${F.hist.length} Ereignisse, neueste zuerst`)}`, html`<div class="fm-table"><div style="min-width:720px">
    <div class="fm-th" style="${C}"><span>Datum</span><span>Person</span><span>Ereignis</span><span>Details</span></div>
    ${F.hist.map(h => html`<div class="fm-tr hist-row" style="${C}"><span>${h.d}${h.time ? ' ' + h.time : ''}</span><span class="ellipsis" title="${h.firm}">${h.name}</span><span class="fw-500 ellipsis" title="${h.t}">${h.t}</span><span class="muted ellipsis" title="${h.detail}">${h.detail}</span></div>`)}
  </div></div>`);
}
