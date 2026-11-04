import { html, icon, pill, searchBox } from '../ui.js';
import { pageHead, pagination, emptyState } from '../shell.js';

// Projekt › Info-Management › Dokumente (#/projects/:pid/documents): Informationsmanagement-Dokumente wie
// Auftraggeber-Informationsanforderung (AIA), BAP, Verträge. Two panes as in the CDE Bund: tree card + table card.
const COLS = 'grid-template-columns:minmax(0,1.6fr) 90px 120px minmax(0,1fr) minmax(0,1fr) 120px 70px;min-width:680px';

export default {
  title: ctx => `Dokumente · ${ctx.project.name}`,
  render(ctx) {
    const { vm, route, link } = ctx;
    const groups = vm.documents.groups;
    const sel = route.query.group || 'all';
    const rows = vm.documents.rows.filter(r => sel === 'all' || r.group === sel);
    const base = link.section('dok');
    return html`
      ${pageHead('Dokumente', ctx.crumbs('Dokumente'))}
      <div class="toolbar toolbar-page">
        <button type="button" class="btn btn-primary">Dokument importieren</button>
        <span class="flex-1"></span>
        ${searchBox(290)}
      </div>
      <div class="two-pane">
        <div class="pane">
          <div class="pane-head"><span>Dokumente</span>${icon('chevron-down', 16, '#1f2937')}</div>
          <div class="tree">
            ${groups.map(g => html`<a class="tree-item${g.key === sel ? ' is-active' : ''}" href="#${base}?group=${g.key}" data-nav="${base}?group=${g.key}">${g.label}</a>`)}
          </div>
          <div class="pane-foot"><button type="button" class="btn btn-secondary btn-block">Neues Dokument</button></div>
        </div>
        <div class="pane pane-table">
          <div class="pane-body">
            <div class="ant-table scroll-x has-sticky">
              <div class="ant-head" style="${COLS}"><span>Name</span><span>Version</span><span>Status</span><span>Verantwortlich</span><span>Aktualisiert v…</span><span>Aktualisiert am</span><span></span></div>
              ${rows.map(r => html`<div class="ant-row" style="${COLS}">
                <a class="ellipsis" href="#${r.href}" data-nav="${r.href}" title="${r.name}">${r.name}</a>
                <span class="ellipsis">${r.version} …</span>
                <span>${pill(r.pill, { size: 'sm' })}</span>
                <span class="ellipsis">${r.responsible}</span>
                <span class="ellipsis">${r.updatedBy}</span>
                <span>${r.updatedAt}</span>
                <span class="row-actions-inline"><span class="btn-icon" title="Beteiligte">${icon('user', 13, '#1f2937')}</span><span class="btn-icon" title="Anzeigen">${icon('eye', 13, '#1f2937')}</span></span>
              </div>`)}
              ${rows.length === 0 ? html`<div class="ant-empty">${emptyState()}</div>` : ''}
            </div>
          </div>
          <div class="pane-pager">${pagination(rows.length, { size: 20 })}</div>
        </div>
      </div>`;
  },
};
