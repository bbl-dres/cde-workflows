import { html, icon, pill, thSort } from '../../ui.js';
import { TASK_COLUMNS } from '../../model/columns.js';

// Shared task table (Aufgaben, Projektaufgaben): configurable columns, sort icons, row actions as an always
// visible sticky column at the right edge that overlays the scrolling columns, as in the CDE Bund.

export function visibleColumns(ctx, { global }) {
  const on = new Set(ctx.state.taskCols || []);
  return TASK_COLUMNS.filter(c => !c.unavailable && (c.fixed || on.has(c.key)) && (!c.globalOnly || global));
}

/** A Datenformular or plan delivery opens its delivery; any other task opens the detail panel on the right. */
export const isDelivery = t => !!t.delivery || t.typ === 'Datenformular';
export const taskLink = (t, cls = '') => (isDelivery(t)
  ? html`<a class="${cls}" href="#${t.href}" data-nav="${t.href}">${t.name}</a>`
  : html`<a class="${cls}" href="#${t.href}" data-action="taskOpen" data-id="${t.tid}">${t.name}</a>`);

function cell(ctx, c, t, opts) {
  const { link } = ctx;
  switch (c.key) {
    case 'name': return html`<span class="flex items-center gap-6 min-w-0">${taskLink(t, 'ellipsis')}${opts.nameExtra ? opts.nameExtra(t) : ''}</span>`;
    case 'project': return html`<a class="ellipsis muted" href="#${link.project(t.projectId)}" data-nav="${link.project(t.projectId)}">${t.projectName}</a>`;
    case 'desc': return html`<span class="ellipsis">${t.desc}</span>`;
    case 'status': return html`<span>${pill(t.pill, { size: 'sm' })}</span>`;
    case 'typ': return html`<span class="nowrap" style="font-weight:${t.typW}">${t.typ}</span>`;
    case 'zug': return html`<span class="ellipsis tasks-person">${t.zug}</span>`;
    case 'fuer': return html`<span class="ellipsis">${t.fuer}</span>`;
    default: return html`<span class="ellipsis">${t[c.key] || ''}</span>`;
  }
}

/** rows: task rows of the view model. opts: { global, nameExtra(t) } */
export function taskTable(ctx, rows, opts = {}) {
  const cols = visibleColumns(ctx, opts);
  const grid = `grid-template-columns:28px ${cols.map(c => c.width).join(' ')} 100px`;
  const minW = Math.max(900, 28 + cols.length * 125 + 100);
  return html`
    <div class="table task-table" style="overflow-x:auto">
      <div class="grid-head" style="${grid};min-width:${minW}px;background:#fafafa;height:34px;font-size:12px">
        <span class="chk" aria-hidden="true"></span>
        ${cols.map(c => (c.sort ? thSort(c.label, '#9aa3ad') : html`<span class="th-sort">${c.label}</span>`))}
        <span class="row-actions-head" aria-hidden="true"></span>
      </div>
      ${rows.map((t, i) => html`<div class="grid-row task-row" style="${grid};min-width:${minW}px;height:34px;background:${i % 2 ? '#f3f4f6' : '#fff'};border:0">
        <span class="chk" aria-hidden="true"></span>
        ${cols.map(c => cell(ctx, c, t, opts))}
        <span class="row-actions">
          ${isDelivery(t) ? html`<a class="btn-icon" href="#${t.href}" data-nav="${t.href}" title="Öffnen">${icon('external-link', 13, '#1f2937')}</a>` : html`<a class="btn-icon" href="#${t.href}" data-action="taskOpen" data-id="${t.tid}" title="Öffnen">${icon('external-link', 13, '#1f2937')}</a>`}
          <button type="button" class="btn-icon" title="Bearbeiten" data-action="proto">${icon('pencil', 13, '#1f2937')}</button>
          <button type="button" class="btn-icon btn-icon-danger" title="Löschen" data-action="proto">${icon('trash-2', 13, '#ff3162')}</button>
        </span>
      </div>`)}
      ${rows.length === 0 ? html`<div class="muted" style="padding:28px;text-align:center">Keine Aufgaben</div>` : ''}
    </div>
    <div class="pager" style="margin-top:12px">
      <span style="margin-right:4px">${rows.length ? `1-${rows.length} von ${rows.length}` : '0 von 0'}</span>
      <span class="pager-btn">${icon('chevron-left', 12, '#c9cfd6')}</span><span class="pager-btn is-active">1</span><span class="pager-btn">${icon('chevron-right', 12, '#c9cfd6')}</span>
      <span class="pager-btn" style="margin-left:6px;gap:8px">${rows.length > 10 ? '20' : '10'} / Seite ${icon('chevron-down', 12, '#9aa3ad')}</span>
    </div>`;
}

/** Icon group at the right of the filter row: reload, building, gear (opens «Tabelle konfigurieren»). */
export const tableIconbar = () => html`<span class="tasks-iconbar">
  <span title="Daten aktualisieren">${icon('rotate-cw', 15, '#1f2937')}</span>
  <span title="Portfolio">${icon('building-2', 15, '#1f2937')}</span>
  <button type="button" data-action="openColumns" title="Tabelle konfigurieren" aria-haspopup="dialog">${icon('settings', 15, '#1f2937')}</button>
</span>`;
