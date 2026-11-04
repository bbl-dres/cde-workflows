import { html, icon, pill } from '../ui.js';
import { pageHead } from '../shell.js';

// 06 Kontrolle über alle Projekte (Fachstelle Nachhaltigkeit): the existing cross-project task list,
// filtered by type «Ökobilanz Bauemissionen». No project sidebar.
const TILES = [
  ['total', 'Gesamt', 'file-text', '#6b3fa0'],
  ['bearb', 'In Bearbeitung', 'pencil', '#2c3b4d'],
  ['pruef', 'In Prüfung', 'search', '#e0a100'],
  ['done', 'Abgeschlossen', 'circle-check', '#2f7d63'],
  ['over', 'Überfällig', 'circle-alert', '#c8102e'],
];
const TILE_CLASS = { total: 'tile-total', bearb: 'tile-work', pruef: 'tile-check', done: 'tile-done', over: 'tile-over' };
const COLS = 'grid-template-columns:minmax(0,2.2fr) 90px 110px 120px minmax(0,1.3fr) 100px 150px 80px 90px';

export default {
  render(ctx) {
    const { vm } = ctx;
    return html`<div class="pf-page">

      <div class="pf-filters rel">
        <a class="filter-btn" style="border-color:var(--navy);gap:6px" href="#/tasks/all" data-nav="/tasks/all" title="Filter aufheben">Typ: Ökobilanz Bauemissionen${icon('chevron-down', 12, 'var(--navy)')}</a>
        <span class="filter-btn">Status</span>
        <span class="filter-btn">Pflicht</span>
        <span class="filter-btn">Teilportfolio</span>
        <span class="filter-btn">Alle Filter</span>
        ${ctx.marker(1, 'top:-10px;left:238px')}
        <span class="flex-1"></span>
        <span class="filter-btn">Export Excel</span>
      </div>

      <div class="tiles rel" style="margin-bottom:22px">
        ${ctx.marker(3, 'top:-10px;right:-10px')}
        ${TILES.map(([key, label, ic, color]) => html`
          <div class="tile ${TILE_CLASS[key]}"><div class="tile-head">${label}${icon(ic, 24, color)}</div><span class="tile-value">${vm.pf[key]}</span></div>`)}
      </div>

      <div class="table rel">
        <div class="pf-head" style="${COLS}">
          <span>Projekt</span><span>Teilportfolio</span><span class="right">Anlagekosten</span>
          <span class="rel">Pflicht${ctx.marker(2, 'top:-4px;left:50px')}</span>
          <span>Lieferverantwortlicher</span><span>Fällig</span><span>Status</span><span class="right">Endwert</span><span>SUS</span>
        </div>
        ${vm.pfRows.map(r => html`
          <div class="pf-row" style="${COLS};background:${r.bg}">
            <div>
              <div class="pf-nr">${r.nr}</div>
              ${r.href ? html`<a href="#${r.href}" data-nav="${r.href}">${r.name}</a>` : html`<a style="cursor:default">${r.name}</a>`}
            </div>
            <span>${r.tp}</span>
            <span class="right num">${r.akStr}</span>
            <div><div style="font-weight:600">${r.pflicht}</div><div class="pf-sub">${r.kontrolle}</div></div>
            <span>${r.firm}</span>
            <span class="num" style="color:${r.dueC}">${r.due}</span>
            <span>${pill(r.pill)}</span>
            <span class="right num">${r.ew}</span>
            <span class="muted">${r.sus}</span>
          </div>`)}
        <div class="pf-pager"><span class="pf-page-active">1</span><span>2</span><span>3</span></div>
      </div>
      <div class="pf-foot">Endwert in kg CO₂-eq/m² EBF·a. Projekte, Firmen und Werte sind fiktiv.</div>
    </div>`;
  },
};
