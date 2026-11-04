import { html, icon, searchBox, filterBtn, filterField, pill } from '../ui.js';
const ACT_COLS = 'grid-template-columns:130px minmax(0,1fr) minmax(0,1.6fr) 140px;min-width:560px';   // Aktivitäten: banded table like the other lists
import { pageHead, tabs, pagination, emptyState } from '../shell.js';
import { tableIconbar } from './parts/taskTable.js';

// Projekt › Aktivitäten (#/projects/:pid/timeline[/logs]): Aktivitäten-Feed und Audit-Log (Tab «Logs»).
const COLS = 'grid-template-columns:180px 120px 130px 170px 170px 180px 190px 110px 150px';

export default {
  title: ctx => `Aktivitäten · ${ctx.project.name}`,
  render(ctx) {
    const { vm, link } = ctx;
    const tab = ctx.route.params.tab === 'logs' ? 'logs' : 'activities';
    const base = link.section('ak');
    const page = Math.max(1, parseInt(ctx.route.query.page, 10) || 1);
    const logs = vm.logs;
    const pageRows = logs.slice((page - 1) * 10, page * 10);
    return html`
      ${pageHead('Aktivitäten', ctx.crumbs('Aktivitäten'))}
      ${tabs([{ key: 'activities', label: 'Aktivitäten', href: base }, { key: 'logs', label: 'Logs', href: base + '/logs' }], tab)}
      ${tab === 'logs' ? html`<div class="card card-page">
        <div class="tasks-filters" style="padding:8px 8px 12px;margin:0">
          ${filterBtn('Aktion', { caret: true })}${filterBtn('Entitätstyp', { caret: true })}
          <span class="filter-field filter-range" style="width:262px"><span>Zeitpunkt ab</span>${icon('arrow-right', 12, '#a3abb4')}<span class="flex-1">Zeitpunkt bis</span>${icon('calendar', 13, '#a3abb4')}</span>
          ${filterField('Benutzer…', 246, 'chevron-down')}
          ${searchBox(290)}
          <span class="flex-1"></span>
          ${tableIconbar()}
        </div>
        <div class="ant-table ant-table-striped" style="overflow-x:auto">
          <div class="ant-head" style="${COLS};min-width:1400px">${['Entitätsname', 'Aktion', 'Entitätstyp', 'Entitäts-ID', 'Projektname', 'Projekt-ID', 'Benutzer', 'Nachricht', 'Zeitpunkt'].map(c => html`<span class="th-sort">${c}${icon('chevrons-up-down', 10, '#bfbfbf')}</span>`)}</div>
          ${pageRows.map(r => html`<div class="ant-row" style="${COLS};min-width:1400px">
            <span class="ellipsis" title="${r.entity}">${r.entity}</span><span>${r.action}</span><span>${r.type}</span><span class="ellipsis mono-ish" title="${r.id}">${r.id}</span><span class="ellipsis">${r.projectName}</span><span class="ellipsis mono-ish" title="${r.projectId}">${r.projectId}</span><span class="ellipsis">${r.user}</span><span>${r.message}</span><span>${r.at}</span>
          </div>`)}
        </div>
        <div class="pane-pager" style="padding:16px 8px 8px">${pagination(logs.length, { page, size: 10, href: p => `${base}/logs?page=${p}` })}</div>
      </div>` : html`<div class="card card-page card-narrow">
        <div class="card-head">Letzte Aktivitäten</div>
        <div class="ant-table ant-table-striped scroll-x">
          <div class="ant-head" style="${ACT_COLS}"><span>Datum</span><span>Person</span><span>Aufgabe</span><span>Status</span></div>
          ${vm.activities.map(a => html`<div class="ant-row act-row" style="${ACT_COLS}"><span class="muted" style="font-variant-numeric:tabular-nums">${a.date}</span><span class="ellipsis">${a.who}</span><a class="ellipsis" href="#${a.href}" data-nav="${a.href}" title="${a.name}">${a.name}</a><span>${pill(a.pill, { size: 'sm' })}</span></div>`)}
        </div>
        ${vm.activities.length === 0 ? html`<div style="padding:28px 0">${emptyState()}</div>` : ''}
      </div>`}`;
  },
};
