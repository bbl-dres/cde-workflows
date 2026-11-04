import { html, icon, pill } from '../ui.js';
import { pageHead, emptyState } from '../shell.js';
import { mountProjectMap, unmountProjectMap } from './parts/projectMap.js';

// Projekt › Überblick: Favoriten, Projektaufgaben, Projektbild, Projektdaten, Standort (Karte), Verknüpfungen (wie in der CDE Bund).
const COLS = 'grid-template-columns:minmax(0,1.2fr) minmax(0,1.3fr) minmax(0,1.3fr) 90px 130px';

export default {
  title: ctx => `Überblick · ${ctx.project.name}`,
  render(ctx) {
    const { vm, project, link, state } = ctx;
    const fav = (state.favorites || []).includes(project.id);
    const tasks = vm.auRows.slice(0, 5);
    const data = [
      ['Name', project.name], ['Beschreibung', project.description], ['Teilprojekt von', ''], ['Projektnummer', project.number],
      ['Technischer Platz', `${project.technicalPlace} (${project.technicalPlace})`], ['Projektbezeichnung', project.designation],
      ['Teilportfolio', project.teilportfolioLabel], ['Verantwortlicher', project.responsible],
    ];
    const favDeliveries = vm.ilpRows.filter(r => r.isForm).slice(0, 3);
    const loc = project.location || {};
    return html`
      ${pageHead(html`Überblick <button type="button" class="star-btn" data-action="toggleFavorite" data-id="${project.id}" aria-pressed="${fav ? 'true' : 'false'}" title="Favorit">${icon('star', 18, fav ? '#3f8f8b' : '#8a939e')}</button>`, ctx.crumbs('Überblick'), { style: 'margin-bottom:12px' })}
      <div class="overview">
        <div class="flex-col gap-14">
          <div class="card">
            <div class="card-head">Favoriten</div>
            ${fav && favDeliveries.length ? html`<div class="card-body flex-col gap-6">${favDeliveries.map(r => html`<a class="ov-fav" href="#${r.href}" data-nav="${r.href}">${icon('file-text', 15, '#3f8f8b')}<span class="flex-1">${r.code} · ${r.name}</span>${pill(r.pill, { size: 'sm' })}</a>`)}</div>` : html`<div style="padding:28px 0 36px">${emptyState()}</div>`}
          </div>
          <div class="card">
            <div class="card-head"><span class="flex-1">Projektaufgaben</span><a class="btn btn-secondary btn-sm" href="#${link.projectTasks()}" data-nav="${link.projectTasks()}">Alle anzeigen</a></div>
            <div class="grid-head" style="${COLS};background:#f4f5f7;height:34px;font-size:12.5px"><span>Aufgabe</span><span>Aufgabe von</span><span>Aufgabe an</span><span>Typ</span><span>Status</span></div>
            ${tasks.map((t, i) => html`<div class="grid-row" style="${COLS};height:30px;background:${i % 2 ? '#fff' : '#f6f7f9'};border:0">
              <a class="ellipsis" href="#${t.href}" data-nav="${t.href}">${t.name}</a><span class="ellipsis" style="text-decoration:underline dotted;text-underline-offset:3px">${t.fuer}</span><span class="ellipsis">${t.zug}</span><span>${t.typ}</span><span>${pill(t.pill, { size: 'sm' })}</span>
            </div>`)}
            ${tasks.length === 0 ? html`<div style="padding:20px 0 28px">${emptyState('Keine Aufgaben')}</div>` : ''}
            <div class="pager" style="padding:12px 14px">${icon('chevron-left', 12, '#c9cfd6')}<span class="pager-btn is-active">1</span><span>2</span><span>3</span>${icon('chevron-right', 12, '#1f2937')}</div>
          </div>
          <div class="card">
            <div class="card-head"><span class="flex-1">Standort</span><span class="card-hint">${loc.place || ''}</span></div>
            <div class="ov-map" id="ov-map" aria-label="Karte: ${project.name}, ${loc.place || ''}">
              <div class="ov-map-fallback">${icon('map-pin', 22, '#5b6573')}<div>${project.name} · ${loc.place || ''}</div></div>
            </div>
          </div>
        </div>
        <div class="flex-col gap-14">
          <div class="card">
            <div class="card-head">Projektbild</div>
            ${project.image
              ? html`<img class="ov-img" src="${project.image}" alt="${project.name}">${project.imageCredit ? html`<div class="ov-img-credit">Foto: ${project.imageCredit}</div>` : ''}`
              : html`<div class="ov-img-empty" style="padding:36px 0 44px">${emptyState('Kein Projektbild')}</div>`}
          </div>
          <div class="card">
            <div class="card-head">Projektdaten</div>
            <div style="padding:8px 12px 12px">${data.map(([k, v], i) => html`<div class="meta-row" style="grid-template-columns:190px 1fr;background:${i % 2 ? 'transparent' : '#f6f7f9'}"><span class="meta-k">${k}</span><span>${v}</span></div>`)}</div>
          </div>
          <div class="card">
            <div class="card-head"><span class="flex-1">Verknüpfungen</span><span class="btn btn-secondary btn-sm">Hinzufügen</span></div>
            <div style="padding:36px 0 44px">${emptyState()}</div>
          </div>
        </div>
      </div>`;
  },
  mount(root, ctx) { mountProjectMap(root.querySelector('#ov-map'), ctx, ctx.project); },
  unmount() { unmountProjectMap(); },
};
