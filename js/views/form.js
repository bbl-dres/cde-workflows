import { html, icon, btn, linkBtn, checkbox, avatar, metaRows, progress, raw, card, headLink, hint } from '../ui.js';
import { emptyState } from '../shell.js';
import { dropZone, resultPanel } from './plan.js';

// Datenformular (design 05.11.2026): the tab bodies of KV-32, KS-31, THG-32 and the floor plans DWG, rendered from the
// view model of model/form.js (F). Übersicht: KPIs, table/chart or plan figures, Lieferung, Verlauf, Beteiligte; the
// Ökobilanz adds the shared Grundlagen and the Zielwerte SIA 390/1. Erfassung: Hauptgruppen (direct amount or positions,
// Kostenelemente added/removed) or the Emissionsquellen of the Erstellung with their Grundlagen; Erfassung Betrieb (THG-32
// only): Energiedienstleistungen nach Rechenhilfe SIA 390/1 with Photovoltaik; sticky submit bar. Prüfung: comparison or plan
// result, Prüfung BBL, Übergabe. Beteiligte, Dokumente, Verlauf: tables.

const COLS = 'grid-template-columns:96px minmax(0,1fr) 72px 120px 140px 100px 36px';   // code column holds the fixed-width code control
const SIA_COLS = 'grid-template-columns:52px minmax(0,1fr) 90px 56px';   // Flächen SIA 416: the same grid table as Projektaufgaben
const COLS_THG = 'grid-template-columns:96px minmax(0,1fr) 72px 110px 64px 104px 72px 36px';   // Erstellung: Code · Emissionsquelle · Hersteller · Referenzgrösse · Einheit · kg/m² EBF·a · Anteil
const COLS_BETR = 'grid-template-columns:minmax(0,1fr) 92px 104px 88px 88px 100px 112px 112px';   // Betrieb: Energiedienstleistung · Projektwert · Nutzenergie · Anteil · η · Endenergie · Koeffizient · kg/m² EBF·a
const kvRow = (k, v) => html`<div class="rv-kv"><span class="rv-kv-k">${k}</span><span>${v}</span></div>`;
const RO = F => (F.locked ? raw('readonly') : '');
/** Icon from a URL (Hauptgruppen pictograms in assets/ebkp, lucide icons in assets/icons), as a CSS mask like icon(). */
const urlIcon = (url, size = 18) => html`<span class="ic" style="width:${size}px;height:${size}px;background:currentColor;-webkit-mask:url(${url}) center/contain no-repeat;mask:url(${url}) center/contain no-repeat" aria-hidden="true"></span>`;
const OV_COLS = 'grid-template-columns:28px minmax(120px,220px) minmax(0,1fr) 60px 44px 56px';   // bar lists of the Übersicht: icon · name · bar · value · share · Δ
const DIS = F => (F.locked ? raw('disabled') : '');


export function renderForm(ctx, F, tab) {
  switch (tab) {
    case 'erfassung': return erfassung(ctx, F);
    case 'betrieb': return betrieb(ctx, F);
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
        ${F.kpis.map(k => html`<div class="card kpi" title="${k.tip}"><span class="kpi-k">${k.k}</span><span class="kpi-row"><span class="kpi-v">${k.v}</span><span class="kpi-u">${k.u}</span></span></div>`)}
        <div class="card kpi" title="${F.comp.tip}"><span class="kpi-k">${F.comp.label}</span><span class="kpi-v">${F.comp.pct}</span>${progress(F.comp.w, F.comp.bar)}<span class="fs-12" style="color:${F.comp.fg}">${F.comp.text}</span></div>
      </div>
      ${F.kind === 'plan' ? planOverview(F, L) : F.erf.isTHG ? thgOverview(F, L, ctx) : costOverview(F, L)}
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
  return html`${card(html`<span class="flex-1">${F.ov.chartTitle}</span>${headLink('Zur Erfassung', L('erfassung'))}`, html`${targetChart(F)}<div class="card-foot">${F.ov.chartHint}</div>`)}
    ${card(html`<span class="flex-1">Kosten nach Hauptgruppen</span>${headLink('Zur Erfassung', L('erfassung'))}`, html`${ovListBody(F, F.ovList)}<div class="card-foot">${F.ovList.foot}</div>`)}`;
}

/** Bar list of the Übersicht (design 05.11.2026): one row per Hauptgruppe or Energiedienstleistung, the previous phase as a tick, share and Δ; rows open the Erfassung. */
const ovRow = (F, g) => html`<div class="ov-row${g.tab ? ' is-link' : ''}" style="${OV_COLS}" title="${g.tip}${g.tab ? ' · Klick öffnet die Erfassung' : ''}" ${g.tab ? html`role="link" tabindex="0" data-action="formOpenGroup" data-form="${F.id}" data-group="${g.code}" data-tab="${g.tab}"` : ''}>
  <span class="ov-ic">${urlIcon(g.icon)}</span>
  <span class="ellipsis"><span class="fw-600">${g.code}</span> ${g.name}</span>
  <div class="ov-bar"><div class="ov-track"></div><div class="ov-fill" style="width:${g.w}${g.bc ? ';background:' + g.bc : ''}"></div>${g.tx != null ? html`<div class="ov-tick" style="left:${g.tx}"></div>` : ''}</div>
  <span class="right fw-600">${g.cur}</span><span class="right muted fs-12">${g.share}</span><span class="right" style="color:${g.dfg};font-weight:${g.dw}" title="${g.dp}">${g.d}</span>
</div>`;
const ovListBody = (F, Lst) => html`<div class="fm-table"><div class="ov-body">
  <div class="ov-head" style="${OV_COLS}"><span></span><span>${Lst.col}</span><div class="ov-axis"><span>0</span><span>${Lst.max}</span></div><span class="right" title="${Lst.unitTip}">${Lst.unit}</span><span class="right" title="Anteil am Total">Anteil</span><span class="right" title="${Lst.dTip}">${Lst.dUnit}</span></div>
  ${Lst.rows.map(g => ovRow(F, g))}
  ${Lst.rows.length === 0 ? html`<div class="muted fs-13" style="padding:14px 0">Noch keine Werte erfasst.</div>` : ''}
  <div class="ov-total" style="${OV_COLS}"><span></span><span>${Lst.totalLabel}</span><span class="muted fs-12">${Lst.prevText}</span><span class="right fw-600" title="${Lst.totTip}">${Lst.tot}</span><span class="right muted fs-12">100 %</span><span class="right" title="${Lst.dTip}">${Lst.dTot}</span></div>
  ${Lst.subs.length ? html`<div style="height:10px"></div>${Lst.subs.map(u => html`<div class="ov-sub" style="${OV_COLS}"><span></span><span><span>${u.code}</span> ${u.name}</span><span class="muted fs-12 fw-400">${u.prevText}</span><span class="right">${u.cur}</span><span class="right muted fs-12 fw-400">${u.share}</span><span class="right fw-400" style="color:${u.dfg};font-weight:${u.dw}">${u.d}</span></div>`)}` : ''}
</div></div>`;

/** Ökobilanz: the Grundlagen shared by Erstellung and Betrieb, the Hauptgruppen with the Betrieb rows, the Zielwerte SIA 390/1. */
function thgOverview(F, L, ctx) {
  const area = ctx.state.ui.ovArea === 'b' ? 'b' : 'e', Lst = area === 'b' ? F.ovBetr : F.ovList;
  return html`${card(html`<span class="flex-1">Grundlagen</span>${hint('gilt für Erstellung und Betrieb')}`, headFields(F, F.headShared))}
    ${card(html`<span class="flex-1">${F.tz.title}</span>${headLink('Zur Erfassung', L('erfassung'))}`, html`${zielwerte(F)}<div class="card-foot">${F.tz.hint}</div>`)}
    ${card(html`<span class="flex-1">Wo entstehen die Emissionen?</span>${headLink('Zur Erfassung', L(area === 'b' ? 'betrieb' : 'erfassung'))}`, html`<div class="seg" role="group" aria-label="Bereich">${[['e', 'Erstellung'], ['b', 'Betrieb']].map(([k, label]) => html`<button type="button" class="seg-btn${area === k ? ' is-on' : ''}" data-action="ovArea" data-arg="${k}" aria-pressed="${area === k ? 'true' : 'false'}">${label}</button>`)}</div>${ovListBody(F, Lst)}<div class="card-foot">${Lst.foot}</div>`)}`;
}

const targetChart = F => {
  const K = F.chart;
  return html`<div class="tgt-body">
    <div class="tgt-ist" title="${K.istTip}"><span class="kpi-v">${K.ist}</span><span class="kpi-u">${F.ov.istLabel}</span></div>
    <div class="tgt" role="img" aria-label="${K.ist} im Vergleich mit ${K.targets.map(m => m.label + ' ' + m.val).join(', ')}"><div class="tgt-track"></div>${K.hasBand ? html`<div class="tgt-band" style="left:${K.bandL};width:${K.bandW}"></div>` : ''}<div class="tgt-bar" style="width:${K.istW}"></div>
      ${K.targets.map(m => html`<div class="tgt-mark" style="left:${m.x};background:${m.c}"></div><span class="tgt-dot" style="top:${m.ly};left:${m.x};background:${m.c}">${m.n}</span>`)}</div>
    <div class="tgt-axis"><span>${K.min}</span><span>${K.max}</span></div>
    <div class="tgt-legend"><span></span><span class="muted fs-12">Ziel</span><span class="muted fs-12 right">Wert</span><span class="muted fs-12 right" title="Abweichung des Ist-Werts vom Zielwert">Ist zum Ziel</span>
      ${K.targets.map(m => html`<span class="tgt-n" style="background:${m.c}">${m.n}</span><span class="ellipsis">${m.label}</span><span class="right">${m.val}</span><span class="right" style="color:${m.dc}" title="Ist ${K.ist} zu ${m.label} ${m.val}">${m.delta}</span>`)}
      ${K.hasBand ? html`<span class="tgt-bandsw"></span><span style="color:#374151">Genauigkeit ±${K.acc} % um Kostenziel</span><span class="right" style="color:#374151">${K.band}</span><span></span>` : ''}
    </div>
  </div>`;
};

/** Zielwerte SIA 390/1: Erstellung and Betrieb against their Richtwerte, the sum against the Zusatzanforderung; the marks are
 *  Basis (B), ambitioniert (A), Minergie-ECO GW1 (M) and the Vorphase (V), the legend lists the values per column. */
const zielwerte = F => {
  const Z = F.tz;
  return html`<div class="tz-body">
    ${Z.rows.map(r => html`<div class="tz-row"><span class="tz-label">${r.label}</span>
      <div class="tz-track-wrap" role="img" aria-label="${r.label} ${r.ist}${r.marks.length ? ', ' + r.marks.map(m => m.title).join(', ') : ''}"><div class="tz-track"></div><div class="tz-bar" style="width:${r.istW}"></div>
        ${r.marks.map(m => html`<div class="tz-mark" style="left:${m.x};background:${m.c}"></div><span class="tz-dot${m.below ? ' is-below' : ''}" style="left:${m.x};background:${m.c}" title="${m.title}">${m.n}</span>`)}</div>
      <span class="tz-ist" title="${r.tip}">${r.ist}</span></div>`)}
    <div class="tz-axis"><span></span><span><span>0</span><span>${Z.max}</span></span><span></span></div>
    <div class="tz-legend"><span></span><span class="muted fs-12">Ziel</span><span class="muted fs-12 right" title="Richtwert Erstellung, informativ">Erstellung</span><span class="muted fs-12 right" title="Richtwert Betrieb, informativ">Betrieb</span><span class="muted fs-12 right" title="Höchstwert für Erstellung + Betrieb, einzuhalten">Zusatzanforderung</span>
      <span class="tz-sw"></span><span class="fw-600">Ist</span>${Z.ist.map(v => html`<span class="right fw-600">${v}</span>`)}
      ${Z.legend.map(m => html`<span class="tgt-n" style="background:${m.c}">${m.n}</span><span class="ellipsis">${m.label}</span>${m.cells.map(c => html`<span class="right${c.over ? ' is-over' : ''}">${c.v}</span>`)}`)}
    </div>
  </div>`;
};

function planOverview(F, L) {
  const P = F.planOv;
  return html`
    ${card(html`<span class="flex-1">Flächen SIA 416 · EBF SIA 416/1</span>${headLink('Zur Erfassung', L('erfassung'))}`, html`<div class="sia-tbl"><div class="grid-head" style="${SIA_COLS};background:#f4f5f7;height:34px;font-size:12.5px"><span style="grid-column:1/3">Flächenart</span><span class="right">Fläche</span><span class="right" title="Anteil an der Geschossfläche GF">% GF</span></div>${P.sia.map((a, i) => html`<div class="grid-row" style="${SIA_COLS};height:30px;background:${i % 2 ? '#f6f7f9' : '#fff'};border:0;font-weight:${a.fw}" title="${a.tip}"><span class="fw-600">${a.ab}</span><span class="ellipsis">${a.name}</span><span class="right">${a.val}</span><span class="right muted">${a.share}</span></div>`)}</div>`)}
    ${card(html`<span class="flex-1">Prüfregeln nach Kategorie</span>${hint('CAD-Richtlinie BBL V1.0')}`, html`<div class="cat-list">${P.cats.map(c => html`<div class="cat-row"><span>${c.name}</span><div class="cat-bar"><div style="width:${c.wOk};background:#7fb69a"></div><div style="width:${c.wWarn};background:#e0b54a"></div><div style="width:${c.wErr};background:#cf1322"></div></div><span class="right muted">${c.ratio}</span></div>`)}
      <div class="cat-legend"><span><span class="cat-sw" style="background:#7fb69a"></span>Bestanden</span><span><span class="cat-sw" style="background:#e0b54a"></span>Warnung</span><span><span class="cat-sw" style="background:#cf1322"></span>Fehler</span></div></div>`)}`;
}

// ---- Erfassung ----
function erfassung(ctx, F) {
  const body = F.kind === 'plan' ? planEntry(ctx, F) : F.erf.isTHG ? html`${thgHeadCard(ctx, F, 'Erstellung', F.erf.head)}${dataEntry(ctx, F)}` : dataEntry(ctx, F);
  return html`<div class="fm-stack">${body}${submitBar(F)}</div>`;
}

/** Importieren menu: the Excel template first (separated), then the imports of the tab. */
const importMenu = (F, items, open) => html`<div class="dd">
  <button type="button" class="btn btn-secondary" data-action="toggleImportMenu" aria-haspopup="menu" aria-expanded="${open ? 'true' : 'false'}">Importieren ${icon('chevron-down', 12, 'currentColor')}</button>
  ${open ? html`<div class="dd-menu" role="menu">${items.map(([key, label], i) => html`<button type="button" role="menuitem" class="dd-item${i === 0 && items.length > 1 ? ' dd-sep' : ''}" data-action="importItem" data-arg="${key}" data-form="${F.id}">${label}</button>`)}</div>` : ''}
</div>`;

/** Card head with title, Importieren menu and Excel export, shared by the cost forms and the Ökobilanz. */
function entryHead(ctx, F) {
  const E = F.erf, open = !!ctx.state.ui.importMenu;
  return html`<div class="card-head" style="flex-wrap:wrap">
      <span class="flex-1" style="flex-basis:220px">${E.tableTitle}</span>
      ${F.locked ? '' : importMenu(F, E.importItems, open)}
      <button type="button" class="btn btn-secondary" data-action="proto">Excel herunterladen</button>
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
    <div class="ent-th" style="${COLS}"><span>Code</span><span>Bezeichnung</span><span>Einheit</span><span class="right">${E.qtyLabel}</span><span class="right">${E.valLabel}</span><span class="right" title="Kennwert: Kosten je m² Geschossfläche GF">${E.kwLabel}</span><span></span></div>
    ${E.rows.map(r => (r.isGroupRow ? groupRow(F, r, ro) : r.isAdd ? addRow(F, r, 'formAddPos') : r.isNewPos ? newPosRow(F, r, ro) : posRow(F, r, ro)))}
    ${E.rows.length === 0 ? html`<div class="muted fs-13" style="padding:18px 14px">Keine fehlenden Werte.</div>` : ''}
    <div class="ent-total" style="${COLS}" title="Summe aller Hauptgruppen, ohne MWST"><span></span><span>${E.totalLabel}</span><span></span><span></span><span class="right pr18">${E.totalStr}</span><span class="right muted">${E.totalKw}</span><span></span></div>
    ${F.subtotals.length ? html`<div class="fm-space"></div>${F.subtotals.map(u => html`<div class="ent-subtotal" style="${COLS}" title="${u.tip}"><span>${u.code}</span><span>${u.name}</span><span></span><span></span><span class="right pr18">${u.cur}</span><span class="right">${u.kw}</span><span></span></div>`)}<div style="height:8px"></div>` : ''}
  </div>`;
};

/** Hauptgruppe: the whole row toggles «Aufschlüsseln / Zusammenfassen» (not on locked forms), the chevron is the keyboard target. */
const chevron = (F, r) => (r.canToggle
  ? html`<button type="button" class="ent-toggle" data-action="formMode" data-form="${F.id}" data-group="${r.code}" data-fid="${F.id}-toggle-${r.code}" aria-label="${r.toggleLabel} ${r.code}" aria-expanded="${r.direct ? 'false' : 'true'}">${icon(r.chev, 16, '#374151')}</button>`
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

// ---- Erfassung: Ökobilanz (Grundlagen, Emissionsquellen der Erstellung je eBKP-H-Elementgruppe, Betrieb) ----
/** Grundlagen fields: selects, text inputs (Datenstand, Minergie-ECO GW1) and the read-only areas from the floor plans. */
const headFields = (F, list) => html`<div class="thg-head">${list.map(h => html`<label class="thg-field"><span>${h.label}</span>
  ${h.isSelect
    ? html`<select class="ent-select" aria-label="${h.label}" style="background:${h.bg}" data-change="thgHead" data-key="${h.key}" data-fid="thg-head-${h.key}" ${h.ro ? raw('disabled') : ''}>${h.opts.map(o => html`<option value="${o.v}" ${o.sel ? raw('selected') : ''}>${o.v}</option>`)}</select>`
    : h.isText
      ? html`<input class="ent-text" aria-label="${h.label}" value="${h.val}" style="background:${h.bg}" data-change="thgHead" data-key="${h.key}" data-fid="thg-head-${h.key}" ${h.ro ? raw('readonly') : ''}>`
      : html`<input class="ent-text" aria-label="${h.label}" value="${h.val}" style="background:${h.bg}" readonly>`}
</label>`)}</div>`;
/** Grundlagen card of an Erfassung tab; the shared fields (Gebäudekategorie, Bauvorhaben, EBF, GF, Datenstand) sit in the Übersicht. */
const thgHeadCard = (ctx, F, part, list) => card(html`<span class="flex-1">Grundlagen</span>${headLink(`${part} · gemeinsame Angaben in der Übersicht`, ctx.link.delivery(F.codeLc, 'uebersicht'))}`, headFields(F, list));

const thgTable = F => {
  const E = F.erf, ro = RO(F);
  return html`<div class="ent ent-thg">
    <div class="ent-th" style="${COLS_THG}"><span>Code</span><span title="Bauteil oder Anlage aus dem Tool-Export">Emissionsquelle · Tool-Export</span><span class="center" title="Herstellerspezifischer Datensatz oder EPD statt KBOB-Durchschnitt">Hersteller</span><span class="right" title="Menge in der Einheit des Datensatzes (m², m, kWp, kW, m² EBF)">Referenzgrösse</span><span>Einheit</span><span class="right" title="THGE Erstellung pro Jahr und m² EBF (SIA 2032, 60 Jahre inkl. Ersatz)">kg/m² EBF·a</span><span class="right" title="Anteil an der THGE Erstellung">Anteil</span><span></span></div>
    ${E.rows.map(r => (r.isGroupRow ? thgGroupRow(F, r) : r.isAdd ? addRow(F, r, 'thgAdd') : thgSrcRow(F, r, ro)))}
    ${E.rows.length === 0 ? html`<div class="muted fs-13" style="padding:18px 14px">Keine fehlenden Werte.</div>` : ''}
    <div class="ent-total" style="${COLS_THG}" title="THGE Erstellung: Summe der Emissionsquellen"><span></span><span>${E.totalLabel}</span><span></span><span></span><span></span><span class="right pr18">${E.tot.kw}</span><span class="right muted">${E.tot.share}</span><span></span></div>
    <div class="fm-space"></div>
    ${E.derived.map(u => html`<div class="ent-subtotal" style="${COLS_THG}"><span></span><span>${u.name}</span><span class="right pr18" style="grid-column:3 / span 3" title="${u.tip}">${u.v}</span><span class="right pr18" title="${u.kTip}">${u.kw}</span><span></span><span></span></div>`)}
    <div style="height:8px"></div>
  </div>`;
};

const thgGroupRow = (F, r) => html`<div class="ent-group${r.canToggle ? ' is-toggle' : ''}" style="${COLS_THG};background:${r.bg}" ${groupAttrs(F, r)}>
  <span class="ent-code">${chevron(F, r)}${r.code}</span>
  <span class="ent-name"><span class="fw-600">${r.name}</span><span class="ent-sub">${r.sub}</span></span>
  <span></span><span></span><span></span>
  <span class="right fw-600 pr18">${r.kw}</span>
  <span class="right muted fs-125">${r.share}</span>
  <span></span>
</div>`;

const hsBox = (F, r) => html`<span class="center"><button type="button" class="hs-box${r.hs ? ' is-on' : ''}" role="checkbox" aria-checked="${r.hs ? 'true' : 'false'}" aria-label="Herstellerspezifisch ${r.code || ''}" title="Herstellerspezifischer Datensatz oder EPD statt KBOB-Durchschnitt" data-action="thgToggleHs" data-id="${r.id}" ${DIS(F)}>${r.hs ? '✓' : ''}</button></span>`;
const numCell = (F, r, field, label, str, bdc, ro) => html`<span class="ent-cell-input"><input class="ent-input" aria-label="${label} ${r.code || ''}" value="${str}" placeholder="fehlt" style="border-color:${bdc};background:${F.erf.inputBg}" data-change="thgVal" data-id="${r.id}" data-field="${field}" data-fid="thg-${r.id}-${field}" ${ro}></span>`;

/** An Emissionsquelle on one line: element group and Bauteil (the Ökobilanzdaten of the Tool-Export are the hover text). */
const thgSrcRow = (F, r, ro) => html`<div class="ent-pos ent-src${r.isNew ? ' ent-new' : ''}" style="${COLS_THG}">
  ${!F.locked
    ? html`<span class="ent-cell-input ent-code-cell">${codeControl(r.code, html`<select class="ent-select" aria-label="Elementgruppe${r.code ? ' ' + r.code : ''}" data-change="thgVal" data-id="${r.id}" data-field="code" data-fid="thg-${r.id}-code" ${DIS(F)}>${optionList(r, 'wählen…')}</select>`)}</span>
      <span class="ent-cell-input pl6"><input class="ent-text" aria-label="Emissionsquelle aus dem Tool-Export" value="${r.dataset}" title="${r.quelle}" placeholder="Bauteil oder Anlage" style="border-color:${r.dsBd};background:${F.erf.inputBg}" data-change="thgVal" data-id="${r.id}" data-field="dataset" data-fid="thg-${r.id}-kbob" ${ro}></span>`
    : html`<span class="ent-pos-code">${r.code}</span>
      <span class="ellipsis" title="${r.quelle}">${r.name}</span>`}
  ${hsBox(F, r)}
  ${numCell(F, r, 'q', 'Referenzgrösse', r.qStr, r.qBd, ro)}
  <span class="muted fs-12">${r.unit}</span>
  ${numCell(F, r, 'kw', 'kg CO₂-eq/m² EBF·a', r.kwStr, r.kwBd, ro)}
  <span class="right muted fs-125">${r.share}</span>
  ${!F.locked ? delBtn('thgRemove', html`data-id="${r.id}"`, r.isNew ? 'Neue Zeile verwerfen' : 'Emissionsquelle entfernen') : html`<span></span>`}
</div>`;

/** Erfassung Betrieb (THG-32): Grundlagen des Betriebs, Photovoltaik, Energiedienstleistungen nach Rechenhilfe SIA 390/1. */
function betrieb(ctx, F) {
  if (F.kind !== 'data' || !F.erf.isTHG) return erfassung(ctx, F);
  const B = F.betr, ro = RO(F), open = !!ctx.state.ui.importMenu;
  return html`<div class="fm-stack">
    ${thgHeadCard(ctx, F, 'Betrieb', B.head)}
    <div class="card">
      <div class="card-head" style="flex-wrap:wrap">
        <span class="flex-1" style="flex-basis:220px">${B.title}</span>
        ${F.locked ? '' : importMenu(F, B.importItems, open)}
      </div>
      ${open ? html`<div class="backdrop backdrop-clear" data-action="closeMenus"></div>` : ''}
      <div class="thg-head pv-strip">${B.pv.map(p => html`<label class="thg-field"><span>${p.label}</span><input class="ent-text${p.key ? ' right' : ''}" aria-label="${p.label}" value="${p.val}" placeholder="fehlt" style="background:${p.bg};border-color:${p.bdc}" ${p.key ? html`data-change="thgBetr" data-key="${p.key}" data-fid="thg-betr-${p.key}"` : ''} ${p.ro ? raw('readonly') : ''}></label>`)}</div>
      <div class="fm-table"><div class="ent ent-betr">
        <div class="ent-th" style="${COLS_BETR}"><span>Energiedienstleistung · Energieträger</span><span class="center" title="Projektspezifischer Wert statt Standardwert der Rechenhilfe SIA 390/1">Projektwert</span><span class="right" title="kWh/m² EBF·a">Nutzenergie</span><span class="right" title="Anteil des Energieträgers an der Energiedienstleistung">Anteil %</span><span class="right" title="Nutzungsgrad bzw. Jahresarbeitszahl">η / JAZ</span><span class="right" title="kWh/m² EBF·a, berechnet oder eigener Wert">Endenergie</span><span class="right" title="Treibhausgaskoeffizient des Energieträgers, Standard oder eigener Wert">kg CO₂-eq/kWh</span><span class="right" title="THG Betrieb pro Jahr und m² EBF">kg/m² EBF·a</span></div>
        ${B.rows.map(r => (r.isPv ? pvRow(r) : betrRow(F, r, ro)))}
        ${B.rows.length === 0 ? html`<div class="muted fs-13" style="padding:18px 14px">Keine fehlenden Werte.</div>` : ''}
        <div class="ent-total" style="${COLS_BETR}"><span>Total Betrieb</span><span></span><span></span><span></span><span></span><span class="right pr13" title="Endenergie nach Abzug des PV-Eigenverbrauchs, kWh/m² EBF·a">${B.end}</span><span></span><span class="right" title="THG Betrieb pro Jahr und m² EBF">${B.thg}</span></div>
        <div class="fm-space"></div>
        ${B.subs.map(u => html`<div class="ent-subtotal" style="${COLS_BETR}"><span style="grid-column:1 / span 7">${u.name}</span><span class="right" title="${u.tip}">${u.v}</span></div>`)}
        <div style="height:8px"></div>
      </div></div>
    </div>
    ${submitBar(F)}
  </div>`;
}

const projBox = (F, r) => html`<span class="center"><button type="button" class="hs-box${r.proj ? ' is-on' : ''}" role="checkbox" aria-checked="${r.proj ? 'true' : 'false'}" aria-label="Projektwert ${r.name}" title="Projektspezifischer Wert statt Standardwert der Rechenhilfe SIA 390/1" data-action="thgBetrFlag" data-key="${r.key}_proj" ${DIS(F)}>${r.proj ? '✓' : ''}</button></span>`;
const betrCell = (F, r, field, label, str, bdc, ro) => html`<span class="ent-cell-input"><input class="ent-input" aria-label="${label} ${r.name} ${r.carrier}" value="${str}" placeholder="fehlt" style="border-color:${bdc};background:${F.erf.inputBg}" data-change="thgBetr" data-key="${r.key}_${field}" data-fid="thg-betr-${r.key}-${field}" ${ro}></span>`;
/** Derived cell of the Betrieb (Endenergie, Koeffizient): shows the derived value, an own value replaces it until the field is cleared. */
const calcCell = (F, r, field, label, str, own, tip, ro) => html`<span class="ent-cell-input"><input class="ent-input${own ? '' : ' is-calc'}" aria-label="${label} ${r.name} ${r.carrier}" title="${tip}" value="${str}" placeholder="–" style="background:${F.erf.inputBg}" data-change="thgBetr" data-key="${r.key}_${field}" data-fid="thg-betr-${r.key}-${field}" ${ro}></span>`;
/** An Energiedienstleistung on one line (the Energieträger is the hover text): Projektwert flag (ticked = exception to the default, like «Hersteller»), three inputs, Endenergie, Koeffizient and the THG. */
const betrRow = (F, r, ro) => html`<div class="ent-pos ent-src" style="${COLS_BETR}">
  <span class="ellipsis" title="${r.carrier}">${r.label}</span>
  ${projBox(F, r)}
  ${betrCell(F, r, 'n', 'Nutzenergie', r.nStr, r.nBd, ro)}
  ${betrCell(F, r, 'a', 'Anteil', r.aStr, r.aBd, ro)}
  ${betrCell(F, r, 'eta', 'Nutzungsgrad', r.etaStr, r.etaBd, ro)}
  ${calcCell(F, r, 'end', 'Endenergie', r.endStr, r.endOwn, r.endTip, ro)}
  ${calcCell(F, r, 'kf', 'Koeffizient', r.kStr, r.kOwn, r.kTip, ro)}
  <span class="right fs-125" title="THG in kg CO₂-eq/m² EBF·a: Endenergie × Koeffizient">${r.thg}</span>
</div>`;
/** Photovoltaik rows (Eigenverbrauch reduces the Endenergie Strom, the surplus follows the rule «PV-Überschuss»). */
const pvRow = r => html`<div class="ent-pos ent-src" style="${COLS_BETR}">
  <span class="ellipsis" title="${r.carrier}">${r.name}</span>
  <span></span><span></span><span></span><span></span>
  <span class="right muted fs-125 pr13" title="Endenergie in kWh/m² EBF·a, Eigenverbrauch negativ">${r.end}</span>
  <span class="right muted fs-125 pr13" title="Treibhausgaskoeffizient">${r.kE}</span>
  <span class="right fs-125" title="THG in kg CO₂-eq/m² EBF·a: Endenergie × Koeffizient">${r.thg}</span>
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
    <div class="fm-main">${summaryCard(F, L)}</div>
    <div class="fm-side">
      ${card(html`<span class="flex-1">Prüfung BBL</span>${hint(`${F.reviewer}, BBL`)}`, html`<div class="card-body flex-col" style="gap:10px">
        ${F.rv.notSubmitted ? html`<div class="note note-grey">Wartet auf die Einreichung durch ${F.leadName}.</div>` : ''}
        <div class="rv-manual">${F.manual.map(m => checkbox({ checked: m.checked, label: m.label, action: A.toggle, key: m.key, arg: F.id, disabled: m.disabled }))}</div>
        ${F.rv.done && !F.rv.transferred ? html`<div class="rv-note rv-note-green">${F.rv.doneText}</div>` : ''}
        <textarea class="rv-textarea" placeholder="Kommentar, z. B. Grund der Rückweisung" aria-label="Kommentar zur Prüfung" data-change="${A.comment}" data-key="${F.id}" data-fid="${F.id}-comment" ${F.rv.decide ? '' : raw('readonly')}>${F.rv.comment}</textarea>
        ${F.rv.decide ? html`<div class="rv-actions">
          <span class="fs-12 muted flex-1" style="min-width:120px">${F.rv.reason}</span>
          ${btn({ label: 'Zurückweisen', action: A.reject, key: F.id, disabled: !F.rv.canReview })}
          ${btn({ label: 'Freigeben', kind: 'primary', action: A.approve, key: F.id, disabled: !F.rv.canApprove })}
        </div>` : ''}
      </div>`)}
      ${card('Übergabe', html`<div style="padding:4px 0 6px">${kvRow('Zielsystem', F.handover.ziel)}${kvRow('Wert', F.handover.value)}${kvRow('Status', F.handover.status)}</div>${F.canTransfer ? html`<div style="padding:0 14px 14px">${btn({ label: `An ${F.target} übertragen`, kind: 'primary', action: A.transfer, key: F.id })}</div>` : ''}`)}
    </div>
  </div>`;
}

/** Prüfung (design 05.11.2026, last round): one plain table for every Lieferung: Prüfpunkt, what the Lieferung shows, result.
 *  The requirement is the hover text of the row; a flagged deviation of the Ökobilanz carries the Begründung des Planers below its row. */
function summaryCard(F, L) {
  return card(html`<span class="flex-1">Zusammenfassung</span>${headLink('Zur Erfassung', L('erfassung'))}`, !F.summ.length
    ? html`<div class="muted fs-125" style="padding:28px 16px">${F.summNote}</div>`
    : html`<div class="fm-table"><div class="sm-body">
      <div class="sm-th"><span>Prüfpunkt</span><span>Lieferung</span><span>Ergebnis</span></div>
      ${F.summ.map((r, i) => html`<div class="sm-tr" style="background:${i % 2 ? '#fafbfc' : '#fff'}" title="${r.tip}"><span>${r.label}</span><span>${r.val}</span><span style="color:${r.fg};font-weight:${r.fw}">${r.res}</span></div>${(r.begr || []).map(g => html`<label class="sm-begr" style="background:${i % 2 ? '#fafbfc' : '#fff'}"><span>${g.code} ${g.name}, ${g.dp}</span>${F.locked ? html`<span class="sm-begr-text">${g.beg}</span>` : html`<input class="ent-text" value="${g.beg}" placeholder="Begründung des Planers, z. B. Lüftung neu mit höherer Luftmenge" style="border-color:${g.begBd}" aria-label="Begründung Abweichung ${g.code}" data-change="formBegr" data-form="${F.id}" data-group="${g.code}" data-fid="${F.id}-begr-${g.code}">`}</label>`)}`)}
    </div></div>`);
}

// ---- Beteiligte · Dokumente · Verlauf ----
function beteiligte(F) {
  const C = 'grid-template-columns:minmax(0,1.3fr) minmax(0,1.3fr) 150px minmax(0,1.2fr) 130px 80px';
  return html`<div class="fm-stack">${card(html`<span class="flex-1">Beteiligte an dieser Lieferung</span><button type="button" class="btn btn-secondary" data-action="proto">Bearbeitende hinzufügen</button>`, html`<div class="fm-table"><div style="min-width:760px">
    <div class="fm-th" style="${C};padding:0 12px;gap:0 12px"><span>Person</span><span>Firma</span><span>Rolle</span><span>Bereich</span><span>Status</span><span></span></div>
    ${F.peopleRows.map(p => html`<div class="fm-tr" style="${C};min-height:46px;padding:0 12px;gap:0 12px;background:${p.bg}">
      <span class="flex items-center gap-8 min-w-0">${avatar(p.ini, 24, '#aab2bc')}<span class="ellipsis">${p.name}</span></span><span class="ellipsis">${p.firm}</span><span class="fw-500">${p.role}</span><span class="ellipsis" style="color:#3d4650">${p.scope}</span><span style="color:${p.stC}">${p.st}</span>
      <span class="flex justify-end gap-6"><button type="button" class="btn-icon" title="Rolle und Bereich bearbeiten" aria-label="Rolle und Bereich bearbeiten" data-action="proto">${icon('pencil', 14, '#374151')}</button>${p.editable ? html`<button type="button" class="btn-icon btn-icon-danger" title="Aus Lieferung entfernen" aria-label="Aus Lieferung entfernen" data-action="proto">${icon('trash-2', 14, '#374151')}</button>` : ''}</span>
    </div>`)}
  </div></div>`)}</div>`;
}

function dokumente(F) {
  const C = 'grid-template-columns:minmax(0,2fr) 70px 90px minmax(0,1fr) 100px';
  return card(html`<span class="flex-1">Dokumente</span><button type="button" class="btn btn-secondary" data-action="proto">Hochladen</button>`, html`<div class="fm-table"><div style="min-width:620px">
    <div class="fm-th" style="${C}"><span>Name</span><span>Typ</span><span>Pflicht</span><span>Hochgeladen von</span><span>Datum</span></div>
    ${F.docs.map(d => html`<div class="fm-tr" style="${C};min-height:40px"><span class="ellipsis" title="${d.name}">${d.name}</span><span>${d.type}</span><span style="color:${d.reqFg};font-weight:${d.reqFw}">${d.req}</span><span class="ellipsis">${d.by}</span><span>${d.date}</span></div>`)}
    ${F.docs.length === 0 ? html`<div style="padding:28px 0">${emptyState('Keine Dokumente')}</div>` : ''}
  </div></div><div class="card-foot">Pflichtdokumente gehören zur Einreichung; fehlende meldet die Prüfung.</div>`);
}

function verlauf(F) {
  const C = 'grid-template-columns:140px 170px minmax(0,1fr) minmax(0,1.5fr)';
  return card(html`<span class="flex-1">Verlauf</span>${hint(`${F.hist.length} Ereignisse, neueste zuerst`)}`, html`<div class="fm-table"><div style="min-width:720px">
    <div class="fm-th" style="${C}"><span>Datum</span><span>Person</span><span>Ereignis</span><span>Details</span></div>
    ${F.hist.map(h => html`<div class="fm-tr hist-row" style="${C}"><span>${h.d}${h.time ? ' ' + h.time : ''}</span><span class="ellipsis" title="${h.firm}">${h.name}</span><span class="fw-500 ellipsis" title="${h.t}">${h.t}</span><span class="muted ellipsis" title="${h.detail}">${h.detail}</span></div>`)}
  </div></div>`);
}
