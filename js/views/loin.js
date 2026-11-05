import { html, icon, searchBox, thSort, srOnly } from '../ui.js';
import { pageHead, tabs, emptyState } from '../shell.js';

// Projekt › Info-Management › LOIN (#/projects/:pid/loin[/:tab]): Level of Information Need.
// Tabs, split button «Neuer Informationsschlüssel», filter chips, two panes (Gruppierungen · Tabelle), as in the CDE Bund.
const TABS = [['all', 'Alle Informationsschlüssel'], ['elements', 'Elemente'], ['parameter-sets', 'Parameter Sets'], ['parameters', 'Parameter']];
const COLS = { all: ['Name', 'Parameter Set', 'Element', 'Valide'], elements: ['Name', 'IFC-Klasse', 'Informationsschlüssel'], 'parameter-sets': ['Name', 'Parameter', 'Elemente'], parameters: ['Name', 'Datentyp', 'Einheit', 'Parameter Set'] };
const check = ok => ok ? icon('circle-check', 14, '#389e0d') : icon('circle-x', 14, '#cf1322');

export default {
  title: ctx => `Level of Information Need · ${ctx.project.name}`,
  render(ctx) {
    const { vm, route, link } = ctx;
    const tab = TABS.some(t => t[0] === route.params.tab) ? route.params.tab : 'all';
    const grp = route.query.group || 'all';
    const L = vm.loin;
    const rows = tab === 'all' ? L.keys.filter(k => grp === 'all' || k.group === grp) : tab === 'elements' ? L.elements : tab === 'parameter-sets' ? L.sets : L.parameters;
    const cols = COLS[tab];
    const grid = `grid-template-columns:${cols.map(() => 'minmax(0,1fr)').join(' ')}`;
    const base = link.section('loin');
    const tabHref = key => key === 'all' ? base : `${base}/${key}`;
    return html`
      ${pageHead('Level of Information Need', ctx.crumbs('Level of Information Need'))}
      ${tabs(TABS.map(([key, label]) => ({ key, label, href: tabHref(key) })), tab)}
      <div class="toolbar toolbar-page">
        <span class="btn-split"><button type="button" class="btn btn-primary" data-action="proto">${tab === 'all' ? 'Neuer Informationsschlüssel' : tab === 'elements' ? 'Neues Element' : tab === 'parameter-sets' ? 'Neues Parameter Set' : 'Neuer Parameter'}</button><button type="button" class="btn btn-primary btn-split-more" aria-label="Weitere Aktionen" data-action="proto">${icon('ellipsis', 14, '#fff')}</button></span>
        <span class="flex-1"></span>
        ${searchBox(290)}
      </div>
      ${tab === 'all' ? html`<div class="chips"><button type="button" class="btn btn-secondary" data-action="proto">Valide</button><button type="button" class="btn btn-secondary" data-action="proto">Invalide</button><button type="button" class="btn btn-secondary" data-action="proto">Global</button></div>` : ''}
      <div class="two-pane">
        <div class="pane">
          <div class="pane-head"><span>Gruppierungen</span>${icon('chevron-down', 16, '#1f2937')}</div>
          <div class="tree">
            <a class="tree-item${grp === 'all' ? ' is-active' : ''}" href="#${tabHref(tab)}" data-nav="${tabHref(tab)}">Alle Informationsschlüssel</a>
            ${L.groups.map(g => html`<a class="tree-item${grp === g.key ? ' is-active' : ''}" href="#${tabHref(tab)}?group=${g.key}" data-nav="${tabHref(tab)}?group=${g.key}">${g.label}</a>`)}
          </div>
          <div class="pane-foot"><button type="button" class="btn btn-secondary btn-block" data-action="proto">Neue Gruppierung</button></div>
        </div>
        <div class="pane pane-table">
          <div class="pane-body">
            <div class="ant-table">
              <div class="ant-head" style="${grid}">${cols.map(c => thSort(c, '#bfbfbf'))}</div>
              ${rows.map(r => html`<div class="ant-row" style="${grid}">${r.cells.map((c, i) => i === 0 ? html`<span class="ellipsis">${c}</span> ` : typeof c === 'boolean' ? html`<span>${check(c)}${srOnly(c ? 'valide' : 'invalide')}</span>` : html`<span class="ellipsis">${c}</span>`)}</div>`)}
              ${rows.length === 0 ? html`<div class="ant-empty">${emptyState()}</div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  },
};
