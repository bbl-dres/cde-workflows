import { html, icon, searchBox } from '../ui.js';
import { pageHead, tabs, pagination, emptyState } from '../shell.js';
import { tableIconbar } from './parts/taskTable.js';

// Projekt › Aktivitäten (#/projects/:pid/timeline[/logs]): Aktivitäten-Feed und Audit-Log (Tab «Logs»).
const COLS = 'grid-template-columns:180px 120px 130px 170px 170px 180px 190px 110px 150px';
const filterBtn = label => html`<span class="filter-btn">${label}${icon('chevron-down', 12, '#3a4350')}</span>`;
const filterField = (label, width, ic) => html`<span class="filter-field" style="width:${width}px">${label}${icon(ic, 13, '#a3abb4')}</span>`;

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
          ${filterBtn('Aktion')}${filterBtn('Entitätstyp')}
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
        <div class="pane-pager" style="padding:16px 8px 8px">${pagination(logs.length, { page, size: 10 })}</div>
      </div>` : html`<div class="card card-page" style="max-width:900px">
        <div class="card-head">Letzte Aktivitäten</div>
        ${vm.activities.map(a => html`<div class="act-row"><span class="act-date">${a.date}</span><a href="#${a.href}" data-nav="${a.href}">${a.text}</a></div>`)}
        ${vm.activities.length === 0 ? html`<div style="padding:28px 0">${emptyState()}</div>` : ''}
      </div>`}`;
  },
};
