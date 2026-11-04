import { html, icon } from '../ui.js';
import s06 from './s06.js';
import { taskTable, tableIconbar } from './parts/taskTable.js';

// Aufgaben (#/tasks/all | assigned | everything): cross-project task list of the logged-in user.
// ?type=thg shows the cross-project control of the Fachstelle (screen 06 of the study).
const TYPES = [['all', 'Typ'], ['Aufgabe', 'Aufgabe'], ['Datenformular', 'Datenformular'], ['Modell-Issue', 'Modell-Issue'], ['thg', 'Ökobilanz Bauemissionen']];
const FILTERS = ['all', 'assigned', 'everything'];
const filterBtn = (label, extra) => html`<span class="filter-btn">${label}${extra ? icon('chevron-down', 12, '#3a4350') : ''}</span>`;
const filterField = (label, w, ic) => html`<span class="filter-field" style="width:${w}px">${label}${icon(ic, 13, '#a3abb4')}</span>`;

export default {
  title: ctx => ({ all: 'Alle meine Aufgaben', assigned: 'Mir zugewiesen', everything: 'Alle Aufgaben' }[ctx.route.params.filter] || 'Aufgaben'),
  render(ctx) {
    const { vm, route, link } = ctx;
    const filter = FILTERS.includes(route.params.filter) ? route.params.filter : 'all';
    const typeEntry = TYPES.find(t => t[0] === route.query.type) || TYPES[0];
    const type = typeEntry[0];
    if (type === 'thg') return html`<div class="tasks-page">${s06.render(ctx)}</div>`;
    let rows = vm.taskRows[filter];
    if (type !== 'all') rows = rows.filter(t => t.typ === type);
    const typeLink = t => link.tasks(filter, t);
    return html`<div class="tasks-page">
      <div class="tasks-filters" style="margin-bottom:6px">
        <span class="type-select">${filterBtn(typeEntry[1], true)}
          <span class="type-menu">${TYPES.map(([k, l]) => html`<a class="${k === type ? 'is-active' : ''}" href="#${typeLink(k)}" data-nav="${typeLink(k)}">${k === 'all' ? 'Alle Typen' : l}</a>`)}</span>
        </span>
        ${filterBtn('Status', true)}
        ${filterField('Fälligkeit ab', 140, 'calendar')}${filterField('Fälligkeit bis', 140, 'calendar')}${filterField('Projekt…', 190, 'chevron-down')}
        <span class="flex-1"></span>
        <div class="search" style="width:282px">Suchen…</div><div class="search-btn">${icon('search', 14, '#fff')}</div>
        ${tableIconbar()}
      </div>
      ${taskTable(ctx, rows, { global: true })}
    </div>`;
  },
};
