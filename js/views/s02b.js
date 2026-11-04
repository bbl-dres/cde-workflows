import { html, icon, searchBox } from '../ui.js';
import { pageHead } from '../shell.js';
import { taskTable, tableIconbar } from './parts/taskTable.js';

// 02b Einstieg über Aufgaben (Projekt › Aufgaben): the existing task list with the new type «Datenformular».
const filterBtn = label => html`<span class="filter-btn">${label}${icon('chevron-down', 12, '#3a4350')}</span>`;
const filterField = (label, width, ic) => html`<span class="filter-field" style="width:${width}px">${label}${icon(ic, 13, '#a3abb4')}</span>`;

export default {
  render(ctx) {
    const { vm } = ctx;
    return html`
      ${pageHead('Aufgaben', ctx.crumbs('Aufgaben'), { style: 'margin-bottom:14px' })}

      <div class="toolbar" style="margin-bottom:10px">
        <button type="button" class="btn btn-primary">Aufgabe erstellen</button>
        <button type="button" class="btn btn-secondary">Importieren</button>
        <button type="button" class="btn btn-secondary">Exportieren</button>
        <span class="flex-1"></span>
        ${searchBox(282)}
        <span style="width:60px"></span>
        ${tableIconbar()}
      </div>

      <div class="tasks-filters rel">
        ${ctx.marker(1, 'top:-10px;left:-10px')}
        ${filterBtn('Typ')}${filterBtn('Status')}
        ${filterField('Fälligkeit ab', 140, 'calendar')}${filterField('Fälligkeit bis', 140, 'calendar')}
        ${filterField('Aufgabe für…', 184, 'chevron-down')}
      </div>
      <div class="tasks-filters" style="margin-bottom:12px">
        ${filterBtn('Kategorien')}${filterField('Zugewiesen an…', 184, 'chevron-down')}
      </div>

      ${taskTable(ctx, vm.auRows, { global: false, nameExtra: r => r.mark ? ctx.marker(2, 'position:static;flex:none') : '' })}`;
  },
};
