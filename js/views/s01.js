import { html, icon, pill, searchBox } from '../ui.js';
import { pageHead } from '../shell.js';

// 01 Informationslieferplan (Projektleitung): status tiles, search, table of deliveries.
// Reference implementation for the other screens: page head → toolbar → grid table; markers via ctx.marker(n, css).
const TILE_ICON = { total: '#3a0d6b', work: '#0d1926', check: '#e99f2f', done: '#2a624c', over: '#912237' };   // sampled from the reference
const COLS = 'grid-template-columns:48px 110px minmax(0,1.3fr) minmax(0,1fr) minmax(0,.8fr) minmax(0,1.5fr) 150px 60px';

export default {
  render(ctx) {
    const { vm, data } = ctx;
    return html`
      ${pageHead('Informationslieferplan', ctx.crumbs('Informationslieferplan'))}

      <div class="tiles">${vm.ilpTiles.map(t => html`
        <div class="tile tile-${t.key}"><div class="tile-head">${t.label}${icon(t.icon, 24, TILE_ICON[t.key])}</div><span class="tile-value">${t.value}</span></div>`)}
      </div>

      <div class="toolbar toolbar-ilp">
        ${searchBox(398)}
        <div class="flex-1"></div>
        <div style="position:relative">
          <button type="button" class="btn btn-primary" data-action="openDialog" data-arg="order">Aufgabenplan hinzufügen</button>
          ${ctx.marker(2, 'top:-10px;right:-10px')}
        </div>
      </div>

      <div class="table scroll-x">
        <div class="table-head" style="${COLS};min-width:900px">
          <span></span><span class="th">Kürzel</span><span class="th">Name</span><span class="th">Lieferverantwortlicher</span><span class="th">Gewerk</span><span class="th">Beschreibung</span><span class="th">Status</span><span class="th">&nbsp;</span>
        </div>
        ${vm.ilpRows.map(r => html`
          <div class="table-row" style="${COLS};height:44px;min-width:900px">
            <span></span>
            <span style="padding-left:9px">${r.code}</span>
            <div class="flex items-center gap-8 min-w-0" style="padding-left:9px">
              <a class="ellipsis table-link" href="#${r.href}" data-nav="${r.href}" title="${r.name}">${r.name}</a>
              ${r.mark ? ctx.marker(1, 'position:static;flex:none') : ''}
            </div>
            <span class="ellipsis" style="padding-left:9px">${r.firm}</span>
            <span class="ellipsis" style="padding-left:9px">${r.gewerk}</span>
            <div class="ellipsis" style="position:relative;color:#3d4650;padding:0 24px 0 9px" title="${r.desc}">${r.desc}${r.mark3 ? ctx.marker(3, 'top:-4px;right:0') : ''}</div>
            <span>${pill(r.pill)}</span>
            <span></span>
          </div>`)}
      </div>`;
  },
};
